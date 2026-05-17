"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeadChannels, type LeadChannel, type LeadChannelStatus } from "@/actions/lead-channels";

type ChannelData = Awaited<ReturnType<typeof getLeadChannels>>;

const CATEGORY_ORDER: LeadChannel["category"][] = [
  "Lead platforms",
  "Your own channels",
  "Phone & SMS",
];

const STATUS_LABEL: Record<LeadChannelStatus, string> = {
  live: "Live",
  platform_setup_required: "1 step left on the platform",
  needs_inbox: "Connect your inbox first",
  needs_phone: "Claim your business number first",
  needs_form_check: "Confirm your form emails you",
  phone_not_provisioned: "Workspace owner action needed",
};

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
          Tracey can capture leads from {totalCount} sources. <strong>{liveCount} live, {totalCount - liveCount} need one more step.</strong> Expand any channel below to see exactly what to do.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {grouped.map(({ category, items }) => (
          <div key={category} className="space-y-2">
            <p className="app-micro-label">{category}</p>
            <div className="space-y-2">
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
  const hasSteps = (channel.setupSteps?.length ?? 0) > 0;

  return (
    <details
      className={
        isLive
          ? "rounded-md border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/10"
          : "rounded-md border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900/40 dark:bg-amber-900/10"
      }
    >
      <summary className="flex cursor-pointer items-start gap-2 list-none">
        {isLive ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">{channel.name}</p>
            <span
              className={
                isLive
                  ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
                  : "text-xs font-medium text-amber-700 dark:text-amber-400"
              }
            >
              {STATUS_LABEL[channel.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{channel.description}</p>
        </div>
      </summary>

      {channel.shareableLink && (
        <ShareableLink link={channel.shareableLink} />
      )}

      {hasSteps && (
        <ol className="mt-3 ml-7 list-decimal space-y-1.5 text-xs text-foreground">
          {channel.setupSteps!.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </details>
  );
}

function ShareableLink({ link }: { link: { label: string; path: string } }) {
  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${link.path}` : link.path;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied — paste it into your website or share it with customers.");
    } catch {
      toast.error("Couldn't copy automatically — select and copy the link instead.");
    }
  };

  return (
    <div className="mt-3 ml-7 rounded-md border border-border bg-background p-3 space-y-1.5">
      <p className="app-field-label">{link.label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-muted/40 px-2 py-1.5 text-xs font-mono text-foreground">
          {fullUrl}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:bg-muted/40"
        >
          <Copy className="h-3.5 w-3.5" /> Copy
        </button>
      </div>
    </div>
  );
}
