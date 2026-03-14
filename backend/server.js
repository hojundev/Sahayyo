require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 3001;
const GMAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.json());
app.use("/public", express.static(path.join(__dirname, "public")));

/* ── helpers ── */
function stripHtml(str) {
  return str.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function maneuverMeta(maneuver = "") {
  const m = maneuver.toLowerCase();
  if (m.includes("turn-right")) return { image: "turn_right.png", type: "Turn Right" };
  if (m.includes("turn-left")) return { image: "turn_left.png", type: "Turn Left" };
  if (m.includes("roundabout")) return { image: "roundabout.png", type: "Roundabout" };
  if (m.includes("straight")) return { image: "straight.png", type: "Go Straight" };
  if (m.includes("arrive")) return { image: "arrive.png", type: "Arrive" };
  return { image: "walk_straight.png", type: "Continue" };
}

function buildLabel(type, instruction) {
  if (/destination will be/i.test(instruction)) return "Arrive";
  const m = instruction.match(/(?:onto|on|toward)\s+([^,\.]+)/i);
  if (m) {
    const street = m[1].replace(/\s+(Destination|Take|Turn|Continue|Head).*/i, "").trim();
    if (street && !/^(the|a |your)/i.test(street)) return `${type} · ${street}`;
  }
  return type;
}

function toMetres(distText = "") {
  if (!distText) return Infinity;
  const n = parseFloat(distText);
  return distText.includes("km") ? n * 1000 : n;
}

/* Pick the most reliable result from a Places API list.
   Prefers places that actually have the requested type in their types array,
   then ranks by a combination of rating and review count.
   Falls back to the nearest result if nothing scores well. */
function pickBestPlace(results, requestedType, userLat, userLng) {
  const TYPE_FAMILIES = {
    hospital:               ["hospital", "health"],
    doctor:                 ["doctor", "health", "physiotherapist", "dentist"],
    pharmacy:               ["pharmacy", "drugstore"],
    grocery_or_supermarket: ["grocery_or_supermarket", "supermarket", "food"],
    restaurant:             ["restaurant", "food", "meal_takeaway", "meal_delivery"],
    cafe:                   ["cafe", "bakery", "food"],
    bakery:                 ["bakery", "food"],
    convenience_store:      ["convenience_store", "grocery_or_supermarket", "supermarket"],
  };

  const validTypes = new Set(TYPE_FAMILIES[requestedType] || [requestedType]);

  function distKm(place) {
    if (!userLat || !userLng) return 0;
    const loc = place.geometry?.location;
    if (!loc) return 0;
    const dLat = (loc.lat - userLat) * Math.PI / 180;
    const dLng = (loc.lng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(userLat*Math.PI/180) * Math.cos(loc.lat*Math.PI/180) * Math.sin(dLng/2)**2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // For hospitals: strongly prefer names that say "hospital", penalise small clinics
  const HOSPITAL_NAME_BOOST  = /\bhospital\b/i;
  const CLINIC_NAME_PENALTY  = /\b(clinic|centre|center|medical office|family practice|walk.?in|specialist|associates|physiotherapy|chiropractic|dental|optom|speech|foot|orthot)\b/i;

  function nameScore(place) {
    if (requestedType !== "hospital") return 0;
    const name = place.name || "";
    if (HOSPITAL_NAME_BOOST.test(name))  return 500;
    if (CLINIC_NAME_PENALTY.test(name))  return -300;
    return 0;
  }

  function score(place) {
    const hasType     = place.types?.some(t => validTypes.has(t)) ? 1 : 0;
    const rating      = place.rating || 0;
    const reviews     = place.user_ratings_total || 0;
    const distPenalty = distKm(place);
    return hasType * 1000 + nameScore(place) + reviews * 0.05 + rating * 10 - distPenalty * 2;
  }

  const sorted = [...results].sort((a, b) => score(b) - score(a));
  if (sorted[0].types?.some(t => validTypes.has(t))) return sorted[0];

  console.warn(`⚠  No strong type match for "${requestedType}" — using nearest result`);
  return results[0];
}

function buildSteps(steps) {
  const MIN_STEP_METRES = 30;

  const labelled = steps.map(s => {
    const instruction = stripHtml(s.html_instructions);
    let label, image;

    if (s.travel_mode === "TRANSIT" && s.transit_details) {
      const t = s.transit_details;
      const line = t.line?.short_name || t.line?.name || "Bus";
      const dep = t.departure_stop?.name || "";
      const arr = t.arrival_stop?.name || "";
      label = `Take ${line}${dep ? ` from ${dep}` : ""}${arr ? ` → ${arr}` : ""}`;
      image = `/public/images/walk_straight.png`;
    } else {
      const meta = maneuverMeta(s.maneuver);
      label = buildLabel(meta.type, instruction);
      image = `/public/images/${meta.image}`;
    }

    return {
      instruction,
      distanceText: s.distance?.text,
      distanceM: toMetres(s.distance?.text),
      durationSecs: s.duration?.value ?? 0,
      image,
      label,
    };
  });

  const merged = labelled.reduce((acc, cur, i) => {
    const prev = acc[acc.length - 1];
    const isLast = i === labelled.length - 1;
    if (prev && prev.label === cur.label && !isLast) {
      prev.distanceM += cur.distanceM;
      prev.durationSecs += cur.durationSecs;
      const totalM = prev.distanceM;
      prev.distanceText = totalM >= 1000
        ? `${(totalM / 1000).toFixed(1)} km`
        : `${Math.round(totalM)} m`;
    } else {
      acc.push({ ...cur });
    }
    return acc;
  }, []);

  return merged
    .filter((s, i) => i === merged.length - 1 || s.distanceM >= MIN_STEP_METRES)
    .map((s, i) => ({
      step: i + 1,
      instruction: s.instruction,
      rohingya_text: s.instruction,
      distance: s.distanceText,
      image: s.image,
      label: s.label,
      audio: `/public/audio/route_step${i + 1}.mp3`,
    }));
}

/* ── fallback ── */
function buildFallbackResponse(lat, lng) {
  return {
    store_name: "Demo Grocery Store",
    store_address: "123 Main Street (demo — add real API key)",
    mode: "walking",
    total_distance: "0.3 km",
    total_duration: "4 mins",
    route: [
      { step: 1, instruction: "Head north on the sidewalk", rohingya_text: "উত্তর দিকে হাঁটুন", label: "Continue", image: "/public/images/walk_straight.png", audio: "/public/audio/route_step1.mp3" },
      { step: 2, instruction: "Turn right at the corner", rohingya_text: "ডানে ঘুরুন", label: "Turn Right", image: "/public/images/turn_right.png", audio: "/public/audio/route_step2.mp3" },
      { step: 3, instruction: "Store is on your left", rohingya_text: "বামে দোকান", label: "Arrive", image: "/public/images/arrive.png", audio: "/public/audio/route_step3.mp3" },
    ],
    store_steps: [
      { step: 1, instruction: "Enter through the front door", rohingya_text: "দোকানে ঢুকুন", image: "/public/images/store_enter.png", audio: "/public/audio/store_step1.mp3" },
      { step: 2, instruction: "Take a basket or cart", rohingya_text: "ঝুড়ি নিন", image: "/public/images/store_basket.png", audio: "/public/audio/store_step2.mp3" },
      { step: 3, instruction: "Pick the items you need", rohingya_text: "জিনিস তুলুন", image: "/public/images/store_pick.png", audio: "/public/audio/store_step3.mp3" },
      { step: 4, instruction: "Go to the cashier counter", rohingya_text: "কাউন্টারে যান", image: "/public/images/store_cashier.png", audio: "/public/audio/store_step4.mp3" },
      { step: 5, instruction: "Pay and collect your bags", rohingya_text: "টাকা দিয়ে ব্যাগ নিন", image: "/public/images/store_pay.png", audio: "/public/audio/store_step5.mp3" },
    ],
    store_image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"
  };
}

/* ── main endpoint ── */
app.post("/api/find-place", async (req, res) => {
  const TYPE_MAP = { doctor: "doctor", hospital: "hospital", pharmacy: "pharmacy" };
  const rawType = req.body.type || "grocery_or_supermarket";
  const { lat, lng, mode: modeOverride, customSteps, searchQuery } = req.body;
  const type = TYPE_MAP[rawType] ?? rawType;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

  if (!GMAPS_KEY || GMAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
  }

  try {
    /* 1. find nearby places and pick the most reliable one.
          - custom searchQuery: use text search with the AI-provided query
          - health types: text search (nearbysearch tags everything as "hospital")
          - everything else: nearby search by distance */
    const HEALTH_TYPES = new Set(["hospital", "doctor", "pharmacy"]);
    let candidates;

    if (searchQuery) {
      const textRes = await axios.get("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        params: { query: searchQuery, location: `${lat},${lng}`, radius: 15000, key: GMAPS_KEY }
      });
      candidates = textRes.data.results?.slice(0, 10) || [];
    } else if (HEALTH_TYPES.has(type)) {
      const QUERY_LABEL  = { hospital: "hospital", doctor: "doctor clinic", pharmacy: "pharmacy" };
      const SEARCH_RADIUS = { hospital: 20000, doctor: 10000, pharmacy: 5000 };
      const textRes = await axios.get("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        params: { query: QUERY_LABEL[type], location: `${lat},${lng}`, radius: SEARCH_RADIUS[type] ?? 10000, key: GMAPS_KEY }
      });
      candidates = textRes.data.results?.slice(0, 20) || [];
    } else {
      const nearbyRes = await axios.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", {
        params: { location: `${lat},${lng}`, rankby: "distance", type, key: GMAPS_KEY }
      });
      candidates = nearbyRes.data.results?.slice(0, 10) || [];
    }

    if (!candidates.length) {
      return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
    }

    const store = pickBestPlace(candidates, type, parseFloat(lat), parseFloat(lng));
    const storeLat = store.geometry.location.lat;
    const storeLng = store.geometry.location.lng;
    const dest = `${storeLat},${storeLng}`;
    const origin = `${lat},${lng}`;

    /* 2. fetch walking directions to get real distance */
    const walkRes = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
      params: { origin, destination: dest, mode: "walking", key: GMAPS_KEY }
    });

    const walkLegs = walkRes.data.routes?.[0]?.legs?.[0];
    const walkDistM = walkLegs?.distance?.value ?? Infinity;
    const WALK_LIMIT_M = 1500;

    let mode, legs;

    if (modeOverride === "walking") {
      mode = "walking";
      legs = walkLegs;
    } else if (modeOverride === "transit") {
      const transitRes = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: { origin, destination: dest, mode: "transit", key: GMAPS_KEY }
      });
      const transitLegs = transitRes.data.routes?.[0]?.legs?.[0];
      mode = "transit";
      legs = transitLegs || walkLegs;
    } else if (walkDistM <= WALK_LIMIT_M) {
      /* auto: close enough — walk */
      mode = "walking";
      legs = walkLegs;
    } else {
      /* auto: too far — try transit */
      const transitRes = await axios.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: { origin, destination: dest, mode: "transit", key: GMAPS_KEY }
      });
      const transitLegs = transitRes.data.routes?.[0]?.legs?.[0];
      if (transitLegs) {
        mode = "transit";
        legs = transitLegs;
      } else {
        mode = "walking";
        legs = walkLegs;
      }
    }

    const route = buildSteps(legs?.steps || []);

    const INSIDE_STEPS = {
      grocery_or_supermarket: [
        { instruction: "Walk in — anyone can enter, no permission needed",         rohingya_text: "সবাই ঢুকতে পারে — অনুমতি লাগে না" },
        { instruction: "Take a basket near the entrance, or push a cart",          rohingya_text: "প্রবেশদ্বারে ঝুড়ি বা ট্রলি নিন — এগুলো বিনামূল্যে ব্যবহার করা যায়" },
        { instruction: "Check the shelf label for the price — not the item itself", rohingya_text: "দাম পণ্যে নয়, তাকের লেবেলে দেখুন" },
        { instruction: "Look for a green Halal label if you need halal food",      rohingya_text: "হালাল খাবারের জন্য সবুজ হালাল লেবেল দেখুন" },
        { instruction: "Place items on the belt at the cashier counter",           rohingya_text: "ক্যাশিয়ারের বেল্টে পণ্য রাখুন" },
        { instruction: "Bag your own groceries — this is normal in Canada",        rohingya_text: "নিজে ব্যাগে ভরুন — এটাই কানাডার নিয়ম" },
        { instruction: "Tap your card or pay cash — exact change not needed",      rohingya_text: "কার্ড ট্যাপ করুন বা নগদ দিন — খুচরা লাগবে না" },
      ],
      convenience_store: [
        { instruction: "Walk in — no need to ask anyone",                          rohingya_text: "সরাসরি ঢুকুন — কাউকে জিজ্ঞেস করতে হবে না" },
        { instruction: "Prices here are higher than a grocery store — that is normal", rohingya_text: "এখানে দাম একটু বেশি — এটা স্বাভাবিক" },
        { instruction: "Bring your items to the counter",                          rohingya_text: "পণ্য কাউন্টারে নিয়ে যান" },
        { instruction: "Tap your card or pay cash",                                rohingya_text: "কার্ড ট্যাপ করুন বা নগদ দিন" },
      ],
      restaurant: [
        { instruction: "Wait at the door — a staff member will seat you",          rohingya_text: "দরজায় অপেক্ষা করুন — কর্মী আপনাকে বসাবে" },
        { instruction: "You can point at menu pictures if you don't speak English", rohingya_text: "ইংরেজি না জানলে মেনুর ছবি দেখিয়ে অর্ডার করুন" },
        { instruction: "Water is free — just ask",                                 rohingya_text: "পানি বিনামূল্যে — শুধু চাইতে হবে" },
        { instruction: "Ask if the food is halal — you have the right to know",    rohingya_text: "খাবার হালাল কিনা জিজ্ঞেস করুন — জানার অধিকার আপনার আছে" },
        { instruction: "Ask for the bill when you are done eating",                rohingya_text: "খাওয়া শেষে বিল চান" },
        { instruction: "Add a 15% tip when paying — this is expected in Canada",   rohingya_text: "বিলের সাথে ১৫% টিপস দিন — কানাডায় এটা প্রচলিত" },
      ],
      cafe: [
        { instruction: "Walk up to the counter and order",                         rohingya_text: "কাউন্টারে গিয়ে অর্ডার করুন" },
        { instruction: "Point to items on the display if you are unsure",          rohingya_text: "নিশ্চিত না হলে ডিসপ্লেতে দেখিয়ে বলুন" },
        { instruction: "Tap your card or pay cash",                                rohingya_text: "কার্ড ট্যাপ করুন বা নগদ দিন" },
        { instruction: "Wait near the counter — your name or number will be called", rohingya_text: "কাউন্টারের কাছে অপেক্ষা করুন — নাম বা নম্বর ডাকা হবে" },
      ],
      bakery: [
        { instruction: "Walk in and browse — no pressure to buy",                  rohingya_text: "ঢুকুন এবং দেখুন — কিনতে বাধ্য নন" },
        { instruction: "Pick the items you want",                                  rohingya_text: "পছন্দের জিনিস বেছে নিন" },
        { instruction: "Bring to the counter and pay",                             rohingya_text: "কাউন্টারে নিয়ে টাকা দিন" },
      ],
      pharmacy: [
        { instruction: "Walk in — no appointment needed for advice",               rohingya_text: "ঢুকুন — পরামর্শের জন্য অ্যাপয়েন্টমেন্ট লাগে না" },
        { instruction: "The pharmacist in the back can answer health questions for free", rohingya_text: "পেছনের ফার্মাসিস্ট বিনামূল্যে স্বাস্থ্য পরামর্শ দেবেন" },
        { instruction: "Show your doctor's prescription if you have one",          rohingya_text: "ডাক্তারের প্রেসক্রিপশন থাকলে দেখান" },
        { instruction: "Show your health card — some medicine may be covered free", rohingya_text: "হেলথ কার্ড দেখান — কিছু ওষুধ বিনামূল্যে পাওয়া যায়" },
        { instruction: "Pay at the front cashier for any remaining cost",          rohingya_text: "বাকি টাকা সামনের ক্যাশিয়ারে দিন" },
      ],
      hospital: [
        { instruction: "Walk into Emergency — it is open 24 hours, always",        rohingya_text: "ইমার্জেন্সিতে যান — এটা ২৪ ঘণ্টা খোলা থাকে" },
        { instruction: "Show your health card (OHIP or provincial card)",          rohingya_text: "আপনার হেলথ কার্ড (ওএইচআইপি) দেখান" },
        { instruction: "No health card yet? Say: 'I am a newcomer' — they will help you", rohingya_text: "কার্ড না থাকলে বলুন: 'আমি নতুন এসেছি' — তারা সাহায্য করবে" },
        { instruction: "Ask for an interpreter — hospitals must provide one free", rohingya_text: "দোভাষী চাইতে পারেন — হাসপাতাল বিনামূল্যে দিতে বাধ্য" },
        { instruction: "Healthcare here is free with your card — you will not be turned away", rohingya_text: "কার্ড থাকলে চিকিৎসা বিনামূল্যে — কাউকে ফেরানো হয় না" },
        { instruction: "Wait in the waiting area until your name is called",       rohingya_text: "অপেক্ষা কক্ষে বসুন — নাম ডাকা পর্যন্ত" },
      ],
      doctor: [
        { instruction: "Walk-in clinics need no appointment — just walk in",       rohingya_text: "ওয়াক-ইন ক্লিনিকে অ্যাপয়েন্টমেন্ট লাগে না — সরাসরি যান" },
        { instruction: "Sign your name at the front desk",                         rohingya_text: "সামনের ডেস্কে আপনার নাম লিখুন" },
        { instruction: "Show your health card — or say you are a newcomer",        rohingya_text: "হেলথ কার্ড দেখান — বা বলুন আপনি নতুন এসেছেন" },
        { instruction: "Wait in the waiting room — it may take 30–60 minutes",    rohingya_text: "অপেক্ষা করুন — ৩০–৬০ মিনিট লাগতে পারে" },
        { instruction: "When called, go in and explain your problem clearly",      rohingya_text: "ডাক পেলে ভেতরে যান এবং সমস্যা স্পষ্টভাবে বলুন" },
      ],
    };

    const insideSteps = (customSteps?.length ? customSteps : null)
      || INSIDE_STEPS[rawType]
      || INSIDE_STEPS["grocery_or_supermarket"];
    const store_steps = insideSteps.map((s, i) => ({
      step:          i + 1,
      instruction:   s.instruction,
      rohingya_text: s.rohingya_text,
      icons:         s.icons || null,
      audio:         `/public/audio/store_step${i + 1}.mp3`,
    }));

    // Image Logic:
    // Try Google Places Photo, otherwise use a generic Grocery Store placeholder image
    let storeImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80"; // A nice grocery aisle fallback

    if (store.photos && store.photos.length > 0) {
      try {
        const photoRef = store.photos[0].photo_reference;
        const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${GMAPS_KEY}`;
        
        // Fetch the photo redirect URL gracefully on the backend to avoid browser API Key restrictions!
        const photoRes = await axios.get(photoApiUrl, {
          maxRedirects: 0,
          validateStatus: (s) => s >= 200 && s < 400
        });
        
        if (photoRes.headers.location) {
          storeImage = photoRes.headers.location;
        }
      } catch (err) {
        console.error("Photo retrieval warning:", err.message);
      }
    }

    return res.json({
      store_name: store.name,
      store_address: store.vicinity,
      store_lat: storeLat,
      store_lng: storeLng,
      mode,
      total_distance: legs?.distance?.text,
      total_duration: legs?.duration?.text,
      store_image: storeImage,
      route,
      store_steps,
    });

  } catch (err) {
    console.error("Google API error:", err.message);
    return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
  }
});

/* ── AI custom scenario generator ── */
app.post("/api/custom/generate", async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: "description required" });

  try {
    const prompt = `You are a guide for Rohingya refugees who recently arrived in Canada. They have low literacy in English and Bengali. They are navigating a completely new country with unfamiliar systems, language barriers, and cultural differences (no experience with Canadian banks, health cards, tipping, government offices, or social norms).

The person described what they need: "${description.trim()}"

Generate 2–4 nearby place options that would help them. Return ONLY a JSON array, no markdown, no explanation.

Each item must have:
- "label": Bengali label (2–3 words, Bangla script)
- "labelEn": English label (2–3 words)
- "emoji": single most relevant emoji
- "color": one hex from: #10B981, #3B82F6, #EF4444, #F59E0B, #8B5CF6, #FF8C42, #EC4899
- "placeType": best Google Places API type (bank, post_office, local_government_office, library, school, laundry, place_of_worship, atm, pharmacy, hospital, doctor, restaurant, cafe, hair_care, clothing_store, shopping_mall, grocery_or_supermarket)
- "searchQuery": specific Google search query for Canada (e.g. "Western Union money transfer", "Islamic mosque", "Service Canada office", "halal grocery")
- "insideSteps": array of 5–6 steps, each { "instruction": "...", "rohingya_text": "...", "icons": ["icon1", "icon2"] }

CRITICAL rules for insideSteps:
1. instruction must be MAX 8 WORDS. Short. Direct. No full sentences.
2. Each step must have "icons": array of 1–2 icon names chosen from this exact list:
   door, basket, shopping-cart, shopping-bags, credit-card, money-bag, money-with-wings,
   coin, receipt, memo, pen, ticket, id-card, waving-hand, speaking-head, speech-balloon,
   pill, stethoscope, hospital, ambulance, medical-symbol, hourglass-not-done, chair,
   green-circle, raising-hands, ok-hand, folded-hands, smiling-face-with-open-hands,
   fork-and-knife-with-plate, glass-of-milk, backhand-index-pointing-right,
   magnifying-glass, books, mobile-phone, bank, mosque, globe-showing-asia-australia,
   person-walking, bus, train, round-pushpin, right-arrow, left-arrow, up-arrow,
   currency-exchange, label, shopping-bags, nail-polish, scissors, barber-pole,
   briefcase, handshake, building-bank, classical-building, fire-station
   Pick icons that visually represent the action. Use 2 icons when the step has two key concepts.
3. Address real culture-shock moments for Rohingya newcomers:
   - Canadian services are often FREE (healthcare, libraries, settlement services) — say so
   - They may fear government offices or authority — reassure: "staff will help you", "you are safe"
   - They don't know: OHIP health card, 15% tipping, self-bagging groceries, tap-to-pay
   - Interpreter is a legal right — not optional, not extra cost
   - They fled persecution — never make ID checks sound threatening; always pair with reassurance
4. rohingya_text must be natural Bangla/Bengali script — conversational, not literal translation`;

    const result = await gemini.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const raw = result.text.trim()
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const options = JSON.parse(raw);
    res.json({ options });
  } catch (err) {
    console.error("Custom generate error:", err.message);
    res.status(500).json({ error: "AI could not generate options. Please try again." });
  }
});

app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  console.log("Processing speech for:", text);

  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERROR: OPENAI_API_KEY is missing from .env");
    return res.status(500).json({ error: "API Key missing" });
  }

  try {
    // 1. Translation
    const translationRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // mini is faster and cheaper for translations
        messages: [{
          role: 'system',
          content: `Translate to Chittagonian/Rohingya dialect in Bengali script. Short instructions only.`
        }, { role: 'user', content: text }],
      }),
    });

    const transData = await translationRes.json();
    if (transData.error) throw new Error(transData.error.message);
    
    const translatedText = transData.choices[0].message.content.trim();
    console.log("✅ Translated to:", translatedText);

    // 2. TTS
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: "shimmer",
        input: translatedText,
      }),
    });

    if (!ttsRes.ok) {
        const ttsError = await ttsRes.json();
        throw new Error(ttsError.error.message);
    }

    const arrayBuffer = await ttsRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log("🎵 Audio generated, sending to frontend...");
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);

  } catch (err) {
    console.error("💥 BACKEND CRASH:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`✅  Backend running → http://localhost:${PORT}`));
