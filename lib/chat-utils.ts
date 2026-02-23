/**
 * Pure utility functions for chatbot parsing and enrichment.
 * Extracted from chat-actions.ts for testability and reuse.
 */

// ─── Constants ──────────────────────────────────────────────────────

export const WORK_CATEGORIES: Record<string, string[]> = {
  "Plumbing": ["sink", "tap", "toilet", "shower", "pipe", "drain", "water", "leak", "plumb", "faucet", "valve", "sewer", "gutter", "downpipe", "blocked", "clogged", "burst", "dripping", "seeping", "trickling", "overflow", "gurgling"],
  "Electrical": ["fan", "light", "switch", "outlet", "power", "wire", "fuse", "breaker", "socket", "plug", "cable", "panel", "meter", "tripped", "sparking", "flickering", "buzzing", "outage", "blackout", "electric"],
  "HVAC": ["aircon", "air con", "heating", "cooling", "ventilation", "duct", "refrigerant", "split system", "thermostat", "humid", "stuffy", "drafty", "freezing", "hvac"],
  "Carpentry": ["door", "window", "frame", "cabinet", "shelf", "timber", "wood", "warped", "jammed", "stuck", "cracked", "split"],
  "Roofing": ["roof", "gutter", "flashing", "leak", "sagging", "colorbond"],
  "Painting": ["paint", "stain", "peeling", "chipped", "coat", "primer"],
  "Tiling": ["tile", "grout", "mosaic", "splashback"],
  "General": [],
};

export const STREET_ABBREVS: Record<string, string> = {
  "st": "Street", "ave": "Avenue", "rd": "Road", "blvd": "Boulevard",
  "dr": "Drive", "ln": "Lane", "ct": "Court", "pl": "Place",
  "cres": "Crescent", "tce": "Terrace", "hwy": "Highway", "pde": "Parade",
  "cl": "Close", "cir": "Circle", "way": "Way",
};

export const DAY_ABBREVS: Record<string, string> = {
  "tmrw": "tomorrow", "ymrw": "tomorrow", "eo": "end of day", "eos": "end of shift",
  "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday",
  "fri": "Friday", "sat": "Saturday", "sun": "Sunday",
  "today": "today", "tomorrow": "tomorrow", "asap": "ASAP", "urgent": "URGENT", "stat": "STAT",
};

// ─── Functions ──────────────────────────────────────────────────────

/** Capitalise each word: "sally jane" → "Sally Jane" */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Result of parsing a job one-liner */
export type JobOneLinerParsed = {
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
};

/**
 * Detect if message looks like a job one-liner and parse out client, work, price, address, schedule, phone.
 * Handles these common tradie patterns:
 *   "Sally Smith, 10 Wyndham Street needs her sink fixed tomorrow 12pm for $123. Her number is 0434955958"
 *   "Sally Smith at 10 Wyndham Street needs sink fixed tomorrow 12pm $123"
 *   "Fix sink at 10 Wyndham St for Sally Smith, tomorrow 2pm, $200"
 * Returns null if it doesn't look like a job or parsing fails.
 */
export function parseJobOneLiner(text: string): JobOneLinerParsed | null {
  const t = text.trim();
  if (t.length < 15) return null;

  // ── Extract price ──
  const hasPrice = /\$\s*[\d,]+/i.test(t) || /\b\d{2,}\s*(dollars?|price|agreed)\b/i.test(t) || /(?:for|price|agreed)\s*\$?\s*[\d,]+/i.test(t);
  const hasWork =
    /\b(need|needs|fix|fixed|repair|install|replace|unblock|clean|patch|service|check)\b/i.test(t) ||
    /\b(sink|tap|toilet|shower|pipe|drain|fan|light|switch|door|window|roof|tile|aircon|paint|leak)\b/i.test(t);
  if (!hasPrice && !hasWork) return null;

  let price = 0;
  const dollarMatches = [...t.matchAll(/\$\s*([\d,]+)/g)];
  if (dollarMatches.length > 0) {
    const lastMatch = dollarMatches[dollarMatches.length - 1][1];
    price = parseInt(lastMatch.replace(/,/g, ""), 10);
  }
  if (!price) {
    const forMatch = t.match(/(?:for|price|agreed)\s*\$?\s*([\d,]+)/i);
    if (forMatch) price = parseInt(forMatch[1].replace(/,/g, ""), 10);
  }

  // ── Extract phone number (AU mobile: 04xx xxx xxx or +614xxxxxxxx) ──
  let phone: string | undefined;
  const phoneMatch = t.match(/(?:\+?61\s*|0)4\d{2}\s*\d{3}\s*\d{3}/);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/\s+/g, "");
  }

  // ── Extract email ──
  let email: string | undefined;
  const emailMatch = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // ── Extract schedule ──
  let schedule: string | undefined;
  // Match patterns like "tomorrow 12pm", "monday at 2pm", "today 9:30am"
  const schedulePatterns = [
    /\b(tomorrow|today|tmrw|ymrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s+(?:on\s+)?(tomorrow|today|tmrw|ymrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i,
    /\b(tomorrow|today|tmrw|ymrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  ];
  for (const pat of schedulePatterns) {
    const m = t.match(pat);
    if (m) {
      schedule = m[0].trim();
      break;
    }
  }

  // ── Extract client name ──
  // Strategy: try multiple common patterns
  let clientName = "";
  let address: string | undefined;
  let workDescription = "Job";

  // Clean text for extraction (remove phone, email, price parts, schedule)
  let cleaned = t;
  if (phone) cleaned = cleaned.replace(phoneMatch![0], "");
  if (email) cleaned = cleaned.replace(emailMatch![0], "");
  // Remove "Her/His number is" type phrases
  cleaned = cleaned.replace(/(?:her|his|their|my)\s+(?:number|phone|mobile|cell)\s+(?:is|:)\s*/gi, "");
  // Remove "for $123" type price references
  cleaned = cleaned.replace(/(?:for|price|agreed)\s*\$\s*[\d,]+/gi, "");
  cleaned = cleaned.replace(/\$\s*[\d,]+/g, "");
  // Remove trailing dots and extra whitespace
  cleaned = cleaned.replace(/\.\s*$/, "").replace(/\s+/g, " ").trim();

  // Pattern 1: "Name, Address needs work" (comma separator)
  const commaPattern = cleaned.match(/^([A-Za-z][A-Za-z'\s]+?),\s*(\d+\s+[A-Za-z].*?)(?:\s+needs?\s+|\s+need\s+|\s+wants?\s+|\s+requires?\s+)/i);
  // Pattern 2: "Name at Address needs work"
  const atPattern = cleaned.match(/^([A-Za-z][A-Za-z'\s]+?)\s+at\s+(\d+\s+[A-Za-z].*?)(?:\s+needs?\s+|\s+need\s+|\s+wants?\s+|\s+requires?\s+)/i);
  // Pattern 3: "Name from Address needs work"
  const fromPattern = cleaned.match(/^([A-Za-z][A-Za-z'\s]+?)\s+from\s+(\d+\s+[A-Za-z].*?)(?:\s+needs?\s+|\s+need\s+|\s+wants?\s+|\s+requires?\s+)/i);
  // Pattern 4: "Name needs work" (no address)
  const nameNeedsPattern = cleaned.match(/^([A-Za-z][A-Za-z'\s]+?)(?:\s+needs?\s+|\s+need\s+|\s+wants?\s+|\s+requires?\s+)/i);

  if (commaPattern) {
    clientName = commaPattern[1].trim();
    address = commaPattern[2].trim();
  } else if (atPattern) {
    clientName = atPattern[1].trim();
    address = atPattern[2].trim();
  } else if (fromPattern) {
    clientName = fromPattern[1].trim();
    address = fromPattern[2].trim();
  } else if (nameNeedsPattern) {
    clientName = nameNeedsPattern[1].trim();
  }

  // ── Extract work description ──
  const needsMatch = cleaned.match(/\b(?:needs?|need|wants?|requires?)\s+(.+)/i);
  if (needsMatch) {
    let workRaw = needsMatch[1].trim();
    // Remove schedule from the work description
    if (schedule) {
      workRaw = workRaw.replace(new RegExp(schedule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim();
    }
    // Remove trailing "for" and extra markers
    workRaw = workRaw
      .replace(/\bfor\s*$/i, "")
      .replace(/\.\s*$/g, "")
      .trim();
    if (workRaw.length >= 2) workDescription = workRaw;
  }

  // Validation: must have a name or work description
  if (!clientName && !hasWork) return null;
  if (!clientName || clientName.length < 2) clientName = "Unknown";

  workDescription = normalizeJobTitle(workDescription);

  return {
    clientName: titleCase(clientName),
    workDescription,
    price: price > 0 ? price : 0,
    address,
    schedule,
    phone,
    email,
  };
}

/**
 * Normalise a raw work description to a short job title (e.g. "her sink fixed" → "Sink Repair").
 */
export function normalizeJobTitle(raw: string): string {
  if (!raw || raw.length < 2) return "Job";
  let s = raw.trim().toLowerCase();
  const possessives = /\b(her|his|their|the|my|our)\s+/gi;
  s = s.replace(possessives, " ").replace(/\s+/g, " ").trim();
  const verbToNoun: Record<string, string> = {
    fixed: "repair", fix: "repair", fixing: "repair", repaired: "repair", repair: "repair",
    leaking: "repair", leak: "repair", blocked: "unblock", unblock: "unblock", unblocked: "unblock",
    install: "install", installed: "install", installing: "install",
    replace: "replacement", replaced: "replacement", replacing: "replacement",
    clean: "clean", cleaned: "clean", cleaning: "clean",
  };
  const words = s.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/\b(needs?|need|wants?|want|get|got|has|have)\b/i.test(w)) continue;
    out.push(verbToNoun[w] ?? w);
  }
  const trimmed = out.join(" ").replace(/\s+/g, " ").trim();
  if (!trimmed) return "Job";
  return titleCase(trimmed);
}

/** Categorise work description by keyword matching */
export function categoriseWork(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [category, keywords] of Object.entries(WORK_CATEGORIES)) {
    if (category === "General") continue;
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return "General";
}

/** Resolve schedule shorthand to a human-readable date string.
 *  e.g. "12pm ymrw" → "12:00 PM, Sat 15 Feb 2026" */
export function resolveSchedule(raw: string): { display: string; iso: string } {
  const parts = raw.trim().split(/\s+/);
  let timePart = "";
  let dayPart = "";

  const skipWords = new Set(["at", "on", "for"]);
  for (const p of parts) {
    const tMatch = p.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (tMatch) {
      let hours = parseInt(tMatch[1]);
      const mins = tMatch[2] || "00";
      const ampm = tMatch[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      timePart = `${hours.toString().padStart(2, "0")}:${mins}`;
    } else if (!skipWords.has(p.toLowerCase())) {
      dayPart = p.toLowerCase();
    }
  }

  const now = new Date();
  let targetDate = new Date(now);

  if (dayPart === "today") {
    // already today
  } else if (dayPart === "tomorrow" || dayPart === "tmrw" || dayPart === "ymrw") {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(dayPart)) {
    const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const targetDay = dayNames.indexOf(dayPart);
    const currentDay = now.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    targetDate.setDate(targetDate.getDate() + daysAhead);
  }

  if (timePart) {
    const [h, m] = timePart.split(":").map(Number);
    targetDate.setHours(h, m, 0, 0);
  }

  const dayOfWeek = targetDate.toLocaleDateString("en-AU", { weekday: "short" });
  const day = targetDate.getDate();
  const month = targetDate.toLocaleDateString("en-AU", { month: "short" });
  const year = targetDate.getFullYear();
  const timeDisplay = timePart
    ? targetDate.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
    : "";
  const display = timeDisplay
    ? `${timeDisplay}, ${dayOfWeek} ${day} ${month} ${year}`
    : `${dayOfWeek} ${day} ${month} ${year}`;

  return { display, iso: targetDate.toISOString() };
}

/** Enrich a raw address: capitalise, expand abbreviations.
 *  e.g. "45 wyndham st alexandria" → "45 Wyndham Street, Alexandria" */
export function enrichAddress(raw: string): string {
  if (!raw || raw === "No address provided") return raw;
  const words = raw.trim().split(/\s+/);
  const enriched: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const lower = words[i].toLowerCase().replace(/[.,]/g, "");
    if (STREET_ABBREVS[lower]) {
      enriched.push(STREET_ABBREVS[lower] + ",");
    } else {
      enriched.push(titleCase(words[i]));
    }
  }
  return enriched.join(" ").replace(/,\s*$/, "");
}

/**
 * Build draft job data from parsed one-liner params (for draft card UI).
 */
export function buildJobDraftFromParams(params: {
  clientName: string;
  workDescription: string;
  price: number | string;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
}): {
  firstName: string;
  lastName: string;
  clientName: string;
  address: string;
  workDescription: string;
  workCategory: string;
  price: string;
  schedule: string;
  scheduleISO: string;
  rawSchedule: string;
  phone: string;
  email: string;
  customerType: string;
} {
  const clientName = (params.clientName ?? "").trim() || "Unknown";
  const workDescription = (params.workDescription ?? "").trim() || "Job";
  const priceStr = String(params.price ?? "0").replace(/,/g, "");
  const address = params.address?.trim() ?? "";
  const rawSchedule = params.schedule?.trim() ?? "";

  const nameParts = titleCase(clientName).split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";
  const category = categoriseWork(workDescription);
  const enrichedAddress = address ? enrichAddress(address) : "";

  let scheduleDisplay = "";
  let scheduleISO = "";
  if (rawSchedule) {
    try {
      const resolved = resolveSchedule(rawSchedule);
      scheduleDisplay = resolved.display;
      scheduleISO = resolved.iso;
    } catch {
      scheduleDisplay = rawSchedule;
      scheduleISO = "";
    }
  }

  return {
    firstName,
    lastName,
    clientName: `${firstName}${lastName ? " " + lastName : ""}`.trim() || "Unknown",
    address: enrichedAddress,
    workDescription: normalizeJobTitle(workDescription),
    workCategory: category,
    price: priceStr,
    schedule: scheduleDisplay,
    scheduleISO,
    rawSchedule,
    phone: params.phone ?? "",
    email: params.email ?? "",
    customerType: "Person",
  };
}
