import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VoiceController,
  type Recognition,
  type VoiceEnvironment,
} from "../src/lib/voice/controller";
class FakeRecognition implements Recognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: (() => void) | null = null;
  started = false;
  aborted = false;
  start() {
    this.started = true;
    this.onstart?.();
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
    this.onend?.();
  }
  final(text: string) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: text } }],
    });
  }
}
function harness(
  handler: (q: string, mode: "text" | "voice") => Promise<string>,
) {
  const recognizers: FakeRecognition[] = [];
  let spoken = "",
    finish: (() => void) | null = null;
  const env: VoiceEnvironment = {
    recognition: () => {
      const r = new FakeRecognition();
      recognizers.push(r);
      return r;
    },
    speak: (text, done) => {
      spoken = text;
      finish = done;
    },
    cancel: () => {},
  };
  const voice = new VoiceController(() => env, handler);
  voice.mount();
  return { voice, recognizers, spoken: () => spoken, finish: () => finish?.() };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
test("speech submits once, pauses mic during AI and playback, and resumes after speech", async () => {
  const calls: string[] = [];
  const h = harness(async (q, mode) => {
    calls.push(mode + ":" + q);
    return "Evidence-backed answer.";
  });
  h.voice.start();
  assert.equal(h.voice.snapshot().phase, "listening");
  const r = h.recognizers[0];
  r.final("How was PostgreSQL used?");
  assert.equal(r.aborted, true);
  await tick();
  assert.equal(h.voice.snapshot().phase, "speaking");
  assert.equal(h.spoken(), "Evidence-backed answer.");
  r.final("duplicate");
  assert.equal(calls.length, 1);
  h.finish();
  assert.equal(h.recognizers.length, 2);
  assert.equal(h.voice.snapshot().phase, "listening");
  h.voice.dispose();
});
test("permission denial and unavailable recognition leave text usable", async () => {
  const h = harness(async () => "Text answer");
  h.voice.start();
  h.recognizers[0].onerror?.({ error: "not-allowed" });
  assert.equal(h.voice.snapshot().active, false);
  assert.match(h.voice.snapshot().error, /permission/i);
  await h.voice.ask("Typed question");
  assert.equal(h.voice.snapshot().phase, "idle");
  const unavailable = new VoiceController(
    () => ({ recognition: null, speak: null, cancel() {} }),
    async () => "answer",
  );
  unavailable.mount();
  unavailable.start();
  assert.match(unavailable.snapshot().error, /not supported/);
  await unavailable.ask("Still works");
  assert.equal(unavailable.snapshot().phase, "idle");
  h.voice.dispose();
  unavailable.dispose();
});
test("interrupt and mute cancel playback; stopped conversations do not restart", async () => {
  const h = harness(async () => "Answer");
  h.voice.start();
  h.recognizers[0].final("question");
  await tick();
  h.voice.interrupt();
  assert.equal(h.voice.snapshot().phase, "listening");
  h.finish();
  assert.equal(h.recognizers.length, 2);
  h.voice.mute();
  h.recognizers[1].final("next");
  await tick();
  assert.equal(h.voice.snapshot().phase, "listening");
  assert.equal(h.voice.snapshot().muted, true);
  h.voice.stop();
  assert.equal(h.voice.snapshot().active, false);
  h.finish();
  assert.equal(h.voice.snapshot().phase, "idle");
  h.voice.dispose();
});
test("stopping during processing prevents late speech and microphone restart", async () => {
  let complete!: (text: string) => void;
  const h = harness(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  h.voice.start();
  h.recognizers[0].final("Question");
  h.voice.stop();
  complete("Late answer");
  await tick();
  assert.equal(h.spoken(), "");
  assert.equal(h.recognizers.length, 1);
  assert.equal(h.voice.snapshot().phase, "idle");
  h.voice.dispose();
});
test("disposal suppresses stale recognition callbacks and background playback", async () => {
  let count = 0;
  const h = harness(async () => {
    count++;
    return "answer";
  });
  h.voice.start();
  const callback = h.recognizers[0].onresult;
  h.voice.dispose();
  callback?.({
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: "late" } }],
  });
  await tick();
  assert.equal(count, 0);
  assert.equal(h.voice.snapshot().active, false);
});

test("an unanswered microphone permission request times out without trapping text input", async () => {
  const recognition = new FakeRecognition();
  recognition.start = () => {};
  const voice = new VoiceController(
    () => ({ recognition: () => recognition, speak: null, cancel() {} }),
    async () => "Text answer",
    5,
  );
  voice.mount();
  voice.start();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(voice.snapshot().active, false);
  assert.match(voice.snapshot().error, /permission was not confirmed/);
  await voice.ask("Typed fallback");
  assert.equal(voice.snapshot().phase, "idle");
  voice.dispose();
});

test("a stale recognition start cannot disable the next microphone-permission timeout", async () => {
  const recognizers: FakeRecognition[] = [];
  const voice = new VoiceController(
    () => ({
      recognition: () => {
        const recognition = new FakeRecognition();
        recognition.start = () => {};
        recognizers.push(recognition);
        return recognition;
      },
      speak: null,
      cancel() {},
    }),
    async () => "Typed fallback answer",
    5,
  );
  voice.mount();
  voice.start();
  const oldStart = recognizers[0].onstart;
  voice.stop();
  voice.start();
  oldStart?.(); // The old browser event was queued before its handlers were removed.
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(voice.snapshot().phase, "idle");
  assert.equal(voice.snapshot().active, false);
  assert.match(voice.snapshot().error, /permission was not confirmed/);
  await voice.ask("Continue by typing");
  assert.equal(voice.snapshot().phase, "idle");
  voice.dispose();
});
