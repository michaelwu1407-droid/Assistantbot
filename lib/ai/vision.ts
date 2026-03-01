import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const MODEL_ID = "gemini-2.0-flash-lite"

export async function analyzeJobPhoto(photoUrl: string, jobTitle: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return ""

    try {
        const google = createGoogleGenerativeAI({ apiKey })
        const { text } = await generateText({
            model: google(MODEL_ID),
            system: "You are an AI assistant for a tradie/construction business. Analyze the provided photo and write a professional, concise note (1-2 sentences) about what is shown in the context of the job. Focus on the work being done, materials used, or issues found.",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: `Job: ${jobTitle}` },
                        { type: "image", image: photoUrl }
                    ]
                }
            ]
        })
        return text.trim()
    } catch (error) {
        console.error("[vision] Photo analysis failed:", error)
        return ""
    }
}
