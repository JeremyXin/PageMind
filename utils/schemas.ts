import { z } from 'zod';

/**
 * Zod schema for a viewpoint object
 * Used for structured AI output parsing
 */
export const ViewpointSchema = z.object({
  perspective: z.string().describe('The perspective or role of the viewpoint'),
  stance: z.string().describe('The stance or opinion from this perspective')
});

/**
 * Zod schema for the summary result
 * Compatible with OpenAI's structured outputs response_format
 */
export const SummaryResultSchema = z.object({
  summary: z.string().describe('A concise summary of the webpage content'),
  keyPoints: z.array(z.string()).describe('Key points extracted from the content'),
  viewpoints: z.array(ViewpointSchema).describe('Different perspectives and stances on the content'),
  bestPractices: z.array(z.string()).describe('Best practices or recommendations mentioned')
});

/**
 * Type inferred from SummaryResultSchema
 * Ensures consistency between runtime validation and compile-time types
 */
export type SummaryResultFromSchema = z.infer<typeof SummaryResultSchema>;

/**
 * Type inferred from ViewpointSchema
 */
export type ViewpointFromSchema = z.infer<typeof ViewpointSchema>;

/**
 * JSON Schema representation of SummaryResultSchema
 * Can be used directly with OpenAI's response_format
 */
export const SummaryResultJsonSchema = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'A concise summary of the webpage content'
    },
    keyPoints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Key points extracted from the content'
    },
    viewpoints: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          perspective: {
            type: 'string',
            description: 'The perspective or role of the viewpoint'
          },
          stance: {
            type: 'string',
            description: 'The stance or opinion from this perspective'
          }
        },
        required: ['perspective', 'stance']
      },
      description: 'Different perspectives and stances on the content'
    },
    bestPractices: {
      type: 'array',
      items: { type: 'string' },
      description: 'Best practices or recommendations mentioned'
    }
  },
  required: ['summary', 'keyPoints', 'viewpoints', 'bestPractices']
} as const;
