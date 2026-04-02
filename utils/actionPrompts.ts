import type { ContextMenuActionType } from './types';

/**
 * Returns the appropriate prompt for a given context menu action and selected text.
 *
 * @param action - The context menu action type
 * @param selectedText - The text selected by the user
 * @returns The formatted prompt string for the AI
 */
export function getActionPrompt(action: ContextMenuActionType, selectedText: string): string {
  switch (action) {
    case 'explain':
      return `Explain the following text in detail:\n\n"${selectedText}"`;
    case 'translate':
      return `Translate the following text to Chinese:\n\n"${selectedText}"`;
    case 'rewrite':
      return `Rewrite and improve the following text while preserving its meaning:\n\n"${selectedText}"`;
    default:
      throw new Error(`Unknown action type: ${action}`);
  }
}
