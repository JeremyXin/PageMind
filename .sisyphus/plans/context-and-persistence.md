# Context Menu AI Actions + Session Persistence Enhancement

## TL;DR

> **Quick Summary**: Add right-click AI actions (Explain/Translate/Rewrite) on selected text with auto-open side panel, plus robust session persistence with full-history search across all sessions.
>
> **Deliverables**:
>
> - Right-click context menu with 3 AI actions (Explain, Translate to Chinese, Rewrite)
> - Auto-opens side panel + fires AI request when user right-clicks selected text
> - Sessions survive browser restart (fix active session restoration on mount)
> - Full-text search across ALL historical sessions (inline search UI in chat panel)
> - Export current session as plain text
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: T1 (types + permissions) → T2 (background context menu) → T3 (ChatPanel handler) → T5 (search UI) → F1–F4

---

## Context

### Original Request

用户在竞品调研后选择两个方向：

1. 右键菜单 AI 操作 — 选中文字右键触发 Explain/Translate/Rewrite，自动打开侧边栏
2. 会话持久化增强 — 会话在浏览器重启后恢复，全历史搜索，导出功能

### Interview Summary

**Key Discussions**:

- 侧边栏未打开时：**自动打开** (`chrome.sidePanel.open()`)，再发送消息
- 历史搜索范围：**所有历史会话**（遍历全部 sessions 数组）
- 右键菜单数量：**精选 3 个**（Explain、Translate to Chinese、Rewrite）
- 无会话列表/切换 UI（已有约束）

**Research Findings**:

- 竞品 #1 痛点：会话丢失（Page Assist #638, #755，高讨论量）
- 右键操作竞品有但 UX 差（选项太多、响应慢）
- `contextMenus` 权限尚未在 wxt.config.ts 中声明
- `chrome.tabs.captureVisibleTab()` 已有 `activeTab` 权限，无需新增

### Metis Review

**Identified Gaps** (addressed):

- "侧边栏未打开时如何处理" → 已决策：自动打开
- "历史搜索范围" → 已决策：全部 sessions
- 右键菜单数量 → 已决策：3 个

---

## Work Objectives

### Core Objective

通过右键菜单 AI 操作降低使用摩擦（选中即用），通过会话持久化消除用户最大痛点（数据丢失）。

### Concrete Deliverables

- `wxt.config.ts`: 新增 `contextMenus` 权限
- `entrypoints/background.ts`: 注册 3 个 context menu items，处理点击事件
- `utils/types.ts`: 新增 `ContextMenuAction` 类型、`CONTEXT_MENU_ACTION` 消息类型
- `entrypoints/sidepanel/components/ChatPanel.tsx`: 处理来自 background 的 context menu 消息，执行 AI 操作
- `entrypoints/sidepanel/components/SearchBar.tsx` (新文件): 历史搜索 UI 组件
- `utils/chatStorage.ts`: 新增 `searchMessages()` 函数，遍历所有 sessions
- 导出功能：ChatPanel 新增导出按钮，导出为 .txt

### Definition of Done

- [ ] 右键选中文字 → 菜单出现 3 个 AI 选项 → 侧边栏自动打开 → AI 响应流式输出
- [ ] 浏览器重启后，上次会话的消息历史完整恢复
- [ ] 历史搜索：输入关键词 → 高亮匹配消息 → 跨所有 sessions 展示结果
- [ ] 导出：点击导出按钮 → 下载 .txt 文件，包含所有消息内容

### Must Have

- `contextMenus` 权限正确声明
- 侧边栏未打开时自动调用 `chrome.sidePanel.open()` 再发消息
- 搜索遍历所有 sessions（不只是当前 session）
- 会话持久化复用已有 `chatStorage.ts` 存储层，不另起炉灶

### Must NOT Have (Guardrails)

- **禁止**会话列表/切换 UI（已有约束）
- **禁止**安装任何新 npm 包（含 Fuse.js 等模糊搜索库）—— 用原生 `String.includes()` 即可
- **禁止**在 `chat.ts` 的 fetch body 中携带 `response_format`
- **禁止**使用 markdown 渲染库
- **禁止**消息复制/编辑/重新生成按钮
- **禁止**使用 `openai` npm 包
- **禁止**使用 `tiktoken`
- **禁止** Shadow DOM 配置
- **禁止** 4 个以上的右键菜单选项（保持精简）
- **禁止**用 `chrome.storage.sync`（必须用 `local`）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES (Vitest + @testing-library)
- **Automated tests**: Tests-after（在各 Task 完成后补充单元测试）
- **Framework**: Vitest

### QA Policy

每个 Task 包含 Agent-Executed QA Scenarios：

- **Extension UI**: Playwright 打开扩展 sidepanel，操作验证
- **Background logic**: Bash (node/bun REPL) import 测试函数执行
- **Storage**: Bash 直接调用 chatStorage 函数验证
- **Build**: `bun run build` 无 error

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation, can all run in parallel):
├── Task 1: Types + Permissions (wxt.config.ts + types.ts) [quick]
├── Task 2: chatStorage.searchMessages() + tests [quick]
└── Task 3: Session restoration fix (ChatPanel mount logic) [quick]

Wave 2 (After Wave 1 — feature implementation):
├── Task 4: Background context menu (background.ts) — depends: T1 [unspecified-high]
├── Task 5: ChatPanel context menu handler — depends: T1, T4 [unspecified-high]
├── Task 6: SearchBar component + integration — depends: T2 [visual-engineering]
└── Task 7: Export conversation feature — depends: T3 [quick]

Wave FINAL (After ALL tasks):
├── F1: Plan Compliance Audit [oracle]
├── F2: Build + Test verification [unspecified-high]
├── F3: Real E2E QA [unspecified-high]
└── F4: Scope Fidelity Check [deep]
→ Present results → Get explicit user okay
```

**Critical Path**: T1 → T4 → T5 → F1–F4
**Parallel Speedup**: ~60% faster than sequential
**Max Concurrent**: 3 (Wave 1)

### Dependency Matrix

| Task  | Depends On | Blocks |
| ----- | ---------- | ------ |
| T1    | —          | T4, T5 |
| T2    | —          | T6     |
| T3    | —          | T7     |
| T4    | T1         | T5     |
| T5    | T1, T4     | F      |
| T6    | T2         | F      |
| T7    | T3         | F      |
| F1–F4 | T1–T7      | —      |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks → T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 4 tasks → T4 `unspecified-high`, T5 `unspecified-high`, T6 `visual-engineering`, T7 `quick`
- **FINAL**: 4 tasks → F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Types + Permissions 基础层

  **What to do**:

  - 在 `wxt.config.ts` 的 `permissions` 数组中新增 `"contextMenus"`
  - 在 `utils/types.ts` 中新增：
    - `ContextMenuActionType` 联合类型：`'explain' | 'translate' | 'rewrite'`
    - `ContextMenuActionMessage` 接口：`{ type: 'CONTEXT_MENU_ACTION', action: ContextMenuActionType, selectedText: string, tabId: number }`
    - 在已有的 message union type 中加入 `ContextMenuActionMessage`

  **Must NOT do**:

  - 不要修改任何其他文件
  - 不要改动已有的 `ChatMessage`、`ChatSession` 类型结构

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: 纯类型声明 + 配置文件改动，单文件操作，无逻辑复杂度
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T2、T3 并行）
  - **Blocks**: T4, T5
  - **Blocked By**: None（可立即开始）

  **References**:

  **Pattern References**:

  - `utils/types.ts` — 现有 message 类型定义模式，新类型追加在文件末尾
  - `wxt.config.ts:permissions` 数组 — 在此追加 `"contextMenus"`

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过，无 TypeScript 错误
  - [ ] `wxt.config.ts` 的 `permissions` 包含 `"contextMenus"`
  - [ ] `utils/types.ts` 导出 `ContextMenuActionType` 和 `ContextMenuActionMessage`

  **QA Scenarios**:

  ```
  Scenario: TypeScript types compile correctly
    Tool: Bash
    Preconditions: Node/bun 环境已安装
    Steps:
      1. Run: bun run build
      2. Assert: exit code = 0, no TypeScript errors in output
    Expected Result: Build succeeds with 0 errors
    Failure Indicators: 任何 "error TS" 行出现
    Evidence: .sisyphus/evidence/task-1-build-pass.txt

  Scenario: contextMenus permission declared
    Tool: Bash
    Steps:
      1. Run: grep -n "contextMenus" wxt.config.ts
      2. Assert: 输出包含 "contextMenus"
    Expected Result: 找到 contextMenus 权限声明
    Evidence: .sisyphus/evidence/task-1-permissions.txt
  ```

  **Commit**: YES (groups with T2, T3)

  - Message: `feat(types): add context menu types and permissions`
  - Files: `wxt.config.ts`, `utils/types.ts`

- [x] 2. chatStorage.searchMessages() + 单元测试

  **What to do**:

  - 在 `utils/chatStorage.ts` 中新增 `searchMessages(query: string): Promise<SearchResult[]>` 函数
  - `SearchResult` 类型：`{ sessionId: string, sessionCreatedAt: number, message: ChatMessage, matchIndex: number }`
  - 实现：从 `browser.storage.local` 读取所有 sessions，遍历每个 session 的所有 messages，用 `message.content.toLowerCase().includes(query.toLowerCase())` 做匹配
  - 返回按时间倒序排列的匹配结果（最新消息优先）
  - 空 query 时返回 `[]`
  - 在 `utils/types.ts` 中新增 `SearchResult` 类型导出
  - 新增测试文件 `utils/chatStorage.search.test.ts`，覆盖：空 query、单 session 匹配、跨 session 匹配、大小写不敏感、无匹配返回空数组

  **Must NOT do**:

  - 不安装 Fuse.js 或任何模糊搜索库
  - 不修改现有 chatStorage 函数签名
  - 不引入 IndexedDB（`chrome.storage.local` 足够）

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: 纯 utility 函数 + 测试，无 UI，逻辑简单
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T1、T3 并行）
  - **Blocks**: T6
  - **Blocked By**: None

  **References**:

  **Pattern References**:

  - `utils/chatStorage.ts` — 现有函数结构（`getSessions`、`saveSession`），新函数跟随同一模式
  - `utils/chatStorage.test.ts`（如存在）或现有 `*.test.ts` — 测试写法和 mock 方式

  **API/Type References**:

  - `utils/types.ts:ChatSession`, `ChatMessage` — 遍历的数据结构

  **Acceptance Criteria**:

  - [ ] `bun test utils/chatStorage.search.test.ts` → 全部 pass（≥5 tests）
  - [ ] `searchMessages('')` 返回 `[]`
  - [ ] `searchMessages('hello')` 跨两个 sessions 都能返回匹配结果
  - [ ] 结果按 message.timestamp 倒序

  **QA Scenarios**:

  ```
  Scenario: Cross-session search returns results
    Tool: Bash (bun test)
    Preconditions: 测试文件准备 2 个 mock sessions，各含不同内容
    Steps:
      1. Run: bun test utils/chatStorage.search.test.ts
      2. Assert: exit code = 0, "X passed" in output
    Expected Result: ≥5 tests pass, 0 failures
    Evidence: .sisyphus/evidence/task-2-search-tests.txt

  Scenario: Empty query returns empty array
    Tool: Bash (bun test)
    Steps:
      1. Test case: searchMessages('') should return []
      2. Assert: length === 0
    Expected Result: [] returned immediately
    Evidence: .sisyphus/evidence/task-2-search-tests.txt
  ```

  **Commit**: YES (groups with T1, T3)

  - Message: `feat(types): add context menu types and permissions`
  - Files: `utils/chatStorage.ts`, `utils/types.ts`, `utils/chatStorage.search.test.ts`

- [x] 3. 会话恢复修复（Session Restoration Fix）

  **What to do**:

  - 读取 `entrypoints/sidepanel/components/ChatPanel.tsx` 中的 `useEffect` 初始化逻辑
  - 检查当前是否正确从 `chatStorage` 加载 `activeChatSessionId` 并恢复对应 session 的 messages
  - 如果不存在：在 ChatPanel mount 时调用 `chatStorage.getActiveSession()` 或等效函数，将 messages 设入 state
  - 如果已存在但有 bug：修复 race condition 或遗漏的 await
  - 验证：关闭扩展 popup 后重开，消息历史完整显示
  - 无需新增文件，仅修改 `ChatPanel.tsx` 的初始化 useEffect

  **Must NOT do**:

  - 不添加会话列表/切换 UI
  - 不改变存储层结构
  - 不在 ChatPanel 中引入新的状态管理库

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: 单组件 useEffect 修复，逻辑范围明确
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T1、T2 并行）
  - **Blocks**: T7
  - **Blocked By**: None

  **References**:

  **Pattern References**:

  - `entrypoints/sidepanel/components/ChatPanel.tsx` — 现有 useEffect 初始化逻辑（重点看 mount 时如何读取 storage）
  - `utils/chatStorage.ts:getActiveSession` 或 `getSessions` — 调用方式

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过
  - [ ] 打开侧边栏 → 发送消息 → 关闭侧边栏（不关闭浏览器）→ 重新打开 → 消息历史完整显示
  - [ ] 浏览器重启后重新打开侧边栏 → 消息历史完整显示（storage 持久化已有，关键是 mount 时正确读取）

  **QA Scenarios**:

  ```
  Scenario: Session messages persist after panel close/reopen
    Tool: Bash (bun run build) + manual panel reopen
    Preconditions: 扩展已构建并加载
    Steps:
      1. Run: bun run build → assert exit 0
      2. 打开侧边栏，发送一条消息（mock 或真实）
      3. 关闭侧边栏（点击 X 或切换 tab）
      4. 重新打开侧边栏
      5. Assert: 之前的消息仍然显示
    Expected Result: 消息历史完整保留
    Failure Indicators: 消息列表为空
    Evidence: .sisyphus/evidence/task-3-session-restore.txt

  Scenario: Build passes after changes
    Tool: Bash
    Steps:
      1. Run: bun run build
      2. Assert: exit code = 0
    Expected Result: 0 TypeScript errors
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: YES (groups with T1, T2)

  - Message: `feat(types): add context menu types and permissions`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`

- [x] 4. Background Context Menu 注册与消息派发

  **What to do**:

  - 在 `entrypoints/background.ts` 中：
    1. 在 service worker 启动时调用 `chrome.contextMenus.removeAll()` 再重新注册（防止重复注册报错）
    2. 注册 3 个 context menu items，使用 `chrome.contextMenus.create()`：
       - `{ id: 'explain', title: 'Explain with AI', contexts: ['selection'] }`
       - `{ id: 'translate', title: 'Translate to Chinese', contexts: ['selection'] }`
       - `{ id: 'rewrite', title: 'Rewrite & Improve', contexts: ['selection'] }`
    3. 监听 `chrome.contextMenus.onClicked`：
       - 获取 `info.selectionText` 和 `tab.id`
       - 调用 `chrome.sidePanel.open({ tabId: tab.id })` 打开侧边栏
       - 等待侧边栏就绪后（延迟 300ms 或监听连接），发送消息：`chrome.runtime.sendMessage({ type: 'CONTEXT_MENU_ACTION', action: menuItemId, selectedText, tabId })`
  - 消息结构使用 T1 中定义的 `ContextMenuActionMessage` 类型

  **Must NOT do**:

  - 不在 context menu 中添加超过 3 个选项
  - 不在 context menu handler 中直接调用 AI API（由 ChatPanel 负责）
  - 不使用 `chrome.storage.sync`

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: Chrome extension background service worker，需要熟悉 MV3 API 和 contextMenus 生命周期
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2（需要 T1 完成后开始）
  - **Blocks**: T5
  - **Blocked By**: T1

  **References**:

  **Pattern References**:

  - `entrypoints/background.ts` — 现有消息处理结构（`chrome.runtime.onMessage.addListener`），新的 contextMenus 代码跟随同一文件结构
  - `entrypoints/background.ts:chrome.sidePanel` 相关代码 — 已有 `sidePanel.setOptions` 调用，参考格式

  **API/Type References**:

  - `utils/types.ts:ContextMenuActionMessage` — 发送消息的类型（T1 新增）
  - Chrome contextMenus API: `chrome.contextMenus.create()`, `chrome.contextMenus.onClicked`
  - Chrome sidePanel API: `chrome.sidePanel.open({ tabId })`

  **External References**:

  - https://developer.chrome.com/docs/extensions/reference/api/contextMenus — contextMenus API 官方文档

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过
  - [ ] 在任意网页选中文字后右键，菜单中出现 "Explain with AI"、"Translate to Chinese"、"Rewrite & Improve" 3 项
  - [ ] 点击任一选项，侧边栏自动打开（若已关闭）
  - [ ] background.ts 无重复注册错误（console 无 "Cannot create item" 报错）

  **QA Scenarios**:

  ```
  Scenario: Context menu items appear on text selection
    Tool: Bash (bun run build) + Playwright/manual
    Preconditions: Extension built and loaded in Chrome dev mode
    Steps:
      1. Run: bun run build → assert exit 0
      2. 在任意网页选中一段文字
      3. 右键点击选中区域
      4. Assert: 菜单中出现 "Explain with AI", "Translate to Chinese", "Rewrite & Improve"
    Expected Result: 3 个菜单项全部出现，顺序正确
    Failure Indicators: 菜单项缺失或不显示
    Evidence: .sisyphus/evidence/task-4-context-menu.txt

  Scenario: Side panel auto-opens on menu click
    Tool: Bash + manual
    Preconditions: 侧边栏已关闭
    Steps:
      1. 确认侧边栏未打开
      2. 选中文字 → 右键 → 点击 "Explain with AI"
      3. Assert: 侧边栏在 500ms 内自动打开
    Expected Result: 侧边栏打开，无报错
    Evidence: .sisyphus/evidence/task-4-panel-open.txt
  ```

  **Commit**: YES (with T5)

  - Message: `feat(context-menu): right-click AI actions with auto side panel`
  - Files: `entrypoints/background.ts`

- [x] 5. ChatPanel 处理 Context Menu 消息

  **What to do**:

  - 在 `entrypoints/sidepanel/components/ChatPanel.tsx` 中：
    1. 新增 `useEffect` 监听 `chrome.runtime.onMessage`，过滤 `type === 'CONTEXT_MENU_ACTION'`
    2. 接收到消息后，根据 `action` 字段构造对应 prompt：
       - `explain`: `Explain the following text in detail:\n\n"${selectedText}"`
       - `translate`: `Translate the following text to Chinese:\n\n"${selectedText}"`
       - `rewrite`: `Rewrite and improve the following text while preserving its meaning:\n\n"${selectedText}"`
    3. 将构造好的 prompt 作为用户消息发送（调用现有的 `sendMessage()` 或等效函数）
    4. useEffect cleanup 时移除监听器（防止内存泄漏）
  - 不需要修改 ChatInput 组件

  **Must NOT do**:

  - 不显示弹窗确认框（直接发送）
  - 不在 prompt 中携带 `response_format`
  - 不修改现有的 sendMessage 函数签名

  **Recommended Agent Profile**:

  - **Category**: `unspecified-high`
    - Reason: React useEffect + Chrome messaging，需要正确处理异步和清理
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2（需要 T1 + T4 完成）
  - **Blocks**: F1–F4
  - **Blocked By**: T1, T4

  **References**:

  **Pattern References**:

  - `entrypoints/sidepanel/components/ChatPanel.tsx` — 现有消息发送逻辑（`handleSendMessage` 或 `handleSlashCommand`），新 handler 复用同一路径
  - `entrypoints/sidepanel/components/ChatPanel.tsx` — 现有 `useEffect` 副作用模式（参考 port 连接的 cleanup 写法）

  **API/Type References**:

  - `utils/types.ts:ContextMenuActionMessage` — 接收消息的类型（T1 新增）

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过
  - [ ] 右键 → "Explain with AI" → 侧边栏显示用户消息 "Explain the following text..."，AI 开始流式响应
  - [ ] 右键 → "Translate to Chinese" → 侧边栏显示翻译 prompt，AI 响应
  - [ ] 右键 → "Rewrite & Improve" → 侧边栏显示改写 prompt，AI 响应
  - [ ] useEffect cleanup 正确移除监听器（无内存泄漏警告）

  **QA Scenarios**:

  ```
  Scenario: Explain action sends correct prompt
    Tool: Bash (bun run build) + manual
    Preconditions: Extension loaded, AI API configured
    Steps:
      1. 选中文字 "Hello World" → 右键 → "Explain with AI"
      2. 侧边栏打开后，Assert: chat 中出现用户消息包含 "Explain the following text"
      3. Assert: AI 开始流式响应（typing indicator 出现）
    Expected Result: 完整 AI 响应显示，无错误
    Evidence: .sisyphus/evidence/task-5-explain.txt

  Scenario: Event listener cleanup prevents memory leak
    Tool: Bash (bun run build)
    Steps:
      1. Run: bun run build → assert exit 0
      2. 代码审查：useEffect return 中有 chrome.runtime.onMessage.removeListener
    Expected Result: cleanup 函数存在
    Evidence: .sisyphus/evidence/task-5-cleanup.txt
  ```

  **Commit**: YES (with T4)

  - Message: `feat(context-menu): right-click AI actions with auto side panel`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`

- [x] 6. SearchBar 组件 + 历史搜索集成

  **What to do**:

  - 新建 `entrypoints/sidepanel/components/SearchBar.tsx`：
    - 一个 `<input>` 搜索框 + 关闭按钮
    - Props: `onSearch(query: string): void`, `onClose(): void`, `results: SearchResult[]`
    - 展示搜索结果列表：每条结果显示 session 日期 + 消息内容（高亮匹配关键词，用 `<mark>` 标签或 Tailwind 黄色背景）
    - 结果点击后：TODO（当前无会话切换功能，暂时只展示结果不跳转）
    - 使用 debounce（300ms），避免每次按键都触发搜索
    - 结果为空时显示 "No results found"
  - 在 `entrypoints/sidepanel/components/ChatPanel.tsx` 中：
    - 新增"搜索"图标按钮（放在 header 区域，与设置按钮同行）
    - 点击切换显示/隐藏 SearchBar
    - 调用 `chatStorage.searchMessages(query)` 获取结果传给 SearchBar
  - debounce 直接用 `setTimeout/clearTimeout` 实现，**不安装任何库**

  **Must NOT do**:

  - 不安装 lodash、debounce 等库
  - 不添加会话切换功能（点击结果只展示，不跳转）
  - 不使用 markdown 渲染
  - 搜索结果高亮只用原生 HTML（`<mark>` 或 span+class），不引入任何库

  **Recommended Agent Profile**:

  - **Category**: `visual-engineering`
    - Reason: React UI 组件，Tailwind CSS v4 样式，需要关注搜索框 UX 体验
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 T4、T5、T7 并行，仅需 T2 完成）
  - **Blocks**: F1–F4
  - **Blocked By**: T2

  **References**:

  **Pattern References**:

  - `entrypoints/sidepanel/components/ChatInput.tsx` — slash command popup 的键盘导航和样式模式，SearchBar 参考同一设计语言
  - `entrypoints/sidepanel/components/ChatPanel.tsx` — header 区域按钮排列方式（Settings 按钮的位置和样式）

  **API/Type References**:

  - `utils/types.ts:SearchResult` — 搜索结果类型（T2 新增）
  - `utils/chatStorage.ts:searchMessages` — 调用方式（T2 新增）

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过
  - [ ] 点击搜索图标 → SearchBar 出现，有搜索框
  - [ ] 输入关键词（300ms debounce）→ 结果列表更新
  - [ ] 跨 session 的匹配结果都显示（含 session 日期）
  - [ ] 无匹配时显示 "No results found"
  - [ ] 点击关闭按钮 → SearchBar 隐藏

  **QA Scenarios**:

  ```
  Scenario: Search returns cross-session results
    Tool: Bash (bun run build)
    Preconditions: 有 ≥2 条历史消息包含关键词
    Steps:
      1. Run: bun run build → assert exit 0
      2. 打开侧边栏，点击搜索图标
      3. 输入已知关键词，等待 300ms
      4. Assert: 结果列表出现，包含跨 session 的消息
      5. Assert: 每条结果显示 session 日期和消息片段
    Expected Result: 正确跨 session 搜索结果
    Evidence: .sisyphus/evidence/task-6-search-results.txt

  Scenario: Empty results show correct message
    Tool: Bash (bun run build)
    Steps:
      1. 输入不存在的关键词（如 "xyzxyzxyz123"）
      2. Assert: 显示 "No results found"
    Expected Result: 提示文字出现
    Evidence: .sisyphus/evidence/task-6-empty-state.txt
  ```

  **Commit**: YES (with T7)

  - Message: `feat(search): full-history search and session export`
  - Files: `entrypoints/sidepanel/components/SearchBar.tsx`, `entrypoints/sidepanel/components/ChatPanel.tsx`

- [x] 7. 导出会话功能

  **What to do**:

  - 在 `entrypoints/sidepanel/components/ChatPanel.tsx` 中新增导出按钮（放在 header，与搜索按钮同行）
  - 点击后：
    1. 获取当前 session 的所有 messages
    2. 格式化为纯文本：每条消息前加 `[User]` 或 `[Assistant]` 前缀，加时间戳，消息之间空一行
    3. 使用浏览器原生下载：创建 `Blob`，生成 `URL.createObjectURL`，创建 `<a>` 元素触发 download
    4. 文件名格式：`chat-export-YYYY-MM-DD.txt`
  - 导出完成后自动清理 Object URL（`URL.revokeObjectURL`）
  - 不依赖任何外部库

  **Must NOT do**:

  - 不导出为 markdown 格式（纯 .txt）
  - 不添加任何下载库
  - 不修改 chatStorage 的存储结构

  **Recommended Agent Profile**:

  - **Category**: `quick`
    - Reason: 单一 utility 逻辑，纯前端文件下载，无复杂 UI
  - **Skills**: []

  **Parallelization**:

  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2（与 T4、T5、T6 并行，仅需 T3 完成）
  - **Blocks**: F1–F4
  - **Blocked By**: T3

  **References**:

  **Pattern References**:

  - `entrypoints/sidepanel/components/ChatPanel.tsx` — header 按钮区域，导出按钮放在同一行
  - `utils/types.ts:ChatMessage` — 消息结构（role, content, timestamp 字段）

  **Acceptance Criteria**:

  - [ ] `bun run build` 通过
  - [ ] 点击导出按钮 → 浏览器弹出文件下载对话框
  - [ ] 下载的 .txt 文件包含所有消息，格式为 `[User] YYYY-MM-DD HH:mm\n{content}\n\n`
  - [ ] 文件名包含日期（如 `chat-export-2026-03-31.txt`）
  - [ ] Object URL 在下载后被 revoke（无内存泄漏）

  **QA Scenarios**:

  ```
  Scenario: Export downloads valid .txt file
    Tool: Bash (bun run build)
    Preconditions: Session 中有 ≥2 条消息
    Steps:
      1. Run: bun run build → assert exit 0
      2. 打开侧边栏，有历史消息
      3. 点击导出按钮
      4. Assert: 浏览器触发下载，文件名含日期
      5. Assert: 文件内容包含 [User] 和 [Assistant] 前缀
    Expected Result: 有效 .txt 文件下载成功
    Evidence: .sisyphus/evidence/task-7-export.txt

  Scenario: Export file content format correct
    Tool: Bash (bun test 或 manual check)
    Steps:
      1. 检查导出文件：每条消息有角色前缀和时间戳
      2. Assert: 格式为 "[User] 2026-03-31 10:00\nHello\n\n"
    Expected Result: 格式符合规范
    Evidence: .sisyphus/evidence/task-7-export-format.txt
  ```

  **Commit**: YES (with T6)

  - Message: `feat(search): full-history search and session export`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
      Run `bun run build` + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
      Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real E2E QA** — `unspecified-high`
      Execute EVERY QA scenario from EVERY task. Test right-click flow end-to-end: select text → right-click → menu appears → panel opens → AI responds. Test session restore after reload. Test search across sessions. Save evidence to `.sisyphus/evidence/final-qa/`.
      Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", check actual implementation matches spec. Verify no forbidden patterns (response_format, markdown lib, etc.). Detect scope creep.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(types): add context menu types and permissions` — types.ts, wxt.config.ts, chatStorage.ts
- **Wave 2**: `feat(context-menu): right-click AI actions with auto side panel` — background.ts, ChatPanel.tsx
- **Wave 2**: `feat(search): full-history search and session export` — SearchBar.tsx, ChatPanel.tsx
- **Final**: `chore: final verification pass`

---

## Success Criteria

### Verification Commands

```bash
bun run build  # Expected: Build successful, 0 errors
bun test       # Expected: All tests pass
```

### Final Checklist

- [x] `contextMenus` permission in wxt.config.ts
- [x] Right-click menu shows on selected text (any webpage)
- [x] Side panel auto-opens when closed
- [x] AI streams response in chat after context menu action
- [x] Session messages persist across browser restart
- [x] Search returns results from ALL sessions
- [x] Export downloads .txt file
- [x] No new npm packages installed
- [x] No `response_format` in chat.ts
