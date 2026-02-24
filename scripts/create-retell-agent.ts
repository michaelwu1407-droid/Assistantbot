import Retell from "retell-sdk";

/**
 * Script: Create an Earlymark Retell Agent
 *
 * Run with:
 *   npm run retell:create-agent
 *
 * Required env vars:
 *   - RETELL_API_KEY                (Retell API key with webhook badge)
 *   - RETELL_RESPONSE_ENGINE_ID     (Response Engine configured with Gemini 2.5 Flash)
 *   - RETELL_PRIMARY_VOICE_ID       (MiniMax-based custom voice ID in Retell)
 *   - RETELL_FALLBACK_VOICE_ID      (Fallback voice ID, e.g. a Retell native or ElevenLabs voice)
 *
 * Notes on Gemini:
 * - In Retell, you first create a Response Engine that uses Google Gemini as the LLM
 *   (e.g. gemini-2.5-flash). That Response Engine will have an ID like `re_xxx`.
 * - Use that Response Engine ID in RETELL_RESPONSE_ENGINE_ID.
 *
 * Notes on MiniMax TTS:
 * - In Retell, create a Custom Voice that uses MiniMax as the underlying TTS provider.
 * - MiniMax credentials (API key, voice ID, region, etc.) are configured INSIDE Retell,
 *   not in this script. Typically you:
 *     1) Add MiniMax API key and voice parameters in Retell's custom voice config.
 *     2) Retell gives you a `voice_id` for that custom voice.
 *     3) Set that as RETELL_PRIMARY_VOICE_ID here.
 *
 * Fallback Voices:
 * - If MiniMax latency is high or fails, Retell can fall back to another voice.
 * - Configure a Retell native voice ID (e.g. `retell-en-US-amy`) or an ElevenLabs voice
 *   that you've connected in Retell, and set RETELL_FALLBACK_VOICE_ID to that ID.
 *
 * Custom Tool: check_calendar
 * - Retell's tooling is configured primarily in the Retell dashboard.
 * - You can create a Custom Function / Tool named `check_calendar` that calls your
 *   Next.js production endpoint:
 *
 *     POST https://YOUR_PROD_DOMAIN/api/retell/tools/calendar
 *
 * - In the dashboard, define the tool's JSON schema (e.g. `{ \"date\": \"string\", \"workspace_id\": \"string\" }`)
 *   and set it to use HTTP POST to that URL.
 * - This script focuses on creating the agent and wiring it to a Response Engine + voices.
 */

async function main() {
  const apiKey = process.env.RETELL_API_KEY;
  const responseEngineId = process.env.RETELL_RESPONSE_ENGINE_ID;
  const primaryVoiceId = process.env.RETELL_PRIMARY_VOICE_ID;
  const fallbackVoiceId = process.env.RETELL_FALLBACK_VOICE_ID;

  if (!apiKey) {
    throw new Error("RETELL_API_KEY is not set.");
  }
  if (!responseEngineId) {
    throw new Error("RETELL_RESPONSE_ENGINE_ID is not set. Create a Response Engine with Gemini first.");
  }
  if (!primaryVoiceId) {
    throw new Error("RETELL_PRIMARY_VOICE_ID is not set. Create a MiniMax-based custom voice in Retell.");
  }

  const client = new Retell({ apiKey });

  // Create the voice agent.
  const agent = await client.agent.create({
    agent_name: "Earlymark Voice Agent",
    version_description: "Gemini 2.5 Flash + MiniMax TTS for Earlymark CRM.",
    response_engine: {
      type: "retell-llm",
      // This ID must point to a Response Engine configured in Retell
      // that uses Google Gemini (e.g. gemini-2.5-flash) under the hood.
      llm_id: responseEngineId,
    },
    // Primary voice: MiniMax-based custom voice configured in Retell.
    voice_id: primaryVoiceId,
    // Fallback voices: e.g. Retell-native or ElevenLabs voices.
    fallback_voice_ids: fallbackVoiceId ? [fallbackVoiceId] : [],
    // Optionally, if you've created tools / custom functions in Retell,
    // you can associate them here (consult Retell docs for exact field names).
    //
    // For example, once you have a tool with name `check_calendar` configured
    // in the Retell dashboard, you might associate it via a tool ID:
    //
    //   tool_ids: [process.env.RETELL_CHECK_CALENDAR_TOOL_ID!],
    //
    // The actual shape depends on the Retell API; see:
    // https://docs.retellai.com/api-references/create-agent
  } as any);

  console.log("Created Earlymark Retell agent:");
  console.log(JSON.stringify(agent, null, 2));
}

main().catch((err) => {
  console.error("Failed to create Retell agent:", err);
  process.exit(1);
});

