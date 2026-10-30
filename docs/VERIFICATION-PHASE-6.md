# Phase 6 verification — 30 October 2026

## Published endpoints

- Website: https://profily-ai.vercel.app
- No-sign-in judge profile: https://profily-ai.vercel.app/profile/judge
- Public source: https://github.com/Lakshyalamba/profily-ai
- Initial GitHub CI: https://github.com/Lakshyalamba/profily-ai/actions/runs/41053559174 (passed). The latest source commit must also pass CI before final handoff.

Production is a real Vercel deployment backed by a permanent free Upstash Redis database. Paid automatic upgrades are disabled. Gemini credentials are configured as server-only sensitive variables. No real candidate records were migrated or published. The owner authorized Vercel sign-in, accepted the integration terms and connected GitHub to resolve a blocked update's commit-attribution check. The final update is being reverified; the original production deployment already passed the live checks below.

## Improvements

- Durable Redis adapter preserves the existing local filesystem option. Cross-instance leases, ownership fencing, atomic finalization, bounded records, expiry and shared AI quotas replace unsafe ephemeral filesystem assumptions on Vercel.
- Vercel HTTPS origin validation and Secure owner cookies; no missing-storage fallback. Anonymous chat receives an owner session rather than sharing one anonymous quota bucket.
- PDF upload cap reduced to 4 MB for serverless request limits; AI route/client timeouts aligned with the platform. Fonts and the isolated PDF parser remain included in deployment tracing.
- Public Jordan judge walkthrough: actual Gemini-parsed fictional resume, real retrieved Express repository at commit `1c6f1b0fe4000977b9a7b4f34097e4d527dd9824`, ten source excerpts, explicit synthetic-person and non-authorship disclosures. Sample PDF and Express MIT attribution are included.
- Job comparison gets one bounded correction attempt for an invented/paraphrased requirement quote or invalid evidence selection, while still rejecting unsupported output. A regression test verifies correction followed by grounding review.
- Mobile navigation closes on link selection and Escape; mobile editor actions precede the long explanatory sidebar. Storage privacy text now describes the deployed cookie-based experience accurately.
- Public README, deployment guide, timestamped demo script, submission draft, official-requirements checklist, screenshots and actual fictional interview PDF.

## Automated and live verification

| Check | Actual result |
|---|---|
| TypeScript | Passed `next typegen` and `tsc --noEmit` |
| ESLint | Passed |
| Automated tests | **49 passed**, zero failed/skipped |
| Production build | Passed Next.js optimized build |
| Hosted routes | **11 page routes**, 15 linked internal routes/assets, no empty placeholder links or missing static anchors |
| Resume → repository → reviewed profile | **7 live checks passed**, real PDF extraction and Gemini structuring, real Express retrieval/analysis, explicit save, cited chat/history, unsupported-achievement uncertainty, job comparison |
| Hosted interviews | **12 live checks passed**: consent, frozen snapshot, owner isolation, actual Gemini answers/history, replay idempotency, uncertainty, end/brief, real PDF, saved job comparison, exact recorded analytics and cleanup |
| Public sharing | **5 live checks passed**: explicit consent, independent guest, private/public revision isolation, live Gemini public chat, creator cannot read guest transcript, owner-only revocation and resulting 404 |
| Actual durable database | Two independent processes retained both updates; real publication/readback, interview persistence, revocation and expiry; shared quota denied request 13; simulated lost lease rejected stale writes |
| Deployed browser | Chrome: public judge, exact source expansion, non-authorship follow-up, interview consent, two recorded questions, completed brief and actual downloaded PDF |
| PDF inspection | Actual deployed two-page fictional Jordan report rendered and inspected on both pages; source quotes, provenance and page numbers legible, no observed clipping |
| Client secret exposure | Actual Gemini key absent from 11 downloaded production JS bundles; seven private credential values absent from the source scan |
| HTTP controls | Foreign-origin profile deletion returned 403; deployed nosniff, DENY framing and self-only microphone permissions policy observed |

JSON evidence is in `docs/phase-six/`. Tests use synthetic personal data and their own cookies. Redis concurrency tests use an isolated namespace, not a database flush. No test claims a voice input that was actually typed. Earlier CLI HTTP runs encountered connection closures/timeouts; a complete rerun with separate HTTP connections passed. The first live assertion assumed uncertainty must appear in one field; it now accepts a source-backed explicit “not established” statement too. A browser job comparison correctly rejected a paraphrased requirement; the bounded correction fix is covered by the added regression test and requires final hosted recheck.

## Voice and remaining limitations

Chrome's production microphone request timed out without confirmation; the app displayed a useful error and left text input usable. The owner chose to test the physical speech → Gemini → audible reply round-trip later. Recognition, audible playback and real-device interruption are therefore **not attested as end-to-end successful**. Automated voice controller tests cover listening/processing/speaking sequencing, submit-once, stop, interruption, mute, unsupported browsers, permission failures and timeout recovery. Browser speech services may process audio remotely; Profily stores no audio.

Provider failures, quota, conservative grounding rejection, sampled GitHub coverage and no OCR remain limitations. Records are cookie-owned with no account recovery; user publications expire after seven days. Public revocation cannot recall an already downloaded report or retained interview snapshot. Remote record size is capped at 3 MB. Demo data is fictional and source labels must remain visible. No measured hiring, productivity, accuracy or performance outcome is claimed.

## Manual submission work

The owner still needs to verify voice on the recording machine, record/upload a video of at most two minutes, capture a genuine Wispr Insights usage card, confirm eligibility/registration and the deadline conflict, review the description and submit the entry. No hackathon submission, social post or private-candidate publication was performed. See `SUBMISSION_CHECKLIST.md` for the current official page versus older announcement distinction.
