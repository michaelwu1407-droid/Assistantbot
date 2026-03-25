import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getChatHistory } from "@/actions/chat-actions";

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

  it("fills the message box from a quick action", async () => {
    const { user } = await renderChatInterface();

    await user.click(screen.getByRole("button", { name: "Schedule a job" }));

    expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
      "Help me schedule a job with a client",
    );
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
});
