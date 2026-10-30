# Final refinement — 30 October 2026

Website: https://profily-ai.vercel.app  
Judge walkthrough: https://profily-ai.vercel.app/profile/judge  
Public repository: https://github.com/Lakshyalamba/profily-ai

The malformed judge URL in the refinement request is not the deployed project address. The correct page is linked above and remains accessible without sign-in.

## Scope and fixes

Preserved the existing architecture, dark theme, components and evidence pipeline. No dependency or new product feature was added.

1. **Microphone callback race:** an already-queued `onstart` from an aborted recognizer could cancel the next recognizer's permission watchdog. The callback now checks its session generation before touching the timer. Normal recognition end also clears its own timer. The new regression failed against the previous controller (`requesting` instead of returning to `idle`) and passes with the fix. This is a controller test, not a physical voice round-trip.
2. **First-time public guest job saving:** saving a comparison immediately after opening a published profile returned 401 if no browser session had been created. The match endpoint now creates the same isolated, HttpOnly, SameSite cookie session used by chat/interviews. Saving remains explicit opt-in; private-profile evidence still requires an existing authorized session. The regression reproduced the old 401 and now verifies saved analytics, guest/creator isolation and denial of cookie-free private access. The live sharing script now exercises this case with actual Gemini.

## Checks completed before the deployment update

- TypeScript, ESLint, **51 automated tests**, and optimized production build passed.
- Real hosted sample-PDF extraction, Express GitHub retrieval/analysis, review/save, contextual conversation, follow-up, unsupported-achievement uncertainty and job comparison: **7 checks passed**.
- Real hosted interview consent, source snapshot, owner isolation, Gemini follow-ups, idempotent turns, uncertainty, brief generation, PDF export, saved matching, analytics and cleanup: **12 checks passed**.
- Initial independent guest publication/chat/revocation sweep: **5 checks passed**. The expanded post-update live sweep passed six checks, including cookie-free saved matching and recruiter isolation.
- Main route sweep: **11 routes and 15 linked internal routes/assets passed**; no empty placeholder links or missing static anchors.
- Production Redis accepted reads and actual workflow writes. Its global AI quota counter had no active window before this run. Current headroom is a point-in-time observation, not a reservation.
- Chrome public judge conversation returned actual Gemini answers and exact source expansions, with fictional-resume and real-repository provenance visible.

## Deployment update and final evidence

Vercel deployment `dpl_92zwkWpkH5GTLyfiRDJTUTK79yrs` is **READY**, assigned to `profily-ai.vercel.app`. Runtime fixes are in commit `48909b7`; later documentation/test updates do not change the deployed application. [CI for that application commit passed](https://github.com/Lakshyalamba/profily-ai/actions/runs/41079689746).

After deployment, the expanded real-provider public workflow passed **six checks**, including a cookie-free guest consenting to save a job comparison, a separate creator dashboard remaining unchanged, guest transcript isolation and owner-only revocation. The final route sweep again passed 11 pages and 15 links/assets. Chrome displayed the actual judge comparison on mobile and desktop, including exact job/source quote expansion and the unsupported Kubernetes requirement.

Source inspection checked seven private credential values with no matches. All 12 JavaScript bundles loaded by the production judge page were checked with no credential matches. Private environment files and candidate data were not tracked. A foreign-origin deletion request returned 403, and actual production owner cookies were Secure, HttpOnly and SameSite=Strict.

At `2026-10-30T15:24:30Z`, the real Redis global quota counter held 17 of 120 requests, leaving 103 app-budget requests in that window. A later browser comparison consumed one more app request. These are snapshots, not provider quota guarantees; no budget was reset or increased.

Screenshots and machine-readable evidence are in `docs/refinement/`: actual hosted ingestion, interview/PDF and sharing results; route, security, quota and layout checks; and the downloaded fictional interview report. Both report pages were rendered and visually inspected for legibility, page numbering, source labels and clipping.

## Browser and UI coverage

Chrome checks covered the guest judge profile, live text question and authorship follow-up, citation expansion, mobile menu navigation, empty-file upload validation, project add/remove controls, existing recorded dashboard counts, saved brief, interview consent screen, and actual judge job comparison. The landing page, editor, judge, dashboard, brief, interview-start and job views were measured at 390 px; judge and job result were also checked at normal desktop width. No horizontal overflow was observed; the editor form precedes its explanatory sidebar and menus close on navigation. Mobile screenshots and desktop comparison were visually reviewed. Responsive viewport testing is not physical-phone certification.

Actual multipart PDF upload and parsing passed in the hosted HTTP workflow. Browser-driven file selection was not repeated because earlier automation was blocked by the extension's file-URL permission; no extra extension access was granted. The manual preflight includes selecting the sample PDF in the recording browser. This review does not claim exhaustive testing of every possible input or physical browser/device combination.

## Voice testing boundary

Automated coverage includes permission errors/timeouts, unsupported recognition, submit-once, listening/processing/speaking sequencing, mute, interruption, stop during processing, cleanup, browser exceptions, and stale callback handling. UI checks can confirm the controls and fallback behavior, but cannot certify what a physical microphone captures or what a listener hears. The owner must test recognition, audible responses and interruption on the recording computer. No audio, physical voice interaction or Wispr usage statistic was fabricated.

## Documentation and demonstration

README, submission description and two-minute script were reviewed. Wispr Flow is accurately described as dictating development instructions into Codex; runtime voice uses browser speech services, with no Wispr API/SDK integration. The [final demonstration checklist](FINAL_DEMO_CHECKLIST.md) specifies exact pages, questions, source inspection, report/job-comparison steps and the genuine Insights usage card at 1:46–2:00. It also provides a physical voice preflight and honest recording fallback.

## Remaining limitations

Gemini and GitHub provider quotas/latency can still interrupt service; successful requests cannot guarantee future provider quota. The app's shared budget is 120 AI requests/hour and its per-session budget is 12/minute. A normal two-minute sequence needs substantially fewer requests, but other visitors and rehearsals share the global allowance. No limits were raised or reset for the recording.

Browser speech recognition/synthesis depend on browser support, HTTPS, permissions and service availability. Resume OCR and private repositories remain unsupported. Source inspection is sampled, and grounding can conservatively withhold an answer. Cookie ownership has no account recovery; user publications expire after seven days. No hiring score, independent proficiency certification or measured productivity improvement is claimed.

The owner still needs the physical audio test, actual video, genuine Wispr desktop Insights card, final eligibility/deadline/form review and explicit submission approval. No hackathon entry or social post has been submitted, and no private candidate data was published.
