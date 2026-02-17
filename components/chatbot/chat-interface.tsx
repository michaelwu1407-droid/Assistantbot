'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Bot, User, Loader2, Sparkles, Clock, Calendar, FileText, Phone, Check, X, MapPin, DollarSign, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea"
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getChatHistory, clearChatHistoryAction } from '@/actions/chat-actions';

interface ChatInterfaceProps {
  workspaceId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

const QUICK_ACTIONS = [
  { icon: Calendar, label: "Schedule a meeting", prompt: "Help me schedule a meeting with a client" },
  { icon: FileText, label: "Create a quote", prompt: "Help me create a quote for a new job" },
  { icon: Phone, label: "Follow up call", prompt: "Help me prepare for a follow-up call" },
  { icon: Sparkles, label: "General help", prompt: "What can you help me with?" },
];

/* ── Draft Job Confirmation Card ────────────────────────── */
function DraftJobCard({
  data,
  onConfirm,
  onCancel,
  isConfirming,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming: boolean;
}) {
  const fields = [
    { icon: User, label: "Client", value: data.clientName || data.company || "—" },
    { icon: Wrench, label: "Work", value: data.workDescription || data.title || "—" },
    { icon: DollarSign, label: "Price", value: data.price || data.value ? `$${Number(data.price || data.value).toLocaleString()}` : "—" },
    { icon: Calendar, label: "Schedule", value: data.schedule || "—" },
    { icon: MapPin, label: "Address", value: data.address || "—" },
  ].filter(f => f.value !== "—");

  return (
    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm space-y-3 max-w-sm backdrop-blur-sm">
      <div className="space-y-2">
        {fields.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-2.5">
            <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
              <p className="text-sm font-medium text-foreground leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9 text-sm font-medium shadow-sm"
        >
          {isConfirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {isConfirming ? "Creating..." : "Confirm"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isConfirming}
          className="gap-1.5 rounded-lg h-9 text-sm border-border/50 hover:bg-background/50"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Actions that mutate data and should trigger a UI refresh
const MUTATION_ACTIONS = new Set([
  'move_deal', 'create_deal', 'create_job_natural', 'add_contact',
  'create_task', 'log_activity', 'create_invoice', 'confirmed',
]);

export function ChatInterface({ workspaceId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!workspaceId) return;
      try {
        setIsLoadingHistory(true);
        const history = await getChatHistory(workspaceId);
        if (history && history.length > 0) {
          // Convert history to Message format — also restore action/data from metadata
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formattedMessages: Message[] = history.map((msg: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = msg.metadata as Record<string, any> | null;
            return {
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.createdAt),
              action: meta?.action,
              data: meta?.data,
            };
          });
          setMessages(formattedMessages);
        } else {
          setMessages([{
            role: 'assistant',
            content: 'Hello! I\'m your Pj Buddy assistant. How can I help you today?',
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        setMessages([{
          role: 'assistant',
          content: 'Hello! I\'m your Pj Buddy assistant. How can I help you today?',
          timestamp: new Date()
        }]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [workspaceId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !workspaceId) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { processChat } = await import('@/actions/chat-actions');
      const response = await processChat(input, workspaceId);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        action: response.action,
        data: response.data,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Refresh the page data if the action mutated something
      if (response.action && MUTATION_ACTIONS.has(response.action)) {
        router.refresh();
      }
    } catch (error) {
      console.error('Chat processing error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfirmDraft = async (index: number, data: Record<string, any>) => {
    if (!workspaceId) return;
    setConfirmingIndex(index);

    try {
      const { processChat } = await import('@/actions/chat-actions');
      const intent = messages[index].action === 'draft_job_natural' ? 'create_job_natural' : 'create_deal';
      const response = await processChat('', workspaceId, {
        intent,
        confirmed: 'true',
        ...data,
      });

      // Replace the draft message's action so the card disappears
      setMessages(prev => prev.map((m, i) =>
        i === index ? { ...m, action: 'confirmed', data: undefined } : m
      ));

      // Add confirmation response
      const confirmMsg: Message = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        action: response.action,
        data: response.data,
      };
      setMessages(prev => [...prev, confirmMsg]);

      // Refresh the page data after confirmation
      router.refresh();
    } catch (error) {
      console.error('Confirm error:', error);
      const errMsg: Message = {
        role: 'assistant',
        content: 'Sorry, something went wrong creating the job. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setConfirmingIndex(null);
    }
  };

  const handleCancelDraft = (index: number) => {
    setMessages(prev => prev.map((m, i) =>
      i === index ? { ...m, action: 'cancelled', data: undefined } : m
    ));
    const cancelMsg: Message = {
      role: 'assistant',
      content: 'No worries — cancelled. Just tell me whenever you want to try again.',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, cancelMsg]);
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isDifferentDay = (date1: Date, date2: Date) => {
    return date1.toDateString() !== date2.toDateString();
  };

  const isDraftAction = (action?: string) =>
    action === 'draft_job_natural' || action === 'draft_deal';

  const isOnlyWelcomeMessage = messages.length === 1;

  return (
    <div className="flex flex-col h-full bg-background/50 backdrop-blur-sm">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
        {messages.map((message, index) => {
          const showDateSeparator = index === 0 || isDifferentDay(message.timestamp, messages[index - 1].timestamp);

          return (
            <div key={index}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-muted/50 text-muted-foreground text-xs px-3 py-1 rounded-full border border-border/50">
                    {formatDate(message.timestamp)}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "flex gap-3 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar Removed */}

                {/* Message Content */}
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2.5 shadow-sm",
                      message.role === "user"
                        ? "bg-[#0F172A] text-white rounded-br-sm"
                        : "bg-white text-[#0F172A] rounded-bl-sm border border-slate-200 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
                    )}
                  >
                    <p className="text-xs leading-relaxed whitespace-pre-line font-medium">{message.content}</p>

                    {/* Draft Confirmation Card */}
                    {isDraftAction(message.action) && message.data && (
                      <DraftJobCard
                        data={message.data}
                        onConfirm={() => handleConfirmDraft(index, message.data!)}
                        onCancel={() => handleCancelDraft(index)}
                        isConfirming={confirmingIndex === index}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs flex items-center gap-1",
                    message.role === "user" ? "text-muted-foreground justify-end" : "text-muted-foreground"
                  )}>
                    <Clock className="w-3 h-3" />
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl mx-auto animate-in fade-in">
            {/* Avatar Removed */}
            <div className="glass-card rounded-2xl rounded-bl-md px-5 py-3 shadow-sm border border-border/50">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions - Only show when empty */}
        {isOnlyWelcomeMessage && !isLoading && (
          <div className="max-w-3xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-sm text-muted-foreground mb-3 text-center">Quick actions to get started:</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.prompt)}
                  className="flex items-center gap-3 px-4 py-3 glass-card rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
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
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-md p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-2 focus-within:ring-2 focus-within:ring-[#00D28B]/20 transition-all">
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
        <p className="text-xs text-muted-foreground text-center mt-2 opacity-70">
          Pj Buddy AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
