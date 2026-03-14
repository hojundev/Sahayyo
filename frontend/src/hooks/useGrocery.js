import { useState, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export function useGrocery() {
  const [state, setState] = useState({
    status: "idle",
    data:   null,
    error:  null,
  });

  const lastParams  = useRef(null);
  const cancelToken = useRef(0); // increment to cancel any in-flight fetch

  const _fetch = useCallback(async ({ lat, lng, placeType, mode, token }) => {
    setState(s => ({ ...s, status: "loading" }));
    try {
      const url = `${API}/api/find-place?lat=${lat}&lng=${lng}&type=${placeType}${mode ? `&mode=${mode}` : ""}`;
      const res  = await fetch(url);
      if (cancelToken.current !== token) return; // cancelled
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (cancelToken.current !== token) return; // cancelled
      setState({ status: "ready", data, error: null });
    } catch (err) {
      if (cancelToken.current !== token) return;
      setState({ status: "error", data: null, error: err.message });
    }
  }, []);

  const fetchGrocery = useCallback(async ({ placeType = "grocery_or_supermarket" } = {}) => {
    const token = ++cancelToken.current;
    setState({ status: "locating", data: null, error: null });

    let lat, lng;
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      if (cancelToken.current !== token) return; // cancelled while locating
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (err) {
      if (cancelToken.current !== token) return;
      const msg = err?.code === 1
        ? "Location access denied. Please allow location permission and try again."
        : "Could not get your location. Please try again.";
      setState({ status: "error", data: null, error: msg });
      return;
    }

    lastParams.current = { lat, lng, placeType };
    await _fetch({ lat, lng, placeType, token });
  }, [_fetch]);

  const switchMode = useCallback(async (mode) => {
    if (!lastParams.current) return;
    const token = ++cancelToken.current;
    await _fetch({ ...lastParams.current, mode, token });
  }, [_fetch]);

  const reset = useCallback(() => {
    cancelToken.current++; // cancel any in-flight request
    lastParams.current = null;
    setState({ status: "idle", data: null, error: null });
  }, []);

  return { ...state, fetchGrocery, switchMode, reset };
}
