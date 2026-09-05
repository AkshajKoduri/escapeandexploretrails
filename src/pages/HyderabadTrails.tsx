import { useEffect } from "react";
import Adventures from "./Adventures";

export default function HyderabadTrailsPage() {
  useEffect(() => {
    document.title = "Hyderabad Trails — E2 Trails";
  }, []);
  return <Adventures initialMode="hyderabad" />;
}