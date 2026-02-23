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
      "Short job title (2-5 words). Normalise verbs: 'fix/fixed/repair' → 'Repair', 'install/installed' → 'Install', 'replace/replaced' → 'Replacement', 'clean/cleaned' → 'Clean', 'unblock/blocked' → 'Unblock'. Remove possessives (her/his/their/my). Example: 'her sink fixed' → 'Sink Repair'."
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
