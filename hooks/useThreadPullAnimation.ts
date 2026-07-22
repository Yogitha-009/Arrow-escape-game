"use client";

import { useEffect, useRef } from "react";
import { easeInOutCubic, getSlideDurationMs } from "@/engine/AnimationEngine";

interface UseThreadPullAnimationArgs {
  active: boolean;
  /** The arrow's own path length in cell-units (cells.length - 1). */
  pathLength: number;
  onComplete: () => void;
}

/**
 * useThreadPullAnimation — drives the "pulled out like a thread" exit
 * effect via requestAnimationFrame, per spec ("Use requestAnimationFrame.
 * No CSS hacks.").
 *
 * Unlike a rigid-body slide (translating the whole shape), this NEVER moves
 * anything in space. Instead it shortens the drawn portion of the path from
 * the HEAD end backward, using stroke-dasharray/stroke-dashoffset: with
 * dasharray set to [L, L] (L = the path's own length), animating
 * stroke-dashoffset from 0 to L causes the END of the path (the head, since
 * the path is built tail-to-head) to erase first, while the tail-ward
 * portion stays rooted in its original position until its turn comes — the
 * same silhouette a thread makes as it's pulled through a fixed point.
 *
 * Writes the offset to a CSS custom property on the outer <g> via a ref
 * (not React state), so both the outline and body <path> elements can share
 * one live value through `strokeDashoffset: 'var(--pull-offset)'` without
 * needing separate refs or triggering a re-render every frame.
 */
export function useThreadPullAnimation({ active, pathLength, onComplete }: UseThreadPullAnimationArgs) {
  const groupRef = useRef<SVGGElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) {
      groupRef.current?.style.removeProperty("--pull-offset");
      return;
    }

    // Degenerate case: a single-cell arrow has no body to erase along —
    // just let it vanish quickly rather than animating a zero-length dash.
    if (pathLength <= 0) {
      const t = setTimeout(() => onCompleteRef.current(), 160);
      return () => clearTimeout(t);
    }

    const durationMs = getSlideDurationMs(pathLength);
    let rafId: number;
    let startTime: number | null = null;

    const frame = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const progress = easeInOutCubic(elapsed / durationMs);
      const offset = progress * pathLength;
      groupRef.current?.style.setProperty("--pull-offset", String(offset));

      if (elapsed < durationMs) {
        rafId = requestAnimationFrame(frame);
      } else {
        onCompleteRef.current();
      }
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [active, pathLength]);

  return groupRef;
}
