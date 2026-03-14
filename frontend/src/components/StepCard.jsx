import Avatar from "./Avatar";
import { useAudio } from "../hooks/useAudio";

const DIRECTION_ICON = {
  "Turn Right":   ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <path d="M28 52 L28 34 L44 34 L44 24 L56 40 L44 56 L44 46 L34 46 L34 52 Z" fill={color}/>
    </svg>
  ),
  "Turn Left":    ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <path d="M52 52 L52 34 L36 34 L36 24 L24 40 L36 56 L36 46 L46 46 L46 52 Z" fill={color}/>
    </svg>
  ),
  "Go Straight":  ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <path d="M30 54 L30 38 L22 38 L40 22 L58 38 L50 38 L50 54 Z" fill={color}/>
    </svg>
  ),
  "Continue":     ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <path d="M30 54 L30 38 L22 38 L40 22 L58 38 L50 38 L50 54 Z" fill={color}/>
    </svg>
  ),
  "Roundabout":   ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <circle cx="40" cy="40" r="14" stroke={color} strokeWidth="5" fill="none"/>
      <path d="M54 26 L60 20 L60 32 L48 32 Z" fill={color}/>
    </svg>
  ),
  "Arrive":       ({ color }) => (
    <svg viewBox="0 0 80 80" width="96" height="96" fill="none">
      <circle cx="40" cy="40" r="40" fill={color} opacity="0.12"/>
      <path d="M40 16 C30 16 22 24 22 34 C22 46 40 64 40 64 C40 64 58 46 58 34 C58 24 50 16 40 16Z" fill={color}/>
      <circle cx="40" cy="34" r="7" fill="white"/>
    </svg>
  ),
};

export default function StepCard({ step, index, color, total }) {
  const { playing, toggle } = useAudio(step.audio);
  const Icon = DIRECTION_ICON[step.label] || DIRECTION_ICON["Continue"];

  return (
    <div className="slide-up w-full max-w-md mx-auto flex flex-col gap-5">

      {/* ── big direction visual ── */}
      <div
        className="w-full flex flex-col items-center justify-center gap-4 py-12 rounded-3xl border-2 border-black/5"
        style={{ background: `${color}10` }}
      >
        <Icon color={color} />

        <p className="text-4xl font-black text-gray-800 text-center px-4">
          {step.label || "Continue"}
        </p>

        {step.distance && (
          <div
            className="flex items-center gap-2 px-5 py-2 rounded-full"
            style={{ background: color }}
          >
            <span className="text-xl font-black text-white">{step.distance}</span>
            {step.duration && (
              <span className="text-sm font-semibold text-white/80">· {step.duration}</span>
            )}
          </div>
        )}
      </div>

      {/* ── detail + audio ── */}
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
