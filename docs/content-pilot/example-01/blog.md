<!-- Local calibration draft, revision 1. Prepared 2026-11-06 (Asia/Kolkata), researched 2026-11-05. Owner review pending. Not published. -->

# Website analytics for a small business: what to track first

Your website's visitor count can rise while your inbox stays quiet. Before paying for more traffic or rebuilding a page, make sure you can follow the steps between someone arriving and a useful inquiry reaching you.

For a service business, start with a short measurement plan: where visits come from, which pages people reach, whether the inquiry form works, and which inquiries are worth a conversation. Choose software after you have those questions written down.

## Begin with one business outcome

Pick the main action your website should support. That might be an inquiry, an appointment request or a quote request. Define what counts as completion.

A click on “Send inquiry” tells you that somebody pressed the button. A successful inquiry means the website accepted and saved the submission. An appointment request is also different from a confirmed booking.

Keep those stages separate in your reports. Otherwise, a broken form can produce an encouraging click count while losing the messages you wanted.

Use this worksheet with the person who maintains your website:

| Question | Signal to record | What to check before relying on it |
| --- | --- | --- |
| How do people arrive? | Referring source or a tagged campaign link | Some visits may have no useful source information |
| Do people reach the relevant service page? | Visits or pageviews for that page | The tool's definition of a visit or visitor |
| Does an inquiry reach the business? | Confirmed successful submission, checked against saved inquiries | One accepted submission should not become several completion events |
| Is the inquiry a good fit? | A short status in your private inquiry log | A person still needs to assess the request |

The last row belongs in your business records. A pageview cannot tell you whether a prospective client's budget and requirements fit your work.

## Give campaigns names you can recognize

For links you share in a newsletter or social post, campaign tags help distinguish the sources. UTM parameters are labels added to a link for this purpose. Umami's documentation explains the source, medium and campaign fields. [UTM documentation](https://docs.umami.is/docs/utm).

For example, a newsletter link could use `utm_source=newsletter`, `utm_medium=email` and `utm_campaign=november_services`. These are illustrative labels, not results from an actual campaign.

Agree on a naming convention before several people start sharing links. If one person uses `Newsletter` and another uses `email-list` for the same source, you will have extra cleanup when reading the report.

Use campaign labels that describe the promotion. Keep customer names, email addresses and other identifying information out of those labels.

## Track form completion deliberately

An analytics tracker needs to be installed correctly before it can collect anything. Umami, for example, provides a tracking script and troubleshooting steps; its documentation also notes that ad blockers can prevent collection. [Collecting data](https://docs.umami.is/docs/collect-data).

Beyond pageviews, Umami supports custom events through HTML attributes or JavaScript. A button-click event is useful for measuring interest. To record an accepted inquiry, ask your developer to send a separate completion event only after the website confirms success. [Custom events](https://docs.umami.is/docs/track-events).

Test a successful submission, an invalid submission and a failed request. Check the saved inquiry as well as the analytics event. Refresh the confirmation page and check that it does not count the same submission again.

Keep message text, names, email addresses and phone numbers out of the event payload. You can investigate inquiry quality in the private inbox without copying its contents into analytics.

## Read the numbers alongside the inquiries

Suppose your records look like this:

| Period | Recorded visits | Saved inquiries | Inquiries you judge a good fit |
| --- | ---: | ---: | ---: |
| Week 1 | 200 | 6 | 2 |
| Week 2 | 220 | 8 | 2 |

These numbers are invented to illustrate the review process. They are not client results or benchmarks.

The second week produced more inquiries, but the number of suitable requests stayed the same. Read the requests before deciding that the new traffic is better. Perhaps the page attracts people asking for a service you do not offer. Perhaps the budget expectations need to be clearer.

With counts this small, treat a week's change as a reason to investigate. Record any page or campaign changes and keep observing before claiming an improvement.

Visitor counts also depend on how a tool identifies and groups activity. Umami's own definitions explain those limitations. Compare consistent periods in the same setup rather than assuming two dashboards will count people identically. [Metric definitions](https://docs.umami.is/docs/metric-definitions).

## Choose software you can keep using

For this starting plan, shortlist tools that can show traffic sources, relevant pages and custom completion events. Check how you can access your data, how long it stays available, and who will maintain the setup.

Umami is one option worth evaluating. Our [separate Umami listing](tool.md) covers its documented capabilities, hosted plan limits and self-hosting responsibilities. It is a documentation review, not a hands-on test or a claim that Umami is the best fit for every business.

Before adding more reports, ask your developer to fill in the worksheet above and demonstrate one successful inquiry from submission to inbox. Then choose a regular time to review those records and one question to investigate next.

*Preparation note for the eventual article: AI-assisted draft based on the linked documentation. Human review is pending; no hands-on product test is claimed.*
