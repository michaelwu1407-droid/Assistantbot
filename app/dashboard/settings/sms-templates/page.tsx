import { Separator } from "@/components/ui/separator";
import { getUserSmsTemplates } from "@/actions/sms-templates";
import { SmsTemplatesForm } from "./sms-templates-form";

export const dynamic = "force-dynamic";

export default async function SmsTemplatesPage() {
  const templates = await getUserSmsTemplates();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">One-Tap Messages</h3>
        <p className="text-sm text-muted-foreground">
          Pre-written templates sent to clients via SMS or email when you take action on a job.
        </p>
      </div>
      <Separator />
      <SmsTemplatesForm initialTemplates={templates} />
    </div>
  );
}
