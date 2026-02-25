'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { handleChatFallback } from "@/actions/chat-fallback";
import { DefaultChatTransport } from 'ai';
import { Send, Loader2, Sparkles, Clock, Calendar, FileText, Phone, Check, X, Mic, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getChatHistory, saveAssistantMessage, confirmJobDraft, runUndoLastAction } from '@/actions/chat-actions';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface ChatInterfaceProps {
  workspaceId?: string;
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: "Schedule a meeting", prompt: "Help me schedule a meeting with a client" },
  { icon: FileText, label: "Create a quote", prompt: "Help me create a quote for a new job" },
  { icon: Phone, label: "Follow up call", prompt: "Help me prepare for a follow-up call" },
  { icon: Sparkles, label: "Move a deal", prompt: "Show my deals" },
];

/** Convert DB chat history to UIMessage[] (chronological). */
function historyToInitialMessages(
  history: { id: string; role: string; content: string }[]
): { id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }[] {
  const chronological = [...history].reverse();
  return chronological.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: msg.content || '' }],
  }));
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
  const [submitting, setSubmitting] = useState(false);
  const category = data.workCategory ?? 'General';
  const warnings = data.warnings ?? [];

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
          disabled={submitting}
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
  initialMessages: { id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }[];
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  /** When user confirms a job draft, we replace that message's draft with this confirmation text. */
  const [confirmedDrafts, setConfirmedDrafts] = useState<Record<string, string>>({});
  /** When user cancels a job draft, we hide the card and show "Cancelled". */
  const [cancelledDrafts, setCancelledDrafts] = useState<Record<string, boolean>>({});
  /** Block sending "Next" more than once in quick succession (prevents multi-job draft spam). */
  const nextSendBlockedRef = useRef(false);

  const { isListening, transcript, toggleListening } = useSpeechRecognition();

  // Update input text natively as voice-to-text transcribes
  useEffect(() => {
    if (transcript) {
      setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
    }
  }, [transcript]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { workspaceId },
    }),
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: ({ message }) => {
      router.refresh();
      let content = getMessageTextFromParts(message.parts);
      if (!content.trim() && typeof (message as { content?: string }).content === 'string')
        content = (message as any).content;
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

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const isOnlyWelcomeMessage = messages.length <= 1;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 custom-scrollbar pb-32">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col gap-5 max-w-2xl mx-auto mt-4">
            <div className="rounded-2xl rounded-bl-sm px-5 py-4 bg-white/90 dark:bg-card/90 border border-slate-200/50 dark:border-border/50 shadow-sm backdrop-blur-md">
              <p className="text-[10px] md:text-xs leading-relaxed text-slate-800 dark:text-foreground">
                Hi! I&apos;m Travis, your personal assistant. Here to give you an early mark!
              </p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-muted-foreground text-center">Suggestions appear below</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const date = new Date();
          return (
            <div key={message.id ? `${message.id}-${index}` : `msg-${index}`}>
              <div
                className={cn(
                  "flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
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
                      parts.forEach((part: { type?: string; text?: string; state?: string; output?: { success?: boolean; message?: string; draft?: JobDraftData }; errorText?: string }, idx: number) => {
                        if (!part || typeof part !== "object") return;
                        const partText = part.type === "text" && part.text ? part.text : (part as { text?: string }).text;
                        if (partText && typeof partText === "string") {
                          rendered.push(
                            <p key={idx} className="text-[10px] md:text-xs leading-relaxed whitespace-pre-line font-medium">
                              {partText}
                            </p>
                          );
                          return;
                        }
                        const isTool = part.type?.startsWith("tool-") || part.type === "dynamic-tool";
                        if (isTool) {
                          if (part?.state === "output-available" && part.output?.draft) {
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
                              const isMultiJob = !!(part.output as { multiJobRemaining?: boolean })?.multiJobRemaining;
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
                                  data={part.output.draft}
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
                          if (part?.state === "output-available" && part.output?.showConfirmButton && part.output?.summary) {
                            rendered.push(
                              <div key={idx} className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                <p className="text-[10px] text-slate-600 dark:text-slate-400">{part.output.summary}</p>
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
                          if (part?.state === "output-available" && part.output?.message) {
                            const isSuccess = part.output.success !== false;
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
                                <span className="flex-1">{part.output.message}</span>
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
                            return;
                          }
                          if (part?.state === "output-error" && part.errorText) {
                            rendered.push(
                              <div key={idx} className="mt-2 text-[10px] text-red-600">
                                {part.errorText}
                              </div>
                            );
                          }
                        }
                      });
                      if (rendered.length > 0) return rendered;
                      let content = typeof (message as { content?: string }).content === 'string'
                        ? (message as any).content
                        : '';
                      if (!content.trim() && parts.length > 0) {
                        const fromParts = parts
                          .filter((p): p is object => p != null && typeof p === "object")
                          .map((p: { text?: string; content?: string }) => (p as { text?: string }).text ?? (p as { content?: string }).content)
                          .filter((t): t is string => typeof t === "string" && t.length > 0);
                        if (fromParts.length) content = fromParts.join('\n');
                      }
                      if (content.trim()) {
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
          <div className="flex gap-3 max-w-3xl mx-auto animate-in fade-in">
            <div className="rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-border/50 bg-white/80">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {isOnlyWelcomeMessage && !isLoading && messages.length <= 1 && (
          <div className="max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-[10px] font-medium text-slate-500 dark:text-muted-foreground mb-3">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-border bg-white dark:bg-card hover:border-primary/40 hover:bg-primary/5 transition-all group shadow-sm hover:shadow"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-slate-800 dark:text-foreground">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-4 pb-6 px-4 border-t border-border/10 bg-gradient-to-t from-background via-background to-transparent md:px-6 absolute bottom-0 left-0 right-0 z-20">
        <form onSubmit={handleSubmit} className="flex w-full max-w-3xl mx-auto gap-3">
          <div className="relative flex flex-1 min-w-0 items-end gap-2 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all duration-300">
            <Textarea
              id="chat-input"
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
    </div>
  );
}

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  const [initialMessages, setInitialMessages] = useState<{ id: string; role: 'user' | 'assistant'; parts: { type: 'text'; text: string }[] }[] | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setInitialMessages([]);
      return;
    }
    let cancelled = false;
    getChatHistory(workspaceId)
      .then((history) => {
        if (!cancelled) setInitialMessages(historyToInitialMessages(history ?? []));
      })
      .catch(() => {
        if (!cancelled) setInitialMessages([]);
      });
    return () => { cancelled = true; };
  }, [workspaceId]);

  if (initialMessages === null) {
    return (
      <div className="flex flex-col h-full bg-background/50 items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-xs text-muted-foreground mt-2">Loading chat...</p>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="flex flex-col h-full bg-background/50 items-center justify-center px-4">
        <p className="text-xs text-muted-foreground text-center">
          Chat needs your workspace to load. Refresh the page or sign in again.
        </p>
      </div>
    );
  }

  return (
    <ChatWithHistory
      workspaceId={workspaceId}
      initialMessages={initialMessages}
    />
  );
}
