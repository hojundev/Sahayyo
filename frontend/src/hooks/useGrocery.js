import { useState, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export function useGrocery() {
  const [state, setState] = useState({
    status: "idle",   // idle | locating | loading | ready | error
    data:   null,
    error:  null,
  });

  // Store coords + placeType so we can refetch with a different mode
  const lastParams = useRef(null);

  const _fetch = useCallback(async ({ lat, lng, placeType, mode }) => {
    setState(s => ({ ...s, status: "loading" }));
    try {
      const url = `${API}/api/find-place?lat=${lat}&lng=${lng}&type=${placeType}${mode ? `&mode=${mode}` : ""}`;
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setState({ status: "ready", data, error: null });
    } catch (err) {
      setState({ status: "error", data: null, error: err.message });
    }
  }, []);

  const fetchGrocery = useCallback(async ({ placeType = "grocery_or_supermarket" } = {}) => {
    setState({ status: "locating", data: null, error: null });

    let lat, lng;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (err) {
      const msg = err?.code === 1
        ? "Location access denied. Please allow location permission and try again."
        : "Could not get your location. Please try again.";
      setState({ status: "error", data: null, error: msg });
      return;
    }

    lastParams.current = { lat, lng, placeType };
    await _fetch({ lat, lng, placeType });
  }, [_fetch]);

  // Switch to a different travel mode using the already-found location
  const switchMode = useCallback(async (mode) => {
    if (!lastParams.current) return;
    await _fetch({ ...lastParams.current, mode });
  }, [_fetch]);

  const reset = useCallback(() => {
    lastParams.current = null;
    setState({ status: "idle", data: null, error: null });
  }, []);

  return { ...state, fetchGrocery, switchMode, reset };
}
