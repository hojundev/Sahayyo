# Sahayyo · সাহায্য

**A visual navigation & language guide for Rohingya refugees in Canada**

Sahayyo (meaning *help* in Rohingya) is a mobile-first web app that guides Rohingya newcomers through everyday tasks — finding a grocery store, visiting a pharmacy, sending money, and more. Every instruction is delivered through large emojis, native-language audio, and a step-by-step visual flow designed for low-literacy users.

---

## How It Works

1. **Home screen** — tap a category (Food, Doctor, etc.) or use **Ask AI** to describe any need in your own words
2. **Venue picker** — choose what kind of place you're looking for (grocery, restaurant, pharmacy…)
3. **AI custom flow** *(Ask AI only)* — Gemini generates 2–4 culturally-aware options; tap one to continue
4. **Recommend screen** — the nearest matching place is shown with distance, duration, and a photo; switch between walking and transit
5. **Step-by-step guidance** — turn-by-turn walking route, then in-store instructions; each step has:
   - Emoji icons matched to the instruction
   - Bengali/Rohingya text as the primary heading
   - English subtitle for helpers or support workers
   - Audio playback — tap to hear the instruction read aloud (translated + AI-generated speech)

---

## Project Structure

```
Team-404/
├── backend/
│   ├── server.js             ← Express API (routes, AI calls, TTS)
│   ├── .env                  ← API keys (see setup below)
│   └── public/
│       ├── images/           ← Step illustration placeholders
│       └── audio/            ← Audio placeholders
│
├── frontend/
│   └── src/
│       ├── App.jsx                     ← Main router & screen state machine
│       ├── components/
│       │   ├── Dashboard.jsx           ← Home screen (6 categories + Ask AI)
│       │   ├── VenuePicker.jsx         ← Food/health sub-category selector
│       │   ├── CustomInputScreen.jsx   ← Free-form AI query input
│       │   ├── CustomOptionsPicker.jsx ← Displays AI-generated options
│       │   ├── RecommendScreen.jsx     ← Place card + mode toggle
│       │   ├── StepFlow.jsx            ← Step walker (route + store phases)
│       │   ├── StepCard.jsx            ← Individual step (icons + TTS button)
│       │   ├── ModePicker.jsx          ← Walking vs transit choice
│       │   ├── StatusScreen.jsx        ← Locating / loading / error states
│       │   └── Avatar.jsx              ← Animated waveform avatar
│       └── hooks/
│           ├── useGrocery.js   ← Geolocation + API fetch logic
│           └── useAudio.js     ← Howler.js audio player
│
└── README.md
```

---

## Quick Start

### 1. Add API keys

Create `backend/.env`:

```
GOOGLE_MAPS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PORT=3001
```

| Key | Used for | Free tier |
|-----|----------|-----------|
| `GOOGLE_MAPS_API_KEY` | Places API + Directions API + Photos | $200 credit/month |
| `GEMINI_API_KEY` | Custom scenario generation (Gemini 2.5 Flash) | Free tier available |
| `OPENAI_API_KEY` | Bengali/Rohingya translation + TTS audio | Pay-per-use |

> **No keys?** The app falls back to **demo mode** — fake directions are returned so you can test the full UI without any API calls.

**Getting a Google Maps key:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Places API**, **Directions API**, and **Maps JavaScript API**
3. Create a key → paste it above

**Getting a Gemini key:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key → paste it above

**Getting an OpenAI key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key → paste it above

---

### 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### 3. Run both servers

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# ✅ Backend running → http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm run dev
# ✅ Frontend running → http://localhost:5173
```

Open **http://localhost:5173** in your browser (or on your phone via your local network IP).

---

## API Endpoints

### `POST /api/find-place`

Main endpoint. Finds the nearest matching place and returns a full guided route.

**Body:**
```json
{
  "lat": 43.6532,
  "lng": -79.3832,
  "type": "grocery_or_supermarket",
  "mode": "walking",
  "searchQuery": "grocery store near me",
  "customSteps": []
}
```

**Response:**
```json
{
  "store_name": "Metro",
  "store_address": "456 Queen St W, Toronto",
  "mode": "walking",
  "total_distance": "850 m",
  "total_duration": "11 mins",
  "store_image": "https://...",
  "route": [
    {
      "step": 1,
      "instruction": "Head north on Yonge St",
      "rohingya_text": "উত্তর দিকে হাঁটুন",
      "distance": "120 m",
      "duration": "2 mins"
    }
  ],
  "store_steps": [
    {
      "step": 1,
      "instruction": "Enter through the front door",
      "rohingya_text": "দোকানে ঢুকুন",
      "icons": ["door", "enter"]
    }
  ]
}
```

---

### `POST /api/custom/generate`

Generates culturally-aware place options from a free-form user description. Powered by Gemini 2.5 Flash.

**Body:**
```json
{ "description": "I need to send money to my family" }
```

**Response:**
```json
{
  "options": [
    {
      "label": "টাকা পাঠান",
      "labelEn": "Send Money",
      "emoji": "💸",
      "color": "#10B981",
      "placeType": "bank",
      "searchQuery": "Western Union or money transfer near me",
      "insideSteps": [
        {
          "instruction": "Tell the cashier: I want to send money",
          "rohingya_text": "ক্যাশিয়ারকে বলুন: আমি টাকা পাঠাতে চাই",
          "icons": ["money", "person"]
        }
      ]
    }
  ]
}
```

---

### `POST /api/tts`

Translates an English instruction to Bengali/Rohingya and returns an audio file.

**Body:**
```json
{ "text": "Walk north on Yonge St toward Dundas St" }
```

**Response:** `audio/mpeg` blob (plays directly in the browser)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Navigation | Google Maps Places API + Directions API |
| AI (scenarios) | Google Gemini 2.5 Flash |
| AI (translation) | OpenAI GPT-4o-mini |
| AI (audio) | OpenAI TTS (`tts-1`, shimmer voice) |
| Icons | Iconify Fluent Emoji API |
| Audio playback | Howler.js |

---

## Supported Task Categories

| Category | Status | Notes |
|----------|--------|-------|
| 🥬 Grocery / Supermarket | ✅ Full | Walking route + in-store steps |
| 🍽️ Restaurant | ✅ Full | Includes tipping + menu guidance |
| ☕ Café | ✅ Full | Counter ordering flow |
| 🍞 Bakery | ✅ Full | Browse at your own pace |
| 🏪 Convenience Store | ✅ Full | Higher prices warning included |
| 💊 Pharmacy | ✅ Full | Health card + no appointment needed |
| 🏥 Hospital / Emergency | ✅ Full | 24hr, interpreter rights, health card |
| 🩺 Doctor / Walk-in Clinic | ✅ Full | Sign-in process, wait time |
| ❓ Ask AI (anything) | ✅ Full | Gemini generates options for any request |
| 🚌 Bus | 🔜 Coming soon | |
| 🏫 School | 🔜 Coming soon | |

---

## Roadmap

**Next steps**
- Record real Rohingya audio with native speakers from the local community
- Add Bus and School task flows
- PWA manifest — install to home screen with no app store needed

**Short term (3–6 months)**
- Partner with a local settlement agency for community testing
- Add Pashto, Dari, Tigrinya — same architecture, new JSON + audio files
- Offline mode — cache routes and audio for areas with poor connectivity

**Long term**
- Android APK distributed via WhatsApp / direct link
- Volunteer translator portal — community members contribute audio recordings

---

## Estimated Cost (live deployment)

| Service | Free Tier | Production |
|---------|-----------|------------|
| Google Maps API | $200 credit/month | ~$0.005 per route |
| Gemini (scenarios) | Free tier | Negligible |
| OpenAI (TTS + translation) | Pay-per-use | ~$0.01 per audio request |
| Netlify (frontend) | 100 GB/month free | Free at this scale |
| Railway (backend) | 500 hrs/month free | ~$5/month always-on |

**Estimated total: under $10 CAD/month for a live community deployment.**

---

*Every refugee deserves to navigate their new home with dignity, confidence, and independence.*

**Sahayyo · সাহায্য · Help**
