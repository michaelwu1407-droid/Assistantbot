import { processChat } from "@/actions/chat-actions";

export async function POST(req: Request) {
  const { messages, data } = await req.json();

  const lastMessage = messages?.filter(
    (m: { role: string }) => m.role === "user",
  ).pop();

  if (!lastMessage) {
    return new Response("No user message", { status: 400 });
  }

  const workspaceId: string = data?.workspaceId ?? "";
  const overrideParams: Record<string, string> | undefined =
    data?.overrideParams;

  try {
    const result = await processChat(
      lastMessage.content,
      workspaceId,
      overrideParams,
    );

    // Build AI SDK Data Stream Protocol v1 response
    const parts: string[] = [];

    // Message annotation carrying structured action + data
    if (result.action || result.data) {
      parts.push(
        `8:${JSON.stringify([{ action: result.action, data: result.data }])}\n`,
      );
    }

    // Text content
    parts.push(`0:${JSON.stringify(result.message)}\n`);

    // Finish step + finish message
    parts.push(
      `e:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`,
    );
    parts.push(
      `d:${JSON.stringify({ finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
    );

    return new Response(parts.join(""), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    const parts = [
      `0:${JSON.stringify("Sorry, I'm having trouble connecting right now.")}\n`,
      `e:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`,
      `d:${JSON.stringify({ finishReason: "error", usage: { promptTokens: 0, completionTokens: 0 } })}\n`,
    ];

    return new Response(parts.join(""), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  }
}
