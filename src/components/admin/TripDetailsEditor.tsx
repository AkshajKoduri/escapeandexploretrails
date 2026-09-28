import { useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  createTripDetailId,
  type CancellationPolicyRow,
  type DetailListItem,
  type KeepInMindSection,
  type PaymentPolicyRow,
  type TripDetails,
  type TripPackage,
} from "@/lib/tripDetails";

const inputClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-accent";

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function RowActions({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={index === 0}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={`Move ${label} up`}
        title={`Move ${label} up`}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={index === count - 1}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35"
        aria-label={`Move ${label} down`}
        title={`Move ${label} down`}
      >
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Remove ${label}`}
        title={`Remove ${label}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function StringListEditor({
  idPrefix,
  legend,
  description,
  items,
  placeholder,
  addLabel,
  onChange,
  onAnnounce,
}: {
  idPrefix: string;
  legend: string;
  description: string;
  items: DetailListItem[];
  placeholder: string;
  addLabel: string;
  onChange: (items: DetailListItem[]) => void;
  onAnnounce: (message: string) => void;
}) {
  const descriptionId = `${idPrefix}-description`;

  return (
    <fieldset className="rounded-xl border border-border bg-muted/15 p-4" aria-describedby={descriptionId}>
      <legend className="px-1 font-display text-lg font-bold text-primary">{legend}</legend>
      <p id={descriptionId} className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => {
          const inputId = `${idPrefix}-${item.id}`;
          return (
            <div key={item.id} className="rounded-lg border border-border bg-background p-3">
              <label htmlFor={inputId} className="block text-xs font-semibold text-muted-foreground">
                {legend} item {index + 1}
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-start">
                <input
                  id={inputId}
                  value={item.text}
                  onChange={(event) => onChange(items.map((current) => current.id === item.id
                    ? { ...current, text: event.target.value }
                    : current))}
                  className={inputClass}
                  placeholder={placeholder}
                  maxLength={2000}
                />
                <RowActions
                  index={index}
                  count={items.length}
                  label={`${legend} item ${index + 1}`}
                  onMove={(direction) => {
                    onChange(moveItem(items, index, direction));
                    onAnnounce(`${legend} item moved ${direction < 0 ? "up" : "down"}.`);
                  }}
                  onRemove={() => {
                    onChange(items.filter((current) => current.id !== item.id));
                    onAnnounce(`${legend} item removed.`);
                  }}
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => {
            onChange([...items, { id: createTripDetailId(idPrefix), text: "" }]);
            onAnnounce(`${legend} item added.`);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </button>
      </div>
    </fieldset>
  );
}

function PackageEditor({
  idPrefix,
  packages,
  onChange,
  onAnnounce,
}: {
  idPrefix: string;
  packages: TripPackage[];
  onChange: (packages: TripPackage[]) => void;
  onAnnounce: (message: string) => void;
}) {
  const update = (id: string, patch: Partial<TripPackage>) => {
    onChange(packages.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  return (
    <fieldset className="rounded-xl border border-border bg-muted/15 p-4">
      <legend className="px-1 font-display text-lg font-bold text-primary">Trip packages</legend>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Add only real package options. The numeric amount and price basis are used for the booking total; the optional label preserves legacy public wording.
      </p>
      <div className="mt-4 space-y-3">
        {packages.map((item, index) => (
          <div key={item.id} className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor={`${idPrefix}-${item.id}-name`} className="block text-xs font-semibold text-muted-foreground">
                    Package {index + 1} name
                  </label>
                  <input id={`${idPrefix}-${item.id}-name`} className={`${inputClass} mt-1.5`} value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} placeholder="Standard package" maxLength={200} />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-${item.id}-amount`} className="block text-xs font-semibold text-muted-foreground">
                    Amount (INR)
                  </label>
                  <input id={`${idPrefix}-${item.id}-amount`} type="number" inputMode="decimal" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={item.priceAmount ?? ""} onChange={(event) => update(item.id, { priceAmount: event.target.value === "" ? null : Number(event.target.value) })} placeholder="4500" />
                </div>
                <div>
                  <label htmlFor={`${idPrefix}-${item.id}-basis`} className="block text-xs font-semibold text-muted-foreground">
                    Price basis
                  </label>
                  <select id={`${idPrefix}-${item.id}-basis`} className={`${inputClass} mt-1.5`} value={item.priceBasis} onChange={(event) => update(item.id, { priceBasis: event.target.value as TripPackage["priceBasis"] })}>
                    <option value="per_person">Per participant</option>
                    <option value="per_booking">Per booking</option>
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor={`${idPrefix}-${item.id}-price`} className="block text-xs font-semibold text-muted-foreground">
                    Public price label <span className="font-normal">(optional)</span>
                  </label>
                  <input id={`${idPrefix}-${item.id}-price`} className={`${inputClass} mt-1.5`} value={item.price} onChange={(event) => update(item.id, { price: event.target.value })} placeholder="₹4,500 per person" maxLength={120} />
                </div>
              </div>
              <div>
                <label htmlFor={`${idPrefix}-${item.id}-details`} className="block text-xs font-semibold text-muted-foreground">
                  Package details
                </label>
                <textarea id={`${idPrefix}-${item.id}-details`} rows={2} className={`${inputClass} mt-1.5`} value={item.details} onChange={(event) => update(item.id, { details: event.target.value })} placeholder="What this package covers" maxLength={2000} />
              </div>
              <RowActions
                index={index}
                count={packages.length}
                label={`package ${index + 1}`}
                onMove={(direction) => {
                  onChange(moveItem(packages, index, direction));
                  onAnnounce(`Package moved ${direction < 0 ? "up" : "down"}.`);
                }}
                onRemove={() => {
                  onChange(packages.filter((current) => current.id !== item.id));
                  onAnnounce("Package removed.");
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange([...packages, { id: createTripDetailId("package"), name: "", price: "", priceAmount: null, priceBasis: "per_person", currency: "INR", details: "" }]);
            onAnnounce("Package added.");
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add package
        </button>
      </div>
    </fieldset>
  );
}

function PaymentPolicyEditor({
  idPrefix,
  rows,
  onChange,
  onAnnounce,
}: {
  idPrefix: string;
  rows: PaymentPolicyRow[];
  onChange: (rows: PaymentPolicyRow[]) => void;
  onAnnounce: (message: string) => void;
}) {
  const update = (id: string, patch: Partial<PaymentPolicyRow>) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };
  return (
    <fieldset className="rounded-xl border border-border bg-muted/15 p-4">
      <legend className="px-1 font-display text-lg font-bold text-primary">Payment policy</legend>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add a payment stage and its confirmed terms. This does not enable online payment.</p>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-lg border border-border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${idPrefix}-${row.id}-title`} className="block text-xs font-semibold text-muted-foreground">Row {index + 1}: payment stage</label>
                <input id={`${idPrefix}-${row.id}-title`} className={`${inputClass} mt-1.5`} value={row.title} onChange={(event) => update(row.id, { title: event.target.value })} placeholder="Booking confirmation" maxLength={200} />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-${row.id}-terms`} className="block text-xs font-semibold text-muted-foreground">Row {index + 1}: payment terms</label>
                <textarea id={`${idPrefix}-${row.id}-terms`} rows={2} className={`${inputClass} mt-1.5`} value={row.terms} onChange={(event) => update(row.id, { terms: event.target.value })} placeholder="Enter confirmed terms" maxLength={2000} />
              </div>
            </div>
            <div className="mt-2"><RowActions index={index} count={rows.length} label={`payment row ${index + 1}`} onMove={(direction) => { onChange(moveItem(rows, index, direction)); onAnnounce(`Payment row moved ${direction < 0 ? "up" : "down"}.`); }} onRemove={() => { onChange(rows.filter((current) => current.id !== row.id)); onAnnounce("Payment row removed."); }} /></div>
          </div>
        ))}
        <button type="button" onClick={() => { onChange([...rows, { id: createTripDetailId("payment"), title: "", terms: "" }]); onAnnounce("Payment row added."); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <Plus className="h-4 w-4" aria-hidden="true" /> Add payment row
        </button>
      </div>
    </fieldset>
  );
}

function KeepInMindEditor({
  idPrefix,
  sections,
  onChange,
  onAnnounce,
}: {
  idPrefix: string;
  sections: KeepInMindSection[];
  onChange: (sections: KeepInMindSection[]) => void;
  onAnnounce: (message: string) => void;
}) {
  const updateSection = (id: string, patch: Partial<KeepInMindSection>) => onChange(sections.map((section) => section.id === id ? { ...section, ...patch } : section));
  return (
    <fieldset className="rounded-xl border border-border bg-muted/15 p-4">
      <legend className="px-1 font-display text-lg font-bold text-primary">Things to keep in mind</legend>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Group trek-specific instructions under clear subsection headings.</p>
      <div className="mt-4 space-y-4">
        {sections.map((section, sectionIndex) => (
          <div key={section.id} className="rounded-lg border border-border bg-background p-3">
            <label htmlFor={`${idPrefix}-${section.id}-heading`} className="block text-xs font-semibold text-muted-foreground">Subsection {sectionIndex + 1} heading</label>
            <input id={`${idPrefix}-${section.id}-heading`} className={`${inputClass} mt-1.5`} value={section.heading} onChange={(event) => updateSection(section.id, { heading: event.target.value })} placeholder="Train tickets" maxLength={200} />
            <div className="mt-3 space-y-2">
              {section.instructions.map((instruction, instructionIndex) => (
                <div key={instruction.id} className="rounded-lg bg-muted/40 p-3">
                  <label htmlFor={`${idPrefix}-${section.id}-${instruction.id}`} className="block text-xs font-semibold text-muted-foreground">Subsection {sectionIndex + 1} instruction {instructionIndex + 1}</label>
                  <textarea id={`${idPrefix}-${section.id}-${instruction.id}`} rows={2} className={`${inputClass} mt-1.5`} value={instruction.text} onChange={(event) => updateSection(section.id, { instructions: section.instructions.map((current) => current.id === instruction.id ? { ...current, text: event.target.value } : current) })} maxLength={2000} />
                  <div className="mt-2"><RowActions index={instructionIndex} count={section.instructions.length} label={`subsection ${sectionIndex + 1} instruction ${instructionIndex + 1}`} onMove={(direction) => updateSection(section.id, { instructions: moveItem(section.instructions, instructionIndex, direction) })} onRemove={() => updateSection(section.id, { instructions: section.instructions.filter((current) => current.id !== instruction.id) })} /></div>
                </div>
              ))}
              <button type="button" onClick={() => updateSection(section.id, { instructions: [...section.instructions, { id: createTripDetailId("instruction"), text: "" }] })} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus className="h-4 w-4" aria-hidden="true" /> Add instruction</button>
            </div>
            <div className="mt-3"><RowActions index={sectionIndex} count={sections.length} label={`subsection ${sectionIndex + 1}`} onMove={(direction) => { onChange(moveItem(sections, sectionIndex, direction)); onAnnounce(`Subsection moved ${direction < 0 ? "up" : "down"}.`); }} onRemove={() => { onChange(sections.filter((current) => current.id !== section.id)); onAnnounce("Subsection removed."); }} /></div>
          </div>
        ))}
        <button type="button" onClick={() => { onChange([...sections, { id: createTripDetailId("keep-in-mind"), heading: "", instructions: [{ id: createTripDetailId("instruction"), text: "" }] }]); onAnnounce("Subsection added."); }} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Plus className="h-4 w-4" aria-hidden="true" /> Add subsection</button>
      </div>
    </fieldset>
  );
}

function CancellationEditor({
  idPrefix,
  rows,
  notes,
  onChange,
  onNotesChange,
  onAnnounce,
}: {
  idPrefix: string;
  rows: CancellationPolicyRow[];
  notes: string;
  onChange: (rows: CancellationPolicyRow[]) => void;
  onNotesChange: (notes: string) => void;
  onAnnounce: (message: string) => void;
}) {
  const update = (id: string, patch: Partial<CancellationPolicyRow>) => {
    onChange(rows.map((row) => row.id === id ? { ...row, ...patch } : row));
  };

  return (
    <fieldset className="rounded-xl border border-border bg-muted/15 p-4">
      <legend className="px-1 font-display text-lg font-bold text-primary">Cancellation and refund policy</legend>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        These rows appear as a two-column table on the public trip page. The approved standard policy is prefilled for new treks.
      </p>
      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-lg border border-border bg-background p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${idPrefix}-${row.id}-window`} className="block text-xs font-semibold text-muted-foreground">
                  Row {index + 1}: cancellation window
                </label>
                <input id={`${idPrefix}-${row.id}-window`} className={`${inputClass} mt-1.5`} value={row.window} onChange={(event) => update(row.id, { window: event.target.value })} maxLength={200} />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-${row.id}-charge`} className="block text-xs font-semibold text-muted-foreground">
                  Row {index + 1}: cancellation charge
                </label>
                <input id={`${idPrefix}-${row.id}-charge`} className={`${inputClass} mt-1.5`} value={row.charge} onChange={(event) => update(row.id, { charge: event.target.value })} maxLength={500} />
              </div>
            </div>
            <div className="mt-2">
              <RowActions
                index={index}
                count={rows.length}
                label={`cancellation row ${index + 1}`}
                onMove={(direction) => {
                  onChange(moveItem(rows, index, direction));
                  onAnnounce(`Cancellation row moved ${direction < 0 ? "up" : "down"}.`);
                }}
                onRemove={() => {
                  onChange(rows.filter((current) => current.id !== row.id));
                  onAnnounce("Cancellation row removed.");
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            onChange([...rows, { id: createTripDetailId("cancellation"), window: "", charge: "" }]);
            onAnnounce("Cancellation row added.");
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add policy row
        </button>
        <div className="pt-2">
          <label htmlFor={`${idPrefix}-notes`} className="block text-xs font-semibold text-muted-foreground">
            Additional cancellation and refund details
          </label>
          <p id={`${idPrefix}-notes-help`} className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Optional trek-specific conditions shown directly below the policy table.
          </p>
          <textarea
            id={`${idPrefix}-notes`}
            aria-describedby={`${idPrefix}-notes-help`}
            rows={4}
            className={`${inputClass} mt-2`}
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="Add only confirmed trek-specific cancellation or refund details"
            maxLength={5000}
          />
        </div>
      </div>
    </fieldset>
  );
}

export default function TripDetailsEditor({
  value,
  onChange,
}: {
  value: TripDetails;
  onChange: (value: TripDetails) => void;
}) {
  const baseId = useId().replace(/:/g, "");
  const [announcement, setAnnouncement] = useState("");
  const setField = <K extends keyof TripDetails>(key: K, next: TripDetails[K]) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="md:col-span-2 space-y-4" aria-labelledby={`${baseId}-heading`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Trip details and policies</p>
        <h2 id={`${baseId}-heading`} className="mt-1 font-display text-xl font-bold text-primary">What guests need to know</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Leave optional sections empty to hide them from the public trip page. Use the arrow buttons to control display order within each section.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StringListEditor idPrefix={`${baseId}-inclusion`} legend="Inclusions" description="Services or items included in the listed trip price." items={value.inclusions} placeholder="Guide support" addLabel="Add inclusion" onChange={(items) => setField("inclusions", items)} onAnnounce={setAnnouncement} />
        <StringListEditor idPrefix={`${baseId}-exclusion`} legend="Exclusions" description="Costs or items guests need to arrange separately." items={value.exclusions} placeholder="Personal expenses" addLabel="Add exclusion" onChange={(items) => setField("exclusions", items)} onAnnounce={setAnnouncement} />
      </div>

      <PackageEditor idPrefix={`${baseId}-package`} packages={value.packages} onChange={(packages) => setField("packages", packages)} onAnnounce={setAnnouncement} />

      <PaymentPolicyEditor idPrefix={`${baseId}-payment`} rows={value.paymentPolicy} onChange={(rows) => setField("paymentPolicy", rows)} onAnnounce={setAnnouncement} />

      <StringListEditor idPrefix={`${baseId}-carry`} legend="Things to carry" description="Add practical items guests should bring for this trek." items={value.thingsToCarry} placeholder="Two litres of water" addLabel="Add item to carry" onChange={(items) => setField("thingsToCarry", items)} onAnnounce={setAnnouncement} />

      <CancellationEditor idPrefix={`${baseId}-cancellation`} rows={value.cancellationPolicy} notes={value.cancellationNotes} onChange={(rows) => setField("cancellationPolicy", rows)} onNotesChange={(notes) => setField("cancellationNotes", notes)} onAnnounce={setAnnouncement} />

      <KeepInMindEditor idPrefix={`${baseId}-keep-in-mind`} sections={value.thingsToKeepInMind} onChange={(sections) => setField("thingsToKeepInMind", sections)} onAnnounce={setAnnouncement} />

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </section>
  );
}
