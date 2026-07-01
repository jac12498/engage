import "server-only"
import Anthropic from "@anthropic-ai/sdk"

// Shared Anthropic client. Reads ANTHROPIC_API_KEY from the environment.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
