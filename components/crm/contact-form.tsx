"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createContact, updateContact } from "@/actions/contact-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ContactFormMode = "create" | "edit";

type ContactFormProps = {
  mode: ContactFormMode;
  workspaceId?: string;
  contact?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    address: string | null;
    metadata?: Record<string, unknown>;
  };
};

export function ContactForm({ mode, workspaceId, contact }: ContactFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [contactType, setContactType] = useState<"PERSON" | "BUSINESS">(
    ((contact?.metadata?.contactType as string) === "BUSINESS" ? "BUSINESS" : "PERSON"),
  );
  const [name, setName] = useState(contact?.name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");

  const submitLabel = mode === "create" ? "Create contact" : "Save changes";
  const pageTitle = mode === "create" ? "New contact" : "Edit contact";

  const handleSubmit = () => {
    startTransition(async () => {
      if (!name.trim()) {
        toast.error("Name is required.");
        return;
      }

      if (mode === "create") {
        if (!workspaceId) {
          toast.error("Missing workspace context.");
          return;
        }

        const result = await createContact({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          company: company.trim(),
          address: address.trim(),
          workspaceId,
          contactType,
        });

        if (!result.success || !result.contactId) {
          toast.error(result.error || "Failed to create contact.");
          return;
        }

        toast.success(result.merged ? "Matched and updated existing contact." : "Contact created.");
        setRedirectNotice(result.merged ? "Opening the existing contact..." : "Opening the new contact...");
        router.replace(`/crm/contacts/${result.contactId}`);
        router.refresh();
        return;
      }

      if (!contact?.id) {
        toast.error("Missing contact to update.");
        return;
      }

      const result = await updateContact({
        contactId: contact.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        address: address.trim(),
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update contact.");
        return;
      }

      toast.success("Contact updated.");
      setRedirectNotice("Opening the updated contact...");
      router.replace(`/crm/contacts/${contact.id}`);
      router.refresh();
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{pageTitle}</h1>
        <p className="text-sm text-slate-500">
          {mode === "create"
            ? "Add a person or business contact to the CRM."
            : "Update the core contact details used across the CRM."}
        </p>
      </div>

      <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-sm">
        {redirectNotice && (
          <div className="mb-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {redirectNotice}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-type">Contact type</Label>
            <Select value={contactType} onValueChange={(value) => setContactType(value as "PERSON" | "BUSINESS")}>
              <SelectTrigger id="contact-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERSON">Person</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input id="contact-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input id="contact-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0400 000 000" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-company">Company</Label>
            <Input id="contact-company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional company name" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="contact-address">Address</Label>
            <Textarea
              id="contact-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, suburb, postcode"
              rows={3}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={handleSubmit} disabled={isPending || redirectNotice !== null}>
            {redirectNotice ? "Opening contact..." : isPending ? "Saving..." : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(contact?.id ? `/crm/contacts/${contact.id}` : "/crm/contacts")}
            disabled={isPending || redirectNotice !== null}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
