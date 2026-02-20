
export async function generateSMSResponse(interactionId: string, userMessage: string, workspaceId: string): Promise<string> {
    // TODO: Integrate LangChain / OpenAI SDK here for real intelligence
    // For now, simple keyword matching to demonstrate the loop

    const lower = userMessage.toLowerCase()

    if (lower.includes("schedule") || lower.includes("book") || lower.includes("appointment")) {
        return "I can help with that. Please visit https://pj-buddy.com/book to see our availability."
    }

    if (lower.includes("price") || lower.includes("cost") || lower.includes("quote")) {
        return "Our pricing depends on the job scope. Could you send a photo or describe the issue in more detail?"
    }

    if (lower.includes("emergency") || lower.includes("urgent")) {
        return "I've flagged this as urgent. A team member will call you immediately."
    }

    return "Thanks for your message. I'm the Pj Buddy AI assistant. How can I help you today?"
}
