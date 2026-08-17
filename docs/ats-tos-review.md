# ATS Terms of Service Review

**This is a living reference doc. Read the Quick Reference + checklists first; detailed findings are below. Update the changelog at the bottom whenever anything changes.**

Last review: 2026-08-17

Scope: whether automated (bot-driven, Playwright) application **submission** is prohibited or restricted by the current (2025–2026) terms of Greenhouse, Lever, and Workday. Research only; not legal advice.

---

## Quick Reference — verdicts at a glance

| Platform | Unattended auto-submit | Human-in-the-loop pre-fill | Key reason |
|---|---|---|---|
| Greenhouse | 🛑 **Prohibited** | ✅ Allowed (candidate agreement governs; human is the actor) | User Agreement clause (z) bans "automated means … to access or use the Services" |
| Lever | ⚠️ Not explicitly prohibited, implicitly restricted | ✅ Allowed | No candidate ToS; abuse/security clause + API rate limits (2 POST/s) |
| Workday | 🛑 **Restricted/Prohibited** | ⚠️ Pre-fill only with human submit; employer tenant terms vary | Site Terms ban robots + apps interacting with sites without written consent; AUP bans scraping/circumvention |

**Bottom line decision:** **No-go for fully unattended auto-submit on any of the three. Go with human-in-the-loop: automation pre-fills and validates, a human reviews and clicks the final submit.** This keeps the human as the actor "using the Service." See Phase 3 spike and Phase 4 gate checklists.

---

## Checklists

### 1. Phase 3 build gate — re-check before writing any ATS adapter
- [ ] Terms re-reviewed within the last **90 days** (stale terms = stale decision)
- [ ] For each target board: the **employer-configured candidate terms** shown at apply time permit applicant-side pre-fill assistance (they vary per tenant on Workday)
- [ ] Greenhouse: design has **no programmatic submit** — human clicks the final Submit button
- [ ] Workday: no browser interaction without the tenant's consent → treat as copy-paste/pre-fill panel with explicit human submit
- [ ] Lever: automation stays well under rate limits; no behavior that could read as "abuse/disruption" (§9.2)
- [ ] No bypass of bot detection, CAPTCHA, or other protective measures — a human completes them
- [ ] Legal sign-off obtained (recommended before launch)

### 2. Product guardrails — apply throughout development
- [ ] Never unattended auto-submit on any ATS (until Phase 4 gate passes)
- [ ] Every submission passes through a **human review screen** before the final click
- [ ] Human completes CAPTCHAs and employer attestations — never automate past them
- [ ] Never bypass bot management / security / access controls (Greenhouse MSA §4(c)(ix), Workday AUP)
- [ ] Respect `robots.txt`; no scraping of ATS-controlled surfaces
- [ ] Log for every submission: platform, date, and the terms version in effect at the time

### 3. Phase 4 gate — conditions before ANY unattended auto-apply
- [ ] Re-run Checklist 1 on the target platform with the auto-submit scenario explicitly considered
- [ ] Platform offers a **sanctioned API path** for application submission (e.g., Lever Postings API) and we use it — or legal sign-off on UI automation obtained
- [ ] User has used assisted-fill for weeks with **zero uncorrected submission errors** (build plan Checkpoint 3→4)
- [ ] Rules config + daily digest + undo/flag window implemented (build plan Phase 4)

---

## Market share context (why this matters)

Workday is the single largest ATS by posting volume among large employers (~38%); Greenhouse leads the tech/mid-market tier (~13% large / ~49% top-rated). Together ≈ 50–70% of target postings; Lever is a small minority (~2–8%). No single ATS is a majority — a product that works on Workday + Greenhouse reaches most target jobs, which is why both matter despite Workday being the stricter one.

Source documents reviewed:
- Greenhouse: https://my.greenhouse.io/users/agreement (My Greenhouse User Agreement, eff. 2025-01-29) | https://www.greenhouse.com/master-subscription-agreement (MSA, last updated 2026-02-01) | https://www.greenhouse.com/legal (legal document hub)
- Lever: https://www.lever.co/legal/terms-of-service (ToS, last updated 2023-08-25) | https://www.lever.co/legal (legal center) | https://hire.lever.co/developer/documentation (API docs / rate limits)
- Workday: https://www.workday.com/en-us/legal/site-terms.html (Site Terms, published 2024-08-19) | https://www.workday.com/content/dam/web/en-us/documents/legal/acceptable-use-policy.pdf (Acceptable Use Policy, last updated 2026-02-12) | https://www.workday.com/en-us/legal/universal-contract-terms-and-conditions/index.html (Universal Contract Terms; product lines incl. Student, Talent Management) | https://doc.workday.com/admin-guide/en-us/human-capital-management/recruiting/career-sites/ddo1548786792678.html (career-site admin docs: candidate terms are employer-configured)

---

## Greenhouse

- ToS URL(s): My Greenhouse User Agreement — https://my.greenhouse.io/users/agreement (candidate-facing); MSA — https://www.greenhouse.com/master-subscription-agreement (employer-facing). Note: greenhouse.com/legal does **not** publish a standalone Acceptable Use Policy; the MSA and User Agreement carry the use restrictions.

- Relevant quotes (verbatim):

  From the My Greenhouse User Agreement (eff. 2025-01-29), "Your Account" section:
  > "You agree that you will not (and will not assist any third party to): … (z) use automated means, including spiders, robots, crawlers, or similar means or processes to access or use the Services."

  > "(s) misrepresent your identity or create an account for anyone other than yourself; … (v) override any security features or bypass or circumvent any access controls or use limits of the Services;"

  From the MSA (last updated 2026-02-01), Section 4(c) Restrictions on Use:
  > "(vi) interfere with or disrupt the integrity or performance of the Greenhouse Services or any third-party data contained therein, … (ix) circumvent or attempt to circumvent any technological protective measures put in place to prevent or restrict access to the Greenhouse Services, including without limitation other accounts, computer systems or networks connected to the Greenhouse Services, or (x) use or view the Greenhouse Services for the purposes of developing, directly or indirectly, a product or service competitive to the Greenhouse Services."

  MSA Section 10(a)–(b) carve out breach of Section 4(c) from the liability caps, i.e., Greenhouse treats these restrictions as serious.

- Interpretation:
  - **Prohibited (candidate-facing).** The User Agreement that governs My Greenhouse (the service candidates use to create accounts, return to job boards, and apply) contains an explicit clause (z) banning "automated means, including spiders, robots, crawlers, or similar means or processes to access or use the Services." A Playwright bot that fills and **submits** an application on a Greenhouse-hosted board is "automated means … to access or use the Services" — squarely within clause (z). Greenhouse also retains the right to restrict, suspend, or terminate accounts for "misusing the Services."
  - Employer-side MSA adds: circumvention of protective measures (§4(c)(ix)) and interference/disruption (§4(c)(vi)) are prohibited, and Greenhouse "may … immediately terminate this Agreement upon reasonable suspicion that the Greenhouse Services are being used in a manner that is reasonably suggestive of fraud." The API fair-use clause (§4(d)(ii)) restricts excessive/abusive API access.
  - Candidate applications are usually submitted through the employer's Greenhouse-hosted board; whether the applicant has clicked through the My Greenhouse User Agreement depends on flow, but Greenhouse's account-based flows point to this agreement, and the automation ban is unambiguous where it applies. Greenhouse also runs bot-detection infrastructure on its boards.
  - No carve-out for "human-in-the-loop" automation was found; the plain text bans automated access regardless of who reviews the result.

---

## Lever

- ToS URL(s): https://www.lever.co/legal/terms-of-service (customer/employer agreement, last updated 2023-08-25). Lever's legal center (https://www.lever.co/legal) publishes: ToS, Professional Services Agreement, SMS Text/Chatbot/Acceptable Use Policy Addendum, Developer Sandbox Terms, Contest Rules. **No candidate-facing terms of service was found published by Lever** for jobs.lever.co application flows; applicant-facing policies on Lever-hosted boards are the employer's own.

- Relevant quotes (verbatim):

  Lever ToS §1.2 (customer use restrictions):
  > "Customer will not, and will not permit any third party to: … use the Services other than in accordance with this Agreement and in compliance with all applicable laws and regulations."

  Lever ToS §9.2 (suspension):
  > "Lever may impose limitations on bandwidth usage, and/or temporarily suspend Customer's and any user authorized by Customer to access to any portion or all of the Services if Lever reasonably determines that … Customer's or any Customer's users use of the Services abuses, disrupts or poses a security risk to the Services or to any other customer, integration partner or vendor of Lever."

  Lever developer docs (https://hire.lever.co/developer/documentation), rate limiting (technical control):
  > "Lever imposes a limit of the number of requests a client can make in a short time." / Postings API: "…if your custom job site issues more than 2 application POST requests per second" it returns HTTP 429.

- Interpretation:
  - **No explicit automation/bot prohibition found** in Lever's published terms. The ToS is a B2B customer contract; it does not address how job applicants may interact with the application form, and Lever publishes no candidate ToS of its own (the terms an applicant sees at apply time belong to the hiring company, not Lever).
  - Residual exposure is indirect: the catch-all "use the Services other than in accordance with this Agreement" (§1.2) and the suspension right for use that "abuses, disrupts or poses a security risk" (§9.2) are drafted for the customer (employer), but high-volume automated submission could be framed as abusive/disruptive use of the service.
  - Lever's sanctioned path for programmatic application intake is its Postings API (rate-limited to 2 application POSTs/sec), which signals that automated submission is expected to go through the API rather than the UI, and that UI-level automation at volume is likely to be countered by rate limiting/bot controls.
  - Verdict: not explicitly prohibited in published terms; implicitly restricted (abuse/security clause + technical rate limits).

---

## Workday

- ToS URL(s): Site Terms — https://www.workday.com/en-us/legal/site-terms.html; Acceptable Use Policy (AUP) — https://www.workday.com/content/dam/web/en-us/documents/legal/acceptable-use-policy.pdf; Universal Contract Terms (UCT, product lines incl. Student and Talent Management) — https://www.workday.com/en-us/legal/universal-contract-terms-and-conditions/index.html. The AUP is incorporated into the UCT and applies to Workday Products; Workday Student and Workday Recruiting are Workday Products under the UCT.

- Relevant quotes (verbatim):

  Workday Site Terms §2 "Prohibited Conduct and Content":
  > "Use any data mining, robots or similar data gathering or extraction methods designed to scrape or extract data from our Sites;"
  > "Develop or use any applications that interact with our Sites without our prior written consent;"
  > "Bypass or ignore instructions contained in our robots.txt file; or"

  Workday Acceptable Use Policy (last updated 2026-02-12), "Prohibited Uses":
  > "To conduct unauthorized data scraping, web crawling, or other similar data extraction activity through a web client;"
  > "In any way that seeks to circumvent, disable, or otherwise compromise Workday Products or Workday environments, including the security of the Workday Products or Workday environments, any user account or any password;"

  Workday AUP, "Prohibited Uses" (adjacent, decision-making):
  > "For automated decision-making purposes (such as employment decisions) that have legal effects, unless You ensure a human being makes, reviews or oversees the final decisions;"

- Interpretation:
  - Workday's own **Site Terms explicitly prohibit robots/data-mining, developing or using applications that interact with Workday sites without prior written consent, and ignoring robots.txt.** A Playwright-based auto-submitter is an "application that interacts with [Workday] Sites," which is prohibited without prior written consent. This is the strongest restriction for the workday.com surface itself.
  - The **AUP** binds Workday customers (including Workday Student and Recruiting tenants) via the UCT and bans "unauthorized data scraping, web crawling, or other similar data extraction activity through a web client" plus any circumvention of Workday environments. "Unauthorized" here is defined by the customer's agreement — an employer's tenant terms likely do not authorize third-party bots to submit on behalf of candidates; many employers' career sites do not consent to automated access.
  - **Candidate-facing nuance:** job seekers applying on `*.myworkdayjobs.com` career sites do not sign Workday's Site Terms or AUP; the terms presented at apply time ("Apply – Terms and Agreement" section) are configured by each employer tenant (per Workday admin documentation). So a candidate's contractual exposure is primarily to the **employer's** posted terms, while Workday's own restrictions bind its customers and its site. Practically, Workday career sites sit behind Akamai bot management, so automated submission is also countered technically.
  - Workday Student (admissions) applications use the same infrastructure; the UCT/AUP coverage of Student is confirmed on the UCT page. No Workday-specific candidate ToS prohibiting bots was found; enforcement would flow through employer terms, Workday Site Terms (for workday.com surfaces), and the AUP's customer-side bans.
  - Verdict: restricted/prohibited as to Workday-controlled surfaces and customer tenants (no-consent scraping/circumvention); not directly addressed for candidates, who are governed by employer-configured terms.

---

## Summary / Checkpoint 0 decision

- Which ATS represents the target share of jobs:
  - Portal-verified 2026 data for large employers (ResumeAI State of ATS 2026, 707 Fortune-500-scale employers verified against live career pages): **Workday 38.0%, Greenhouse 12.6%, Lever ~1.5%** (Workday + Greenhouse ≈ 50%). JobHire.AI's 2026 audit of the Fortune 100 top-100 found the same Workday ≈38% figure; Jobscan 2025 found Workday ≈39% of Fortune 500.
  - Broader top-rated-employer sampling (ResumeGeni, 3,222 companies, 2026): Greenhouse 49.0%, Workday 21.8%, Lever 8.0% (Greenhouse leads in high-quality/mid-market and tech; Workday leads in enterprise).
  - Combined reading: **Workday is the single largest ATS by job-posting volume among large employers; Greenhouse is the largest in the tech/mid-market tier; together they cover roughly 50–70% of target postings, while Lever is a small minority (~2–8%).** No single ATS is a majority; a product that works on Workday + Greenhouse reaches most target jobs.

- Verdict per platform (automated, unattended submission via Playwright):
  - **Greenhouse: PROHIBITED** — explicit clause (z) in the candidate-facing My Greenhouse User Agreement bans "automated means, including spiders, robots, crawlers, or similar means or processes to access or use the Services"; MSA §4(c) adds circumvention/interference restrictions and termination rights.
  - **Lever: NOT EXPLICITLY RESTRICTED** in published terms (no candidate ToS exists; employer ToS has only a catch-all + abuse/security suspension clause), but implicitly constrained by rate limits and the expectation that programmatic submission goes through the Postings API.
  - **Workday: RESTRICTED/PROHIBITED** — Site Terms ban robots and any application interacting with Workday sites without prior written consent; the AUP (binding customers, incl. Student/Recruiting tenants) bans unauthorized scraping/extraction via web client and circumvention; candidate-level terms are employer-configured and vary per tenant.

- Recommended product decision:
  - **No-go for fully unattended auto-submit** on any of the three: Greenhouse's ban is explicit, Workday's consent-based prohibitions are broad, and Lever's abuse clause + rate limits make high-volume unattended submission risky and technically fragile.
  - **Go with a human-in-the-loop design**: automation pre-fills and validates the application; a human reviews and clicks the final submit (and completes CAPTCHAs / employer-required attestations). This keeps the human as the actor "using the Service," avoids the automated-submission core of Greenhouse clause (z) and Workday's consent language, and matches employer expectations of genuine, reviewed applications.
  - Treat Greenhouse as the design's compliance ceiling (strictest terms) and honor per-employer terms on Workday tenants; on Lever, stay well under API/UI rate limits. Legal sign-off recommended before launch, especially for the Greenhouse and Workday integrations.

---

## Change log

| Date | Change |
|---|---|
| 2026-08-17 | Initial review (Greenhouse User Agreement eff. 2025-01-29, MSA 2026-02-01; Lever ToS 2023-08-25; Workday Site Terms 2024-08-19, AUP 2026-02-12). Added Quick Reference + checklists. Decision: no unattended auto-submit; human-in-the-loop only. |