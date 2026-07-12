import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Share2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type Day = { title: string; description: string };

type TrekRow = {
  id: string;
  name: string;
  image_url: string | null;
  itinerary_days: Day[] | null;
  itinerary_file_path: string | null;
  itinerary_url: string | null;
};

export default function Itinerary() {
  const { trekId } = useParams<{ trekId: string }>();
  const [trek, setTrek] = useState<TrekRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!trekId) return;
      const { data } = await supabase
        .from("upcoming_treks")
        .select("id,name,image_url,itinerary_days,itinerary_file_path,itinerary_url")
        .eq("id", trekId)
        .maybeSingle();
      if (cancelled) return;
      setTrek(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [trekId]);

  useEffect(() => {
    let cancelled = false;
    if (!trek?.itinerary_file_path || !trek.id) return;
    supabase.functions
      .invoke("itinerary-signed-url", { body: { trekId: trek.id } })
      .then(({ data }) => { if (!cancelled) setPdfUrl((data as any)?.url ?? null); })
      .catch(() => { if (!cancelled) setPdfUrl(null); });
    return () => { cancelled = true; };
  }, [trek?.id, trek?.itinerary_file_path]);

  const days: Day[] = Array.isArray(trek?.itinerary_days) ? (trek!.itinerary_days as Day[]) : [];
  const hasDays = days.length > 0;
  const hasPdf = !!trek?.itinerary_file_path || !!trek?.itinerary_url;
  const pdfHref = trek?.itinerary_url || pdfUrl;

  const share = async () => {
    const url = window.location.href;
    const title = trek?.name ? `${trek.name} — Itinerary` : "Trip Itinerary";
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch { /* user cancelled */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const showPdfInline = (!hasDays && hasPdf) || (hasDays && showPdf && hasPdf);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-card">
        <div className="container flex items-center justify-between gap-3 py-3">
          <Link
            to="/#treks"
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-sm font-semibold text-primary-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="font-heading font-bold text-base sm:text-lg text-primary-foreground truncate">
            {trek?.name ?? "Itinerary"}
          </h1>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-gold transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </header>


      <main className="container py-8 max-w-4xl">
        {loading ? (
          <p className="text-muted-foreground text-center py-16">Loading itinerary…</p>
        ) : !trek ? (
          <p className="text-muted-foreground text-center py-16">Trip not found.</p>
        ) : !hasDays && !hasPdf ? (
          <p className="text-muted-foreground text-center py-16">Itinerary coming soon.</p>
        ) : (
          <>
            <div className="mb-6">
              <span className="font-script text-accent text-lg">— Trip itinerary</span>
              <h2 className="font-heading font-extrabold text-2xl md:text-4xl text-primary mt-1">
                {trek.name}
              </h2>
            </div>

            {hasDays && !showPdf && (
              <>
                <Accordion type="single" collapsible className="w-full rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
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
                      <FileText className="w-4 h-4" /> View as PDF
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
                    <ArrowLeft className="w-4 h-4" /> Back to day-wise view
                  </button>
                )}
                {pdfHref ? (
                  <>
                    <div className="w-full rounded-2xl overflow-hidden border border-border bg-muted">
                      <object data={`${pdfHref}#view=FitH`} type="application/pdf" className="w-full h-[80vh]">
                        <iframe
                          src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfHref)}&embedded=true`}
                          className="w-full h-[80vh]"
                          title="Itinerary PDF"
                        />
                      </object>
                    </div>
                    <a
                      href={pdfHref}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Loading PDF…</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
