import type { MessageRequest, ContextMenuActionType } from '@/utils/types';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Floating toolbar content script initialized');

    let toolbar: HTMLDivElement | null = null;
    let resultPanel: HTMLDivElement | null = null;
    let selectionChangeTimeout: NodeJS.Timeout | null = null;
    let resultPanelVisible = false;
    let lastAction: string | null = null;
    let lastSelectedText: string | null = null;
    let lastModelName: string = '';

    /**
     * Check if toolbar should be shown for current selection
     */
    function shouldShowToolbar(): boolean {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;

      const selectedText = selection.toString().trim();
      if (selectedText.length < 3) return false;

      // Get the focused element
      const activeElement = document.activeElement;
      if (!activeElement) return false;

      // Don't show in input fields or textareas
      if (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      ) {
        return false;
      }

      return true;
    }

    /**
     * Position toolbar above selection with viewport boundary checks
     */
    function positionToolbar(toolbarEl: HTMLDivElement, selectionRect: DOMRect): void {
      const toolbarHeight = 40;
      const toolbarWidth = toolbarEl.offsetWidth || 220;
      const padding = 8;

      let top = selectionRect.top - toolbarHeight - padding + window.scrollY;
      let left = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2 + window.scrollX;

      // Check top boundary
      if (top < window.scrollY) {
        top = selectionRect.bottom + padding + window.scrollY;
      }

      // Check left boundary
      if (left < window.scrollX) {
        left = window.scrollX + padding;
      }

      // Check right boundary
      const maxLeft = window.scrollX + window.innerWidth - toolbarWidth - padding;
      if (left > maxLeft) {
        left = maxLeft;
      }

      toolbarEl.style.top = `${top}px`;
      toolbarEl.style.left = `${left}px`;

      // Position caret to point at selection center
      const selectionCenterX = selectionRect.left + selectionRect.width / 2 + window.scrollX;
      const toolbarLeft = parseFloat(toolbarEl.style.left);
      const caretOffset = selectionCenterX - toolbarLeft - toolbarWidth / 2;
      // Clamp caret within toolbar bounds
      const clampedOffset = Math.max(-toolbarWidth / 2 + 16, Math.min(toolbarWidth / 2 - 16, caretOffset));
      
      const caretEl = toolbarEl.querySelector('#wps-toolbar-caret') as HTMLDivElement;
      const caretBorderEl = toolbarEl.querySelector('#wps-toolbar-caret-border') as HTMLDivElement;
      if (caretEl) {
        caretEl.style.left = `calc(50% + ${clampedOffset}px)`;
      }
      if (caretBorderEl) {
        caretBorderEl.style.left = `calc(50% + ${clampedOffset}px)`;
      }
    }

    /**
     * Create toolbar element
     */
    function createToolbar(): HTMLDivElement {
      const toolbarEl = document.createElement('div');
      toolbarEl.id = 'wps-floating-toolbar';

      Object.assign(toolbarEl.style, {
        position: 'absolute',
        display: 'none',
        zIndex: '2147483647',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '10px',
        padding: '5px 6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.08)',
        gap: '2px',
        flexDirection: 'row',
        alignItems: 'center',
        backdropFilter: 'blur(8px)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: 'visible',
        transition: 'opacity 0.15s ease, transform 0.15s ease',
      });

      const caretBorder = document.createElement('div');
      caretBorder.id = 'wps-toolbar-caret-border';
      Object.assign(caretBorder.style, {
        position: 'absolute',
        bottom: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: '7px solid rgba(0,0,0,0.08)',
        pointerEvents: 'none',
        zIndex: '-1',
      });
      toolbarEl.appendChild(caretBorder);

      const caret = document.createElement('div');
      caret.id = 'wps-toolbar-caret';
      Object.assign(caret.style, {
        position: 'absolute',
        bottom: '-6px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '6px solid rgba(255,255,255,0.98)',
        pointerEvents: 'none',
      });
      toolbarEl.appendChild(caret);

      const buttons: Array<{ icon: string; label: string; action: ContextMenuActionType }> = [
        { icon: '💡', label: 'Explain', action: 'explain' },
        { icon: '🌐', label: 'Translate', action: 'translate' },
        { icon: '✏️', label: 'Rewrite', action: 'rewrite' },
      ];

      buttons.forEach(({ icon, label, action }, index) => {
        if (index > 0) {
          const divider = document.createElement('div');
          Object.assign(divider.style, {
            width: '1px',
            height: '18px',
            backgroundColor: 'rgba(0,0,0,0.08)',
            margin: '0 2px',
            flexShrink: '0',
          });
          toolbarEl.appendChild(divider);
        }

        const button = document.createElement('button');
        button.textContent = `${icon} ${label}`;
        button.dataset.action = action;

        Object.assign(button.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px 9px',
          backgroundColor: 'transparent',
          color: '#374151',
          border: 'none',
          borderRadius: '6px',
          fontSize: '12.5px',
          fontWeight: '500',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          lineHeight: '1.4',
          letterSpacing: '0.01em',
          transition: 'background-color 0.15s, color 0.15s',
          outline: 'none',
        });

        button.addEventListener('mouseenter', () => {
          button.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
          button.style.color = '#2563eb';
        });
        button.addEventListener('mouseleave', () => {
          button.style.backgroundColor = 'transparent';
          button.style.color = '#374151';
        });

        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const selection = window.getSelection();
          const selectedText = selection?.toString().trim();

          if (!selectedText) return;

          lastAction = action;
          lastSelectedText = selectedText;

          showResultLoading();
          toolbar!.style.display = 'flex';

          browser.runtime.sendMessage({
            type: 'TOOLBAR_INLINE_ACTION',
            payload: { action, selectedText },
          } as MessageRequest).catch((error) => {
            console.error('Failed to send inline action:', error);
            showResultError('发送请求失败，请重试');
          });
        });

        toolbarEl.appendChild(button);
      });

      return toolbarEl;
    }

    function getMetaText(action: string, model: string): string {
      const modelLabel = model || 'AI';
      if (action === 'translate') return `${modelLabel} · 自动检测 → 中文`;
      if (action === 'explain')   return `${modelLabel} · 💡 Explain`;
      if (action === 'rewrite')   return `${modelLabel} · ✏️ Rewrite`;
      return modelLabel;
    }

    /**
     * Create result panel element (attached to toolbar)
     */
    function createResultPanel(): HTMLDivElement {
      const panel = document.createElement('div');
      panel.id = 'wps-result-panel';

      Object.assign(panel.style, {
        position: 'absolute',
        top: '100%',
        left: '0',
        marginTop: '8px',
        width: '340px',
        maxHeight: '340px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.09)',
        overflow: 'hidden',
        display: 'none',
        flexDirection: 'column',
        zIndex: '2147483647',
      });
      panel.style.setProperty('font-family', '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif', 'important');
      panel.style.setProperty('font-size', '14px', 'important');
      panel.style.setProperty('line-height', '1', 'important');
      panel.style.setProperty('box-sizing', 'border-box', 'important');
      if (!document.getElementById('wps-spin-style')) {
        const spinStyle = document.createElement('style');
        spinStyle.id = 'wps-spin-style';
        spinStyle.textContent = '@keyframes wps-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(spinStyle);
      }

      const header = document.createElement('div');
      header.id = 'wps-result-header';
      Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        height: '44px',
        minHeight: '44px',
        flexShrink: '0',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#ffffff',
      });

      const logoContainer = document.createElement('div');
      logoContainer.id = 'wps-result-logo';
      Object.assign(logoContainer.style, {
        width: '20px',
        height: '20px',
        flexShrink: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      });
      logoContainer.innerHTML = `<svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="wps-logo-g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#818CF8"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#wps-logo-g)"/><text x="16" y="23" font-family="-apple-system,BlinkMacSystemFont,sans-serif" font-size="20" font-weight="800" fill="white" text-anchor="middle">P</text></svg>`;
      header.appendChild(logoContainer);

      const meta = document.createElement('div');
      meta.id = 'wps-result-meta';
      Object.assign(meta.style, {
        flex: '1',
        textAlign: 'center',
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        padding: '0 8px',
      });
      meta.textContent = 'PageMind';
      header.appendChild(meta);

      const closeBtn = document.createElement('button');
      closeBtn.id = 'wps-result-close';
      Object.assign(closeBtn.style, {
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        borderRadius: '50%',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#94a3b8',
        flexShrink: '0',
        outline: 'none',
        transition: 'background-color 0.15s',
      });
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.backgroundColor = 'rgba(0,0,0,0.06)'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.backgroundColor = 'transparent'; });
      closeBtn.addEventListener('click', () => {
        const loadingEl = panel.querySelector('#wps-result-loading') as HTMLDivElement;
        if (loadingEl && loadingEl.style.display !== 'none') {
          browser.runtime.sendMessage({ type: 'TOOLBAR_INLINE_CANCEL' } as MessageRequest).catch(() => {});
        }
        hideResultPanel();
        hideToolbar();
      });
      header.appendChild(closeBtn);

      panel.appendChild(header);

      const loadingEl = document.createElement('div');
      loadingEl.id = 'wps-result-loading';
      Object.assign(loadingEl.style, {
        display: 'none',
        padding: '32px 16px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '13px',
        flexShrink: '0',
      });
      loadingEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;"><svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="animation:wps-spin 1s linear infinite;"><circle cx="12" cy="12" r="10" fill="none" stroke="#e2e8f0" stroke-width="2.5"/><path d="M12 2 A10 10 0 0 1 22 12" fill="none" stroke="#6366F1" stroke-width="2.5" stroke-linecap="round"/></svg><span style="font-size:13px;color:#94a3b8;font-family:-apple-system,sans-serif;">AI 正在处理…</span></div>`;
      panel.appendChild(loadingEl);

      const contentEl = document.createElement('div');
      contentEl.id = 'wps-result-content';
      Object.assign(contentEl.style, {
        display: 'none',
        padding: '14px 16px',
        flexGrow: '1',
        fontSize: '14px',
        lineHeight: '1.75',
        color: '#1f2937',
        overflowY: 'auto',
        maxHeight: '220px',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      });
      contentEl.style.setProperty('font-size', '14px', 'important');
      contentEl.style.setProperty('line-height', '1.75', 'important');
      contentEl.style.setProperty('color', '#1f2937', 'important');
      panel.appendChild(contentEl);

      const footer = document.createElement('div');
      footer.id = 'wps-result-footer';
      Object.assign(footer.style, {
        display: 'none',
        flexShrink: '0',
        alignItems: 'center',
        padding: '0 14px',
        height: '40px',
        minHeight: '40px',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        backgroundColor: '#ffffff',
      });

      const thumbsContainer = document.createElement('div');
      thumbsContainer.id = 'wps-result-thumbs';
      Object.assign(thumbsContainer.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      });

      const thumbUpBtn = document.createElement('button');
      thumbUpBtn.id = 'wps-result-thumb-up';
      thumbUpBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`;

      const thumbDownBtn = document.createElement('button');
      thumbDownBtn.id = 'wps-result-thumb-down';
      thumbDownBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`;

      const copySvgDefault = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      const copySvgDone = `<svg width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

      const copyBtn = document.createElement('button');
      copyBtn.id = 'wps-result-copy';
      copyBtn.innerHTML = copySvgDefault;

      [thumbUpBtn, thumbDownBtn, copyBtn].forEach(btn => {
        Object.assign(btn.style, {
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          backgroundColor: 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#94a3b8',
          outline: 'none',
          transition: 'color 0.15s, background-color 0.15s',
          padding: '0',
          fontSize: '14px',
        });
        btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
        btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'transparent'; });
      });
      copyBtn.style.marginLeft = 'auto';

      let thumbsState: 'up' | 'down' | null = null;
      let currentResultTextLocal = '';

      function setThumbsState(newState: 'up' | 'down' | null) {
        thumbsState = newState;
        thumbUpBtn.style.color   = newState === 'up'   ? '#6366F1' : '#94a3b8';
        thumbDownBtn.style.color = newState === 'down' ? '#6366F1' : '#94a3b8';
        thumbUpBtn.style.opacity   = newState === 'down' ? '0.4' : '1';
        thumbDownBtn.style.opacity = newState === 'up'   ? '0.4' : '1';
      }

      thumbUpBtn.addEventListener('click', () => {
        setThumbsState(thumbsState === 'up' ? null : 'up');
      });
      thumbDownBtn.addEventListener('click', () => {
        setThumbsState(thumbsState === 'down' ? null : 'down');
      });

      (panel as any).__resetThumbs = () => setThumbsState(null);
      (panel as any).__setText = (t: string) => { currentResultTextLocal = t; };

      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(currentResultTextLocal);
        } catch {
          const ta = document.createElement('textarea');
          ta.value = currentResultTextLocal;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        copyBtn.innerHTML = copySvgDone;
        setTimeout(() => { copyBtn.innerHTML = copySvgDefault; }, 1500);
      });

      thumbsContainer.appendChild(thumbUpBtn);
      thumbsContainer.appendChild(thumbDownBtn);
      footer.appendChild(thumbsContainer);
      footer.appendChild(copyBtn);

      panel.appendChild(footer);

      return panel;
    }

    /**
     * Show result panel with loading state
     */
    function showResultLoading(): void {
      if (!resultPanel) {
        resultPanel = createResultPanel();
        toolbar?.appendChild(resultPanel);
      }

      const loadingEl = resultPanel.querySelector('#wps-result-loading') as HTMLDivElement;
      const contentArea = resultPanel.querySelector('#wps-result-content') as HTMLDivElement;
      const footer = resultPanel.querySelector('#wps-result-footer') as HTMLDivElement;

      if (loadingEl) loadingEl.style.display = 'block';
      if (contentArea) contentArea.style.display = 'none';
      if (footer) footer.style.display = 'none';

      resultPanelVisible = true;
      resultPanel.style.display = 'flex';
      const metaElLoading = resultPanel.querySelector('#wps-result-meta') as HTMLElement;
      if (metaElLoading) {
        metaElLoading.textContent = lastAction ? getMetaText(lastAction, lastModelName) : 'PageMind';
      }
      if ((resultPanel as any).__resetThumbs) {
        (resultPanel as any).__resetThumbs();
      }
    }

    /**
     * Show result panel with content
     */
    function showResultContent(text: string, action?: string, model?: string): void {
      if (!resultPanel) {
        resultPanel = createResultPanel();
        toolbar?.appendChild(resultPanel);
      }

      if (model) lastModelName = model;
      if (action) lastAction = action;

      const metaEl = resultPanel.querySelector('#wps-result-meta') as HTMLElement;
      if (metaEl) {
        metaEl.textContent = getMetaText(action ?? lastAction ?? '', model ?? lastModelName);
      }

      if ((resultPanel as any).__setText) {
        (resultPanel as any).__setText(text);
      }

      const loadingEl = resultPanel.querySelector('#wps-result-loading') as HTMLDivElement;
      const contentArea = resultPanel.querySelector('#wps-result-content') as HTMLDivElement;
      const footer = resultPanel.querySelector('#wps-result-footer') as HTMLDivElement;

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentArea) {
        contentArea.style.display = 'block';
        contentArea.textContent = text;
        contentArea.style.setProperty('color', '#1f2937', 'important');
      }
      if (footer) {
        footer.style.display = 'flex';
        const thumbsEl = footer.querySelector('#wps-result-thumbs') as HTMLElement;
        const copyEl   = footer.querySelector('#wps-result-copy')   as HTMLElement;
        const retryBtn = footer.querySelector('#wps-result-retry')  as HTMLElement;
        if (thumbsEl) thumbsEl.style.display = 'flex';
        if (copyEl)   copyEl.style.display = 'flex';
        if (retryBtn) retryBtn.style.display = 'none';
      }

      resultPanel.style.display = 'flex';
    }

    /**
     * Show result panel with error message
     */
    function showResultError(errorMsg: string): void {
      if (!resultPanel) {
        resultPanel = createResultPanel();
        toolbar?.appendChild(resultPanel);
      }

      const loadingEl = resultPanel.querySelector('#wps-result-loading') as HTMLElement;
      const contentArea = resultPanel.querySelector('#wps-result-content') as HTMLElement;
      const footer = resultPanel.querySelector('#wps-result-footer') as HTMLElement;
      const thumbsEl = resultPanel.querySelector('#wps-result-thumbs') as HTMLElement;
      const copyEl   = resultPanel.querySelector('#wps-result-copy')   as HTMLElement;

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentArea) {
        contentArea.style.display = 'block';
        contentArea.textContent = errorMsg;
        contentArea.style.setProperty('color', '#dc2626', 'important');
      }

      if (thumbsEl) thumbsEl.style.display = 'none';
      if (copyEl)   copyEl.style.display = 'none';

      let retryBtn = resultPanel.querySelector('#wps-result-retry') as HTMLButtonElement;
      if (!retryBtn) {
        retryBtn = document.createElement('button');
        retryBtn.id = 'wps-result-retry';
        retryBtn.textContent = '重试';
        Object.assign(retryBtn.style, {
          marginLeft: 'auto',
          padding: '5px 14px',
          backgroundColor: '#6366F1',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '12.5px',
          fontWeight: '600',
          outline: 'none',
        });
        retryBtn.addEventListener('click', () => {
          if (lastAction && lastSelectedText) {
            showResultLoading();
            browser.runtime.sendMessage({
              type: 'TOOLBAR_INLINE_ACTION',
              payload: { action: lastAction, selectedText: lastSelectedText },
            } as MessageRequest).catch(() => { showResultError('发送请求失败，请重试'); });
          }
        });
        if (footer) footer.appendChild(retryBtn);
      }
      retryBtn.style.display = 'flex';

      if (footer) footer.style.display = 'flex';
      resultPanel.style.display = 'flex';
    }

    /**
     * Hide result panel
     */
    function hideResultPanel(): void {
      if (resultPanel) {
        resultPanel.style.display = 'none';
        const contentArea = resultPanel.querySelector('#wps-result-content') as HTMLDivElement;
        if (contentArea) {
          contentArea.style.color = '#1f2937';
        }
      }
      resultPanelVisible = false;
    }

    /**
     * Show toolbar
     */
    function showToolbar(): void {
      if (!shouldShowToolbar()) {
        hideToolbar();
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!toolbar) {
        toolbar = createToolbar();
        document.body.appendChild(toolbar);
      }

      toolbar.style.display = 'flex';
      toolbar.style.opacity = '0';
      toolbar.style.transform = 'translateY(4px) scale(0.98)';
      positionToolbar(toolbar, rect);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (toolbar) {
            toolbar.style.opacity = '1';
            toolbar.style.transform = 'translateY(0) scale(1)';
          }
        });
      });
    }

    /**
     * Hide toolbar
     */
    function hideToolbar(): void {
      if (toolbar) {
        toolbar.style.display = 'none';
      }
    }

    /**
     * Handle mouseup event
     */
    function handleMouseUp(e: MouseEvent): void {
      // Don't show toolbar if clicking on toolbar itself
      if (toolbar && toolbar.contains(e.target as Node)) {
        return;
      }

      // Delay to let selection settle
      setTimeout(() => {
        showToolbar();
      }, 10);
    }

    /**
     * Handle selectionchange with debounce
     */
    function handleSelectionChange(): void {
      if (selectionChangeTimeout) {
        clearTimeout(selectionChangeTimeout);
      }

      selectionChangeTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length === 0) {
          if (!resultPanelVisible) {
            hideToolbar();
          }
        }
      }, 150);
    }

    /**
     * Handle mousedown for click-outside
     */
    function handleMouseDown(e: MouseEvent): void {
      if (toolbar && toolbar.style.display === 'flex' && !toolbar.contains(e.target as Node)) {
        if (resultPanelVisible) {
          // Cancel any in-flight request and hide everything
          const loadingEl = resultPanel?.querySelector('#wps-result-loading') as HTMLDivElement | null;
          if (loadingEl && loadingEl.style.display !== 'none') {
            browser.runtime.sendMessage({ type: 'TOOLBAR_INLINE_CANCEL' } as MessageRequest).catch(() => {});
          }
          hideResultPanel();
        }
        hideToolbar();
      }
    }

    // Add event listeners
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleMouseDown);

    // Listen for inline action results from background
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'TOOLBAR_INLINE_RESULT') {
        showResultContent(message.content as string, message.action, message.model);
      } else if (message.type === 'TOOLBAR_INLINE_ERROR') {
        showResultError(message.error as string || '处理失败');
      }
      return false;
    });

    // Cleanup on unload
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleMouseDown);
      if (toolbar) {
        toolbar.remove();
      }
    };
  },
});
