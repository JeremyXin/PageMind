# Chat-First Redesign: Slash Command + Full-Screen Chat Layout

## TL;DR

> **Quick Summary**: Restructure the sidepanel from a split "summary on top / chat on bottom" layout into a chat-first full-screen design where the "summarize page" feature becomes a `/summarize` slash command inside the chat input.
>
> **Deliverables**:
> - `App.tsx` simplified to render-only shell (no summary state machine)
> - `ChatPanel` takes full viewport height + absorbs tab URL ownership + gains `/summarize` handler
> - `ChatInput` gains slash command detection + animated popup (keyboard navigable)
> - `utils/formatSummary.ts` — serializes `SummaryResult` to plain formatted text
> - `utils/errorMessages.ts` — extracted error message map (shared util)
> - 3 files deleted: `LoadingState.tsx`, `ErrorState.tsx`, `SummaryView.tsx`
>
> **Estimated Effort**: Medium (3–4h)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: T1 (utils) → T2 (ChatInput) → T3 (ChatPanel) → T4 (App.tsx) → T5 (cleanup)

---

## Context

### Original Request
用户反映聊天对话框空间太小（固定 45% 高度），两部分功能割裂感强。希望改为聊天全屏为主，总结功能改为 `/summarize` slash command。

### Interview Summary
- **布局方向**: 聊天全屏，摘要变命令，不是快捷按钮
- **Slash Command**: 输入 `/` 弹出命令列表（键盘导航）
- **加载状态**: 聊天气泡内进度文字（非全屏 loading）
- **摘要渲染**: Plain text（V1），保留 SummaryView 为 V2 rich card 预留
- **改动范围**: 仅布局重组 + slash command，不新增功能模块

### Metis Review
**Identified Gaps (addressed)**:
- pageContext/tabUrl 归属 → ChatPanel 内部 `browser.tabs.query`
- SummaryView 处置 → Option B plain text，`formatSummaryAsText()` 工具函数
- 并发保护 → `isSummarizing === true` 时 popup 中 `/summarize` aria-disabled
- Edge case EC4 → `handleClearSession` 同时清空 `pageContext`
- Edge case EC8 → `isSummarizing` 标志防止重复触发
- EC5 → slash 检测仅在输入值以 `/` 开头时触发

---

## Work Objectives

### Core Objective
将 sidepanel 改造为 chat-first 全屏布局，总结功能通过 `/summarize` slash command 触发，结果以助手气泡形式展示在对话流中。

### Concrete Deliverables
- `utils/formatSummary.ts` — `formatSummaryAsText(result: SummaryResult): string`
- `utils/errorMessages.ts` — 从 ErrorState 抽取的错误信息映射表
- `entrypoints/sidepanel/components/ChatInput.tsx` — slash command 弹出层
- `entrypoints/sidepanel/components/ChatPanel.tsx` — 全屏布局 + `/summarize` 处理
- `entrypoints/sidepanel/App.tsx` — 精简为渲染 shell
- Deleted: `LoadingState.tsx`, `ErrorState.tsx`, `SummaryView.tsx`

### Definition of Done
- [ ] `npx vitest run` — 所有测试通过（含新增的 slash command 测试）
- [ ] `npx wxt build` — 构建成功无报错
- [ ] `grep -E "LoadingState|SummaryView|ErrorState" entrypoints/sidepanel/App.tsx` → 0 matches
- [ ] ChatPanel 根元素高度等于 viewport 高度

### Must Have
- ChatPanel 全屏（`h-screen`），无固定 45% 约束
- 输入 `/` 弹出命令列表，支持键盘 ↑↓/Enter/Escape
- `/summarize` 执行：用户气泡 + 加载助手气泡 → 结果替换加载气泡
- isSummarizing=true 时 `/summarize` 在 popup 中禁用
- handleClearSession 清空 pageContext
- pageContext 在后续 CHAT_SEND 中注入

### Must NOT Have (Guardrails)
- 不修改 `background.ts` 或任何 background entrypoint
- 不修改 `chatStorage` 逻辑
- 不添加新的 ChatMessage 类型变体（无 summary-card type）
- 不添加上下文 badge UI（V2 功能）
- 不添加第二个 slash command（仅 `/summarize`）
- 不更改 SettingsModal.tsx
- 不为 `/summarize` 实现流式输出（它是 Promise，不是流）
- 不使用 CSS 文件，仅 Tailwind

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Vitest + jsdom + @testing-library/react)
- **Automated tests**: TDD — tests written before/alongside implementation
- **Framework**: Vitest + React Testing Library

### QA Policy
每个 Task 包含 agent-executed QA scenarios。证据保存至 `.sisyphus/evidence/`。

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — utilities + test groundwork):
├── Task 1: formatSummaryAsText utility + tests [quick]
└── Task 2: errorMessages util extraction + ChatInput slash tests (RED) [quick]

Wave 2 (After Wave 1 — core implementation):
├── Task 3: ChatInput slash command UI [visual-engineering]
├── Task 4: ChatPanel /summarize handler + full-screen layout [unspecified-high]
└── Task 5: App.tsx simplification + file cleanup [quick]

Wave FINAL (After ALL tasks):
├── Task F1: Full vitest run + build verification [quick]
└── Task F2: Scope fidelity check [quick]
```

### Dependency Matrix
- **T1**: none → T4
- **T2**: none → T3
- **T3**: T2 → T4
- **T4**: T1, T3 → T5
- **T5**: T4 → F1, F2

---

## TODOs

- [ ] 1. `utils/formatSummary.ts` — formatSummaryAsText utility + tests

  **What to do**:
  - Create `utils/formatSummary.ts` exporting `formatSummaryAsText(result: SummaryResult): string`
  - The function serializes a `SummaryResult` object into a readable plain-text string:
    ```
    【摘要】
    {result.summary}

    【重点】
    • {keyPoint1}
    • {keyPoint2}

    【观点】
    {perspective}: {stance}

    【最佳实践】
    ✓ {practice}
    ```
  - Sections with empty arrays (viewpoints/bestPractices) are omitted entirely
  - Create `utils/formatSummary.test.ts` — TDD: write tests FIRST, then implement

  **Must NOT do**:
  - No markdown rendering library
  - No HTML tags
  - Do not modify `utils/types.ts`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:
  - `utils/types.ts` — `SummaryResult` type definition (summary, keyPoints[], viewpoints[], bestPractices[])

  **Acceptance Criteria**:
  - [ ] `utils/formatSummary.test.ts` exists with ≥4 test cases
  - [ ] Full SummaryResult → includes all 4 sections in output
  - [ ] Empty viewpoints/bestPractices → those sections omitted
  - [ ] `npx vitest run utils/formatSummary.test.ts` → PASS

  **QA Scenarios**:
  ```
  Scenario: full result formatting
    Tool: Bash (vitest)
    Steps: run test with fixture { summary: "test", keyPoints: ["a"], viewpoints: [{perspective:"p", stance:"s"}], bestPractices: ["b"] }
    Expected: output contains "【摘要】", "test", "• a", "p:", "✓ b"
    Evidence: .sisyphus/evidence/task-1-format-full.txt (vitest output)

  Scenario: empty optional sections
    Tool: Bash (vitest)
    Steps: run test with fixture { summary: "test", keyPoints: ["a"], viewpoints: [], bestPractices: [] }
    Expected: output does NOT contain "【观点】" or "【最佳实践】"
    Evidence: .sisyphus/evidence/task-1-format-empty.txt
  ```

  **Commit**: YES (group with T2)
  - Message: `test: add formatSummaryAsText and slash command tests`
  - Files: `utils/formatSummary.ts`, `utils/formatSummary.test.ts`

- [ ] 2. `utils/errorMessages.ts` extraction + `ChatInput` slash command tests (RED phase)

  **What to do**:
  - Read `entrypoints/sidepanel/components/ErrorState.tsx` — find the error code → message mapping
  - Create `utils/errorMessages.ts` exporting `getErrorMessage(code: string): string` (or an `ERROR_MESSAGES` map)
  - Write `entrypoints/sidepanel/components/ChatInput.test.tsx` **new test cases** (append to existing file):
    - Test: typing `/` as first char → `getByRole('listbox')` is visible
    - Test: typing `/sum` → filtered list shows only 1 option matching 'summarize'
    - Test: typing `/` then pressing Escape → `queryByRole('listbox')` is null, input value still `/`
    - Test: typing `/` in middle of text (e.g. `http://x`) → popup does NOT appear
    - Test: pressing ArrowDown then Enter on command → `onCommand` callback called with `'summarize'`
    - Test: disabled state (isSummarizing=true) → `/summarize` entry has `aria-disabled="true"`
  - These tests will FAIL (RED) until Task 3 implements the feature — that is correct

  **Must NOT do**:
  - Do not modify ChatInput.tsx itself in this task
  - Do not delete ErrorState.tsx yet (only extract the message map)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `entrypoints/sidepanel/components/ErrorState.tsx` — error code→message map to extract
  - `entrypoints/sidepanel/components/ChatInput.tsx` — existing component + test file to extend
  - `entrypoints/sidepanel/components/ChatInput.test.tsx` — existing tests (do not break them)

  **Acceptance Criteria**:
  - [ ] `utils/errorMessages.ts` exists and exports error message lookup
  - [ ] New test cases added to `ChatInput.test.tsx` (≥6 new tests)
  - [ ] New tests are RED (expected — ChatInput not yet implemented)
  - [ ] Existing ChatInput tests still PASS

  **QA Scenarios**:
  ```
  Scenario: existing tests still green
    Tool: Bash (vitest)
    Command: npx vitest run entrypoints/sidepanel/components/ChatInput.test.tsx
    Expected: original tests pass, new tests fail with "unable to find role listbox" or similar
    Evidence: .sisyphus/evidence/task-2-chatinput-red.txt
  ```

  **Commit**: YES (group with T1)
  - Message: `test: add formatSummaryAsText and slash command tests`
  - Files: `utils/errorMessages.ts`, `ChatInput.test.tsx` (new tests appended)

- [ ] 3. `ChatInput.tsx` — slash command popup UI

  **What to do**:
  - Modify `ChatInput.tsx` to support slash commands:
    1. Add prop: `onCommand?: (commandName: string) => void`
    2. Add prop: `isSummarizing?: boolean` (for disabling /summarize in popup)
    3. Define command registry as a simple const array at top of file:
       ```typescript
       const SLASH_COMMANDS = [
         { name: 'summarize', description: '总结当前页面内容', icon: '📄' }
       ] as const;
       ```
    4. State: `showCommandPopup: boolean`, `commandFilter: string`, `selectedIndex: number`
    5. Slash detection: when textarea value changes to start with `/`, show popup and set `commandFilter = value.slice(1)`
    6. Filter commands: `SLASH_COMMANDS.filter(c => c.name.startsWith(commandFilter))`
    7. Popup renders above textarea: `position: absolute; bottom: 100%`; role="listbox"
    8. Each option: role="option", aria-disabled when (isSummarizing && name === 'summarize')
    9. Keyboard: ArrowUp/Down moves `selectedIndex`, Enter selects current command, Escape closes popup
    10. On command select: clear textarea, call `onCommand(commandName)`, close popup
    11. If user types beyond `/xxx` to something that matches no command, popup hides

  **Must NOT do**:
  - Do not add a context badge above the input (V2 feature)
  - Only 1 command in SLASH_COMMANDS array
  - Do not change the existing `onSend` prop behavior

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4, but T4 depends on T3 being done first)
  - **Parallel Group**: Wave 2 — start after T2 tests are written
  - **Blocks**: Task 4
  - **Blocked By**: Task 2 (need tests to be written first for TDD)

  **References**:
  - `entrypoints/sidepanel/components/ChatInput.tsx` — current implementation (textarea, handleKeyDown, auto-resize)
  - `entrypoints/sidepanel/components/ChatInput.test.tsx` — RED tests from Task 2 that this task must make GREEN
  - Popup positioning pattern: `position: absolute; bottom: 100%; left: 0; right: 0; z-index: 50`

  **Acceptance Criteria**:
  - [ ] `npx vitest run entrypoints/sidepanel/components/ChatInput.test.tsx` → ALL tests GREEN (including the 6 new ones from T2)
  - [ ] Popup has `role="listbox"`, each option has `role="option"`
  - [ ] Existing send-on-Enter behavior unchanged (when no popup is showing)
  - [ ] Popup does NOT appear when `/` is not the first character

  **QA Scenarios**:
  ```
  Scenario: slash triggers popup
    Tool: vitest + RTL
    Steps: render ChatInput, fireEvent.change(textarea, { value: '/' }) → assert getByRole('listbox')
    Expected: listbox visible with 1 option "📄 summarize"
    Evidence: .sisyphus/evidence/task-3-popup-visible.txt

  Scenario: keyboard navigation
    Tool: vitest + RTL
    Steps: show popup → fireEvent.keyDown(ArrowDown) → fireEvent.keyDown(Enter)
    Expected: onCommand called with 'summarize', popup gone, textarea value ''
    Evidence: .sisyphus/evidence/task-3-keyboard-nav.txt

  Scenario: mid-text slash no popup
    Tool: vitest + RTL
    Steps: fireEvent.change(textarea, { value: 'see http://x.com' })
    Expected: queryByRole('listbox') === null
    Evidence: .sisyphus/evidence/task-3-no-popup-midtext.txt
  ```

  **Commit**: YES
  - Message: `feat: add slash command popup to ChatInput`
  - Files: `entrypoints/sidepanel/components/ChatInput.tsx`
  - Pre-commit: `npx vitest run entrypoints/sidepanel/components/ChatInput.test.tsx`

- [ ] 4. `ChatPanel.tsx` — full-screen layout + `/summarize` handler

  **What to do**:
  1. **Remove** `disabled` prop (was passed from App.tsx summary loading state — no longer exists)
  2. **Add** internal state:
     - `pageContext: { url: string; summary: SummaryResult } | null` (moved from App.tsx props)
     - `isSummarizing: boolean`
     - `currentTabUrl: string` (fetched internally via `browser.tabs.query`)
  3. **Fetch tab URL on mount** (alongside existing session loading):
     ```typescript
     browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
       if (tabs[0]?.url) setCurrentTabUrl(tabs[0].url);
     });
     ```
  4. **Add `handleSlashCommand(commandName: string)`**:
     - If `commandName === 'summarize'`:
       a. If `isSummarizing === true`, return early (concurrent guard)
       b. Add user bubble: `{ role: 'user', content: '📄 总结本页', ... }`
       c. Add loading assistant bubble: `{ role: 'assistant', content: '正在分析页面内容…', id: 'summarize-loading', ... }`
       d. Set `isSummarizing = true`
       e. Call `sendToBackground<SummaryResult>({ type: 'EXTRACT_AND_SUMMARIZE' })`
       f. On success: replace loading bubble with `formatSummaryAsText(response.data)`, set `pageContext = { url: currentTabUrl, summary: response.data }`, set `isSummarizing = false`
       g. On error: replace loading bubble with error message from `getErrorMessage(error.code)`, set `isSummarizing = false`
  5. **Pass `onCommand={handleSlashCommand}` and `isSummarizing` to `ChatInput`**
  6. **On `handleClearSession`**: also set `pageContext = null`
  7. **Layout**: Remove outer wrapper from App.tsx (the `border-t border-gray-200 flex flex-col style={{ height: '45%' }}`). ChatPanel's own root div should be `h-screen` (or `h-full` if parent is screen-height).
  8. **Remove `summaryContext` prop** (ChatPanel now owns it internally)
  9. **Update `CHAT_SEND` port message**: use internal `pageContext` instead of props
  10. **Write tests** in `ChatPanel.test.tsx` for the new flow (TDD: write tests first, then implement)

  **Must NOT do**:
  - Do not touch `portRef`, `createPortListener`, streaming logic
  - Do not touch `handleNewSession`, `handleClearSession` session logic (only add `pageContext = null` reset)
  - Do not add a context badge above the input
  - Do not add typing indicator animation — plain "正在分析页面内容…" text only
  - Do not implement streaming for summarize (it's a Promise)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 — sequential after Task 3
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 3

  **References**:
  - `entrypoints/sidepanel/components/ChatPanel.tsx` — full current implementation (streaming, port, session)
  - `entrypoints/sidepanel/components/ChatPanel.test.tsx` — existing tests (must stay green)
  - `messaging/sender.ts` — `sendToBackground<T>()` API (returns `Promise<MessageResponse<T>>`)
  - `utils/types.ts` — `SummaryResult`, `ChatMessage` types
  - `utils/formatSummary.ts` — from Task 1
  - `utils/errorMessages.ts` — from Task 2
  - Existing pattern for appending messages: `setMessages(prev => [...prev, newMessage])`
  - Existing pattern for updating a message by ID: find by ID and replace in array

  **Acceptance Criteria**:
  - [ ] ChatPanel root element has class `h-screen` or fills full viewport
  - [ ] No `summaryContext` prop on ChatPanel's interface
  - [ ] `isSummarizing=true` while summarize Promise is pending
  - [ ] Loading bubble replaced by result text after Promise resolves
  - [ ] Error from EXTRACT_AND_SUMMARIZE shows inline error bubble
  - [ ] `pageContext` injected in `CHAT_SEND` payload after summarize completes
  - [ ] `pageContext` reset to null on `handleClearSession`
  - [ ] `npx vitest run entrypoints/sidepanel/components/ChatPanel.test.tsx` → ALL PASS

  **QA Scenarios**:
  ```
  Scenario: /summarize happy path
    Tool: vitest + RTL
    Steps:
      1. mock sendToBackground to resolve with SummaryResult fixture
      2. trigger handleSlashCommand('summarize')
      3. assert user bubble "📄 总结本页" appears immediately
      4. assert loading bubble "正在分析页面内容…" appears
      5. await Promise resolution
      6. assert loading bubble GONE, assistant bubble with summary text present
    Expected: getByText(/SummaryResult.summary substring/) in document
    Evidence: .sisyphus/evidence/task-4-summarize-happy.txt

  Scenario: /summarize error path
    Tool: vitest + RTL
    Steps:
      1. mock sendToBackground to return { success: false, error: { code: 'NO_API_KEY', message: '...' } }
      2. trigger handleSlashCommand('summarize')
      3. await rejection handling
    Expected: error message bubble present, isSummarizing=false, no loading bubble
    Evidence: .sisyphus/evidence/task-4-summarize-error.txt

  Scenario: concurrent guard
    Tool: vitest + RTL
    Steps:
      1. set isSummarizing=true in component state
      2. trigger handleSlashCommand('summarize') again
    Expected: no additional user/loading bubbles added, sendToBackground NOT called a second time
    Evidence: .sisyphus/evidence/task-4-concurrent-guard.txt

  Scenario: pageContext in follow-up CHAT_SEND
    Tool: vitest spy
    Steps:
      1. run /summarize → resolve
      2. spy on portRef.current.postMessage
      3. call handleSend('what is this about')
    Expected: postMessage called with payload.pageContext !== null
    Evidence: .sisyphus/evidence/task-4-pagecontext-injection.txt

  Scenario: clearSession resets pageContext
    Tool: vitest + RTL
    Steps:
      1. run /summarize → resolve (pageContext now set)
      2. call handleClearSession()
      3. spy on portRef.postMessage with a new chat send
    Expected: payload.pageContext is null/undefined
    Evidence: .sisyphus/evidence/task-4-clear-resets-context.txt
  ```

  **Commit**: YES
  - Message: `feat: implement /summarize slash command and full-screen chat layout`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`, `entrypoints/sidepanel/components/ChatPanel.test.tsx`
  - Pre-commit: `npx vitest run entrypoints/sidepanel/components/ChatPanel.test.tsx`

- [ ] 5. `App.tsx` simplification + file cleanup

  **What to do**:
  1. **Rewrite App.tsx** to be a minimal shell:
     ```tsx
     import { useState } from 'react';
     import ChatPanel from './components/ChatPanel';
     import SettingsModal from './components/SettingsModal';

     export default function App() {
       const [showSettings, setShowSettings] = useState(false);
       return (
         <>
           <ChatPanel onOpenSettings={() => setShowSettings(true)} />
           {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
         </>
       );
     }
     ```
  2. Add `onOpenSettings?: () => void` prop to ChatPanel (to wire the settings gear icon in ChatPanel's header)
  3. **Verify no remaining references** using `lsp_find_references` or grep before deleting:
     - `LoadingState.tsx` — check 0 references outside itself
     - `ErrorState.tsx` — check 0 references outside itself (after errorMessages extracted)
     - `SummaryView.tsx` — check 0 references outside itself
  4. **Delete the 3 files**:
     - `entrypoints/sidepanel/components/LoadingState.tsx`
     - `entrypoints/sidepanel/components/ErrorState.tsx`
     - `entrypoints/sidepanel/components/SummaryView.tsx`
  5. Run `npx wxt build` to confirm no broken imports

  **Must NOT do**:
  - Do not delete `LoadingState.test.tsx`-style test files that don't exist — skip if absent
  - Do not keep any `AppState`, `handleSummarize`, `summaryResult` state in App.tsx
  - Do not add `h-screen` to App.tsx — ChatPanel owns its own height

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 — sequential after Task 4
  - **Blocks**: F1, F2
  - **Blocked By**: Task 4

  **References**:
  - `entrypoints/sidepanel/App.tsx` — current file (125 lines) to be replaced
  - `entrypoints/sidepanel/components/SettingsModal.tsx` — unchanged, just re-wired

  **Acceptance Criteria**:
  - [ ] `grep -E "LoadingState|SummaryView|ErrorState|handleSummarize|AppState" entrypoints/sidepanel/App.tsx` → 0 matches
  - [ ] `LoadingState.tsx`, `ErrorState.tsx`, `SummaryView.tsx` no longer exist on disk
  - [ ] `npx wxt build` exits 0 (no broken imports)
  - [ ] `npx vitest run` → all tests pass (0 failures)

  **QA Scenarios**:
  ```
  Scenario: dead file deletion verified
    Tool: Bash
    Command: ls entrypoints/sidepanel/components/LoadingState.tsx entrypoints/sidepanel/components/ErrorState.tsx entrypoints/sidepanel/components/SummaryView.tsx 2>&1
    Expected: "No such file or directory" for all three
    Evidence: .sisyphus/evidence/task-5-files-deleted.txt

  Scenario: build passes cleanly
    Tool: Bash
    Command: npx wxt build 2>&1 | tail -5
    Expected: output contains "Build success" or "Finished in"
    Evidence: .sisyphus/evidence/task-5-build-pass.txt

  Scenario: App.tsx import audit
    Tool: Bash
    Command: grep -E "LoadingState|SummaryView|ErrorState" entrypoints/sidepanel/App.tsx; echo "exit:$?"
    Expected: exit:1 (grep finds nothing)
    Evidence: .sisyphus/evidence/task-5-app-audit.txt
  ```

  **Commit**: YES
  - Message: `refactor: simplify App.tsx and delete unused summary components`
  - Files: `entrypoints/sidepanel/App.tsx` (rewritten), 3 deleted files
  - Pre-commit: `npx wxt build && npx vitest run`

---

## Final Verification Wave

- [ ] F1. **Build + Test Verification** — `quick`

  Run `npx vitest run` → all tests pass. Run `npx wxt build` → exits 0.
  Run `grep -E "LoadingState|SummaryView|ErrorState" entrypoints/sidepanel/App.tsx` → 0 matches.
  Output: `Tests [N pass/0 fail] | Build [PASS] | Imports [CLEAN] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Scope Fidelity Check** — `quick`

  For each task: verify "Must NOT do" compliance. Check background.ts is unmodified (`git diff entrypoints/background.ts → empty`). Check chatStorage.ts is unmodified. Check no new npm packages installed.
  Output: `Must NOT violations [CLEAN/N] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- T1+T2: `test: add formatSummaryAsText and slash command tests`
- T3: `feat: add slash command popup to ChatInput`
- T4: `feat: implement /summarize slash command and full-screen chat layout`
- T5: `refactor: simplify App.tsx and delete unused summary components`

---

## Success Criteria

```bash
npx vitest run          # Expected: all tests pass, 0 failures
npx wxt build           # Expected: Build success, exits 0
grep -E "LoadingState|SummaryView|ErrorState" entrypoints/sidepanel/App.tsx  # Expected: no output
```
