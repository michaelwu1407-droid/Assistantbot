import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

/**
 * Parses lead data from trade platform email notifications using AI
 */
export async function parseLeadFromEmail(email: {
  from: string;
  subject: string;
  body: string;
  provider: string;
}): Promise<{
  isGenuineLead: boolean;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  jobTitle?: string;
  jobDetails?: any;
  estimatedValue?: string;
  provider: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    console.error("[lead-parser] Missing GEMINI_API_KEY");
    return null;
  }

  const systemPrompt = `You are an AI lead parsing specialist for trade businesses in Australia. 
Extract customer and job details from this trade platform email notification.

IMPORTANT: Return ONLY valid JSON. No explanations, no markdown formatting, no code blocks.

Parse the following information:
- customerName: Full name of the customer
- customerEmail: Email address (if found)
- customerPhone: Phone number (if found, format as +61XXXXXXXXX)
- customerAddress: Full address (if found)
- jobTitle: Brief title for the job (e.g., "Bathroom Renovation", "Electrical Repair")
- jobDetails: Object with job description, urgency, location details
- estimatedValue: Estimated job value (if mentioned)
- isGenuineLead: boolean - true if this appears to be a genuine lead, false if spam/tire-kicker

Genuine lead indicators:
- Specific job details provided
- Contact information complete
- Clear location/address
- Professional tone
- Specific questions about services

Tire-kicker indicators:
- Vague "how much" questions
- No specific details
- Incomplete contact info
- Multiple unrelated requests
- Spam-like content

## EMAIL FROM ${email.provider.toUpperCase()}
From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

## RESPONSE FORMAT
Return JSON only:
{
  "isGenuineLead": boolean,
  "customerName": "string",
  "customerEmail": "string",
  "customerPhone": "string", 
  "customerAddress": "string",
  "jobTitle": "string",
  "jobDetails": {
    "description": "string",
    "urgency": "string",
    "location": "string"
  },
  "estimatedValue": "string"
}`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      prompt: systemPrompt,
      maxOutputTokens: 1000,
    });

    const text = result.text?.trim();
    if (!text) return null;

    // Parse JSON response
    const parsedData = JSON.parse(text);
    
    return {
      ...parsedData,
      provider: email.provider,
    };

  } catch (error) {
    console.error("[lead-parser] AI parsing error:", error);
    return null;
  }
}
