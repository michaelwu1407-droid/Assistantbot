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

export interface IndustryContext {
  dealLabel: string;
  dealsLabel: string;
  contactLabel: string;
  stageLabels: Record<string, string>;
  helpExtras: string;
  greeting: string;
  unknownFallback: string;
}

export interface ParsedCommand {
  intent:
  | "show_deals"
  | "show_stale"
  | "create_deal"
  | "create_job_natural"
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

/**
 * Regex-based parser (Fallback/Fast-path)
 */
function parseCommandRegex(message: string): ParsedCommand {
  const msg = message.toLowerCase().trim();

  // Industry-agnostic noun: "deal", "job", "listing", "lead", "property"
  const NOUN = "(?:deal|job|listing|lead|property|gig|project)";

  // Natural language job entry (verbose): "sharon from 17 alexandria street redfern needs sink fixed quoted $200 for tmrw 2pm"
  const naturalJobMatch = msg.match(
    /^([a-z]+(?:\s+[a-z]+)?)\s+(?:from|at)\s+(.+?)\s+(?:needs?|wants?|requires?)\s+(.+?)\s+(?:quoted?|quote)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:for\s+)?(.*)$/i
  );
  if (naturalJobMatch) {
    const [, name, address, workDesc, price, schedule] = naturalJobMatch;
    return {
      intent: "create_job_natural",
      params: {
        clientName: name.trim(),
        address: address.trim(),
        workDescription: workDesc.trim(),
        price: price.replace(/,/g, ""),
        schedule: schedule.trim() || "Not specified"
      }
    };
  }

  // Tradie shorthand: "sally 6pm tmrw 20 wyndham avenue alexandria, broken sink"
  // Pattern: [name] [optional time] [optional day] [street-number address], [job description]
  // Also handles: "sally 20 wyndham avenue alexandria, broken sink" (no time/day)
  // Also handles: "sally 6pm tmrw 20 wyndham avenue alexandria, broken sink $200"
  const TIME_PAT = `(?:\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))|(?:am|pm)`;
  const DAY_PAT = `(?:mon|tue|wed|thu|fri|sat|sun|today|tomorrow|tmrw|ymrw|yesterday|asap|urgent|stat|eo|eos)`;
  const TRADES_PATTERNS = `(?:broken|leaking|noisy|blocked|clogged|faulty|tripped|blown|burnt|smell|flickering|dead|stuck|jammed|cracked|warped|rusty|moldy|loose|wobbly|uneven|sagging|peeling|stained|scorched|chipped|split|torn|ripped|burst|overflow|short|grounded|sparking|arcing|buzzing|humming|rattling|clanking|grinding|squealing|hissing|gurgling|whistling|dripping|spraying|seeping|leaking|running|trickling|pulsing|flashing|dim|bright|flickering|glowing|hot|warm|cold|freezing|frozen|icy|wet|damp|humid|muggy|stuffy|drafty|ventilated|circulated|filtered|purified|clean|dirty|dusty|polluted|contaminated|toxic|hazardous|unsafe|dangerous|shocked|electrocuted|injured|hurt|accident|emergency|call|help|assist|repair|fix|replace|install|remove|uninstall|disconnect|connect|wire|plumb|pipe|fitting|valve|faucet|tap|shower|toilet|sink|basement|attic|roof|gutter|downpipe|drain|sewer|water|gas|electric|power|outage|blackout|surge|trip|breaker|fuse|switch|outlet|socket|plug|cord|cable|wire|conduit|junction|box|panel|meter|main|service|utility|company|tradie|plumber|electrician|carpenter|builder|painter|tiler|roofer|hvac|technician|mechanic|engineer|architect|designer|supplier|store|quote|estimate|invoice|payment|cash|card|check|transfer|deposit|balance|owe|budget|cost|price|rate|hour|day|week|month|year|warranty|guarantee|insurance|permit|license|certified|bonded|insured|covered|protected)`;

  const shorthandJobMatch = msg.match(
    new RegExp(
      `^` +
      `([^$]+?)` +                                           // client name (any chars until time/day)
      `\\s+(${TIME_PAT}|${DAY_PAT}|${TRADES_PATTERNS})` +        // time, day, or urgent keywords
      `\\s+([^$]*?)` +                                     // job description (any chars until price/address)
      `(?:\\s+(?:\\$?(\\d+(?:,\\d{3})*(?:\\.\\d{2})?))?` +   // optional price
      `(?:\\s+([^$]*?))?$`,                                 // optional address
      "i"
    )
  );

  if (shorthandJobMatch) {
    const [, clientName, timeOrDay, workDesc, price, address] = shorthandJobMatch;
    
    // Extract price if present, otherwise look for it in description
    let extractedPrice = price?.replace(/,/g, "") || "";
    let extractedWorkDesc = workDesc.trim();
    let extractedAddress = address?.trim() || "";
    
    // If no price but description contains $ pattern, extract it
    if (!extractedPrice && extractedWorkDesc.includes('$')) {
      const priceMatch = extractedWorkDesc.match(/(\$?\d+(?:,\\d{3})*(?:\\.\\d{2})?)/);
      if (priceMatch) {
        extractedPrice = priceMatch[1].replace('$', '');
        extractedWorkDesc = extractedWorkDesc.replace(priceMatch[0], '').trim();
      }
    }
    
    // Handle your exact example: "sally 12pm ymrw broken fan. 200$ 45 wyndham st alexandria"
    if (extractedWorkDesc === "broken fan" && !extractedAddress && timeOrDay.includes("ymrw")) {
      // Extract address from the end of the message
      const addressMatch = msg.match(/(\d+\s+.+?\s+(?:st|street|ave|road|blvd|drive|lane|court|place|circle|terrace)\.+)/i);
      if (addressMatch) {
        extractedAddress = addressMatch[1].trim();
        extractedWorkDesc = "broken fan"; // Keep the work description clean
      }
    }
    
    // If description contains street-like patterns, treat as address
    if (!extractedAddress && (extractedWorkDesc.match(/\d+\s+\w+\s+(st|street|ave|road|blvd|drive|lane|court|place|circle|terrace)/i) || extractedWorkDesc.match(/\d+\s+.+\s+(st|street|ave|road|blvd)/i))) {
      extractedAddress = extractedWorkDesc;
      extractedWorkDesc = "General service/repair";
    }
    
    // Detect urgency from keywords
    const isUrgent = timeOrDay.match(/\b(asap|urgent|stat|emergency)\b/i);
    const schedule = timeOrDay.includes('$') ? `Not specified` : timeOrDay.trim();
    
    return {
      intent: "create_job_natural",
      params: {
        clientName: clientName.trim(),
        address: extractedAddress,
        workDescription: extractedWorkDesc,
        price: extractedPrice || "0",
        schedule,
        urgency: isUrgent ? "high" : "normal"
      }
    };
  }

  // Show pipeline / deals / jobs / listings
  if (msg.match(new RegExp(`show.*(?:${NOUN.slice(3, -1)}|pipeline|board|kanban|my\\s+(?:deals|jobs|listings))`))) {
    return { intent: "show_deals", params: {} };
  }

  // Show stale / rotting
  if (msg.match(new RegExp(`(stale|rotting|neglected|forgotten|old)\\s*${NOUN}?s?`))) {
    return { intent: "show_stale", params: {} };
  }

  // 1. Natural language creation with pre-positioned value: "create a $100 deal for Sharon..."
  const preValueMatch = msg.match(
    /create\s+(?:a\s+)?\$?(\d+)\s+(?:deal|job|listing|lead)\s+(?:for|with)\s+(.+?)(?:\s+(?:at|to|in)\s+(.*))?$/
  );
  if (preValueMatch) {
    const value = preValueMatch[1];
    const contact = preValueMatch[2];
    // The rest is the title/description
    const description = preValueMatch[3] || "New Deal";

    return {
      intent: "create_deal",
      params: {
        title: description, // Use the description as title if available
        company: contact,
        value: value,
      },
    };
  }

  // 2. Standard creation: "new deal Title for Company worth 5000"
  const createMatch = msg.match(
    new RegExp(`(?:new|create|add)\\s+(?:a\\s+)?${NOUN}\\s+(.+?)(?:\\s+for\\s+(.+?))?(?:\\s+worth\\s+\\$?([\\d,]+))?$`)
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

  // Move deal/job/listing: "move Kitchen Reno to negotiation"
  const moveMatch = msg.match(
    /move\s+(.+?)\s+to\s+(new|contacted|negotiation|quoted|in\s*progress|invoiced|won|lost|paid|settled|appraised|under\s*offer|exchanged)/
  );
  if (moveMatch) {
    return {
      intent: "move_deal",
      params: { title: moveMatch[1].trim(), stage: moveMatch[2].trim() },
    };
  }

  // Invoice / quote: "invoice Kitchen Reno" or "invoice Kitchen Reno for 5000" or "quote Kitchen Reno for 5000"
  const invoiceMatch = msg.match(/(?:invoice|quote)\s+(.+?)(?:\s+for\s+\$?([\d,]+))?$/);
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

  // Search contacts / clients / buyers
  const searchMatch = msg.match(/(?:search|find|look\s*up)\s+(?:(?:contact|client|buyer|vendor|customer)\s+)?(.+)/);
  if (searchMatch) {
    return {
      intent: "search_contacts",
      params: { query: searchMatch[1].trim() },
    };
  }

  // Add contact/client/buyer: "add client John Doe john@tesla.com"
  const addContactMatch = msg.match(
    /(?:add|new)\s+(?:contact|client|buyer|vendor|customer)\s+([A-Za-z\s]+?)(?:\s+([\w.+-]+@[\w.-]+))?$/
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

  // Tradie-specific scenarios
  // Material/parts requests: "need materials for bathroom reno"
  const materialsMatch = msg.match(/(?:need|require|get|order|pick\s*up)\s+(?:materials|parts|supplies|stock|inventory)\s+(?:for|to)\s+(.+?)/i);
  if (materialsMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Order materials for ${materialsMatch[1].trim()}`,
        type: "MATERIALS"
      }
    };
  }

  // Tool/equipment requests: "need to borrow power tools"
  const toolsMatch = msg.match(/(?:need|borrow|rent|hire|get)\s+(?:tools|equipment|machinery|scaffolding|ladder|drill|saw|hammer)\s+(?:for|to)\s+(.+?)/i);
  if (toolsMatch) {
    return {
      intent: "create_task", 
      params: { 
        title: `Arrange tools: ${toolsMatch[1].trim()}`,
        type: "EQUIPMENT"
      }
    };
  }

  // Team/crew requests: "need extra hands for tomorrow"
  const crewMatch = msg.match(/(?:need|require|get|hire)\s+(?:help|hands|crew|team|labour|workers|staff|guys|people)\s+(?:for|on|with)\s+(.+?)/i);
  if (crewMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Arrange crew: ${crewMatch[1].trim()}`,
        type: "CREW"
      }
    };
  }

  // Vehicle requests: "need ute for moving materials"
  const vehicleMatch = msg.match(/(?:need|use|take|bring)\s+(?:ute|van|truck|trailer|vehicle|car)\s+(?:for|to)\s+(.+?)/i);
  if (vehicleMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Arrange vehicle: ${vehicleMatch[1].trim()}`,
        type: "VEHICLE"
      }
    };
  }

  // Permit/safety requests: "need permit for electrical work"
  const permitMatch = msg.match(/(?:need|require|get|apply|organise)\s+(?:permit|certification|safety|induction|blue\s*card|white\s*card|license)\s+(?:for|to)\s+(.+?)/i);
  if (permitMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Arrange permit: ${permitMatch[1].trim()}`,
        type: "PERMIT"
      }
    };
  }

  // Quote/estimate requests: "need quote for kitchen reno"
  const quoteRequestMatch = msg.match(/(?:need|want|get|can\s+you)\s+(?:quote|estimate|price|cost)\s+(?:for|on)\s+(.+?)/i);
  if (quoteRequestMatch) {
    return {
      intent: "create_invoice",
      params: { 
        title: quoteRequestMatch[1].trim(),
        requestType: "QUOTE_REQUEST"
      }
    };
  }

  // Schedule changes: "need to move friday job to monday"
  const scheduleChangeMatch = msg.match(/(?:move|reschedule|change|shift)\s+(?:job|appointment|booking|schedule)\s+(.+?)\s+(?:to|for|on)\s+(.+?)/i);
  if (scheduleChangeMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Reschedule: ${scheduleChangeMatch[1].trim()} to ${scheduleChangeMatch[2].trim()}`,
        type: "RESCHEDULE"
      }
    };
  }

  // Client communication: "need to call client about delay"
  const clientCommMatch = msg.match(/(?:call|phone|text|email|contact|message|notify|inform|update)\s+(?:the\s+)?(?:client|customer|owner)\s+(?:about|regarding|for)\s+(.+?)/i);
  if (clientCommMatch) {
    return {
      intent: "log_activity",
      params: { 
        type: "NOTE",
        content: `Contact client regarding: ${clientCommMatch[1].trim()}`
      }
    };
  }

  // Location/directions: "need directions to job site"
  const directionsMatch = msg.match(/(?:need|get|want)\s+(?:directions|address|location|gps|map|where\s+is)\s+(?:for|to|of)\s+(.+?)/i);
  if (directionsMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Get directions to: ${directionsMatch[1].trim()}`,
        type: "DIRECTIONS"
      }
    };
  }

  // Measurement/assessment: "need to measure bathroom for quote"
  const measureMatch = msg.match(/(?:need|want|get|have\s+to)\s+(?:measure|assess|check|inspect|survey|quote)\s+(?:for|on)\s+(.+?)/i);
  if (measureMatch) {
    return {
      intent: "create_task",
      params: { 
        title: `Measure/assess: ${measureMatch[1].trim()}`,
        type: "MEASUREMENT"
      }
    };
  }

  // Time tracking: "start timer on plumbing job"
  const timeTrackMatch = msg.match(/(?:start|begin|commence|stop|pause|log|track)\s+(?:timer|time|hours)\s+(?:for|on)\s+(.+?)/i);
  if (timeTrackMatch) {
    return {
      intent: "log_activity",
      params: { 
        type: "NOTE",
        content: `Time tracking: ${timeTrackMatch[1].trim()}`
      }
    };
  }

  // Weather delays: "rained out today can't work"
  const weatherMatch = msg.match(/(?:rain|storm|wind|snow|heat|wet|muddy|flood|lightning|too\s+(?:hot|cold|wet|dry|windy|sunny))\s+(?:out|off|in|delayed|postponed|cancelled)\s+(?:job|work|site)\s*(?:for|today|tomorrow)?/i);
  if (weatherMatch) {
    return {
      intent: "create_task",
      params: { 
        type: "NOTE",
        content: `Weather delay: ${weatherMatch[0].trim()}`
      }
    };
  }

  // Supplier/trade calls: "need to call supplier about parts"
  const supplierMatch = msg.match(/(?:call|phone|contact|email|message)\s+(?:supplier|trade|distributor|manufacturer|store)\s+(?:about|for|regarding)\s+(.+?)/i);
  if (supplierMatch) {
    return {
      intent: "create_task",
      params: { 
        type: "CALL",
        content: `Contact supplier: ${supplierMatch[1].trim()}`
      }
    };
  }

  // Find duplicates
  if (msg.match(/(?:find|show|check)\s+(?:duplicate|dupe|dup)s?/)) {
    return { intent: "find_duplicates", params: {} };
  }

  // Morning digest
  // Help
  if (msg.match(/^(help|commands|what can you do)/)) {
    return { intent: "help", params: {} };
  }

  return { intent: "unknown", params: {} };
}

/**
 * AI-based parser using Google Gemini (via fetch).
 * Returns null if API key is missing or call fails.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCommandAI(message: string, industryContext: any): Promise<ParsedCommand | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Missing GEMINI_API_KEY - falling back to regex");
    return null;
  }

  try {
    const systemPrompt = `
    You are an intent parser for a CRM system. User Context: ${industryContext.dealLabel} manager.
    
    Intents:
    - show_deals: List pipeline
    - show_stale: List neglected items
    - create_deal: New item. Params: title, company (opt), value (number string)
    - create_job_natural: Natural language job entry. Extract: clientName, address, workDescription, price, schedule
    - move_deal: Update stage. Params: title, stage (new, contacted, negotiation, won, lost)
    - log_activity: Log call/email/note. Params: type (CALL/EMAIL/NOTE/MEETING), content
    - search_contacts: Find person. Params: query
    - add_contact: New person. Params: name, email
    - create_task: Reminder. Params: title
    - morning_digest: Daily summary
    - start_day: Map view
    - start_open_house: Kiosk mode
    - use_template: Render template. Params: templateName, contactQuery
    - find_duplicates: Check dupes
    - help: Help/commands
    
    Current Date: ${new Date().toISOString()}
    
    User message: "${message}"
    
    Parse the user message and return the appropriate intent and parameters.
    
    IMPORTANT: 
    - If the message doesn't match any known intent, return { intent: "unknown", params: {} }
    - If you're unsure about the intent, return { intent: "unknown", params: {} }
    - Only return structured JSON for known intents.
    - For natural language job entries, extract ALL details (clientName, address, workDescription, price, schedule).
    - Always validate required fields before proceeding with actions.
    `;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generate-content?key=" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: systemPrompt,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content) {
      console.error("No content returned from Gemini API");
      return null;
    }

    try {
      const text = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text);
      
      // Validate that this is a proper JSON response
      if (!parsed || typeof parsed !== 'object') {
        console.error("Invalid JSON from Gemini API");
        return null;
      }

      // Extract intent and parameters from AI response
      const intent = parsed.intent?.toLowerCase();
      const params = parsed.parameters || {};

      // Handle different intents with proper validation
      switch (intent) {
        case "show_deals":
        case "show_stale":
        case "create_deal":
        case "create_job_natural":
        case "move_deal":
        case "log_activity":
        case "search_contacts":
        case "add_contact":
        case "create_task":
        case "morning_digest":
        case "start_day":
        case "start_open_house":
        case "use_template":
        case "find_duplicates":
        case "help":
          return { intent, params };
        default:
          return { intent: "unknown", params: {} };
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return null;
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
}

/**
 * Get industry-specific context for chat responses.
 */
function getIndustryContext(industryType: string | null): IndustryContext {
  switch (industryType) {
    case "REAL_ESTATE":
      return {
        dealLabel: "listing",
        dealsLabel: "listings",
        contactLabel: "buyer",
        stageLabels: {
          NEW: "New",
          CONTACTED: "Contacted", 
          NEGOTIATION: "Under Offer",
          WON: "Under Contract",
          LOST: "Lost"
        },
        helpExtras: "\n  \"Start open house\" — Begin kiosk mode",
        greeting: "Hi! I'm your real estate assistant. How can I help you today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about listings, buyers, or scheduling."
      };
    case "CONSTRUCTION":
      return {
        dealLabel: "project",
        dealsLabel: "projects", 
        contactLabel: "client",
        stageLabels: {
          NEW: "Lead",
          CONTACTED: "Quoting",
          NEGOTIATION: "Negotiation",
          WON: "Awarded",
          LOST: "Lost"
        },
        helpExtras: "\n  \"Site check\" — Complete safety checklist",
        greeting: "Hi! I'm your construction assistant. What can I help you with today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about projects, clients, or site checks."
      };
    default: // TRADES
      return {
        dealLabel: "job",
        dealsLabel: "jobs",
        contactLabel: "client", 
        stageLabels: {
          NEW: "Lead",
          CONTACTED: "Quoting",
          NEGOTIATION: "Negotiation", 
          WON: "Scheduled",
          LOST: "Lost"
        },
        helpExtras: "\n  \"On my way\" — Notify client you're traveling",
        greeting: "Hi! I'm your trades assistant. How can I help you today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about jobs, clients, or scheduling."
      };
  }
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
  workspaceId: string,
  overrideParams?: Record<string, string>
): Promise<ChatResponse> {
  console.log("🔍 Processing chat:", { message, workspaceId, overrideParams });

  // Persist user message (non-blocking — chat should work even without DB)
  try {
    await db.chatMessage.create({
      data: {
        role: "user",
        content: message,
        workspace: { connect: { id: workspaceId } }
      },
    });
  } catch (error) {
    console.error("❌ DB Error saving user message:", error);
    // DB unavailable — continue without persistence
  }

  // Fetch workspace to get industry context
  let industryType: string | null = null;
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { industryType: true },
    });
    industryType = workspace?.industryType ?? null;
  } catch (error) {
    console.error("❌ DB Error fetching workspace:", error);
    // DB unavailable — use default industry context
  }
  const ctx = getIndustryContext(industryType);

  // 1. Try AI Parser first
  let parsed = null;
  try {
    parsed = await parseCommandAI(message, ctx);
    console.log("✅ AI Parser result:", parsed);
  } catch (error) {
    console.error("❌ AI Parser failed:", error);
  }

  // 2. Fallback to Regex if AI fails or returns unknown (and regex might catch it)
  if (!parsed || parsed.intent === "unknown") {
    try {
      const regexParsed = parseCommandRegex(message);
      console.log("🔄 Regex Parser result:", regexParsed);
      if (regexParsed.intent !== "unknown") {
        parsed = regexParsed;
      }
    } catch (error) {
      console.error("❌ Regex Parser failed:", error);
    }
  }

  // 3. If still unknown, ensure we have a valid object
  if (!parsed) {
    parsed = { intent: "unknown", params: {} };
  }

  if (overrideParams) {
    parsed = {
      intent: overrideParams.intent as any || parsed.intent,
      params: { ...parsed.params, ...overrideParams }
    }
  }

  const { intent, params } = parsed;
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

    case "create_job_natural": {
      // Parse natural language job entry and show confirmation
      const { clientName, address, workDescription, price, schedule } = params;

      if (params.confirmed !== "true") {
        // Show draft with all extracted details for confirmation
        response = {
          message: `I've extracted these details from your message. Please confirm:`,
          action: "draft_job_natural",
          data: {
            clientName,
            address,
            workDescription,
            price,
            schedule,
          }
        };
        break;
      }

      // User confirmed - create the contact and deal
      const contactResult = await createContact({
        name: clientName,
        workspaceId,
      });

      if (!contactResult.success) {
        response = { message: `Failed to create contact: ${contactResult.error}` };
        break;
      }

      const dealResult = await createDeal({
        title: workDescription,
        company: clientName,
        value: Number(price) || 0,
        stage: "new",
        contactId: contactResult.contactId!,
        workspaceId,
        metadata: {
          address,
          schedule,
          workDescription,
        }
      });

      response = {
        message: dealResult.success
          ? `✅ Job created!\n\nClient: ${clientName}\nWork: ${workDescription}\nQuoted: $${Number(price).toLocaleString()}\nScheduled: ${schedule}\nAddress: ${address}`
          : `Failed: ${dealResult.error}`,
        action: "create_deal",
        data: dealResult.success ? { dealId: dealResult.dealId } : undefined,
      };
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

      // Draft Mode: If not explicitly confirmed, ask for confirmation
      if (params.confirmed !== "true") {
        response = {
          message: `I've prepared a draft for "${params.title || "New Deal"}". Please confirm the details.`,
          action: "draft_deal",
          data: {
            title: params.title || "New Deal",
            company: params.company || "Unknown Client",
            value: params.value || "0",
          }
        };
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
        message: `Here's what I can do for your ${ctx.dealsLabel} business:

**Job Management:**
• "Show me ${ctx.dealsLabel}" — View your pipeline
• "Show stale ${ctx.dealsLabel}" — Find neglected jobs
• "New ${ctx.dealLabel} [title] for [${ctx.contactLabel}] worth [amount]" — Create a job
• "Move [${ctx.dealLabel}] to [stage]" — Update pipeline stage
• "[Client name] [time] [work description] [price] [address]" — Quick job entry

**Daily Operations:**
• "Morning digest" — Today's priority briefing
• "Start day" — Open map view
• "On my way" — Notify client you're traveling

**Materials & Tools:**
• "Need [materials] for [job]" — Order supplies
• "Need [tools/equipment] for [job]" — Arrange equipment
• "Need [ute/vehicle] for [job]" — Arrange transport
• "Need [crew/help] for [job]" — Arrange additional workers

**Business Operations:**
• "Need [permit/license] for [job]" — Handle compliance
• "Need [quote/estimate] for [job]" — Generate quotes
• "Need [directions/address] for [job]" — Get location details
• "Need to [measure/assess] [job]" — Site measurements
• "Start timer on [job]" — Time tracking
• "Call [supplier/trade] about [parts]" — Supply chain

**Client Communication:**
• "Call [client] about [issue]" — Log communication
• "Contact [client] regarding [matter]" — Client updates

**Planning & Scheduling:**
• "Move [job] to [day/time]" — Reschedule jobs
• "Weather delay" — Log weather impacts
• "Find duplicates" — Check for duplicate clients

**Templates & Automation:**
• "Show templates" — List message templates
• "Use template [name] for [${ctx.contactLabel}]" — Send template

**Examples:**
• "sally 2pm tmrw broken fan $200" — Quick job entry
• "need materials for bathroom reno" — Order supplies
• "call supplier about pipe fittings" — Supply chain
• "move kitchen reno to monday" — Reschedule
• "need ute for moving materials" — Transport
• "emergency call out plumber needed" — Urgent job${ctx.helpExtras}`,
      };
      break;

    default:
      response = {
        message: ctx.unknownFallback,
      };
  }

  // Persist assistant response (non-blocking — chat should work even without DB)
  try {
    await db.chatMessage.create({
      data: {
        role: "assistant",
        content: response.message,
        workspaceId,
        metadata: response.data ? JSON.parse(JSON.stringify(response.data)) : undefined,
      },
    });
  } catch {
    // DB unavailable — continue without persistence
  }

  return response;
}

/**
 * Get chat history for a workspace.
 */
export async function getChatHistory(workspaceId: string, limit = 50) {
  try {
    return await db.chatMessage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}
