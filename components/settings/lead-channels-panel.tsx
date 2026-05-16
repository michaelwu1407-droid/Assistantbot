"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadChannels, type LeadChannel } from "@/actions/lead-channels";

type ChannelData = Awaited<ReturnType<typeof getLeadChannels>>;

const CATEGORY_ORDER: LeadChannel["category"][] = [
  "Lead platforms",
  "Your own channels",
  "Phone & SMS",
];

export function LeadChannelsPanel() {
  const [data, setData] = useState<ChannelData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getLeadChannels()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => { /* swallow — panel just stays empty */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const liveCount = data.channels.filter((c) => c.status === "live").length;
  const totalCount = data.channels.length;

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: data.channels.filter((c) => c.category === category),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where your leads come from</CardTitle>
        <CardDescription>
          Tracey captures leads from {totalCount} sources. You&apos;ve got <strong>{liveCount} of {totalCount}</strong> live right now &mdash; complete the steps above to light up the rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map(({ category, items }) => (
          <div key={category} className="space-y-2">
            <p className="app-micro-label">{category}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {items.map((channel) => (
                <ChannelRow key={channel.id} channel={channel} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChannelRow({ channel }: { channel: LeadChannel }) {
  const isLive = channel.status === "live";
  return (
    <div
      className={
        isLive
          ? "rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10"
          : "rounded-md border border-border bg-muted/20 p-3"
      }
    >
      <div className="flex items-start gap-2">
        {isLive ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{channel.name}</p>
          <p className="text-xs text-muted-foreground">{channel.description}</p>
          {!isLive && channel.setupHint && (
            <p className="text-xs text-amber-700 dark:text-amber-400">{channel.setupHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
