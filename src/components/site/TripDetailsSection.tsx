import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasTripDetailsContent, type DetailListItem, type TripDetails } from "@/lib/tripDetails";

const formatInr = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function EditorialList({ items, markerClass }: { items: DetailListItem[]; markerClass?: string }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 text-sm leading-relaxed text-foreground/80">
          <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent", markerClass)} aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{item.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TripDetailsSection({ details }: { details: TripDetails }) {
  if (!hasTripDetailsContent(details)) return null;

  const hasInclusionsExclusions = details.inclusions.length > 0 || details.exclusions.length > 0;
  const hasGuidance = details.paymentPolicy.length > 0
    || details.thingsToCarry.length > 0;
  const hasCancellation = details.cancellationPolicy.length > 0 || details.cancellationNotes.length > 0;

  return (
    <section aria-label="Trip information">
      <div className="space-y-10">
        {hasInclusionsExclusions && (
          <section aria-labelledby="inclusions-exclusions-heading">
            <h3 id="inclusions-exclusions-heading" className="font-display text-xl font-bold text-foreground">
              Inclusions &amp; exclusions
            </h3>
            <div className={cn(
              "mt-4 grid overflow-hidden rounded-xl border border-border bg-card",
              details.inclusions.length > 0 && details.exclusions.length > 0 && "md:grid-cols-2 md:divide-x md:divide-border",
            )}>
              {details.inclusions.length > 0 && (
                <div className="bg-emerald-50/60 p-5 sm:p-6">
                  <h4 className="flex items-center gap-2 font-display text-lg font-bold text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                    Inclusions
                  </h4>
                  <EditorialList items={details.inclusions} markerClass="bg-emerald-700" />
                </div>
              )}
              {details.exclusions.length > 0 && (
                <div className={cn("bg-red-50/60 p-5 sm:p-6", details.inclusions.length > 0 && "border-t border-border md:border-t-0")}>
                  <h4 className="flex items-center gap-2 font-display text-lg font-bold text-red-900">
                    <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                    Exclusions
                  </h4>
                  <EditorialList items={details.exclusions} markerClass="bg-red-700" />
                </div>
              )}
            </div>
          </section>
        )}

        {details.packages.length > 0 && (
          <section aria-labelledby="trip-packages-heading">
            <h3 id="trip-packages-heading" className="font-display text-xl font-bold text-foreground">Trip packages</h3>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {details.packages.map((item) => (
                <article key={item.id} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
                  <div className="min-w-0">
                    {item.name && <h4 className="font-display text-lg font-bold text-primary [overflow-wrap:anywhere]">{item.name}</h4>}
                    {item.details && <p className="mt-1 max-w-2xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{item.details}</p>}
                  </div>
                  {(item.price || item.priceAmount != null) && (
                    <p className="self-start font-display text-base font-bold text-accent sm:text-right [overflow-wrap:anywhere]">
                      {item.price || `${formatInr(item.priceAmount!)} ${item.priceBasis === "per_booking" ? "per booking" : "per participant"}`}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {hasGuidance && (
          <div className="grid gap-8 md:grid-cols-2 md:gap-10">
            {details.paymentPolicy.length > 0 && (
              <section aria-labelledby="payment-policy-heading" className="border-t border-primary/20 pt-5">
                <h3 id="payment-policy-heading" className="font-display text-xl font-bold text-foreground">Payment policy</h3>
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                  <table className="w-full table-fixed border-collapse text-left text-sm">
                    <caption className="sr-only">Payment stages and the corresponding payment terms</caption>
                    <colgroup><col className="w-[36%] sm:w-[38%]" /><col /></colgroup>
                    <thead className="bg-primary text-primary-foreground"><tr><th scope="col" className="px-3 py-3 font-semibold sm:px-5">Payment stage</th><th scope="col" className="px-3 py-3 font-semibold sm:px-5">Payment terms</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {details.paymentPolicy.map((item, index) => (
                        <tr key={item.id}>
                          <th scope="row" className="px-3 py-4 align-top font-semibold leading-relaxed text-foreground [overflow-wrap:anywhere] sm:px-5">{item.title || `Payment term ${index + 1}`}</th>
                          <td className="px-3 py-4 align-top leading-relaxed text-foreground/80 [overflow-wrap:anywhere] sm:px-5">{item.terms}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {details.thingsToCarry.length > 0 && (
              <section aria-labelledby="things-to-carry-heading" className="border-t border-primary/20 pt-5">
                <h3 id="things-to-carry-heading" className="font-display text-xl font-bold text-foreground">Things to carry</h3>
                <EditorialList items={details.thingsToCarry} />
              </section>
            )}
          </div>
        )}

        {hasCancellation && (
          <section aria-labelledby="cancellation-policy-heading">
            <h3 id="cancellation-policy-heading" className="font-display text-xl font-bold text-foreground">
              Cancellation and refund policy
            </h3>
            {details.cancellationPolicy.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">Cancellation windows and the corresponding cancellation charges</caption>
                  <colgroup>
                    <col className="w-[42%] sm:w-[38%]" />
                    <col />
                  </colgroup>
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-5">Cancellation window</th>
                      <th scope="col" className="px-3 py-3 font-semibold sm:px-5">Cancellation charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {details.cancellationPolicy.map((row) => {
                      const charge = row.charge.toLowerCase();
                      const positive = charge.includes("free cancellation");
                      const noRefund = charge.includes("no refund") || charge.includes("100%");
                      return (
                        <tr key={row.id}>
                          <th scope="row" className="px-3 py-4 align-top font-semibold leading-relaxed text-foreground [overflow-wrap:anywhere] sm:px-5">
                            {row.window}
                          </th>
                          <td className={cn(
                            "px-3 py-4 align-top leading-relaxed text-foreground/80 [overflow-wrap:anywhere] sm:px-5",
                            positive && "font-semibold text-emerald-800",
                            noRefund && "font-semibold text-red-800",
                          )}>
                            {row.charge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {details.cancellationNotes && (
              <div className={cn(
                "max-w-3xl border-l-2 border-accent pl-4",
                details.cancellationPolicy.length > 0 && "mt-5",
              )}>
                <h4 className="text-sm font-semibold text-foreground">Additional details</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                  {details.cancellationNotes}
                </p>
              </div>
            )}
          </section>
        )}

        {details.thingsToKeepInMind.length > 0 && (
          <section aria-labelledby="things-to-keep-in-mind-heading" className="border-t border-primary/20 pt-5">
            <h3 id="things-to-keep-in-mind-heading" className="font-display text-xl font-bold text-foreground">Things to keep in mind</h3>
            <div className="mt-5 space-y-6">
              {details.thingsToKeepInMind.map((section, index) => (
                <section key={section.id} aria-labelledby={section.heading ? `keep-in-mind-${section.id}` : undefined}>
                  {section.heading && <h4 id={`keep-in-mind-${section.id}`} className="font-display text-base font-bold uppercase tracking-[0.08em] text-primary [overflow-wrap:anywhere]">{section.heading}</h4>}
                  {section.instructions.length > 1 ? (
                    <ol className={cn("list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground/80", section.heading && "mt-3")}>
                      {section.instructions.map((instruction) => <li key={instruction.id} className="pl-1 [overflow-wrap:anywhere]">{instruction.text}</li>)}
                    </ol>
                  ) : section.instructions[0] ? (
                    <p className={cn("max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-foreground/80 [overflow-wrap:anywhere]", section.heading && "mt-3")}>{section.instructions[0].text}</p>
                  ) : null}
                </section>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
