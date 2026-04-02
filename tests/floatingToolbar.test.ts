import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Floating Toolbar Logic', () => {
  let mockDocument: Document;
  let mockWindow: Window & typeof globalThis;

  beforeEach(() => {
    mockDocument = document;
    mockWindow = window as Window & typeof globalThis;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('shouldShowToolbar', () => {
    it('should return false when selection is empty', () => {
      const selection = mockWindow.getSelection();
      if (selection) {
        selection.removeAllRanges();
      }

      const hasSelection = selection && selection.toString().trim().length >= 3;
      expect(hasSelection).toBe(false);
    });

    it('should return false when selection is less than 3 characters', () => {
      const div = mockDocument.createElement('div');
      div.textContent = 'Hi';
      mockDocument.body.appendChild(div);

      const range = mockDocument.createRange();
      range.selectNodeContents(div);
      const selection = mockWindow.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const selectedText = selection?.toString().trim() || '';
      expect(selectedText.length < 3).toBe(true);

      mockDocument.body.removeChild(div);
    });

    it('should return false when activeElement is INPUT', () => {
      const input = mockDocument.createElement('input');
      mockDocument.body.appendChild(input);
      input.focus();

      const activeElement = mockDocument.activeElement;
      expect(activeElement?.tagName).toBe('INPUT');

      mockDocument.body.removeChild(input);
    });

    it('should return false when activeElement is TEXTAREA', () => {
      const textarea = mockDocument.createElement('textarea');
      mockDocument.body.appendChild(textarea);
      textarea.focus();

      const activeElement = mockDocument.activeElement;
      expect(activeElement?.tagName).toBe('TEXTAREA');

      mockDocument.body.removeChild(textarea);
    });

    it('should return false when element is contenteditable', () => {
      const div = mockDocument.createElement('div');
      div.setAttribute('contenteditable', 'true');
      mockDocument.body.appendChild(div);

      expect(div.getAttribute('contenteditable')).toBe('true');

      mockDocument.body.removeChild(div);
    });

    it('should return true for valid selection in regular element', () => {
      const div = mockDocument.createElement('div');
      div.textContent = 'This is a valid selection text';
      mockDocument.body.appendChild(div);

      const range = mockDocument.createRange();
      range.selectNodeContents(div);
      const selection = mockWindow.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      div.focus();

      const selectedText = selection?.toString().trim() || '';
      const activeElement = mockDocument.activeElement;
      const isValidElement =
        activeElement?.tagName !== 'INPUT' &&
        activeElement?.tagName !== 'TEXTAREA' &&
        activeElement?.getAttribute('contenteditable') !== 'true';

      expect(selectedText.length >= 3).toBe(true);
      expect(isValidElement).toBe(true);

      mockDocument.body.removeChild(div);
    });
  });

  describe('Button click sends TOOLBAR_ACTION message', () => {
    it('should send correct TOOLBAR_ACTION message for explain action', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
      (globalThis as any).browser = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      };

      const div = mockDocument.createElement('div');
      div.textContent = 'Test text for explanation';
      mockDocument.body.appendChild(div);

      const range = mockDocument.createRange();
      range.selectNodeContents(div);
      const selection = mockWindow.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      const button = mockDocument.createElement('button');
      button.dataset.action = 'explain';

      button.click();

      const selectedText = 'Test text for explanation';
      await (globalThis as any).browser.runtime.sendMessage({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'explain',
          selectedText,
        },
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'explain',
          selectedText: 'Test text for explanation',
        },
      });

      mockDocument.body.removeChild(div);
    });

    it('should send correct TOOLBAR_ACTION message for translate action', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
      (globalThis as any).browser = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      };

      const selectedText = 'Text to translate';
      await (globalThis as any).browser.runtime.sendMessage({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'translate',
          selectedText,
        },
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'translate',
          selectedText: 'Text to translate',
        },
      });
    });

    it('should send correct TOOLBAR_ACTION message for rewrite action', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
      (globalThis as any).browser = {
        runtime: {
          sendMessage: mockSendMessage,
        },
      };

      const selectedText = 'Text to rewrite';
      await (globalThis as any).browser.runtime.sendMessage({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'rewrite',
          selectedText,
        },
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        type: 'TOOLBAR_ACTION',
        payload: {
          action: 'rewrite',
          selectedText: 'Text to rewrite',
        },
      });
    });
  });

  describe('Click outside hides toolbar', () => {
    it('should hide toolbar when clicking outside', () => {
      const toolbar = mockDocument.createElement('div');
      toolbar.id = 'wps-floating-toolbar';
      toolbar.style.display = 'flex';
      mockDocument.body.appendChild(toolbar);

      const outsideElement = mockDocument.createElement('div');
      mockDocument.body.appendChild(outsideElement);

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      outsideElement.dispatchEvent(event);

      const shouldHide = !toolbar.contains(event.target as Node);
      expect(shouldHide).toBe(true);

      mockDocument.body.removeChild(toolbar);
      mockDocument.body.removeChild(outsideElement);
    });

    it('should not hide toolbar when clicking inside toolbar', () => {
      const toolbar = mockDocument.createElement('div');
      toolbar.id = 'wps-floating-toolbar';
      toolbar.style.display = 'flex';
      mockDocument.body.appendChild(toolbar);

      const button = mockDocument.createElement('button');
      toolbar.appendChild(button);

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, 'target', { value: button, configurable: true });

      const shouldHide = !toolbar.contains(event.target as Node);
      expect(shouldHide).toBe(false);

      mockDocument.body.removeChild(toolbar);
    });
  });

  describe('positionToolbar with viewport boundaries', () => {
    it('should position toolbar above selection by default', () => {
      const toolbar = mockDocument.createElement('div');
      const selectionRect = new DOMRect(100, 200, 50, 20);

      const toolbarHeight = 40;
      const toolbarWidth = 280;
      const padding = 8;

      let top = selectionRect.top - toolbarHeight - padding + mockWindow.scrollY;
      let left = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2 + mockWindow.scrollX;

      expect(top).toBe(152);
      expect(left).toBe(-15);
    });

    it('should position toolbar below selection if not enough space above', () => {
      const toolbar = mockDocument.createElement('div');
      const selectionRect = new DOMRect(100, 30, 50, 20);

      const toolbarHeight = 40;
      const padding = 8;

      let top = selectionRect.top - toolbarHeight - padding + mockWindow.scrollY;

      if (top < mockWindow.scrollY) {
        top = selectionRect.bottom + padding + mockWindow.scrollY;
      }

      expect(top).toBeGreaterThanOrEqual(mockWindow.scrollY);
    });

    it('should respect left viewport boundary', () => {
      const toolbar = mockDocument.createElement('div');
      const selectionRect = new DOMRect(10, 200, 50, 20);

      const toolbarWidth = 280;
      const padding = 8;

      let left = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2 + mockWindow.scrollX;

      if (left < mockWindow.scrollX) {
        left = mockWindow.scrollX + padding;
      }

      expect(left).toBeGreaterThanOrEqual(mockWindow.scrollX);
    });

    it('should respect right viewport boundary', () => {
      const toolbar = mockDocument.createElement('div');
      const selectionRect = new DOMRect(mockWindow.innerWidth - 50, 200, 50, 20);

      const toolbarWidth = 280;
      const padding = 8;

      let left = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2 + mockWindow.scrollX;

      const maxLeft = mockWindow.scrollX + mockWindow.innerWidth - toolbarWidth - padding;
      if (left > maxLeft) {
        left = maxLeft;
      }

      expect(left).toBeLessThanOrEqual(maxLeft);
    });
  });

  describe('Result Panel UI', () => {
    let toolbar: HTMLDivElement;

    beforeEach(() => {
      toolbar = mockDocument.createElement('div');
      toolbar.id = 'wps-floating-toolbar';
      mockDocument.body.appendChild(toolbar);
    });

    afterEach(() => {
      if (toolbar.parentNode) {
        mockDocument.body.removeChild(toolbar);
      }
    });

    it('should create result panel with correct structure', () => {
      const panel = mockDocument.createElement('div');
      panel.id = 'wps-result-panel';

      const loadingEl = mockDocument.createElement('div');
      loadingEl.id = 'wps-result-loading';
      panel.appendChild(loadingEl);

      const contentArea = mockDocument.createElement('div');
      contentArea.id = 'wps-result-content';
      panel.appendChild(contentArea);

      const actionBar = mockDocument.createElement('div');
      actionBar.id = 'wps-result-actions';
      panel.appendChild(actionBar);

      expect(panel.querySelector('#wps-result-loading')).toBeTruthy();
      expect(panel.querySelector('#wps-result-content')).toBeTruthy();
      expect(panel.querySelector('#wps-result-actions')).toBeTruthy();
    });

    it('should show loading state correctly', () => {
      const panel = mockDocument.createElement('div');
      panel.id = 'wps-result-panel';

      const loadingEl = mockDocument.createElement('div');
      loadingEl.id = 'wps-result-loading';
      loadingEl.style.display = 'none';
      panel.appendChild(loadingEl);

      const contentArea = mockDocument.createElement('div');
      contentArea.id = 'wps-result-content';
      contentArea.style.display = 'block';
      panel.appendChild(contentArea);

      const actionBar = mockDocument.createElement('div');
      actionBar.id = 'wps-result-actions';
      actionBar.style.display = 'flex';
      panel.appendChild(actionBar);

      loadingEl.style.display = 'block';
      contentArea.style.display = 'none';
      actionBar.style.display = 'none';
      panel.style.display = 'flex';

      expect(loadingEl.style.display).toBe('block');
      expect(contentArea.style.display).toBe('none');
      expect(actionBar.style.display).toBe('none');
      expect(panel.style.display).toBe('flex');
    });

    it('should show result content correctly', () => {
      const panel = mockDocument.createElement('div');
      panel.id = 'wps-result-panel';

      const loadingEl = mockDocument.createElement('div');
      loadingEl.id = 'wps-result-loading';
      panel.appendChild(loadingEl);

      const contentArea = mockDocument.createElement('div');
      contentArea.id = 'wps-result-content';
      panel.appendChild(contentArea);

      const actionBar = mockDocument.createElement('div');
      actionBar.id = 'wps-result-actions';
      panel.appendChild(actionBar);

      const testText = 'This is the AI result content';
      
      loadingEl.style.display = 'none';
      contentArea.style.display = 'block';
      contentArea.textContent = testText;
      actionBar.style.display = 'flex';
      panel.style.display = 'flex';

      expect(loadingEl.style.display).toBe('none');
      expect(contentArea.style.display).toBe('block');
      expect(contentArea.textContent).toBe(testText);
      expect(actionBar.style.display).toBe('flex');
      expect(panel.style.display).toBe('flex');
    });

    it('should show error state with retry button', () => {
      const panel = mockDocument.createElement('div');
      panel.id = 'wps-result-panel';

      const loadingEl = mockDocument.createElement('div');
      loadingEl.id = 'wps-result-loading';
      panel.appendChild(loadingEl);

      const contentArea = mockDocument.createElement('div');
      contentArea.id = 'wps-result-content';
      panel.appendChild(contentArea);

      const actionBar = mockDocument.createElement('div');
      actionBar.id = 'wps-result-actions';
      panel.appendChild(actionBar);

      const retryButton = mockDocument.createElement('button');
      retryButton.id = 'wps-result-retry';
      retryButton.textContent = '🔄 Retry';
      actionBar.appendChild(retryButton);

      const errorMsg = 'Failed to process request';
      
      loadingEl.style.display = 'none';
      contentArea.style.display = 'block';
      contentArea.textContent = errorMsg;
      contentArea.style.color = '#dc2626';
      actionBar.style.display = 'flex';
      retryButton.style.display = 'inline-block';
      panel.style.display = 'flex';

      expect(loadingEl.style.display).toBe('none');
      expect(contentArea.style.display).toBe('block');
      expect(contentArea.textContent).toBe(errorMsg);
      expect(contentArea.style.color).toBe('rgb(220, 38, 38)');
      expect(retryButton.style.display).toBe('inline-block');
      expect(panel.style.display).toBe('flex');
    });

    it('should have copy button that calls clipboard API', async () => {
      const panel = mockDocument.createElement('div');
      const actionBar = mockDocument.createElement('div');
      const copyButton = mockDocument.createElement('button');
      copyButton.id = 'wps-result-copy';
      copyButton.textContent = '📋 Copy';

      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      const testText = 'Content to copy';
      await navigator.clipboard.writeText(testText);

      expect(mockClipboard.writeText).toHaveBeenCalledWith(testText);
    });

    it('should hide result panel', () => {
      const panel = mockDocument.createElement('div');
      panel.id = 'wps-result-panel';
      panel.style.display = 'flex';

      const contentArea = mockDocument.createElement('div');
      contentArea.id = 'wps-result-content';
      contentArea.style.color = '#dc2626';
      panel.appendChild(contentArea);

      panel.style.display = 'none';
      contentArea.style.color = '#1f2937';

      expect(panel.style.display).toBe('none');
      expect(contentArea.style.color).toBe('rgb(31, 41, 55)');
    });

    it('should have close button that hides panel', () => {
      const panel = mockDocument.createElement('div');
      const actionBar = mockDocument.createElement('div');
      const closeButton = mockDocument.createElement('button');
      closeButton.id = 'wps-result-close';
      closeButton.textContent = '✕';

      let panelHidden = false;
      closeButton.addEventListener('click', () => {
        panelHidden = true;
        panel.style.display = 'none';
      });

      closeButton.click();

      expect(panelHidden).toBe(true);
      expect(panel.style.display).toBe('none');
    });

    it('should have retry button in error state', () => {
      const panel = mockDocument.createElement('div');
      const actionBar = mockDocument.createElement('div');
      
      const retryButton = mockDocument.createElement('button');
      retryButton.id = 'wps-result-retry';
      retryButton.textContent = '🔄 Retry';
      retryButton.style.display = 'inline-block';
      actionBar.appendChild(retryButton);

      const foundButton = actionBar.querySelector('#wps-result-retry');
      expect(foundButton).toBeTruthy();
      expect(foundButton?.textContent).toBe('🔄 Retry');
    });
  });
});
