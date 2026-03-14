import Avatar from "./Avatar";
import { useAudio } from "../hooks/useAudio";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export default function StepCard({ step, index, color, total }) {
  const { playing, toggle } = useAudio(step.audio);

  const imgSrc = step.image
    ? (step.image.startsWith("http") ? step.image : `${API}${step.image}`)
    : null;

  return (
    <div className="slide-up w-full max-w-md mx-auto flex flex-col gap-5">

      {/* ── big direction visual ── */}
      <div
        className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-3xl border-2 border-black/5"
        style={{ background: `${color}12` }}
      >
        {/* emoji or image */}
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={step.label || step.instruction}
            className="w-24 h-24 object-contain"
            onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "block"; }}
          />
        ) : null}
        <div
          className="text-8xl leading-none"
          style={{ display: imgSrc ? "none" : "block" }}
        >
          {step.emoji || "⬆️"}
        </div>

        {/* direction label — big and bold */}
        <p className="text-3xl font-black text-gray-800 text-center px-4">
          {step.label || step.instruction}
        </p>

        {/* distance badge */}
        {step.distance && (
          <div
            className="flex items-center gap-2 px-5 py-2 rounded-full"
            style={{ background: color, color: "white" }}
          >
            <span className="text-xl font-black">{step.distance}</span>
            {step.duration && (
              <span className="text-sm font-semibold opacity-80">· {step.duration}</span>
            )}
          </div>
        )}
      </div>

      {/* ── detail instruction + audio ── */}
      <div
        onClick={toggle}
        className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer transition-all"
        style={{
          background: playing ? `${color}10` : "white",
          border: `2px solid ${playing ? color : "#F3F4F6"}`,
          boxShadow: playing ? `0 4px 20px ${color}33` : "0 2px 8px #0001",
        }}
      >
        <Avatar playing={playing} color={color} size={56} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-500 leading-snug line-clamp-2">
            {step.instruction}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
              style={{ background: playing ? color : "#F3F4F6" }}
            >
              {playing ? "⏸" : "▶️"}
            </div>
            <span className="text-xs font-bold" style={{ color: playing ? color : "#9CA3AF" }}>
              {playing ? "শুনছেন… Playing…" : "শুনতে চাপুন · Tap to hear"}
            </span>
          </div>
        </div>
      </div>

      {/* ── progress pips ── */}
      <div className="flex justify-center gap-1.5 pt-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width:  i === index ? 20 : 8,
              height: 8,
              borderRadius: 6,
              background: i === index ? color : "#E5E7EB",
              transition: "all .3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
