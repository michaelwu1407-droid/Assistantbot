'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { handleChatFallback } from "@/actions/chat-fallback";
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from "ai";
import { Send, Loader2, Sparkles, Clock, Calendar, FileText, Phone, Check, X, Mic, Undo2 } from 'lucide-react';
import { TraceyAvatar } from '@/components/ui/tracey-avatar';
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getChatHistory, saveAssistantMessage, confirmJobDraft, runUndoLastAction, getDailyDigest } from '@/actions/chat-actions';
import { getTeamMembers } from '@/actions/invite-actions';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { usePathname } from 'next/navigation';
import { CRM_SELECTION_EVENT, CrmSelectionItem } from '@/lib/crm-selection';

interface ChatInterfaceProps {
  workspaceId?: string;
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: "Schedule a job", prompt: "Help me schedule a job with a client" },
  { icon: FileText, label: "Create a quote", prompt: "Help me create a quote for a new job" },
  { icon: Phone, label: "Follow up call", prompt: "Help me prepare for a follow-up call" },
  { icon: Sparkles, label: "Move a deal", prompt: "Show my deals" },
];

/** Convert DB chat history to UIMessage[] (chronological). */
function historyToInitialMessages(
  history: { id: string; role: string; content: string }[]
): UIMessage[] {
  const chronological = [...history].reverse();
  return chronological.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content || '' }],
  }));
}

type PersistedChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function isUserOrAssistantMessage(
  message: UIMessage
): message is UIMessage & { role: "user" | "assistant" } {
  return message.role === "user" || message.role === "assistant";
}

/** Extract plain text from message parts (for persistence and display fallback). */
function getMessageTextFromParts(parts: { type?: string; text?: string }[] | undefined): string {
  if (!parts?.length) return '';
  const textPart = parts.find((p) => p.type === 'text' && (p as { text?: string }).text);
  if (textPart && (textPart as { text?: string }).text) return (textPart as { text: string }).text;
  const anyText = parts.map((p) => (p as { text?: string }).text).find((t) => typeof t === 'string' && t.length > 0);
  return typeof anyText === 'string' ? anyText : '';
}

/** Draft job card data (from showJobDraft tool or draft_job_natural). */
interface JobDraftData {
  firstName?: string;
  lastName?: string;
  clientName?: string;
  address?: string;
  workDescription?: string;
  workCategory?: string;
  price?: string;
  schedule?: string;
  scheduleISO?: string;
  rawSchedule?: string;
  warnings?: string[];
  phone?: string;
  email?: string;
  customerType?: string;
  assignedToId?: string | null;
  notes?: string; // New notes field for language preferences
}

function JobDraftCard({
  data,
  workspaceId,
  onCancel,
  onConfirmSuccess,
}: {
  data: JobDraftData;
  workspaceId: string;
  onCancel: () => void;
  onConfirmSuccess?: (confirmationMessage: string) => void;
}) {
  const [firstName, setFirstName] = useState(data.firstName ?? '');
  const [lastName, setLastName] = useState(data.lastName ?? '');
  const [workDescription, setWorkDescription] = useState(data.workDescription ?? '');
  const [price, setPrice] = useState(data.price && data.price !== "0" ? String(data.price) : "");
  const [schedule, setSchedule] = useState(data.schedule ?? data.rawSchedule ?? '');
  const [address, setAddress] = useState(data.address ?? '');
  const [phone, setPhone] = useState(data.phone ?? '');
  const [email, setEmail] = useState(data.email ?? '');
  const [notes, setNotes] = useState(''); // New notes field for language preferences
  const [customerType, setCustomerType] = useState<'Person' | 'Business'>(() =>
    (data.customerType === 'Business' ? 'Business' : 'Person')
  );
  const [assignedToId, setAssignedToId] = useState<string>(data.assignedToId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const category = data.workCategory ?? 'General';
  const warnings = data.warnings ?? [];

  const hasSchedule = Boolean(schedule?.trim());

  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTeamMembersLoading(true);
    getTeamMembers()
      .then((members) => {
        if (cancelled) return;
        setTeamMembers(
          members.map((m) => ({
            id: m.id,
            name: m.name ?? "Team member",
            role: String(m.role),
          }))
        );
      })
      .catch(() => {
        // If team list can't load, we'll still render the rest of the draft card.
        if (!cancelled) setTeamMembers([]);
      })
      .finally(() => {
        if (!cancelled) setTeamMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      // Use rawSchedule (e.g. "12pm") when user didn't edit schedule, so server parses time correctly
      const initialSchedule = data.schedule ?? data.rawSchedule ?? '';
      const effectiveRawSchedule = (schedule === initialSchedule && data.rawSchedule) ? data.rawSchedule : schedule;
      const result = await confirmJobDraft(workspaceId, {
        clientName: `${firstName}${lastName ? ' ' + lastName : ''}`.trim() || 'Unknown',
        workDescription,
        price,
        schedule,
        address: address || undefined,
        rawSchedule: effectiveRawSchedule,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        contactType: customerType === 'Business' ? 'BUSINESS' : 'PERSON',
        assignedToId: hasSchedule ? assignedToId || null : null,
        notes: notes.trim() || undefined, // Pass language preferences and other notes
      });
      if (result.success) {
        toast.success(result.message);
        onConfirmSuccess?.(result.message);
        onCancel();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/30 overflow-hidden">
      <div className="bg-emerald-100/60 dark:bg-emerald-900/40 px-4 py-2 border-b border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          New job — review & confirm
        </span>
        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">{category}</span>
      </div>
      <div className="p-4 space-y-3 bg-white dark:bg-card">
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-800 dark:text-amber-200 font-medium flex items-center gap-1.5">
                <span className="text-amber-500">⚠</span> {w}
              </p>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">First name</label>
            <Input className="h-8 text-xs" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Last name</label>
            <Input className="h-8 text-xs" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="(optional)" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Job type / What work is needed</label>
          <Input className="h-8 text-xs" value={workDescription} onChange={(e) => setWorkDescription(e.target.value)} placeholder="e.g. Sink repair, Light repair" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Quoted ($)</label>
            <Input className="h-8 text-xs" value={price} onChange={(e) => setPrice(e.target.value)} type="text" inputMode="numeric" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Schedule</label>
            <Input className="h-8 text-xs" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </div>
        </div>
        {hasSchedule && (
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Assignee</label>
            <select
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">Select a team member</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {teamMembersLoading && (
              <p className="text-[10px] text-muted-foreground mt-1">Loading team members...</p>
            )}
          </div>
        )}
        <div>
          <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Address</label>
          <Input className="h-8 text-xs" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Phone</label>
            <Input className="h-8 text-xs" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Email</label>
            <Input className="h-8 text-xs" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Optional" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">
            Notes <span className="text-amber-600 font-normal">(language preferences, etc.)</span>
          </label>
          <textarea
            className="w-full h-16 text-xs rounded-md border border-input bg-background px-3 py-2 resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., speaks Chinese, prefers Mandarin, hard of hearing, etc."
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-0.5 block">Type</label>
          <select
            className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value as 'Person' | 'Business')}
          >
            <option value="Person">Person</option>
            <option value="Business">Business</option>
          </select>
        </div>
      </div>
      <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-200 dark:border-emerald-800 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground text-xs py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting || !firstName.trim() || !workDescription.trim() || (hasSchedule && !assignedToId)}
          className="flex-1 bg-emerald-600 text-white text-xs py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Create job
        </button>
      </div>
    </div>
  );
}

function ChatWithHistory({
  workspaceId,
  initialMessages,
}: {
  workspaceId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState('');
  const [selectedDeals, setSelectedDeals] = useState<CrmSelectionItem[]>([]);
  const [digestModal, setDigestModal] = useState<{ kind: "morning" | "evening"; agentMode: string | null; digest: import("@/lib/digest").DailyDigest } | null>(null);
  const [digestLoading, setDigestLoading] = useState<"morning" | "evening" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** When user confirms a job draft, we replace that message's draft with this confirmation text. */
  const [confirmedDrafts, setConfirmedDrafts] = useState<Record<string, string>>({});
  /** When user cancels a job draft, we hide the card and show "Cancelled". */
  const [cancelledDrafts, setCancelledDrafts] = useState<Record<string, boolean>>({});
  /** Block sending "Next" more than once in quick succession (prevents multi-job draft spam). */
  const nextSendBlockedRef = useRef(false);
  const hasInitializedScrollRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  /** Track send time to measure client-perceived TTFT */
  const sendTimestampRef = useRef<number>(0);
  const pathname = usePathname();

  const getContextualQuickActions = () => {
    if (pathname?.includes('/deals')) {
      return [
        { icon: Calendar, label: "Schedule job", prompt: "Schedule a job for this deal" },
        { icon: FileText, label: "Create quote", prompt: "Create a quote for this deal" },
        { icon: Sparkles, label: "Move deal", prompt: "Can you move this deal to the next stage?" },
      ];
    }
    if (pathname?.includes('/contacts')) {
      return [
        { icon: Phone, label: "Call prep", prompt: "Help me prepare for a follow-up call with this contact" },
        { icon: Sparkles, label: "Draft email", prompt: "Draft an email to this contact" },
      ];
    }
    if (pathname?.includes('/assets')) {
      return [
        { icon: Sparkles, label: "Analyse assets", prompt: "Can you analyse my inventory allocation?" },
      ];
    }
    return QUICK_ACTIONS;
  };

  const { isListening, transcript, toggleListening } = useSpeechRecognition();

  // Update input text natively as voice-to-text transcribes
  useEffect(() => {
    if (transcript) {
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  useEffect(() => {
    const handleSelectionChange = (event: Event) => {
      const customEvent = event as CustomEvent<CrmSelectionItem[]>;
      setSelectedDeals(Array.isArray(customEvent.detail) ? customEvent.detail : []);
    };

    window.addEventListener(CRM_SELECTION_EVENT, handleSelectionChange as EventListener);
    return () => {
      window.removeEventListener(CRM_SELECTION_EVENT, handleSelectionChange as EventListener);
    };
  }, []);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { workspaceId, data: { workspaceId, selectedDeals } },
    }),
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: ({ message }) => {
      let content = getMessageTextFromParts(message.parts);
      if (!content.trim() && typeof (message as { content?: string }).content === 'string')
        content = (message as { content?: string }).content ?? "";
      if (content.trim() && workspaceId) saveAssistantMessage(workspaceId, content).catch(() => { });
    },
    onError: async (err) => {
      console.error("Chat error:", err);
      toast.error(err?.message ?? "Couldn't get a response. Check your connection and try again.");

      // Send fallback alert to support
      try {
        await handleChatFallback(
          err?.message || "Unknown chat error",
          {
            workspaceId,
            error: err?.message,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (fallbackError) {
        console.error("Failed to send fallback alert:", fallbackError);
      }
    },
  });

  // Persist messages in-session so switching Chat <-> Advanced doesn't reset the visible history.
  useEffect(() => {
    try {
      const storageKey = `chatMessages:${workspaceId}`;
      const serializable: PersistedChatMessage[] = messages
        .filter(isUserOrAssistantMessage)
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: getMessageTextFromParts(m.parts as { type?: string; text?: string }[] | undefined),
        }));
      sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    } catch {
      // Non-fatal: sessionStorage can be blocked.
    }
  }, [workspaceId, messages]);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Measure client-perceived time-to-first-token
  useEffect(() => {
    if (status === 'streaming' && sendTimestampRef.current > 0) {
      const ttft = Math.round(performance.now() - sendTimestampRef.current);
      sendTimestampRef.current = 0;
      try {
        navigator.sendBeacon('/api/internal/telemetry/client', JSON.stringify({
          metric: 'chat.client.ttft_ms',
          duration: ttft,
        }));
      } catch {
        // Non-critical telemetry — ignore failures
      }
    }
  }, [status]);

  const openDigestModal = async (kind: "morning" | "evening") => {
    if (!workspaceId) return;
    setDigestLoading(kind);
    try {
      const result = await getDailyDigest(workspaceId, kind);
      if (result) {
        setDigestModal(result);
      }
    } finally {
      setDigestLoading(null);
    }
  };

  useEffect(() => {
    const currentCount = messages.length;
    const hadMessagesBefore = previousMessageCountRef.current > 0;
    const hasNewMessage = currentCount > previousMessageCountRef.current;

    if (!hasInitializedScrollRef.current) {
      hasInitializedScrollRef.current = true;
      previousMessageCountRef.current = currentCount;
      return;
    }

    if (hasNewMessage || (isLoading && hadMessagesBefore)) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    previousMessageCountRef.current = currentCount;
  }, [messages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendTimestampRef.current = performance.now();
    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isOnlyWelcomeMessage = messages.length <= 1;

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Messages area — no separate Tracey header row; title is in the parent shell */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 custom-scrollbar pb-32">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col gap-5 max-w-7xl mx-auto mt-4 lg:max-w-8xl">
            <div className="flex items-start gap-3">
              <TraceyAvatar size="sm" />
              <div className="bg-neutral-100 rounded-lg rounded-tl-none px-4 py-3 text-sm text-neutral-700 max-w-xs">
                Hi! I&apos;m Tracey, your personal assistant. Here to give you an early mark!
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const date = new Date();
          return (
            <div key={message.id ? `${message.id}-${index}` : `msg-${index}`}>
              <div
                className={cn(
                  "flex gap-3 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300 lg:max-w-8xl",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-3xl px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
                      isUser
                        ? "bg-[#00D28B] text-white rounded-br-sm"
                        : "bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 rounded-bl-sm border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md"
                    )}
                  >
                    {(() => {
                      const parts = message.parts ?? [];
                      const rendered: React.ReactNode[] = [];
                      let draftCardRenderedForMessage = false;
                      (parts as unknown[]).forEach((part, idx) => {
                        if (!part || typeof part !== "object") return;
                        const p = part as Record<string, unknown>;
                        const partType = typeof p.type === "string" ? p.type : undefined;
                        const partText = partType === "text" && typeof p.text === "string" ? p.text : (typeof p.text === "string" ? p.text : undefined);
                        if (partText && typeof partText === "string") {
                          rendered.push(
                            <p key={idx} className="text-[10px] md:text-xs leading-relaxed whitespace-pre-line font-medium">
                              {partText}
                            </p>
                          );
                          return;
                        }
                        const isTool = !!partType && (partType.startsWith("tool-") || partType === "dynamic-tool");
                        if (isTool) {
                          const state = typeof p.state === "string" ? p.state : undefined;
                          const output = p.output as Record<string, unknown> | undefined;
                          const errorText = typeof p.errorText === "string" ? p.errorText : undefined;
                          if (state === "output-available" && output && typeof output === "object" && output.draft && typeof output.draft === "object") {
                            if (draftCardRenderedForMessage) return;
                            draftCardRenderedForMessage = true;
                            const confirmation = confirmedDrafts[message.id];
                            const cancelled = cancelledDrafts[message.id];
                            if (confirmation) {
                              rendered.push(
                                <div
                                  key={idx}
                                  className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
                                >
                                  <Check className="w-4 h-4 shrink-0" />
                                  <span>{confirmation}</span>
                                </div>
                              );
                            } else if (cancelled) {
                              rendered.push(
                                <div
                                  key={idx}
                                  className="mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"
                                >
                                  <X className="w-4 h-4 shrink-0" />
                                  <span>Cancelled</span>
                                </div>
                              );
                            } else {
                              const isMultiJob = output.multiJobRemaining === true;
                              const sendNextOnce = () => {
                                if (nextSendBlockedRef.current) return;
                                nextSendBlockedRef.current = true;
                                sendMessage({ text: "Next" });
                                setTimeout(() => {
                                  nextSendBlockedRef.current = false;
                                }, 3000);
                              };
                              rendered.push(
                                <JobDraftCard
                                  key={idx}
                                  data={output.draft as JobDraftData}
                                  workspaceId={workspaceId}
                                  onCancel={() => {
                                    setCancelledDrafts((prev) => ({ ...prev, [message.id]: true }));
                                    if (isMultiJob) sendNextOnce();
                                  }}
                                  onConfirmSuccess={(msg) => {
                                    setConfirmedDrafts((prev) => ({ ...prev, [message.id]: msg }));
                                    if (isMultiJob) sendNextOnce();
                                  }}
                                />
                              );
                            }
                            return;
                          }
                          if (state === "output-available" && output?.showConfirmButton && typeof output.summary === "string") {
                            rendered.push(
                              <div key={idx} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                <p className="text-[10px] text-slate-600 dark:text-slate-400">{output.summary}</p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => sendMessage({ text: 'confirm' })}
                                  >
                                    <Check className="w-3 h-3 mr-1" /> Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-[10px]"
                                    onClick={() => sendMessage({ text: 'cancel' })}
                                  >
                                    <X className="w-3 h-3 mr-1" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            );
                            return;
                          }
                          if (state === "output-available" && typeof output?.message === "string") {
                            const isSuccess = output.success !== false;
                            const quickActions = Array.isArray((output as { quickActions?: unknown[] }).quickActions)
                              ? (((output as { quickActions?: { label?: string; prompt?: string }[] }).quickActions) ?? [])
                                  .filter((a) => typeof a?.label === "string" && typeof a?.prompt === "string")
                              : [];
                            rendered.push(
                              <div
                                key={idx}
                                className={cn(
                                  "mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10px] font-medium",
                                  isSuccess
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                    : "bg-amber-50 border border-amber-200 text-amber-800"
                                )}
                              >
                                <Check className="w-4 h-4 shrink-0" />
                                <span className="flex-1">{output.message}</span>
                                {isSuccess && workspaceId && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const result = await runUndoLastAction(workspaceId);
                                      toast.info(result);
                                    }}
                                    className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition-colors flex items-center gap-0.5 shrink-0"
                                    title="Undo this action"
                                  >
                                    <Undo2 className="w-3 h-3" /> Undo
                                  </button>
                                )}
                              </div>
                            );
                            if (quickActions.length > 0) {
                              rendered.push(
                                <div key={`${idx}-qa`} className="mt-2 flex flex-wrap gap-1.5">
                                  {quickActions.map((action, actionIdx) => (
                                    <button
                                      key={`${idx}-qa-${actionIdx}`}
                                      type="button"
                                      onClick={() => sendMessage({ text: action.prompt! })}
                                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                                    >
                                      {action.label}
                                    </button>
                                  ))}
                                </div>
                              );
                            }
                            return;
                          }
                          if (state === "output-error" && errorText) {
                            rendered.push(
                              <div key={idx} className="mt-2 text-[10px] text-red-600">
                                {errorText}
                              </div>
                            );
                          }
                        }
                      });
                      if (rendered.length > 0) return rendered;
                      let content = typeof (message as { content?: string }).content === 'string'
                        ? (message as { content?: string }).content ?? ''
                        : '';
                      if (!content.trim() && parts.length > 0) {
                        const fromParts = parts
                          .filter((p) => p != null && typeof p === "object")
                          .map((p) => {
                            const obj = p as Record<string, unknown>;
                            return (typeof obj.text === "string" ? obj.text : undefined) ?? (typeof obj.content === "string" ? obj.content : undefined);
                          })
                          .filter((t): t is string => typeof t === "string" && t.length > 0);
                        if (fromParts.length) content = fromParts.join('\n');
                      }
                      if (content.trim()) {
                        const trimmed = content.trim();
                        if (!isUser && trimmed.startsWith("☀️ Morning Briefing")) {
                          return (
                            <button
                              type="button"
                              onClick={() => openDigestModal("morning")}
                              className="w-full text-left text-[10px] md:text-xs leading-relaxed font-medium rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-700 px-3 py-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                            >
                              {trimmed}
                              {digestLoading === "morning" && (
                                <span className="ml-2 text-[10px] text-emerald-700 dark:text-emerald-300">
                                  Loading…
                                </span>
                              )}
                            </button>
                          );
                        }
                        if (!isUser && trimmed.startsWith("🌙 Evening Wrap-Up")) {
                          return (
                            <button
                              type="button"
                              onClick={() => openDigestModal("evening")}
                              className="w-full text-left text-[10px] md:text-xs leading-relaxed font-medium rounded-2xl border border-slate-300 bg-slate-50/80 dark:bg-slate-900/70 dark:border-slate-700 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              {trimmed}
                              {digestLoading === "evening" && (
                                <span className="ml-2 text-[10px] text-slate-600 dark:text-slate-300">
                                  Loading…
                                </span>
                              )}
                            </button>
                          );
                        }
                        return (
                          <p className="text-[10px] md:text-xs leading-relaxed whitespace-pre-line font-medium">
                            {content}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <span className={cn(
                    "text-[10px] flex items-center gap-1 text-muted-foreground",
                    isUser && "justify-end"
                  )}>
                    <Clock className="w-3 h-3" />
                    {formatTime(date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-7xl mx-auto animate-in fade-in lg:max-w-8xl">
            <div className="rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-border/50 bg-white/80">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {isOnlyWelcomeMessage && !isLoading && messages.length <= 1 && (
          <div className="px-4 pt-3 max-w-4xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:max-w-5xl">
            <p className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">
              Quick actions
            </p>
            <div className="grid grid-cols-2 gap-2">
              {getContextualQuickActions().map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex w-full min-w-0 items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-neutral-200 rounded-full text-xs sm:text-sm text-neutral-700 hover:border-primary hover:text-primary hover:bg-primary-muted transition-colors duration-150 text-center"
                >
                  <action.icon size={13} className="shrink-0 text-primary" />
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-4 pb-6 px-4 border-t border-border/10 bg-gradient-to-t from-background via-background to-transparent md:px-6 absolute bottom-0 left-0 right-0 z-20">
        <form onSubmit={handleSubmit} className="flex w-full max-w-7xl mx-auto gap-3 lg:max-w-8xl">
          <div className="relative flex flex-1 min-w-0 items-end gap-2 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all duration-300">
            <Textarea
              id="chat-input"
              aria-label="Message"
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-[120px] w-full resize-none border-0 bg-transparent text-xs md:text-sm py-3 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 placeholder:text-[10px] md:placeholder:text-xs scrollbar-hide"
              rows={1}
              ref={(ref) => {
                if (ref) {
                  ref.style.height = "auto";
                  ref.style.height = `${ref.scrollHeight}px`;
                }
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <Button
              type="submit"
              aria-label="Send message"
              disabled={isLoading || !input.trim()}
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 rounded-xl transition-all duration-200 mb-1",
                input.trim()
                  ? "bg-[#00D28B] hover:bg-[#00D28B]/90 text-white shadow-md shadow-[#00D28B]/20"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 hover:bg-slate-200 dark:hover:bg-zinc-700"
              )}
            >
              <Send className="h-3.5 w-3.5 ml-0.5" />
            </Button>
            <Button
              type="button"
              id="voice-btn"
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
              size="icon"
              onClick={toggleListening}
              className={cn(
                "h-8 w-8 shrink-0 rounded-xl transition-all duration-200 mb-1 border",
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 border-red-500 animate-pulse"
                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-700 dark:hover:text-zinc-300"
              )}
            >
              <Mic className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
      {digestModal && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setDigestModal(null); }}>
          <DialogContent className="sm:max-w-2xl lg:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {digestModal.kind === "morning" ? "Morning Briefing" : "Evening Wrap-Up"} — {digestModal.digest.date}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs md:text-sm">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-3">
                <p className="font-semibold text-slate-900 dark:text-slate-50">
                  Summary
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Pipeline value: ${digestModal.digest.totalPipelineValue.toLocaleString("en-AU")} · Top actions: {digestModal.digest.topActions.slice(0, 3).join(", ")}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Urgent & rotting jobs</p>
                  {digestModal.digest.items.filter(i => i.type === "rotting_deal").length === 0 ? (
                    <p className="text-[11px] text-slate-500">No urgent rotting jobs right now.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {digestModal.digest.items.filter(i => i.type === "rotting_deal").map((item, idx) => (
                        <li key={idx} className="rounded-lg border border-red-200 dark:border-red-700 bg-red-50/70 dark:bg-red-900/40 px-3 py-2">
                          <p className="text-[11px] font-semibold text-red-800 dark:text-red-100">{item.title}</p>
                          <p className="text-[11px] text-red-700/90 dark:text-red-200/90 mt-0.5">{item.description}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Follow ups & today&apos;s tasks</p>
                  {digestModal.digest.items.filter(i => i.type === "stale_deal" || i.type === "follow_up").length === 0 ? (
                    <p className="text-[11px] text-slate-500">No follow ups flagged right now.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {digestModal.digest.items.filter(i => i.type === "stale_deal" || i.type === "follow_up").map((item, idx) => (
                        <li key={idx} className="rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/40 px-3 py-2">
                          <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-100">{item.title}</p>
                          <p className="text-[11px] text-amber-800/90 dark:text-amber-100/90 mt-0.5">{item.description}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Overdue tasks & admin</p>
                {digestModal.digest.items.filter(i => i.type === "overdue_task").length === 0 ? (
                  <p className="text-[11px] text-slate-500">No overdue tasks right now.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {digestModal.digest.items.filter(i => i.type === "overdue_task").map((item, idx) => (
                      <li key={idx} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3 py-2">
                        <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-50">{item.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">{item.description}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-100 mb-1">
                  Next steps {digestModal.agentMode ? `(${digestModal.agentMode})` : ""}
                </p>
                <ul className="list-disc list-inside text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  {digestModal.kind === "morning" ? (
                    digestModal.agentMode === "EXECUTION" ? (
                      <>
                        <li>I&apos;ll chase any urgent or rotting jobs for you and prepare follow-up messages.</li>
                        <li>I&apos;ll line up drafts for quotes and invoices based on today&apos;s schedule.</li>
                      </>
                    ) : digestModal.agentMode === "DRAFT" ? (
                      <>
                        <li>I&apos;ve prepared draft follow-ups for stale jobs – ask me to &quot;show today&apos;s drafts&quot; to review them.</li>
                        <li>Review and approve any draft quotes or messages before you head out.</li>
                      </>
                    ) : (
                      <>
                        <li>Call or text the top 1–2 jobs in the list to keep the pipeline moving.</li>
                        <li>Glance over today&apos;s runs and confirm any jobs you&apos;re unsure about.</li>
                      </>
                    )
                  ) : digestModal.agentMode === "EXECUTION" ? (
                    <>
                      <li>I&apos;ll follow up tonight or first thing tomorrow on any jobs marked Follow up or Urgent.</li>
                      <li>I&apos;ll chase unpaid invoices and prepare any reminders needed.</li>
                    </>
                  ) : digestModal.agentMode === "DRAFT" ? (
                    <>
                      <li>Review and approve the follow-up drafts I&apos;ve queued from today&apos;s jobs.</li>
                      <li>Approve any invoice drafts so I can send reminders tomorrow.</li>
                    </>
                  ) : (
                    <>
                      <li>Before you log off, send invoices for completed jobs and add brief notes to today&apos;s calls.</li>
                      <li>Pick 1–2 follow-ups from the list to tackle first thing tomorrow.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  // Read sessionStorage synchronously during init so the very first render
  // passes restored messages to useChat. useChat only reads `messages` on
  // mount — a deferred setInitialMessages via useEffect arrives too late.
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(() => {
    if (!workspaceId) return [];
    try {
      const storageKey = `chatMessages:${workspaceId}`;
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const messages: PersistedChatMessage[] = parsed
            .map((m) => {
              if (!m || typeof m !== "object") return null;
              const obj = m as Record<string, unknown>;
              const id = typeof obj.id === "string" ? obj.id : null;
              const role = obj.role === "user" || obj.role === "assistant" ? obj.role : null;
              const content = typeof obj.content === "string" ? obj.content : "";
              return id && role ? { id, role, content } : null;
            })
            .filter((m): m is PersistedChatMessage => m !== null);
          if (messages.length > 0) {
            return historyToInitialMessages(
              messages.map((m) => ({ id: m.id, role: m.role, content: m.content }))
            );
          }
        }
      }
    } catch {
      // sessionStorage may be blocked; fall through to DB fetch.
    }
    return null;
  });

  useEffect(() => {
    // If sessionStorage already provided messages, skip the DB fetch.
    if (initialMessages !== null) return;
    if (!workspaceId) return;

    let cancelled = false;
    // Load only last 20 messages for faster initial render
    getChatHistory(workspaceId, 20)
      .then((history) => {
        if (!cancelled) setInitialMessages(historyToInitialMessages(history ?? []));
      })
      .catch(() => {
        if (!cancelled) setInitialMessages([]);
      });
    return () => { cancelled = true; };
  }, [workspaceId, initialMessages]);

  if (!workspaceId) {
    return (
      <div className="flex flex-col h-full bg-background/50 items-center justify-center px-4">
        <p className="text-xs text-muted-foreground text-center">
          Chat needs your workspace to load. Refresh the page or sign in again.
        </p>
      </div>
    );
  }

  // Render chat immediately with empty messages — history loads in background
  return (
    <ChatWithHistory
      workspaceId={workspaceId}
      initialMessages={initialMessages ?? []}
    />
  );
}
