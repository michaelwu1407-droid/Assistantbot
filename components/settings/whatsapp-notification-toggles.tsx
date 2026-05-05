"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getWhatsAppContext, setWhatsAppPref } from "@/actions/notification-prefs-actions";
import { toast } from "sonner";
import type { NotificationType } from "@/lib/notifications/notification-type-catalog";
import Link from "next/link";

function maskPhone(phone: string): string {
  // Show first 3 and last 3 digits, mask the rest
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;
  const prefix = phone.slice(0, phone.indexOf(digits[3]) );
  return `${prefix}${digits.slice(0, 3)}•••${digits.slice(-3)}`;
}

export function WhatsAppNotificationToggles() {
  const [phone, setPhone] = useState<string | null>(null);
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [catalog, setCatalog] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getWhatsAppContext()
      .then(({ phone, toggles, catalog }) => {
        setPhone(phone);
        setToggles(toggles);
        setCatalog(catalog);
      })
      .catch(() => toast.error("Failed to load WhatsApp preferences"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (key: string, enabled: boolean) => {
    const previous = toggles[key];
    setToggles((prev) => ({ ...prev, [key]: enabled }));
    setSaving(key);
    try {
      await setWhatsAppPref(key, enabled);
      toast.success(enabled ? "WhatsApp notification enabled" : "WhatsApp notification disabled");
    } catch {
      setToggles((prev) => ({ ...prev, [key]: previous }));
      toast.error("Failed to save preference");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const noPhone = !phone;
  const twilioWhatsAppNumber =
    process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER ?? "61485010634";
  const connectUrl = `https://wa.me/${twilioWhatsAppNumber}?text=Hi%20Earlymark`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
          WhatsApp notifications
        </CardTitle>
        <CardDescription>
          Receive real-time alerts on WhatsApp and reply to take action directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Phone / connect hint */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900">
          {noPhone ? (
            <p className="text-muted-foreground">
              No phone number saved.{" "}
              <Link
                href="/crm/settings/account"
                className="font-medium text-primary underline underline-offset-2"
              >
                Add your number in Account settings
              </Link>{" "}
              to enable WhatsApp notifications.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">
                Sending to <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{maskPhone(phone)}</span>
              </span>
              <a
                href={connectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#25D366] hover:underline"
              >
                Open WhatsApp <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>

        {/* Toggle rows */}
        <div className="space-y-4">
          {catalog.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4"
            >
              <div className="space-y-0.5">
                <Label className={noPhone ? "text-muted-foreground" : undefined}>
                  {item.label}
                </Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <div className="relative">
                {saving === item.key && (
                  <Loader2 className="absolute -left-5 top-0.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={toggles[item.key] ?? false}
                  disabled={noPhone || saving === item.key}
                  onCheckedChange={(v) => handleToggle(item.key, v)}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Messages are sent to your saved mobile number. Reply with action codes like{" "}
          <span className="font-mono">ACCEPT N-xxxx</span> to take action without opening the app.
        </p>
      </CardContent>
    </Card>
  );
}
