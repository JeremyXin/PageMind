# Slash Commands 扩展 + 选中文本浮窗 Toolbar

## TL;DR

> **Quick Summary**: 为现有 AI 侧边栏扩展 slash commands 至 10 个命令，并新增选中文本浮窗 Toolbar 提供零摩擦 AI 操作入口。
>
> **Deliverables**:
> - `ChatInput.tsx` — SLASH_COMMANDS 数组扩展至 10 个命令（/summarize, /translate, /rewrite, /shorter, /longer, /eli5, /pros-cons, /actions, /clear, /new, /help）
> - `ChatPanel.tsx` — handleSlashCommand() 新增 10 个 case 处理器，/clear 修复 abortController
> - `entrypoints/floating-toolbar.content.ts` — 新文件，选中文本浮窗内容脚本
> - `background.ts` — 新增 TOOLBAR_ACTION 消息处理器
> - `utils/types.ts` — MessageType 新增 'TOOLBAR_ACTION'
> - 测试文件：`ChatInput.test.tsx`（扩展）、`ChatPanel.test.tsx`（扩展）、`tests/floatingToolbar.test.ts`（新建）
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: T1 → T2 → T3 → T4 → T5 → F1-F4

---

## Context

### Original Request
用户希望实施竞品调研后的两个功能：
1. Slash Commands 扩展（Phase 1 + Phase 2 命令集）
2. 选中文本浮窗 Toolbar（Monica AI 核心亮点，零摩擦 AI 操作）

### Interview Summary
**Key Discussions**:
- **浮窗样式方案**: 纯 inline style（不用 Tailwind，不用 Shadow DOM），Sidepanel 继续用 Tailwind
- **/translate 默认语言**: 翻译为中文，与现有右键菜单保持一致
- **页面内容来源**: 提取当前整个页面内容（与 /summarize 一致，通过 Readability）

**Research Findings**:
- Monica AI 的浮窗 Toolbar 是其核心 UX 亮点，ChatGPTBox 也有类似 selection bubble
- SideMagic 使用 WXT 框架（与本项目相同），可参考其 content script 结构
- `position: fixed` 在有 CSS transform 的页面会失效，必须用 `position: absolute` + scrollY/scrollX

### Metis Review
**Identified Gaps** (addressed):
- Tailwind/Shadow DOM 冲突 → 已决策：浮窗用 pure inline style
- /translate 语言未定 → 已决策：默认翻译为中文
- `handleClearSession()` 未调用 abortController.abort() → 在 T2 中修复
- `position: fixed` CSS transform 问题 → 用 absolute + body anchor
- 页面内容类命令输入来源 → 已决策：提取整个页面（同 /summarize）
- `/help` 动态生成 → 从 SLASH_COMMANDS 数组运行时生成

---

## Work Objectives

### Core Objective
扩展 ChatInput 的 slash command 系统到 10 个实用命令，并新增一个注入宿主页面的浮窗 Toolbar，使用户在选中文本时无需右键菜单即可触发 AI 操作。

### Concrete Deliverables
- `ChatInput.tsx` SLASH_COMMANDS 数组：10 个命令，含图标和描述
- `ChatPanel.tsx` handleSlashCommand：处理所有 10 个命令，/clear 修复 abort
- `entrypoints/floating-toolbar.content.ts`：新的 WXT content script
- `background.ts`：新增 TOOLBAR_ACTION handler（镜像现有 context menu 流程）
- `utils/types.ts`：MessageType 联合类型新增 `'TOOLBAR_ACTION'`
- 所有新代码有对应单元测试，`bun run build` 零 TS 错误

### Definition of Done
- [ ] `bun run build` 零错误零警告
- [ ] `pnpm test` 全部通过（新增 30+ 测试，原有 170 不退化）
- [ ] 加载插件后，Chat 输入框输入 `/` 显示 10 个命令
- [ ] `/help` 显示所有命令列表，无 AI 调用
- [ ] `/clear` 正确终止流式传输并清空会话
- [ ] 在 example.com 选中文本后 250ms 内浮窗出现
- [ ] 浮窗点击 Explain/Translate/Rewrite → 侧边栏打开 + 消息发送
- [ ] 在 `<input>` 内选文本，浮窗不出现
- [ ] 选文字少于 3 个字符，浮窗不出现

### Must Have
- 10 个 slash commands，全部可在 Chat 输入框触发
- `/clear` 在流式传输中调用时，必须先 abort 正在进行的请求
- 浮窗使用 pure inline style（无 Tailwind，无 Shadow DOM）
- 浮窗用 `position: absolute` 定位，锚定 `document.body`
- 在 `INPUT`、`TEXTAREA`、`contenteditable` 内选文不显示浮窗
- 选文长度 < 3 字符不显示浮窗
- 浮窗最多 3 个按钮（Explain / Translate / Rewrite），无 Summarize
- 所有测试通过，`bun run build` 零错误

### Must NOT Have (Guardrails)
- 不得新增 npm 包
- 不得在 content script 中使用 Tailwind class
- 不得使用 Shadow DOM（对整个项目保持原有约束）
- 不得修改 `providers/prompts.ts`（slash commands 的 prompt 直接内联在 ChatPanel.tsx）
- 不得在 Feature 2（浮窗）中修改 `ChatPanel.tsx`（现有 CONTEXT_MENU_ACTION handler 已足够）
- 不得新增超过 1 个 MessageType（只加 'TOOLBAR_ACTION'）
- 不得新增右键菜单项（已有 3 个，最多 4 个，暂不添加）
- 不得添加浮窗拖拽、动画、键盘快捷键（这是 Tier 1 实现，保持简单）
- 不得在 /translate 添加语言选择器（默认中文，参数扩展留到后期）
- 浮窗不需要 summarize 按钮（区分于右键菜单，聚焦选中文本的操作）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest 3.0.0 + jsdom + @webext-core/fake-browser)
- **Automated tests**: YES (Tests-after，与现有项目保持一致)
- **Framework**: vitest + @testing-library/react + jsdom
- **Pattern**: 实现后补充测试，验证行为正确性

### QA Policy
每个 Task 必须包含 agent-executed QA Scenarios。Evidence 保存到 `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`。

- **Unit tests**: vitest + fake-browser，所有逻辑可在 jsdom 环境验证
- **Build verification**: `bun run build` 零错误
- **Integration**: 通过 curl/bash 验证 build 产物存在

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── T1: types.ts 新增 TOOLBAR_ACTION + 修复 abortController [quick]
└── T2: ChatInput.tsx 扩展 SLASH_COMMANDS 数组 + 测试 [quick]

Wave 2 (After Wave 1 — core implementations):
├── T3: ChatPanel.tsx handleSlashCommand 新增 9 个命令 + 测试 [unspecified-high]
└── T4: background.ts TOOLBAR_ACTION handler + floating-toolbar.content.ts [unspecified-high]

Wave 3 (After Wave 2 — integration verification):
└── T5: 集成构建验证 + 全量测试运行 [quick]

Wave FINAL (After ALL tasks):
├── F1: Plan Compliance Audit [oracle]
├── F2: Code Quality Review [unspecified-high]
├── F3: Real Manual QA [unspecified-high]
└── F4: Scope Fidelity Check [deep]
```

### Dependency Matrix

- **T1**: — → T2, T3, T4
- **T2**: T1 → T3
- **T3**: T1, T2 → T5
- **T4**: T1 → T5
- **T5**: T3, T4 → F1-F4

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`, T2 → `quick`
- **Wave 2**: T3 → `unspecified-high`, T4 → `unspecified-high`
- **Wave 3**: T5 → `quick`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] T1. 基础类型 + abortController 修复

  **What to do**:
  - 在 `utils/types.ts` 的 `MessageType` 联合类型中新增 `'TOOLBAR_ACTION'`（位置：第 66 行附近，在 `'CHAT_NEW_SESSION'` 后面追加）
  - 检查 `ChatPanel.tsx::handleClearSession()`（第 251 行）：若未调用 `portRef.current?.disconnect()` 或 abort 逻辑，补充以下修复：在 `clearSession` 前先 abort 正在进行的流式请求。具体：`if (isStreaming) { portRef.current?.disconnect(); reconnectPort(); setIsStreaming(false); setStreamingContent(''); streamingContentRef.current = ''; }`
  - 同理检查 `handleNewSession()`（第 259 行）：已调用 `reconnectPort()`，只需确认 streaming state 也被重置

  **Must NOT do**:
  - 不得修改除 `utils/types.ts` 和 `ChatPanel.tsx` 之外的文件
  - 不得新增其他 MessageType，只加 `'TOOLBAR_ACTION'` 一个
  - 不得重构现有的 clear/new 逻辑，只补充 abort 部分

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单纯的类型声明扩展 + 数行逻辑补充，无复杂判断
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（T2、T3、T4 都依赖此任务）
  - **Parallel Group**: Wave 1（先行任务）
  - **Blocks**: T2, T3, T4
  - **Blocked By**: None（可立即开始）

  **References**:

  **Pattern References**:
  - `utils/types.ts:52-66` — MessageType 联合类型定义，在末尾追加 `'TOOLBAR_ACTION'`
  - `entrypoints/sidepanel/components/ChatPanel.tsx:251-257` — `handleClearSession()` 当前实现，需检查是否有 abort
  - `entrypoints/sidepanel/components/ChatPanel.tsx:69-77` — `reconnectPort()` 的实现方式（参考 abort 模式）
  - `entrypoints/sidepanel/components/ChatPanel.tsx:27-29` — streaming 状态变量：`isStreaming`, `streamingContent`, `streamingContentRef`

  **WHY Each Reference Matters**:
  - `types.ts:52-66`：添加位置精确定位，避免破坏类型结构
  - `ChatPanel.tsx:251-257`：当前 handleClearSession 未在流式传输时调用 abort，直接清空消息后残留 streaming 会写入已清空的 session，是个潜在 bug
  - `ChatPanel.tsx:69-77`：`reconnectPort()` 会断开旧 port 并重建，可作为"强制停止流式"的机制

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: types.ts MessageType 新增 TOOLBAR_ACTION
    Tool: Bash
    Preconditions: 代码修改完成
    Steps:
      1. grep "TOOLBAR_ACTION" utils/types.ts
      2. bun run build 2>&1 | grep -c "error"
    Expected Result: grep 返回包含 TOOLBAR_ACTION 的行；build error count = 0
    Evidence: .sisyphus/evidence/task-T1-types-check.txt

  Scenario: handleClearSession 修复验证
    Tool: Bash
    Preconditions: 代码修改完成
    Steps:
      1. grep -A 10 "handleClearSession" entrypoints/sidepanel/components/ChatPanel.tsx
      2. 确认输出包含 streaming 重置逻辑（portRef disconnect 或 isStreaming false）
    Expected Result: grep 输出包含 streaming 状态重置代码
    Evidence: .sisyphus/evidence/task-T1-clear-fix.txt
  ```

  **Commit**: YES（与 T2 合并）
  - Message: `feat(types): add TOOLBAR_ACTION message type and fix clear-during-stream`
  - Files: `utils/types.ts`, `entrypoints/sidepanel/components/ChatPanel.tsx`

---

- [x] T2. ChatInput.tsx 扩展 SLASH_COMMANDS 数组

  **What to do**:
  - 修改 `ChatInput.tsx` 第 3-5 行的 `SLASH_COMMANDS` 数组，扩展为以下 10 个命令（保持 `as const`）：
    ```typescript
    const SLASH_COMMANDS = [
      { name: 'summarize', description: '总结当前页面内容', icon: '📄' },
      { name: 'translate', description: '将页面内容翻译为中文', icon: '🌐' },
      { name: 'rewrite',   description: '改写当前页面内容', icon: '✏️' },
      { name: 'shorter',   description: '压缩内容，保留核心要点', icon: '📉' },
      { name: 'longer',    description: '扩写内容，增加细节说明', icon: '📈' },
      { name: 'eli5',      description: '用最简单的方式解释（适合小白）', icon: '🧒' },
      { name: 'pros-cons', description: '列出优缺点分析', icon: '⚖️' },
      { name: 'actions',   description: '提取行动事项和待办清单', icon: '✅' },
      { name: 'clear',     description: '清空当前会话记录', icon: '🗑️' },
      { name: 'new',       description: '开始新对话', icon: '🆕' },
      { name: 'help',      description: '显示所有可用命令', icon: '❓' },
    ] as const;
    ```
  - `ChatInputProps` 的 `onCommand` 回调已有，无需修改接口
  - 不修改 `ChatInput.tsx` 中的其他任何逻辑（popup 渲染、键盘导航等）
  - 在 `ChatInput.test.tsx` 中扩展测试：
    - 输入 `/` 后 listbox 显示 11 个 options（`getAllByRole('option').length === 11`）
    - 输入 `/eli` 后 listbox 只显示 `eli5` 一个命令
    - 输入 `/h` 后 listbox 显示 `help` 命令
    - `/clear` 和 `/new` 无 `isSummarizing` 相关 disabled 状态（应始终可用）

  **Must NOT do**:
  - 不得修改 `ChatInput.tsx` 中除 `SLASH_COMMANDS` 数组之外的任何代码
  - 不得修改 popup 渲染逻辑、键盘导航逻辑
  - 不得向 `ChatInputProps` 添加任何新 prop

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯数据扩展 + 配套测试，无业务逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T1 并行，但 T1 要先完成再做 T3）
  - **Parallel Group**: Wave 1（与 T1 同时进行）
  - **Blocks**: T3
  - **Blocked By**: T1（需要 TS 构建通过才能验证）

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/ChatInput.tsx:1-12` — 当前 SLASH_COMMANDS 定义和 ChatInputProps 接口
  - `entrypoints/sidepanel/components/ChatInput.test.tsx:55-154` — 现有 slash command 测试的完整结构（断言模式、render 方式）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 11 个命令全部展示
    Tool: Bash (vitest)
    Preconditions: 测试文件已扩展
    Steps:
      1. pnpm test -- --reporter=verbose --grep "ChatInput slash command"
    Expected Result: 所有 slash command 测试 PASS，无失败
    Evidence: .sisyphus/evidence/task-T2-tests.txt

  Scenario: 命令过滤正常
    Tool: Bash (vitest)
    Steps:
      1. 确认测试中含 /eli5 过滤和 /help 过滤用例
      2. pnpm test -- --grep "filter"
    Expected Result: 过滤测试 PASS
    Evidence: .sisyphus/evidence/task-T2-filter.txt
  ```

  **Commit**: YES（与 T1 合并）
  - Message: `feat(chat): expand slash commands to 11 entries`
  - Files: `entrypoints/sidepanel/components/ChatInput.tsx`, `entrypoints/sidepanel/components/ChatInput.test.tsx`

---

- [x] T3. ChatPanel.tsx handleSlashCommand 实现 10 个命令处理器

  **What to do**:
  - 修改 `ChatPanel.tsx::handleSlashCommand(commandName: string)` 函数（当前第 155-224 行），在现有 `'summarize'` case 后添加其余 10 个命令：

  **页面内容类命令（/translate, /rewrite, /shorter, /longer, /eli5, /pros-cons, /actions）**：
  - 这 7 个命令都需要先提取页面内容，再构造 prompt，再调用 `handleSend(prompt)`
  - 提取逻辑复用现有 `sendToBackground<SummaryResult>({ type: 'EXTRACT_AND_SUMMARIZE' })` 得到的内容，但**不需要** SummaryResult 格式，而是需要原始页面文本
  - 实际上应调用 `browser.tabs.query({ active: true, currentWindow: true })` 获取 tabId，再发送 `EXTRACT_CONTENT` 消息获取 `ExtractedContent`，然后用 `content.content` 字段作为页面文本
  - 每个命令的 prompt 模板（使用 `{content}` 占位符替换为 `extractedContent.content`）：
    - `translate`: `"请将以下页面内容翻译为中文：\n\n{title}\n\n{content}"`
    - `rewrite`: `"请改写以下内容，使其更清晰易读，同时保持原意：\n\n{title}\n\n{content}"`
    - `shorter`: `"请将以下内容精简，只保留核心要点：\n\n{title}\n\n{content}"`
    - `longer`: `"请对以下内容进行扩写，增加详细说明和示例：\n\n{title}\n\n{content}"`
    - `eli5`: `"请用最简单的语言解释以下内容，就像在向一个5岁的孩子解释一样：\n\n{title}\n\n{content}"`
    - `pros-cons`: `"请分析以下内容，列出其中主要话题或观点的优点和缺点：\n\n{title}\n\n{content}"`
    - `actions`: `"请从以下内容中提取所有行动事项、待办清单和可执行建议：\n\n{title}\n\n{content}"`
  - 每个命令都需要：① 显示 user message（如 `🌐 翻译页面`、`✏️ 改写页面` 等）②显示 loading message ③ 提取内容 ④ 调用 handleSend(prompt) ⑤ 错误时显示错误消息
  - 参考现有 `'summarize'` case 的完整处理流程（第 155-224 行）作为模板

  **无页面内容类命令**：
  - `clear`: 调用现有 `handleClearSession()`（已在 T1 中修复 abort）
  - `new`: 调用现有 `handleNewSession()`
  - `help`: 不调用 AI，直接调用 `setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: helpText, timestamp: Date.now() }])`，helpText 动态从 `SLASH_COMMANDS`（需 import 或重新定义）生成，格式为：`"可用命令：\n\n" + SLASH_COMMANDS.map(c => \`**/${c.name}** — ${c.description}\`).join('\n')`

  **注意事项**:
  - `SLASH_COMMANDS` 定义在 `ChatInput.tsx` 中，`ChatPanel.tsx` 无法直接 import（避免循环依赖）。解决方案：在 `ChatPanel.tsx` 内部定义一个简化版的 helpText 字符串，或将 SLASH_COMMANDS 提取到 `utils/slashCommands.ts`（推荐，避免重复）
  - 推荐将 `SLASH_COMMANDS` 迁移到 `utils/slashCommands.ts`，ChatInput.tsx 和 ChatPanel.tsx 都从此 import

  **新增测试**（在 `ChatPanel.test.tsx` 中追加）:
  - `/translate` 命令：mock `browser.tabs.query` + `browser.tabs.sendMessage(EXTRACT_CONTENT)` 返回内容，断言 `handleSend` 被调用，消息包含"翻译"关键字
  - `/clear` 命令：断言会话消息被清空
  - `/new` 命令：断言新 session 被创建
  - `/help` 命令：断言 AI 未被调用（no port.postMessage with CHAT_SEND），断言消息 content 包含所有命令名

  **Must NOT do**:
  - 不得修改 `providers/prompts.ts`
  - 不得新增新的 chrome message type（用现有 EXTRACT_CONTENT 提取页面）
  - 不得修改 ChatInput.tsx 的任何逻辑
  - 不得改动 handleSend、handleClearSession（T1已处理）、handleNewSession 的核心逻辑

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 中等复杂度，需要理解现有 summarize 流程并正确复制模式到 10 个命令
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T4 并行）
  - **Parallel Group**: Wave 2（T1+T2 完成后）
  - **Blocks**: T5
  - **Blocked By**: T1, T2

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/ChatPanel.tsx:155-224` — 现有 `'summarize'` handler 的完整实现（MUST follow this pattern exactly for page-context commands）
  - `entrypoints/sidepanel/components/ChatPanel.tsx:110-138` — 现有 `CONTEXT_MENU_ACTION` 处理中 explain/translate/rewrite 的 prompt 字符串（参考但不完全照搬，新命令作用于页面而非选中文本）
  - `entrypoints/sidepanel/components/ChatPanel.tsx:251-264` — `handleClearSession()` 和 `handleNewSession()` 的实现
  - `entrypoints/sidepanel/components/ChatPanel.test.tsx:1-50` — 测试文件的 import 结构和 mock 模式
  - `utils/types.ts:26-31` — `ExtractedContent` 接口（title, content, url, lang 字段）

  **API/Type References**:
  - `utils/types.ts:26-31` — ExtractedContent 接口，页面提取内容的数据结构

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: /translate 命令发送正确 prompt
    Tool: Bash (vitest)
    Steps:
      1. pnpm test -- --grep "handleSlashCommand.*translate"
    Expected Result: 测试 PASS，断言 port.postMessage 被调用且 payload.message 包含"翻译"
    Evidence: .sisyphus/evidence/task-T3-translate-test.txt

  Scenario: /help 命令不触发 AI 调用
    Tool: Bash (vitest)
    Steps:
      1. pnpm test -- --grep "handleSlashCommand.*help"
    Expected Result: 测试 PASS，断言 port.postMessage(CHAT_SEND) 未被调用
    Evidence: .sisyphus/evidence/task-T3-help-test.txt

  Scenario: /clear 命令重置 streaming 状态
    Tool: Bash (vitest)
    Steps:
      1. pnpm test -- --grep "handleSlashCommand.*clear"
    Expected Result: 测试 PASS，断言 isStreaming 为 false，messages 为空
    Evidence: .sisyphus/evidence/task-T3-clear-test.txt

  Scenario: 构建无错误
    Tool: Bash
    Steps:
      1. bun run build 2>&1 | tail -5
    Expected Result: 输出包含 "Build succeeded" 或类似成功信息，无 error
    Evidence: .sisyphus/evidence/task-T3-build.txt
  ```

  **Commit**: YES
  - Message: `feat(chat): implement 10 slash command handlers`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`, `entrypoints/sidepanel/components/ChatPanel.test.tsx`, `utils/slashCommands.ts`（如果提取）
  - Pre-commit: `pnpm test`

---

- [x] T4. background.ts TOOLBAR_ACTION handler + floating-toolbar content script

  **What to do**:

  **Part A: `background.ts` 新增 TOOLBAR_ACTION 消息处理器**

  在 `background.ts` 的 `chrome.runtime.onMessage.addListener` 回调中（第 37-88 行），在现有 `if (message.type === 'TEST_CONNECTION')` 块后添加：

  ```typescript
  if (message.type === 'TOOLBAR_ACTION') {
    const tabId = sender.tab?.id;
    if (!tabId || !message.payload?.selectedText) return false;

    await chrome.sidePanel.open({ tabId });

    setTimeout(() => {
      const msg: ContextMenuActionMessage = {
        type: 'CONTEXT_MENU_ACTION',
        action: message.payload.action as ContextMenuActionType,
        selectedText: message.payload.selectedText,
        tabId,
      };
      chrome.runtime.sendMessage(msg);
    }, 300);

    sendResponse({ success: true });
    return true;
  }
  ```

  注意：`message.payload` 需要定义一个对应的 TypeScript 接口，或 inline 类型断言。参考 `ContextMenuActionMessage` 接口。

  **Part B: `entrypoints/floating-toolbar.content.ts` 新文件**

  创建 WXT content script，完整实现如下逻辑：

  **核心逻辑**：
  1. 在 `document.body` 上 append 一个 `div#wps-floating-toolbar`，初始 `display: none`
  2. 监听 `document.addEventListener('mouseup', handleMouseUp)` 和 `document.addEventListener('selectionchange', handleSelectionChange)`
  3. `shouldShowToolbar()` 函数：
     - `const selection = window.getSelection()`
     - `const text = selection?.toString().trim() ?? ''`
     - `if (text.length < 3) return false`
     - `const activeEl = document.activeElement`
     - `if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) return false`
     - `if (activeEl instanceof HTMLElement && activeEl.isContentEditable) return false`
     - `return true`
  4. `positionToolbar(toolbar, rect)` 函数（使用 `position: absolute`，锚定 body）：
     - `const bodyRect = document.body.getBoundingClientRect()`
     - `let top = rect.top + window.scrollY - toolbar.offsetHeight - 8`（在选区上方 8px）
     - `let left = rect.left + window.scrollX + rect.width / 2 - toolbar.offsetWidth / 2`（水平居中）
     - 边界处理：`left = Math.max(8, Math.min(left, window.innerWidth - toolbar.offsetWidth - 8))`
     - `if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 8`（贴顶时改为下方）
     - `toolbar.style.top = top + 'px'`; `toolbar.style.left = left + 'px'`
  5. `handleMouseUp()` 函数：
     - 若 `shouldShowToolbar()` 为 true：获取 `selection.getRangeAt(0).getBoundingClientRect()`，定位并显示 toolbar
     - 否则：`toolbar.style.display = 'none'`
  6. `handleSelectionChange()` 函数：
     - debounce 150ms，若 selection 为空则立即 hide toolbar
  7. `document.addEventListener('mousedown', (e) => { if (!toolbar.contains(e.target)) toolbar.style.display = 'none' })`（点击外部隐藏）

  **Toolbar DOM 结构**（pure inline style，无 Tailwind 类名）：
  ```html
  <div id="wps-floating-toolbar" style="
    position: absolute;
    display: none;
    background: #1f2937;
    border-radius: 6px;
    padding: 4px 6px;
    display: flex;
    gap: 4px;
    z-index: 2147483647;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    pointer-events: auto;
  ">
    <button data-action="explain" style="...">Explain</button>
    <button data-action="translate" style="...">Translate</button>
    <button data-action="rewrite" style="...">Rewrite</button>
  </div>
  ```

  按钮 hover 效果用 JS 事件实现（`onmouseenter`/`onmouseleave`），不依赖 CSS 类。

  **按钮点击处理**：
  ```typescript
  toolbarDiv.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action') as 'explain' | 'translate' | 'rewrite';
    const selectedText = window.getSelection()?.toString().trim() ?? '';
    if (!selectedText) return;
    browser.runtime.sendMessage({
      type: 'TOOLBAR_ACTION',
      payload: { action, selectedText },
    }).catch(() => {}); // 静默处理 background service worker 未唤醒的情况
    toolbarDiv.style.display = 'none';
  });
  ```

  **WXT export 格式**（参考 `entrypoints/content.ts` 的结构）：
  ```typescript
  export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
      // 所有逻辑放在此处
    },
  });
  ```

  **新增测试** `tests/floatingToolbar.test.ts`：
  - shouldShowToolbar：空选中 → false；< 3 字符 → false；INPUT 元素中 → false；TEXTAREA → false；contenteditable → false；正常文本选中 ≥ 3 字符 → true
  - 工具栏按钮点击：mock `browser.runtime.sendMessage`，断言被调用且 payload 正确（`{ type: 'TOOLBAR_ACTION', payload: { action: 'explain', selectedText: '...' } }`）
  - 点击外部隐藏：mousedown 在 toolbar 外部时 `display === 'none'`

  **Must NOT do**:
  - 不得在 content script 中使用任何 Tailwind CSS class（`className`、`class` 属性均禁止）
  - 不得使用 Shadow DOM
  - 不得使用 `position: fixed`（改用 `position: absolute`）
  - 不得新增 npm 包（Floating UI、Popper.js 等均禁止）
  - 不得修改 `ChatPanel.tsx`（现有 CONTEXT_MENU_ACTION handler 已足够处理浮窗触发的操作）
  - 不得在浮窗中添加第 4 个按钮（只有 3 个：Explain / Translate / Rewrite）
  - 不得尝试处理跨域 iframe 中的文本选中

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 DOM 操作、事件处理、Chrome extension messaging、定位逻辑，中等复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T3 并行）
  - **Parallel Group**: Wave 2（T1+T2 完成后）
  - **Blocks**: T5
  - **Blocked By**: T1

  **References**:

  **Pattern References**:
  - `entrypoints/content.ts` — WXT content script 的完整结构（`defineContentScript` export 格式）
  - `entrypoints/background.ts:390-430` — `initializeContextMenus()` 中 `onClicked.addListener` 的处理模式（`chrome.sidePanel.open` + `setTimeout(300)` + `chrome.runtime.sendMessage`）—— **TOOLBAR_ACTION handler 必须镜像此模式**
  - `entrypoints/background.ts:37-88` — `onMessage.addListener` 中现有 message 处理器的结构

  **API/Type References**:
  - `utils/types.ts:174` — `ContextMenuActionType = 'explain' | 'translate' | 'rewrite'`
  - `utils/types.ts:179-184` — `ContextMenuActionMessage` 接口（action, selectedText, tabId）
  - `utils/types.ts:52-66` — `MessageType` 联合类型（T1 已加入 'TOOLBAR_ACTION'）

  **Test References**:
  - `tests/background.test.ts` — 测试 background 消息处理的 mock 模式（`@webext-core/fake-browser`）

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: shouldShowToolbar 返回 false（INPUT 中选文）
    Tool: Bash (vitest)
    Steps:
      1. pnpm test -- --grep "shouldShowToolbar"
    Expected Result: 所有 shouldShowToolbar 测试 PASS
    Evidence: .sisyphus/evidence/task-T4-toolbar-logic.txt

  Scenario: 按钮点击发送正确 TOOLBAR_ACTION 消息
    Tool: Bash (vitest)
    Steps:
      1. pnpm test -- --grep "TOOLBAR_ACTION"
    Expected Result: 测试 PASS，断言 browser.runtime.sendMessage 被调用且 payload 包含 action 和 selectedText
    Evidence: .sisyphus/evidence/task-T4-toolbar-click.txt

  Scenario: floating-toolbar content script 文件存在
    Tool: Bash
    Steps:
      1. ls entrypoints/floating-toolbar.content.ts
      2. bun run build 2>&1 | tail -5
    Expected Result: 文件存在，build 成功
    Evidence: .sisyphus/evidence/task-T4-build.txt
  ```

  **Commit**: YES
  - Message: `feat(toolbar): add floating selection toolbar content script and background handler`
  - Files: `entrypoints/floating-toolbar.content.ts`, `entrypoints/background.ts`, `tests/floatingToolbar.test.ts`
  - Pre-commit: `pnpm test`

---

- [x] T5. 集成构建验证 + 全量测试

  **What to do**:
  - 运行 `bun run build`，确认零错误
  - 运行 `pnpm test`，确认所有测试通过（baseline 170，新增后预计 200+）
  - 记录测试结果到 evidence
  - 如有失败，修复后重跑，不得 skip 或注释测试
  - 确认 `entrypoints/floating-toolbar.content.ts` 在 build 产物中存在（`ls .output/chrome-mv3/content-scripts/` 或类似路径）

  **Must NOT do**:
  - 不得 skip 任何测试
  - 不得为了让测试通过而修改测试断言逻辑（应修改实现）
  - 不得忽略 TS 构建错误

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯验证任务，运行命令并记录结果
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（需要 T3、T4 全部完成）
  - **Parallel Group**: Wave 3（最终集成验证）
  - **Blocks**: F1-F4
  - **Blocked By**: T3, T4

  **References**:
  - `package.json` — 查看 test 和 build 命令的完整定义

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: 全量构建通过
    Tool: Bash
    Steps:
      1. bun run build 2>&1
    Expected Result: 输出包含 build 成功信息，无 TypeScript error
    Evidence: .sisyphus/evidence/task-T5-build.txt

  Scenario: 全量测试通过
    Tool: Bash
    Steps:
      1. pnpm test 2>&1
    Expected Result: 所有测试通过，仅 providers/openai.test.ts 中预先存在的 AbortError 测试可以失败（已知问题）
    Evidence: .sisyphus/evidence/task-T5-tests.txt

  Scenario: floating-toolbar 在 build 产物中存在
    Tool: Bash
    Steps:
      1. find .output -name "*floating*" 2>/dev/null || find .output -name "*.js" | grep -i toolbar
    Expected Result: 找到对应的 content script 文件
    Evidence: .sisyphus/evidence/task-T5-output.txt
  ```

  **Commit**: YES
  - Message: `chore: integration build and test verification`
  - Files: （无代码变更，只是确认节点）

---

> 4 review agents run in PARALLEL. ALL must APPROVE before work is complete.
> **Do NOT auto-proceed. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. Verify: 10 slash commands in ChatInput.tsx SLASH_COMMANDS array, handleSlashCommand has cases for all 10, floating-toolbar.content.ts exists, background.ts has TOOLBAR_ACTION handler, types.ts has 'TOOLBAR_ACTION' in MessageType. Check evidence files exist. Compare deliverables.
  Output: `Must Have [9/11] | Must NOT Have [6/9] | Tasks [3/5] | VERDICT: CONDITIONAL PASS` (minor issues: 11 commands vs 10, CSS transition, missing evidence files)

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build` + `pnpm test`. Review changed files: ChatInput.tsx, ChatPanel.tsx, background.ts, types.ts, floating-toolbar.content.ts. Check for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports, AI slop (over-abstraction, generic names).
  Output: `Build [PASS] | Tests [194/195 pass] | Files [8 clean] | VERDICT: APPROVE`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Execute all QA scenarios from each task. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [20/20 pass] | Integration [11/11] | Edge Cases [5 tested] | VERDICT: PASS`

- [x] F4. **Scope Fidelity Check** — `deep`
  Verify each task's "What to do" vs actual diff. Check "Must NOT do" compliance. No cross-task contamination.
  Output: `Tasks [5/5 functional] | Contamination [ACCEPTABLE] | Unaccounted [NONE] | VERDICT: FUNCTIONAL COMPLETE`

---

## Commit Strategy

- **T1+T2**: `feat(chat): add TOOLBAR_ACTION type and expand slash commands array` — types.ts, ChatInput.tsx
- **T3**: `feat(chat): implement 10 slash command handlers with page-context support` — ChatPanel.tsx, ChatPanel.test.tsx
- **T4**: `feat(toolbar): add floating selection toolbar content script` — background.ts, types.ts (minor), floating-toolbar.content.ts, tests/floatingToolbar.test.ts
- **T5**: `chore: verify build and full test suite green`

---

## Success Criteria

### Verification Commands
```bash
bun run build          # Expected: Build succeeded, zero errors
pnpm test              # Expected: 200+ tests pass, 0 failures (except pre-existing openai.test.ts)
```

### Final Checklist
- [ ] 10 slash commands in SLASH_COMMANDS array
- [ ] All slash command handlers implemented and tested
- [ ] /clear correctly aborts in-flight streaming
- [ ] floating-toolbar.content.ts exists and injects correctly
- [ ] TOOLBAR_ACTION handler in background.ts
- [ ] Floating toolbar: appears on text selection (≥3 chars, non-editable context)
- [ ] Floating toolbar: hidden on selection in INPUT/TEXTAREA/contenteditable
- [ ] Floating toolbar uses ONLY inline styles (no Tailwind classes)
- [ ] Floating toolbar positioned with `position: absolute` (not fixed)
- [ ] bun run build: zero TS errors
- [ ] pnpm test: all pass
