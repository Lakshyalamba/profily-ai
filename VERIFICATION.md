# Phase two verification

Verified on 30 October 2026 (India time). The final complete live test exited successfully.

## Passed

- TypeScript: `npm run typecheck` (Next route type generation plus tsc).
- Lint: `npm run lint`, no warnings.
- Automated tests: `npm test`, 11 passed. These include real PDF extraction, malformed inputs, repository URL and file selection restrictions, citation/span resolution, stable isolated sessions and serialized writes, source-group validation, sanitized AI errors, local Host/origin handling, uncited-fact rejection, withheld unsafe output, hypothetical follow-ups, and mixed supported/missing job requirements.
- Production: `npm run build` and `npm start` passed.
- Live end-to-end: `npm run test:live`, seven workflow checks passed with actual Gemini requests.

## Live workflow

Model: `gemini-3.1-flash-lite`. Finished at 2026-10-29T20:17:39.282Z.

1. Live PDF text extraction and Gemini structuring with references; no automatic save
2. Live public Express repository retrieval and Gemini analysis pinned to a commit
3. Explicit review/save creates a private snapshot
4. Live contextual chat returns checked source citations
5. Follow-up chat processes conversation history
6. Unsupported achievements produce explicit insufficient-evidence messaging
7. Live job requirement extraction, status assessment, and cited explanations

The synthetic temporary session used by the test was deleted successfully.

Repository: https://github.com/expressjs/express

Commit: `1c6f1b0fe4000977b9a7b4f34097e4d527dd9824`.

The public repository was genuinely fetched earlier in this session and its metadata, tree, README, manifests and selected code were inspected. Repeated runs reached GitHub's unauthenticated API limit, so the final run used a labeled cache of that actual commit-pinned snapshot. Cache entries retain their original fetch timestamp and expire after 30 minutes. No repository analysis was fabricated, and Express is never attributed as the fictional candidate's work.

## Browser and input checks

- The existing dark design was visually inspected after the changes.
- A synthetic PDF was selected through the browser file chooser, processing was authorized, the extraction populated editable fields and projects, the extracted name was edited, repository analysis completed, and explicit review/save opened the private profile.
- The browser's synthetic Jordan Ellis profile remains available in that browser session for demonstration; it contains no real personal data.
- Unauthenticated private writes/queries returned 401, an external Origin returned 403, an overlong question returned 400, and an oversized request returned 413. A new session could not see the saved profile; private responses use no-store.
- The configured credential was absent from all 32 generated browser assets checked. The example environment file has a blank key; the actual key is in ignored `.env.local`.
- The synthetic resume fixture was rendered and visually inspected before use.

## Observed limits and pending work

The key's gemini-2.5-flash free daily allowance of 20 requests was exhausted during verification. Configuration was changed to the available gemini-3.1-flash-lite model and the final complete workflow passed with it. Quota and API availability remain provider-dependent and produce explicit errors.

Real microphone recognition, mobile-device rendering, screen-reader testing, scanned/OCR resumes, large-repository stress tests, and concurrent multi-instance deployment were not verified. Unit tests cover selected failure paths, not every adversarial document or prompt injection. Model review reduces unsupported claims; it is not a correctness guarantee.

Public publishing, accounts, durable production storage, verified GitHub contribution attribution, background ingestion, advanced voice features and interview briefings remain future work. The private store targets one local Node server.

The verification server was stopped after the checks. Start it again with `npm run dev`.
