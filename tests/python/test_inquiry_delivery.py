"""All contact/email tests use isolated databases and a simulated SMTP transport."""

import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
from conftest import token
from flask_migrate import downgrade, upgrade

from app.extensions import db
from app.models import ContactRateBucket, Inquiry, InquiryDelivery, now
from app.services import inquiries


@pytest.fixture
def email_config(app, monkeypatch):
    app.config.update(
        INQUIRY_EMAIL_ENABLED=True,
        SMTP_HOST="smtp.example.test",
        SMTP_PORT="587",
        SMTP_SECURITY="starttls",
        SMTP_USERNAME="owner@example.test",
        SMTP_PASSWORD="disposable-test-secret",
        INQUIRY_EMAIL_FROM="owner@example.test",
        INQUIRY_EMAIL_TO="inbox@example.test",
    )
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, **kwargs):
            assert host == "smtp.example.test" and port in {465, 587}
            assert kwargs["timeout"] == 10
            calls.append("connect")
            self.secure = "context" in kwargs
            self.authed = False

        def ehlo(self):
            calls.append("ehlo")

        def starttls(self, *, context):
            assert context.verify_mode == ssl.CERT_REQUIRED
            assert context.check_hostname
            self.secure = True
            calls.append("tls")

        def login(self, username, password):
            assert self.secure
            assert username == "owner@example.test"
            assert password == "disposable-test-secret"
            self.authed = True
            calls.append("login")

        def send_message(self, message, *, from_addr, to_addrs):
            assert self.secure and self.authed
            assert from_addr == "owner@example.test"
            assert to_addrs == ["inbox@example.test"]
            calls.append(message)
            return {}

        def quit(self):
            calls.append("quit")

        def close(self):
            calls.append("close")

    monkeypatch.setattr(inquiries.smtplib, "SMTP", FakeSMTP)
    monkeypatch.setattr(inquiries.smtplib, "SMTP_SSL", FakeSMTP)
    return FakeSMTP, calls


def submit(client, **changes):
    fields = {
        "name": "Test visitor",
        "email": "visitor@example.test",
        "message": "Please build a website.\nThanks & regards.",
        "csrf_token": token(client.get("/")),
    }
    fields.update(changes)
    return client.post("/contact", data=fields)


def test_queue_commits_with_message_and_never_sends_in_request(
    app, client, email_config
):
    _, calls = email_config
    assert submit(client).status_code == 201
    assert calls == []
    with app.app_context():
        inquiry = db.session.scalar(db.select(Inquiry))
        delivery = db.session.get(InquiryDelivery, inquiry.id)
        assert inquiry.notification_state == delivery.state == "queued"
        assert inquiry.message.endswith("Thanks & regards.")
        assert delivery.attempts == 0 and delivery.message_id.startswith("<")


@pytest.mark.parametrize("security,port", [("starttls", 587), ("tls", 465)])
def test_delivery_envelope_headers_and_no_resend(
    app, client, email_config, security, port
):
    _, calls = email_config
    app.config.update(SMTP_SECURITY=security, SMTP_PORT=port)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"accepted": 1}
        assert inquiries.deliver_due() == {}
        inquiry = db.session.scalar(db.select(Inquiry))
        delivery = db.session.get(InquiryDelivery, inquiry.id)
        assert inquiry.notification_state == "accepted"
        assert delivery.attempts == 1 and delivery.accepted_at
        messages = [value for value in calls if not isinstance(value, str)]
        assert len(messages) == 1
        message = messages[0]
        assert message["Reply-To"] == "visitor@example.test"
        assert message["From"] == "owner@example.test"
        assert message["To"] == "inbox@example.test"
        assert message["Message-ID"] == delivery.message_id
        assert message["Bcc"] is None
        assert message.get_content_type() == "text/plain"
        assert inquiry.message in message.get_content()
        assert "/admin/inquiries" in message.get_content()
        if security == "starttls":
            assert calls[:5] == ["connect", "ehlo", "tls", "ehlo", "login"]


def test_temporary_failure_backoff_stops_after_five_attempts(
    app, client, email_config, monkeypatch
):
    fake, _ = email_config
    monkeypatch.setattr(
        fake,
        "send_message",
        lambda *a, **k: (_ for _ in ()).throw(
            smtplib.SMTPDataError(451, b"private provider detail")
        ),
    )
    submit(client)
    with app.app_context():
        identity = db.session.scalar(db.select(Inquiry.id))
        for attempt in range(1, 6):
            before = now()
            result = inquiries.deliver_due()
            delivery = db.session.get(InquiryDelivery, identity)
            assert delivery.attempts == attempt
            assert delivery.error_code == "server_refused"
            assert db.session.get(Inquiry, identity).message
            if attempt < 5:
                assert result == {"retry": 1}
                assert delivery.next_attempt_at > before.replace(tzinfo=None)
                assert inquiries.deliver_due() == {}
                delivery.next_attempt_at = now() - timedelta(seconds=1)
                db.session.commit()
            else:
                assert result == {"failed": 1}
                assert inquiries.deliver_due() == {}


@pytest.mark.parametrize(
    "exception,state,code",
    [
        (smtplib.SMTPDataError(550, b"private"), "failed", "server_refused"),
        (smtplib.SMTPAuthenticationError(535, b"secret"), "failed", "authentication"),
        (
            smtplib.SMTPRecipientsRefused({"private@example.test": (450, b"private")}),
            "retry",
            "recipient_refused",
        ),
        (
            smtplib.SMTPRecipientsRefused({"private@example.test": (550, b"private")}),
            "failed",
            "recipient_refused",
        ),
        (smtplib.SMTPServerDisconnected("private"), "uncertain", "connection"),
        (TimeoutError("private"), "uncertain", "connection"),
        (smtplib.SMTPNotSupportedError("private"), "failed", "secure_connection"),
    ],
)
def test_failure_states_keep_private_provider_details_out(
    app, client, email_config, monkeypatch, caplog, exception, state, code
):
    fake, _ = email_config

    def fail(*args, **kwargs):
        raise exception

    monkeypatch.setattr(fake, "send_message", fail)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {state: 1}
        delivery = db.session.scalar(db.select(InquiryDelivery))
        assert delivery.error_code == code
        assert db.session.get(Inquiry, delivery.inquiry_id).notification_state == state
    assert "private" not in caplog.text and "disposable-test-secret" not in caplog.text


def test_connection_failure_before_data_can_retry(
    app, client, email_config, monkeypatch
):
    def unavailable(*args, **kwargs):
        raise ConnectionRefusedError("private connection info")

    monkeypatch.setattr(inquiries.smtplib, "SMTP", unavailable)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"retry": 1}


def test_quit_failure_does_not_requeue_accepted_message(
    app, client, email_config, monkeypatch
):
    fake, _ = email_config

    def fail(*args):
        raise smtplib.SMTPServerDisconnected("after accepted")

    monkeypatch.setattr(fake, "quit", fail)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"accepted": 1}
        assert inquiries.deliver_due() == {}


def test_another_worker_cannot_send_an_active_claim(
    app, client, email_config, monkeypatch
):
    fake, calls = email_config
    original = fake.send_message

    def overlapping(self, *args, **kwargs):
        with app.app_context():
            assert inquiries.deliver_due() == {}
        return original(self, *args, **kwargs)

    monkeypatch.setattr(fake, "send_message", overlapping)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"accepted": 1}
    assert calls.count("connect") == 1


def test_expired_worker_claim_requires_review_and_cannot_be_overwritten(
    app, client, email_config, monkeypatch
):
    fake, _ = email_config

    def interrupted(*args, **kwargs):
        with app.app_context():
            inquiries.expire_claims(now() + timedelta(minutes=16))
        return {}

    monkeypatch.setattr(fake, "send_message", interrupted)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {}
        delivery = db.session.scalar(db.select(InquiryDelivery))
        assert delivery.state == "uncertain"
        assert (
            db.session.get(Inquiry, delivery.inquiry_id).notification_state
            == "uncertain"
        )
        assert inquiries.deliver_due() == {}
        identity = delivery.inquiry_id
    runner = app.test_cli_runner()
    refused = runner.invoke(args=["inquiry-email-retry", str(identity)])
    assert refused.exit_code == 1 and "Check provider logs" in refused.output
    allowed = runner.invoke(
        args=["inquiry-email-retry", str(identity), "--acknowledge-possible-duplicate"]
    )
    assert allowed.exit_code == 0 and "No message sent" in allowed.output
    with app.app_context():
        assert db.session.get(InquiryDelivery, identity).state == "queued"


@pytest.mark.parametrize(
    "field,value",
    [
        ("SMTP_SECURITY", "none"),
        ("SMTP_HOST", ""),
        ("SMTP_PORT", "bad"),
        ("SMTP_PORT", 70000),
        ("SMTP_PASSWORD", ""),
        ("INQUIRY_EMAIL_TO", "one@example.test,two@example.test"),
        ("INQUIRY_EMAIL_FROM", "bad\r\nBcc: bad@example.test"),
    ],
)
def test_configuration_validation_never_claims_or_connects(
    app, client, email_config, field, value
):
    _, calls = email_config
    submit(client)
    app.config[field] = value
    runner = app.test_cli_runner()
    result = runner.invoke(args=["inquiry-email", "--deliver"])
    assert result.exit_code == 1 and calls == []
    assert "disposable-test-secret" not in result.output
    with app.app_context():
        assert db.session.scalar(db.select(InquiryDelivery)).state == "queued"


def test_email_command_is_validation_only_without_deliver(app, email_config):
    _, calls = email_config
    result = app.test_cli_runner().invoke(args=["inquiry-email"])
    assert result.exit_code == 0 and "No connection" in result.output
    assert calls == []


def test_contact_limits_persist_across_clients_ignore_spoofed_forwarded_ip(app, client):
    app.config["CONTACT_IP_LIMIT"] = 2
    assert submit(client).status_code == 201
    other = app.test_client()
    assert submit(other).status_code == 201
    csrf = token(other.get("/"))
    response = other.post(
        "/contact",
        headers={"X-Forwarded-For": "192.0.2.50"},
        data={
            "csrf_token": csrf,
            "name": "Visitor",
            "email": "visitor@example.test",
            "message": "Project",
        },
    )
    assert response.status_code == 429
    assert 1 <= int(response.headers["Retry-After"]) <= 900
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(Inquiry)) == 2
        buckets = db.session.scalars(db.select(ContactRateBucket)).all()
        assert len(buckets) == 2
        assert all(
            len(bucket.key) == 64 and "127.0.0.1" not in bucket.key
            for bucket in buckets
        )


def test_concurrent_limits_and_expiry_use_shared_database(app):
    app.config.update(CONTACT_IP_LIMIT=3, CONTACT_GLOBAL_LIMIT=100)

    def attempt(_):
        with app.test_request_context(
            "/contact", environ_base={"REMOTE_ADDR": "192.0.2.1"}
        ):
            wait = inquiries.contact_limit(timestamp=36000)
            db.session.commit()
            return wait

    with ThreadPoolExecutor(max_workers=6) as workers:
        results = list(workers.map(attempt, range(10)))
    assert results.count(0) == 3
    with app.test_request_context(
        "/contact", environ_base={"REMOTE_ADDR": "192.0.2.1"}
    ):
        assert inquiries.contact_limit(timestamp=36000 + 86401) == 0
        db.session.commit()
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(ContactRateBucket))
            == 2
        )


def test_global_limit_applies_to_different_ips(app):
    app.config.update(CONTACT_IP_LIMIT=5, CONTACT_GLOBAL_LIMIT=2)
    for number in range(3):
        with app.test_request_context(
            "/contact", environ_base={"REMOTE_ADDR": f"192.0.2.{number}"}
        ):
            wait = inquiries.contact_limit(timestamp=36000)
            db.session.commit()
            assert bool(wait) is (number == 2)


def test_blocked_ip_cannot_consume_other_visitors_global_allowance(app):
    app.config.update(CONTACT_IP_LIMIT=1, CONTACT_GLOBAL_LIMIT=2)
    for number in range(10):
        with app.test_request_context(
            "/contact", environ_base={"REMOTE_ADDR": "192.0.2.1"}
        ):
            wait = inquiries.contact_limit(timestamp=36000)
            db.session.commit()
            assert bool(wait) is (number > 0)
    with app.test_request_context(
        "/contact", environ_base={"REMOTE_ADDR": "192.0.2.2"}
    ):
        assert inquiries.contact_limit(timestamp=36000) == 0
        db.session.commit()


@pytest.mark.parametrize(
    "changes,status",
    [
        ({"bot-field": "spam"}, 200),
        ({"name": "Bad\r\nName"}, 422),
        ({"email": "a@example.test\r\nBcc: a@b.test"}, 422),
        ({"message": "a\x00b"}, 422),
        ({"message": "a" * 5001}, 422),
    ],
)
def test_spam_and_invalid_messages_create_no_inquiry_or_queue(
    app, client, email_config, changes, status
):
    assert submit(client, **changes).status_code == status
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(Inquiry)) == 0
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(InquiryDelivery))
            == 0
        )


def test_inbox_explains_delivery_status_without_mutation(app, owner, email_config):
    submit(owner)
    text = owner.get("/admin/inquiries").get_data(as_text=True)
    assert "Email queued" in text and "does not confirm inbox delivery" in text
    with app.app_context():
        assert db.session.scalar(db.select(InquiryDelivery)).state == "queued"


def test_additive_migration_preserves_old_inquiries_and_does_not_backfill_email(app):
    with app.app_context():
        downgrade(revision="d94f7e6a210b")
        inquiry = Inquiry(
            name="Existing", email="existing@example.test", message="Retain this"
        )
        db.session.add(inquiry)
        db.session.commit()
        identity = inquiry.id
        upgrade()
        assert db.session.get(Inquiry, identity).message == "Retain this"
        assert db.session.get(Inquiry, identity).notification_state == "not_configured"
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(InquiryDelivery))
            == 0
        )


def test_failed_tls_never_authenticates_or_sends(
    app, client, email_config, monkeypatch
):
    fake, calls = email_config

    def no_tls(*args, **kwargs):
        raise smtplib.SMTPNotSupportedError("STARTTLS unavailable")

    monkeypatch.setattr(fake, "starttls", no_tls)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"failed": 1}
    assert "login" not in calls
    assert not any(not isinstance(value, str) for value in calls)


def test_queue_and_inquiry_roll_back_together(app, client, email_config, monkeypatch):
    def fail(*args):
        raise RuntimeError("simulated database failure")

    monkeypatch.setattr("app.public.queue_notification", fail)
    with pytest.raises(RuntimeError, match="simulated database failure"):
        submit(client)
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(Inquiry)) == 0
        assert (
            db.session.scalar(db.select(db.func.count()).select_from(ContactRateBucket))
            == 0
        )


def test_csrf_still_required_when_email_is_enabled(app, client, email_config):
    assert (
        client.post(
            "/contact",
            data={
                "name": "Visitor",
                "email": "visitor@example.test",
                "message": "Website",
            },
        ).status_code
        == 400
    )
    with app.app_context():
        assert db.session.scalar(db.select(db.func.count()).select_from(Inquiry)) == 0


def test_failed_notification_can_be_requeued_but_accepted_cannot(
    app, client, email_config, monkeypatch
):
    fake, _ = email_config
    original = fake.send_message

    def rejected(*args, **kwargs):
        raise smtplib.SMTPDataError(550, b"no")

    monkeypatch.setattr(fake, "send_message", rejected)
    submit(client)
    with app.app_context():
        assert inquiries.deliver_due() == {"failed": 1}
        identity = db.session.scalar(db.select(Inquiry.id))
        message_id = db.session.get(InquiryDelivery, identity).message_id
    result = app.test_cli_runner().invoke(args=["inquiry-email-retry", str(identity)])
    assert result.exit_code == 0
    monkeypatch.setattr(fake, "send_message", original)
    with app.app_context():
        assert inquiries.deliver_due() == {"accepted": 1}
        assert db.session.get(InquiryDelivery, identity).message_id == message_id
    result = app.test_cli_runner().invoke(args=["inquiry-email-retry", str(identity)])
    assert result.exit_code == 1
