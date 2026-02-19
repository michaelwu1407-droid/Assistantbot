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

/** Result of parsing a job one-liner (e.g. "Sally at 12 Wyndham St needs sink fixed tomorrow 2pm. $200 agreed") */
export type JobOneLinerParsed = {
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
};

/**
 * Detect if message looks like a job one-liner and parse out client, work, price, address, schedule.
 * Returns null if it doesn't look like a job or parsing fails.
 */
export function parseJobOneLiner(text: string): JobOneLinerParsed | null {
  const t = text.trim();
  if (t.length < 15) return null;
  const lower = t.toLowerCase();
  const hasPrice = /\$?\s*\d+\s*(dollars?|price|agreed)|price\s*agreed\s*\$?\d+/i.test(t) || /\$\d+/.test(t);
  const hasWork =
    /\b(need|needs|fix|fixed|repair|install|replace|unblock|clean)\b/i.test(t) ||
    lower.includes(" at ") ||
    /\b(st|street|rd|road|ave|dr|ln)\b/i.test(t);
  if (!hasPrice || !hasWork) return null;

  let price = 0;
  const priceMatch = t.match(/\$?\s*(\d+)\s*(?:dollars?|price|agreed)?|price\s*agreed\s*\$?\s*(\d+)/i) ?? t.match(/\$(\d+)/);
  if (priceMatch) price = parseInt(priceMatch[1] ?? priceMatch[2] ?? "0", 10);
  if (!price && /\d{2,}/.test(t)) {
    const anyNum = t.match(/\$?(\d{2,})/);
    if (anyNum) price = parseInt(anyNum[1], 10);
  }
  if (price <= 0) return null;

  let clientName = "Unknown";
  let address: string | undefined;
  let workDescription = "Job";
  let schedule: string | undefined;

  const atMatch = t.match(/\b([A-Za-z][A-Za-z\s']+?)\s+at\s+(.+?)(?:\s+needs?\s+|\s+need\s+)/i);
  const fromMatch = t.match(/\b([A-Za-z][A-Za-z\s']+?)\s+from\s+(.+?)(?:\s+needs?\s+|\s+need\s+)/i);
  if (atMatch) {
    clientName = atMatch[1].trim();
    address = atMatch[2].trim();
  } else if (fromMatch) {
    clientName = fromMatch[1].trim();
    address = fromMatch[2].trim();
  } else {
    const nameStart = t.match(/^([A-Za-z][A-Za-z\s']+?)(?:\s+at\s+|\s+from\s+|\s+needs?\s+)/i);
    if (nameStart) clientName = nameStart[1].trim();
  }

  const scheduleMatch = t.match(
    /(?:tomorrow|today|tmrw|ymrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi
  );
  if (scheduleMatch) schedule = scheduleMatch[0].trim();
  else {
    const simpleSchedule = t.match(/(?:tomorrow|today|tmrw|ymrw|\b(?:mon|tue|wed|thu|fri|sat|sun)\b)\s*(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi);
    if (simpleSchedule) schedule = simpleSchedule[0].trim();
  }

  const needsIndex = lower.search(/\s+needs?\s+/);
  if (needsIndex >= 0) {
    const afterNeeds = t.slice(needsIndex).replace(/^\s+needs?\s+/i, "").trim();
    const beforeSchedule = schedule ? afterNeeds.split(schedule)[0].trim() : afterNeeds;
    const beforePrice = beforeSchedule.replace(/\$?\d+.*$/i, "").trim().replace(/\.\s*$/, "");
    workDescription = beforePrice || "Job";
  }

  if (!clientName || clientName.length < 2) clientName = "Unknown";
  if (!workDescription || workDescription.length < 2) workDescription = "Job";

  return { clientName, workDescription, price, address, schedule };
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
