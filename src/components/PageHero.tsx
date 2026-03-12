
export function PageHero({ title, subtitle, compact = false }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <section className={`page-hero ${compact ? "py-10 md:py-12" : ""}`}>
      <div className="container-shell">
        <h1 className={`${compact ? "text-2xl md:text-3xl" : "text-4xl md:text-5xl"} font-bold`}>{title}</h1>
        {subtitle ? <p className="mt-4 max-w-3xl text-lg text-white/75">{subtitle}</p> : null}
      </div>
    </section>
  );
}
