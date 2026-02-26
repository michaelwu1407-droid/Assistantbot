import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

/** Schema matching the existing JobOneLinerParsed type */
const jobOneLinerSchema = z.object({
  isJobRequest: z
    .boolean()
    .describe(
      "True ONLY if the message describes a job/booking with at least a client name or work description. False for general chat, questions, greetings, or commands."
    ),
  clientName: z
    .string()
    .describe("Client full name (first and last if provided). Return empty string if not found."),
  workDescription: z
    .string()
    .describe(
      "Short job-type label (2-5 words). Use noun or 'to do' form for future work: e.g. 'Sink repair', 'Light repair' — NOT past tense like 'Lights Fixed'. Normalise: fix/fixed → Repair, install → Install, replace → Replacement. Example: 'her sink fixed' → 'Sink repair'."
    ),
  price: z
    .number()
    .describe("Price in whole dollars. 0 if not mentioned."),
  address: z
    .string()
    .nullable()
    .describe("Street address for the job, if mentioned. Null if not."),
  schedule: z
    .string()
    .nullable()
    .describe(
      "When the job is scheduled, in the original short form (e.g. 'tomorrow 12pm', 'monday 3pm', 'today 9am'). Null if not mentioned."
    ),
  phone: z
    .string()
    .nullable()
    .describe(
      "Client phone number if mentioned. Normalise Australian mobiles to digits only (e.g. '0434 955 958' → '0434955958'). Null if not found."
    ),
  email: z
    .string()
    .nullable()
    .describe("Client email address if mentioned. Null if not found."),
});

/**
 * Use Gemini to parse a chat message and determine if it's a job one-liner.
 * Replaces the old regex-based parseJobOneLiner.
 *
 * Returns the parsed job data, or null if the message isn't a job request.
 */
export async function parseJobWithAI(
  text: string
): Promise<{
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
} | null> {
  if (!text || text.trim().length < 10) return null;

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  try {
    const google = createGoogleGenerativeAI({ apiKey });

    const result = await generateObject({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      schema: jobOneLinerSchema,
      system: `You are a job-request detector for an Australian tradie CRM chatbot.

Given a user message, determine if it describes a new job or booking. A job one-liner typically contains:
- A client/customer name
- What work is needed (plumbing, electrical, etc.)
- Optionally: price, address, schedule/time, phone number, email

EXAMPLES OF JOB REQUESTS (isJobRequest = true):
- "Sally Smith, 10 Wyndham Street needs sink fixed tomorrow 12pm for $200. Her number is 0434955958"
- "Fix tap at 45 George Ave for John, $150, Thursday 2pm"
- "Mrs Jones needs her aircon serviced next Monday 9am"
- "Book Dave Thompson for roof repair at 7 Main Rd, tmrw 8am, 0412345678"

EXAMPLES OF NON-JOB MESSAGES (isJobRequest = false):
- "What's my schedule today?"
- "Show me my pipeline"
- "How much did I earn this month?"
- "Text John I'm on my way"
- "Good morning"
- "Undo that"
- "Move the plumbing job to completed"

Be strict: only return isJobRequest=true when the message clearly describes a NEW job to create.`,
      prompt: text,
      maxOutputTokens: 300,
    });

    const parsed = result.object;

    if (!parsed.isJobRequest) return null;
    if (!parsed.clientName && !parsed.workDescription) return null;

    return {
      clientName: parsed.clientName || "Unknown",
      workDescription: parsed.workDescription || "Job",
      price: parsed.price > 0 ? parsed.price : 0,
      address: parsed.address || undefined,
      schedule: parsed.schedule || undefined,
      phone: parsed.phone || undefined,
      email: parsed.email || undefined,
    };
  } catch (error) {
    console.error("[job-parser] AI parsing failed, skipping one-liner detection:", error);
    return null;
  }
}

export type JobOneLinerParsed = {
  clientName: string;
  workDescription: string;
  price: number;
  address?: string;
  schedule?: string;
  phone?: string;
  email?: string;
};

/** One job in the array returned by extractAllJobsFromParagraph */
const extractedJobSchema = z.object({
  clientName: z.string().describe("Client full name (first and last if provided)"),
  workDescription: z.string().describe("Short job-type label (2–5 words). Use noun or 'to do' phrasing for future work, e.g. 'Sink repair', 'Light repair' — NOT past tense like 'Lights Fixed'."),
  price: z.number().describe("Price in whole dollars. 0 if not mentioned."),
  address: z.string().nullable().describe("Street address if mentioned, else null."),
  schedule: z.string().nullable().describe("When (e.g. tomorrow 12pm, monday 3pm) or null."),
  phone: z.string().nullable().describe("Client phone, digits only (e.g. 0434955958), or null."),
  email: z.string().nullable().describe("Client email or null."),
});

/**
 * Extract ALL jobs from a paragraph in one AI call. Works with any format: dashed list,
 * natural language ("Sally needs X. Bob at 32 Annie St wants Y. John..."), or mixed.
 * Anchors each job to the person's name and their details. Returns 0, 1, or more jobs.
 * Does not depend on " - " delimiters.
 */
export async function extractAllJobsFromParagraph(
  text: string
): Promise<JobOneLinerParsed[]> {
  if (!text || text.trim().length < 15) return [];

  const apiKey =
    process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return [];

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateObject({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      schema: z.object({
        jobs: z.array(extractedJobSchema).describe("List of every distinct job/booking in the message. One entry per person/job."),
      }),
      system: `You extract job/bookings from a message for an Australian tradie CRM.

RULES:
- Find EVERY job in the message. Anchor each job to a PERSON'S NAME and that person's details (work, address, price, time, phone, email).
- One job per person. If the message lists "Sally... Bob... John...", return 3 jobs.
- Do NOT invent or infer jobs. Only extract what is clearly stated. If you see "create these jobs" or "log the following", that is instruction text — the actual jobs are the following lines or sentences that each name a person and their job.
- Ignore instruction phrases like "create these jobs", "add these", "log the following". Extract only the real jobs (each with a client name and work description).
- clientName: the person's full name. workDescription: short job-type label (e.g. Sink repair, Light repair, Plumbing replacement). Use present/noun form for work to be done — not past tense (e.g. "Light repair" not "Lights Fixed") since the job is in the future. price: dollars, 0 if not said. address, schedule, phone, email: from the text or null.
- Return an empty array if the message has no jobs (e.g. "what's my schedule?"). Return 1 item for a single job, 2+ for multiple.`,
      prompt: text,
      maxOutputTokens: 800,
    });

    const jobs = result.object.jobs ?? [];
    return jobs
      .filter((j) => (j.clientName?.trim() && j.workDescription?.trim()) || j.clientName?.trim())
      .map((j) => ({
        clientName: (j.clientName || "").trim() || "Unknown",
        workDescription: (j.workDescription || "").trim() || "Job",
        price: typeof j.price === "number" && j.price > 0 ? j.price : 0,
        address: j.address?.trim() || undefined,
        schedule: j.schedule?.trim() || undefined,
        phone: j.phone?.trim() || undefined,
        email: j.email?.trim() || undefined,
      }));
  } catch (error) {
    console.error("[job-parser] extractAllJobsFromParagraph failed:", error);
    return [];
  }
}

/**
 * Detect multiple jobs in one message. Uses paragraph extraction (works with any format).
 * Returns 2+ jobs or null for backward compatibility with callers that expect null.
 */
export async function parseMultipleJobsWithAI(
  text: string
): Promise<JobOneLinerParsed[] | null> {
  const jobs = await extractAllJobsFromParagraph(text);
  return jobs.length >= 2 ? jobs : null;
}
