"use server";

import { db } from "@/lib/db";
import { getDeals, createDeal, updateDealStage } from "./deal-actions";
import { logActivity } from "./activity-actions";
import { createContact, searchContacts } from "./contact-actions";
import { createTask } from "./task-actions";
import { generateMorningDigest } from "@/lib/digest";

// ─── Types ──────────────────────────────────────────────────────────

export interface ChatResponse {
  message: string;
  action?: string;
  data?: Record<string, unknown>;
}

// ─── Command Parser ─────────────────────────────────────────────────

interface ParsedCommand {
  intent:
    | "show_deals"
    | "show_stale"
    | "create_deal"
    | "move_deal"
    | "log_activity"
    | "search_contacts"
    | "add_contact"
    | "create_task"
    | "morning_digest"
    | "help"
    | "unknown";
  params: Record<string, string>;
}

function parseCommand(message: string): ParsedCommand {
  const msg = message.toLowerCase().trim();

  // Show pipeline / deals
  if (msg.match(/show.*(deal|pipeline|board|kanban)/)) {
    return { intent: "show_deals", params: {} };
  }

  // Show stale / rotting deals
  if (msg.match(/(stale|rotting|neglected|forgotten|old)\s*(deal|lead)?s?/)) {
    return { intent: "show_stale", params: {} };
  }

  // Create deal: "new deal Website Redesign for Acme worth 5000"
  const createMatch = msg.match(
    /(?:new|create|add)\s+deal\s+(.+?)(?:\s+for\s+(.+?))?(?:\s+worth\s+\$?([\d,]+))?$/
  );
  if (createMatch) {
    return {
      intent: "create_deal",
      params: {
        title: createMatch[1].trim(),
        company: createMatch[2]?.trim() ?? "",
        value: createMatch[3]?.replace(/,/g, "") ?? "0",
      },
    };
  }

  // Move deal: "move Website Redesign to negotiation"
  const moveMatch = msg.match(
    /move\s+(.+?)\s+to\s+(new|contacted|negotiation|won|lost)/
  );
  if (moveMatch) {
    return {
      intent: "move_deal",
      params: { title: moveMatch[1].trim(), stage: moveMatch[2].trim() },
    };
  }

  // Log activity: "log call with John about invoice" / "note: sent proposal"
  const logMatch = msg.match(
    /(?:log|record)\s+(call|email|meeting|note)\s+(?:with\s+)?(.+)/
  );
  if (logMatch) {
    return {
      intent: "log_activity",
      params: { type: logMatch[1].toUpperCase(), content: logMatch[2].trim() },
    };
  }

  // Search contacts
  const searchMatch = msg.match(/(?:search|find|look\s*up)\s+(?:contact\s+)?(.+)/);
  if (searchMatch) {
    return {
      intent: "search_contacts",
      params: { query: searchMatch[1].trim() },
    };
  }

  // Add contact: "add contact John Doe john@tesla.com"
  const addContactMatch = msg.match(
    /(?:add|new)\s+contact\s+([A-Za-z\s]+?)(?:\s+([\w.+-]+@[\w.-]+))?$/
  );
  if (addContactMatch) {
    return {
      intent: "add_contact",
      params: {
        name: addContactMatch[1].trim(),
        email: addContactMatch[2] ?? "",
      },
    };
  }

  // Create task: "remind me to call John next Tuesday" / "task: follow up with Acme"
  const taskMatch = msg.match(
    /(?:remind|task|todo|follow\s*up)[\s:]+(.+)/
  );
  if (taskMatch) {
    return {
      intent: "create_task",
      params: { title: taskMatch[1].trim() },
    };
  }

  // Morning digest
  if (msg.match(/(morning|digest|summary|briefing|today)/)) {
    return { intent: "morning_digest", params: {} };
  }

  // Help
  if (msg.match(/^(help|commands|what can you do)/)) {
    return { intent: "help", params: {} };
  }

  return { intent: "unknown", params: {} };
}

// ─── Main Chat Action ───────────────────────────────────────────────

/**
 * Process a chat message and execute CRM actions.
 * This is the primary interface — users message the chatbot
 * and the system updates the CRM automatically.
 */
export async function processChat(
  message: string,
  workspaceId: string
): Promise<ChatResponse> {
  // Persist user message
  await db.chatMessage.create({
    data: { role: "user", content: message },
  });

  const { intent, params } = parseCommand(message);

  let response: ChatResponse;

  switch (intent) {
    case "show_deals": {
      const deals = await getDeals(workspaceId);
      const byStage = deals.reduce<Record<string, number>>((acc, d) => {
        acc[d.stage] = (acc[d.stage] ?? 0) + 1;
        return acc;
      }, {});
      const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

      response = {
        message: `You have ${deals.length} deals worth $${totalValue.toLocaleString()} total.\n\n${Object.entries(byStage)
          .map(([stage, count]) => `  ${stage}: ${count}`)
          .join("\n")}`,
        action: "show_deals",
        data: { deals, byStage },
      };
      break;
    }

    case "show_stale": {
      const deals = await getDeals(workspaceId);
      const stale = deals.filter(
        (d) => d.health.status === "STALE" || d.health.status === "ROTTING"
      );

      if (stale.length === 0) {
        response = { message: "All deals are healthy. No stale or rotting deals." };
      } else {
        const lines = stale.map(
          (d) =>
            `  ${d.health.status === "ROTTING" ? "!!" : "!"} ${d.title} ($${d.value.toLocaleString()}) — ${d.health.daysSinceActivity}d without activity`
        );
        response = {
          message: `${stale.length} deal(s) need attention:\n\n${lines.join("\n")}`,
          action: "show_stale",
          data: { deals: stale },
        };
      }
      break;
    }

    case "create_deal": {
      // Find or use a default contact
      let contactId: string | undefined;
      if (params.company) {
        const contacts = await searchContacts(workspaceId, params.company);
        contactId = contacts[0]?.id;
      }

      if (!contactId) {
        // Create a placeholder contact
        const result = await createContact({
          name: params.company || "Unknown",
          workspaceId,
        });
        if (result.success) contactId = result.contactId;
      }

      if (!contactId) {
        response = { message: "Could not find or create a contact for this deal." };
        break;
      }

      const result = await createDeal({
        title: params.title,
        company: params.company,
        value: Number(params.value) || 0,
        stage: "new",
        contactId,
        workspaceId,
      });

      response = {
        message: result.success
          ? `Deal "${params.title}" created${params.value !== "0" ? ` worth $${Number(params.value).toLocaleString()}` : ""}. Added to New Lead column.`
          : `Failed: ${result.error}`,
        action: "create_deal",
        data: result.success ? { dealId: result.dealId } : undefined,
      };
      break;
    }

    case "move_deal": {
      const deals = await getDeals(workspaceId);
      const deal = deals.find((d) =>
        d.title.toLowerCase().includes(params.title.toLowerCase())
      );

      if (!deal) {
        response = { message: `Couldn't find a deal matching "${params.title}".` };
        break;
      }

      const result = await updateDealStage(deal.id, params.stage);
      response = {
        message: result.success
          ? `Moved "${deal.title}" to ${params.stage}.`
          : `Failed: ${result.error}`,
        action: "move_deal",
      };
      break;
    }

    case "log_activity": {
      const result = await logActivity({
        type: params.type as "CALL" | "EMAIL" | "NOTE" | "MEETING" | "TASK",
        title: `${params.type.toLowerCase()} logged via chat`,
        content: params.content,
      });

      response = {
        message: result.success
          ? `Logged ${params.type.toLowerCase()}: "${params.content}"`
          : `Failed: ${result.error}`,
        action: "log_activity",
      };
      break;
    }

    case "search_contacts": {
      const contacts = await searchContacts(workspaceId, params.query);

      if (contacts.length === 0) {
        response = { message: `No contacts found for "${params.query}".` };
      } else {
        const lines = contacts.slice(0, 5).map(
          (c) => `  ${c.name}${c.company ? ` (${c.company})` : ""}${c.email ? ` — ${c.email}` : ""}`
        );
        response = {
          message: `Found ${contacts.length} contact(s):\n\n${lines.join("\n")}`,
          action: "search_contacts",
          data: { contacts: contacts.slice(0, 5) },
        };
      }
      break;
    }

    case "add_contact": {
      const result = await createContact({
        name: params.name,
        email: params.email || undefined,
        workspaceId,
      });

      if (result.success) {
        const enrichedMsg = result.enriched
          ? ` Auto-enriched: ${result.enriched.name} (${result.enriched.industry ?? "Unknown industry"}).`
          : "";
        response = {
          message: `Contact "${params.name}" added.${enrichedMsg}`,
          action: "add_contact",
          data: { contactId: result.contactId },
        };
      } else {
        response = { message: `Failed: ${result.error}` };
      }
      break;
    }

    case "create_task": {
      // Default due date: tomorrow
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 1);
      dueAt.setHours(9, 0, 0, 0);

      const result = await createTask({
        title: params.title,
        dueAt,
      });

      response = {
        message: result.success
          ? `Task created: "${params.title}" (due tomorrow 9am).`
          : `Failed: ${result.error}`,
        action: "create_task",
      };
      break;
    }

    case "morning_digest": {
      const digest = await generateMorningDigest(workspaceId);

      if (digest.items.length === 0) {
        response = {
          message: `${digest.greeting}! Your pipeline ($${digest.totalPipelineValue.toLocaleString()}) looks healthy. No urgent items today.`,
        };
      } else {
        const actions = digest.topActions.map((a, i) => `  ${i + 1}. ${a}`);
        response = {
          message: `${digest.greeting}! Here's your briefing for ${digest.date}:\n\nPipeline: $${digest.totalPipelineValue.toLocaleString()}\n\nTop actions:\n${actions.join("\n")}`,
          action: "morning_digest",
          data: { digest },
        };
      }
      break;
    }

    case "help":
      response = {
        message: `Here's what I can do:\n
  "Show me deals" — View your pipeline
  "Show stale deals" — Find neglected deals
  "New deal [title] for [company] worth [amount]" — Create a deal
  "Move [deal] to [stage]" — Update pipeline
  "Log call/email/note [details]" — Record activity
  "Find [name]" — Search contacts (fuzzy)
  "Add contact [name] [email]" — Create contact (auto-enriches)
  "Remind me to [task]" — Create a follow-up
  "Morning digest" — Today's priority briefing`,
      };
      break;

    default:
      response = {
        message: `I didn't quite catch that. Try "help" to see what I can do, or ask me things like "show stale deals" or "new deal Website Redesign for Acme worth 5000".`,
      };
  }

  // Persist assistant response
  await db.chatMessage.create({
    data: {
      role: "assistant",
      content: response.message,
      metadata: response.data ? (response.data as Record<string, unknown>) : undefined,
    },
  });

  return response;
}

/**
 * Get chat history.
 */
export async function getChatHistory(limit = 50) {
  return db.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
