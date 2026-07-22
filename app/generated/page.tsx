"use client";

import { useEffect, useState } from "react";
import { generateFullCoverageLevel } from "@/engine/LevelGenerator";
import type { Arrow } from "@/types/game";
import LevelBoard from "@/components/LevelBoard";

const SIZE_PRESETS = [
  { label: "10×10", rows: 10, cols: 10 },
  { label: "20×20", rows: 20, cols: 20 },
  { label: "30×30", rows: 30, cols: 30 },
  { label: "50×50", rows: 50, cols: 50 },
];

/**
 * Standalone sandbox demonstrating the full-coverage tiling generator at
 * every required board size — no hearts/timer restriction here, this route
 * is purely for trying out sizes and regenerating fresh layouts. The real
 * 3-level campaign (with session-wide hearts/timer) lives at "/".
 *
 * Arrows are generated in an effect AFTER mount, not in render/useMemo —
 * generation uses Math.random(), and computing it during the SSR pass would
 * produce different output than the client's re-render during hydration,
 * causing a hydration mismatch. Gating it behind a mount effect keeps all
 * randomness strictly client-side.
 */
export default function GeneratedLevelPage() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [seed, setSeed] = useState(0);
  const [arrows, setArrows] = useState<Arrow[] | null>(null);
  const [hintCount, setHintCount] = useState(99);
  const [eraserCount, setEraserCount] = useState(99);

  const preset = SIZE_PRESETS[presetIndex] ?? SIZE_PRESETS[0]!;

  useEffect(() => {
    const dims = { rows: preset.rows, cols: preset.cols };
    setArrows(generateFullCoverageLevel({ dimensions: dims, minChunkLength: 2, maxChunkLength: 6 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.rows, preset.cols, seed]);

  return (
    <div className="min-h-screen bg-[#14151f] py-6">
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="flex gap-2 flex-wrap justify-center px-4">
          {SIZE_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => {
                setPresetIndex(i);
                setSeed((s) => s + 1);
              }}
              className={[
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                i === presetIndex
                  ? "bg-white text-[#14151f]"
                  : "bg-white/10 text-white hover:bg-white/20",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500 text-[#14151f] hover:bg-emerald-400 transition-colors"
          >
            New Puzzle {arrows ? `(${arrows.length} arrows, ${preset.rows * preset.cols} cells)` : ""}
          </button>
        </div>
      </div>

      {arrows ? (
        <LevelBoard
          key={`${preset.rows}x${preset.cols}-${seed}`}
          arrows={arrows}
          dimensions={{ rows: preset.rows, cols: preset.cols }}
          interactive={true}
          onBlocked={() => {}}
          onAllCleared={() => {}}
          initialHintCount={hintCount}
          initialEraserCount={eraserCount}
          onHintCountChange={setHintCount}
          onEraserCountChange={setEraserCount}
        />
      ) : (
        <div className="flex justify-center pt-20">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
