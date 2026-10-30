# Final demonstration checklist

Live website: https://profily-ai.vercel.app  
Judge walkthrough: https://profily-ai.vercel.app/profile/judge  
Source: https://github.com/Lakshyalamba/profily-ai

The malformed URL in the refinement request is not the project address. Use the verified URLs above. This checklist supplements the exact narration in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Before recording

- [ ] Use the actual recording computer with Chrome, HTTPS, working microphone and speakers. Close unrelated private tabs and hide credentials.
- [ ] Open `/profile/judge` in a signed-out/new browser session. Confirm the fictional Jordan label, sample-resume disclosure, real Express repository commit and ten evidence sources.
- [ ] Physically test **Start voice → allow microphone → speak a question → check transcription → hear the reply**. Verify listening/processing/speaking labels. Then test **Interrupt & ask**, **Mute/Unmute**, **Stop voice**, **Text mode**, and a typed follow-up. Automated voice tests are not microphone or speaker certification.
- [ ] Download `/samples/fictional-judge-resume.pdf`. In `/create`, consent, upload only that fictional PDF and import `https://github.com/expressjs/express`. Review/edit, select evidence, save and inspect `/profile/private`. Prepare this before recording; do not imply an edited cut is instantaneous processing.
- [ ] If showing sharing, open `/publish`, review approved fields and excerpts, consent, publish and open the resulting `/p/[id]` in a separate browser. Raw resume pages must not appear. Only use fictional information. Revoke the test link afterward.
- [ ] Prepare tabs for `/`, `/profile/judge`, `/interview?profile=judge`, `/match?profile=judge`, `/analytics`, and your actual downloaded report. Analytics must show actual saved activity, including zero where appropriate.
- [ ] Make one rehearsal, then pause before repeating many requests. The application allows **12 AI requests per browser session per minute and 120 globally per hour**, across ingestion, chat, interview and matching. Gemini can impose separate model/account quotas; a successful preflight is not a reservation or guarantee. Do not rapidly repeat uploads/analyses during the video. No quota was increased or reset for the demo.
- [ ] Open Wispr Flow desktop **Insights → Your usage** and capture your genuine usage card. Review it for privacy. Do not substitute Profily analytics, invent usage numbers or expose unrelated dictation history.

## Recording sequence — maximum 2:00

| Time | Exact page / action | What to establish |
|---|---|---|
| 0:00–0:12 | Fictional PDF, then `/` | Static skill lists leave questions about practical work. |
| 0:12–0:25 | `/profile/judge` | No login; fictional person and real repository evidence clearly distinguished. |
| 0:25–0:38 | Prepared `/create` review or `/profile/private` | Actual extracted fields are editable and require approval; no automatic public posting. |
| 0:38–0:58 | `/interview?profile=judge`, consent and start; use **Start voice** | Actually say **“What supports PostgreSQL experience?”** Show real recognized text and processing. |
| 0:58–1:17 | Active interview, expand the citation mentioning transactions; ask **“Did this developer author Express?”** | Resume support is a self-reported claim. Repository contents do not establish personal authorship. Expand a real pinned repository excerpt if helpful. |
| 1:17–1:32 | Ask **“What evidence establishes Kubernetes production operations?”** | Show actual insufficient evidence or withheld output. Do not claim unknown experience is proven absent. |
| 1:32–1:46 | **End & create brief → Download PDF**, or prepared `/match?profile=judge` result | Show the actual questions/sources/report, or supported/partial/not-established role explanations. Label any cut to a previously completed session. |
| 1:46–2:00 | Genuine **Wispr Insights usage card**, brief real dictation-to-Codex clip if available, then live URL/repository | Say: **“I used Wispr Flow to dictate development instructions into Codex. Runtime voice uses browser speech services.”** There is no Wispr API/SDK integration in Profily. |

### Job comparison text

Paste this into `/match?profile=judge` and optionally consent to save:

```text
Backend internship. Requirements:
- Express REST APIs
- PostgreSQL transactions
- Kubernetes production operations
Explain what the supplied evidence supports for each requirement.
```

Inspect **Job description excerpt** and source citations. Supported means support in the supplied material, not independent proficiency verification. Open `/analytics` afterward to show the real saved comparison/session count. A fresh guest opening a published profile can save a comparison without creator authentication; their private record is isolated from the creator.

## Honest fallbacks and submission

If recognition or playback fails, show the error, stop voice and type. Do not describe that take as a successful spoken round-trip. Re-record voice after resolving device permissions if you want a voice demonstration. Model output is displayed after validation, not token-streamed; edit between actual states without inventing results or hiding that a report was withheld. Stop a rehearsal if provider quota errors appear rather than generating fake answers.

The [current official challenge page](https://www.wemakedevs.org/wispr), checked 30 October 2026, asks for a working project, a video up to two minutes, a genuine desktop Insights card and a short problem/audience/Wispr explanation. It lists 31 October, 11:59 PM IST. An older official announcement lists 30 October; confirm the active portal if uncertain. Review eligibility, registration and weekly participation requirements in [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md). Only the owner should approve and submit the final entry. No entry has been submitted by Codex.
