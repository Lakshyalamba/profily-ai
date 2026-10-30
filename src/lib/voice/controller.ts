export type VoicePhase =
  "idle" | "requesting" | "listening" | "processing" | "speaking";
export type VoiceState = {
  phase: VoicePhase;
  active: boolean;
  muted: boolean;
  interim: string;
  error: string;
  recognitionSupported: boolean | null;
  synthesisSupported: boolean | null;
};
export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
export type VoiceEnvironment = {
  recognition: (() => Recognition) | null;
  speak: ((text: string, done: () => void, failed: () => void) => void) | null;
  cancel: () => void;
};
export type QuestionHandler = (
  question: string,
  inputMode: "voice" | "text",
) => Promise<string>;
export const initialVoiceState: VoiceState = {
  phase: "idle",
  active: false,
  muted: false,
  interim: "",
  error: "",
  recognitionSupported: null,
  synthesisSupported: null,
};
const recognitionErrors: Record<string, string> = {
  "not-allowed":
    "Microphone permission was denied. Allow it in your browser settings or continue by typing.",
  "service-not-allowed":
    "Speech recognition is blocked by this browser. Continue by typing.",
  "audio-capture":
    "No available microphone was found. Check your device or type instead.",
  "no-speech":
    "No speech was detected. Tap Start voice to try again, or type your question.",
  network:
    "The browser speech service could not connect. Text input still works.",
  "language-not-supported":
    "This speech language is unavailable. Please type your question.",
};
/** Browser-independent turn-taking controller. No audio is recorded or sent to the app server. */
export class VoiceController {
  private state = initialVoiceState;
  private listeners = new Set<() => void>();
  private environment: VoiceEnvironment | null = null;
  private recognition: Recognition | null = null;
  private epoch = 0;
  private disposed = false;
  private busy = false;
  private permissionTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(
    private getEnvironment: () => VoiceEnvironment,
    private handler: QuestionHandler,
    private permissionTimeoutMs = 30000,
  ) {}
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = () => this.state;
  setHandler(handler: QuestionHandler) {
    this.handler = handler;
  }
  private patch(update: Partial<VoiceState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    this.listeners.forEach((fn) => fn());
  }
  mount() {
    this.disposed = false;
    this.environment = this.getEnvironment();
    this.patch({
      recognitionSupported: !!this.environment.recognition,
      synthesisSupported: !!this.environment.speak,
    });
  }
  private stopAudio() {
    if (this.permissionTimer) clearTimeout(this.permissionTimer);
    this.permissionTimer = null;
    this.epoch++;
    const recognition = this.recognition;
    this.recognition = null;
    if (recognition) {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {}
    }
    try {
      this.environment?.cancel();
    } catch {
      /* Browser cancellation errors must not trap text input. */
    }
  }
  start = () => {
    if (this.busy || this.disposed) return;
    this.patch({ active: true, error: "" });
    this.listen();
  };
  stop = () => {
    this.stopAudio();
    this.patch({
      active: false,
      interim: "",
      phase: this.busy ? "processing" : "idle",
    });
  };
  interrupt = () => {
    if (this.busy) return;
    this.patch({ active: true });
    this.listen();
  };
  clearError = () => this.patch({ error: "" });
  mute = () => {
    const muted = !this.state.muted;
    this.patch({ muted });
    if (muted && this.state.phase === "speaking") {
      this.stopAudio();
      if (this.state.active) this.listen();
      else this.patch({ phase: "idle" });
    }
  };
  private listen() {
    this.stopAudio();
    if (!this.environment?.recognition) {
      this.patch({
        active: false,
        phase: "idle",
        error:
          "Speech recognition is not supported in this browser. Use text input; spoken playback may still be available.",
      });
      return;
    }
    let recognition: Recognition;
    try {
      recognition = this.environment.recognition();
    } catch {
      this.patch({
        active: false,
        phase: "idle",
        error:
          "This browser could not initialize microphone recognition. Continue by typing or try another supported browser.",
      });
      return;
    }
    const epoch = this.epoch;
    this.recognition = recognition;
    let submitted = false;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    this.patch({ phase: "requesting", interim: "", error: "" });
    this.permissionTimer = setTimeout(() => {
      if (epoch === this.epoch && this.state.phase === "requesting") {
        this.stopAudio();
        this.patch({
          phase: "idle",
          active: false,
          error:
            "Microphone permission was not confirmed. Check the browser prompt or continue by typing.",
        });
      }
    }, this.permissionTimeoutMs);
    recognition.onstart = () => {
      // A queued event from an aborted recognizer must not cancel a newer watchdog.
      if (epoch !== this.epoch || this.disposed) return;
      if (this.permissionTimer) clearTimeout(this.permissionTimer);
      this.permissionTimer = null;
      this.patch({ phase: "listening" });
    };
    recognition.onresult = (event) => {
      if (epoch !== this.epoch || submitted) return;
      let interim = "",
        final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript + " ";
        else interim += result[0].transcript;
      }
      this.patch({ interim: interim || final });
      if (final.trim()) {
        submitted = true;
        void this.ask(final.trim(), "voice");
      }
    };
    recognition.onerror = (event) => {
      if (epoch !== this.epoch) return;
      if (event.error === "aborted") return;
      this.stopAudio();
      this.patch({
        phase: "idle",
        active: false,
        interim: "",
        error:
          recognitionErrors[event.error] ||
          "Voice input could not continue. Please type your question or restart voice.",
      });
    };
    recognition.onend = () => {
      if (epoch !== this.epoch || submitted) return;
      if (this.permissionTimer) clearTimeout(this.permissionTimer);
      this.permissionTimer = null;
      this.recognition = null;
      this.patch({
        phase: "idle",
        active: false,
        interim: "",
        error:
          "Listening stopped without a complete question. Tap Start voice to try again.",
      });
    };
    try {
      recognition.start();
    } catch {
      this.stopAudio();
      this.patch({
        phase: "idle",
        active: false,
        error:
          "Microphone access could not start. Use HTTPS or localhost and check browser permissions. Text input is available.",
      });
    }
  }
  ask = async (question: string, mode: "voice" | "text" = "text") => {
    if (this.busy || this.disposed || !question.trim()) return;
    if (question.trim().length > 2000) {
      this.stop();
      this.patch({
        error:
          "Keep the question under 2,000 characters. Please edit it in the text input.",
      });
      return;
    }
    this.busy = true;
    this.stopAudio();
    this.patch({ phase: "processing", interim: "", error: "" });
    try {
      const response = await this.handler(question.trim(), mode);
      if (this.disposed) return;
      this.busy = false;
      if (this.state.active && !this.state.muted && response)
        this.say(response);
      else if (this.state.active) this.listen();
      else this.patch({ phase: "idle" });
    } catch (error) {
      this.busy = false;
      if (this.disposed) return;
      this.stopAudio();
      this.patch({
        phase: "idle",
        active: false,
        error:
          error instanceof Error
            ? error.message
            : "The answer could not be received. Please retry using text.",
      });
    }
  };
  say = (text: string) => {
    if (this.busy || this.disposed) return;
    this.stopAudio();
    if (this.state.muted) {
      this.patch({
        phase: "idle",
        error: "Audio is muted. Unmute to hear the answer.",
      });
      return;
    }
    if (!this.environment?.speak) {
      this.patch({
        phase: "idle",
        active: false,
        error:
          "Spoken playback is unavailable in this browser. The complete answer remains visible as text.",
      });
      return;
    }
    const epoch = this.epoch;
    this.patch({ phase: "speaking", error: "" });
    try {
      this.environment.speak(
        text,
        () => {
          if (epoch !== this.epoch || this.disposed) return;
          if (this.state.active) this.listen();
          else this.patch({ phase: "idle" });
        },
        () => {
          if (epoch !== this.epoch || this.disposed) return;
          this.stopAudio();
          this.patch({
            phase: "idle",
            active: false,
            error:
              "Spoken playback could not start. Read the text answer or tap Read answer to try again.",
          });
        },
      );
    } catch {
      this.stopAudio();
      this.patch({
        phase: "idle",
        active: false,
        error: "Spoken playback failed. The answer remains available as text.",
      });
    }
  };
  dispose() {
    this.stopAudio();
    this.disposed = true;
    this.busy = false;
    this.state = { ...this.state, phase: "idle", active: false, interim: "" };
  }
}
export function browserVoiceEnvironment(): VoiceEnvironment {
  const win = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Constructor = win.SpeechRecognition || win.webkitSpeechRecognition;
  const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
  let generation = 0;
  return {
    recognition: Constructor ? () => new Constructor() : null,
    cancel: () => {
      generation++;
      synthesis?.cancel();
    },
    speak: synthesis
      ? (text, done, failed) => {
          const token = ++generation;
          // Speak short chunks rather than one long utterance that some browsers truncate.
          const chunks =
            text.match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [];
          let index = 0;
          function next() {
            if (token !== generation) return;
            if (index >= chunks.length) {
              done();
              return;
            }
            const utterance = new SpeechSynthesisUtterance(chunks[index++]);
            utterance.lang = "en-US";
            utterance.rate = 1;
            utterance.onend = next;
            utterance.onerror = () => {
              if (token === generation) failed();
            };
            try {
              synthesis!.speak(utterance);
            } catch {
              failed();
            }
          }
          next();
        }
      : null,
  };
}
