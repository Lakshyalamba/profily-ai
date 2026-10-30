# Phase three verification

Verified on 30 October 2026 (Asia/Kolkata). Existing phase one and two services/design were extended in place.

## Passed

- `npm run typecheck`: Next route generation and TypeScript passed.
- `npm run lint`: passed without warnings.
- `npm test`: 22 automated tests passed, including all prior evidence tests. New checks cover voice turn-taking, permission/unsupported/network paths, interruption, mute, processing cancellation, stale callbacks, microphone timeout, immutable interview snapshots, owner isolation, idempotent turns/end, summaries, actual-data analytics, long-history retention beyond the casual chat window, and PDF wrapping/pagination/Unicode fallback.
- `npm run build`: production build passed; `npm start` served the final build.
- Credential scan: the configured key was absent from all 43 browser assets checked. No trace manifest included private .data files or .env.local.
- PDF fonts and their license were included in the export route's file trace.

## Real-provider HTTP workflow

`npm run test:interview` passed all 12 checks with actual Gemini requests, finishing at 2026-10-30T05:41:28.992Z.

1. Guest-accessible fictional profile opens
2. Fresh recruiter session shows zero actual activity
3. Explicit transcript consent creates an interview with a frozen profile snapshot
4. Interview access is isolated between browser sessions
5. Real Gemini interview answer contains server-checked evidence citations
6. Follow-up uses the server-recorded conversation history
7. A replayed request does not duplicate a question or analytics
8. Unsupported experience stays explicitly unverified
9. Ending automatically compiles a grounded brief from all recorded questions
10. Completed interview exports a real downloadable PDF
11. Opted-in live Gemini job matching is recorded in the same recruiter dashboard
12. Analytics match the actual three text turns, one interview and one saved comparison

The API run recorded exactly three text questions, zero voice questions, one completed interview and one opted-in job report, then successfully deleted its temporary interview/report and verified zero remaining counts. It did not inject fake statistics. The example candidate/evidence were explicitly synthetic.

Final-build smoke checks also passed for /, /profile/demo, /interview?profile=demo, /analytics, and /match; private filesystem URLs returned 404. A fresh session showed zero activity. Starting and ending a zero-question session produced an honest empty brief and downloadable PDF; cleanup succeeded.

## Browser verification

The guest profile and voice section were inspected at a narrow mobile-like viewport and a desktop-sized panel. Starting an interview required transcript consent. A real browser session asked two text questions through Gemini, received source-linked answers and a contextual follow-up, ended, compiled its brief, and downloaded the PDF through the actual Download PDF control. The recruiter dashboard showed exactly one completed interview, two text questions, zero voice questions and zero saved job reports for that browser. This real synthetic demonstration record remains available in that browser session; it was not pre-populated mock activity.

The browser entered the speaking state using Read answer, and mute canceled playback and returned it to idle. Microphone recognition reached requesting/listening, then the browser speech service reported a network error. The app returned to a usable text interface. The session's voice count remained zero because no verbal question was recognized and submitted.

**A complete physical microphone-to-transcript-to-audible-answer round trip was not verified.** Simulated recognition/synthesis drivers test the controller's sequencing and failure behavior only; they are not evidence of working device audio. Browser support, permission behavior, network access to vendor speech services, and audible output still require a target-device check. A later microphone-permission timeout is covered by the automated suite.

## Summary and PDF integrity

Briefs are compiled from saved, checked answers and source citations. No extra model invents candidate strengths, scores or interview outcomes. Every recorded question is retained; repeated uncertainty statements are deduplicated. Skill/topic counts are keyword groupings of recorded text, not independently verified proficiency. The full transcript remains inspectable alongside the excerpted brief.

The sample PDF in docs/phase-three-sample-brief.pdf was downloaded from the real browser interview and refreshed from that exact saved session after final typography polish. Both A4 pages were rendered and visually inspected: headings, wrapping, source references, provenance, page breaks, and page numbering were legible and unclipped. The export contains no PDF JavaScript or forms. Long text, long tokens and unsupported glyph notation are also exercised by the automated PDF test.

## Routes and limits

New screens: /interview, /interview/[id], /analytics. New session APIs support consented creation, checked turns, detail access, end/brief creation, deletion, and private PDF download. Job results are retained only when explicitly opted in. Public browsing continues to use the fictional demo; real candidate profiles remain private.

Voice is turn-based, with explicit interruption controls, not a full-duplex Gemini Live connection. English recognition is configured initially. No audio recording/upload/storage was added. Browser services may process speech/audio or spoken answer text remotely.

Interviews retain up to 30 questions and use all earlier recorded turns within that cap for context, with up to 8,000 characters of each prior answer in the model payload. The server keeps up to 20 sessions and 30 job reports per browser workspace. Storage remains a single local server's private filesystem, expires after seven days without a write (removed on later access), and is not encrypted or account-recoverable. Public publishing, authentication/production database work, multi-instance load, multilingual voice selection, full-duplex audio, and physical mobile devices are not claimed as verified.

The verification server was stopped after checks. Run npm run dev from the project directory to resume.
