import { useEffect } from "react";
import Adventures from "./Adventures";

export default function UpcomingTreksPage() {
  useEffect(() => {
    document.title = "Outstation Treks — E2 Trails";
  }, []);
  return <Adventures initialMode="outstation" />;
}