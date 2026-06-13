export function TrustStrip() {
    const metrics = [
        {
            no: "01",
            value: "99%",
            label: "Calls answered",
            sub: "Every customer gets a response, even while you're on the tools",
        },
        {
            no: "02",
            value: "~60%",
            label: "More jobs booked",
            sub: "Average increase in booked jobs in the first month",
        },
        {
            no: "03",
            value: "~3 hrs",
            label: "Admin saved daily",
            sub: "Time reclaimed from calls, follow-ups, and manual entry",
        },
    ];

    return (
        <section className="bg-paper px-5 sm:px-8 py-16 md:py-24">
            <div className="mx-auto max-w-[1320px]">
                <div className="flex items-center gap-4 border-t border-hair pt-3.5">
                    <span className="em-kicker text-forest">§ Results</span>
                    <span className="em-kicker flex-1 text-ink2/55">Measured across live workspaces</span>
                </div>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-3">
                    {metrics.map((m, i) => (
                        <div
                            key={m.label}
                            className={`flex flex-col gap-3 py-8 md:py-2 md:px-10 ${
                                i > 0 ? "border-t border-hair md:border-t-0 md:border-l" : "md:pl-0"
                            }`}
                        >
                            <span className="em-kicker text-ink2/45">{m.no}</span>
                            <div className="em-display text-[clamp(3.5rem,7vw,5.5rem)] text-ink">{m.value}</div>
                            <div className="text-base font-semibold text-forest">{m.label}</div>
                            <p className="max-w-[240px] text-sm leading-relaxed text-ink2/80">{m.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
