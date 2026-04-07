import type { MessageRequest, ContextMenuActionType } from '@/utils/types';
import { LANGUAGES, getLanguageLabel, DEFAULT_TARGET_LANGUAGE } from '@/utils/languageConstants';
import { detectLanguage } from '@/utils/languageDetector';
import { getSettings, saveSettings } from '@/utils/storage';

/**
 * Returns the meta text for explain/rewrite actions.
 * For translate, returns null — the caller should render the language selector UI instead.
 */
export function getMetaText(action: string, model: string): string | null {
  const modelLabel = model || 'AI';
  if (action === 'translate') return null;
  if (action === 'explain')   return `${modelLabel} · 💡 Explain`;
  if (action === 'rewrite')   return `${modelLabel} · ✏️ Rewrite`;
  return modelLabel;
}

/**
 * Creates the language selector header row for translate action.
 * Returns a div with source badge → arrow → target button.
 */
export function createLanguageSelectorHeader(sourceCode: string, targetCode: string, model?: string): HTMLDivElement {
  const container = document.createElement('div');
  Object.assign(container.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflow: 'hidden',
    minWidth: '0',
  });

  if (model) {
    const modelPill = document.createElement('span');
    modelPill.textContent = model;
    Object.assign(modelPill.style, {
      background: '#F1F5F9',
      color: '#64748B',
      fontSize: '11px',
      fontWeight: '600',
      padding: '4px 10px',
      borderRadius: '20px',
      whiteSpace: 'nowrap',
      flexShrink: '0',
      letterSpacing: '0.2px',
    });
    modelPill.style.setProperty('font-size', '11px', 'important');

    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '3px',
      height: '3px',
      background: '#CBD5E1',
      borderRadius: '50%',
      flexShrink: '0',
      display: 'inline-block',
    });

    container.appendChild(modelPill);
    container.appendChild(dot);
  }

  const sourceBadge = document.createElement('span');
  sourceBadge.textContent = getLanguageLabel(sourceCode);
  Object.assign(sourceBadge.style, {
    background: '#F8FAFC',
    color: '#64748B',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 11px',
    borderRadius: '20px',
    border: '1.5px solid #E2E8F0',
    whiteSpace: 'nowrap',
    flexShrink: '0',
  });
  sourceBadge.style.setProperty('font-size', '12px', 'important');

  const arrowSpan = document.createElement('span');
  arrowSpan.textContent = '→';
  Object.assign(arrowSpan.style, {
    flexShrink: '0',
    color: '#94A3B8',
    fontSize: '13px',
  });

  const targetBtn = document.createElement('span');
  targetBtn.id = 'wps-lang-target-btn';
  Object.assign(targetBtn.style, {
    background: 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    padding: '4px 11px',
    borderRadius: '20px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    flexShrink: '0',
    userSelect: 'none',
    boxShadow: '0 2px 10px rgba(99,102,241,0.3)',
    transition: 'box-shadow 0.2s, transform 0.2s',
  });
  targetBtn.style.setProperty('font-size', '12px', 'important');
  targetBtn.style.setProperty('font-weight', '600', 'important');

  const targetLabel = document.createElement('span');
  targetLabel.textContent = getLanguageLabel(targetCode);

  const chevron = document.createElement('span');
  chevron.textContent = '▾';
  Object.assign(chevron.style, { fontSize: '9px', opacity: '0.85' });

  targetBtn.appendChild(targetLabel);
  targetBtn.appendChild(chevron);

  targetBtn.addEventListener('mouseenter', () => {
    targetBtn.style.boxShadow = '0 4px 14px rgba(99,102,241,0.45)';
    targetBtn.style.transform = 'translateY(-1px)';
  });
  targetBtn.addEventListener('mouseleave', () => {
    targetBtn.style.boxShadow = '0 2px 10px rgba(99,102,241,0.3)';
    targetBtn.style.transform = 'translateY(0)';
  });

  container.appendChild(sourceBadge);
  container.appendChild(arrowSpan);
  container.appendChild(targetBtn);

  return container;
}

/**
 * Creates the language dropdown panel.
 * @param currentTargetCode - The currently selected target language code
 * @param onSelect - Callback invoked with the selected language code
 */
export function createLanguageDropdown(
  currentTargetCode: string,
  onSelect: (code: string) => void,
): HTMLDivElement {
  const dropdown = document.createElement('div');
  dropdown.id = 'wps-lang-dropdown';
  Object.assign(dropdown.style, {
    position: 'absolute',
    top: '60px',
    left: '8px',
    right: '8px',
    background: 'rgba(255,255,255,0.98)',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
    zIndex: '10001',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '8px 0',
  });

  LANGUAGES.forEach((lang, idx) => {
    const item = document.createElement('div');
    item.dataset.languageCode = lang.code;
    const isSelected = lang.code === currentTargetCode;

    Object.assign(item.style, {
      margin: `${idx === 0 ? '0' : '4px'} 8px 0 8px`,
      height: '48px',
      padding: '0 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      cursor: 'pointer',
      borderRadius: '8px',
      background: isSelected ? 'linear-gradient(135deg, #6366F1 0%, #7C3AED 100%)' : 'transparent',
      boxShadow: isSelected ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
      transition: 'background 0.15s',
    });

    const nameSpan = document.createElement('span');
    nameSpan.textContent = lang.nativeName;
    Object.assign(nameSpan.style, {
      fontSize: '14px',
      fontWeight: '600',
      color: isSelected ? 'white' : '#1E293B',
    });
    nameSpan.style.setProperty('font-size', '14px', 'important');

    item.appendChild(nameSpan);

    if (isSelected) {
      const check = document.createElement('span');
      check.textContent = '✓';
      Object.assign(check.style, {
        fontSize: '13px',
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
      });
      item.appendChild(check);
    }

    if (!isSelected) {
      item.addEventListener('mouseenter', () => {
        item.style.background = '#F8FAFC';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });
    }

    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelect(lang.code);
    });

    dropdown.appendChild(item);
  });

  return dropdown;
}

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
    let lastTargetLanguage: string = DEFAULT_TARGET_LANGUAGE;
    let languageDropdown: HTMLDivElement | null = null;

    // Load saved target language from storage on init
    getSettings().then(settings => {
      lastTargetLanguage = settings.targetLanguage || DEFAULT_TARGET_LANGUAGE;
    }).catch(() => { lastTargetLanguage = DEFAULT_TARGET_LANGUAGE; });

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
            payload: { action, selectedText, targetLanguage: lastTargetLanguage },
          } as MessageRequest).catch((error) => {
            console.error('Failed to send inline action:', error);
            showResultError('发送请求失败，请重试');
          });
        });

        toolbarEl.appendChild(button);
      });

      return toolbarEl;
    }

    /**
     * Toggle the language dropdown visibility.
     * Dropdown is appended to toolbar so toolbar.contains() works for click-outside detection.
     */
    function toggleLanguageDropdown(_targetButton: HTMLElement, currentCode: string): void {
      // If already open, close it
      if (languageDropdown) {
        languageDropdown.remove();
        languageDropdown = null;
        return;
      }

      // Create and attach dropdown
      languageDropdown = createLanguageDropdown(currentCode, handleLanguageSelect);

      // Position it relative to the result panel (which is a child of toolbar)
      // We append to resultPanel so it overlays panel content below the header
      if (resultPanel) {
        Object.assign(languageDropdown.style, {
          position: 'absolute',
          top: '52px',
          left: '8px',
          right: '8px',
          zIndex: '10001',
        });
        resultPanel.appendChild(languageDropdown);
      } else if (toolbar) {
        toolbar.appendChild(languageDropdown);
      }
    }

    /**
     * Handle language selection from dropdown.
     */
    function handleLanguageSelect(selectedCode: string): void {
      lastTargetLanguage = selectedCode;

      // Close dropdown
      if (languageDropdown) {
        languageDropdown.remove();
        languageDropdown = null;
      }

      // Persist to storage
      saveSettings({ targetLanguage: selectedCode }).catch(() => {});

      // Re-trigger translation
      if (lastSelectedText) {
        // Cancel current in-flight request
        browser.runtime.sendMessage({ type: 'TOOLBAR_INLINE_CANCEL' } as MessageRequest).catch(() => {});

        showResultLoading();

        browser.runtime.sendMessage({
          type: 'TOOLBAR_INLINE_ACTION',
          payload: { action: 'translate', selectedText: lastSelectedText, targetLanguage: selectedCode },
        } as MessageRequest).catch(() => { showResultError('发送请求失败，请重试'); });
      }
    }

    /**
     * Render language selector into the meta element for translate action.
     */
    function renderLanguageSelectorIntoMeta(metaEl: HTMLElement): void {
      const sourceCode = detectLanguage(lastSelectedText || '');

      if (sourceCode === lastTargetLanguage) {
        lastTargetLanguage = sourceCode === 'en' ? 'zh-CN' : 'en';
      }

      const selectorHeader = createLanguageSelectorHeader(sourceCode, lastTargetLanguage, lastModelName || undefined);

      // Clear existing content
      metaEl.textContent = '';
      metaEl.appendChild(selectorHeader);

      // Wire up target button click
      const targetBtn = selectorHeader.querySelector('#wps-lang-target-btn') as HTMLElement;
      if (targetBtn) {
        targetBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleLanguageDropdown(targetBtn, lastTargetLanguage);
        });
      }
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
        width: '420px',
        maxHeight: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        border: 'none',
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
        padding: '0 18px',
        height: '52px',
        minHeight: '52px',
        flexShrink: '0',
        borderBottom: '1px solid #E8ECF4',
        background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)',
        gap: '12px',
      });

      const logoContainer = document.createElement('div');
      logoContainer.id = 'wps-result-logo';
      Object.assign(logoContainer.style, {
        width: '26px',
        height: '26px',
        flexShrink: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        borderRadius: '7px',
        boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
      });
      const logoText = document.createElement('span');
      Object.assign(logoText.style, {
        color: 'white',
        fontWeight: '700',
        fontSize: '14px',
        lineHeight: '1',
      });
      logoText.style.setProperty('font-size', '14px', 'important');
      logoText.textContent = 'P';
      logoContainer.appendChild(logoText);
      header.appendChild(logoContainer);

      const meta = document.createElement('div');
      meta.id = 'wps-result-meta';
      Object.assign(meta.style, {
        flex: '1',
        fontSize: '12px',
        color: '#64748b',
        fontWeight: '500',
        overflow: 'hidden',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        minWidth: '0',
      });
      meta.textContent = 'PageMind';
      header.appendChild(meta);

      const closeBtn = document.createElement('button');
      closeBtn.id = 'wps-result-close';
      Object.assign(closeBtn.style, {
        width: '26px',
        height: '26px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        backgroundColor: 'transparent',
        borderRadius: '7px',
        cursor: 'pointer',
        fontSize: '18px',
        color: '#CBD5E1',
        flexShrink: '0',
        outline: 'none',
        transition: 'background-color 0.15s, color 0.15s',
        fontWeight: '300',
        lineHeight: '1',
      });
      closeBtn.textContent = '×';
      closeBtn.addEventListener('mouseenter', () => { closeBtn.style.backgroundColor = '#F1F5F9'; closeBtn.style.color = '#94A3B8'; });
      closeBtn.addEventListener('mouseleave', () => { closeBtn.style.backgroundColor = 'transparent'; closeBtn.style.color = '#CBD5E1'; });
      closeBtn.addEventListener('click', () => {
        const loadingEl = panel.querySelector('#wps-result-loading') as HTMLDivElement;
        if (loadingEl && loadingEl.style.display !== 'none') {
          browser.runtime.sendMessage({ type: 'TOOLBAR_INLINE_CANCEL' } as MessageRequest).catch(() => {});
        }
        // Close dropdown if open
        if (languageDropdown) {
          languageDropdown.remove();
          languageDropdown = null;
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
        padding: '20px 22px',
        flexGrow: '1',
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#1E293B',
        overflowY: 'auto',
        maxHeight: '300px',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
      });
      contentEl.style.setProperty('font-size', '15px', 'important');
      contentEl.style.setProperty('line-height', '1.8', 'important');
      contentEl.style.setProperty('color', '#1E293B', 'important');
      panel.appendChild(contentEl);

      const footer = document.createElement('div');
      footer.id = 'wps-result-footer';
      Object.assign(footer.style, {
        display: 'none',
        flexShrink: '0',
        alignItems: 'center',
        padding: '0 18px',
        height: '44px',
        minHeight: '44px',
        borderTop: '1px solid #E8ECF4',
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
        if (lastAction === 'translate') {
          renderLanguageSelectorIntoMeta(metaElLoading);
        } else {
          metaElLoading.textContent = lastAction ? (getMetaText(lastAction, lastModelName) ?? 'PageMind') : 'PageMind';
        }
      }

      if ((resultPanel as any).__resetThumbs) {
        (resultPanel as any).__resetThumbs();
      }
    }

    /**
     * Show result panel with content
     */
    function showResultContent(text: string, action?: string, model?: string, targetLanguage?: string): void {
      if (!resultPanel) {
        resultPanel = createResultPanel();
        toolbar?.appendChild(resultPanel);
      }

      if (model) lastModelName = model;
      if (action) lastAction = action;
      if (targetLanguage) lastTargetLanguage = targetLanguage;

      const metaEl = resultPanel.querySelector('#wps-result-meta') as HTMLElement;
      if (metaEl) {
        const effectiveAction = action ?? lastAction ?? '';
        if (effectiveAction === 'translate') {
          renderLanguageSelectorIntoMeta(metaEl);
        } else {
          metaEl.textContent = getMetaText(effectiveAction, model ?? lastModelName) ?? 'PageMind';
        }
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
              payload: { action: lastAction, selectedText: lastSelectedText, targetLanguage: lastTargetLanguage },
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
        // Close dropdown if open
        if (languageDropdown) {
          languageDropdown.remove();
          languageDropdown = null;
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
        if (message.targetLanguage) {
          lastTargetLanguage = message.targetLanguage;
        }
        showResultContent(message.content as string, message.action, message.model, message.targetLanguage);
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
