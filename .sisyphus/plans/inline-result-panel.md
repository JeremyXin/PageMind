# Inline Result Panel for Floating Toolbar

## TL;DR

> **Quick Summary**: Add a DeepL-style inline result panel below the floating toolbar. When user clicks Explain/Translate/Rewrite, AI results appear directly on the page instead of opening the side panel.
> 
> **Deliverables**:
> - Shared action prompt module (`utils/actionPrompts.ts`)
> - New message types for inline action flow
> - Background handler for inline AI calls
> - Result panel UI in floating toolbar content script
> - End-to-end wiring with loading, error, and result states
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves + final
> **Critical Path**: T1 → T3 → T5 → T6 → F1-F4

---

## Context

### Original Request
User wants toolbar actions (Explain/Translate/Rewrite) to show results directly below the floating toolbar on the page, like DeepL's inline translation popup, instead of opening the side panel.

### Interview Summary
**Key Discussions**:
- All 3 actions show results inline (Explain, Translate, Rewrite)
- Result panel has Copy + Close buttons
- AI response shown all-at-once (not streaming) with loading spinner
- Side panel no longer opens on toolbar click
- Click outside result panel auto-closes it
- Fixed max height (300px) with scroll for long results
- Right-click context menu behavior unchanged (still opens side panel)
- Error state shows error message + Retry button

### Metis Review
**Identified Gaps** (addressed):
- Prompt templates hardcoded in ChatPanel.tsx — extract to shared module
- `sendResponse` won't survive 30s+ AI calls — use `chrome.tabs.sendMessage` instead
- `hideToolbar()` called on click conflicts with showing results — add `resultPanelVisible` flag
- Content script has no `onMessage` listener — need to add one

---

## Work Objectives

### Core Objective
Enable toolbar actions to display AI results inline on the page in a floating result panel, creating a seamless reading experience without side panel interruption.

### Concrete Deliverables
- `utils/actionPrompts.ts` — shared prompt template module
- `utils/types.ts` — new message types (TOOLBAR_INLINE_ACTION, TOOLBAR_INLINE_RESULT, TOOLBAR_INLINE_ERROR, TOOLBAR_INLINE_CANCEL)
- `entrypoints/background.ts` — new handler for inline AI calls
- `entrypoints/floating-toolbar.content.ts` — result panel UI + message listener + updated click handlers

### Definition of Done
- [ ] Clicking toolbar buttons shows loading state then inline result
- [ ] Copy button copies result text to clipboard
- [ ] Close button dismisses result panel
- [ ] Click outside result panel auto-closes it
- [ ] Error state shows message + Retry button
- [ ] Result panel scrollable at max height 300px
- [ ] `bun run build` passes with zero errors
- [ ] `npx vitest run` passes with zero new failures

### Must Have
- Inline result panel below toolbar with white bg, rounded corners, shadow
- Loading spinner while AI processes
- Copy and Close action buttons
- Error state with Retry
- Pure inline styles (no Tailwind, no Shadow DOM)
- AbortController support (cancel on Close during loading)

### Must NOT Have (Guardrails)
- DO NOT modify ChatPanel.tsx or any side panel components
- DO NOT modify context menu behavior (right-click still opens side panel)
- DO NOT change the existing `handleChatPort` streaming flow
- DO NOT store inline action results in chatStorage (ephemeral only)
- DO NOT add language selection UI (translate stays hardcoded to Chinese)
- DO NOT install new npm packages
- DO NOT use Shadow DOM or Tailwind classes in content script
- DO NOT add streaming/chunk display to result panel

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest + JSDOM)
- **Automated tests**: YES (tests-after)
- **Framework**: Vitest

### QA Policy
Every task includes agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — types + shared modules):
├── Task 1: Extract action prompt templates to shared module [quick]
├── Task 2: Add inline action message types to utils/types.ts [quick]

Wave 2 (After Wave 1 — core implementation, PARALLEL):
├── Task 3: Add background handler for TOOLBAR_INLINE_ACTION [deep]
├── Task 4: Build result panel UI component in floating-toolbar [visual-engineering]

Wave 3 (After Wave 2 — integration):
├── Task 5: Wire up end-to-end inline action flow [deep]
├── Task 6: Add cancel/abort support [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
├── Task F4: Scope fidelity check [deep]
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1   | —         | T3, T5 |
| T2   | —         | T3, T4, T5 |
| T3   | T1, T2    | T5, T6 |
| T4   | T2        | T5 |
| T5   | T3, T4    | T6, F1-F4 |
| T6   | T5        | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 `quick`, T2 `quick`
- **Wave 2**: 2 tasks — T3 `deep`, T4 `visual-engineering`
- **Wave 3**: 2 tasks — T5 `deep`, T6 `quick`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Extract action prompt templates to shared module

  **What to do**:
  - Create `utils/actionPrompts.ts` with a function `getActionPrompt(action: ContextMenuActionType, selectedText: string): string`
  - Prompt templates (from `ChatPanel.tsx:109-138`):
    - `explain`: `Explain the following text in detail:\n\n"${selectedText}"`
    - `translate`: `Translate the following text to Chinese:\n\n"${selectedText}"`
    - `rewrite`: `Rewrite and improve the following text while preserving its meaning:\n\n"${selectedText}"`
  - Write unit tests verifying each action returns the expected prompt string
  - NOTE: Do NOT modify ChatPanel.tsx (out of scope — it can migrate to this module later)

  **Must NOT do**:
  - Do NOT modify ChatPanel.tsx
  - Do NOT change existing prompt wording

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: T3, T5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/ChatPanel.tsx:109-138` — Current prompt templates (READ ONLY, do not modify)
  - `providers/prompts.ts` — Existing prompt module pattern in the project

  **API/Type References**:
  - `utils/types.ts:ContextMenuActionType` — The action type union ('explain' | 'translate' | 'rewrite' | ...)

  **Test References**:
  - `utils/sessionTitle.test.ts` — Example of simple utility test pattern in this project

  **Acceptance Criteria**:
  - [ ] `utils/actionPrompts.ts` exists with `getActionPrompt()` function
  - [ ] Function handles 'explain', 'translate', 'rewrite' actions
  - [ ] `npx vitest run utils/actionPrompts.test.ts` → PASS (3+ tests)
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: getActionPrompt returns correct prompt for each action
    Tool: Bash (node/bun)
    Steps:
      1. Run `npx vitest run utils/actionPrompts.test.ts`
      2. Verify 3 tests pass (one per action type)
    Expected Result: All tests pass, each action returns expected prompt string
    Evidence: .sisyphus/evidence/task-1-prompts-test.txt
  ```

  **Commit**: YES
  - Message: `feat: extract action prompt templates to shared module`
  - Files: `utils/actionPrompts.ts`, `utils/actionPrompts.test.ts`

---

- [x] 2. Add inline action message types

  **What to do**:
  - Add new message types to `utils/types.ts`:
    - `'TOOLBAR_INLINE_ACTION'` to the MessageType union
    - `'TOOLBAR_INLINE_RESULT'` to the MessageType union
    - `'TOOLBAR_INLINE_ERROR'` to the MessageType union
    - `'TOOLBAR_INLINE_CANCEL'` to the MessageType union
  - Add TypeScript interfaces:
    ```typescript
    interface ToolbarInlineActionPayload {
      action: ContextMenuActionType;
      selectedText: string;
    }
    interface ToolbarInlineResultMessage {
      type: 'TOOLBAR_INLINE_RESULT';
      content: string;
      action: ContextMenuActionType;
    }
    interface ToolbarInlineErrorMessage {
      type: 'TOOLBAR_INLINE_ERROR';
      error: string;
    }
    interface ToolbarInlineCancelMessage {
      type: 'TOOLBAR_INLINE_CANCEL';
    }
    ```
  - Export all new types

  **Must NOT do**:
  - Do NOT remove or rename existing message types
  - Do NOT modify any logic, only add types

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: T3, T4, T5
  - **Blocked By**: None

  **References**:

  **API/Type References**:
  - `utils/types.ts:1-67` — Existing type definitions and MessageType union
  - `utils/types.ts:MessageRequest` — Existing message request interface pattern

  **Acceptance Criteria**:
  - [ ] 4 new message types added to MessageType union
  - [ ] 4 new interfaces exported
  - [ ] `bun run build` → PASS
  - [ ] `pnpm compile` → no new TS errors

  **QA Scenarios**:

  ```
  Scenario: New types compile correctly
    Tool: Bash
    Steps:
      1. Run `bun run build`
      2. Check exit code is 0
    Expected Result: Build passes with no errors
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

  **Commit**: YES
  - Message: `feat: add inline action message types`
  - Files: `utils/types.ts`

---

- [ ] 3. Add background handler for TOOLBAR_INLINE_ACTION

  **What to do**:
  - In `background.ts`, add a new handler for `TOOLBAR_INLINE_ACTION` messages (similar pattern to existing `TOOLBAR_ACTION` handler at line 86-104, but different behavior):
    1. Extract `action`, `selectedText` from `message.payload`
    2. Get `tabId` from `sender.tab?.id`
    3. Use `getActionPrompt(action, selectedText)` from the shared module to build the prompt
    4. Call `ChatProvider.chat()` (the async generator from `providers/chat.ts`), accumulate ALL chunks into a single string
    5. Send the complete result back to the content script via `chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_RESULT', content: fullResult, action })`
    6. On error, send `chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_ERROR', error: errorMessage })`
    7. Support abort: store AbortController per tabId, handle `TOOLBAR_INLINE_CANCEL` by calling `controller.abort()`
  - Import `getActionPrompt` from `utils/actionPrompts`
  - Import `ChatProvider` from `providers/chat` (already imported or accessible in background.ts)
  - Write tests in `tests/background.test.ts` (append to existing file):
    - Test: TOOLBAR_INLINE_ACTION success → sends TOOLBAR_INLINE_RESULT via tabs.sendMessage
    - Test: TOOLBAR_INLINE_ACTION error → sends TOOLBAR_INLINE_ERROR
    - Test: TOOLBAR_INLINE_CANCEL → aborts the controller

  **Must NOT do**:
  - Do NOT modify the existing TOOLBAR_ACTION handler (keep it working for any remaining callers)
  - Do NOT modify handleChatPort streaming logic
  - Do NOT modify context menu handler
  - Do NOT store results in chatStorage

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: T5, T6
  - **Blocked By**: T1, T2

  **References**:

  **Pattern References**:
  - `entrypoints/background.ts:86-104` — Existing TOOLBAR_ACTION handler (pattern to follow but different behavior)
  - `entrypoints/background.ts:111-180` — handleExtractAndSummarize() (one-shot AI call pattern)
  - `entrypoints/background.ts:296-408` — handleChatPort() (streaming + accumulation pattern, reuse ChatProvider.chat())

  **API/Type References**:
  - `providers/chat.ts:8-127` — ChatProvider.chat() async generator interface
  - `utils/actionPrompts.ts:getActionPrompt` — Prompt builder (from Task 1)
  - `utils/types.ts` — New TOOLBAR_INLINE_* types (from Task 2)

  **Test References**:
  - `tests/background.test.ts:46-98` — Mocking patterns for browser APIs (vi.fn(), chrome.tabs.sendMessage mock)

  **Acceptance Criteria**:
  - [ ] TOOLBAR_INLINE_ACTION handler exists in background.ts
  - [ ] Handler accumulates streaming chunks and sends full result via chrome.tabs.sendMessage
  - [ ] TOOLBAR_INLINE_CANCEL aborts in-flight request
  - [ ] `npx vitest run tests/background.test.ts` → PASS (new tests included)
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: Handler sends result back to content script tab
    Tool: Bash
    Steps:
      1. Run `npx vitest run tests/background.test.ts`
      2. Check new TOOLBAR_INLINE_ACTION tests pass
    Expected Result: All new tests pass, chrome.tabs.sendMessage called with correct payload
    Evidence: .sisyphus/evidence/task-3-background-tests.txt

  Scenario: Handler handles error gracefully
    Tool: Bash
    Steps:
      1. Run tests that simulate ChatProvider.chat() throwing an error
      2. Verify TOOLBAR_INLINE_ERROR is sent to tab
    Expected Result: Error message sent via chrome.tabs.sendMessage
    Evidence: .sisyphus/evidence/task-3-error-handling.txt
  ```

  **Commit**: YES
  - Message: `feat: add background handler for inline toolbar actions`
  - Files: `entrypoints/background.ts`, `tests/background.test.ts`

---

- [ ] 4. Build result panel UI in floating toolbar

  **What to do**:
  - In `floating-toolbar.content.ts`, add functions to create and manage a result panel:
  
  **Result Panel Container:**
  ```javascript
  function createResultPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.id = 'wps-result-panel';
    Object.assign(panel.style, {
      position: 'absolute',
      top: '100%',        // below the toolbar
      left: '0',
      marginTop: '8px',
      minWidth: '280px',
      maxWidth: '420px',
      maxHeight: '300px',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '10px',
      padding: '0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
      border: '1px solid rgba(0,0,0,0.08)',
      backdropFilter: 'blur(8px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
      display: 'none',
      flexDirection: 'column',
      zIndex: '2147483647',
    });
    // ... add content area, action bar, etc.
    return panel;
  }
  ```

  **Content Area (scrollable):**
  ```javascript
  const contentArea = document.createElement('div');
  contentArea.id = 'wps-result-content';
  Object.assign(contentArea.style, {
    padding: '14px 16px',
    fontSize: '14px',
    lineHeight: '1.7',
    color: '#1f2937',
    overflowY: 'auto',
    maxHeight: '240px',  // 300 - actionBar height
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  });
  ```

  **Loading State:**
  ```javascript
  const loadingEl = document.createElement('div');
  loadingEl.id = 'wps-result-loading';
  Object.assign(loadingEl.style, {
    padding: '24px 16px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '13px',
  });
  loadingEl.textContent = '⏳ Processing...';
  ```

  **Action Bar (bottom):**
  ```javascript
  const actionBar = document.createElement('div');
  Object.assign(actionBar.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '6px',
    padding: '8px 12px',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  });
  ```

  **Copy Button:**
  - Text: `📋 Copy`
  - On click: `navigator.clipboard.writeText(resultText)`
  - After copy, briefly change text to `✅ Copied!` for 1.5s

  **Close Button:**
  - Text: `✕`
  - On click: hide result panel, reset state

  **Error State:**
  - Show error message in content area with red-ish color (`#dc2626`)
  - Show a `🔄 Retry` button alongside Close

  **Functions to implement:**
  - `createResultPanel()` → returns HTMLDivElement
  - `showResultLoading()` → show panel with loading spinner
  - `showResultContent(text: string)` → show panel with result text
  - `showResultError(errorMsg: string)` → show panel with error + retry button
  - `hideResultPanel()` → hide panel

  **Attach result panel as child of toolbar element** (so it moves with toolbar and shares positioning context).

  **Must NOT do**:
  - Do NOT wire up message listeners or AI calls (that's Task 5)
  - Do NOT modify button click handlers yet (that's Task 5)
  - Do NOT use Tailwind classes
  - Do NOT use Shadow DOM

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: T5
  - **Blocked By**: T2

  **References**:

  **Pattern References**:
  - `entrypoints/floating-toolbar.content.ts:88-108` — Inline style application pattern for toolbar container
  - `entrypoints/floating-toolbar.content.ts:110-141` — Caret element creation pattern
  - `entrypoints/floating-toolbar.content.ts:149-218` — Button creation with hover effects pattern

  **Acceptance Criteria**:
  - [ ] `createResultPanel()` returns a div with all child elements
  - [ ] `showResultLoading()` shows loading state
  - [ ] `showResultContent()` shows text with copy/close buttons
  - [ ] `showResultError()` shows error with retry/close buttons
  - [ ] Copy button calls `navigator.clipboard.writeText`
  - [ ] All styles are pure inline (no classes)
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: Result panel renders with correct structure
    Tool: Bash
    Steps:
      1. Run `npx vitest run tests/floatingToolbar.test.ts`
      2. Verify new panel creation tests pass
    Expected Result: All result panel DOM tests pass
    Evidence: .sisyphus/evidence/task-4-panel-tests.txt

  Scenario: Build succeeds with new UI code
    Tool: Bash
    Steps:
      1. Run `bun run build`
      2. Check floating-toolbar.js output size
    Expected Result: Build passes, floating-toolbar.js present in output
    Evidence: .sisyphus/evidence/task-4-build.txt
  ```

  **Commit**: YES
  - Message: `feat: add inline result panel UI to floating toolbar`
  - Files: `entrypoints/floating-toolbar.content.ts`, `tests/floatingToolbar.test.ts`

---

- [ ] 5. Wire up end-to-end inline action flow

  **What to do**:
  - In `floating-toolbar.content.ts`:
    1. **Change button click handler** (currently at line 194-216):
       - Instead of sending `TOOLBAR_ACTION` and calling `hideToolbar()`, send `TOOLBAR_INLINE_ACTION`:
         ```typescript
         const message: MessageRequest = {
           type: 'TOOLBAR_INLINE_ACTION',
           payload: { action, selectedText },
         };
         browser.runtime.sendMessage(message);
         ```
       - Call `showResultLoading()` instead of `hideToolbar()`
       - Set `resultPanelVisible = true`

    2. **Add `browser.runtime.onMessage` listener** to receive results:
       ```typescript
       browser.runtime.onMessage.addListener((message) => {
         if (message.type === 'TOOLBAR_INLINE_RESULT') {
           showResultContent(message.content);
         } else if (message.type === 'TOOLBAR_INLINE_ERROR') {
           showResultError(message.error);
         }
       });
       ```

    3. **Add `resultPanelVisible` flag**:
       - Declare `let resultPanelVisible = false;` alongside other state variables
       - In `handleMouseDown()`: check `if (resultPanelVisible && !toolbar.contains(e.target))` → call `hideResultPanel()` AND `hideToolbar()`, set `resultPanelVisible = false`
       - In `handleSelectionChange()`: if `resultPanelVisible`, also hide result panel when selection clears

    4. **Close button handler**: calls `hideResultPanel()`, sets `resultPanelVisible = false`, sends `TOOLBAR_INLINE_CANCEL` to abort in-flight request

    5. **Retry button handler**: re-sends the `TOOLBAR_INLINE_ACTION` message with the same action and selectedText, shows loading state again

    6. **Ensure toolbar doesn't hide when result panel is showing**: The current `hideToolbar()` call in the click handler must be removed. Toolbar stays visible while result panel is open.

  - Write integration tests verifying the full flow

  **Must NOT do**:
  - Do NOT modify ChatPanel.tsx or side panel
  - Do NOT modify context menu
  - Do NOT add streaming to result panel

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: T6, F1-F4
  - **Blocked By**: T3, T4

  **References**:

  **Pattern References**:
  - `entrypoints/floating-toolbar.content.ts:194-216` — Current button click handler (to be modified)
  - `entrypoints/floating-toolbar.content.ts:227-231` — handleMouseDown (to add resultPanelVisible check)
  - `entrypoints/floating-toolbar.content.ts:291-301` — handleSelectionChange (to add resultPanelVisible check)
  - `entrypoints/content.ts` — Example of content script with onMessage listener

  **API/Type References**:
  - `utils/types.ts` — TOOLBAR_INLINE_ACTION, TOOLBAR_INLINE_RESULT, TOOLBAR_INLINE_ERROR, TOOLBAR_INLINE_CANCEL
  - `utils/actionPrompts.ts:getActionPrompt` — For retry logic

  **Test References**:
  - `tests/floatingToolbar.test.ts` — Existing toolbar interaction tests

  **Acceptance Criteria**:
  - [ ] Button click sends TOOLBAR_INLINE_ACTION (not TOOLBAR_ACTION)
  - [ ] onMessage listener handles TOOLBAR_INLINE_RESULT and TOOLBAR_INLINE_ERROR
  - [ ] resultPanelVisible flag prevents auto-hide while panel is showing
  - [ ] Click outside toolbar+panel closes everything
  - [ ] Close button hides panel and sends cancel
  - [ ] Retry button re-sends the action
  - [ ] `npx vitest run tests/floatingToolbar.test.ts` → PASS
  - [ ] `npx vitest run` → all tests pass (no regressions)
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: Full flow — button click shows loading then result
    Tool: Bash
    Steps:
      1. Run `npx vitest run tests/floatingToolbar.test.ts`
      2. Verify end-to-end flow tests pass
    Expected Result: Click → TOOLBAR_INLINE_ACTION sent → result received → panel shows content
    Evidence: .sisyphus/evidence/task-5-e2e-tests.txt

  Scenario: Click outside closes result panel
    Tool: Bash
    Steps:
      1. Run tests simulating mousedown outside toolbar while resultPanelVisible is true
      2. Verify panel and toolbar are hidden
    Expected Result: Both panel and toolbar hide, resultPanelVisible reset to false
    Evidence: .sisyphus/evidence/task-5-click-outside.txt

  Scenario: No regressions in existing tests
    Tool: Bash
    Steps:
      1. Run `npx vitest run`
      2. Check total pass count ≥ 194
    Expected Result: All existing tests still pass
    Evidence: .sisyphus/evidence/task-5-all-tests.txt
  ```

  **Commit**: YES
  - Message: `feat: wire up inline action flow end-to-end`
  - Files: `entrypoints/floating-toolbar.content.ts`, `tests/floatingToolbar.test.ts`

---

- [ ] 6. Add cancel/abort support for in-flight requests

  **What to do**:
  - Ensure Close button during loading state sends `TOOLBAR_INLINE_CANCEL` message to background
  - In `background.ts`, handle `TOOLBAR_INLINE_CANCEL`:
    - Look up active AbortController for the sender tab
    - Call `controller.abort()`
    - Clean up stored controller reference
  - In `floating-toolbar.content.ts`:
    - Close button handler sends: `browser.runtime.sendMessage({ type: 'TOOLBAR_INLINE_CANCEL' })`
    - This should already be partially wired from Task 5, this task ensures robustness
  - Write tests for cancel flow

  **Must NOT do**:
  - Do NOT modify any non-related handlers

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 5)
  - **Blocks**: F1-F4
  - **Blocked By**: T5

  **References**:

  **Pattern References**:
  - `entrypoints/background.ts` — AbortController pattern (if exists, or create new)
  - `providers/chat.ts` — ChatProvider.chat() accepts AbortSignal

  **Acceptance Criteria**:
  - [ ] Close during loading sends TOOLBAR_INLINE_CANCEL
  - [ ] Background aborts the active AbortController for the tab
  - [ ] `npx vitest run` → all tests pass
  - [ ] `bun run build` → PASS

  **QA Scenarios**:

  ```
  Scenario: Cancel aborts in-flight AI request
    Tool: Bash
    Steps:
      1. Run cancel-specific tests
      2. Verify AbortController.abort() is called
    Expected Result: Cancel message triggers abort, no result is sent
    Evidence: .sisyphus/evidence/task-6-cancel-tests.txt
  ```

  **Commit**: YES
  - Message: `feat: add cancel support for inline toolbar actions`
  - Files: `entrypoints/background.ts`, `entrypoints/floating-toolbar.content.ts`, `tests/background.test.ts`, `tests/floatingToolbar.test.ts`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `npx vitest run`. Review all changed files for: `as any`, `@ts-ignore`, empty catches, console.log in prod, commented-out code. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute EVERY QA scenario from EVERY task. Test cross-task integration. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| # | Message | Files | Pre-commit |
|---|---------|-------|------------|
| 1 | `feat: extract action prompt templates to shared module` | `utils/actionPrompts.ts`, `utils/actionPrompts.test.ts` | `npx vitest run utils/actionPrompts.test.ts` |
| 2 | `feat: add inline action message types` | `utils/types.ts` | `bun run build` |
| 3 | `feat: add background handler for inline toolbar actions` | `entrypoints/background.ts`, `tests/background.test.ts` | `npx vitest run tests/background.test.ts` |
| 4 | `feat: add inline result panel UI to floating toolbar` | `entrypoints/floating-toolbar.content.ts`, `tests/floatingToolbar.test.ts` | `npx vitest run tests/floatingToolbar.test.ts` |
| 5 | `feat: wire up inline action flow end-to-end` | `entrypoints/floating-toolbar.content.ts`, `tests/floatingToolbar.test.ts` | `npx vitest run` |
| 6 | `feat: add cancel support for inline toolbar actions` | `entrypoints/background.ts`, `entrypoints/floating-toolbar.content.ts`, `tests/*.test.ts` | `npx vitest run` |

---

## Success Criteria

### Verification Commands
```bash
bun run build          # Expected: zero errors
npx vitest run         # Expected: all tests pass (≥194 + new tests)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Side panel and context menu still work as before
