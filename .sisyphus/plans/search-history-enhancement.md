# 搜索历史功能增强 — 会话列表 + 搜索跳转 + 会话切换

## TL;DR

> **Quick Summary**: 增强现有搜索面板，使其默认展示历史会话列表，支持关键词搜索跨会话消息，点击结果直接跳转并继续对话。
> 
> **Deliverables**:
> - 搜索面板默认展示历史会话列表（标题 + 日期 + 消息数）
> - 输入关键词后切换为跨会话消息搜索
> - 点击会话/搜索结果 → 切换到该会话并可继续对话
> - 存储策略升级：最多 50 个会话 + 超 10 天自动清理
> - 会话标题自动生成（第一条用户消息截断）
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8 → Task 9 → F1-F4

---

## Context

### Original Request
用户希望点击搜索按钮后，下方展示近期历史会话列表。输入关键词搜索后，可以搜索更久远的历史会话。点击搜索结果可以直接跳回该历史会话继续对话。

### Interview Summary
**Key Discussions**:
- **入口交互**: 复用现有 🔍 按钮，搜索面板内嵌历史列表
- **存储策略**: MAX_SESSIONS 从 10 提升到 50 + 超过 10 天的会话自动清理
- **会话标题**: 用用户第一条消息前 20-30 字符截断
- **历史可写性**: 切换到历史会话后可继续发消息（类似 ChatGPT）
- **测试策略**: TDD（先写测试，再实现）

**Research Findings**:
- `getSessions()` 已在 `chatStorage.ts` 中实现但 UI 从未调用
- `setActiveSession(id)` 已实现，仅更新 activeId，切换安全不丢数据
- 消息在发送时即通过 `background.ts` 的 `addMessage()` 持久化，无需额外保存逻辑
- `ChatSession` 已有 `pageTitle`、`pageUrl` 字段但 `newSession()` 调用时未传入
- `SearchBar.tsx` 搜索结果有 `sessionId` 但无点击处理
- `handleNewSession()` 中 port 重连逻辑可复用于会话切换

### Metis Review
**Identified Gaps** (addressed):
- **Port 重连竞态**: 快速切换会话可能产生孤立 port — 已纳入 handleSwitchSession 设计，同 handleNewSession 模式
- **10 天清理误删活跃会话**: 自动清理需排除当前活跃会话 — 已纳入清理逻辑要求
- **会话标题 Unicode 安全**: `.slice()` 可能截断 emoji — 使用 `Array.from()` 处理 Unicode
- **清理时机**: 在 sidepanel 打开时的 `initSession()` 中执行一次性清理
- **Session title 生成时机**: 使用懒计算（derive from messages），不修改 schema，无迁移风险
- **mid-stream 切换**: 自然 abort（现有 AbortController 机制），部分响应不保存（与 handleNewSession 行为一致）

---

## Work Objectives

### Core Objective
将搜索面板从单一搜索功能升级为「历史会话管理中心」：默认展示会话列表 + 关键词搜索 + 一键跳转切换。

### Concrete Deliverables
- `utils/chatStorage.ts`: 新增 `cleanupOldSessions()`, `deriveSessionTitle()`, 常量调整
- `entrypoints/sidepanel/components/SessionList.tsx`: 新组件 — 会话列表
- `entrypoints/sidepanel/components/SearchBar.tsx`: 改造 — 默认展示会话列表 + 搜索双模式
- `entrypoints/sidepanel/components/ChatPanel.tsx`: 新增 `handleSwitchSession()` 逻辑
- 对应的 `.test.ts` / `.test.tsx` 文件

### Definition of Done
- [ ] `pnpm test` 全部通过，覆盖率不低于现有水平
- [ ] 点击 🔍 → 立即展示会话列表（无延迟）
- [ ] 输入关键词 → 300ms debounce 后展示搜索结果
- [ ] 点击会话/搜索结果 → 切换到该会话，消息加载，可继续发消息
- [ ] 创建第 51 个会话时，最旧的被自动删除
- [ ] 超过 10 天的非活跃会话在面板打开时被自动清理

### Must Have
- 会话列表默认展示（搜索框为空时）
- 搜索结果和会话项目均可点击跳转
- 会话切换后可继续对话（port 正确重连）
- 活跃会话永远不被自动清理
- 每条会话显示标题（第一条用户消息截断）和创建时间

### Must NOT Have (Guardrails)
- ❌ 不做日期分组（Today/Yesterday/Earlier）— 扁平列表按时间倒序即可
- ❌ 不做会话重命名、手动删除、置顶/收藏功能
- ❌ 不做搜索结果跳转后的消息高亮/滚动定位
- ❌ 不做会话列表分页或虚拟滚动
- ❌ 不修改 `background.ts` 的消息处理逻辑
- ❌ 不修改 `ChatSession` 类型定义（标题通过懒计算 derive，不加 title 字段）
- ❌ 不做会话预览（最后一条消息摘要）
- ❌ 不添加 `unlimitedStorage` 权限（10MB 足够 50 个会话）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES — vitest 3.0.0, jsdom, @webext-core/fake-browser, @testing-library/react
- **Automated tests**: TDD (RED → GREEN → REFACTOR)
- **Framework**: vitest
- **Each task follows**: Write failing test → Implement → Verify pass

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Storage logic**: Use Bash (`pnpm test`) — run specific test file, verify pass count
- **UI components**: Use Bash (`pnpm test`) — run component test file with vitest
- **Integration**: Use Bash (`pnpm test`) — run full test suite, verify 0 failures

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: Test factories + verify existing tests [quick]
├── Task 2: Storage constants change (MAX_SESSIONS=50) [quick]
└── Task 3: deriveSessionTitle() utility [quick]

Wave 2 (After Wave 1 — core modules, MAX PARALLEL):
├── Task 4: cleanupOldSessions() [unspecified-high]
├── Task 5: SessionList component [visual-engineering]
├── Task 6: SearchBar enhancement [visual-engineering]
└── Task 7: handleSwitchSession in ChatPanel [unspecified-high]

Wave 3 (After Wave 2 — integration):
├── Task 8: Wire cleanup into initSession [quick]
└── Task 9: Full integration test pass [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| 1 | — | 2, 3, 4, 5, 6, 7 |
| 2 | 1 | 4 |
| 3 | 1 | 5, 6 |
| 4 | 1, 2 | 8 |
| 5 | 1, 3 | 6 |
| 6 | 1, 3, 5 | 7, 9 |
| 7 | 1, 6 | 9 |
| 8 | 4 | 9 |
| 9 | 6, 7, 8 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 `quick`, T2 `quick`, T3 `quick`
- **Wave 2**: 4 tasks — T4 `unspecified-high`, T5 `visual-engineering`, T6 `visual-engineering`, T7 `unspecified-high`
- **Wave 3**: 2 tasks — T8 `quick`, T9 `unspecified-high`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Test Factories + 验证现有测试通过

  **What to do**:
  - 运行 `pnpm test`，确认现有所有测试通过（建立基线）
  - 创建 `tests/test-utils.ts`，包含共享测���工厂函数：
    - `createTestSession(overrides?)`: 创建带默认值的 `ChatSession` 对象
    - `createTestMessage(overrides?)`: 创建带默认值的 `ChatMessage` 对象
    - `createTestSessionWithMessages(messageCount, sessionOverrides?)`: 创建包含 N 条消息的完整 session
  - 在 `chatStorage.test.ts` 中选择 1-2 个现有测试，改用工厂函数验证可用性
  - 运行 `pnpm test` 确认修改后仍全部通过

  **Must NOT do**:
  - 不修改任何业务逻辑代码
  - 不大规模重构现有测试（仅改 1-2 个作为验证）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的测试工具函数创建，无复杂逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (first task)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `utils/chatStorage.test.ts:25-35` - 现有测试中手动创建 session 的模式，工厂函数应简化这种模式
  - `utils/chatStorage.search.test.ts:29-36` - 另一种手动创建 session + messages 的模式

  **API/Type References**:
  - `utils/types.ts:108-124` - `ChatMessage` 和 `ChatSession` 类型定义，工厂函数必须匹配这些类型

  **Test References**:
  - `utils/chatStorage.test.ts` - 现有测试结构（describe/it 组织、beforeEach 清理）
  - `vitest.config.ts` - 测试配置，确保新文件在 include 范围内

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 验证现有测试基线通过
    Tool: Bash
    Preconditions: 项目依赖已安装（node_modules 存在）
    Steps:
      1. 运行 `pnpm test --run` 
      2. 检查 exit code 为 0
      3. 记录通过的测试总数作为基线
    Expected Result: 所有现有测试通过，exit code 0
    Failure Indicators: 任何测试失败或 exit code 非 0
    Evidence: .sisyphus/evidence/task-1-baseline-tests.txt

  Scenario: 测试工厂函数可用性
    Tool: Bash
    Preconditions: test-utils.ts 已创建
    Steps:
      1. 运行 `pnpm test --run tests/test-utils`（如果有工厂函数测试）
      2. 运行 `pnpm test --run utils/chatStorage.test.ts`
      3. 确认修改后的测试仍然通过
    Expected Result: 所有测试通过，工厂函数被成功使用
    Failure Indicators: 类型错误或测试失败
    Evidence: .sisyphus/evidence/task-1-factory-tests.txt
  ```

  **Commit**: YES
  - Message: `test: add shared test factories for chat sessions`
  - Files: `tests/test-utils.ts`, `utils/chatStorage.test.ts`
  - Pre-commit: `pnpm test --run`

- [x] 2. 存储常量调整 — MAX_SESSIONS 提升到 50

  **What to do**:
  - **RED**: 在 `chatStorage.test.ts` 中修改常量验证测试：`expect(MAX_SESSIONS).toBe(50)`（现在是 10，会失败）
  - **RED**: 添加测试：创建 51 个 session，验证最旧的被删除、保留 50 个
  - **GREEN**: 修改 `chatStorage.ts` 中 `MAX_SESSIONS` 从 10 改为 50
  - **REFACTOR**: 确保现有 pruning 测试也通过（原有 `MAX_SESSIONS + 1` 的测试逻辑自动适配）

  **Must NOT do**:
  - 不修改 `MAX_MESSAGES_PER_SESSION` 或 `PRUNE_COUNT`
  - 不修改 pruning 逻辑本身

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 改一个常量 + 更新测试，极其简单
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `utils/chatStorage.ts:3` - `export const MAX_SESSIONS = 10;` — 需修改为 50
  - `utils/chatStorage.ts:75-78` - pruning 逻辑，不需修改但需理解

  **Test References**:
  - `utils/chatStorage.test.ts:39-62` - 现有 `MAX_SESSIONS` 超限测试，使用 `MAX_SESSIONS + 1` 循环
  - `utils/chatStorage.test.ts:253-254` - 常量验证测试 `expect(MAX_SESSIONS).toBe(10)` — 需改为 50

  **Acceptance Criteria**:

  - [ ] `MAX_SESSIONS` 值为 50
  - [ ] `pnpm test --run utils/chatStorage.test.ts` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MAX_SESSIONS 常量正确更新
    Tool: Bash
    Preconditions: chatStorage.ts 已修改
    Steps:
      1. 运行 `pnpm test --run utils/chatStorage.test.ts`
      2. 检查 "should have correct MAX_SESSIONS value" 测试通过
      3. 检查 "should auto-delete oldest session when MAX_SESSIONS is exceeded" 测试通过
    Expected Result: 所有 chatStorage 测试通过
    Failure Indicators: MAX_SESSIONS 相关测试失败
    Evidence: .sisyphus/evidence/task-2-max-sessions.txt

  Scenario: 创建 51 个会话后验证 pruning
    Tool: Bash
    Preconditions: 新增的 51-session pruning 测试存在
    Steps:
      1. 运行包含 51-session 测试的测试文件
      2. 验证结果：50 个 session 保留，最旧的被删除
    Expected Result: 测试通过，pruning 在 50 上限时正确触发
    Failure Indicators: session 数量不为 50 或删除了错误的 session
    Evidence: .sisyphus/evidence/task-2-pruning-51.txt
  ```

  **Commit**: YES
  - Message: `feat(storage): increase MAX_SESSIONS to 50`
  - Files: `utils/chatStorage.ts`, `utils/chatStorage.test.ts`
  - Pre-commit: `pnpm test --run`

- [x] 3. 会话标题工具函数 — deriveSessionTitle()

  **What to do**:
  - **RED**: 创建 `utils/sessionTitle.test.ts`，编写以下测试用例：
    - session 有用户消息 "Hello world, this is a very long message about testing" → 返回 "Hello world, this is a very l…" (≤30 字符 + 省略号)
    - session 无消息 → 返回 "新对话"
    - session 只有 assistant 消息 → 返回 "新对话"
    - 第一条用户消息含 emoji "🎉 Welcome to my awesome app" → 正确截断不破坏 emoji
    - 第一条用户消息恰好 30 字符 → 不加省略号
    - 第一条用户消息少于 30 字符 → 不加省略号
  - **GREEN**: 创建 `utils/sessionTitle.ts`，导出 `deriveSessionTitle(session: ChatSession): string`
    - 找到 session.messages 中第一条 `role === 'user'` 的消息
    - 使用 `Array.from(content)` 处理 Unicode，截取前 30 个字符
    - 超过 30 字符时追加 "…"
    - fallback: "新对话"
  - **REFACTOR**: 确保无不必要的依赖

  **Must NOT do**:
  - 不修改 `ChatSession` 类型定义（不加 title 字段）
  - 不调用 AI API 生成标题
  - 不修改任何现有代码

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯工具函数，逻辑简单
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1

  **References**:

  **API/Type References**:
  - `utils/types.ts:108-113` - `ChatMessage` 类型定义，需要根据 `role` 筛选
  - `utils/types.ts:118-124` - `ChatSession` 类型定义，函数参数类型

  **External References**:
  - Unicode 安全截断: `Array.from(str).slice(0, N).join('')` 可安全处理 emoji 和多字节字符

  **Acceptance Criteria**:

  - [ ] 测试文件 `utils/sessionTitle.test.ts` 存在
  - [ ] `pnpm test --run utils/sessionTitle.test.ts` → PASS (6+ tests)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 各种标题截断场景
    Tool: Bash
    Preconditions: sessionTitle.ts 和 sessionTitle.test.ts 已创建
    Steps:
      1. 运行 `pnpm test --run utils/sessionTitle.test.ts`
      2. 验证所有 6+ 测试用例通过
    Expected Result: 所有截断、fallback、emoji 相关测试通过
    Failure Indicators: 任何 assertion 失败，特别是 emoji 截断
    Evidence: .sisyphus/evidence/task-3-session-title.txt

  Scenario: 边界情况 — 空消息数组
    Tool: Bash
    Preconditions: 测试包含空 messages 数组的 case
    Steps:
      1. 确认 deriveSessionTitle({ messages: [], ... }) 返回 "新对话"
    Expected Result: 返回 fallback 标题 "新对话"
    Failure Indicators: 抛出异常或返回 undefined
    Evidence: .sisyphus/evidence/task-3-empty-session.txt
  ```

  **Commit**: YES
  - Message: `feat(storage): add deriveSessionTitle utility`
  - Files: `utils/sessionTitle.ts`, `utils/sessionTitle.test.ts`
  - Pre-commit: `pnpm test --run`

- [x] 4. 自动清理过期会话 — cleanupOldSessions()

  **What to do**:
  - **RED**: 在 `utils/chatStorage.test.ts` 中添加 `describe('cleanupOldSessions')` 测试组：
    - 创建 5 个 session（时间跨 15 天），清理后只保留 ≤10 天的
    - 活跃会话即使超过 10 天也不被清理
    - 空 session 列表调用不报错
    - 所有 session 都超过 10 天但有一个是活跃的 → 只保留活跃的
    - 所有 session 都在 10 天内 → 不删除任何
  - **GREEN**: 在 `chatStorage.ts` 中新增 `cleanupOldSessions(maxAgeDays: number): Promise<number>`
    - 获取所有 sessions 和 activeSessionId
    - 过滤出超过 `maxAgeDays` 天且不是 activeSession 的
    - 删除它们，保存更新后的 sessions 到 storage
    - 返回被删除的 session 数量
  - **REFACTOR**: 确保函数使用 `Date.now()` 可测试模式（通过 vi.spyOn 或参数注入）

  **Must NOT do**:
  - 不使用 `chrome.alarms` API
  - 不修改现有的 `createSession` pruning 逻辑（那是数量 pruning，这是时间 pruning，两者独立）
  - 不在此 task 中调用此函数（wiring 在 Task 8）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要仔细处理 edge cases 和时间相关逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `utils/chatStorage.ts:12-21` - `getSessionsFromStorage()` / `saveSessionsToStorage()` — 清理函数应使用相同模式
  - `utils/chatStorage.ts:23-36` - `getActiveSessionIdFromStorage()` — 用于排除活跃会话
  - `utils/chatStorage.ts:75-78` - 数量 pruning 逻辑（参考但不修改）

  **Test References**:
  - `utils/chatStorage.test.ts:20-22` - beforeEach 清理模式（`fakeBrowser.storage.local.clear()`）
  - `utils/chatStorage.test.ts:39-62` - 现有 pruning 测试结构可参考

  **Acceptance Criteria**:

  - [ ] `cleanupOldSessions` 函数已导出
  - [ ] `pnpm test --run utils/chatStorage.test.ts` → PASS，包括新增的 5 个 cleanup 测试

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 清理过期会话但保留活跃会话
    Tool: Bash
    Preconditions: 测试文件包含 cleanupOldSessions describe block
    Steps:
      1. 运行 `pnpm test --run utils/chatStorage.test.ts`
      2. 筛选 cleanupOldSessions 相关测试结果
      3. 验证：5 个清理相关测试全部通过
    Expected Result: 过期 session 被删除，活跃 session 保留，返回正确的删除数
    Failure Indicators: 活跃 session 被误删，或非过期 session 被删除
    Evidence: .sisyphus/evidence/task-4-cleanup.txt

  Scenario: 所有会话都过期但有活跃会话
    Tool: Bash
    Preconditions: 测试包含 all-expired-except-active case
    Steps:
      1. 创建 5 个超过 10 天的 session，其中 1 个为活跃
      2. 运行 cleanupOldSessions(10)
      3. 验证只保留活跃的那个
    Expected Result: 返回 4（删除 4 个），剩余 1 个（活跃的）
    Failure Indicators: 活跃 session 被删除，或删除数不正确
    Evidence: .sisyphus/evidence/task-4-all-expired.txt
  ```

  **Commit**: YES
  - Message: `feat(storage): add auto-cleanup for sessions older than 10 days`
  - Files: `utils/chatStorage.ts`, `utils/chatStorage.test.ts`
  - Pre-commit: `pnpm test --run`

- [x] 5. SessionList 组件 — 会话列表展示

  **What to do**:
  - **RED**: 创建 `entrypoints/sidepanel/components/SessionList.test.tsx`：
    - 渲染 3 个 session → 展示每个 session 的标题、日期、消息数
    - 空列表 → 展示"暂无历史会话"
    - 点击某个 session item → 调用 onSelect(sessionId) 回调
    - 当前活跃 session 有视觉区分（不同背景色或标记）
  - **GREEN**: 创建 `entrypoints/sidepanel/components/SessionList.tsx`：
    - Props: `{ sessions: ChatSession[], activeSessionId: string, onSelect: (sessionId: string) => void }`
    - 每个 session item 展示：
      - 标题：调用 `deriveSessionTitle(session)`
      - 日期：`session.createdAt` 格式化为 "MM/DD HH:mm"
      - 消息数：`session.messages.length` 条消息
    - 活跃 session 用浅蓝背景 + 蓝色左边框标识
    - 列表按 `createdAt` 降序排列（最新在上）
    - 空状态显示灰色提示文字
  - **REFACTOR**: 提取日期格式化函数（或复用 SearchBar 中的 `formatDate`）

  **Must NOT do**:
  - 不做日期分组（Today/Yesterday/Earlier）
  - 不做��键菜单、删除按钮
  - 不做虚拟滚动
  - 不在此组件中调用 `chatStorage` API（纯展示组件，数据由父组件传入）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React UI 组件，需要 Tailwind 样式
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/SearchBar.tsx:108-129` - 搜索结果列表的渲染模式（border, rounded, hover 效果），SessionList item 样式应与之一致
  - `entrypoints/sidepanel/components/SearchBar.tsx:65-74` - `formatDate()` 函数可复用
  - `entrypoints/sidepanel/components/ChatMessage.tsx:8-22` - 组件 props 和结构参考

  **API/Type References**:
  - `utils/types.ts:118-124` - `ChatSession` 类型
  - `utils/sessionTitle.ts` (Task 3 产出) - `deriveSessionTitle()` 函数

  **Test References**:
  - `entrypoints/sidepanel/components/ChatMessage.test.tsx` - 现有组件测试模式（createElement + expect）
  - `entrypoints/sidepanel/components/ChatInput.test.tsx` - 更完整的组件测试模式（render + screen + userEvent）

  **Acceptance Criteria**:

  - [ ] `SessionList.tsx` 和 `SessionList.test.tsx` 存在
  - [ ] `pnpm test --run entrypoints/sidepanel/components/SessionList.test.tsx` → PASS (4+ tests)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 正常渲染会话列表
    Tool: Bash
    Preconditions: SessionList 组件和测试文件已创建
    Steps:
      1. 运行 `pnpm test --run entrypoints/sidepanel/components/SessionList.test.tsx`
      2. 验证渲染 3 个 session 的测试通过
      3. 验证每个 item 显示了标题、日期、消息数
    Expected Result: 所有渲染测试通过
    Failure Indicators: session item 未渲染或缺少必要信息
    Evidence: .sisyphus/evidence/task-5-session-list.txt

  Scenario: 空列表状态
    Tool: Bash
    Preconditions: 测试包含 empty sessions 数组 case
    Steps:
      1. 传入空 sessions 数组
      2. 验证显示"暂无历史会话"文字
    Expected Result: 显示空状态提示
    Failure Indicators: 组件崩溃或不显示提示
    Evidence: .sisyphus/evidence/task-5-empty-list.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add SessionList component`
  - Files: `entrypoints/sidepanel/components/SessionList.tsx`, `entrypoints/sidepanel/components/SessionList.test.tsx`
  - Pre-commit: `pnpm test --run`

- [x] 6. SearchBar 改造 — 默认展示会话列表 + 搜索双模式

  **What to do**:
  - **RED**: 修改 `entrypoints/sidepanel/components/ChatPanel.test.tsx` 或新建 SearchBar 集成测试：
    - 搜索面板打开、搜索框为空时 → 显示 SessionList 组件
    - 搜索框输入 "hello" → 300ms 后切换为搜索结果
    - 清空搜索框 → 恢复显示 SessionList
    - 点击 session item → 调用 onSelectSession(sessionId)
    - 点击搜索结果 → 调用 onSelectSession(result.sessionId)
  - **GREEN**: 修改 `SearchBar.tsx`：
    - 新增 props: `sessions: ChatSession[]`, `activeSessionId: string`, `onSelectSession: (sessionId: string) => void`
    - 搜索框为空时：渲染 `<SessionList>` 组件
    - 搜索框有内容时：保持现有搜索结果渲染逻辑
    - 搜索结果每个 item 新增 `onClick={() => onSelectSession(result.sessionId)}`
    - 点击 session/result 后会触发关闭（由 ChatPanel 处理）
  - **REFACTOR**: 确保 SessionList 和搜索结果列表的样式统一

  **Must NOT do**:
  - 不修改 `searchMessages()` 函数签名或返回值
  - 不做搜索结果高亮跳转到具体消息
  - 不修改 debounce 逻辑（仅影响搜索，不影响 session list 展示）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React UI 组件改造，需要处理条件渲染和样式
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Tasks 7, 9
  - **Blocked By**: Tasks 1, 3, 5

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/SearchBar.tsx:1-138` — **完整文件**，需要在此基础上修改。关键改动点：
    - line 4-8: Props interface 需新增 sessions, activeSessionId, onSelectSession
    - line 83-138: return JSX 需在 `!query.trim()` 分支中渲染 SessionList
    - line 108-129: 搜索结果渲染需新增 onClick
  - `entrypoints/sidepanel/components/ChatPanel.tsx:300-307` — 🔍 按钮和 SearchBar 的调用方式
  - `entrypoints/sidepanel/components/ChatPanel.tsx:331-339` — SearchBar 的 props 传递

  **API/Type References**:
  - `utils/types.ts:164-169` - `SearchResult` 类型（有 `sessionId` 字段可用于跳转）

  **WHY Each Reference Matters**:
  - SearchBar.tsx 是本 task 的核心修改文件，需要理解现有结构再改造
  - ChatPanel.tsx 的调用处也需要同步修改 props 传递

  **Acceptance Criteria**:

  - [ ] SearchBar 支持 sessions 和 onSelectSession props
  - [ ] 搜索框为空时显示 SessionList
  - [ ] 搜索框有内容时显示搜索结果（保持现有行为）
  - [ ] 搜索结果可点击
  - [ ] `pnpm test --run` 相关测试全通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 默认展示会话列表
    Tool: Bash
    Preconditions: SearchBar 已改造
    Steps:
      1. 运行相关组件测试
      2. 验证：打开搜索面板（query 为空）→ SessionList 被渲染
    Expected Result: SessionList 组件在默认状态下可见
    Failure Indicators: 仍然显示"输入关键词搜索历史消息"而非 SessionList
    Evidence: .sisyphus/evidence/task-6-default-sessions.txt

  Scenario: 搜索模式切换
    Tool: Bash
    Preconditions: 测试包含 typing + clearing 场景
    Steps:
      1. 初始状态：显示 SessionList
      2. 输入 "hello" → 等待 300ms → 显示搜索结果
      3. 清空输入 → 恢复 SessionList
    Expected Result: 两种模式正确切换，无闪烁
    Failure Indicators: 模式切换失败或搜索不触发
    Evidence: .sisyphus/evidence/task-6-mode-switch.txt

  Scenario: 搜索结果可点击
    Tool: Bash
    Preconditions: 搜索结果已有 onClick
    Steps:
      1. 输入搜索关键词
      2. 点击搜索结果 item
      3. 验证 onSelectSession 被调用，参数为 result.sessionId
    Expected Result: onSelectSession 回调被正确触发
    Failure Indicators: 点击无反应或 sessionId 传递错误
    Evidence: .sisyphus/evidence/task-6-click-result.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): enhance SearchBar with session list default view`
  - Files: `entrypoints/sidepanel/components/SearchBar.tsx`, `entrypoints/sidepanel/components/ChatPanel.tsx` (props 调整)
  - Pre-commit: `pnpm test --run`

- [x] 7. ChatPanel 会话切换 — handleSwitchSession

  **What to do**:
  - **RED**: 在 `ChatPanel.test.tsx` 中添加会话切换测试：
    - 调用 handleSwitchSession(sessionId) → `setActiveSession()` 被调用 + messages 状态更新 + port 重连
    - 切换会话后搜索面板关闭
    - 切换到的会话消息正确加载到 UI
    - 正在 streaming 时切换 → stream abort → 然后切换成功
  - **GREEN**: 在 `ChatPanel.tsx` 中新增：
    - `handleSwitchSession(sessionId: string)` 函数：
      1. 调用 `chatStorage.setActiveSession(sessionId)`
      2. 从 storage 获取该 session 的 messages（`chatStorage.getActiveSession()`）
      3. 更新 `setMessages(session.messages)`, `setSessionId(sessionId)`
      4. 断开旧 port，创建新 port + listener（复制 `handleNewSession` lines 242-248 的模式）
      5. 关闭搜索面板 `setShowSearch(false)`, `setSearchResults([])`
      6. 重置 streaming 状态 `setIsStreaming(false)`, `setStreamingContent('')`
    - 修改 SearchBar 调用处传入 `onSelectSession={handleSwitchSession}`
    - 修改 SearchBar 调用处传入 `sessions` 和 `activeSessionId`（需添加 sessions state 或在 showSearch 时加载）
  - **REFACTOR**: 提取 port 重连逻辑为 `reconnectPort()` 私有函数，复用在 `handleNewSession` 和 `handleSwitchSession` 中

  **Must NOT do**:
  - 不修改 `background.ts` 的消息处理逻辑
  - 不修改 `setActiveSession()` 函数本身
  - 不做会话切换动画

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 port 生命周期管理和状态同步，需要谨慎处理
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 1, 6

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/ChatPanel.tsx:237-249` — **`handleNewSession()` 是核心参考**。handleSwitchSession 需要同样的 port 断开 + 重建模式，但不创建新 session，而是加载已有 session
  - `entrypoints/sidepanel/components/ChatPanel.tsx:68-76` — `initSession()` 的 session 加载模式，可参考 messages 加载方式
  - `entrypoints/sidepanel/components/ChatPanel.tsx:29-66` — `createPortListener()` 回调，新 port 需要同样的 listener

  **API/Type References**:
  - `utils/chatStorage.ts:135-137` - `setActiveSession(sessionId)` 只更新 ID
  - `utils/chatStorage.ts:43-57` - `getActiveSession()` 获取完整 session（含 messages）
  - `utils/chatStorage.ts:38-41` - `getSessions()` 获取所有 session 列表

  **WHY Each Reference Matters**:
  - handleNewSession 是唯一现有的 session 切换参考，port 重连模式必须一致否则会有竞态
  - getActiveSession 在 setActiveSession 之后调用可获取切换后的 session 数据

  **Acceptance Criteria**:

  - [ ] `handleSwitchSession` 函数存在
  - [ ] port 正确重连（旧 port 断开 + 新 port 创建）
  - [ ] 搜索面板在切换后关闭
  - [ ] `pnpm test --run entrypoints/sidepanel/components/ChatPanel.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 会话切换后消息正确加载
    Tool: Bash
    Preconditions: ChatPanel 测试包含 switchSession mock 场景
    Steps:
      1. Mock getActiveSession 返回包含 3 条消息的 session
      2. 调用 handleSwitchSession('session-2')
      3. 验证 setActiveSession 被调用
      4. 验证 messages 状态更新为 session-2 的消息
      5. 验证 port 被重建
    Expected Result: 状态正确切换，UI 反映新 session 的消息
    Failure Indicators: messages 为空，port 未重连，或 sessionId 未更新
    Evidence: .sisyphus/evidence/task-7-switch-session.txt

  Scenario: streaming 中切换会话
    Tool: Bash
    Preconditions: 测试模拟了 isStreaming=true 的场景
    Steps:
      1. 设置 isStreaming=true
      2. 调用 handleSwitchSession
      3. 验证 streaming 被重置（isStreaming=false, streamingContent=''）
      4. 验证 port 被断开重建
    Expected Result: streaming 被正确中止，切换正常完成
    Failure Indicators: 旧 stream 数据泄漏到新 session
    Evidence: .sisyphus/evidence/task-7-mid-stream-switch.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add session switching to ChatPanel`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`, `entrypoints/sidepanel/components/ChatPanel.test.tsx`
  - Pre-commit: `pnpm test --run`

- [x] 8. 接入清理逻辑 — initSession 中调用 cleanupOldSessions

  **What to do**:
  - 在 `ChatPanel.tsx` 的 `initSession()` 函数（`useEffect` 内，line 69）中，在获取 activeSession 之前调用 `chatStorage.cleanupOldSessions(10)`
  - 确保清理是 await 的，在清理完成后再获取 activeSession
  - 验证全流程：面板打开 → 清理过期会话 → 加载活跃会话 → 显示消息

  **Must NOT do**:
  - 不添加清理的 UI 提示（静默执行）
  - 不添加 chrome.alarms 定时清理
  - 不修改清理函数本身（已在 Task 4 完成）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 仅添加一行函数调用 + 简单测试
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 9
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `entrypoints/sidepanel/components/ChatPanel.tsx:68-76` — initSession 函数，需在 line 70 之前插入 cleanup 调用
  - `utils/chatStorage.ts` — `cleanupOldSessions()` 函数（Task 4 产出）

  **Acceptance Criteria**:

  - [ ] `initSession()` 中调用了 `cleanupOldSessions(10)`
  - [ ] `pnpm test --run` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 面板打开时执行清理
    Tool: Bash
    Preconditions: ChatPanel 测试可以 mock cleanupOldSessions
    Steps:
      1. Mock cleanupOldSessions
      2. 渲染 ChatPanel
      3. 验证 cleanupOldSessions(10) 被调用
    Expected Result: cleanupOldSessions 在面板初始化时被调用一次
    Failure Indicators: 函数未被调用或参数错误
    Evidence: .sisyphus/evidence/task-8-cleanup-wiring.txt
  ```

  **Commit**: YES
  - Message: `feat: wire session cleanup into panel initialization`
  - Files: `entrypoints/sidepanel/components/ChatPanel.tsx`, `entrypoints/sidepanel/components/ChatPanel.test.tsx`
  - Pre-commit: `pnpm test --run`

- [x] 9. 全量集成测试验证

  **What to do**:
  - 运行 `pnpm test --run` 确认所有测试通过（0 failures）
  - 运行 `pnpm test:coverage` 确认覆盖率不低于 Task 1 建立的基线
  - 检查各 task 的 evidence 文件是否全部存在
  - 检查是否有未预期的文件修改（`git diff --stat` 对比）
  - 修复任何集成问题

  **Must NOT do**:
  - 不引入新功能
  - 不修改已通过 review 的代码（除非修复集成问题）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要综合验证多个模块的集成
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (last implementation task)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 6, 7, 8

  **References**:

  **Pattern References**:
  - 所有前述 task 产出的文件
  - `package.json` — test scripts

  **Acceptance Criteria**:

  - [ ] `pnpm test --run` → 0 failures
  - [ ] `pnpm test:coverage` → 覆盖率 ≥ 基线
  - [ ] 所有 evidence 文件存在

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 全量测试通过
    Tool: Bash
    Preconditions: 所有 task (1-8) 已完成
    Steps:
      1. 运行 `pnpm test --run`
      2. 检查 exit code 为 0
      3. 记录通过的测试总数，对比 Task 1 基线
    Expected Result: 0 failures, 测试总数 > 基线
    Failure Indicators: 任何测试失败
    Evidence: .sisyphus/evidence/task-9-integration.txt

  Scenario: 覆盖率检查
    Tool: Bash
    Preconditions: 所有 task 已完成
    Steps:
      1. 运行 `pnpm test:coverage --run`
      2. 对比覆盖率与 Task 1 基线
    Expected Result: 覆盖率 ≥ 基线
    Failure Indicators: 覆盖率下降
    Evidence: .sisyphus/evidence/task-9-coverage.txt
  ```

  **Commit**: YES
  - Message: `test: verify full integration of session history feature`
  - Files: 可能修复的集成问题文件
  - Pre-commit: `pnpm test --run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
>
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (session list + search + switch working together). Test edge cases: empty sessions, rapid switching, mid-stream switch. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Tasks | Message | Pre-commit |
|--------|-------|---------|------------|
| C1 | T1 | `test: add shared test factories for chat sessions` | `pnpm test` |
| C2 | T2 | `feat(storage): increase MAX_SESSIONS to 50` | `pnpm test` |
| C3 | T3 | `feat(storage): add deriveSessionTitle utility` | `pnpm test` |
| C4 | T4 | `feat(storage): add auto-cleanup for sessions older than 10 days` | `pnpm test` |
| C5 | T5 | `feat(ui): add SessionList component` | `pnpm test` |
| C6 | T6 | `feat(ui): enhance SearchBar with session list default view` | `pnpm test` |
| C7 | T7 | `feat(ui): add session switching to ChatPanel` | `pnpm test` |
| C8 | T8 | `feat: wire session cleanup into panel initialization` | `pnpm test` |
| C9 | T9 | `test: verify full integration of session history feature` | `pnpm test` |

---

## Success Criteria

### Verification Commands
```bash
pnpm test                    # Expected: ALL tests pass, 0 failures
pnpm test:coverage           # Expected: coverage >= current baseline
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] 会话列表在搜索面板打开时立即显示
- [ ] 搜索结果可点击跳转到历史会话
- [ ] 切换后可继续发送消息并接收流式响应
- [ ] 超 10 天的非活跃会话被自动清理
- [ ] 活跃会话永不被清理
