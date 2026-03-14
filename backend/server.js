require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

/* ── helpers ── */
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function maneuverMeta(maneuver = "") {
  const m = maneuver.toLowerCase();
  if (m.includes("turn-right"))  return { image: "turn_right.png",   emoji: "➡️",  label: "Turn Right" };
  if (m.includes("turn-left"))   return { image: "turn_left.png",    emoji: "⬅️",  label: "Turn Left" };
  if (m.includes("roundabout"))  return { image: "roundabout.png",   emoji: "🔄",  label: "Roundabout" };
  if (m.includes("straight"))    return { image: "straight.png",     emoji: "⬆️",  label: "Go Straight" };
  if (m.includes("arrive"))      return { image: "arrive.png",       emoji: "📍",  label: "Arrive" };
  return                                { image: "walk_straight.png", emoji: "⬆️",  label: "Continue" };
}

/* parse distance string like "47 m" or "0.2 km" into metres */
function toMetres(distText = "") {
  if (!distText) return Infinity;
  const n = parseFloat(distText);
  return distText.includes("km") ? n * 1000 : n;
}

function routeAudioForIndex(i) {
  return `route_step${i + 1}.mp3`;
}

/* ── placeholder fallback (no real API key) ── */
function buildFallbackResponse(lat, lng) {
  return {
    store_name: "Demo Grocery Store",
    store_address: "123 Main Street (demo — add real API key)",
    store_lat: lat + 0.004,
    store_lng: lng + 0.004,
    route: [
      { step: 1, instruction: "Head north on the sidewalk (100m)", rohingya_text: "উত্তর দিকে হাঁটুন", image: "/public/images/walk_straight.png", audio: "/public/audio/route_step1.mp3" },
      { step: 2, instruction: "Turn right at the corner",           rohingya_text: "ডানে ঘুরুন",        image: "/public/images/turn_right.png",    audio: "/public/audio/route_step2.mp3" },
      { step: 3, instruction: "Walk 200m — store is on your left",  rohingya_text: "বামে দোকান",         image: "/public/images/arrive.png",          audio: "/public/audio/route_step3.mp3" }
    ],
    store_steps: [
      { step: 1, instruction: "Enter through the front door",       rohingya_text: "দোকানে ঢুকুন",       image: "/public/images/store_enter.png",    audio: "/public/audio/store_step1.mp3" },
      { step: 2, instruction: "Take a basket or cart",              rohingya_text: "ঝুড়ি নিন",            image: "/public/images/store_basket.png",   audio: "/public/audio/store_step2.mp3" },
      { step: 3, instruction: "Pick the items you need",            rohingya_text: "জিনিস তুলুন",          image: "/public/images/store_pick.png",     audio: "/public/audio/store_step3.mp3" },
      { step: 4, instruction: "Go to the cashier",                  rohingya_text: "কাউন্টারে যান",        image: "/public/images/store_cashier.png",  audio: "/public/audio/store_step4.mp3" },
      { step: 5, instruction: "Pay and collect your bags",          rohingya_text: "টাকা দিয়ে ব্যাগ নিন",  image: "/public/images/store_pay.png",      audio: "/public/audio/store_step5.mp3" }
    ]
  };
}

/* ── main endpoint ── */
app.get("/api/nearest-grocery", async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

  if (!GMAPS_KEY || GMAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    console.warn("⚠  No real API key — returning demo data");
    return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
  }

  try {
    /* 1. nearest grocery */
    const placesRes = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
      params: { location: `${lat},${lng}`, rankby: "distance", type: "grocery_or_supermarket", key: GMAPS_KEY }
    });

    if (!placesRes.data.results?.length) {
      return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
    }

    const store = placesRes.data.results[0];
    const storeLat = store.geometry.location.lat;
    const storeLng = store.geometry.location.lng;

    /* 2. walking directions */
    const dirRes = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
      params: { origin: `${lat},${lng}`, destination: `${storeLat},${storeLng}`, mode: "walking", key: GMAPS_KEY }
    });

    const legs = dirRes.data.routes?.[0]?.legs?.[0];
    const steps = legs?.steps || [];

    const MIN_STEP_METRES = 30;
    const keySteps = steps.filter((s, i) => {
      const isLast = i === steps.length - 1;
      return isLast || toMetres(s.distance?.text) >= MIN_STEP_METRES;
    });

    const route = keySteps.map((s, i) => {
      const meta = maneuverMeta(s.maneuver);
      return {
        step:          i + 1,
        instruction:   stripHtml(s.html_instructions),
        rohingya_text: stripHtml(s.html_instructions),
        distance:      s.distance?.text,
        duration:      s.duration?.text,
        image:         `/public/images/${meta.image}`,
        emoji:         meta.emoji,
        label:         meta.label,
        audio:         `/public/audio/${routeAudioForIndex(i)}`
      };
    });

    const store_steps = [
      { step:1, instruction:"Enter through the front door",  rohingya_text:"দোকানে ঢুকুন",      image:"/public/images/store_enter.png",   audio:"/public/audio/store_step1.mp3" },
      { step:2, instruction:"Take a basket or cart",         rohingya_text:"ঝুড়ি নিন",           image:"/public/images/store_basket.png",  audio:"/public/audio/store_step2.mp3" },
      { step:3, instruction:"Pick the items you need",       rohingya_text:"জিনিস তুলুন",         image:"/public/images/store_pick.png",    audio:"/public/audio/store_step3.mp3" },
      { step:4, instruction:"Go to the cashier counter",     rohingya_text:"কাউন্টারে যান",       image:"/public/images/store_cashier.png", audio:"/public/audio/store_step4.mp3" },
      { step:5, instruction:"Pay and collect your bags",     rohingya_text:"টাকা দিয়ে ব্যাগ নিন", image:"/public/images/store_pay.png",     audio:"/public/audio/store_step5.mp3" }
    ];

    return res.json({
      store_name:    store.name,
      store_address: store.vicinity,
      store_lat:     storeLat,
      store_lng:     storeLng,
      route,
      store_steps
    });

  } catch (err) {
    console.error("Google API error:", err.message);
    return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
  }
});

app.listen(PORT, () => console.log(`✅  Backend running → http://localhost:${PORT}`));
