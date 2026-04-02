# Chat Feature — Sidepanel 聊天窗口

## TL;DR

> **Quick Summary**: 在现有 Chrome 扩展 sidepanel 底部新增持久化聊天窗口，支持流式输出（SSE）、多会话管理、以及自动注入当前页面摘要作为上下文。
>
> **Deliverables**:
> - `providers/chat.ts` — ChatProvider，支持流式 SSE fetch + AbortSignal
> - `utils/chatStorage.ts` — 多会话 CRUD，max 10 sessions × 100 messages，含自动修剪
> - `entrypoints/background.ts` (修改) — 新增 `chrome.runtime.onConnect` 处理流式聊天
> - `entrypoints/sidepanel/components/ChatPanel.tsx` — 聊天主面板（消息列表 + 输入框 + 工具栏）
> - `entrypoints/sidepanel/components/ChatMessage.tsx` — 消息气泡组件
> - `entrypoints/sidepanel/components/ChatInput.tsx` — 输入框 + 发送按钮
> - `entrypoints/sidepanel/App.tsx` (修改) — 布局拆分为上方摘要区 + 下方始终可见聊天区
> - `wxt.config.ts` (修改) — 新增 `http://localhost/*` 等本地端点权限
>
> **Estimated Effort**: Large  
> **Parallel Execution**: YES — 3 waves  
> **Critical Path**: Task 1 (类型) → Task 2 (存储) + Task 3 (Provider) → Task 4 (Background) → Task 5 (UI 组件) → Task 6 (App 集成) → Task 7 (manifest)

---

## Context

### Original Request
用户希望在 sidepanel 底部新增聊天功能：总结完成后可继续提问，也可不总结直接聊天，历史持久化存储，支持 Clear 和 New Session，流式打字输出。

### Interview Summary
**Key Discussions**:
- **聊天历史持久化**: `chrome.storage.local`，提供 Clear History + New Session 两个操作
- **流式输出**: 支持（打字机效果），通过 `chrome.runtime.connect` 长连接从 background 推流到 sidepanel
- **页面上下文注入**: 如果已有摘要，自动将摘要注入为 system prompt 的一部分；无摘要时降级为通用助手角色

**Research Findings** (from codebase + Metis analysis):
- `background.ts` 已有 20s keepalive heartbeat，但不足以覆盖长流式请求，需要在流式循环中补充保活
- `openai.ts` 30s 超时常量不能复用于聊天流，需独立超时配置（或 300s）
- `fakeBrowser` 不支持 `runtime.connect/Port`，测试需要手动 `vi.fn()` mock
- `browser.*` vs `chrome.*` 不一致已存在；新代码统一用 `browser.*`（testability）
- `response_format: { type: 'json_object' }` 是总结专用，聊天接口绝对不能带此参数
- `TextDecoder` 必须单例跨 chunk 使用（multi-byte UTF-8 边界）

### Metis Review
**Identified Gaps** (addressed in this plan):
- **会话作用域**: 聊天历史全局，摘要注入时检查 `url` 是否匹配当前活动 Tab，不匹配则不注入
- **"New Session" vs "Clear History"**: Clear = 清空当前会话消息；New Session = 创建新会话（保留旧会话，最多10个，超出自动修剪最旧的）
- **注入内容**: 注入 `SummaryResult`（结构化 JSON 摘要，compact），不注入原始页面文本
- **多轮上下文**: 发送请求时携带完整 messages 历史；超过 50 条时从前端截断（不影响存储，仅影响 API payload）
- **30s 超时问题**: ChatProvider 独立超时，默认 300s
- **`[DONE]` 与 finish_reason 两种终止格式**: SSE parser 两种都处理
- **Port 并发**: background 每次 onConnect 覆盖当前 portRef，旧 fetch 通过 abort signal 取消
- `http://localhost/*` 添加到 host_permissions

---

## Work Objectives

### Core Objective
在现有 sidepanel 底部持久添加聊天区域，用户可随时与 AI 交互，历史跨会话保留，AI 在有摘要时自动获得页面上下文。

### Concrete Deliverables
- `providers/chat.ts` + 测试
- `utils/chatStorage.ts` + 测试
- `entrypoints/background.ts` 扩展（onConnect 处理器）+ 测试
- `entrypoints/sidepanel/components/ChatPanel.tsx` + `ChatMessage.tsx` + `ChatInput.tsx` + 测试
- `entrypoints/sidepanel/App.tsx` 布局修改
- `wxt.config.ts` manifest 权限修改

### Definition of Done
- [ ] `npx tsc --noEmit` 零错误
- [ ] `npx vitest run` 零失败（含所有新增测试）
- [ ] `npx wxt build` 构建成功
- [ ] 侧边栏底部始终可见聊天区，可发送消息并看到流式打字效果
- [ ] 关闭并重新打开侧边栏后，聊天历史保留
- [ ] Clear History 清空当前会话；New Session 创建新会话

### Must Have
- 流式输出（SSE）通过 `chrome.runtime.connect` 端口传输
- 持久化存储（`chrome.storage.local`）：max 10 sessions，每 session max 100 messages
- 在有摘要时自动注入 `SummaryResult` 到 system prompt（需 URL 匹配当前活动 Tab）
- AbortSignal 在 port 断开时取消 in-flight fetch
- 空消息拦截、apiKey 为空拦截
- `TextDecoder` 单例跨 chunk 解码

### Must NOT Have (Guardrails)
- **禁止** 使用 `openai` npm 包（raw fetch only）
- **禁止** 添加 markdown 渲染库（`white-space: pre-wrap` 即可）
- **禁止** 添加消息复制/编辑/重新生成按钮（v1 范围外）
- **禁止** 会话列表/切换 UI（数据模型支持多会话，UI 只展示当前）
- **禁止** 每会话独立模型选择（继承全局设置）
- **禁止** 在聊天组件中第三次声明 `ExtensionSettings`（已在两处存在）
- **禁止** 复用 `openai.ts` 中 30s 超时常量
- **禁止** 在 `chat.ts` 的 fetch body 中携带 `response_format`
- **禁止** 将代码修改扩展到总结功能流程（不破坏现有状态机）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest + `@webext-core/fake-browser`)
- **Automated tests**: TDD（先写测试，后写实现）
- **Framework**: Vitest
- **TDD Flow**: 每个任务先写 `.test.ts` (RED) → 再写实现 (GREEN) → 重构 (REFACTOR)

### QA Policy
每个任务包含 agent 可执行的 QA Scenarios。证据保存至 `.sisyphus/evidence/`。

- **UI**: Playwright — 在已加载扩展的 Chrome 实例中操作
- **API/存储**: Bash (`vitest run` / `tsc --noEmit`)
- **Background 消息流**: Bash (mock port + vitest)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (立即开始 — 基础类型 + 权限):
└── Task 1: 扩展 MessageType 联合类型 + 新增聊天相关接口 [quick]

Wave 2 (Wave 1 完成后 — 独立模块并行):
├── Task 2: chatStorage 模块 (CRUD + 会话管理) [quick]
└── Task 3: ChatProvider 流式 SSE fetch (providers/chat.ts) [unspecified-high]

Wave 3 (Wave 2 完成后 — background + UI 并行):
├── Task 4: background onConnect 流式处理器 [unspecified-high]
└── Task 5: UI 组件 (ChatPanel + ChatMessage + ChatInput) [visual-engineering]

Wave 4 (Wave 3 完成后 — 集成):
├── Task 6: App.tsx 布局集成 [visual-engineering]
└── Task 7: wxt.config.ts manifest 权限 [quick]

Wave FINAL (所有 Task 完成后 — 4 个并行验收):
├── Task F1: Plan Compliance Audit [oracle]
├── Task F2: Code Quality Review [unspecified-high]
├── Task F3: Real Manual QA [unspecified-high]
└── Task F4: Scope Fidelity Check [deep]
→ 呈现结果 → 等待用户明确 "okay"
```

**Critical Path**: T1 → T2 + T3 → T4 + T5 → T6 + T7 → F1-F4 → user okay  
**Parallel Speedup**: ~55% faster than sequential  
**Max Concurrent**: 2 (Waves 2 & 3)

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| T1 | — | T2, T3, T4, T5 |
| T2 | T1 | T4, T5 |
| T3 | T1 | T4 |
| T4 | T2, T3 | T6 |
| T5 | T1, T2 | T6 |
| T6 | T4, T5 | F1-F4 |
| T7 | — | F1-F4 |
| F1-F4 | T6, T7 | — |

### Agent Dispatch Summary

- **Wave 1**: T1 → `quick`
- **Wave 2**: T2 → `quick`, T3 → `unspecified-high`
- **Wave 3**: T4 → `unspecified-high`, T5 → `visual-engineering`
- **Wave 4**: T6 → `visual-engineering`, T7 → `quick`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. 扩展 MessageType 联合类型 + 新增聊天接口

  **What to do**:
  - 在 `utils/types.ts` 的 `MessageType` 联合类型中新增：`'CHAT_SEND' | 'CHAT_STREAM_CHUNK' | 'CHAT_STREAM_END' | 'CHAT_STREAM_ERROR' | 'CHAT_CLEAR' | 'CHAT_NEW_SESSION'`
  - 新增接口 `ChatMessage`：`{ id: string; role: 'user' | 'assistant'; content: string; timestamp: number }`
  - 新增接口 `ChatSession`：`{ id: string; messages: ChatMessage[]; createdAt: number; pageUrl?: string; pageTitle?: string }`
  - 新增接口 `ChatStreamChunk`：`{ type: 'CHAT_STREAM_CHUNK'; content: string }`
  - 新增接口 `ChatStreamEnd`：`{ type: 'CHAT_STREAM_END' }`
  - 新增接口 `ChatStreamError`：`{ type: 'CHAT_STREAM_ERROR'; error: ErrorResponse }`
  - 新增接口 `ChatSendPayload`：`{ message: string; sessionId: string; pageContext?: { url: string; summary: SummaryResult } }`
  - **不要**修改任何现有接口或类型（包括 `ExtensionSettings`）

  **Must NOT do**:
  - 不修改现有 `MessageType` 之外的任何内容
  - 不重复声明 `ExtensionSettings`（已在两处存在）
  - 不删除现有类型

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件类型定义扩展，无逻辑，无副作用
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO（无依赖，但作为基础类型必须先完成）
  - **Parallel Group**: Wave 1（单任务）
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None（可立即开始）

  **References**:

  **Pattern References**:
  - `utils/types.ts:52-60` — 现有 `MessageType` 联合，直接扩展该联合即可
  - `utils/types.ts:85-96` — `MessageRequest<T>` / `MessageResponse<T>` 泛型结构，新接口参考此模式
  - `utils/types.ts:8-11` — `Viewpoint` 接口结构示例（简单 interface 风格）

  **Acceptance Criteria**:

  - [ ] `npx tsc --noEmit` 零错误（验证类型扩展不破坏现有代码）
  - [ ] `MessageType` 联合中包含全部 6 个新消息类型
  - [ ] 5 个新接口（`ChatMessage`、`ChatSession`、`ChatStreamChunk`、`ChatStreamEnd`、`ChatStreamError`、`ChatSendPayload`）全部导出

  **QA Scenarios**:

  ```
  Scenario: TypeScript 类型检查通过
    Tool: Bash
    Preconditions: 修改 utils/types.ts 后
    Steps:
      1. 运行 npx tsc --noEmit
      2. 检查输出中无 error 行
    Expected Result: 命令以 exit code 0 退出，输出为空（零错误）
    Failure Indicators: 任何 "error TS" 行
    Evidence: .sisyphus/evidence/task-1-tsc-check.txt

  Scenario: 新类型可在其他文件中 import
    Tool: Bash
    Preconditions: types.ts 修改完毕
    Steps:
      1. 在 vitest 的一个临时测试中 import { ChatMessage, ChatSession } from '~/utils/types'
      2. 验证 TypeScript 不报错
    Expected Result: import 成功，零 TS 错误
    Failure Indicators: "Module has no exported member" 错误
    Evidence: .sisyphus/evidence/task-1-import-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-1-tsc-check.txt`：`tsc --noEmit` 完整输出

  **Commit**: YES
  - Message: `types(chat): add chat message types and interfaces to MessageType union`
  - Files: `utils/types.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 2. chatStorage 模块 — 持久化多会话 CRUD

  **What to do**:
  - 新建 `utils/chatStorage.ts`，使用 `browser.storage.local`（非 `chrome.*`）
  - 存储 key：`chatSessions`（`ChatSession[]`）、`activeChatSessionId`（`string`）
  - 实现以下函数并导出：
    - `getSessions(): Promise<ChatSession[]>` — 返回所有会话，按 createdAt 降序
    - `getActiveSession(): Promise<ChatSession | null>` — 返回 activeChatSessionId 对应的会话，无则创建新会话并保存
    - `createSession(pageUrl?: string, pageTitle?: string): Promise<ChatSession>` — 创建新会话，id = `crypto.randomUUID()`，若 sessions 已达 10 个则删除最旧的会话
    - `addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<ChatMessage>` — 向指定会话追加消息，若会话消息已达 100 条则删除最旧 10 条（sliding window）；id = `crypto.randomUUID()`；**每次写入后调用 `browser.storage.local.set` 并在 catch 中抛出带用户友好消息的 Error**
    - `clearSession(sessionId: string): Promise<void>` — 清空指定会话的 messages 数组（不删除会话本身）
    - `newSession(pageUrl?: string, pageTitle?: string): Promise<ChatSession>` — 等价于 `createSession`，返回新会话并设置为 active
    - `setActiveSession(sessionId: string): Promise<void>` — 更新 activeChatSessionId
  - 常量：`MAX_SESSIONS = 10`，`MAX_MESSAGES_PER_SESSION = 100`，`PRUNE_COUNT = 10`
  - 新建 `utils/chatStorage.test.ts`（TDD：先写测试）：
    - 使用 `fakeBrowser`（`@webext-core/fake-browser`），在 beforeEach 中 reset storage
    - 测试：`createSession` 创建会话并持久化
    - 测试：`createSession` 在 10 个会话后自动删除最旧
    - 测试：`addMessage` 追加消息并返回带 id 的 ChatMessage
    - 测试：`addMessage` 在 100 条消息后自动修剪
    - 测试：`clearSession` 清空 messages 但保留会话对象
    - 测试：`newSession` 创建新会话并设置为 active
    - 测试：`getSessions` 返回降序排列的会话
    - 测试：storage 写入失败时 `addMessage` 抛出 Error

  **Must NOT do**:
  - 不使用 `chrome.storage`（使用 `browser.storage`，保持 testability）
  - 不在此文件中声明 `ExtensionSettings`
  - 不添加除上述以外的任何功能（无搜索、无导出、无压缩）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯存储 CRUD，无网络调用，逻辑清晰
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 3 并行）
  - **Parallel Group**: Wave 2（与 Task 3）
  - **Blocks**: Tasks 4, 5
  - **Blocked By**: Task 1（需要 `ChatMessage`、`ChatSession` 类型）

  **References**:

  **Pattern References**:
  - `utils/storage.ts:19-31` — `getSettings()` 的 `browser.storage.local.get` 用法，`chatStorage.ts` 使用同样模式
  - `utils/storage.ts:33-46` — `saveSettings()` 的 `browser.storage.local.set` 用法（需在 catch 中处理错误）
  - `utils/types.ts` (修改后) — `ChatMessage`、`ChatSession` 类型

  **Test References**:
  - 参考项目现有测试文件结构（Vitest + `@webext-core/fake-browser`）

  **Acceptance Criteria**:

  - [ ] 测试文件 `utils/chatStorage.test.ts` 包含 ≥8 个测试用例
  - [ ] `npx vitest run utils/chatStorage.test.ts` → 全部通过，0 失败
  - [ ] `npx tsc --noEmit` 零错误

  **QA Scenarios**:

  ```
  Scenario: 会话创建与持久化
    Tool: Bash (vitest run)
    Preconditions: fakeBrowser storage 已 reset
    Steps:
      1. 调用 createSession('https://example.com', 'Test Page')
      2. 调用 getSessions()
      3. 验证返回数组长度为 1，且 pageUrl === 'https://example.com'
    Expected Result: vitest 测试 PASS
    Failure Indicators: 测试失败或 storage 中无数据
    Evidence: .sisyphus/evidence/task-2-storage-tests.txt

  Scenario: 超出 MAX_SESSIONS 时自动修剪
    Tool: Bash (vitest run)
    Preconditions: fakeBrowser storage 已 reset
    Steps:
      1. 循环创建 11 个 session
      2. 调用 getSessions()
      3. 验证返回数组长度为 10（最旧的被删除）
    Expected Result: vitest 测试 PASS，length === 10
    Failure Indicators: length !== 10
    Evidence: .sisyphus/evidence/task-2-storage-tests.txt

  Scenario: clearSession 不删除会话本身
    Tool: Bash (vitest run)
    Steps:
      1. createSession() → addMessage() × 5 → clearSession(id)
      2. getActiveSession() 检查 messages.length === 0
      3. getSessions() 检查会话仍存在
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-2-storage-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-2-storage-tests.txt`：`vitest run utils/chatStorage.test.ts` 完整输出

  **Commit**: YES
  - Message: `feat(chatStorage): add persistent multi-session chat storage with auto-pruning`
  - Files: `utils/chatStorage.ts`, `utils/chatStorage.test.ts`
  - Pre-commit: `npx vitest run utils/chatStorage.test.ts`

- [x] 3. ChatProvider — 流式 SSE fetch（providers/chat.ts）

  **What to do**:
  - 新建 `providers/chat.ts`，实现 `ChatProvider` 类
  - 构造函数接收 `OpenAIProviderConfig`（复用 `providers/openai.ts` 中已有的接口定义，直接 import）
  - 核心方法：
    ```typescript
    async *chat(
      messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      signal: AbortSignal
    ): AsyncGenerator<string, void, unknown>
    ```
    - 方法为 **async generator**，每次 yield 一个 SSE chunk 的文本片段
    - 请求体：`{ model, messages, stream: true }`（**不携带 `response_format`**）
    - 超时：独立常量 `CHAT_TIMEOUT_MS = 300_000`（300s），使用 `AbortSignal.any([signal, AbortSignal.timeout(CHAT_TIMEOUT_MS)])`（若不支持 `.any` 则手动合并）
    - 读取 `response.body.getReader()` 获取 `ReadableStream`
    - `TextDecoder` 实例化一次（`new TextDecoder()`），在每次 `decode(chunk, { stream: true })` 时跨 chunk 保持状态
    - 维护 `buffer` 字符串，按 `\n` 分割 SSE 行：
      - 行以 `data: ` 开头则提取 JSON 部分
      - 若 JSON 部分为 `[DONE]` 则终止
      - 否则解析 JSON，取 `choices[0]?.delta?.content`，若非空则 `yield content`
      - 若 JSON 解析失败则 skip（不 throw）
    - 处理 `finish_reason: 'stop'` 和 `data: [DONE]` 两种终止信号
    - HTTP 非 200 时抛出与 `openai.ts` 相同的错误格式（`{ code, message }`）
    - `signal.aborted` 检查：在每次 `reader.read()` 后如果 signal 已 abort，则 break 并调用 `reader.cancel()`
  - 新建 `providers/chat.test.ts`（TDD 先写）：
    - Mock `fetch` 返回模拟的 SSE 流（构造 `ReadableStream` with `TransformStream`）
    - 测试：正常流式返回 → generator 逐 chunk yield "Hello", " World"
    - 测试：`data: [DONE]` 终止后 generator 结束
    - 测试：AbortSignal 触发时 generator 停止 yield
    - 测试：HTTP 401 时抛出 `{ code: 'INVALID_API_KEY' }`
    - 测试：malformed JSON chunk 被 skip，流继续
    - 测试：`response_format` 不出现在请求体中（检查 mock fetch 的 call args）
    - 测试：`TextDecoder` 在 multi-byte 字符跨 chunk 边界时正确解码

  **Must NOT do**:
  - 不复用 `openai.ts` 的 `API_TIMEOUT_MS = 30000`
  - 不在请求体中携带 `response_format`
  - 不使用 `openai` npm 包
  - 不在此文件中声明 `ExtensionSettings`（从 `openai.ts` import `OpenAIProviderConfig`）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 SSE 解析、ReadableStream、async generator、AbortSignal，逻辑复杂
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 2 并行）
  - **Parallel Group**: Wave 2（与 Task 2）
  - **Blocks**: Task 4
  - **Blocked By**: Task 1（需要类型）

  **References**:

  **Pattern References**:
  - `providers/openai.ts:17-83` — 现有 `summarize()` 方法的 fetch 模式、错误处理结构、baseUrl 处理（`replace(/\/$/, '')`）。`chat()` 复用相同 URL 构造逻辑和错误 code 枚举
  - `providers/openai.ts:8-12` — `OpenAIProviderConfig` 接口，直接 import 复用
  - `providers/openai.ts:24-28` — AbortController 用法（在 chat.ts 中改为接收外部 signal）

  **External References**:
  - MDN ReadableStream + getReader(): `https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream`
  - OpenAI SSE 格式: `data: {"choices":[{"delta":{"content":"token"}}]}\n\ndata: [DONE]\n\n`
  - AbortSignal.any() (Chrome 116+): `https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static`

  **Acceptance Criteria**:

  - [ ] 测试文件 `providers/chat.test.ts` 包含 ≥7 个测试
  - [ ] `npx vitest run providers/chat.test.ts` → 全部通过，0 失败
  - [ ] 测试中验证 fetch body **不含** `response_format` 字段
  - [ ] `npx tsc --noEmit` 零错误

  **QA Scenarios**:

  ```
  Scenario: 正常流式输出 — generator 逐 token yield
    Tool: Bash (vitest run)
    Preconditions: vi.fn() mock fetch 返回模拟 SSE 流
    Steps:
      1. 构造 SSE stream: "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n\n"
                         + "data: {\"choices\":[{\"delta\":{\"content\":\" World\"}}]}\n\n"
                         + "data: [DONE]\n\n"
      2. for await (const chunk of provider.chat(messages, signal))
      3. 收集所有 chunk，验证 join === "Hello World"
    Expected Result: vitest PASS, chunks = ["Hello", " World"]
    Failure Indicators: chunks 为空或 join !== "Hello World"
    Evidence: .sisyphus/evidence/task-3-chat-provider-tests.txt

  Scenario: AbortSignal 触发时流终止
    Tool: Bash (vitest run)
    Steps:
      1. 创建 AbortController，传入 signal
      2. generator 开始后立即调用 abort()
      3. 验证 generator 在当前或下一次 yield 后停止
    Expected Result: PASS，generator 终止无 throw
    Evidence: .sisyphus/evidence/task-3-chat-provider-tests.txt

  Scenario: 请求体不含 response_format
    Tool: Bash (vitest run)
    Steps:
      1. 检查 vi.fn() mock fetch 的第二个参数 body
      2. JSON.parse(body).response_format === undefined
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-3-chat-provider-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-3-chat-provider-tests.txt`：`vitest run providers/chat.test.ts` 完整输出

  **Commit**: YES
  - Message: `feat(chatProvider): add streaming SSE chat provider with AbortSignal support`
  - Files: `providers/chat.ts`, `providers/chat.test.ts`
  - Pre-commit: `npx vitest run providers/chat.test.ts`

- [x] 4. background.ts — 新增 onConnect 流式聊天处理器

  **What to do**:
  - 在 `entrypoints/background.ts` 的 `defineBackground` 内新增：
    ```typescript
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name !== 'chat-stream') return;
      handleChatPort(port);
    });
    ```
  - 实现 `handleChatPort(port: chrome.runtime.Port)` 函数：
    - 声明模块级 `let activeChatAbortController: AbortController | null = null`（每次新连接覆盖，取消上一个）
    - 创建新 `AbortController`，赋值给 `activeChatAbortController`
    - 监听 `port.onMessage`：收到 `{ type: 'CHAT_SEND', payload: ChatSendPayload }` 消息时执行聊天逻辑
    - 监听 `port.onDisconnect`：调用 `activeChatAbortController.abort()` 取消 in-flight fetch
    - 聊天逻辑步骤：
      1. 从 `getSettings()` 获取 apiKey/baseUrl/model
      2. 若 `apiKey` 为空，`port.postMessage({ type: 'CHAT_STREAM_ERROR', error: { code: 'NO_API_KEY', message: '请先在设置中填写 API Key' } })` 后 return
      3. 若 `payload.message` 为空字符串，直接 return（不发送错误）
      4. 构造 messages 数组：
         - system message：若 `payload.pageContext` 存在且 `pageContext.url` 与当前活动 Tab URL 一致则注入摘要（否则用通用 prompt）
         - 从 `chatStorage.getActiveSession()` 获取历史消息，转为 `{ role, content }` 格式，最多取最后 50 条
         - 末尾追加当前用户消息
      5. 调用 `chatStorage.addMessage(sessionId, { role: 'user', content: payload.message, timestamp: Date.now() })`
      6. 创建 `ChatProvider` 实例，`for await (const chunk of provider.chat(messages, signal))`：
         - `port.postMessage({ type: 'CHAT_STREAM_CHUNK', content: chunk })`
      7. 循环结束后：`port.postMessage({ type: 'CHAT_STREAM_END' })`
      8. 将完整 assistant 响应通过 `chatStorage.addMessage` 保存（累积 chunks）
      9. catch 所有错误：`port.postMessage({ type: 'CHAT_STREAM_ERROR', error: { code: 'CHAT_ERROR', message: err.message || '聊天请求失败' } })`
    - **注意**：验证当前 Tab URL 用于判断是否注入 pageContext（`chrome.tabs.query({ active: true, currentWindow: true })`）
  - 新建 / 修改 `entrypoints/background.test.ts`（或新增测试文件），测试 onConnect 处理器：
    - **注意**：`fakeBrowser` 不支持 `runtime.connect` / Port，需手动创建 mock port：
      ```typescript
      const mockPort = {
        name: 'chat-stream',
        postMessage: vi.fn(),
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: vi.fn() },
      };
      ```
    - 测试：收到 `CHAT_SEND` → mock ChatProvider generator → 验证 `postMessage` 依次被 `CHAT_STREAM_CHUNK`, `CHAT_STREAM_END` 调用
    - 测试：apiKey 为空时发送 `CHAT_STREAM_ERROR`，不调用 fetch
    - 测试：`port.onDisconnect` 触发时调用 `abortController.abort()`
    - 测试：第二次连接时，第一次的 abort controller 被取消（`abort()` 被调用）

  **Must NOT do**:
  - 不修改现有 `onMessage` 处理逻辑（不破坏总结流程）
  - 不在 `onMessage` 中添加 Chat 消息类型处理（Chat 走 onConnect）
  - port name 不得使用 `"chat-stream"` 以外的名称（避免混淆）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Chrome Extension 消息协议、async generator 集成、端口生命周期管理，复杂度高
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 5 并行）
  - **Parallel Group**: Wave 3（与 Task 5）
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 2（需要 chatStorage），Task 3（需要 ChatProvider）

  **References**:

  **Pattern References**:
  - `entrypoints/background.ts:23-74` — 现有 `onMessage.addListener` 处理器，新增 `onConnect` 紧随其后，风格一致
  - `entrypoints/background.ts:12-17` — `defineBackground()` 包裹结构，`onConnect` 在同一作用域内注册
  - `entrypoints/background.ts:77-100` — `handleExtractAndSummarize` 函数，用于参考 settings 获取 + provider 调用模式
  - `providers/chat.ts`（Task 3 产出）— `ChatProvider` 导入路径和 API
  - `utils/chatStorage.ts`（Task 2 产出）— `getActiveSession`, `addMessage` 导入路径

  **API/Type References**:
  - `utils/types.ts` (Task 1 修改后) — `ChatSendPayload`, `ChatStreamChunk`, `ChatStreamEnd`, `ChatStreamError` 接口

  **Acceptance Criteria**:

  - [ ] `npx vitest run` 全部通过（含新增 background 测试），0 失败
  - [ ] `npx tsc --noEmit` 零错误
  - [ ] 背景脚本中 `onConnect` handler 存在且仅处理 `name === 'chat-stream'` 的 port

  **QA Scenarios**:

  ```
  Scenario: 完整流式聊天流程（mock port）
    Tool: Bash (vitest run)
    Preconditions: mock port，mock ChatProvider generator yield ["Hello", " World"]，mock getSettings 返回有效 apiKey
    Steps:
      1. 触发 onConnect(mockPort)
      2. 触发 port.onMessage 回调，传入 { type: 'CHAT_SEND', payload: { message: 'test', sessionId: 'sid1' } }
      3. 等待 async 处理完成
      4. 检查 mockPort.postMessage.mock.calls
    Expected Result: calls[0] = { type: 'CHAT_STREAM_CHUNK', content: 'Hello' }
                     calls[1] = { type: 'CHAT_STREAM_CHUNK', content: ' World' }
                     calls[2] = { type: 'CHAT_STREAM_END' }
    Failure Indicators: postMessage 未被调用或顺序错误
    Evidence: .sisyphus/evidence/task-4-background-tests.txt

  Scenario: apiKey 为空时返回错误
    Tool: Bash (vitest run)
    Steps:
      1. mock getSettings 返回 { apiKey: '' }
      2. 发送 CHAT_SEND
      3. 验证第一个 postMessage 调用为 { type: 'CHAT_STREAM_ERROR', error: { code: 'NO_API_KEY', ... } }
    Expected Result: PASS，不调用 fetch
    Evidence: .sisyphus/evidence/task-4-background-tests.txt

  Scenario: port 断开时 abort
    Tool: Bash (vitest run)
    Steps:
      1. 触发 onConnect，流开始
      2. 手动触发 port.onDisconnect 回调
      3. 验证 abortController.abort() 被调用（通过 spy）
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-4-background-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-4-background-tests.txt`：`vitest run` 完整输出

  **Commit**: YES
  - Message: `feat(background): add onConnect handler for streaming chat`
  - Files: `entrypoints/background.ts`，测试文件
  - Pre-commit: `npx vitest run`

- [x] 5. UI 组件 — ChatPanel + ChatMessage + ChatInput

  **What to do**:
  - 新建三个组件文件（TDD：测试先行）：

  **A. `ChatMessage.tsx`**（最简单，先建）：
  - Props：`message: ChatMessage`（含 role, content, timestamp）
  - user 消息：右对齐气泡，蓝色背景（`bg-blue-600 text-white`），圆角 `rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl`
  - assistant 消息：左对齐气泡，灰色背景（`bg-gray-100 text-gray-900`），相反圆角
  - 内容使用 `<pre className="whitespace-pre-wrap font-sans text-sm">`（不使用 markdown 库）
  - streaming 状态下（`isStreaming: boolean` prop）在末尾显示闪烁光标（`animate-pulse` 小方块）
  - 不添加复制/编辑/重新生成按钮

  **B. `ChatInput.tsx`**：
  - Props：`onSend: (message: string) => void; disabled: boolean`
  - `<textarea>` 自动高度（最多 5 行），`rows={1}`，监听 `input` 事件动态设置 `style.height`
  - Enter（无 Shift）发送消息；Shift+Enter 换行
  - 空消息（trim 后为空）时禁用发送按钮，不调用 `onSend`
  - 发送后清空 textarea
  - 发送按钮：蓝色右箭头 SVG 图标，`disabled` 时灰色

  **C. `ChatPanel.tsx`**（主面板）：
  - Props：`summaryContext?: { url: string; summary: SummaryResult }` （来自 App.tsx 传入）
  - 内部状态：`messages: ChatMessage[]`（从 chatStorage 加载），`isStreaming: boolean`，`streamingContent: string`（当前流式累积内容）
  - `useEffect` on mount：`chatStorage.getActiveSession().then(s => setMessages(s?.messages ?? []))`
  - 建立 port 连接：`chrome.runtime.connect({ name: 'chat-stream' })`，监听 port messages：
    - `CHAT_STREAM_CHUNK`：追加到 `streamingContent`
    - `CHAT_STREAM_END`：将完整 assistant 消息推入 `messages`，清空 `streamingContent`，`setIsStreaming(false)`
    - `CHAT_STREAM_ERROR`：`setIsStreaming(false)`，在 messages 中显示错误消息（role: 'assistant'，content 为错误文本）
  - `useEffect cleanup`：`port.disconnect()`（防止 sidepanel unmount 时 port 泄漏）
  - `handleSend(text: string)`：
    1. `setIsStreaming(true)`
    2. `port.postMessage({ type: 'CHAT_SEND', payload: { message: text, sessionId: activeSession.id, pageContext: summaryContext } })`
    3. 在 `messages` 中立即添加 user 消息（乐观更新）
  - 工具栏按钮（消息列表顶部）：
    - "清空记录" 按钮 → `chatStorage.clearSession(sessionId)` → `setMessages([])`
    - "新对话" 按钮 → `chatStorage.newSession()` → 重新加载 port 连接 → `setMessages([])`
  - 消息列表：`overflow-y-auto`，新消息后自动滚动到底部（`useRef` + `scrollIntoView`）
  - 占位文案（无消息时）：`text-sm text-gray-400 text-center py-4`，显示"发送消息开始对话…"
  - 流式消息：在消息列表末尾渲染 `<ChatMessage>` with `content={streamingContent}` 和 `isStreaming={true}`
  - 禁用输入：`isStreaming === true` 时 `ChatInput disabled={true}`

  **测试文件**（TDD 先行）：
  - `ChatMessage.test.tsx`：测试 user/assistant 样式区别，测试 `isStreaming` 光标显示
  - `ChatInput.test.tsx`：测试空消息不调用 onSend，测试 Enter 触发 onSend，测试 Shift+Enter 不触发
  - `ChatPanel.test.tsx`：mock `chrome.runtime.connect` + `chatStorage`，测试加载历史，测试发送消息流程，测试 CHAT_STREAM_CHUNK 累积，测试 CHAT_STREAM_END 推入消息列表

  **Must NOT do**:
  - 不使用任何 markdown 渲染库（`react-markdown`、`marked` 等）
  - 不添加消息复制/编辑/重新生成按钮
  - 不添加会话历史列表 UI（只显示当前会话）
  - 不在 ChatPanel 中声明 `ExtensionSettings`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React 组件 UI 实现，涉及 Tailwind CSS v4 样式、交互状态、自动滚动
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 4 并行）
  - **Parallel Group**: Wave 3（与 Task 4）
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1（类型）、Task 2（chatStorage API）

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/App.tsx:51-108` — 现有 sidepanel 布局和 Tailwind 类名风格，新组件保持一致
  - `entrypoints/sidepanel/components/SettingsModal.tsx:93-219` — 现有模态框组件，参考 button、input、文本样式
  - `entrypoints/sidepanel/components/LoadingState.tsx` — 加载状态组件，参考布局结构
  - `utils/chatStorage.ts`（Task 2 产出）— 导入路径和函数签名
  - `utils/types.ts`（Task 1 修改后）— `ChatMessage` 类型

  **API/Type References**:
  - `utils/types.ts` — `SummaryResult`（用于 `summaryContext` prop 类型）
  - Tailwind v4 语法：使用 `bg-*/opacity` 而非已废弃的 `bg-opacity-*`

  **Acceptance Criteria**:

  - [ ] 测试文件共 ≥10 个测试用例（三个组件合计）
  - [ ] `npx vitest run` 全部通过，0 失败
  - [ ] `npx tsc --noEmit` 零错误

  **QA Scenarios**:

  ```
  Scenario: ChatMessage 渲染区分 user 和 assistant
    Tool: Bash (vitest run)
    Steps:
      1. render(<ChatMessage message={{ role: 'user', content: 'Hello', ... }} />)
      2. 检查元素含 class bg-blue-600
      3. render(<ChatMessage message={{ role: 'assistant', content: 'Hi', ... }} />)
      4. 检查元素含 class bg-gray-100
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-5-ui-tests.txt

  Scenario: ChatInput 空消息不触发 onSend
    Tool: Bash (vitest run)
    Steps:
      1. render(<ChatInput onSend={mockFn} disabled={false} />)
      2. 按下 Enter（textarea 内容为空）
      3. 验证 mockFn 未被调用
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-5-ui-tests.txt

  Scenario: ChatPanel 加载历史消息
    Tool: Bash (vitest run)
    Preconditions: mock chatStorage.getActiveSession 返回含 2 条消息的 session
    Steps:
      1. render(<ChatPanel />)
      2. 等待 useEffect 完成
      3. 检查 DOM 中渲染了 2 个消息气泡
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-5-ui-tests.txt

  Scenario: 流式 chunk 累积并在 END 时推入列表
    Tool: Bash (vitest run)
    Steps:
      1. 触发 mock port 发送 CHAT_STREAM_CHUNK: "Hello"
      2. 触发 CHAT_STREAM_CHUNK: " World"
      3. 触发 CHAT_STREAM_END
      4. 验证最终 messages 数组新增 assistant 消息 content === "Hello World"
      5. 验证 isStreaming === false
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-5-ui-tests.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-5-ui-tests.txt`：`vitest run` 完整输出

  **Commit**: YES
  - Message: `feat(ui): add ChatPanel, ChatMessage, ChatInput components`
  - Files: 三个组件文件 + 测试文件
  - Pre-commit: `npx vitest run`

- [x] 6. App.tsx — 布局集成，将聊天面板嵌入 sidepanel

  **What to do**:
  - 修改 `entrypoints/sidepanel/App.tsx`：
    - 将当前的 `min-h-screen` 根 div 改为 `h-screen` + `flex flex-col`（固定视口高度，flex 纵向）
    - 布局结构：
      ```
      <div className="h-screen flex flex-col overflow-hidden">
        <header>…（不变）</header>
        <main className="flex-1 overflow-y-auto min-h-0">
          {/* 现有 idle/loading/error/done 状态渲染，不变 */}
        </main>
        <div className="border-t border-gray-200 flex flex-col" style={{ height: '45%' }}>
          <ChatPanel summaryContext={summaryContext} />
        </div>
      </div>
      ```
    - 计算 `summaryContext`：仅当 `state === 'done' && summaryResult !== null` 时，向 `ChatPanel` 传入 `{ url: currentTabUrl, summary: summaryResult }`；否则不传（`undefined`）
    - `currentTabUrl`：新增 `const [currentTabUrl, setCurrentTabUrl] = useState<string>('')`，在 `handleSummarize` 开始时通过 `chrome.tabs.query({ active: true, currentWindow: true })` 获取并存储
    - 聊天面板高度：固定占 sidepanel 45%（`style={{ height: '45%' }}`），上方摘要区 `flex-1 overflow-y-auto min-h-0` 自适应剩余空间
    - summary loading 时禁用聊天输入（通过 `ChatPanel` 的 props 或 context，最简单方案：给 ChatPanel 增加 `disabled?: boolean` prop，传入 `state === 'loading'`）
    - **不修改**现有 `handleSummarize`、`handleRetry`、`SettingsModal` 逻辑

  **Must NOT do**:
  - 不修改 header、SettingsModal、现有状态机逻辑
  - 不将 `chat.ts` 或 `chatStorage.ts` 直接 import 到 App.tsx（交给 ChatPanel 处理）
  - 不破坏现有测试

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React 布局修改，Tailwind flex/height 调整，集成现有组件
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 7 并行）
  - **Parallel Group**: Wave 4（与 Task 7）
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/App.tsx:51-109` — 完整现有 App 代码，在此基础上修改布局
  - `entrypoints/sidepanel/components/ChatPanel.tsx`（Task 5 产出）— import 路径和 props 接口

  **API/Type References**:
  - `utils/types.ts` — `SummaryResult`（summaryContext 中使用）

  **Acceptance Criteria**:

  - [ ] `npx tsc --noEmit` 零错误
  - [ ] `npx vitest run` 全部通过（现有测试零回归）
  - [ ] 修改后 `App.tsx` 不超过 150 行（避免过度膨胀）

  **QA Scenarios**:

  ```
  Scenario: 聊天区始终可见（idle 状态）
    Tool: Bash (vitest run 或 Playwright)
    Steps:
      1. render App，state = 'idle'
      2. 验证 ChatPanel 存在于 DOM
      3. 验证上方 idle card（"点击下方按钮"）与下方 ChatPanel 同时可见
    Expected Result: PASS — 两个区域共存
    Evidence: .sisyphus/evidence/task-6-app-layout.txt

  Scenario: 有摘要时 summaryContext 传入 ChatPanel
    Tool: Bash (vitest run)
    Steps:
      1. 将 App state 设为 'done'，summaryResult = mockSummary
      2. mock chrome.tabs.query 返回 { url: 'https://example.com' }
      3. 渲染 App，检查 ChatPanel 收到的 summaryContext.url === 'https://example.com'
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-6-app-layout.txt

  Scenario: loading 时 ChatPanel 禁用输入
    Tool: Bash (vitest run)
    Steps:
      1. 将 App state 设为 'loading'
      2. 检查 ChatPanel 收到 disabled={true} 或 ChatInput 的 textarea 有 disabled 属性
    Expected Result: PASS
    Evidence: .sisyphus/evidence/task-6-app-layout.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-6-app-layout.txt`：`vitest run` 完整输出

  **Commit**: YES
  - Message: `feat(sidepanel): integrate chat panel into App layout`
  - Files: `entrypoints/sidepanel/App.tsx`
  - Pre-commit: `npx vitest run && npx tsc --noEmit`

- [x] 7. wxt.config.ts — 新增本地端点 host_permissions

  **What to do**:
  - 在 `wxt.config.ts` 的 `manifest.host_permissions` 数组中追加：
    - `'http://localhost/*'`
    - `'http://127.0.0.1/*'`
  - 最终 host_permissions 变为：`['https://api.openai.com/*', 'https://*/*', 'http://localhost/*', 'http://127.0.0.1/*']`
  - 同时，将 `manifest.name` 和 `description` 保持不变（不做其他修改）

  **Must NOT do**:
  - 不修改 permissions、modules、vite 配置等其他任何字段
  - 不删除现有 host_permissions 条目

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 单文件单行配置修改
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 Task 6 并行）
  - **Parallel Group**: Wave 4（与 Task 6）
  - **Blocks**: F1-F4
  - **Blocked By**: None（可立即开始，不依赖其他 Task）

  **References**:

  **Pattern References**:
  - `wxt.config.ts:21-24` — 现有 `host_permissions` 数组，直接追加两条

  **Acceptance Criteria**:

  - [ ] `npx wxt build` 构建成功，无错误
  - [ ] 构建产物 `.output/chrome-mv3/manifest.json` 中 `host_permissions` 包含 `http://localhost/*`

  **QA Scenarios**:

  ```
  Scenario: manifest 构建包含本地权限
    Tool: Bash
    Steps:
      1. npx wxt build
      2. cat .output/chrome-mv3/manifest.json | grep "localhost"
    Expected Result: 输出含 "http://localhost/*"，exit code 0
    Failure Indicators: grep 无输出或 build 报错
    Evidence: .sisyphus/evidence/task-7-manifest-check.txt
  ```

  **Evidence to Capture**:
  - [ ] `task-7-manifest-check.txt`：`wxt build` + grep 输出

  **Commit**: YES
  - Message: `fix(manifest): add localhost http permissions for local AI endpoints`
  - Files: `wxt.config.ts`
  - Pre-commit: `npx wxt build`

---

## Final Verification Wave

> 4 个 review agent 并行运行。全部通过后向用户呈现结果，获取明确 "okay" 后方可标记完成。
> **不得在用户确认前自行完成任务。**

- [x] F1. **Plan Compliance Audit** — `oracle`
  通读 Plan。逐项核查 "Must Have"（读文件 / curl 端点 / 运行命令）；搜索 "Must NOT Have" 禁止模式（若找到则以 file:line 拒绝）；检查 `.sisyphus/evidence/` 中证据文件是否存在；对照 Plan 核查所有可交付物。
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  运行 `npx tsc --noEmit` + `npx vitest run`。审查所有修改文件：`as any`/`@ts-ignore`、空 catch、生产代码中的 `console.log`（background 的调试 log 除外）、未使用的 import、AI slop（过度注释、泛型命名 data/result/item）。
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  从干净状态开始。执行所有任务中的每一个 QA Scenario，捕获证据到 `.sisyphus/evidence/final-qa/`。测试跨任务集成：总结后聊天、无总结直接聊天、流式效果、持久化、Clear、New Session、abort 清理。
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  针对每个 Task，对比 "What to do" 与实际 diff。验证一一对应关系（无遗漏、无过度实现）。检查 "Must NOT do" 合规性（markdown 库、openai 包、第三处 ExtensionSettings 声明、response_format）。检测跨 Task 污染（Task N 修改了 Task M 的文件）。
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

```
Commit 1: types(chat): add chat message types and interfaces to MessageType union
  Files: utils/types.ts
  Pre-commit: npx tsc --noEmit

Commit 2: feat(chatStorage): add persistent multi-session chat storage with auto-pruning
  Files: utils/chatStorage.ts, utils/chatStorage.test.ts
  Pre-commit: npx vitest run utils/chatStorage.test.ts

Commit 3: feat(chatProvider): add streaming SSE chat provider with AbortSignal support
  Files: providers/chat.ts, providers/chat.test.ts
  Pre-commit: npx vitest run providers/chat.test.ts

Commit 4: feat(background): add onConnect handler for streaming chat
  Files: entrypoints/background.ts, entrypoints/background.test.ts
  Pre-commit: npx vitest run

Commit 5: feat(ui): add ChatPanel, ChatMessage, ChatInput components
  Files: entrypoints/sidepanel/components/ChatPanel.tsx
         entrypoints/sidepanel/components/ChatMessage.tsx
         entrypoints/sidepanel/components/ChatInput.tsx
         (+ test files)
  Pre-commit: npx vitest run

Commit 6: feat(sidepanel): integrate chat panel into App layout
  Files: entrypoints/sidepanel/App.tsx
  Pre-commit: npx vitest run && npx tsc --noEmit

Commit 7: fix(manifest): add localhost http permissions for local AI endpoints
  Files: wxt.config.ts
  Pre-commit: npx wxt build
```

---

## Success Criteria

### Verification Commands
```bash
npx tsc --noEmit          # Expected: 0 errors
npx vitest run            # Expected: all tests pass
npx wxt build             # Expected: build succeeds, no errors
```

### Final Checklist
- [ ] 所有 "Must Have" 实现完毕
- [ ] 所有 "Must NOT Have" 未出现在代码中
- [ ] 所有新增测试通过
- [ ] 现有测试无回归
