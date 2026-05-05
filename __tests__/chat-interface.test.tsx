import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getChatHistory, getDailyDigest } from "@/actions/chat-actions";

vi.mock("@ai-sdk/react", async () => {
  const React = await import("react");

  return {
    useChat: ({ messages }: { messages?: { id: string; role: string; parts: { type: string; text: string }[] }[] }) => {
      const [chatMessages, setChatMessages] = React.useState(messages ?? []);

      React.useEffect(() => {
        setChatMessages(messages ?? []);
      }, [messages]);

      return {
        messages: chatMessages,
        status: "ready",
        sendMessage: ({ text }: { text: string }) => {
          setChatMessages((previousMessages) => [
            ...previousMessages,
            {
              id: `user-${previousMessages.length + 1}`,
              role: "user",
              parts: [{ type: "text", text }],
            },
          ]);
        },
      };
    },
  };
});

vi.mock("@/hooks/use-speech-recognition", () => ({
  useSpeechRecognition: () => ({
    isListening: false,
    transcript: "",
    toggleListening: vi.fn(),
  }),
}));

vi.mock("@/actions/chat-actions", () => ({
  getChatHistory: vi.fn().mockResolvedValue([]),
  saveAssistantMessage: vi.fn(),
  confirmJobDraft: vi.fn(),
  runUndoLastAction: vi.fn().mockResolvedValue("Undone"),
  getDailyDigest: vi.fn().mockResolvedValue(null),
}));

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getChatHistory).mockResolvedValue([]);
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
});

async function renderChatInterface() {
  const user = userEvent.setup();

  render(<ChatInterface workspaceId="test-workspace" />);

  await waitFor(() => {
    expect(getChatHistory).toHaveBeenCalledWith("test-workspace", 20);
  });

  return { user };
}

describe("ChatInterface", () => {
  it("renders the initial assistant message and accessible chat controls", async () => {
    await renderChatInterface();

    expect(
      screen.getByText("Hi! I'm Tracey, your personal assistant. Here to give you an early mark!"),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Start voice input" })).toBeInTheDocument();
  });

  it("renders the current quick actions", async () => {
    await renderChatInterface();

    expect(screen.getByRole("button", { name: "Schedule a job" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create a quote" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Follow up call" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move a deal" })).toBeInTheDocument();
  });

  it("sends the quick-action prompt immediately so Tracey responds without an extra Send click", async () => {
    const { user } = await renderChatInterface();

    await user.click(screen.getByRole("button", { name: "Schedule a job" }));

    expect(screen.getByText("Help me schedule a job with a client")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
  });

  it("enables the send button when the message box has text", async () => {
    const { user } = await renderChatInterface();

    await user.type(screen.getByRole("textbox", { name: "Message" }), "Test message");

    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it("submits a user message through the mocked chat hook", async () => {
    const { user } = await renderChatInterface();

    await user.type(screen.getByRole("textbox", { name: "Message" }), "Test message");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(screen.getByText("Test message")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue("");
  });

  it("opens the morning briefing modal with clean user-facing separators", async () => {
    sessionStorage.setItem(`chatMessages:test-workspace`, JSON.stringify([
      {
        id: "msg_1",
        role: "assistant",
        content: "☀️ Morning Briefing: 2 jobs need attention",
      },
    ]));
    vi.mocked(getDailyDigest).mockResolvedValue({
      kind: "morning",
      agentMode: "DRAFT",
      digest: {
        greeting: "Morning",
        date: "11 Apr 2026",
        totalPipelineValue: 1200,
        topActions: ["Call stale jobs", "Review invoices"],
        items: [
          {
            type: "stale_deal",
            priority: 2,
            title: "Blocked Drain is going stale",
            description: "$1,200 deal with Alex - no activity in 9 days.",
            dealId: "deal_1",
            contactId: "contact_1",
            value: 1200,
          },
        ],
      },
    });
    const user = userEvent.setup();
    render(<ChatInterface workspaceId="test-workspace" />);

    await user.click(await screen.findByRole("button", { name: /morning briefing/i }));

    expect(await screen.findByRole("heading", { name: "Morning Briefing - 11 Apr 2026" })).toBeInTheDocument();
    expect(screen.getByText(/Pipeline value: \$1,200 - Top actions:/i)).toBeInTheDocument();
    expect(screen.getByText(/draft follow-ups for stale jobs - ask me/i)).toBeInTheDocument();
    expect(screen.queryByText(/â|Â|—|–|·/)).not.toBeInTheDocument();
  });
});
