# Profily AI interface redesign

The redesign changes presentation across the existing application. APIs, Gemini prompts and grounding checks, Redis services, data contracts, private-cookie ownership and the browser voice controller are unchanged. The only page-level state correction remounts interview and job forms when their selected profile query changes, preventing the previous candidate from remaining selected.

## Design and route coverage

- Shared midnight surfaces, blue/violet primary actions, cyan focus treatment, consistent spacing, borders, status colors and typography. Manrope is self-hosted under its included SIL Open Font License; the PDF fonts are unchanged.
- Responsive branded header, active navigation, mobile menu, workspace sidebar and useful footer links. No invented company or social links.
- `/`: editorial hero, interactive **scripted, fictional** preview, evidence story, three-step workflow, asymmetric feature sections and clear entry points.
- `/create`: real-state import/review/saved steps, upload well, repository fields and reviewed-save presentation. Import and publication consent are preserved.
- `/profile/private`, `/p/[id]`, `/profile/demo`, `/profile/judge`: candidate identity hero, project visuals, skill badges, experience/education timeline, source disclosures and expandable excerpts. Actual resume claims and observed repository evidence remain distinct.
- `/publish`: approved fields, evidence selection, public-link controls and an accessible unpublish confirmation.
- Profile conversations and `/interview/[id]`: refined message history, citation disclosures, composer, suggested questions and evidence-processing states. Voice has an idle orb and state-dependent animations; it does not simulate sound levels. **Type instead** stops voice and links directly to the input. The voice controller and microphone permission behavior remain unchanged.
- `/interview`: consented session entry. Completed sessions: actual-data brief overview, transcript, sources and original PDF export.
- `/match`: real requirement-count breakdown and source-linked supported/partial/not-established cards. No compatibility score or ranking.
- `/analytics`: actual recorded metrics, activity chart, skills, interview and saved-comparison history. No demo activity is injected.
- Consistent errors, empty states, workspace route loading skeletons and native confirmation dialogs for destructive controls. Confirmations initially focus the safe action; Escape closes them.

## Shared components

`ExperienceShell`, `Reveal`, `TopNavigation`, `ProductPreview`, `RequirementBreakdown`, and `ConfirmAction` accompany the updated existing shell, profile, editor, chat, voice, publishing, dashboard and report components. Seven stylesheets in `src/styles` separate foundation tokens, shell, landing, workspace, profile, conversation and reporting styles. Motion for React provides small marketing reveals and preview transitions. Reduced-motion preferences disable movement; CSS also disables animation and scrolling effects. Server-rendered content remains available with JavaScript disabled.

## Verification before deployment

- TypeScript generation/check: passed.
- ESLint: passed.
- Automated tests: **51 passed, 0 failed, 0 skipped**. Voice tests use mock browser drivers; they are not physical audio tests.
- Production build: passed.
- Local production HTTP check: **12 routes and 19 internal routes/assets**, no empty links or missing page anchors.
- Chrome: private profile review/save, approval/publication, published profile consistency, actual cited Gemini chat, profile-specific interview entry, two-question judge interview, unsupported Kubernetes follow-up, deterministic brief and browser PDF download. The downloaded PDF has a valid `%PDF-` header (28,370 bytes). Mute, direct text fallback and safe confirmation cancellation were checked. No physical speech was represented as tested.
- Actual Gemini job comparison: Express and PostgreSQL requirements supported by **self-reported fictional resume claims**, Kubernetes production operations not established. No repository authorship was inferred.
- Actual analytics: one completed interview and two typed turns at capture time; zero voice turns and no saved job report. Later local layout checks created another empty session, which is genuine test activity, not a pre-seeded statistic.
- Chrome layout checks: desktop 1512, phone 390 and 360, tablet 820 pixels across the main route families; no horizontal overflow. Menus, Escape, focus, composer, evidence links, report and missing-page presentation were inspected. `ui-redesign/responsive-checks.json` records geometry observations.
- Fresh synthetic PDF extraction and Gemini structuring passed. The subsequent fresh Express import encountered **GitHub's anonymous public API rate limit (HTTP 429)** in the local environment; this is recorded in `ui-redesign/local-ingestion-check.txt`. No scripted success replaced it. The judge demo retains its real, pinned, bundled repository observations.
- Configured credential values scanned against public source/artifacts: no matches. Backend, AI services, hooks and voice-controller source have no redesign diff.

A live sharing regression test caught an initial global loading boundary returning a streamed HTTP 200 for a revoked page. Loading boundaries are now scoped to workspace routes; the revoked page and unknown route return HTTP 404 again. The complete local six-check sharing suite passes after this correction, including guest isolation and revocation. This changed no publication service code.

## Deployment verification

Production verification and screenshots are recorded here after the Vercel update is checked. No production environment variables are changed by this redesign.

## Remaining manual checks and limits

Physically test microphone permission, transcription, spoken playback, interruption and mute on the browser/device used for the recording. Browser speech availability, Gemini and GitHub quotas remain external dependencies. Live responses are validated before display rather than token streamed. Public links retain the original seven-day expiry. A narrow viewport has a stacked layout; neither mobile speech support nor a successful permission prompt can be inferred from a screenshot. Wispr Flow remains a development dictation tool used to enter instructions into Codex, not an application SDK or runtime speech integration. No hackathon submission is performed.
