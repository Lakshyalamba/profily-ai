"use client";
import { useEffect } from "react";
/** Open an evidence disclosure when a citation points to its fragment. */
export function EvidenceNavigation() {
  useEffect(() => {
    const reveal = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      let element: HTMLElement | null = target;
      while (element) {
        if (element instanceof HTMLDetailsElement) element.open = true;
        element = element.parentElement;
      }
    };
    reveal();
    window.addEventListener("hashchange", reveal);
    return () => window.removeEventListener("hashchange", reveal);
  }, []);
  return null;
}
