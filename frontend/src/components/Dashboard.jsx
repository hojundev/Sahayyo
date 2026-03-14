export default function Dashboard({ onFood, onDoctor, onCustom }) {
  const categories = [
    { id: "grocery", label: "খাবার কিনুন", labelEn: "Food & Stores", emoji: "🍚", color: "#FF8C42", bg: "#FFF0E5", border: "#FFD4B0", action: onFood },
    { id: "doctor",  label: "ডাক্তার",     labelEn: "Doctor",        emoji: "🏥", color: "#3B82F6", bg: "#E8F0FF", border: "#BFDBFE", action: onDoctor },
    { id: "bus",     label: "বাস",         labelEn: "Bus",      emoji: "🚌", color: "#10B981", bg: "#E8F8EF", border: "#A7F3D0", action: null },
    { id: "school",  label: "স্কুল",       labelEn: "School",   emoji: "🏫", color: "#8B5CF6", bg: "#F0EBFF", border: "#DDD6FE", action: null },
    { id: "911",     label: "জরুরি",       labelEn: "Emergency",emoji: "🚨", color: "#EF4444", bg: "#FFE8E8", border: "#FECACA", action: null },
    { id: "money",   label: "টাকা পাঠান",  labelEn: "Send Money",emoji:"💸", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", action: null },
  ];

  return (
    <div className="min-h-screen pb-8" style={{ background: "#FFF8F0" }}>

      {/* hero header */}
      <div
        className="text-center px-5 pt-8 pb-12 rounded-b-[2.8rem]"
        style={{ background: "linear-gradient(135deg, #FF8C42, #FFB347)", boxShadow: "0 8px 32px #FF8C4244" }}
      >
        <div className="float inline-block text-6xl mb-3">🧑‍🤝‍🧑</div>
        <h1 className="text-3xl font-black text-white">স্বাগতম!</h1>
        <p className="text-white/80 font-bold text-base mt-1">Welcome — আপনি কী চান?</p>
        <p className="text-white/60 font-semibold text-sm mt-1">What do you need help with today?</p>
      </div>

      <div className="px-4 mt-6">
        <p className="text-xs font-black text-center tracking-widest uppercase text-amber-700/50 mb-4">
          বেছে নিন · Choose
        </p>

        {/* 2-col grid */}
        <div className="grid grid-cols-2 gap-3.5">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={cat.action || undefined}
              style={{
                animationDelay: `${i * 0.07}s`,
                background: cat.bg,
                border: `2.5px solid ${cat.border}`,
                borderRadius: 24,
                boxShadow: `0 4px 20px ${cat.color}1E`,
                opacity: cat.action ? 1 : 0.6,
                cursor: cat.action ? "pointer" : "default",
              }}
              className="pop-in flex flex-col items-center py-5 px-3 active:scale-95 transition-transform"
            >
              <span className="text-5xl leading-none mb-2.5">{cat.emoji}</span>
              <span className="font-black text-lg" style={{ color: cat.color }}>{cat.label}</span>
              <span className="text-xs font-bold text-gray-400 mt-1">{cat.labelEn}</span>
              {!cat.action && (
                <span className="text-xs font-bold mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* custom AI button — full width */}
        <button
          onClick={onCustom}
          className="mt-1 w-full flex items-center gap-4 rounded-3xl px-5 py-5 active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #6366F115, #8B5CF615)",
            margin: "1rem 0",
            border: "2.5px solid #8B5CF644",
            boxShadow: "0 4px 20px #6366F11E",
          }}
        >
          <span className="text-5xl leading-none">❓</span>
          <div className="text-left">
            <p className="font-black text-lg" style={{ color: "#6366F1" }}>অন্য কিছু দরকার?</p>
            <p className="text-sm font-bold text-gray-400">Something else? Ask AI →</p>
          </div>
        </button>

        {/* tip card */}
        <div
          className="mt-2 flex items-center gap-3 rounded-2xl p-4"
          style={{ background: "white", border: "2px solid #FFD4B0" }}
        >
          <span className="text-3xl">💡</span>
          <div>
            <p className="font-black text-sm text-orange-500">Tip</p>
            <p className="text-xs text-gray-400 font-semibold">
              Tap Food & Stores to find what's nearby · 🍚 চাপ দিন
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
