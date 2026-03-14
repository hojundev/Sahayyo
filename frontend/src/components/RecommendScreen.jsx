export default function RecommendScreen({ data, onConfirm, onBack, onSwitchMode, switching }) {
  const isWalking = data.mode === "walking";
  const modeColor = isWalking ? "#10B981" : "#3B82F6";
  const modeEmoji = isWalking ? "🚶" : "🚌";
  const modeLabel = isWalking ? "Walk" : "Take the Bus";
  const modeLabelBn = isWalking ? "হেঁটে যান" : "বাসে যান";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFF8F0" }}>

      {/* header */}
      <div
        className="px-5 pt-6 pb-8 rounded-b-[2.5rem]"
        style={{ background: `linear-gradient(135deg, ${modeColor}, ${modeColor}cc)`, boxShadow: `0 8px 32px ${modeColor}44` }}
      >
        <button
          onClick={onBack}
          className="bg-white/25 rounded-xl px-3.5 py-2 text-white text-lg font-black border-none mb-4"
          style={{ position: "relative", zIndex: 10 }}
        >
          ←
        </button>

        {/* Embedded Store Image */}
        {data.store_image && (
          // <div className="w-full mb-5 rounded-[1.5rem] overflow-hidden bg-black/10 flex items-center justify-center shadow-inner">
          <img
            src={data.store_image}
            alt={data.store_name}
            className="w-full h-60 object-contain drop-shadow-md my-[-70px]"
          />
          // </div>
        )}

        <p className="text-white/70 text-xs font-black uppercase tracking-widest">Found Nearby</p>
        <h2 className="text-2xl font-black text-white mt-1 leading-tight drop-shadow-sm">{data.store_name}</h2>
        <p className="text-white/80 text-sm font-semibold mt-0.5">{data.store_address}</p>
      </div>

      <div className="flex-1 px-4 py-6 flex flex-col gap-4">

        {/* recommendation card */}
        <div
          className="rounded-3xl p-6 flex flex-col items-center gap-3 border-2"
          style={{ background: `${modeColor}10`, borderColor: `${modeColor}33` }}
        >
          <span className="text-7xl">{modeEmoji}</span>
          <p className="text-3xl font-black text-center" style={{ color: modeColor }}>{modeLabelBn}</p>
          <p className="text-lg font-bold text-gray-500">{modeLabel}</p>

          <div className="flex gap-3 mt-1">
            {data.total_distance && (
              <div className="flex flex-col items-center px-5 py-2 rounded-2xl bg-white shadow-sm">
                <span className="text-xl font-black text-gray-800">{data.total_distance}</span>
                <span className="text-xs text-gray-400 font-semibold">Distance</span>
              </div>
            )}
            {data.total_duration && (
              <div className="flex flex-col items-center px-5 py-2 rounded-2xl bg-white shadow-sm">
                <span className="text-xl font-black text-gray-800">{data.total_duration}</span>
                <span className="text-xs text-gray-400 font-semibold">Time</span>
              </div>
            )}
          </div>
        </div>

        {/* mode toggle */}
        <div className="bg-white rounded-2xl p-1.5 flex gap-1.5 border border-gray-100">
          {[
            { mode: "walking", emoji: "🚶", label: "Walk", labelBn: "হাঁটুন", color: "#10B981" },
            { mode: "transit", emoji: "🚌", label: "Bus", labelBn: "বাস", color: "#3B82F6" },
          ].map(opt => {
            const active = data.mode === opt.mode;
            return (
              <button
                key={opt.mode}
                onClick={() => !active && !switching && onSwitchMode(opt.mode)}
                disabled={switching}
                className="flex-1 flex flex-col items-center py-3 rounded-xl font-black border-none transition-all"
                style={{
                  background: active ? opt.color : "transparent",
                  color: active ? "white" : "#9CA3AF",
                  opacity: switching && !active ? 0.5 : 1,
                }}
              >
                <span className="text-2xl">{opt.emoji}</span>
                <span className="text-sm mt-0.5">{opt.labelBn}</span>
                <span className="text-xs font-semibold opacity-80">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* step count hint */}
        <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-gray-100">
          <span className="text-2xl">🗺️</span>
          <p className="text-sm font-semibold text-gray-500">
            {switching ? "Loading directions…" : `${data.route.length} step${data.route.length !== 1 ? "s" : ""} to get there`}
            {!switching && data.store_steps?.length ? ` · ${data.store_steps.length} steps inside` : ""}
          </p>
        </div>
      </div>

      {/* go button */}
      <div className="px-4 pb-8">
        <button
          onClick={onConfirm}
          disabled={switching}
          className="w-full py-5 rounded-2xl text-white text-xl font-black border-none"
          style={{ background: modeColor, boxShadow: `0 6px 20px ${modeColor}55`, opacity: switching ? 0.6 : 1 }}
        >
          {modeEmoji} চলুন! Let's Go →
        </button>
      </div>
    </div>
  );
}
