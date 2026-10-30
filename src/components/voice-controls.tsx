"use client";
import {
  AudioLines,
  Mic,
  Square,
  Volume2,
  VolumeX,
  Keyboard,
  Loader2,
} from "lucide-react";
import type { VoiceController, VoiceState } from "@/lib/voice/controller";
import { Button } from "./ui/button";
export function VoiceControls({
  state,
  controller,
  lastAnswer = "",
  disabled = false,
  textInputId,
}: {
  state: VoiceState;
  controller: VoiceController;
  lastAnswer?: string;
  disabled?: boolean;
  textInputId?: string;
}) {
  const labels = {
    idle: "Ready for a question",
    requesting: "Requesting microphone access",
    listening: "Listening — speak your question",
    processing: "Checking the evidence",
    speaking: "Speaking the answer",
  };
  return (
    <div className={`voice-controls voice-${state.phase}`}>
      <div className="voice-status" role="status">
        <span className="voice-orb">
          {state.phase === "processing" ? (
            <Loader2 className="spin" size={20} />
          ) : (
            <AudioLines size={20} />
          )}
        </span>
        <div>
          <strong>{labels[state.phase]}</strong>
          <small>
            {state.active
              ? "Voice conversation on · pauses during answers"
              : "Switch freely between voice and text"}
          </small>
        </div>
        <span className="voice-wave" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      {state.interim && (
        <p className="voice-interim" aria-live="polite">
          {state.interim}
        </p>
      )}
      <div className="voice-actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            disabled ||
            (!state.active &&
              (state.phase === "processing" || state.phase === "requesting"))
          }
          onClick={state.active ? controller.stop : controller.start}
        >
          {state.active ? <Square size={14} /> : <Mic size={14} />}{" "}
          {state.active ? "Stop voice" : "Start voice"}
        </Button>
        {state.phase === "speaking" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={controller.interrupt}
          >
            <Mic size={14} /> Interrupt & ask
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={controller.mute}
          aria-pressed={state.muted}
          aria-label={
            state.muted ? "Unmute spoken answers" : "Mute spoken answers"
          }
        >
          {state.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}{" "}
          {state.muted ? "Unmute" : "Mute"}
        </Button>
        {lastAnswer && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={
              disabled ||
              state.phase === "processing" ||
              state.phase === "listening" ||
              state.phase === "requesting"
            }
            onClick={() => controller.say(lastAnswer)}
          >
            Read answer
          </Button>
        )}
        {textInputId ? (
          <a
            className="voice-text-fallback"
            href={`#${textInputId}`}
            onClick={controller.stop}
          >
            <Keyboard size={14} />
            Type instead
          </a>
        ) : (
          state.active && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={controller.stop}
            >
              <Keyboard size={14} /> Text mode
            </Button>
          )
        )}
      </div>
      {state.error && (
        <p role="alert" className="voice-error">
          {state.error}
        </p>
      )}
      <p className="voice-privacy">
        Voice sends recognized text to Gemini. Profily does not record or store
        audio. Your browser’s speech services may process audio or spoken answer
        text remotely.{" "}
        {state.recognitionSupported === false
          ? "Speech recognition is unavailable here; text input remains available."
          : ""}
      </p>
    </div>
  );
}
