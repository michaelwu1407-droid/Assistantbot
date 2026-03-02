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
}

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
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return { success: false, error: "AI API key not configured" };
    }

    const google = createGoogleGenerativeAI({ apiKey });
    const result = await generateText({
      model: google(CHAT_MODEL_ID as "gemini-2.0-flash-lite"),
      system: `You are a business intelligence extractor. Given the text content of a trades/service business website, extract the following into a JSON object:

1. "services": Array of objects { "name": string, "priceRange": string|null, "duration": string|null }
   - Extract all services/jobs they offer
   - Include price ranges if mentioned (e.g. "$150-$300")
   - Include estimated duration if mentioned (e.g. "1-2 hours")

2. "operatingHours": string|null — their listed operating hours

3. "suburbs": string[]|null — specific suburbs, postcodes, or locations they serve

4. "negativeScope": string[] — things they explicitly say they DO NOT do
   - Look for phrases like "We do not service...", "Not available for...", "Excluding..."
   - Return as clean phrases like "No Gas Fitting", "No Roof Work"

5. "rawSummary": A 2-sentence summary of what this business does.

Return ONLY valid JSON. No markdown, no code fences.`,
      prompt: `Extract business intelligence from this website content:\n\n${textContent}`,
    });

    // Parse the LLM response
    const cleaned = result.text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: ScrapeResult;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw summary
      return {
        success: true,
        data: {
          services: [],
          negativeScope: [],
          rawSummary: result.text.slice(0, 500),
        },
      };
    }

    return {
      success: true,
      data: {
        services: parsed.services || [],
        operatingHours: parsed.operatingHours || undefined,
        suburbs: parsed.suburbs || undefined,
        negativeScope: parsed.negativeScope || [],
        rawSummary: parsed.rawSummary || undefined,
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
