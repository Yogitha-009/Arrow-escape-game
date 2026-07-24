"use client";

import { useMemo } from "react";
import type { Arrow } from "@/types/game";
import { getOccupiedCells } from "@/engine/ArrowEngine";
import { buildArrowPathD, buildArrowheadPoints } from "@/utils/svgPath";
import { useThreadPullAnimation } from "@/hooks/useThreadPullAnimation";

interface ArrowShapeProps {
  arrow: Arrow;
  isBlockedFlash: boolean;
  isHinted: boolean;
  onClick: (arrowId: number) => void;
  isExiting: boolean;
  onExitComplete: () => void;
  isErasing: boolean;
}

const BODY_STROKE_WIDTH = 0.4;
const OUTLINE_EXTRA_WIDTH = 0.1;
const HIT_STROKE_WIDTH = 0.85;
const ARROW_COLOR = "#FFFFFF";
const BLOCKED_COLOR = "#ff3b3b";
const OUTLINE_COLOR = "#0b0c16";
const HINT_GLOW_COLOR = "#FFD60A";

const HEAD_OPTIONS = { length: 0.5, halfWidth: 0.19, baseOffset: 0.06 };

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
  const pathLength = cells.length - 1;

  const registerDashTarget = useThreadPullAnimation({
    active: isExiting,
    pathLength,
    onComplete: onExitComplete,
  });

  const strokeColor = isBlockedFlash ? BLOCKED_COLOR : ARROW_COLOR;
  const clickable = !arrow.removed && !isExiting && !isErasing;

  return (
    <g
      className={
        isErasing
          ? "transition-[opacity,transform] duration-200 ease-in opacity-0 scale-75"
          : undefined
      }
      style={isErasing ? { transformOrigin: "center", transformBox: "fill-box" } : undefined}
    >
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
        ref={isExiting ? registerDashTarget : undefined}
        d={pathD}
        fill="none"
        stroke={isBlockedFlash ? BLOCKED_COLOR : OUTLINE_COLOR}
        strokeWidth={BODY_STROKE_WIDTH + OUTLINE_EXTRA_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isExiting && pathLength > 0 ? `${pathLength} ${pathLength}` : undefined}
        style={{ pointerEvents: "none", transition: "stroke 150ms ease-out" }}
      />

      {/* The visible body: one continuous rounded-corner stroke. */}
      <path
        ref={isExiting ? registerDashTarget : undefined}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={BODY_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isExiting && pathLength > 0 ? `${pathLength} ${pathLength}` : undefined}
        style={{ pointerEvents: "none", transition: "stroke 150ms ease-out" }}
      />
      {headPoints && (
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