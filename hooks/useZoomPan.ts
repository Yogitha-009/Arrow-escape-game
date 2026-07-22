"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useZoomPan — manages a screen-space CSS transform (translate + scale)
 * applied to a wrapper div around the board's <svg>. Deliberately kept in
 * screen-pixel space rather than mixed into the SVG's own viewBox/user-unit
 * coordinate system: it means none of the existing cell-unit math in
 * ArrowShape/GameBoard has to know zoom exists at all — zoom is purely a
 * "camera" layered on top.
 *
 * Supports:
 *  - mouse wheel (zoom toward cursor)
 *  - trackpad pinch (reported by browsers as wheel events with ctrlKey=true)
 *  - touchscreen pinch (two-finger distance)
 *  - single-finger / mouse drag to pan (once zoomed in)
 *  - +/- buttons and a reset-to-fit action
 */

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const WHEEL_ZOOM_SENSITIVITY = 0.0018;
const BUTTON_ZOOM_STEP = 1.35;

export interface ZoomPanState {
  scale: number;
  x: number;
  y: number;
}

function clampScale(scale: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** Keeps the given screen point visually stationary while scale changes. */
function zoomAround(
  prev: ZoomPanState,
  screenX: number,
  screenY: number,
  nextScaleRaw: number
): ZoomPanState {
  const nextScale = clampScale(nextScaleRaw);
  const worldX = (screenX - prev.x) / prev.scale;
  const worldY = (screenY - prev.y) / prev.scale;
  return {
    scale: nextScale,
    x: screenX - worldX * nextScale,
    y: screenY - worldY * nextScale,
  };
}

/** Clamp pan so the board can't be dragged entirely out of view. */
function clampPan(state: ZoomPanState, containerWidth: number, containerHeight: number): ZoomPanState {
  if (state.scale <= MIN_ZOOM) {
    return { ...state, x: 0, y: 0 };
  }
  const scaledW = containerWidth * state.scale;
  const scaledH = containerHeight * state.scale;
  const minX = containerWidth - scaledW;
  const minY = containerHeight - scaledH;
  return {
    ...state,
    x: Math.min(0, Math.max(minX, state.x)),
    y: Math.min(0, Math.max(minY, state.y)),
  };
}

export function useZoomPan() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<ZoomPanState>({ scale: 1, x: 0, y: 0 });

  const dragRef = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number; moved: boolean }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });
  const pinchRef = useRef<{ active: boolean; startDist: number; startScale: number; midX: number; midY: number } | null>(null);

  const getContainerSize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return { width: 0, height: 0 };
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, []);

  // --- Wheel: normal scroll-wheel zoom AND trackpad pinch (ctrlKey) ---
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      setState((prev) => {
        const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_SENSITIVITY);
        const next = zoomAround(prev, screenX, screenY, prev.scale * factor);
        return clampPan(next, rect.width, rect.height);
      });
    },
    []
  );

  // --- Mouse drag pan ---
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: state.x,
      originY: state.y,
      moved: false,
    };
  }, [state.x, state.y]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag.active) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
      if (!drag.moved) return;
      const rect = containerRef.current?.getBoundingClientRect();
      setState((prev) =>
        clampPan(
          { ...prev, x: drag.originX + dx, y: drag.originY + dy },
          rect?.width ?? 0,
          rect?.height ?? 0
        )
      );
    }
    function onUp() {
      dragRef.current.active = false;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  /** True while the most recent mouse gesture was a drag past the click threshold — used to suppress accidental arrow taps mid-pan. */
  const wasDragging = useCallback(() => dragRef.current.moved, []);

  // --- Touch: one-finger pan, two-finger pinch ---
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const rect = containerRef.current?.getBoundingClientRect();
      pinchRef.current = {
        active: true,
        startDist: dist,
        startScale: state.scale,
        midX: (a.clientX + b.clientX) / 2 - (rect?.left ?? 0),
        midY: (a.clientY + b.clientY) / 2 - (rect?.top ?? 0),
      };
      dragRef.current.active = false;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      if (!t) return;
      dragRef.current = {
        active: true,
        startX: t.clientX,
        startY: t.clientY,
        originX: state.x,
        originY: state.y,
        moved: false,
      };
    }
  }, [state.scale, state.x, state.y]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (e.touches.length === 2 && pinchRef.current?.active) {
      const [a, b] = [e.touches[0], e.touches[1]];
      if (!a || !b) return;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const pinch = pinchRef.current;
      const ratio = dist / pinch.startDist;
      setState((prev) => {
        const next = zoomAround(
          { ...prev, scale: pinch.startScale },
          pinch.midX,
          pinch.midY,
          pinch.startScale * ratio
        );
        return clampPan(next, rect?.width ?? 0, rect?.height ?? 0);
      });
      return;
    }
    if (e.touches.length === 1 && dragRef.current.active) {
      const t = e.touches[0];
      if (!t) return;
      const drag = dragRef.current;
      const dx = t.clientX - drag.startX;
      const dy = t.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
      setState((prev) =>
        clampPan(
          { ...prev, x: drag.originX + dx, y: drag.originY + dy },
          rect?.width ?? 0,
          rect?.height ?? 0
        )
      );
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) dragRef.current.active = false;
  }, []);

  // --- Buttons ---
  const zoomIn = useCallback(() => {
    const { width, height } = getContainerSize();
    setState((prev) => clampPan(zoomAround(prev, width / 2, height / 2, prev.scale * BUTTON_ZOOM_STEP), width, height));
  }, [getContainerSize]);

  const zoomOut = useCallback(() => {
    const { width, height } = getContainerSize();
    setState((prev) => clampPan(zoomAround(prev, width / 2, height / 2, prev.scale / BUTTON_ZOOM_STEP), width, height));
  }, [getContainerSize]);

  const resetZoom = useCallback(() => {
    setState({ scale: 1, x: 0, y: 0 });
  }, []);

  return {
    containerRef,
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    scale: state.scale,
    isZoomed: state.scale > MIN_ZOOM + 0.001,
    wasDragging,
    handlers: {
      onWheel: handleWheel,
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    zoomIn,
    zoomOut,
    resetZoom,
  };
}
