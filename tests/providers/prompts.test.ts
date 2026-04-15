import { describe, it, expect } from 'vitest';
import {
  AgentRole,
  AGENT_TEMPERATURES,
  getAgentSystemPrompt,
  SUMMARIZATION_SYSTEM_PROMPT
} from '../../providers/prompts';

describe('prompts', () => {
  describe('SUMMARIZATION_SYSTEM_PROMPT', () => {
    it('should be defined and non-empty', () => {
      expect(SUMMARIZATION_SYSTEM_PROMPT).toBeDefined();
      expect(SUMMARIZATION_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should contain JSON structure instructions', () => {
      expect(SUMMARIZATION_SYSTEM_PROMPT).toContain('summary');
      expect(SUMMARIZATION_SYSTEM_PROMPT).toContain('keyPoints');
      expect(SUMMARIZATION_SYSTEM_PROMPT).toContain('viewpoints');
      expect(SUMMARIZATION_SYSTEM_PROMPT).toContain('bestPractices');
    });
  });

  describe('AgentRole type', () => {
    it('should accept all valid agent roles', () => {
      const roles: AgentRole[] = [
        'smart-reader',
        'general',
        'analyst',
        'creative',
        'coder'
      ];
      expect(roles).toHaveLength(5);
    });
  });

  describe('AGENT_TEMPERATURES', () => {
    it('should be defined', () => {
      expect(AGENT_TEMPERATURES).toBeDefined();
    });

    it('should have all 5 roles defined', () => {
      const roles: AgentRole[] = ['smart-reader', 'general', 'analyst', 'creative', 'coder'];
      roles.forEach(role => {
        expect(AGENT_TEMPERATURES[role]).toBeDefined();
      });
    });

    it('should have correct temperature values', () => {
      expect(AGENT_TEMPERATURES['smart-reader']).toBe(0.4);
      expect(AGENT_TEMPERATURES['general']).toBe(0.7);
      expect(AGENT_TEMPERATURES['analyst']).toBe(0.3);
      expect(AGENT_TEMPERATURES['creative']).toBe(0.85);
      expect(AGENT_TEMPERATURES['coder']).toBe(0.2);
    });

    it('should have temperatures in valid range (0-1)', () => {
      Object.values(AGENT_TEMPERATURES).forEach(temp => {
        expect(temp).toBeGreaterThanOrEqual(0);
        expect(temp).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('getAgentSystemPrompt', () => {
    it('should be defined', () => {
      expect(getAgentSystemPrompt).toBeDefined();
      expect(typeof getAgentSystemPrompt).toBe('function');
    });

    it('should return a string for each valid role', () => {
      const roles: AgentRole[] = ['smart-reader', 'general', 'analyst', 'creative', 'coder'];
      roles.forEach(role => {
        const prompt = getAgentSystemPrompt(role);
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });

    it('should return prompts under 200 characters', () => {
      const roles: AgentRole[] = ['smart-reader', 'general', 'analyst', 'creative', 'coder'];
      roles.forEach(role => {
        const prompt = getAgentSystemPrompt(role);
        expect(prompt.length).toBeLessThanOrEqual(200);
      });
    });

    it('should return role-appropriate prompts', () => {
      // smart-reader: should mention reading/comprehension
      expect(getAgentSystemPrompt('smart-reader')).toMatch(/extract|comprehension|structure/i);

      // general: should mention helpful/balanced
      expect(getAgentSystemPrompt('general')).toMatch(/helpful|balanced|friendly/i);

      // analyst: should mention analysis/data
      expect(getAgentSystemPrompt('analyst')).toMatch(/analy|data|logical|objective/i);

      // creative: should mention creative/writing
      expect(getAgentSystemPrompt('creative')).toMatch(/creative|imaginative|explore/i);

      // coder: should mention code/programming
      expect(getAgentSystemPrompt('coder')).toMatch(/code|program|technical/i);
    });

    it('should not hardcode language requirements', () => {
      const roles: AgentRole[] = ['smart-reader', 'general', 'analyst', 'creative', 'coder'];
      roles.forEach(role => {
        const prompt = getAgentSystemPrompt(role);
        expect(prompt).not.toMatch(/请用|in Chinese|in English|language/i);
      });
    });

    it('should return consistent results for same role', () => {
      const role: AgentRole = 'analyst';
      const prompt1 = getAgentSystemPrompt(role);
      const prompt2 = getAgentSystemPrompt(role);
      expect(prompt1).toBe(prompt2);
    });
  });
});
