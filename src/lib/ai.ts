import Anthropic from "@anthropic-ai/sdk";
import type { AiModerationResult } from "@/types";

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey });
}

export async function moderateComment(
  content: string,
  pageUrl: string,
  siteDomain: string
): Promise<AiModerationResult> {
  const client = getClient();

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    system: `You are a comment moderation AI for websites. Analyze comments and return a JSON response only.

Respond ONLY with valid JSON in this exact format:
{
  "score": <0.0 to 1.0, where 1.0 is completely safe>,
  "label": <"safe" | "spam" | "toxic" | "off-topic" | "low-quality">,
  "reason": <brief explanation in Portuguese, max 100 chars>,
  "decision": <"approve" | "reject" | "review">
}

Guidelines:
- score >= 0.8: approve
- score 0.4-0.79: review (human needed)
- score < 0.4: reject
- spam: promotional, links, repetitive
- toxic: hate speech, harassment, explicit
- off-topic: unrelated to the page content
- low-quality: gibberish, too short, meaningless`,
    messages: [
      {
        role: "user",
        content: `Moderate this comment posted on ${siteDomain} (page: ${pageUrl}):

"${content}"`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]) as AiModerationResult;
  } catch {
    // Fallback: flag for human review
    return {
      score: 0.5,
      label: "safe",
      reason: "Erro ao processar moderação automática",
      decision: "review",
    };
  }
}
