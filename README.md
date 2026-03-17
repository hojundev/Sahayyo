# [`Sahayyo (সাহায্য)`](https://uwaterloo.ca/artificial-intelligence-institute/events/ai-data-science-good-hackathon-winter-2026)

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat\&logo=javascript\&logoColor=black) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white) ![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

### 🥈 2nd Place Winner — AI & Data Science for Good Hackathon (Winter 2026)

**An oral-first guide for Rohingya refugees in Canada, using audio and visual workflows to navigate daily life.**

---

## Preview

<img width="1710" height="937" alt="Screenshot 2026-03-16 at 1 20 54 in the afternoon" src="https://github.com/user-attachments/assets/11cacfb1-fc14-450f-b0d1-ad91181aac62" />

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Navigation | Google Maps Places API + Directions API |
| AI (Logic) | Google Gemini 2.5 Flash |
| AI (Language) | OpenAI GPT-4o-mini (Translation) + OpenAI TTS-1 (Audio) |

---

## Local Setup


### 1. Clone & Install dependencies

```bash
git clone https://github.com/hojundev/Sahayyo.git
cd Sahayyo
npm run install:all
```

### 2. Add API keys

Create `backend/.env`:

```
GOOGLE_MAPS_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
PORT=3001
```

> **No keys?** The app falls back to **demo mode** — fake directions are returned so you can test the full UI without any API calls.

### 3. Run both servers
 
```bash
npm run dev
```

Open **http://localhost:5173** in your browser (or on your phone via your local network IP).

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

---

## Next Steps

- Implement Few-Shot Voice Cloning (RVC) using native Rohingya speaker samples
- Modularize the JSON schema to support new low-resource languages (Pashto, Dari, Tigrinya)
- Offline mode — cache routes and audio for areas with poor connectivity
- Add additional task categories including Bus and School task flows
