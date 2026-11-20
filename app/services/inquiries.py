"""Contact throttling and a host-run SMTP outbox. No network in web requests."""

import hashlib
import hmac
import re
import smtplib
import ssl
from datetime import UTC, timedelta
from email.message import EmailMessage
from email.utils import format_datetime
from uuid import uuid4

import click
from flask import current_app, request
from sqlalchemy.dialects.sqlite import insert

from ..extensions import db
from ..models import ContactRateBucket, Inquiry, InquiryDelivery, now

MAX_ATTEMPTS = 5
LEASE = timedelta(minutes=15)
STATUS_LABELS = {
    "not_configured": "Email not enabled when received",
    "queued": "Email queued",
    "sending": "Email sending",
    "retry": "Email retry scheduled",
    "accepted": "Email accepted by mail server",
    "failed": "Email needs attention",
    "uncertain": "Email delivery uncertain · review before retrying",
}
ERROR_LABELS = {
    "authentication": "Mail-provider sign-in was rejected.",
    "recipient_refused": "The mail server rejected the notification address.",
    "server_refused": "The mail server rejected the notification.",
    "secure_connection": "A secure mail connection could not be established.",
    "message_format": "The mail provider could not use this message format.",
    "connection": "The mail connection was interrupted or unavailable.",
    "worker_interrupted": "The delivery worker stopped before recording a result.",
}


def contact_limit(timestamp=None):
    """SQLite UPSERT serializes counters across workers; never trust forwarded IPs.

    Counts valid, non-honeypot submissions. Keys are HMACs, raw addresses are not
    stored, and old buckets are removed on subsequent submissions after 24 hours.
    Caller commits counters, including when denying a request.
    """
    timestamp = int(timestamp if timestamp is not None else now().timestamp())
    db.session.execute(
        db.delete(ContactRateBucket).where(ContactRateBucket.expires_at <= timestamp)
    )
    for identity, seconds, limit in (
        (
            f"ip:{request.remote_addr or 'unknown'}",
            900,
            current_app.config["CONTACT_IP_LIMIT"],
        ),
        ("global", 3600, current_app.config["CONTACT_GLOBAL_LIMIT"]),
    ):
        key = hmac.new(
            current_app.secret_key.encode(), identity.encode(), hashlib.sha256
        ).hexdigest()
        window = timestamp // seconds * seconds
        statement = insert(ContactRateBucket).values(
            key=key, window=window, count=1, expires_at=window + 86400
        )
        count = db.session.execute(
            statement.on_conflict_do_update(
                index_elements=["key", "window"],
                set_={"count": ContactRateBucket.count + 1},
            ).returning(ContactRateBucket.count)
        ).scalar_one()
        if count > limit:
            # An already blocked IP must not consume the site-wide allowance.
            return window + seconds - timestamp
    return 0


def queue_notification(inquiry):
    if not current_app.config["INQUIRY_EMAIL_ENABLED"]:
        return
    inquiry.notification_state = "queued"
    db.session.add(
        InquiryDelivery(
            inquiry_id=inquiry.id,
            message_id=f"<{uuid4().hex}@inquiries.layshahdev.com>",
        )
    )


def smtp_settings():
    """Validate without connecting or printing any settings or credentials."""
    config = current_app.config
    if not config["INQUIRY_EMAIL_ENABLED"]:
        raise ValueError("Inquiry email is disabled.")
    if not config["SMTP_HOST"] or config["SMTP_SECURITY"] not in {"starttls", "tls"}:
        raise ValueError("Set SMTP_HOST and SMTP_SECURITY to starttls or tls.")
    for field in ("INQUIRY_EMAIL_FROM", "INQUIRY_EMAIL_TO"):
        value = config[field]
        if not re.fullmatch(
            r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", value
        ):
            raise ValueError(f"Set {field} to one plain email address.")
    try:
        port = int(config["SMTP_PORT"])
    except (ValueError, TypeError) as exc:
        raise ValueError("SMTP_PORT must be a valid port.") from exc
    if not 1 <= port <= 65535:
        raise ValueError("SMTP_PORT must be a valid port.")
    if bool(config["SMTP_USERNAME"]) != bool(config["SMTP_PASSWORD"]):
        raise ValueError("Set both SMTP_USERNAME and SMTP_PASSWORD.")
    return {
        "host": config["SMTP_HOST"],
        "port": port,
        "security": config["SMTP_SECURITY"],
        "username": config["SMTP_USERNAME"],
        "password": config["SMTP_PASSWORD"],
        "sender": config["INQUIRY_EMAIL_FROM"],
        "recipient": config["INQUIRY_EMAIL_TO"],
    }


def notification_message(inquiry, delivery, settings):
    message = EmailMessage()
    message["From"] = settings["sender"]
    message["To"] = settings["recipient"]
    message["Reply-To"] = inquiry.email
    message["Subject"] = f"New website inquiry #{inquiry.id}"
    message["Message-ID"] = delivery.message_id
    created = inquiry.created_at.replace(tzinfo=UTC)
    message["Date"] = format_datetime(created)
    message.set_content(
        f"A new message was saved on your website.\n\n"
        f"Name: {inquiry.name}\nEmail: {inquiry.email}\n\n{inquiry.message}\n\n"
        f"Private inbox: {current_app.config['SITE_URL']}/admin/inquiries\n"
    )
    return message


def send_notification(message, settings):
    """Return a safe state/category; never store/log provider replies or message data.

    A transport failure after DATA starts can mean accepted-but-unacknowledged.
    Such messages require operator review, instead of automatic duplicate sending.
    """
    smtp = None
    sending = False
    try:
        context = ssl.create_default_context()
        if settings["security"] == "tls":
            smtp = smtplib.SMTP_SSL(
                settings["host"], settings["port"], timeout=10, context=context
            )
        else:
            smtp = smtplib.SMTP(settings["host"], settings["port"], timeout=10)
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
        if settings["username"]:
            smtp.login(settings["username"], settings["password"])
        sending = True
        refused = smtp.send_message(
            message, from_addr=settings["sender"], to_addrs=[settings["recipient"]]
        )
        if refused:
            raise smtplib.SMTPRecipientsRefused(refused)
        return "accepted", None
    except smtplib.SMTPAuthenticationError:
        return "failed", "authentication"
    except smtplib.SMTPRecipientsRefused as exc:
        temporary = all(400 <= code < 500 for code, _ in exc.recipients.values())
        return ("retry" if temporary else "failed"), "recipient_refused"
    except smtplib.SMTPResponseException as exc:
        return ("retry" if 400 <= exc.smtp_code < 500 else "failed"), "server_refused"
    except (ssl.SSLError, smtplib.SMTPNotSupportedError):
        return "failed", "secure_connection"
    except (ValueError, UnicodeError):
        return "failed", "message_format"
    except (OSError, smtplib.SMTPException):
        return ("uncertain" if sending else "retry"), "connection"
    finally:
        # QUIT failure must not reverse a successful DATA acknowledgement.
        if smtp is not None:
            try:
                smtp.quit()
            except (OSError, smtplib.SMTPException):
                pass
            finally:
                smtp.close()


def mark_delivery(delivery, state, timestamp, error=None):
    delivery.state = state
    delivery.error_code = error
    delivery.claim_token = None
    delivery.claimed_at = None
    if state == "accepted":
        delivery.accepted_at = timestamp
    inquiry = db.session.get(Inquiry, delivery.inquiry_id)
    inquiry.notification_state = state


def expire_claims(timestamp):
    # SQLite serializes this update with claim writers; recheck inside the UPDATE.
    expired = db.session.scalars(
        db.update(InquiryDelivery)
        .where(
            InquiryDelivery.state == "sending",
            InquiryDelivery.claimed_at < timestamp - LEASE,
        )
        .values(state="uncertain", error_code="worker_interrupted", claim_token=None)
        .returning(InquiryDelivery.inquiry_id)
    ).all()
    if expired:
        db.session.execute(
            db.update(Inquiry)
            .where(Inquiry.id.in_(expired))
            .values(notification_state="uncertain")
        )
    db.session.commit()


def deliver_due(limit=20):
    settings = smtp_settings()  # Fail before claiming anything if misconfigured.
    timestamp = now()
    expire_claims(timestamp)
    ids = db.session.scalars(
        db.select(InquiryDelivery.inquiry_id)
        .where(
            InquiryDelivery.state.in_(("queued", "retry")),
            InquiryDelivery.next_attempt_at <= timestamp,
        )
        .order_by(InquiryDelivery.next_attempt_at, InquiryDelivery.inquiry_id)
        .limit(limit)
    ).all()
    db.session.commit()
    counts = {}
    for identity in ids:
        claim = str(uuid4())
        changed = db.session.execute(
            db.update(InquiryDelivery)
            .where(
                InquiryDelivery.inquiry_id == identity,
                InquiryDelivery.state.in_(("queued", "retry")),
                InquiryDelivery.next_attempt_at <= now(),
            )
            .values(
                state="sending",
                claim_token=claim,
                claimed_at=now(),
                attempts=InquiryDelivery.attempts + 1,
            )
        ).rowcount
        if not changed:
            db.session.rollback()
            continue
        db.session.get(Inquiry, identity).notification_state = "sending"
        db.session.commit()  # No database lock held during network operations.
        delivery = db.session.get(InquiryDelivery, identity)
        inquiry = db.session.get(Inquiry, identity)
        try:
            message = notification_message(inquiry, delivery, settings)
        except (ValueError, UnicodeError):
            message = None
        attempts = delivery.attempts
        db.session.commit()
        state, error = (
            send_notification(message, settings)
            if message is not None
            else ("failed", "message_format")
        )
        # A restarted worker may have quarantined an expired claim in the meantime.
        if state == "retry" and attempts >= MAX_ATTEMPTS:
            state = "failed"
        values = {
            "state": state,
            "error_code": error,
            "claim_token": None,
            "claimed_at": None,
        }
        if state == "accepted":
            values["accepted_at"] = now()
        if state == "retry":
            values["next_attempt_at"] = now() + timedelta(
                seconds=min(300 * 2 ** (attempts - 1), 3600)
            )
        changed = db.session.execute(
            db.update(InquiryDelivery)
            .where(
                InquiryDelivery.inquiry_id == identity,
                InquiryDelivery.state == "sending",
                InquiryDelivery.claim_token == claim,
            )
            .values(**values)
        ).rowcount
        if not changed:
            db.session.rollback()
            continue
        db.session.get(Inquiry, identity).notification_state = state
        db.session.commit()
        counts[state] = counts.get(state, 0) + 1
    return counts


def register_inquiry_commands(app):
    @app.cli.command("inquiry-email")
    @click.option("--deliver", is_flag=True, help="Send due owner notifications.")
    @click.option("--limit", type=click.IntRange(1, 100), default=20)
    def inquiry_email(deliver, limit):
        """Validate locally by default. Only --deliver opens an SMTP connection."""
        try:
            smtp_settings()
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc
        if not deliver:
            click.echo("Email settings are complete. No connection or message sent.")
            return
        counts = deliver_due(limit)
        click.echo(
            "Processed: "
            + (
                ", ".join(f"{key}={value}" for key, value in sorted(counts.items()))
                or "0 due"
            )
        )

    @app.cli.command("inquiry-email-retry")
    @click.argument("inquiry_id", type=int)
    @click.option("--acknowledge-possible-duplicate", is_flag=True)
    def retry(inquiry_id, acknowledge_possible_duplicate):
        """Requeue one failed/uncertain notification after operator review. No send."""
        delivery = db.session.get(InquiryDelivery, inquiry_id)
        if not delivery or delivery.state not in {"failed", "uncertain"}:
            raise click.ClickException("Choose a failed or uncertain notification.")
        if delivery.state == "uncertain" and not acknowledge_possible_duplicate:
            raise click.ClickException(
                "Check provider logs first, then use --acknowledge-possible-duplicate."
            )
        mark_delivery(delivery, "queued", now())
        delivery.attempts = 0
        delivery.next_attempt_at = now()
        db.session.commit()
        click.echo("Notification requeued. No message sent.")
