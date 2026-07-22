"use client";

import { useMemo } from "react";
import type { Arrow } from "@/types/game";
import { getOccupiedCells } from "@/engine/ArrowEngine";
import { buildArrowPathD, buildArrowheadPoints } from "@/utils/svgPath";
import { useThreadPullAnimation } from "@/hooks/useThreadPullAnimation";

interface ArrowShapeProps {
  arrow: Arrow;
  /** True for the ~300ms window right after a blocked click on this arrow. */
  isBlockedFlash: boolean;
  /** True while the hint booster is highlighting this arrow. */
  isHinted: boolean;
  onClick: (arrowId: number) => void;
  /** True while this arrow is being "pulled out like a thread" after a successful move. */
  isExiting: boolean;
  /** Called once the exit animation finishes — parent unmounts the arrow at that point. */
  onExitComplete: () => void;
  /** True while this arrow is being removed by the eraser booster (fade/pop, not a pull-out). */
  isErasing: boolean;
}

// Smaller, thinner body with a sharper, more pointed head than earlier passes.
const BODY_STROKE_WIDTH = 0.4;
const OUTLINE_EXTRA_WIDTH = 0.1;
/** Generous invisible hit target so thin/short arrows are still easy to tap on mobile. */
const HIT_STROKE_WIDTH = 0.85;
const ARROW_COLOR = "#FFFFFF";
const BLOCKED_COLOR = "#ff3b3b";
const OUTLINE_COLOR = "#0b0c16";
const HINT_GLOW_COLOR = "#FFD60A"; // gold — a white-on-white glow would be invisible

const HEAD_OPTIONS = { length: 0.5, halfWidth: 0.19, baseOffset: 0.06 };

/**
 * One arrow = one continuous SVG path (the body) + one polygon (the head).
 * No per-cell squares, no per-segment elements — exactly the "one SVG path
 * plus one arrow head" requirement.
 *
 * While `isExiting`, the body doesn't translate anywhere. Instead
 * useThreadPullAnimation shortens the drawn stroke from the head end
 * backward (via stroke-dasharray/dashoffset), so it reads as a thread being
 * pulled through a fixed point at the board edge rather than a shape
 * sliding across the board. The arrow is still mounted during this window;
 * the parent removes it from the arrows list only once onExitComplete
 * fires.
 */
export default function ArrowShape({
  arrow,
  isBlockedFlash,
  isHinted,
  onClick,
  isExiting,
  onExitComplete,
  isErasing,
}: ArrowShapeProps) {
  const cells = useMemo(() => getOccupiedCells(arrow), [arrow]);
  const pathD = useMemo(() => buildArrowPathD(cells), [cells]);
  const headCell = cells[cells.length - 1];
  const headPoints = useMemo(
    () => (headCell ? buildArrowheadPoints(headCell, arrow.headDirection, HEAD_OPTIONS) : ""),
    [headCell, arrow.headDirection]
  );
  // Exact in our coordinate system: each step between consecutive cell
  // centers is exactly 1 unit, so path length in user-units == step count.
  const pathLength = cells.length - 1;

  const groupRef = useThreadPullAnimation({
    active: isExiting,
    pathLength,
    onComplete: onExitComplete,
  });

  const strokeColor = isBlockedFlash ? BLOCKED_COLOR : ARROW_COLOR;
  const clickable = !arrow.removed && !isExiting && !isErasing;

  // Applied to both stroked paths so they erase in perfect sync, driven by
  // one shared CSS variable the animation hook writes to per frame.
  const dashStyle: React.CSSProperties | undefined =
    isExiting && pathLength > 0
      ? {
          strokeDasharray: `${pathLength} ${pathLength}`,
          strokeDashoffset: "var(--pull-offset, 0)",
        }
      : undefined;

  return (
    <g
      ref={groupRef}
      className={
        isErasing
          ? "transition-[opacity,transform] duration-200 ease-in opacity-0 scale-75"
          : undefined
      }
      style={isErasing ? { transformOrigin: "center", transformBox: "fill-box" } : undefined}
    >
      {/* Invisible fat hit target — this is what actually receives clicks/taps. */}
      {clickable && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={HIT_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ cursor: "pointer", pointerEvents: "stroke" }}
          onClick={() => onClick(arrow.id)}
        />
      )}

      {/* Soft hint glow, drawn under the body. pointerEvents:none is critical —
          without it this decorative overlay silently swallows clicks meant
          for the hit-path beneath it while a hint is active. Gold rather than
          white so it actually stands out against a white arrow. */}
      {isHinted && (
        <path
          d={pathD}
          fill="none"
          stroke={HINT_GLOW_COLOR}
          strokeWidth={BODY_STROKE_WIDTH + 0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.7}
          className="animate-pulse"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Dark outline drawn first, wider than the body, so a white arrow
          still reads clearly as a distinct shape rather than blending into
          neighboring white arrows or the hint glow. */}
      <path
        d={pathD}
        fill="none"
        stroke={isBlockedFlash ? BLOCKED_COLOR : OUTLINE_COLOR}
        strokeWidth={BODY_STROKE_WIDTH + OUTLINE_EXTRA_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none", transition: "stroke 150ms ease-out", ...dashStyle }}
      />

      {/* The visible body: one continuous rounded-corner stroke. */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={BODY_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ pointerEvents: "none", transition: "stroke 150ms ease-out", ...dashStyle }}
      />

      {/* The head, pointing in headDirection independent of the body's last
          segment. Hidden immediately once exiting starts — conceptually
          it's the leading tip, already pulled through the exit point. */}
      {headPoints && !isExiting && (
        <polygon
          points={headPoints}
          fill={strokeColor}
          stroke={isBlockedFlash ? BLOCKED_COLOR : OUTLINE_COLOR}
          strokeWidth={0.06}
          strokeLinejoin="round"
          style={{ pointerEvents: "none", transition: "fill 150ms ease-out" }}
        />
      )}
    </g>
  );
}
