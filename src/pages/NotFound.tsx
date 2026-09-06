import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";

const NotFound = () => {
  // A 404 render is a soft-404: keep it out of search indexes.
  useSeo({
    title: "Page Not Found — E2 Trails",
    description: "The page you're looking for doesn't exist. Return to E2 Trails and find your next adventure.",
    path: "/404",
    noindex: true,
  });

  return (
    <main className="min-h-screen bg-background grid place-items-center px-6">
      <div className="text-center max-w-md">
        <Compass className="w-12 h-12 text-accent/60 mx-auto mb-6" strokeWidth={1.5} aria-hidden="true" />
        <p className="kicker justify-center">Lost your way</p>
        <h1 className="font-display font-bold text-4xl md:text-5xl text-primary mt-3">
          This trail doesn't exist
        </h1>
        <p className="mt-4 text-muted-foreground">
          The page you're looking for was moved, renamed, or never on the map. Let's get you back on
          the trail.
        </p>
        <Link to="/" className="btn-accent mt-8">
          Return to homepage
        </Link>
      </div>
    </main>
  );
};

export default NotFound;