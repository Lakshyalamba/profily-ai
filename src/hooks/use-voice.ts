"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  VoiceController,
  browserVoiceEnvironment,
  initialVoiceState,
  type QuestionHandler,
} from "@/lib/voice/controller";
export function useVoice(handler: QuestionHandler) {
  const [controller] = useState(
    () => new VoiceController(browserVoiceEnvironment, handler),
  );
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.snapshot,
    () => initialVoiceState,
  );
  useEffect(() => {
    controller.setHandler(handler);
  }, [controller, handler]);
  useEffect(() => {
    controller.mount();
    const hidden = () => {
      if (document.hidden) controller.stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      controller.dispose();
    };
  }, [controller]);
  return { state, controller };
}
