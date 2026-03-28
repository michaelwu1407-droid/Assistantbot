"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface WebformEmbedSectionProps {
  workspaceId: string;
}

export function WebformEmbedSection({ workspaceId }: WebformEmbedSectionProps) {
  const [tab, setTab] = useState<"html" | "js">("html");
  const [copied, setCopied] = useState(false);

  const endpoint = `${typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/webhooks/webform`;

  const htmlSnippet = `<form action="${endpoint}" method="POST">
  <input type="hidden" name="workspace_id" value="${workspaceId}" />
  <!-- Optional: redirect back to your thank-you page after submission -->
  <input type="hidden" name="redirect_url" value="https://yoursite.com/thank-you" />

  <label for="name">Name</label>
  <input type="text" name="name" id="name" required />

  <label for="email">Email</label>
  <input type="email" name="email" id="email" />

  <label for="phone">Phone</label>
  <input type="tel" name="phone" id="phone" />

  <label for="message">How can we help?</label>
  <textarea name="message" id="message"></textarea>

  <button type="submit">Send Enquiry</button>
</form>`;

  const jsSnippet = `fetch("${endpoint}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workspace_id: "${workspaceId}",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "0412 345 678",
    message: "I need a hot water system replaced",
    job_type: "Hot water"
  })
})
  .then(res => res.json())
  .then(data => console.log("Lead created:", data))
  .catch(err => console.error("Error:", err));`;

  const activeSnippet = tab === "html" ? htmlSnippet : jsSnippet;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeSnippet);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Code2 className="h-5 w-5 text-emerald-600" />
          <CardTitle>Embed Lead Form</CardTitle>
        </div>
        <CardDescription>
          Add a contact form to your website that automatically creates leads in your CRM.
          Submissions trigger any &quot;New lead&quot; automations you&apos;ve set up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600">
          <span className="font-medium">Your workspace ID:</span>{" "}
          <code className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">{workspaceId}</code>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("html")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "html" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            HTML Form
          </button>
          <button
            onClick={() => setTab("js")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "js" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            JavaScript
          </button>
        </div>

        {/* Code block */}
        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed">
            <code>{activeSnippet}</code>
          </pre>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <p className="text-xs text-slate-500">
          The HTML form uses a <code className="bg-slate-100 px-1 rounded">redirect_url</code> field
          to send customers back to your thank-you page after submission. The JavaScript version
          works with CORS from any domain — no server-side proxy needed.
        </p>
      </CardContent>
    </Card>
  );
}
