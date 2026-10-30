import "server-only";
import { randomUUID } from "node:crypto";
import type { Snapshot } from "@/types/intelligence";
import type { Interview } from "@/types/interview";
import { interviewIn, loadActivity, updateActivity } from "./activity-store";
import { AppError } from "./http";
import { careerAnswer } from "@/lib/ai/career";
import { answerText, compileBrief } from "@/lib/interview-metrics";
export async function startInterview(
  owner: string,
  snapshot: Snapshot,
  mode: string,
) {
  const interview: Interview = {
    id: randomUUID(),
    profileMode: mode,
    snapshot,
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "active",
    consent: "transcript-v1",
    turns: [],
    pending: null,
    brief: null,
  };
  await updateActivity(owner, (data) => {
    if (data.interviews.length >= 20)
      throw new AppError(
        409,
        "INTERVIEW_LIMIT",
        "Twenty sessions are stored. Delete an old session before starting another.",
      );
    return { ...data, interviews: [...data.interviews, interview] };
  });
  return interview;
}
export async function interviewTurn(
  owner: string,
  id: string,
  input: { requestId: string; question: string; inputMode: "voice" | "text" },
) {
  let snapshot: Interview | undefined,
    existing = false;
  await updateActivity(owner, (data) => {
    const session = interviewIn(data, id);
    if (session.turns.some((t) => t.id === input.requestId)) {
      snapshot = session;
      existing = true;
      return data;
    }
    if (session.status !== "active")
      throw new AppError(
        409,
        "INTERVIEW_ENDED",
        "This interview is complete. Start a new session to ask more questions.",
      );
    if (session.turns.length >= 30)
      throw new AppError(
        409,
        "TURN_LIMIT",
        "This interview has reached 30 recorded questions. End it to create the brief.",
      );
    if (session.pending && Date.now() - session.pending.startedAt < 320000)
      throw new AppError(
        409,
        "TURN_PENDING",
        "A question is still being processed. Wait and reload to see its result.",
      );
    session.pending = { id: input.requestId, startedAt: Date.now() };
    snapshot = session;
    return data;
  });
  if (existing) return snapshot!;
  try {
    const session = snapshot!;
    const history = session.turns
      .flatMap((t) => [
        { role: "user" as const, text: t.question },
        { role: "assistant" as const, text: answerText(t).slice(0, 8000) },
      ])
      .slice(-60);
    const answer = await careerAnswer(
      session.snapshot,
      input.question,
      history,
    );
    const activity = await updateActivity(owner, (data) => {
      const current = interviewIn(data, id);
      if (
        current.pending?.id !== input.requestId ||
        current.status !== "active"
      )
        throw new AppError(
          409,
          "INTERVIEW_CHANGED",
          "The session changed while the question was processing. Reload it.",
        );
      current.turns.push({
        id: input.requestId,
        question: input.question,
        answer,
        inputMode: input.inputMode,
        createdAt: new Date().toISOString(),
      });
      current.pending = null;
      return data;
    });
    return interviewIn(activity, id);
  } catch (error) {
    await updateActivity(owner, (data) => {
      const current = data.interviews.find((s) => s.id === id);
      if (current?.pending?.id === input.requestId) current.pending = null;
      return data;
    });
    throw error;
  }
}
export async function endInterview(owner: string, id: string) {
  const activity = await updateActivity(owner, (data) => {
    const session = interviewIn(data, id);
    if (session.status === "completed") return data;
    if (session.pending && Date.now() - session.pending.startedAt < 320000)
      throw new AppError(
        409,
        "TURN_PENDING",
        "Wait for the current answer before ending the interview.",
      );
    session.pending = null;
    session.status = "completed";
    session.endedAt = new Date().toISOString();
    session.brief = compileBrief(session);
    return data;
  });
  return interviewIn(activity, id);
}
export async function getInterview(owner: string, id: string) {
  return interviewIn(await loadActivity(owner), id);
}
