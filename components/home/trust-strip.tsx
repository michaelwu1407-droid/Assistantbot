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
        <section className="bg-paper px-6 pt-14 pb-12 md:pt-20 md:pb-16">
            <div className="container mx-auto max-w-5xl">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-0 sm:divide-x sm:divide-hair">
                    {metrics.map((m) => (
                        <div key={m.label} className="flex flex-col items-center text-center sm:px-10 gap-1">
                            <div className="text-5xl md:text-6xl font-extrabold tracking-[-0.04em] leading-none text-ink">
                                {m.value}
                            </div>
                            <div className="text-[11px] font-bold uppercase tracking-[0.22em] mt-2.5 text-forest">
                                {m.label}
                            </div>
                            <p className="text-xs leading-relaxed max-w-[200px] mt-1.5 text-ink2/80">
                                {m.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
