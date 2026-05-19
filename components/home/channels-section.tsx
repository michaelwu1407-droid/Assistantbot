import { Phone, MessageCircle, MessageSquare, Mail } from "lucide-react";

const CHANNELS = [
    {
        name: "Phone calls",
        sub: "Dedicated AU mobile · 24/7",
        icon: Phone,
        bg: "var(--color-sand)",
        fg: "var(--color-forest)",
    },
    {
        name: "WhatsApp",
        sub: "Text to manage the CRM",
        icon: MessageCircle,
        bg: "var(--color-cream)",
        fg: "var(--color-forest)",
    },
    {
        name: "SMS",
        sub: "Two-way with customers",
        icon: MessageSquare,
        bg: "#FEF3C7",
        fg: "#92400E",
    },
    {
        name: "Email",
        sub: "Threaded in unified inbox",
        icon: Mail,
        bg: "#DBEAFE",
        fg: "#1E40AF",
    },
] as const;

export function ChannelsSection() {
    return (
        <section className="bg-paper px-6 py-12 md:py-20">
            <div className="container mx-auto max-w-5xl">
                <div className="text-center mb-10">
                    <p
                        className="text-xs font-bold uppercase tracking-[0.18em] mb-3"
                        style={{ color: "var(--color-forest)" }}
                    >
                        One assistant · every channel
                    </p>
                    <h2
                        className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em]"
                        style={{ color: "var(--color-ink)" }}
                    >
                        Reach Tracey wherever your customers already are.
                    </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {CHANNELS.map((c) => {
                        const Icon = c.icon;
                        return (
                            <div
                                key={c.name}
                                className="bg-card border border-[var(--color-hair)] rounded-md p-5 flex flex-col gap-3"
                            >
                                <div
                                    className="w-10 h-10 rounded-md flex items-center justify-center"
                                    style={{ background: c.bg }}
                                >
                                    <Icon className="w-5 h-5" style={{ color: c.fg }} />
                                </div>
                                <div>
                                    <div
                                        className="text-sm font-semibold"
                                        style={{ color: "var(--color-ink)" }}
                                    >
                                        {c.name}
                                    </div>
                                    <div
                                        className="text-xs mt-0.5 leading-snug"
                                        style={{ color: "var(--color-ink2)" }}
                                    >
                                        {c.sub}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
