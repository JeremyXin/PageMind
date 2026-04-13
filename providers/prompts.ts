/**
 * System prompt for OpenAI summarization
 * Instructs the AI to analyze webpage content and return structured output
 */
export const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert content analyzer. Your task is to analyze webpage content and provide a structured summary.

Analyze the provided content and return a JSON object with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the main content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", ...],
  "viewpoints": [
    {"perspective": "Perspective name", "stance": "Description of stance"}
  ],
  "bestPractices": ["Best practice 1", "Best practice 2", ...]
}

Guidelines:
- summary: Capture the essence of the content in 2-3 sentences
- keyPoints: Extract 3-7 most important points as bullet points
- viewpoints: Identify different perspectives or opinions presented in the content (if any)
- bestPractices: Extract actionable recommendations, tips, or best practices mentioned (if any)
- Respond in the same language as the original content
- If the content doesn't contain viewpoints or best practices, return empty arrays for those fields
- Be objective and factual in your analysis`;

/**
 * Agent role types for specialized AI behaviors
 */
export type AgentRole = 'smart-reader' | 'general' | 'analyst' | 'creative' | 'coder';

/**
 * System prompts for each agent role
 * Each prompt is designed to be under 200 characters and language-agnostic
 */
const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  'smart-reader': 'Extract and structure information accurately. Focus on comprehension, key details, and clear organization. Maintain fidelity to source content.',
  'general': 'Helpful, balanced assistant. Provide clear, accurate information with a friendly tone. Adapt to user needs and context.',
  'analyst': 'Data-driven analytical thinker. Provide objective, logical analysis with evidence-based reasoning. Focus on clarity and precision.',
  'creative': 'Creative and engaging writer. Explore ideas imaginatively while maintaining coherence. Adapt tone to content purpose.',
  'coder': 'Expert programmer. Write clean, runnable code with best practices. Explain technical concepts clearly. Prioritize correctness.'
};

/**
 * Temperature settings for each agent role
 * Lower = more deterministic, Higher = more creative/random
 */
export const AGENT_TEMPERATURES: Record<AgentRole, number> = {
  'smart-reader': 0.4,
  'general': 0.7,
  'analyst': 0.3,
  'creative': 0.85,
  'coder': 0.2
};

/**
 * Get the system prompt for a specific agent role
 * @param role - The agent role to get the prompt for
 * @returns The system prompt string for the specified role
 */
export function getAgentSystemPrompt(role: AgentRole): string {
  return AGENT_SYSTEM_PROMPTS[role];
}
