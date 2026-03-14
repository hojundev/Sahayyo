import { useState } from "react";
import "./index.css";
import Dashboard        from "./components/Dashboard";
import VenuePicker, { FOOD_VENUES, HEALTH_VENUES } from "./components/VenuePicker";
import RecommendScreen  from "./components/RecommendScreen";
import StepFlow         from "./components/StepFlow";
import StatusScreen     from "./components/StatusScreen";
import { useGrocery }   from "./hooks/useGrocery";

export default function App() {
  const { status, data, error, fetchGrocery, switchMode, reset } = useGrocery();
  const [screen, setScreen]   = useState("home"); // home | venue | stepping
  const [venueList, setVenueList] = useState(FOOD_VENUES);
  const [accentColor, setAccentColor] = useState("#FF8C42");

  const handleReset = () => { reset(); setScreen("home"); };
  const handleBackToVenue = () => { reset(); setScreen("venue"); };

  const openVenuePicker = ({ venues, color }) => {
    setVenueList(venues);
    setAccentColor(color);
    setScreen("venue");
  };

  if (status === "locating" || status === "loading" || status === "error")
    return <StatusScreen status={status} error={error} onRetry={() => setScreen("venue")} onBack={handleBackToVenue} />;

  if (status === "ready" && data && screen !== "stepping")
    return (
      <RecommendScreen
        data={data}
        onConfirm={() => setScreen("stepping")}
        onBack={handleBackToVenue}
        onSwitchMode={switchMode}
        switching={false}
      />
    );

  if (status === "loading" && data && screen !== "stepping")
    return (
      <RecommendScreen
        data={data}
        onConfirm={() => {}}
        onBack={handleBackToVenue}
        onSwitchMode={() => {}}
        switching={true}
      />
    );

  if (status === "ready" && data && screen === "stepping")
    return <StepFlow data={data} onReset={handleReset} />;

  if (screen === "venue")
    return (
      <VenuePicker
        venues={venueList}
        title={accentColor === "#3B82F6" ? "কোথায় যাবেন?" : "কী খুঁজছেন?"}
        titleEn={accentColor === "#3B82F6" ? "Where do you need to go?" : "What are you looking for?"}
        accentColor={accentColor}
        onSelect={placeType => fetchGrocery({ placeType })}
        onBack={() => setScreen("home")}
      />
    );

  return (
    <Dashboard
      onFood={() => openVenuePicker({ venues: FOOD_VENUES, color: "#FF8C42" })}
      onDoctor={() => openVenuePicker({ venues: HEALTH_VENUES, color: "#3B82F6" })}
    />
  );
}
