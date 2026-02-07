"use server";

import { db } from "@/lib/db";
import { getDeals, createDeal, updateDealStage } from "./deal-actions";
import { logActivity } from "./activity-actions";
import { createContact, searchContacts } from "./contact-actions";
import { createTask } from "./task-actions";
import { generateMorningDigest } from "@/lib/digest";
import { getTemplates, renderTemplate } from "./template-actions";
import { findDuplicateContacts } from "./dedup-actions";
import { generateQuote } from "./tradie-actions";

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
  | "start_day"
  | "start_open_house"
  | "use_template"
  | "show_templates"
  | "find_duplicates"
  | "create_invoice"
  | "help"
  | "unknown";
  params: Record<string, string>;
}

function parseCommand(message: string): ParsedCommand {
  const msg = message.toLowerCase().trim();

  // Start Day (Tradie)
  if (msg.match(/start\s*(my)?\s*day/)) {
    return { intent: "start_day", params: {} };
  }

  // Start Open House (Agent)
  if (msg.match(/start\s*(open)?\s*house/)) {
    return { intent: "start_open_house", params: {} };
  }

  // Show pipeline / deals
  if (msg.match(/show.*(deal|pipeline|board|kanban|job|listing)/)) {
    return { intent: "show_deals", params: {} };
  }

  // Show stale / rotting deals
  if (msg.match(/(stale|rotting|neglected|forgotten|old)\s*(deal|lead|job|listing)?s?/)) {
    return { intent: "show_stale", params: {} };
  }

  // Create deal: "new deal/job/listing Website Redesign for Acme worth 5000"
  const createMatch = msg.match(
    /(?:new|create|add)\s+(?:deal|job|listing|lead)\s+(.+?)(?:\s+for\s+(.+?))?(?:\s+worth\s+\$?([\d,]+))?$/
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

  // Invoice deal: "invoice Website Redesign" or "invoice Website Redesign for 5000"
  const invoiceMatch = msg.match(/invoice\s+(.+?)(?:\s+for\s+\$?([\d,]+))?$/);
  if (invoiceMatch) {
    return {
      intent: "create_invoice",
      params: {
        title: invoiceMatch[1].trim(),
        amount: invoiceMatch[2]?.replace(/,/g, "") ?? "",
      },
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

  // Use template: "use template follow-up for John"
  const templateMatch = msg.match(
    /(?:use|send)\s+template\s+(.+?)(?:\s+(?:for|to)\s+(.+))?$/
  );
  if (templateMatch) {
    return {
      intent: "use_template",
      params: {
        templateName: templateMatch[1].trim(),
        contactQuery: templateMatch[2]?.trim() ?? "",
      },
    };
  }

  // Show templates
  if (msg.match(/(?:show|list)\s+templates?/)) {
    return { intent: "show_templates", params: {} };
  }

  // Find duplicates
  if (msg.match(/(?:find|show|check)\s+(?:duplicate|dupe|dup)s?/)) {
    return { intent: "find_duplicates", params: {} };
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
 * Get industry-specific context for chat responses.
 */
function getIndustryContext(industryType: string | null) {
  if (industryType === "TRADES") {
    return {
      dealLabel: "job",
      dealsLabel: "jobs",
      contactLabel: "client",
      stageLabels: { NEW: "New Lead", CONTACTED: "Quoted", NEGOTIATION: "In Progress", INVOICED: "Invoiced", WON: "Paid", LOST: "Lost" },
      helpExtras: `  "Start day" — Open map and route\n  "Invoice [job] for [amount]" — Generate an invoice\n  "Show stale jobs" — Find jobs that need follow-up`,
      greeting: "G'day! Here's your job summary",
      unknownFallback: `I didn't quite catch that. Try "help" to see what I can do, or ask me things like "start day" or "new job Kitchen Reno for Smith worth 8000".`,
    };
  }
  if (industryType === "REAL_ESTATE") {
    return {
      dealLabel: "listing",
      dealsLabel: "listings",
      contactLabel: "buyer",
      stageLabels: { NEW: "New Listing", CONTACTED: "Appraised", NEGOTIATION: "Under Offer", INVOICED: "Exchanged", WON: "Settled", LOST: "Withdrawn" },
      helpExtras: `  "Start open house" — Launch kiosk mode\n  "Find matches for [listing]" — Run buyer matchmaker\n  "Show stale listings" — Find listings that need attention`,
      greeting: "Good morning! Here's your pipeline summary",
      unknownFallback: `I didn't quite catch that. Try "help" to see what I can do, or ask me things like "start open house" or "new listing 42 Ocean Dr for $1,200,000".`,
    };
  }
  // Default/generic
  return {
    dealLabel: "deal",
    dealsLabel: "deals",
    contactLabel: "contact",
    stageLabels: { NEW: "New", CONTACTED: "Contacted", NEGOTIATION: "Negotiation", INVOICED: "Invoiced", WON: "Won", LOST: "Lost" },
    helpExtras: `  "Invoice [deal] for [amount]" — Generate invoice\n  "Show templates" — List message templates`,
    greeting: "Good morning! Here's your briefing",
    unknownFallback: `I didn't quite catch that. Try "help" to see what I can do, or ask me things like "show stale deals" or "new deal Website Redesign for Acme worth 5000".`,
  };
}

/**
 * Process a chat message and execute CRM actions.
 * This is the primary interface — users message the chatbot
 * and the system updates the CRM automatically.
 *
 * Responses are industry-context-aware: trades users see "jobs",
 * real estate users see "listings", etc.
 */
export async function processChat(
  message: string,
  workspaceId: string
): Promise<ChatResponse> {
  // Persist user message
  await db.chatMessage.create({
    data: {
      role: "user",
      content: message,
      workspace: { connect: { id: workspaceId } }
    },
  });

  // Fetch workspace to get industry context
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { industryType: true },
  });
  const ctx = getIndustryContext(workspace?.industryType ?? null);

  const { intent, params } = parseCommand(message);

  let response: ChatResponse;

  switch (intent) {
    case "start_day": {
      // Trigger "Advanced Mode" (Map/Canvas)
      const digest = await generateMorningDigest(workspaceId);
      response = {
        message: `Good morning! I've switched you to map view. You have ${digest.items.length} items on your agenda today.`,
        action: "start_day",
        data: { digest }
      };
      break;
    }

    case "start_open_house": {
      // Trigger "Kiosk Mode"
      response = {
        message: "Starting Open House mode. Good luck with the inspection!",
        action: "start_open_house"
      };
      break;
    }

    case "show_deals": {
      const deals = await getDeals(workspaceId);
      const byStage = deals.reduce<Record<string, number>>((acc, d) => {
        const label = ctx.stageLabels[d.stage.toUpperCase() as keyof typeof ctx.stageLabels] ?? d.stage;
        acc[label] = (acc[label] ?? 0) + 1;
        return acc;
      }, {});
      const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

      response = {
        message: `You have ${deals.length} ${ctx.dealsLabel} worth $${totalValue.toLocaleString()} total.\n\n${Object.entries(byStage)
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
        response = { message: `All ${ctx.dealsLabel} are healthy. No stale or rotting ${ctx.dealsLabel}.` };
      } else {
        const lines = stale.map(
          (d) =>
            `  ${d.health.status === "ROTTING" ? "!!" : "!"} ${d.title} ($${d.value.toLocaleString()}) — ${d.health.daysSinceActivity}d without activity`
        );
        response = {
          message: `${stale.length} ${ctx.dealLabel}(s) need attention:\n\n${lines.join("\n")}`,
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
          ? `${ctx.dealLabel.charAt(0).toUpperCase() + ctx.dealLabel.slice(1)} "${params.title}" created${params.value !== "0" ? ` worth $${Number(params.value).toLocaleString()}` : ""}. Added to ${ctx.stageLabels.NEW} column.`
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

    case "create_invoice": {
      const deals = await getDeals(workspaceId);
      const deal = deals.find((d) =>
        d.title.toLowerCase().includes(params.title.toLowerCase())
      );

      if (!deal) {
        response = { message: `Couldn't find a deal matching "${params.title}".` };
        break;
      }

      // Determine amount: override from command, or use deal value
      const amount = params.amount ? Number(params.amount) : deal.value;

      if (amount <= 0) {
        response = { message: `Deal "${deal.title}" has no value. Please specify an amount: "invoice ${deal.title} for 5000"` };
        break;
      }

      // Generate quote/invoice
      const result = await generateQuote(deal.id, [
        { desc: "Services Rendered", price: amount }
      ]);

      if (result.success) {
        response = {
          message: `Invoice ${result.invoiceNumber} generated for $${result.total?.toLocaleString()}. Deal moved to Invoiced.`,
          action: "create_invoice",
          data: { invoiceNumber: result.invoiceNumber, total: result.total }
        };
      } else {
        response = { message: `Failed to generate invoice: ${result.error}` };
      }
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

    case "use_template": {
      const templates = await getTemplates(workspaceId);
      const match = templates.find((t) =>
        t.name.toLowerCase().includes(params.templateName.toLowerCase())
      );

      if (!match) {
        response = {
          message: `No template found matching "${params.templateName}". Try "show templates" to see available options.`,
        };
        break;
      }

      // If a contact was specified, look them up for variable substitution
      const values: Record<string, string> = {};
      if (params.contactQuery) {
        const contacts = await searchContacts(workspaceId, params.contactQuery);
        if (contacts[0]) {
          values.contactName = contacts[0].name;
          values.companyName = contacts[0].company ?? "";
        }
      }

      const rendered = await renderTemplate(match.id, values);
      if (!rendered) {
        response = { message: "Failed to render template." };
        break;
      }

      response = {
        message: `Template "${match.name}":\n${rendered.subject ? `Subject: ${rendered.subject}\n\n` : ""}${rendered.body}`,
        action: "use_template",
        data: { templateId: match.id, rendered },
      };
      break;
    }

    case "show_templates": {
      const templates = await getTemplates(workspaceId);
      if (templates.length === 0) {
        response = { message: "No templates yet. Templates will be created when your workspace is set up." };
      } else {
        const lines = templates.map((t) => `  ${t.name} (${t.category})`);
        response = {
          message: `You have ${templates.length} template(s):\n\n${lines.join("\n")}\n\nUse: "use template [name] for [contact]"`,
          action: "show_templates",
          data: { templates },
        };
      }
      break;
    }

    case "find_duplicates": {
      const dupes = await findDuplicateContacts(workspaceId);
      if (dupes.length === 0) {
        response = { message: "No duplicate contacts found. Your contact list is clean!" };
      } else {
        const lines = dupes.map(
          (g) =>
            `  ${g.contacts.map((c) => c.name).join(" & ")} — matched by ${g.reason} (${Math.round(g.confidence * 100)}%)`
        );
        response = {
          message: `Found ${dupes.length} potential duplicate group(s):\n\n${lines.join("\n")}`,
          action: "find_duplicates",
          data: { duplicates: dupes },
        };
      }
      break;
    }

    case "help":
      response = {
        message: `Here's what I can do:\n
  "Show me ${ctx.dealsLabel}" — View your pipeline
  "Show stale ${ctx.dealsLabel}" — Find neglected ${ctx.dealsLabel}
  "New ${ctx.dealLabel} [title] for [${ctx.contactLabel}] worth [amount]" — Create a ${ctx.dealLabel}
  "Move [${ctx.dealLabel}] to [stage]" — Update pipeline
  "Log call/email/note [details]" — Record activity
  "Find [name]" — Search ${ctx.contactLabel}s (fuzzy)
  "Add contact [name] [email]" — Create ${ctx.contactLabel} (auto-enriches)
  "Remind me to [task]" — Create a follow-up
  "Morning digest" — Today's priority briefing
  "Show templates" — List message templates
  "Use template [name] for [${ctx.contactLabel}]" — Render a template
  "Find duplicates" — Check for duplicate ${ctx.contactLabel}s
${ctx.helpExtras}`,
      };
      break;

    default:
      response = {
        message: ctx.unknownFallback,
      };
  }

  // Persist assistant response
  await db.chatMessage.create({
    data: {
      role: "assistant",
      content: response.message,
      workspaceId,
      metadata: response.data ? JSON.parse(JSON.stringify(response.data)) : undefined,
    },
  });

  return response;
}

/**
 * Get chat history for a workspace.
 */
export async function getChatHistory(workspaceId: string, limit = 50) {
  return db.chatMessage.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
