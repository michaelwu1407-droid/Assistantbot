"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getMessagePreview, sendTemplateMessage } from "@/actions/sms-templates";
import { toast } from "sonner";
import { Loader2, MessageSquare, Mail, Phone } from "lucide-react";
import type { TriggerEvent } from "@prisma/client";

interface MessageActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  triggerEvent: TriggerEvent;
  onSent?: () => void;
}

interface Preview {
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  channel: "sms" | "email";
  messageBody: string;
  isActive: boolean;
}

export function MessageActionSheet({
  open,
  onOpenChange,
  jobId,
  triggerEvent,
  onSent,
}: MessageActionSheetProps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMessagePreview(jobId, triggerEvent)
      .then((data) => setPreview(data))
      .finally(() => setLoading(false));
  }, [open, jobId, triggerEvent]);

  const handleSend = async () => {
    if (!preview) return;
    setSending(true);
    try {
      const result = await sendTemplateMessage(
        jobId,
        triggerEvent,
        preview.channel
      );
      if (result.success) {
        toast.success(
          `${preview.channel === "sms" ? "SMS" : "Email"} sent to ${preview.contactName}!`
        );
        onSent?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || "Failed to send");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setSending(false);
    }
  };

  const triggerLabel = triggerEvent.replace(/_/g, " ").toLowerCase();
  const ChannelIcon = preview?.channel === "email" ? Mail : Phone;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-600" />
            Send {triggerLabel} message
          </SheetTitle>
          <SheetDescription>
            Review before sending to your client.
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : preview ? (
          <div className="space-y-4 py-4">
            {/* Channel badge */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ChannelIcon className="h-4 w-4" />
              <span>
                Sending via <strong>{preview.channel === "sms" ? "SMS" : "Email"}</strong> to{" "}
                <strong>
                  {preview.channel === "sms"
                    ? preview.contactPhone
                    : preview.contactEmail}
                </strong>
              </span>
            </div>

            {/* Message preview bubble */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {preview.messageBody}
              </p>
            </div>

            {!preview.isActive && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                This template is currently disabled. The message will still send, but consider enabling it in Settings.
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            Could not load message preview.
          </div>
        )}

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !preview}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChannelIcon className="h-4 w-4" />
            )}
            {sending
              ? "Sending..."
              : `Send ${preview?.channel === "email" ? "Email" : "SMS"}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
