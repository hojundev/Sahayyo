import Avatar from "./Avatar";
import { useAudio } from "../hooks/useAudio";
import { useState } from "react";

// Iconify CDN — fluent-emoji set (Microsoft illustrated emoji, free, no key)
const ICON = (name) => `https://api.iconify.design/fluent-emoji/${name}.svg`;

// Steps that benefit from 2–3 icons to paint a fuller picture
const MULTI_ICONS = [
  // ── newcomer / canada context ──
  ["healthcare here is free",  [ICON("hospital"),          ICON("id-card"),              ICON("smiling-face-with-open-hands")]],
  ["service is free",          [ICON("smiling-face-with-open-hands"), ICON("money-bag")]],
  ["it is free",               [ICON("smiling-face-with-open-hands"), ICON("money-bag")]],
  ["show your health card",    [ICON("id-card"),            ICON("hospital")]],
  ["health card",              [ICON("id-card"),            ICON("hospital")]],
  ["ohip",                     [ICON("id-card"),            ICON("hospital")]],
  ["show your id",             [ICON("id-card"),            ICON("waving-hand")]],
  ["newcomer",                 [ICON("waving-hand"),        ICON("id-card")]],
  ["ask for interpreter",      [ICON("speaking-head"),      ICON("speech-balloon")]],
  ["interpreter",              [ICON("speaking-head"),      ICON("speech-balloon")]],
  ["halal",                    [ICON("green-circle"),       ICON("shopping-bags")]],
  ["tip",                      [ICON("money-with-wings"),   ICON("receipt")]],
  ["show prescription",        [ICON("memo"),               ICON("pill")]],
  ["prescription",             [ICON("memo"),               ICON("pill")]],
  // ── store ──
  ["bag your",                 [ICON("shopping-bags"),      ICON("raising-hands")]],
  ["shelf label",              [ICON("magnifying-glass"),   ICON("label")]],
  ["tap your card",            [ICON("credit-card"),        ICON("mobile-phone")]],
  ["pay cash",                 [ICON("money-bag"),          ICON("coin")]],
  // ── government / documents ──
  ["take a number",            [ICON("ticket"),             ICON("hourglass-not-done")]],
  ["fill out",                 [ICON("memo"),               ICON("pen")]],
  ["sign your name",           [ICON("memo"),               ICON("pen")]],
  ["keep your receipt",        [ICON("receipt"),            ICON("ok-hand")]],
  ["take your receipt",        [ICON("receipt"),            ICON("ok-hand")]],
  // ── bank / money ──
  ["send money",               [ICON("money-with-wings"),   ICON("globe-showing-asia-australia")]],
  ["exchange rate",            [ICON("currency-exchange"),  ICON("money-bag")]],
  // ── health ──
  ["emergency",                [ICON("ambulance"),          ICON("hospital")]],
  ["triage",                   [ICON("medical-symbol"),     ICON("stethoscope")]],
  ["symptoms",                 [ICON("stethoscope"),        ICON("speech-balloon")]],
  ["waiting room",             [ICON("hourglass-not-done"), ICON("chair")]],
  // ── restaurant ──
  ["water is free",            [ICON("glass-of-milk"),      ICON("smiling-face-with-open-hands")]],
  ["point at menu",            [ICON("backhand-index-pointing-right"), ICON("fork-and-knife-with-plate")]],
  ["15% tip",                  [ICON("money-with-wings"),   ICON("receipt")]],
];

// Single-icon table (checked after MULTI_ICONS)
const SINGLE_ICONS = [
  ["walk in",            ICON("door")],
  ["front door",         ICON("door")],
  ["enter",              ICON("door")],
  ["basket",             ICON("basket")],
  ["shopping cart",      ICON("shopping-cart")],
  ["cart",               ICON("shopping-cart")],
  ["pick the items",     ICON("shopping-bags")],
  ["browse",             ICON("shopping-bags")],
  ["cashier",            ICON("credit-card")],
  ["credit card",        ICON("credit-card")],
  ["pay",                ICON("money-bag")],
  ["pharmacist",         ICON("pill")],
  ["pharmacy",           ICON("pill")],
  ["medicine",           ICON("pill")],
  ["symptoms",           ICON("stethoscope")],
  ["doctor",             ICON("stethoscope")],
  ["clinic",             ICON("stethoscope")],
  ["hospital",           ICON("hospital")],
  ["reception",          ICON("medical-symbol")],
  ["wait",               ICON("hourglass-not-done")],
  ["sign your name",     ICON("memo")],
  ["show your",          ICON("id-card")],
  ["take a number",      ICON("ticket")],
  ["receipt",            ICON("receipt")],
  ["form",               ICON("memo")],
  ["bank",               ICON("bank")],
  ["mosque",             ICON("mosque")],
  ["pray",               ICON("folded-hands")],
  ["counter",            ICON("credit-card")],
  ["order",              ICON("fork-and-knife-with-plate")],
  ["menu",               ICON("fork-and-knife-with-plate")],
  ["seated",             ICON("chair")],
  ["seat",               ICON("chair")],
  ["bill",               ICON("receipt")],
  ["turn right",         ICON("right-arrow")],
  ["turn left",          ICON("left-arrow")],
  ["roundabout",         ICON("counterclockwise-arrows-button")],
  ["arrive",             ICON("round-pushpin")],
  ["go straight",        ICON("up-arrow")],
  ["destination",        ICON("round-pushpin")],
  ["take the bus",       ICON("bus")],
  ["bus",                ICON("bus")],
  ["train",              ICON("train")],
  ["transit",            ICON("bus")],
  ["continue",           ICON("person-walking")],
  ["head ",              ICON("person-walking")],
  ["walk",               ICON("person-walking")],
];

function stepIcons(label = "", instruction = "") {
  const text = (label + " " + instruction).toLowerCase();
  for (const [key, urls] of MULTI_ICONS) {
    if (text.includes(key)) return urls;
  }
  for (const [key, url] of SINGLE_ICONS) {
    if (text.includes(key)) return [url];
  }
  return [ICON("person-running")];
}

function IconDisplay({ icons, color }) {
  if (icons.length === 1) {
    return (
      <img
        src={icons[0]}
        alt=""
        className="object-contain drop-shadow-md"
        style={{ width: 160, height: 160 }}
        onError={e => { e.target.style.display = "none"; }}
      />
    );
  }

  if (icons.length === 2) {
    return (
      <div className="relative flex items-end justify-center" style={{ width: 220, height: 140 }}>
        <img
          src={icons[0]}
          alt=""
          className="object-contain drop-shadow-md absolute"
          style={{ width: 120, height: 120, left: 10, bottom: 0, transform: "rotate(-6deg)" }}
          onError={e => { e.target.style.display = "none"; }}
        />
        <img
          src={icons[1]}
          alt=""
          className="object-contain drop-shadow-md absolute"
          style={{ width: 100, height: 100, right: 10, bottom: 0, transform: "rotate(5deg)" }}
          onError={e => { e.target.style.display = "none"; }}
        />
      </div>
    );
  }

  // 3 icons — main in centre, two flanking
  return (
    <div className="relative flex items-end justify-center" style={{ width: 260, height: 150 }}>
      <img
        src={icons[1]}
        alt=""
        className="object-contain drop-shadow absolute"
        style={{ width: 88, height: 88, left: 8, bottom: 0, transform: "rotate(-8deg)" }}
        onError={e => { e.target.style.display = "none"; }}
      />
      <img
        src={icons[0]}
        alt=""
        className="object-contain drop-shadow-md absolute"
        style={{ width: 124, height: 124, left: "50%", bottom: 6, transform: "translateX(-50%)", zIndex: 2 }}
        onError={e => { e.target.style.display = "none"; }}
      />
      <img
        src={icons[2]}
        alt=""
        className="object-contain drop-shadow absolute"
        style={{ width: 88, height: 88, right: 8, bottom: 0, transform: "rotate(8deg)" }}
        onError={e => { e.target.style.display = "none"; }}
      />
    </div>
  );
}

export default function StepCard({ step, index, color, total }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  // const { playing, toggle } = useAudio(audioUrl);

  const handleSpeak = async () => {
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }

    try {
      // We call our backend at port 3001
      const res = await fetch(`http://localhost:3001/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: step.instruction }) // Sending 'text' in the body
      });

      if (!res.ok) throw new Error("Backend failed");

      // OpenAI TTS returns an audio blob, not JSON
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.onplay = () => setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.play();

    } catch (err) {
      console.error("Speech Error:", err);
    }
  };

  // AI-generated steps carry their own icons; hardcoded steps use keyword matching
  const icons = step.icons?.length
    ? step.icons.map(name => ICON(name))
    : stepIcons(step.label, step.instruction);

  return (
    <div className="slide-up w-full max-w-md mx-auto flex flex-col gap-4">

      {/* ── illustration ── */}
      <div
        className="w-full flex items-center justify-center rounded-3xl border-2 border-black/5"
        style={{ background: `${color}12`, minHeight: 200, paddingTop: 28, paddingBottom: 28 }}
      >
        <IconDisplay icons={icons} color={color} />
      </div>

      {/* ── instruction (hero text) + distance ── */}
      <div className="text-center px-2">
        <p className="text-2xl font-black text-gray-800 leading-snug">
          {step.instruction}
        </p>
        {step.distance && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full mt-3" style={{ background: color }}>
            <span className="text-xl font-black text-white">{step.distance}</span>
            {step.duration && (
              <span className="text-sm font-semibold text-white/80">· {step.duration}</span>
            )}
          </div>
        )}
      </div>

      {/* ── audio ── */}
      <div
        onClick={handleSpeak}
        className="flex items-center gap-4 rounded-2xl p-4 cursor-pointer transition-all"
        style={{
          background: playing ? `${color}10` : "white",
          border: `2px solid ${playing ? color : "#F3F4F6"}`,
          boxShadow: playing ? `0 4px 20px ${color}33` : "0 2px 8px #0001",
        }}
      >
        <Avatar playing={playing} color={color} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
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
