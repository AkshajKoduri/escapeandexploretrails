import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { publicApi } from "@/lib/publicApi";
import founderAshok from "@/assets/founder-ashok.webp";

type TeamMember = {
  id: string;
  full_name: string;
  role_title: string | null;
  bio: string | null;
  photo_url: string | null;
  badges: { icon?: string; label: string }[];
  display_order: number;
  is_founder: boolean;
};

function TeamPhoto({ member }: { member: TeamMember }) {
  const [failed, setFailed] = useState(false);
  const photo = member.photo_url || (member.is_founder ? founderAshok : null);
  return (
    <div className="aspect-[4/3] overflow-hidden bg-charcoal-foreground/5">
      {photo && !failed ? (
        <img src={photo} alt={member.full_name} loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover object-top" />
      ) : (
        <div className="grid h-full place-items-center text-charcoal-foreground/40" aria-hidden="true"><UserRound className="h-16 w-16" /></div>
      )}
    </div>
  );
}

export default function About() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    publicApi<{ data: TeamMember[] }>("teamMembers", {})
      .then(({ data }) => {
        if (!cancelled) setTeam([...(data ?? [])].sort((a, b) => a.display_order - b.display_order));
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt]);

  return (
    <section id="story" className="relative scroll-mt-28 overflow-hidden bg-charcoal py-10 text-charcoal-foreground md:py-14" aria-labelledby="about-heading">
      <div className="container relative">
        <div className="space-y-6">
          <div>
            <h2 id="about-heading" className="editorial-title editorial-title-light">About E2 Trails</h2>
            <p className="mt-5 font-script text-2xl text-gold sm:text-3xl">Escape the routine. Explore beyond.</p>
          </div>
          <div className="grid gap-6 text-base leading-relaxed text-charcoal-foreground/85 md:grid-cols-2 md:gap-10">
            <div className="space-y-4">
            <p>E2 Trails is a Hyderabad-based adventure travel company creating unforgettable outdoor experiences across India.</p>
            <p>From Himalayan treks, monsoon trails and waterfall hikes to backpacking trips, camping experiences, solo-friendly group journeys and cycling adventures, we design trips for people who want to experience places beyond the usual tourist routes.</p>
            <p className="border-l-2 border-gold pl-5 font-medium text-charcoal-foreground">
              Ride through hidden roads.<br />
              Hike into the mountains.<br />
              Chase waterfalls.<br />
              Camp beneath open skies.<br />
              Backpack across India.
            </p>
            </div>
            <div className="space-y-4">
            <p>Closer to home, we bring Hyderabad’s adventure community together through cycling events, weekend hikes and local explorations.</p>
            <p>Whether you travel solo or with friends, E2 Trails is about discovering new landscapes, meeting new people and returning with stories worth remembering.</p>
            <p className="font-semibold text-gold">E2 Trails — Escape. Explore. Experience.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-charcoal-foreground/15 pt-8">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Meet the team</h2>
          {loading ? <p className="mt-6 text-charcoal-foreground/70" role="status">Loading our team…</p> : error ? (
            <div className="mt-6 text-charcoal-foreground/75">
              <p>Our team details could not be loaded.</p>
              <button type="button" className="btn-ghost-light mt-3" onClick={() => setAttempt((value) => value + 1)}>Try again</button>
            </div>
          ) : team.length === 0 ? <p className="mt-6 text-charcoal-foreground/70">Meet the people behind our adventures soon.</p> : (
            <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <article key={member.id} className="overflow-hidden rounded-xl border border-charcoal-foreground/15 bg-charcoal-foreground/5">
                  <TeamPhoto member={member} />
                  <div className="p-5 sm:p-6">
                    <h3 className="font-display text-2xl font-semibold">{member.full_name}</h3>
                    {member.role_title?.trim() && <p className="mt-1 text-sm text-gold">{member.role_title}</p>}
                    {member.bio?.trim() && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-charcoal-foreground/80">{member.bio.trim()}</p>}
                    {Array.isArray(member.badges) && member.badges.some((badge) => badge.label?.trim()) && (
                      <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${member.full_name} badges`}>
                        {member.badges.filter((badge) => badge.label?.trim()).map((badge, index) => (
                          <li key={`${badge.label}-${index}`} className="rounded-full border border-charcoal-foreground/20 px-3 py-1.5 text-xs">
                            {badge.icon && <span className="mr-1.5" aria-hidden="true">{badge.icon}</span>}{badge.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
