'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Loader2, Sparkles, Clock, Calendar, FileText, Phone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea"
import { Button } from '@/components/ui/button';
import { getChatHistory, saveAssistantMessage } from '@/actions/chat-actions';

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

/** Extract plain text from the last assistant message (for persistence). */
function getMessageTextFromParts(parts: { type?: string; text?: string }[] | undefined): string {
  if (!parts) return '';
  const textPart = parts.find((p) => p.type === 'text' && p.text);
  return (textPart && 'text' in textPart ? textPart.text : '') || '';
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

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { workspaceId },
    }),
    messages: initialMessages.length > 0 ? initialMessages : undefined,
    onFinish: ({ message }) => {
      router.refresh();
      const content = getMessageTextFromParts(message.parts);
      if (content.trim() && workspaceId) saveAssistantMessage(workspaceId, content).catch(() => {});
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
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/30">
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
            <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm">
              <p className="text-sm leading-relaxed text-slate-800 dark:text-foreground">
                Hello! I&apos;m your CRM assistant. Ask me to move deals, look up contacts, or schedule jobs — or type &quot;what can you do?&quot; to see more.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-muted-foreground text-center">Suggestions appear below</p>
          </div>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const date = new Date();
          return (
            <div key={message.id}>
              <div
                className={cn(
                  "flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isUser ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2.5 shadow-sm",
                      isUser
                        ? "bg-[#0F172A] text-white rounded-br-sm"
                        : "bg-white text-[#0F172A] rounded-bl-sm border border-slate-200 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                    )}
                  >
                    {message.parts?.map((part: { type?: string; text?: string; state?: string; output?: { success?: boolean; message?: string }; errorText?: string }, idx: number) => {
                      if (part.type === 'text' && part.text) {
                        return (
                          <p key={idx} className="text-xs leading-relaxed whitespace-pre-line font-medium">
                            {part.text}
                          </p>
                        );
                      }
                      const isTool = part.type?.startsWith('tool-') || part.type === 'dynamic-tool';
                      if (isTool) {
                        if (part.state === 'output-available' && part.output?.message) {
                          const isSuccess = part.output.success !== false;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                                isSuccess
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                                  : "bg-amber-50 border border-amber-200 text-amber-800"
                              )}
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              <span>{part.output.message}</span>
                            </div>
                          );
                        }
                        if (part.state === 'output-error' && part.errorText) {
                          return (
                            <div key={idx} className="mt-2 text-xs text-red-600">
                              {part.errorText}
                            </div>
                          );
                        }
                      }
                      return null;
                    })}
                  </div>
                  <span className={cn(
                    "text-xs flex items-center gap-1 text-muted-foreground",
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
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {isOnlyWelcomeMessage && !isLoading && messages.length <= 1 && (
          <div className="max-w-2xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs font-medium text-slate-500 dark:text-muted-foreground mb-3">Quick actions</p>
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
                  <span className="text-sm font-medium text-slate-800 dark:text-foreground">
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
      <div className="shrink-0 border-t border-border/50 bg-white/80 dark:bg-card/80 backdrop-blur-md p-4 md:px-6">
        <form onSubmit={handleSubmit} className="flex w-full max-w-3xl mx-auto gap-3">
          <div className="relative flex flex-1 min-w-0 items-end gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-2 focus-within:ring-2 focus-within:ring-[#00D28B]/20 transition-all">
            <Textarea
              value={input}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-[120px] w-full resize-none border-0 bg-transparent text-xs py-3 px-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 scrollbar-hide"
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
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              )}
            >
              <Send className="h-3.5 w-3.5 ml-0.5" />
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
        <p className="text-sm text-muted-foreground mt-2">Loading chat...</p>
      </div>
    );
  }

  return (
    <ChatWithHistory
      workspaceId={workspaceId ?? ''}
      initialMessages={initialMessages}
    />
  );
}
