import { Agent } from "@convex-dev/agent";
import { createOpenAI } from "@ai-sdk/openai";
import { components } from "../_generated/api";

const CRUSOE_BASE_URL = "https://api.inference.crusoecloud.com/v1/";
const CRUSOE_MODEL = "deepseek-ai/Deepseek-V4-Flash";

const crusoe = createOpenAI({
  baseURL: CRUSOE_BASE_URL,
  apiKey: process.env.CRUSOE_API_KEY,
});

export const insightAgent = new Agent(components.agent, {
  name: "Sortiri Insight Agent",
  languageModel: crusoe.chat(CRUSOE_MODEL as "gpt-4o-mini"),
  instructions: `You are Sortiri Insight Agent.

Sortiri is the timeline layer for AI-native companies.

You analyze company timeline events and insight findings.

Rules:
- Only use provided timeline context and deterministic findings.
- Do not invent facts.
- Be concise.
- Surface the most important operational patterns.
- Explain what seems notable and why.
- Include recommendations only when grounded in the evidence.
- If there is too little data, say so.`,
});
