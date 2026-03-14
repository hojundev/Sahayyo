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
app.get("/api/find-place", async (req, res) => {
  const TYPE_MAP = { doctor: "doctor", hospital: "hospital", pharmacy: "pharmacy" };
  const rawType = req.query.type || "grocery_or_supermarket";
  const { lat, lng, mode: modeOverride } = req.query;
  const type = TYPE_MAP[rawType] ?? rawType;
  if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

  if (!GMAPS_KEY || GMAPS_KEY === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
    return res.json(buildFallbackResponse(parseFloat(lat), parseFloat(lng)));
  }

  try {
    /* 1. find nearby places and pick the most reliable one.
          For health types, Google's nearbysearch tags every small clinic as
          "hospital", so we use Text Search which returns proper institutions. */
    const HEALTH_TYPES = new Set(["hospital", "doctor", "pharmacy"]);
    let candidates;

    if (HEALTH_TYPES.has(type)) {
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

    const store_steps = [
      { step: 1, instruction: "Enter through the front door", rohingya_text: "দোকানে ঢুকুন", image: "/public/images/store_enter.png", audio: "/public/audio/store_step1.mp3" },
      { step: 2, instruction: "Take a basket or cart", rohingya_text: "ঝুড়ি নিন", image: "/public/images/store_basket.png", audio: "/public/audio/store_step2.mp3" },
      { step: 3, instruction: "Pick the items you need", rohingya_text: "জিনিস তুলুন", image: "/public/images/store_pick.png", audio: "/public/audio/store_step3.mp3" },
      { step: 4, instruction: "Go to the cashier counter", rohingya_text: "কাউন্টারে যান", image: "/public/images/store_cashier.png", audio: "/public/audio/store_step4.mp3" },
      { step: 5, instruction: "Pay and collect your bags", rohingya_text: "টাকা দিয়ে ব্যাগ নিন", image: "/public/images/store_pay.png", audio: "/public/audio/store_step5.mp3" },
    ];

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

app.listen(PORT, () => console.log(`✅  Backend running → http://localhost:${PORT}`));
