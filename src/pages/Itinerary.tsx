import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import ItineraryActions from "@/components/site/ItineraryActions";
import ItineraryPdf from "@/components/site/ItineraryPdf";
import { hasItineraryPdf } from "@/lib/itinerarySharing";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import TripDetailsSection from "@/components/site/TripDetailsSection";
import type { Json } from "@/integrations/supabase/types";
import { hasTripDetailsContent, normalizeTripDetails } from "@/lib/tripDetails";
import { useSeo } from "@/hooks/useSeo";

type Day = { title: string; description: string };

type TrekRow = {
  id: string;
  name: string;
  image_url: string | null;
  itinerary_days: Day[] | null;
  itinerary_file_path: string | null;
  itinerary_url: string | null;
  instructions: string | null;
  trip_details: Json | null;
};

export default function Itinerary() {
  const { trekId } = useParams<{ trekId: string }>();
  const [trek, setTrek] = useState<TrekRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [searchParams] = useSearchParams();
  const [showPdf, setShowPdf] = useState(searchParams.get("view") === "pdf");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    (async () => {
      if (!trekId) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("upcoming_treks")
        .select("id,name,image_url,itinerary_days,itinerary_file_path,itinerary_url,instructions,trip_details")
        .eq("id", trekId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setLoadFailed(true);
        setLoading(false);
        return;
      }
      // upcoming_treks rows are typed (itinerary_days is Json in the DB
      // schema); normalize to the page's Day[]-based shape here.
      setTrek(data as unknown as TrekRow);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [trekId, retryKey]);



  useSeo({
    title: trek?.name ? `${trek.name} — Itinerary | E2 Trails` : "Trip Itinerary | E2 Trails",
    description: trek?.name
      ? `Day-wise itinerary for the ${trek.name} trip with E2 Trails — plan, schedule and what to expect on the trail.`
      : "Day-wise itineraries for E2 Trails trips — plan, schedule and what to expect on the trail.",
    path: `/itinerary/${trekId ?? ""}`,
    noindex: !loading && !trek,
  });

  const days: Day[] = Array.isArray(trek?.itinerary_days) ? (trek!.itinerary_days as Day[]) : [];
  const hasDays = days.length > 0;
  const source = { id: trek?.id ?? "", name: trek?.name ?? "Itinerary", itineraryFilePath: trek?.itinerary_file_path, itineraryUrl: trek?.itinerary_url };
  const hasPdf = hasItineraryPdf(source);
  const tripDetails = useMemo(
    () => normalizeTripDetails(trek?.trip_details, trek?.instructions),
    [trek?.trip_details, trek?.instructions],
  );
  const hasTripDetails = hasTripDetailsContent(tripDetails);



  const showPdfInline = (!hasDays && hasPdf) || (hasDays && showPdf && hasPdf);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-charcoal text-charcoal-foreground shadow-card">
        <div className="container flex items-center justify-between gap-3 py-3">
          <Link
            to="/adventures"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-charcoal-foreground/10 hover:bg-charcoal-foreground/20 text-sm font-semibold text-charcoal-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
          </Link>
          <h1 className="font-display font-bold text-base sm:text-lg text-charcoal-foreground truncate">
            {trek?.name ?? "Itinerary"}
          </h1>

        </div>
      </header>


      <main id="main-content" tabIndex={-1} className="container py-8 max-w-4xl outline-none">
        {loading ? (
          <p className="text-muted-foreground text-center py-16">Loading itinerary…</p>
        ) : loadFailed ? (
          <div className="py-16 text-center" role="alert">
            <p className="font-display text-xl font-semibold text-primary">The itinerary couldn’t load.</p>
            <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="btn-outline mt-5">Try again</button>
          </div>
        ) : !trek ? (
          <p className="text-muted-foreground text-center py-16">Trip not found.</p>
        ) : !hasDays && !hasPdf && !hasTripDetails ? (
          <p className="text-muted-foreground text-center py-16">Itinerary coming soon.</p>
        ) : (
          <>
            <div className="mb-6">
              <span className="font-script text-accent text-lg">— Trip itinerary</span>
              <h2 className="font-heading font-extrabold text-2xl md:text-4xl text-primary mt-1">
                {trek.name}
              </h2>
            </div>

            <div className="mb-6"><ItineraryActions key={source.id} source={source} showView={false} /></div>

            {hasDays && !showPdf && (
              <>
                <Accordion type="single" collapsible className="w-full rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {days.map((d, i) => (
                    <AccordionItem key={i} value={`day-${i}`} className="border-b-0 px-4 sm:px-6">
                      <AccordionTrigger className="min-h-[44px] py-4 font-heading font-bold text-primary text-left hover:no-underline">
                        <span className="pr-3">{d.title || `Day ${i + 1}`}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {d.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {hasPdf && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setShowPdf(true)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" /> View as PDF
                    </button>
                  </div>
                )}
              </>
            )}

            {showPdfInline && (
              <div className="space-y-3">
                {hasDays && (
                  <button
                    type="button"
                    onClick={() => setShowPdf(false)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to day-wise view
                  </button>
                )}
                <ItineraryPdf source={source} />
              </div>
            )}

            {hasTripDetails && (
              <div className="mt-12 border-t border-border pt-10">
                <TripDetailsSection details={tripDetails} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
