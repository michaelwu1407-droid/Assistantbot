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

const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

// ─── Functions ──────────────────────────────────────────────────────

/** Capitalise each word: "sally jane" → "Sally Jane" */
export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Result of parsing a job one-liner (returned by AI parser in lib/ai/job-parser.ts) */
export type JobOneLinerParsed = {
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
};

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
 *  e.g. "12pm ymrw" → "12:00 PM, Sat 15 Feb 2026"
 *
 *  When `timezone` is provided (a valid IANA timezone string such as
 *  "Australia/Sydney"), the resulting `iso` string is anchored to that
 *  timezone so that "10am" means 10am local time, not 10am UTC.
 *  Without `timezone` the function behaves as before (server-local time). */
export function resolveSchedule(raw: string, timezone?: string | null): { display: string; iso: string } {
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
  const targetDate = new Date(now);

  if (dayPart === "today") {
    // already today
  } else if (dayPart === "tomorrow" || dayPart === "tmrw" || dayPart === "ymrw") {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (dayPart in WEEKDAY_INDEX) {
    const targetDay = WEEKDAY_INDEX[dayPart];
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

  // When a workspace timezone is provided, re-anchor the constructed local datetime
  // to that timezone so we store the correct UTC instant. Without this, a Vercel
  // server (UTC) would treat "10am Monday" as 10:00 UTC, showing as 8-9pm in Sydney.
  if (timezone) {
    try {
      // Build a datetime-local string from the local date components that represent
      // the *intended* local wall-clock time (year/month/day/hour/minute in the
      // server's local TZ, which is what targetDate holds).
      const localStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}T${String(targetDate.getHours()).padStart(2, "0")}:${String(targetDate.getMinutes()).padStart(2, "0")}`;
      // parseDateTimeLocalInTimezone is available in lib/timezone — import it lazily
      // to avoid circular dep (chat-utils has no tz imports). We inline the same
      // algorithm here to keep chat-utils free of Node-only deps.
      const match = localStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
      if (match) {
        const [, yr, mo, dy, hh, mm] = match;
        const utcGuess = Date.UTC(Number(yr), Number(mo) - 1, Number(dy), Number(hh), Number(mm), 0, 0);
        const getOffset = (ts: number) => {
          const d = new Date(ts);
          const p = new Intl.DateTimeFormat("en-AU", {
            timeZone: timezone,
            hourCycle: "h23",
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          }).formatToParts(d);
          const lk = Object.fromEntries(p.filter(x => x.type !== "literal").map(x => [x.type, x.value]));
          return Date.UTC(Number(lk.year), Number(lk.month) - 1, Number(lk.day), Number(lk.hour), Number(lk.minute), Number(lk.second)) - ts;
        };
        const offset = getOffset(utcGuess);
        let resolved = utcGuess - offset;
        const adjusted = getOffset(resolved);
        if (adjusted !== offset) resolved = utcGuess - adjusted;
        return { display, iso: new Date(resolved).toISOString() };
      }
    } catch {
      // If timezone computation fails, fall through to return the original ISO
    }
  }

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
    workDescription: titleCase(workDescription),
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
