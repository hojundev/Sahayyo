import { useState } from "react";
import StepCard from "./StepCard";

const PHASES = {
  route: { label: "Walk to Store",  labelBn: "দোকানে যান",   color: "#10B981", emoji: "🚶" },
  store: { label: "Inside Store",   labelBn: "দোকানের ভিতর", color: "#FF8C42", emoji: "🛒" },
};

export default function StepFlow({ data, onReset }) {
  const [phase, setPhase]     = useState("route");  // "route" | "store"
  const [stepIdx, setStepIdx] = useState(0);

  const { color, emoji, label, labelBn } = PHASES[phase];
  const steps = phase === "route" ? data.route : data.store_steps;
  const total = steps.length;
  const step  = steps[stepIdx];
  const isLast = stepIdx === total - 1;

  const goNext = () => {
    if (!isLast) {
      setStepIdx(i => i + 1);
    } else if (phase === "route") {
      setPhase("store");
      setStepIdx(0);
    } else {
      onReset();
    }
  };

  const goPrev = () => {
    if (stepIdx > 0) {
      setStepIdx(i => i - 1);
    } else if (phase === "store") {
      setPhase("route");
      setStepIdx(data.route.length - 1);
    }
  };

  const canGoBack = stepIdx > 0 || phase === "store";

  // Phase progress (1 = route, 2 = store)
  const phaseNum = phase === "route" ? 1 : 2;

  return (
    <div className="min-h-screen flex flex-col pb-28" style={{ background: "#FFF8F0" }}>

      {/* ── header ── */}
      <div
        className="rounded-b-[2.5rem] px-5 pt-5 pb-7"
        style={{ background: color, boxShadow: `0 6px 24px ${color}44` }}
      >
        {/* store info banner with image */}
        <div className="bg-white/20 rounded-2xl overflow-hidden mb-4 relative shadow-md">
          {data.store_image ? (
            <img 
              src={data.store_image} 
              alt={data.store_name} 
              className="w-full h-64 object-contain bg-black/20 opacity-90"
            />
          ) : (
            <div className="w-full h-64 bg-black/20 flex items-center justify-center">
              <span className="text-3xl">🏪</span>
            </div>
          )}
          <div className="p-4 bg-black/40 absolute bottom-0 left-0 right-0 backdrop-blur-sm">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Destination</p>
            <p className="text-white font-black text-lg leading-tight drop-shadow-md">{data.store_name}</p>
            <p className="text-white/90 text-sm font-semibold drop-shadow-md">{data.store_address}</p>
          </div>
        </div>

        {/* top nav row */}
        <div className="flex items-center gap-3">
          <button
            onClick={canGoBack ? goPrev : onReset}
            className="bg-white/25 rounded-xl px-3.5 py-2 text-white text-lg font-black border-none"
          >
            {canGoBack ? "←" : "🏠"}
          </button>
          <div className="flex-1">
            <p className="text-white font-black text-xl">{emoji} {labelBn}</p>
            <p className="text-white/75 text-xs font-bold">{label}</p>
          </div>
          <button onClick={onReset} className="bg-white/25 rounded-xl px-3 py-2 text-white border-none">🏠</button>
        </div>

        {/* phase + step progress */}
        <div className="mt-4 flex gap-2">
          {["route","store"].map(p => (
            <div key={p} className="flex-1 space-y-1">
              <div className="flex gap-1">
                {(p === "route" ? data.route : data.store_steps).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1, height: 7, borderRadius: 6,
                      background:
                        p === phase && i <= stepIdx ? "white"
                        : p !== phase && phase === "store" && p === "route" ? "white"
                        : "rgba(255,255,255,0.28)",
                      transition: "background .4s",
                    }}
                  />
                ))}
              </div>
              <p className="text-white/60 text-xs font-bold text-center">
                {p === "route" ? "🚶 Walk" : "🛒 Store"}
              </p>
            </div>
          ))}
        </div>

        <p className="text-white/75 text-xs font-bold mt-2 text-right">
          ধাপ {stepIdx + 1}/{total} · Step {stepIdx + 1} of {total}
        </p>
      </div>

      {/* ── step card ── */}
      <div key={`${phase}-${stepIdx}`} className="flex-1 px-4 pt-6">
        <StepCard
          step={step}
          index={stepIdx}
          color={color}
          total={total}
        />
      </div>

      {/* ── next button (fixed bottom) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4 pb-6"
        style={{ background: "rgba(255,248,240,0.97)", backdropFilter: "blur(10px)", borderTop: "2px solid #F3F4F6" }}
      >
        <button
          onClick={goNext}
          className="w-full py-5 rounded-2xl text-white text-lg font-black border-none"
          style={{
            background: (isLast && phase === "store") ? "#10B981" : color,
            boxShadow: `0 6px 20px ${color}55`,
          }}
        >
          {isLast && phase === "store"
            ? "🎉 শেষ হয়েছে! All Done!"
            : isLast && phase === "route"
            ? "🛒 দোকানে ঢুকুন → Enter Store"
            : "পরবর্তী ধাপ → Next Step →"}
        </button>
      </div>
    </div>
  );
}
