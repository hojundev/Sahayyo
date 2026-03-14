# 🍚 Rohingya Grocery Guide

A visual + audio step-by-step app guiding Rohingya refugees to the nearest grocery store.

---

## Project Structure

```
rohingya-grocery/
├── backend/                  ← Node.js + Express API
│   ├── server.js
│   ├── .env                  ← Add your Google Maps key here
│   └── public/
│       ├── images/           ← Placeholder step images (PNG)
│       └── audio/            ← Placeholder audio files (MP3)
│
├── frontend/                 ← React + Vite + Tailwind
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx
│       │   ├── StepFlow.jsx
│       │   ├── StepCard.jsx
│       │   ├── Avatar.jsx
│       │   └── StatusScreen.jsx
│       └── hooks/
│           ├── useGrocery.js
│           └── useAudio.js
│
└── README.md
```

---

## Quick Start (3 steps)

### 1. Add your Google Maps API key

Edit `backend/.env`:

```
XAI_API_KEY=YOUR_KEY_HERE
GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE
PORT=3001
```

> **Don't have a key?** The app runs in **demo mode** automatically —  
> it returns fake directions so you can test everything without an API key.

To get a free key:
1. Go to https://console.cloud.google.com
2. Enable **Places API** and **Directions API**
3. Create an API key → paste it above

---

### 2. Install dependencies

```bash
# From project root
cd backend  && npm install
cd ../frontend && npm install
```

Or from root (if concurrently is installed):
```bash
npm install && npm run install:all
```

---

### 3. Run both servers

**Terminal 1 — Backend:**
```bash
cd backend
node server.js
# ✅ Backend running → http://localhost:3001
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# ✅ Frontend running → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## How It Works

1. User taps **🍚 Grocery** on the dashboard
2. Browser requests GPS location (falls back to Toronto if denied)
3. Frontend calls `GET /api/nearest-grocery?lat=X&lng=Y`
4. Backend queries Google Maps Places API → finds nearest grocery store
5. Backend queries Google Maps Directions API → gets walking turn-by-turn steps
6. Frontend renders each step with:
   - **Image** (from `backend/public/images/`)
   - **Rohingya text** + English subtitle
   - **Avatar** that animates when audio plays
   - **Audio button** (plays from `backend/public/audio/`)
7. User taps **Next** to advance through walk steps, then store steps

---

## API Endpoint

```
GET /api/nearest-grocery?lat=43.6532&lng=-79.3832
```

**Response:**
```json
{
  "store_name": "Metro Grocery",
  "store_address": "456 Queen St W",
  "store_lat": 43.649,
  "store_lng": -79.381,
  "route": [
    {
      "step": 1,
      "instruction": "Walk north on Yonge St (120m)",
      "rohingya_text": "উত্তর দিকে হাঁটুন",
      "distance": "120 m",
      "duration": "2 mins",
      "image": "/public/images/walk_straight.png",
      "audio": "/public/audio/route_step1.mp3"
    }
  ],
  "store_steps": [
    {
      "step": 1,
      "instruction": "Enter through the front door",
      "rohingya_text": "দোকানে ঢুকুন",
      "image": "/public/images/store_enter.png",
      "audio": "/public/audio/store_step1.mp3"
    }
  ]
}
```

---

## Replacing Placeholder Audio

Drop real Rohingya MP3 files into `backend/public/audio/`:

| File              | Plays when…                        |
|-------------------|------------------------------------|
| `route_step1.mp3` | First walking direction             |
| `route_step2.mp3` | Second walking direction            |
| `store_step1.mp3` | "Enter the store"                  |
| `store_step2.mp3` | "Take a basket"                    |
| `store_step3.mp3` | "Pick your items"                  |
| `store_step4.mp3` | "Go to cashier"                    |
| `store_step5.mp3` | "Pay and collect bags"             |

Audio is played via **Howler.js** — any browser-supported format works (MP3, OGG, WAV).

---

## Replacing Placeholder Images

Drop real images into `backend/public/images/`:

| File                 | Used for              |
|----------------------|-----------------------|
| `walk_straight.png`  | Go straight step      |
| `turn_right.png`     | Turn right step       |
| `turn_left.png`      | Turn left step        |
| `arrive.png`         | Arrival step          |
| `store_enter.png`    | Enter store           |
| `store_basket.png`   | Take basket           |
| `store_pick.png`     | Pick items            |
| `store_cashier.png`  | Go to cashier         |
| `store_pay.png`      | Pay                   |

Recommended size: **800×600px**, clear and simple for low-literacy users.

---

## Adding New Task Categories

Edit `backend/server.js` → add new steps to `store_steps` array.  
Edit `frontend/src/components/Dashboard.jsx` → add new category button.  
No other code changes needed.

---

## Tech Stack

| Layer    | Tech                                      |
|----------|-------------------------------------------|
| Frontend | React 18, Vite, Tailwind CSS, Howler.js   |
| Backend  | Node.js, Express, Axios                   |
| Maps     | Google Maps Places API + Directions API   |
| Audio    | Howler.js (HTML5 Audio + Web Audio API)   |
| Images   | Static files served by Express            |
