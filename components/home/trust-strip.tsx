export function TrustStrip() {
    const metrics = [
        {
            value: "99%",
            label: "calls answered",
            sub: "Every customer gets a response, even while you're on the tools",
        },
        {
            value: "~60%",
            label: "more jobs booked",
            sub: "Average increase in booked jobs in the first month",
        },
        {
            value: "~3 hrs",
            label: "admin saved daily",
            sub: "Time reclaimed from calls, follow-ups, and manual entry",
        },
    ];

    return (
        <section className="bg-cream border-y border-[var(--color-hair)] px-6 py-10 md:py-14">
            <div className="container mx-auto max-w-5xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-0 sm:divide-x sm:divide-[var(--color-hair)]">
                    {metrics.map((m) => (
                        <div key={m.label} className="flex flex-col items-center text-center sm:px-10 gap-1">
                            <div
                                className="text-4xl md:text-5xl font-extrabold tracking-[-0.04em] leading-none"
                                style={{ color: "var(--color-ink)" }}
                            >
                                {m.value}
                            </div>
                            <div
                                className="text-sm font-semibold uppercase tracking-wide mt-1"
                                style={{ color: "var(--color-forest)" }}
                            >
                                {m.label}
                            </div>
                            <p
                                className="text-xs leading-relaxed max-w-[200px] mt-1"
                                style={{ color: "var(--color-ink2)" }}
                            >
                                {m.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
