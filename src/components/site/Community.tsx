export default function Community() {
  return (
    <section className="py-24 md:py-32 bg-muted/40">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center reveal">
          <span className="font-script text-accent text-xl">— More than trips</span>
          <h2 className="font-heading font-extrabold text-3xl md:text-5xl mt-2 text-primary">
            Join the Tribe
          </h2>
          <p className="mt-6 text-muted-foreground text-base md:text-lg leading-relaxed">
            E2 Trails is more than an adventure company — it's a growing community of people who share a love for the outdoors, new experiences and genuine human connections. Every trail we walk together adds another story to our journey.
          </p>
          <a
            href="https://wa.me/916303682022"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground font-semibold hover:bg-gold transition-colors"
          >
            Chat with Us on WhatsApp
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            For personal enquiries &amp; queries
          </p>
        </div>
      </div>
    </section>
  );
}
