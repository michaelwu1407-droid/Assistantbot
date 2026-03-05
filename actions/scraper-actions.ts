"use server";

import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const CHAT_MODEL_ID = "gemini-2.0-flash-lite";

export interface ScrapeResult {
  services: { name: string; priceRange?: string; duration?: string }[];
  operatingHours?: string;
  suburbs?: string[];
  negativeScope: string[];   // "We do not service X"
  rawSummary?: string;
  // Enhanced fields for Tracey-Led onboarding
  businessName?: string;
  phone?: string;
  email?: string;
  address?: string;
  tradeType?: string;
  emergencyAvailable?: boolean;
  emergencyHours?: string;
}

// Helper to clean up strings
const sanitizeString = (s?: string) => {
  if (!s) return undefined;
  const trimmed = s.trim();
  return trimmed === "" ? undefined : trimmed;
};

// Helper to clean up arrays and remove duplicates
const sanitizeArray = (arr?: string[]) => {
  if (!arr || !Array.isArray(arr)) return [];
  const cleaned = arr.map(s => s?.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
};

/**
 * Scrape a business website and extract structured intelligence via LLM.
 * This is a lightweight fetch + LLM extraction — no headless browser needed.
 */
export async function scrapeWebsite(
  websiteUrl: string
): Promise<{ success: boolean; data?: ScrapeResult; error?: string }> {
  if (!websiteUrl || !websiteUrl.startsWith("http")) {
    return { success: false, error: "Invalid URL" };
  }

  try {
    // 1. Fetch raw HTML
    const response = await fetch(websiteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TraceyBot/1.0; +https://earlymark.ai)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch: ${response.status}` };
    }

    const html = await response.text();

    // Strip tags to get text content (lightweight approach)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000); // Cap to avoid token overflow

    if (textContent.length < 50) {
      return { success: false, error: "Website content too short to extract" };
    }

    // 2. LLM Extraction
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "AI API key not configured" };
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are a business intelligence extractor for Australian trade/service businesses. Given the text content of a website, extract the following into a JSON object:

1. "businessName": string|null — the business name as shown on the website
2. "phone": string|null — the business phone number (Australian format preferred, e.g. "0412 345 678" or "(02) 1234 5678")
3. "email": string|null — the business contact email
4. "address": string|null — the physical business address or location
5. "tradeType": string|null — the type of trade (e.g. "Plumber", "Electrician", "HVAC Technician")

6. "services": Array of objects { "name": string, "priceRange": string|null, "duration": string|null }
   - Extract all services/jobs they offer
   - Include price ranges if mentioned in AUD (e.g. "$150-$300")
   - Include estimated duration if mentioned (e.g. "1-2 hours")

7. "operatingHours": string|null — their listed operating hours

8. "suburbs": string[]|null — specific suburbs, postcodes, or locations they serve

9. "negativeScope": string[] — things they explicitly say they DO NOT do
   - Look for phrases like "We do not service...", "Not available for...", "Excluding..."
   - Return as clean phrases like "No Gas Fitting", "No Roof Work"

10. "rawSummary": A 2-sentence summary of what this business does.

11. "emergencyAvailable": boolean — true if the business mentions emergency, after-hours, or 24/7 callout services
12. "emergencyHours": string|null — the listed emergency/after-hours availability (e.g. "24/7", "After 5pm weekdays and weekends")

Return ONLY valid JSON. No markdown, no code fences.`,
      prompt: `Extract business intelligence from this website content:\n\n${textContent}`,
    });

    // Parse the LLM response
    const cleaned = result.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw summary
      return {
        success: true,
        data: {
          services: [],
          negativeScope: [],
          rawSummary: sanitizeString(result.text.slice(0, 500)),
        },
      };
    }

    // Sanitize and normalize the extracted data
    const rawServices = Array.isArray(parsed.services) ? parsed.services : [];
    const sanitizedServices = rawServices
      .map((s: any) => ({
        name: sanitizeString(s?.name),
        priceRange: sanitizeString(s?.priceRange),
        duration: sanitizeString(s?.duration),
      }))
      .filter((s: any) => s.name); // Drop services without a name

    return {
      success: true,
      data: {
        services: sanitizedServices,
        operatingHours: sanitizeString(parsed.operatingHours),
        suburbs: sanitizeArray(parsed.suburbs),
        negativeScope: sanitizeArray(parsed.negativeScope),
        rawSummary: sanitizeString(parsed.rawSummary),
        businessName: sanitizeString(parsed.businessName),
        phone: sanitizeString(parsed.phone),
        email: sanitizeString(parsed.email),
        address: sanitizeString(parsed.address),
        tradeType: sanitizeString(parsed.tradeType),
        emergencyAvailable: !!parsed.emergencyAvailable,
        emergencyHours: sanitizeString(parsed.emergencyHours),
      },
    };
  } catch (err) {
    console.error("[Scraper] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Scrape failed",
    };
  }
}
