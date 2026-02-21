"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertSmsTemplate } from "@/actions/sms-templates";
import { toast } from "sonner";
import { MessageSquare, Navigation, Clock, Loader2, Save } from "lucide-react";
import type { TriggerEvent } from "@prisma/client";

interface Template {
  triggerEvent: TriggerEvent;
  content: string;
  isActive: boolean;
  id: string | null;
}

interface SmsTemplatesFormProps {
  initialTemplates: Template[];
}

const TRIGGER_META: Record<TriggerEvent, { label: string; description: string; icon: typeof MessageSquare }> = {
  JOB_COMPLETE: {
    label: "Job Complete",
    description: "Sent after you mark a job as done. Great for review requests.",
    icon: MessageSquare,
  },
  ON_MY_WAY: {
    label: "On My Way",
    description: "Sent when you start traveling to a job site.",
    icon: Navigation,
  },
  LATE: {
    label: "Running Late",
    description: "Quick heads-up when you're stuck in traffic.",
    icon: Clock,
  },
};

export function SmsTemplatesForm({ initialTemplates }: SmsTemplatesFormProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [saving, setSaving] = useState<TriggerEvent | null>(null);

  const update = (event: TriggerEvent, patch: Partial<Template>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.triggerEvent === event ? { ...t, ...patch } : t))
    );
  };

  const handleSave = async (event: TriggerEvent) => {
    const tpl = templates.find((t) => t.triggerEvent === event);
    if (!tpl) return;

    setSaving(event);
    const result = await upsertSmsTemplate(event, tpl.content, tpl.isActive);
    if (result.success) {
      toast.success("Template saved");
    } else {
      toast.error(result.error || "Failed to save");
    }
    setSaving(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Use <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">[Name]</code> to insert the client&apos;s name and{" "}
        <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">[Link]</code> for your review link.
      </p>

      {templates.map((tpl) => {
        const meta = TRIGGER_META[tpl.triggerEvent];
        const Icon = meta.icon;
        return (
          <Card key={tpl.triggerEvent} className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg">
                    <Icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{meta.label}</CardTitle>
                    <CardDescription className="text-xs">{meta.description}</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={tpl.isActive}
                  onCheckedChange={(v) => {
                    update(tpl.triggerEvent, { isActive: v });
                    // Auto-save toggle immediately
                    upsertSmsTemplate(tpl.triggerEvent, tpl.content, v);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={tpl.content}
                onChange={(e) => update(tpl.triggerEvent, { content: e.target.value })}
                rows={2}
                className="resize-none text-sm"
                disabled={!tpl.isActive}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSave(tpl.triggerEvent)}
                  disabled={saving === tpl.triggerEvent || !tpl.isActive}
                  className="gap-1.5"
                >
                  {saving === tpl.triggerEvent ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
