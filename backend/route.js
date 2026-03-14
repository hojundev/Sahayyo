require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

app.use(cors());
app.use(express.json());

// failsafe database
const fallbackDatabase = {
  "halal": { name: "Lazeez Shawarma", address: "170 University Ave W", destLat: 43.4731, destLng: -80.5369 },
  "afghan": { name: "Chopan Kabob", address: "University Ave", destLat: 43.4750, destLng: -80.5250 },
  "vegetarian": { name: "Jane Bond", address: "5 Princess St W", destLat: 43.4632, destLng: -80.5211 },
  "default": { name: "Conestoga Mall", address: "550 King St N", destLat: 43.4974, destLng: -80.5267 }
};

// finding closest destination
app.get('/api/find-destination', async (req, res) => {
  const { keyword, lat, lng } = req.query;

  if (!keyword || !lat || !lng) {
    return res.status(400).json({ error: "Missing keyword, lat, or lng" });
  }

  try {
    const searchQuery = encodeURIComponent(`${keyword}`);
    
    // Google Places Text Search biased to the user's location (5km radius)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${searchQuery}&location=${lat},${lng}&radius=5000&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await axios.get(url);
    const places = response.data.results;

    if (!places || places.length === 0) {
      throw new Error("No places found"); // Trigger fallback
    }

    // Grab the top result
    const bestPlace = places[0];

    res.json({
      name: bestPlace.name,
      address: bestPlace.formatted_address,
      destLat: bestPlace.geometry.location.lat,
      destLng: bestPlace.geometry.location.lng
    });

  } catch (error) {
    console.error("Google Places API failed, using fallback database:", error.message);
    const normalizedKeyword = keyword.toLowerCase();
    const fallback = fallbackDatabase[normalizedKeyword] || fallbackDatabase["default"];
    res.json(fallback);
  }
});

// route steps
app.get('/api/get-route', async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;

  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ error: "Missing origin or destination coordinates" });
  }

  try {
    // We force mode=transit. Google will automatically include the walking steps to/from the bus stops!
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(url);
    const data = response.data;

    if (data.status !== "OK" || !data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: "No route found" });
    }

    const leg = data.routes[0].legs[0];

    // Distill the complex Google steps into a clean array for the frontend cards
    const simplifiedSteps = leg.steps.map((step, index) => {
      
      // Handle Walking Steps
      if (step.travel_mode === 'WALKING') {
        return {
          id: index,
          type: 'WALKING',
          distance: step.distance.text,
          duration: step.duration.text,
          // Google includes HTML tags (like <b>left</b>). We strip them out so it's clean text for your UI.
          instruction: step.html_instructions.replace(/<[^>]*>?/gm, '') 
        };
      } 
      
      // Handle Transit (Bus/Train) Steps
      else if (step.travel_mode === 'TRANSIT') {
        const transit = step.transit_details;
        return {
          id: index,
          type: 'TRANSIT',
          vehicle: transit.line.vehicle.type, // e.g., "BUS"
          lineNumber: transit.line.short_name || transit.line.name, // e.g., "201"
          departureStop: transit.departure_stop.name,
          arrivalStop: transit.arrival_stop.name,
          numStops: transit.num_stops,
          duration: step.duration.text
        };
      }

      return null;
    }).filter(step => step !== null);

    res.json({
      totalDuration: leg.duration.text,
      totalDistance: leg.distance.text,
      steps: simplifiedSteps
    });

  } catch (error) {
    console.error("Google Directions API failed:", error.message);
    res.status(500).json({ error: "Failed to generate route" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Pathfinder Backend running on http://localhost:${PORT}`);
});