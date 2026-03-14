export default function StatusScreen({ status, error, onRetry, onBack }) {
  if (status === "locating") return (
    <Screen emoji="📍" color="#3B82F6"
      title="আপনার অবস্থান খুঁজছি…"
      sub="Finding your location…"
      onBack={onBack}
    />
  );
  if (status === "loading") return (
    <Screen emoji="🗺️" color="#FF8C42"
      title="কাছের দোকান খুঁজছি…"
      sub="Finding nearest place…"
      onBack={onBack}
    />
  );
  if (status === "error") return (
    <Screen emoji="❌" color="#EF4444"
      title="সমস্যা হয়েছে"
      sub={error || "Something went wrong"}
      onBack={onBack}
      action={<button onClick={onRetry} className="mt-6 px-8 py-4 rounded-2xl text-white font-black text-lg" style={{ background: "#EF4444" }}>আবার চেষ্টা করুন · Retry</button>}
    />
  );
  return null;
}

function Screen({ emoji, color, title, sub, action, onBack }) {
  return (
    <div className="min-h-screen flex flex-col px-6" style={{ background: "#FFF8F0" }}>
      {onBack && (
        <div className="pt-6">
          <button
            onClick={onBack}
            className="bg-gray-100 rounded-xl px-3.5 py-2 text-gray-600 text-lg font-black border-none"
          >
            ←
          </button>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <div className="float text-8xl">{emoji}</div>
        <div
          className="w-16 h-16 rounded-full border-4 border-t-transparent animate-spin"
          style={{ borderColor: `${color}55`, borderTopColor: color }}
        />
        <p className="text-2xl font-black text-gray-800">{title}</p>
        <p className="text-base text-gray-400 font-semibold">{sub}</p>
        {action}
      </div>
    </div>
  );
}
