<!-- Local calibration draft, revision 1. Prepared 2026-11-06 (Asia/Kolkata), researched 2026-11-05. Owner review pending. Not published. -->

# Umami: website analytics with hosted and self-hosted options

**Curated external tool · Created by Umami Software · Documentation reviewed 5 November 2026 · Not hands-on tested**

Umami is an open-source web and product analytics platform. Its documentation covers traffic sources, page activity, campaign reporting and custom events. For a small service business, those capabilities make it a candidate for understanding how people reach the website and whether they take a useful next step. That suitability is an editorial assessment of the documentation, not a measured product result. [Official overview](https://docs.umami.is/docs).

## Where it could fit

Consider Umami if you want to review website traffic and record actions such as inquiry-button clicks. Its custom events can be sent through HTML attributes or JavaScript. A confirmed form submission needs deliberate integration; adding a click event alone does not prove that an inquiry was saved. [Event tracking](https://docs.umami.is/docs/track-events).

## Hosted or self-hosted

At the review date, Umami Cloud's **Hobby** plan is listed at **$0 per month**, with **100,000 events per month, one website and six months of data retention**. Paid plans also exist. The pricing page places session replays and heatmaps in Business, so do not assume every advertised feature is included in Hobby. Recheck limits before signing up. [Current pricing](https://umami.is/pricing).

The self-hosted code carries an MIT license. Running it still needs infrastructure and maintenance. Official installation documentation describes a Node.js application and PostgreSQL database, including Docker options. Budget for updates, backups and someone responsible for the service. [Repository license](https://github.com/umami-software/umami/blob/master/LICENSE), [installation](https://docs.umami.is/docs/install).

## What to check before choosing it

Umami's standard tracker works without cookies, but its documentation still describes data processing and visitor identifiers. Review what your implementation collects. Cookie-free tracking should not be read as a promise of absolute anonymity. [FAQ](https://docs.umami.is/docs/faq), [metric definitions](https://docs.umami.is/docs/metric-definitions).

Before switching from an existing tool, compare the reports you rely on, retention and export needs, and the work required to keep your completion events accurate. Performance, reliability and usability have not been tested for this listing.

**Visit [Umami](https://umami.is/) · Read the [documentation](https://docs.umami.is/docs) · View the [repository](https://github.com/umami-software/umami)**

For a starting measurement plan, read the [small-business website analytics guide](blog.md).

*Preparation note for the eventual listing: AI-assisted documentation review. Human review is pending. Umami is a third-party product, not a tool built by Lay Shah.*
