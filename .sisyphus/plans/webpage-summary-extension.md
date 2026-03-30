# AI 网页摘要 Chrome 插件 (Webpage Summary Extension)

## TL;DR

> **Quick Summary**: 开发一个 Chrome 浏览器插件（Manifest V3），用户点击插件图标后在 Side Panel 中对当前网页内容进行 AI 摘要，结构化展示摘要、重点、观点和最佳实践四个区块。
> 
> **Deliverables**:
> - Chrome 扩展（可直接加载的 dist 产物）
> - Side Panel UI（React + Tailwind，结构化四区块展示）
> - 内容提取模块（Readability.js 文章正文提取）
> - AI Provider 抽象层 + OpenAI 实现（Zod 结构化输出）
> - 设置页面（API Key 管理 + Base URL 配置）
> - 完整的单元测试覆盖（Vitest TDD）
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 (脚手架) → Task 2 (类型定义) → Task 4 (AI Provider) → Task 7 (消息传递) → Task 9 (集成联调) → F1-F4 (验证)

---

## Context

### Original Request
用户希望开发一个基于浏览器的插件，能够对当前页面的网页内容做 AI 总结，提取文章中的重点内容，总结文章观点和最佳实践。

### Interview Summary
**Key Discussions**:
- **目标浏览器**: 仅 Chrome（Manifest V3），后续可扩展 Edge
- **AI 模型**: 用户自带 API Key，可扩展 Provider 架构，先实现 OpenAI（GPT-4o-mini）
- **UI 形式**: Side Panel（Chrome 114+ Side Panel API），不遮挡原页面
- **输出格式**: 结构化四区块（📋摘要 / 🔑重点 / 💡观点 / ✅最佳实践）
- **输出语言**: 跟随原文语言
- **技术栈**: TypeScript + React 18 + Vite + Tailwind CSS
- **测试**: TDD with Vitest
- **MVP 范围**: 仅普通网页，无历史/导出功能

**Research Findings**:
- WXT 是现代 Chrome 扩展开发的事实标准框架（9.5k+ stars），提供文件系统路由、自动 manifest 生成、内置 Vitest 支持
- Service Worker 在空闲约 30s 后会终止，需要 keep-alive 策略
- OpenAI 支持 `zodResponseFormat` 实现类型安全的结构化 JSON 输出
- `chrome.storage.sync` 没有内置加密，API Key 应存储在 `chrome.storage.local`
- Side Panel 不能自动打开，需要用户手势（点击图标）触发
- Readability.js 在 Content Script 中可正常工作，需先 clone document

### Metis Review
**Identified Gaps** (addressed):
- **WXT vs 手动 Vite**: 决定使用 WXT（更成熟、内置测试支持、自动 manifest）
- **Storage 安全**: 修正为 `chrome.storage.local`（非 sync），MVP 不加密
- **Service Worker 终止**: 计划实现 keep-alive 策略
- **tiktoken 体积问题**: 使用字符估算（~4 字符/token）替代 tiktoken
- **非文章页面处理**: Readability 返回 null 时显示友好错误提示
- **空 Best Practices**: 区块隐藏 + "该文章未包含最佳实践内容" 提示
- **API 响应模式**: MVP 使用非流式 + 加载动画（结构化输出更可靠）
- **触发方式**: 用户点击图标 → Side Panel 打开 → 点击"总结"按钮触发
- **OpenAI Base URL**: 选项页增加 Base URL 字段（低成本高价值）

---

## Work Objectives

### Core Objective
构建一个 Chrome 扩展插件，用户在任意网页点击插件图标打开侧边栏，点击"总结"按钮后，提取页面正文内容并通过 OpenAI API 生成结构化摘要，在侧边栏内以四个清晰区块展示结果。

### Concrete Deliverables
- `dist/` — 可直接在 Chrome 中以开发者模式加载的扩展包
- Side Panel React 应用 — 总结展示 + 触发按钮 + 加载状态 + 错误处理
- Options Page — API Key 输入/保存/测试连接 + Base URL 配置
- Content Script — Readability.js 页面正文提取
- Service Worker — AI API 调用、消息路由、keep-alive
- AI Provider 模块 — 可扩展接口 + OpenAI 实现

### Definition of Done
- [ ] `pnpm build` 成功生成 dist 产物
- [ ] `pnpm test` 全部测试通过
- [ ] 在 Chrome 中加载扩展后，点击图标打开 Side Panel
- [ ] 在文章页面点击"总结"按钮，5-15s 内展示结构化摘要
- [ ] 在非文章页面触发时显示友好错误提示
- [ ] Options 页面可以保存和测试 API Key

### Must Have
- Chrome Manifest V3 扩展基础结构
- Side Panel UI（四区块结构化展示）
- Content Script 内容提取（Readability.js）
- OpenAI API 集成（结构化输出 + Zod schema）
- Options 页面（API Key + Base URL 管理）
- 加载状态和错误处理
- Service Worker keep-alive 策略
- 完整单元测试（Vitest TDD）

### Must NOT Have (Guardrails)
- ❌ 历史记录/书签功能
- ❌ 导出功能（PDF/Markdown/复制以外）
- ❌ 多 AI Provider 实现（只实现 OpenAI，接口可扩展）
- ❌ 自定义 Prompt 或 Prompt 编辑 UI
- ❌ 页面加载时自动总结
- ❌ 暗色模式/主题切换（跟随系统）
- ❌ 插件 UI 国际化（仅输出跟随原文语言）
- ❌ Token 用量追踪/费用估算
- ❌ 缓存/记忆化摘要
- ❌ 右键菜单集成（"总结选中文字"）
- ❌ 键盘快捷键
- ❌ 通知系统
- ❌ 分析/遥测
- ❌ tiktoken（使用字符估算）
- ❌ Shadow DOM（Side Panel 是独立页面）
- ❌ 自定义错误类层次结构（使用简单 `{ code, message }` 对象）
- ❌ Provider 注册中心/工厂模式/动态加载（仅 interface + 1 class）
- ❌ React 组件单元测试（MVP 仅测业务逻辑）
- ❌ E2E 测试

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO (全新项目，由 Task 1 搭建)
- **Automated tests**: YES (TDD)
- **Framework**: Vitest (WXT 内置 WxtVitest 插件 + @webext-core/fake-browser)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Extension Build**: Use Bash (`pnpm build`) — verify exit code 0, dist/ directory exists
- **Unit Tests**: Use Bash (`pnpm test`) — verify all tests pass
- **Side Panel UI**: Use Bash (build verification + test assertions on component output)
- **API Integration**: Use Bash (mock fetch in tests, verify request/response format)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — 基础设施 + 类型定义):
├── Task 1: WXT 项目脚手架 + 工具链配置 [quick]
├── Task 2: 类型定义 + Zod Schema [quick]
└── Task 3: 存储工具模块 [quick]

Wave 2 (After Wave 1 — 核心模块, 最大并行):
├── Task 4: AI Provider 抽象 + OpenAI 实现 (depends: 2) [deep]
├── Task 5: Content Script 内容提取 (depends: 1) [unspecified-high]
├── Task 6: Options 页面 UI (depends: 1, 3) [visual-engineering]
└── Task 7: 消息传递层 + Service Worker (depends: 2, 3) [unspecified-high]

Wave 3 (After Wave 2 — UI + 集成):
├── Task 8: Side Panel UI (depends: 2, 7) [visual-engineering]
├── Task 9: 端到端集成联调 (depends: 4, 5, 7, 8) [deep]
└── Task 10: 错误处理 + 边缘情况 (depends: 9) [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 2 → Task 4 → Task 7 → Task 8 → Task 9 → Task 10 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2,3,4,5,6,7 | 1 |
| 2 | 1 | 4,7,8 | 1 |
| 3 | 1 | 6,7 | 1 |
| 4 | 2 | 9 | 2 |
| 5 | 1 | 9 | 2 |
| 6 | 1,3 | — | 2 |
| 7 | 2,3 | 8,9 | 2 |
| 8 | 2,7 | 9 | 3 |
| 9 | 4,5,7,8 | 10 | 3 |
| 10 | 9 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: **3 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **4 tasks** — T4 → `deep`, T5 → `unspecified-high`, T6 → `visual-engineering`, T7 → `unspecified-high`
- **Wave 3**: **3 tasks** — T8 → `visual-engineering`, T9 → `deep`, T10 → `unspecified-high`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. WXT 项目脚手架 + 工具链配置

  **What to do**:
  - 使用 WXT 初始化 Chrome 扩展项目：`pnpm dlx wxt@latest init webpage-summary --template react`（如果 init 命令不可用，手动创建 WXT 项目结构）
  - 将生成的文件移到项目根目录（当前工作目录 `/Users/songjiayin/Leibaoxin/plugin/webpage_summary`）
  - 配置 `wxt.config.ts`：设置 manifest V3、Side Panel 权限、Storage 权限、host_permissions（`https://api.openai.com/*`）
  - 配置 TypeScript strict mode（`tsconfig.json`）
  - 配置 Tailwind CSS（安装 + `tailwind.config.ts` + CSS 入口文件）
  - 配置 Vitest（安装 `vitest`、`@webext-core/fake-browser`，配置 `vitest.config.ts` 使用 WXT 的 `WxtVitest` 插件）
  - 创建基础入口文件占位：`entrypoints/background.ts`、`entrypoints/content.ts`、`entrypoints/sidepanel/`、`entrypoints/options/`
  - 在 `package.json` 中添加 scripts：`dev`、`build`、`test`、`test:coverage`
  - 安装核心依赖：`react`、`react-dom`、`@mozilla/readability`、`zod`
  - 验证 `pnpm build` 成功，`pnpm test` 可运行

  **Must NOT do**:
  - 不要实现任何业务逻辑，仅搭建脚手架
  - 不要安装 `openai` npm 包（使用 raw fetch）
  - 不要安装 `tiktoken`
  - 不要添加 Shadow DOM 配置

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 项目脚手架是标准化操作，按模板配置即可，无复杂逻辑
  - **Skills**: []
    - 无特殊技能需要，WXT 文档在 https://wxt.dev 可查阅
  - **Skills Evaluated but Omitted**:
    - `playwright`: 本任务无 UI 需要测试

  **Parallelization**:
  - **Can Run In Parallel**: NO (必须第一个完成)
  - **Parallel Group**: Wave 1 — Sequential (first)
  - **Blocks**: Tasks 2, 3, 4, 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - 无（全新项目）

  **API/Type References**:
  - WXT 配置文档：https://wxt.dev/guide/configuration.html — wxt.config.ts 配置项
  - Chrome Side Panel API：https://developer.chrome.com/docs/extensions/reference/api/sidePanel — manifest 权限声明方式

  **External References**:
  - WXT 官方文档：https://wxt.dev — 项目结构、文件系统路由约定（`entrypoints/` 目录结构）
  - WXT React 模板：https://wxt.dev/guide/react.html — React 集成配置
  - WXT Testing 文档：https://wxt.dev/guide/testing.html — Vitest + WxtVitest + fakeBrowser 配置
  - Tailwind CSS Vite 集成：https://tailwindcss.com/docs/installation/using-vite

  **WHY Each Reference Matters**:
  - WXT 文档是配置入口文件和 manifest 的唯一权威来源，文件路径约定（`entrypoints/`）必须严格遵循
  - Side Panel API 文档确认 manifest 中需要 `"side_panel"` 权限和配置
  - Testing 文档确认 `WxtVitest` 插件的正确配置方式

  **Acceptance Criteria**:

  - [ ] `pnpm build` 退出码 0，`dist/` 或 `.output/` 目录存在
  - [ ] `pnpm test` 可运行（即使 0 个测试）
  - [ ] `wxt.config.ts` 包含 manifest V3 配置
  - [ ] `tsconfig.json` 启用 strict mode
  - [ ] Tailwind CSS 配置文件存在
  - [ ] 基础入口文件占位存在：background、content、sidepanel、options

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build succeeds with empty entrypoints
    Tool: Bash
    Preconditions: All dependencies installed (pnpm install completed)
    Steps:
      1. Run `pnpm build`
      2. Check exit code is 0
      3. Verify output directory exists: `ls .output/` or `ls dist/`
      4. Verify manifest.json exists in output: contains `"manifest_version": 3`
    Expected Result: Build exits 0, output directory contains manifest.json with MV3
    Failure Indicators: Non-zero exit code, missing output directory, manifest_version != 3
    Evidence: .sisyphus/evidence/task-1-build-success.txt

  Scenario: Vitest configuration works
    Tool: Bash
    Preconditions: Project scaffolded with Vitest configured
    Steps:
      1. Run `pnpm test --run`
      2. Verify exit code is 0 (no tests is OK, but runner must work)
      3. Check vitest.config.ts imports WxtVitest plugin
    Expected Result: Vitest runs successfully, reports 0 tests or passes
    Failure Indicators: Vitest crashes, config error, missing WxtVitest plugin
    Evidence: .sisyphus/evidence/task-1-vitest-works.txt

  Scenario: TypeScript strict mode rejects bad code
    Tool: Bash
    Preconditions: tsconfig.json with strict: true
    Steps:
      1. Run `pnpm exec tsc --noEmit`
      2. Verify no type errors in scaffolded code
    Expected Result: TypeScript compilation succeeds with strict mode
    Failure Indicators: Type errors in scaffolded files
    Evidence: .sisyphus/evidence/task-1-typescript-strict.txt
  ```

  **Commit**: YES
  - Message: `feat: scaffold Chrome extension with WXT + React + TS + Tailwind + Vitest`
  - Files: package.json, wxt.config.ts, tsconfig.json, tailwind.config.ts, vitest.config.ts, entrypoints/*, public/*
  - Pre-commit: `pnpm build && pnpm test --run`

- [x] 2. 类型定义 + Zod Schema

  **What to do**:
  - **RED**: 先写测试文件 `utils/schemas.test.ts`，测试 Zod schema 解析有效/无效数据
  - **GREEN**: 创建 `utils/types.ts` — 定义核心 TypeScript 类型：
    - `SummaryResult` — `{ summary: string; keyPoints: string[]; viewpoints: { perspective: string; stance: string }[]; bestPractices: string[] }`
    - `ExtractedContent` — `{ title: string; content: string; url: string; lang?: string }`
    - `AIProvider` 接口 — `{ summarize(content: ExtractedContent): Promise<SummaryResult> }`
    - `ExtensionSettings` — `{ apiKey: string; baseUrl: string; model: string }`
    - `MessageType` 枚举 — `EXTRACT_CONTENT`、`SUMMARIZE`、`GET_SETTINGS` 等
  - 创建 `utils/schemas.ts` — 用 Zod 定义 `SummaryResultSchema`，用于 OpenAI 的 `response_format`
  - **REFACTOR**: 确保类型和 schema 一致，`z.infer<typeof SummaryResultSchema>` 应与 `SummaryResult` 类型一致
  - 导出所有类型供其他模块使用

  **Must NOT do**:
  - 不要定义 Provider 注册/工厂相关类型
  - 不要定义历史记录/导出相关类型
  - 不要创建自定义 Error 类（用 `{ code: string; message: string }` 即可）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯类型定义和 schema 创建，无复杂逻辑，文件少
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - 无特殊技能需要

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 3 并行)
  - **Parallel Group**: Wave 1 (with Task 3)
  - **Blocks**: Tasks 4, 7, 8
  - **Blocked By**: Task 1

  **References**:

  **API/Type References**:
  - OpenAI Structured Outputs 文档：https://platform.openai.com/docs/guides/structured-outputs — `response_format` 和 Zod 集成
  - Zod 官方文档：https://zod.dev — schema 定义语法

  **External References**:
  - `zodResponseFormat` 用法：https://platform.openai.com/docs/guides/structured-outputs — 展示如何将 Zod schema 传给 OpenAI API

  **WHY Each Reference Matters**:
  - OpenAI 文档确认 `response_format: json_schema` 支持哪些 Zod 类型（某些复杂类型不支持）
  - Zod 文档确保 schema 语法正确，且 `z.infer` 可以正确推导 TypeScript 类型

  **Acceptance Criteria**:

  - [ ] 测试文件 `utils/schemas.test.ts` 存在且测试通过
  - [ ] `SummaryResultSchema` 能解析有效数据并返回类型安全的对象
  - [ ] `SummaryResultSchema` 对无效数据抛出 ZodError
  - [ ] `z.infer<typeof SummaryResultSchema>` 类型与 `SummaryResult` 一致
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Zod schema parses valid summary data
    Tool: Bash (pnpm test)
    Preconditions: schemas.test.ts written with test cases
    Steps:
      1. Test: parse `{ summary: "Test summary", keyPoints: ["point1"], viewpoints: [{ perspective: "Author", stance: "Positive" }], bestPractices: ["practice1"] }`
      2. Assert: parse succeeds, returned object matches input
      3. Assert: TypeScript type inference works (z.infer matches SummaryResult)
    Expected Result: All parse tests pass, types are consistent
    Failure Indicators: ZodError on valid data, type mismatch
    Evidence: .sisyphus/evidence/task-2-schema-valid.txt

  Scenario: Zod schema rejects invalid summary data
    Tool: Bash (pnpm test)
    Preconditions: schemas.test.ts includes negative test cases
    Steps:
      1. Test: parse `{ summary: 123 }` (wrong type)
      2. Test: parse `{}` (missing required fields)
      3. Test: parse `{ summary: "ok", keyPoints: "not-array" }` (wrong array type)
      4. Assert: all throw ZodError with descriptive messages
    Expected Result: All invalid inputs rejected with ZodError
    Failure Indicators: Invalid data passes validation
    Evidence: .sisyphus/evidence/task-2-schema-invalid.txt
  ```

  **Commit**: YES
  - Message: `feat: add type definitions and Zod schemas for summary output`
  - Files: utils/types.ts, utils/schemas.ts, utils/schemas.test.ts
  - Pre-commit: `pnpm test --run`

- [x] 3. 存储工具模块 (TDD)

  **What to do**:
  - **RED**: 先写测试 `utils/storage.test.ts`，使用 `@webext-core/fake-browser` mock `chrome.storage.local`
  - **GREEN**: 创建 `utils/storage.ts` — 封装 Chrome Storage 操作：
    - `getSettings(): Promise<ExtensionSettings>` — 读取 API Key、Base URL、Model
    - `saveSettings(settings: Partial<ExtensionSettings>): Promise<void>` — 保存设置
    - `getApiKey(): Promise<string | null>` — 快捷获取 API Key
    - 默认值处理：Base URL 默认 `https://api.openai.com/v1`，Model 默认 `gpt-4o-mini`
  - **REFACTOR**: 确保类型安全，使用 Task 2 的 `ExtensionSettings` 类型

  **Must NOT do**:
  - 不要实现加密（MVP 明文存储）
  - 不要使用 `chrome.storage.sync`（必须用 `local`）
  - 不要创建 ORM 类抽象
  - 不要添加历史记录存储

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 简单的 Storage wrapper，逻辑直接，2 个文件
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - 无特殊技能需要

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Task 2 并行)
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1

  **References**:

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:ExtensionSettings` — 设置数据结构
  - Chrome Storage API：https://developer.chrome.com/docs/extensions/reference/api/storage — `chrome.storage.local.get/set` 签名

  **Test References**:
  - WXT Testing 文档：https://wxt.dev/guide/testing.html — `@webext-core/fake-browser` 用法和 mock 模式

  **WHY Each Reference Matters**:
  - `ExtensionSettings` 类型确保存储和读取的数据结构一致
  - Chrome Storage API 文档确认 `get`/`set` 的回调 vs Promise 用法（MV3 使用 Promise）
  - `fake-browser` 文档确认如何在测试中 mock `chrome.storage.local`

  **Acceptance Criteria**:

  - [ ] `utils/storage.test.ts` 存在，使用 `fakeBrowser` mock
  - [ ] `getSettings()` 返回完整设置，缺失字段使用默认值
  - [ ] `saveSettings()` 正确写入 `chrome.storage.local`
  - [ ] `getApiKey()` 返回 key 或 null
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Storage returns defaults when empty
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured, storage is empty
    Steps:
      1. Call `getSettings()` with empty storage
      2. Assert: `baseUrl` === "https://api.openai.com/v1"
      3. Assert: `model` === "gpt-4o-mini"
      4. Assert: `apiKey` === ""
    Expected Result: Defaults applied for all fields
    Failure Indicators: Undefined values, wrong defaults
    Evidence: .sisyphus/evidence/task-3-storage-defaults.txt

  Scenario: Storage saves and retrieves settings correctly
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured
    Steps:
      1. Call `saveSettings({ apiKey: "sk-test-key-123", baseUrl: "https://custom.api.com/v1" })`
      2. Call `getSettings()`
      3. Assert: `apiKey` === "sk-test-key-123"
      4. Assert: `baseUrl` === "https://custom.api.com/v1"
      5. Assert: `model` === "gpt-4o-mini" (default preserved for unsaved field)
    Expected Result: Saved values retrieved, unsaved fields keep defaults
    Failure Indicators: Values not persisted, defaults overwritten
    Evidence: .sisyphus/evidence/task-3-storage-save-retrieve.txt

  Scenario: getApiKey returns null when no key saved
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured, no API key saved
    Steps:
      1. Call `getApiKey()`
      2. Assert: returns null or empty string
    Expected Result: Gracefully returns null/empty, no throw
    Failure Indicators: Throws error, returns undefined
    Evidence: .sisyphus/evidence/task-3-storage-no-key.txt
  ```

  **Commit**: YES
  - Message: `feat: add Chrome storage utility module with TDD`
  - Files: utils/storage.ts, utils/storage.test.ts
  - Pre-commit: `pnpm test --run`

- [ ] 4. AI Provider 抽象 + OpenAI 实现 (TDD)

  **What to do**:
  - **RED**: 先写测试 `providers/openai.test.ts`：
    - Mock `globalThis.fetch` 模拟 OpenAI API 响应
    - 测试正确的请求头（Authorization Bearer token）
    - 测试正确的请求体（model、messages、response_format）
    - 测试成功响应解析（JSON → SummaryResult）
    - 测试错误响应处理（401 invalid key、429 rate limit、500 server error、网络错误）
  - **GREEN**: 创建 `providers/ai-provider.ts` — AIProvider 接口定义（从 types.ts 重导出或引用）
  - 创建 `providers/openai.ts` — OpenAIProvider 类实现：
    - 构造函数接受 `{ apiKey: string; baseUrl: string; model: string }`
    - `summarize(content: ExtractedContent): Promise<SummaryResult>` 方法
    - 使用 `fetch()` 直接调用 OpenAI Chat Completions API（**不使用 openai npm 包**）
    - 请求体包含：model、messages（system prompt + user content）、response_format（JSON schema from Zod）
    - System prompt 设计：指示 AI 用原文语言回复，输出结构化 JSON（summary/keyPoints/viewpoints/bestPractices）
    - 响应解析：提取 `choices[0].message.content`，用 `SummaryResultSchema.parse()` 验证
    - 错误处理：区分 HTTP 状态码（401→InvalidApiKey、429→RateLimited、5xx→ServerError）
    - 内容截断：超过 100,000 字符时截断（约 25K tokens，留余量给 system prompt 和输出）
  - **REFACTOR**: 确保 Provider 接口足够简洁，仅暴露 `summarize` 方法
  - 创建 `providers/prompts.ts` — 存放 system prompt 模板（独立文件，便于调优）

  **Must NOT do**:
  - 不要安装 `openai` npm 包（用 raw fetch）
  - 不要安装 `tiktoken`（用字符数估算 token）
  - 不要实现流式响应
  - 不要实现重试逻辑（Task 10 处理）
  - 不要创建 Provider 注册中心/工厂模式
  - 不要实现第二个 Provider

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 核心业务逻辑，涉及 API 集成、Prompt 设计、错误处理，需要深入思考
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 本任务无 UI

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Tasks 5, 6, 7 并行)
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:AIProvider` — Provider 接口定义
  - Task 2 产出的 `utils/types.ts:SummaryResult, ExtractedContent` — 输入输出类型
  - Task 2 产出的 `utils/schemas.ts:SummaryResultSchema` — Zod schema 用于 response_format 和响应验证

  **External References**:
  - OpenAI Chat Completions API：https://platform.openai.com/docs/api-reference/chat/create — 请求/响应格式、response_format 参数
  - OpenAI Structured Outputs：https://platform.openai.com/docs/guides/structured-outputs — JSON schema 格式要求
  - OpenAI Error Codes：https://platform.openai.com/docs/guides/error-codes — HTTP 状态码与错误类型映射

  **WHY Each Reference Matters**:
  - Chat Completions API 文档确认请求体结构、headers、model 名称
  - Structured Outputs 文档确认 response_format 的 JSON schema 格式（注意：直接用 fetch 时需要手动构造 schema 对象，不能用 zodResponseFormat helper）
  - Error Codes 文档确认 401/429/5xx 对应的错误含义和推荐处理方式

  **Acceptance Criteria**:

  - [ ] `providers/openai.test.ts` 存在，mock fetch 测试通过
  - [ ] 正确发送 Authorization header: `Bearer {apiKey}`
  - [ ] 请求体包含 model、messages、response_format
  - [ ] 成功响应正确解析为 SummaryResult
  - [ ] 401 响应抛出含 `code: "INVALID_API_KEY"` 的错误
  - [ ] 429 响应抛出含 `code: "RATE_LIMITED"` 的错误
  - [ ] 网络错误抛出含 `code: "NETWORK_ERROR"` 的错误
  - [ ] 超长内容被截断到 100,000 字符
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Successful summarization with structured output
    Tool: Bash (pnpm test)
    Preconditions: fetch mocked to return valid OpenAI response
    Steps:
      1. Create OpenAIProvider with { apiKey: "sk-test-123", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" }
      2. Call summarize({ title: "Test Article", content: "Article content here...", url: "https://example.com" })
      3. Assert: fetch called with URL "https://api.openai.com/v1/chat/completions"
      4. Assert: fetch headers include "Authorization: Bearer sk-test-123"
      5. Assert: fetch body includes model "gpt-4o-mini"
      6. Assert: result matches SummaryResult type (summary is string, keyPoints is array, etc.)
    Expected Result: Request formatted correctly, response parsed to SummaryResult
    Failure Indicators: Wrong URL, missing auth header, parse error
    Evidence: .sisyphus/evidence/task-4-summarize-success.txt

  Scenario: Invalid API key returns appropriate error
    Tool: Bash (pnpm test)
    Preconditions: fetch mocked to return 401 status
    Steps:
      1. Create OpenAIProvider with { apiKey: "invalid-key", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" }
      2. Call summarize(validContent)
      3. Assert: throws error with code "INVALID_API_KEY"
      4. Assert: error message contains "API key" or similar user-friendly text
    Expected Result: Error with code INVALID_API_KEY thrown
    Failure Indicators: Generic error, no error code, unhandled rejection
    Evidence: .sisyphus/evidence/task-4-invalid-key.txt

  Scenario: Long content is truncated before sending
    Tool: Bash (pnpm test)
    Preconditions: fetch mocked
    Steps:
      1. Create content with 150,000 characters
      2. Call summarize(longContent)
      3. Assert: fetch body content length <= 100,000 characters
    Expected Result: Content truncated to 100,000 chars
    Failure Indicators: Full 150K content sent, or error thrown
    Evidence: .sisyphus/evidence/task-4-truncation.txt
  ```

  **Commit**: YES
  - Message: `feat: add AI provider interface and OpenAI implementation with TDD`
  - Files: providers/ai-provider.ts, providers/openai.ts, providers/openai.test.ts, providers/prompts.ts
  - Pre-commit: `pnpm test --run`

- [ ] 5. Content Script 内容提取 (TDD)

  **What to do**:
  - **RED**: 先写测试 `utils/extractor.test.ts`：
    - 使用 JSDOM 创建模拟 DOM，测试 Readability.js 提取
    - 测试正常文章页面提取（title、content、url）
    - 测试非文章页面返回 null
    - 测试过短内容的处理（<100 字符）
  - **GREEN**: 创建 `utils/extractor.ts` — 内容提取模块：
    - `extractContent(doc: Document, url: string): ExtractedContent | null`
    - 使用 `document.cloneNode(true)` 克隆 DOM（**必须克隆，不修改原页面**）
    - 使用 `new Readability(clonedDoc).parse()` 提取
    - 返回 `{ title, content (textContent), url, lang (从 <html lang> 获取) }`
    - Readability 返回 null → 返回 null
    - 提取结果 content < 100 字符 → 返回 null
  - **GREEN**: 创建 `entrypoints/content.ts` — Content Script 入口：
    - 监听来自 Service Worker 的 `EXTRACT_CONTENT` 消息
    - 调用 `extractContent(document, location.href)`
    - 返回 `ExtractedContent` 或错误消息
  - **REFACTOR**: 确保 extractor 是纯函数（接受 Document 参数），便于测试

  **Must NOT do**:
  - 不要修改原页面 DOM（必须 clone）
  - 不要添加 PDF/YouTube/Twitter 特殊处理
  - 不要添加自动提取（仅响应消息触发）
  - 不要注入任何 UI 到页面

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 DOM 操作、第三方库集成、Content Script 消息监听，有一定复杂度
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 本任务在 Node 环境测试，不需要浏览器

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Tasks 4, 6, 7 并行)
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1

  **References**:

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:ExtractedContent` — 提取结果的数据结构
  - Task 2 产出的 `utils/types.ts:MessageType.EXTRACT_CONTENT` — 消息类型常量

  **External References**:
  - Readability.js：https://github.com/mozilla/readability — API 用法、parse() 返回值结构
  - JSDOM：https://github.com/jsdom/jsdom — 测试中模拟 DOM 环境
  - Chrome Content Scripts：https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts — 消息监听 `chrome.runtime.onMessage`

  **WHY Each Reference Matters**:
  - Readability.js 的 `parse()` 返回 `{ title, content, textContent, length, excerpt }` 或 `null`，需要知道具体字段
  - Content Script 的消息监听使用 `chrome.runtime.onMessage.addListener`，需要正确的返回值格式（`sendResponse` 或 return Promise）

  **Acceptance Criteria**:

  - [ ] `utils/extractor.test.ts` 存在且测试通过
  - [ ] 正常文章 DOM 提取出 title、content、url
  - [ ] 非文章 DOM（如空页面）返回 null
  - [ ] 短内容（<100 字符）返回 null
  - [ ] `entrypoints/content.ts` 监听 EXTRACT_CONTENT 消息
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Extract article content from valid DOM
    Tool: Bash (pnpm test)
    Preconditions: JSDOM with mock article HTML (title, <article> with paragraphs)
    Steps:
      1. Create JSDOM with: `<html lang="en"><head><title>Test Article</title></head><body><article><p>Long article content with at least 200 characters of meaningful text...</p></article></body></html>`
      2. Call extractContent(dom.window.document, "https://example.com/article")
      3. Assert: result !== null
      4. Assert: result.title === "Test Article"
      5. Assert: result.content.length > 100
      6. Assert: result.url === "https://example.com/article"
      7. Assert: result.lang === "en"
    Expected Result: All fields extracted correctly
    Failure Indicators: Returns null, wrong title, empty content
    Evidence: .sisyphus/evidence/task-5-extract-valid.txt

  Scenario: Return null for non-article page
    Tool: Bash (pnpm test)
    Preconditions: JSDOM with minimal non-article HTML
    Steps:
      1. Create JSDOM with: `<html><body><div>Login</div></body></html>`
      2. Call extractContent(dom.window.document, "https://example.com/login")
      3. Assert: result === null
    Expected Result: Returns null (Readability can't parse)
    Failure Indicators: Returns object with empty/garbage content
    Evidence: .sisyphus/evidence/task-5-extract-null.txt

  Scenario: Return null for too-short content
    Tool: Bash (pnpm test)
    Preconditions: JSDOM with very short article
    Steps:
      1. Create JSDOM with article containing only 50 characters
      2. Call extractContent(dom.window.document, "https://example.com/short")
      3. Assert: result === null
    Expected Result: Returns null (content too short)
    Failure Indicators: Returns result with short content
    Evidence: .sisyphus/evidence/task-5-extract-short.txt
  ```

  **Commit**: YES
  - Message: `feat: add Readability.js content extraction in content script with TDD`
  - Files: utils/extractor.ts, utils/extractor.test.ts, entrypoints/content.ts
  - Pre-commit: `pnpm test --run`

- [ ] 6. Options 页面 UI

  **What to do**:
  - 创建 `entrypoints/options/index.html` — Options 页面 HTML 入口
  - 创建 `entrypoints/options/main.tsx` — React 入口
  - 创建 `entrypoints/options/App.tsx` — Options 页面主组件：
    - API Key 输入框（`type="password"`，带显示/隐藏切换）
    - Base URL 输入框（默认值 `https://api.openai.com/v1`，placeholder 显示默认值）
    - Model 选择（默认 `gpt-4o-mini`，input 或 select）
    - "保存" 按钮 → 调用 `saveSettings()`
    - "测试连接" 按钮 → 用当前 Key 发一个简单的 API 请求验证有效性
    - 保存成功/失败的 Toast 提示
  - 使用 Tailwind CSS 样式，简洁专业的表单布局
  - 页面加载时从 `getSettings()` 读取已保存的设置填充表单
  - 使用 Task 3 的 storage 工具模块

  **Must NOT do**:
  - 不要添加多语言/国际化
  - 不要添加 Provider 选择器（MVP 仅 OpenAI）
  - 不要添加 Token 用量/费用显示
  - 不要添加导入/导出设置
  - 不要过度设计 UI（简洁实用即可）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 涉及 React 表单 UI、Tailwind 样式、用户交互
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Options 页面相对简单，不需要 E2E 测试

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Tasks 4, 5, 7 并行)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: None (其他任务不依赖 Options 页面)
  - **Blocked By**: Tasks 1, 3

  **References**:

  **Pattern References**:
  - Task 3 产出的 `utils/storage.ts:getSettings, saveSettings` — 读写设置的 API

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:ExtensionSettings` — 设置数据结构

  **External References**:
  - WXT Options 页面约定：https://wxt.dev/guide/entrypoints.html — `entrypoints/options/` 目录结构
  - Tailwind CSS Forms：https://tailwindcss.com/docs/plugins#forms — 表单元素样式

  **WHY Each Reference Matters**:
  - Storage 工具提供了读写设置的封装，Options 页面只需调用这些方法
  - WXT 文档确认 Options 页面的文件路径和入口约定

  **Acceptance Criteria**:

  - [ ] `entrypoints/options/` 目录结构正确（index.html + main.tsx + App.tsx）
  - [ ] API Key 输入框为 password 类型，有显示/隐藏切换
  - [ ] Base URL 输入框有默认值占位
  - [ ] 保存按钮调用 `saveSettings()` 并显示成功提示
  - [ ] 测试连接按钮能验证 API Key 有效性
  - [ ] 页面加载时正确填充已保存的设置
  - [ ] `pnpm build` 成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Options page builds and renders
    Tool: Bash
    Preconditions: Project built successfully
    Steps:
      1. Run `pnpm build`
      2. Verify output contains options page HTML: check `.output/` for options.html or similar
      3. Verify no build errors related to options entrypoint
    Expected Result: Options page included in build output
    Failure Indicators: Build error, missing options page in output
    Evidence: .sisyphus/evidence/task-6-options-build.txt

  Scenario: Options page form elements exist
    Tool: Bash (grep source files)
    Preconditions: Options page components created
    Steps:
      1. Verify App.tsx contains input with type="password" for API key
      2. Verify App.tsx contains input for baseUrl with default value
      3. Verify App.tsx imports and calls saveSettings from storage utils
      4. Verify App.tsx has a "test connection" button or similar
    Expected Result: All form elements and integrations present in source
    Failure Indicators: Missing inputs, no storage integration
    Evidence: .sisyphus/evidence/task-6-options-elements.txt
  ```

  **Commit**: YES
  - Message: `feat: add options page for API key and base URL management`
  - Files: entrypoints/options/index.html, entrypoints/options/main.tsx, entrypoints/options/App.tsx
  - Pre-commit: `pnpm build`

- [ ] 7. 消息传递层 + Service Worker (TDD)

  **What to do**:
  - **RED**: 先写测试 `messaging/messages.test.ts`：
    - 测试消息类型定义和类型安全
    - 使用 `fakeBrowser` mock `chrome.runtime.sendMessage` 和 `chrome.tabs.sendMessage`
    - 测试 Service Worker 消息路由逻辑
  - **GREEN**: 创建 `messaging/types.ts` — 消息类型定义（使用 Task 2 的 MessageType）：
    - `ExtractContentMessage` — `{ type: "EXTRACT_CONTENT" }`
    - `ExtractContentResponse` — `{ success: boolean; data?: ExtractedContent; error?: string }`
    - `SummarizeMessage` — `{ type: "SUMMARIZE"; content: ExtractedContent }`
    - `SummarizeResponse` — `{ success: boolean; data?: SummaryResult; error?: { code: string; message: string } }`
  - 创建 `messaging/sender.ts` — 消息发送工具：
    - `sendToContentScript(tabId: number, message): Promise<Response>` — Side Panel → Content Script
    - `sendToBackground(message): Promise<Response>` — Side Panel → Service Worker
  - **GREEN**: 更新 `entrypoints/background.ts` — Service Worker：
    - 监听消息（`chrome.runtime.onMessage`）
    - 路由 `SUMMARIZE` 消息 → 调用 OpenAI Provider
    - 从 storage 读取 API Key 和设置
    - 实现 keep-alive 策略：`setInterval(() => chrome.runtime.getPlatformInfo(), 20000)`
    - 注册 Side Panel（`chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`）
  - **REFACTOR**: 确保消息传递类型安全，发送和接收端使用相同类型

  **Must NOT do**:
  - 不要实现流式消息传递
  - 不要实现消息队列/缓冲
  - 不要使用 Port-based long-lived connections（MVP 用 simple message passing）
  - 不要实现 Offscreen Document

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 涉及 Chrome Extension 消息传递架构、Service Worker 生命周期管理，复杂度中高
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - 无特殊技能需要

  **Parallelization**:
  - **Can Run In Parallel**: YES (与 Tasks 4, 5, 6 并行)
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 2, 3

  **References**:

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:MessageType, ExtractedContent, SummaryResult` — 消息数据类型
  - Task 3 产出的 `utils/storage.ts:getSettings` — Service Worker 读取 API Key
  - Task 4 产出的 `providers/openai.ts:OpenAIProvider` — Service Worker 调用 AI

  **External References**:
  - Chrome Message Passing：https://developer.chrome.com/docs/extensions/develop/concepts/messaging — sendMessage/onMessage API
  - Chrome Side Panel API：https://developer.chrome.com/docs/extensions/reference/api/sidePanel — `setPanelBehavior` 配置
  - Service Worker Keep-Alive：https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers#keep_a_service_worker_alive — keep-alive 模式

  **WHY Each Reference Matters**:
  - Message Passing 文档确认 `sendMessage`/`onMessage` 的 Promise vs callback 用法（MV3 支持 Promise）
  - Side Panel API 确认 `openPanelOnActionClick: true` 的配置方式
  - Keep-Alive 文档确认 Service Worker 在 MV3 中的生命周期限制和推荐保活策略

  **Acceptance Criteria**:

  - [ ] `messaging/messages.test.ts` 存在且测试通过
  - [ ] 消息类型定义完整且类型安全
  - [ ] `sendToContentScript` 和 `sendToBackground` 正确发送消息
  - [ ] Service Worker 正确路由 SUMMARIZE 消息
  - [ ] Service Worker 实现 keep-alive interval
  - [ ] Side Panel 配置为点击图标打开
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Service Worker routes SUMMARIZE message correctly
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured, OpenAI provider mocked
    Steps:
      1. Simulate receiving a SUMMARIZE message with valid ExtractedContent
      2. Assert: OpenAI provider's summarize() is called with the content
      3. Assert: Response contains success: true and data matching SummaryResult
    Expected Result: Message routed to provider, result returned
    Failure Indicators: Message not handled, provider not called, wrong response format
    Evidence: .sisyphus/evidence/task-7-sw-route.txt

  Scenario: Service Worker handles provider error gracefully
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured, provider mocked to throw error
    Steps:
      1. Mock OpenAI provider to throw { code: "INVALID_API_KEY", message: "..." }
      2. Simulate SUMMARIZE message
      3. Assert: Response contains success: false and error object with code and message
    Expected Result: Error caught and returned in response format
    Failure Indicators: Unhandled error, response missing error details
    Evidence: .sisyphus/evidence/task-7-sw-error.txt

  Scenario: Message sender utilities work with chrome API
    Tool: Bash (pnpm test)
    Preconditions: fakeBrowser configured
    Steps:
      1. Call sendToBackground({ type: "SUMMARIZE", content: mockContent })
      2. Assert: chrome.runtime.sendMessage called with correct message
      3. Call sendToContentScript(123, { type: "EXTRACT_CONTENT" })
      4. Assert: chrome.tabs.sendMessage called with tabId 123 and correct message
    Expected Result: Chrome APIs called with correct parameters
    Failure Indicators: Wrong API called, missing parameters
    Evidence: .sisyphus/evidence/task-7-message-sender.txt
  ```

  **Commit**: YES
  - Message: `feat: add message passing layer and service worker with TDD`
  - Files: messaging/types.ts, messaging/sender.ts, messaging/messages.test.ts, entrypoints/background.ts
  - Pre-commit: `pnpm test --run`

- [ ] 8. Side Panel UI

  **What to do**:
  - 创建 `entrypoints/sidepanel/index.html` — Side Panel HTML 入口
  - 创建 `entrypoints/sidepanel/main.tsx` — React 入口
  - 创建 `entrypoints/sidepanel/App.tsx` — 主应用组件
  - 创建 `entrypoints/sidepanel/components/SummaryView.tsx` — 摘要展示组件：
    - 四个可折叠区块：📋 摘要 / 🔑 重点 / 💡 观点 / ✅ 最佳实践
    - 每个区块有标题 + 内容区域
    - 最佳实践区块为空时显示 "该文章未包含最佳实践内容" 并可折叠
  - 创建 `entrypoints/sidepanel/components/LoadingState.tsx` — 加载状态：
    - 带动画的加载指示器
    - "正在分析页面内容..." 文案
  - 创建 `entrypoints/sidepanel/components/ErrorState.tsx` — 错误状态：
    - 根据错误 code 显示不同的用户友好消息
    - 提供 "重试" 按钮和 "打开设置" 链接（对于 API Key 错误）
  - App.tsx 主逻辑：
    - "总结本页" 按钮 → 触发内容提取 + AI 摘要流程
    - 状态管理：`idle` → `extracting` → `summarizing` → `done` / `error`
    - 通过 `sendToBackground` 发送消息
    - 获取当前 tab：`chrome.tabs.query({ active: true, currentWindow: true })`
  - Tailwind CSS 样式：简洁、可读、适合窄面板（~400px 宽度）

  **Must NOT do**:
  - 不要添加暗色模式切换
  - 不要添加历史记录列表
  - 不要添加导出按钮
  - 不要添加自定义 Prompt 输入框
  - 不要添加复杂动画（简洁即可）
  - 不要使用任何 UI 组件库（纯 Tailwind + 自定义组件）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React 组件开发 + Tailwind 样式 + 用户交互状态管理，是典型的前端 UI 任务
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: MVP 不做 UI E2E 测试

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 7 的消息传递)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9
  - **Blocked By**: Tasks 2, 7

  **References**:

  **API/Type References**:
  - Task 2 产出的 `utils/types.ts:SummaryResult` — 摘要数据结构，决定 UI 渲染的字段
  - Task 7 产出的 `messaging/sender.ts:sendToBackground` — 发送消息到 Service Worker
  - Task 7 产出的 `messaging/types.ts:SummarizeResponse` — 响应格式，包含 success/data/error

  **External References**:
  - WXT Side Panel 文档：https://wxt.dev/guide/entrypoints.html — Side Panel 入口约定
  - Chrome Side Panel API：https://developer.chrome.com/docs/extensions/reference/api/sidePanel — API 限制和行为

  **WHY Each Reference Matters**:
  - `SummaryResult` 类型决定了 SummaryView 需要渲染哪些字段
  - `sendToBackground` 是 Side Panel 与 Service Worker 通信的唯一方式
  - WXT 文档确认 Side Panel 的文件路径约定（`entrypoints/sidepanel/`）

  **Acceptance Criteria**:

  - [ ] Side Panel 入口文件完整（index.html + main.tsx + App.tsx）
  - [ ] SummaryView 渲染四个区块（摘要/重点/观点/最佳实践）
  - [ ] 空的 bestPractices 显示提示文案
  - [ ] LoadingState 显示加载动画
  - [ ] ErrorState 根据错误 code 显示不同消息
  - [ ] "总结本页" 按钮触发完整流程
  - [ ] 状态流转正确：idle → extracting → summarizing → done/error
  - [ ] `pnpm build` 成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Side Panel builds correctly
    Tool: Bash
    Preconditions: All dependencies installed
    Steps:
      1. Run `pnpm build`
      2. Verify output contains sidepanel HTML in `.output/`
      3. Verify no build errors related to sidepanel entrypoint
    Expected Result: Side Panel included in build output
    Failure Indicators: Build error, missing sidepanel in output
    Evidence: .sisyphus/evidence/task-8-sidepanel-build.txt

  Scenario: SummaryView component handles all data states
    Tool: Bash (grep + file analysis)
    Preconditions: Component files created
    Steps:
      1. Verify SummaryView.tsx accepts SummaryResult prop
      2. Verify it renders sections for summary, keyPoints, viewpoints, bestPractices
      3. Verify conditional rendering: when bestPractices is empty array, shows fallback message
      4. Verify each section has a heading with emoji prefix
    Expected Result: Component handles full, partial, and empty data
    Failure Indicators: Missing sections, no empty state handling
    Evidence: .sisyphus/evidence/task-8-summaryview-states.txt

  Scenario: Error state shows appropriate messages
    Tool: Bash (grep + file analysis)
    Preconditions: ErrorState component created
    Steps:
      1. Verify ErrorState.tsx maps error codes to user-friendly messages:
         - "INVALID_API_KEY" → contains text about checking API key + link to settings
         - "NETWORK_ERROR" → contains text about network connection
         - "CONTENT_TOO_SHORT" → contains text about page content
      2. Verify retry button exists
    Expected Result: Error code mapping complete with user-friendly messages
    Failure Indicators: Generic error message, missing retry button
    Evidence: .sisyphus/evidence/task-8-error-states.txt
  ```

  **Commit**: YES
  - Message: `feat: add side panel UI with 4-section structured summary display`
  - Files: entrypoints/sidepanel/index.html, entrypoints/sidepanel/main.tsx, entrypoints/sidepanel/App.tsx, entrypoints/sidepanel/components/*.tsx
  - Pre-commit: `pnpm build`

- [ ] 9. 端到端集成联调

  **What to do**:
  - 连接所有模块，确保完整的用户流程工作：
    1. 用户点击插件图标 → Side Panel 打开
    2. 用户点击 "总结本页" 按钮
    3. Side Panel 发送 `EXTRACT_CONTENT` 消息给 Content Script（通过 Background 转发）
    4. Content Script 提取页面内容 → 返回 ExtractedContent
    5. Side Panel 发送 `SUMMARIZE` 消息给 Service Worker（附带 ExtractedContent）
    6. Service Worker 从 storage 读取 API Key → 创建 OpenAI Provider → 调用 summarize
    7. 结果返回 Side Panel → 渲染 SummaryView
  - 具体集成工作：
    - 更新 `entrypoints/background.ts`：添加 EXTRACT_CONTENT 消息转发到当前 tab 的 Content Script
    - 更新 `entrypoints/sidepanel/App.tsx`：完善按钮点击处理，串联 extract → summarize 流程
    - 确保 Content Script 在 manifest 中正确注册（`content_scripts` 配置，匹配 `<all_urls>` 或 `http://*/*`, `https://*/*`）
    - 确保 Service Worker 正确初始化 Provider（从 storage 读取设置）
    - 验证消息传递链路：Side Panel → Background → Content Script → Background → Side Panel
  - 写集成测试 `integration/flow.test.ts`：mock 所有 Chrome API，验证完整消息流

  **Must NOT do**:
  - 不要添加自动触发逻辑
  - 不要添加缓存
  - 不要修改已有模块的公共 API（仅连接/调用）
  - 不要添加新功能

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 需要理解所有模块的交互关系，正确连接消息传递链路，调试跨模块通信问题
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: 集成测试在 Node 环境用 mock 完成

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖所有核心模块)
  - **Parallel Group**: Wave 3 — Sequential
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 4, 5, 7, 8

  **References**:

  **Pattern References**:
  - Task 4 产出的 `providers/openai.ts:OpenAIProvider` — AI 调用入口
  - Task 5 产出的 `entrypoints/content.ts` — Content Script 消息监听
  - Task 7 产出的 `entrypoints/background.ts` — Service Worker 消息路由
  - Task 7 产出的 `messaging/sender.ts` — 消息发送工具
  - Task 8 产出的 `entrypoints/sidepanel/App.tsx` — UI 触发逻辑

  **API/Type References**:
  - Task 7 产出的 `messaging/types.ts` — 所有消息类型定义

  **WHY Each Reference Matters**:
  - 集成联调需要理解每个模块的输入/输出接口，确保消息格式匹配
  - Background.ts 是消息路由的中心节点，需要同时转发 Content Script 消息和处理 AI 调用

  **Acceptance Criteria**:

  - [ ] Side Panel "总结本页" 按钮触发完整提取+摘要流程
  - [ ] Background 正确转发 EXTRACT_CONTENT 消息到 Content Script
  - [ ] Background 正确处理 SUMMARIZE 消息（读取设置 → 创建 Provider → 调用 API → 返回结果）
  - [ ] 集成测试 `integration/flow.test.ts` 验证完整消息链路
  - [ ] `pnpm build` 成功
  - [ ] `pnpm test --run` 通过

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full message chain works in integration test
    Tool: Bash (pnpm test)
    Preconditions: All modules built, fakeBrowser + fetch mocked
    Steps:
      1. Mock: chrome.storage.local contains valid API key "sk-test-integration"
      2. Mock: chrome.tabs.query returns [{ id: 1, url: "https://example.com" }]
      3. Mock: chrome.tabs.sendMessage(1, EXTRACT_CONTENT) returns { success: true, data: mockExtractedContent }
      4. Mock: fetch to OpenAI API returns valid structured summary
      5. Simulate: Side Panel sends SUMMARIZE message to background
      6. Assert: Background reads API key from storage
      7. Assert: Background calls fetch with correct OpenAI request
      8. Assert: Response contains success: true with valid SummaryResult
    Expected Result: Full chain works: storage → provider → API → parsed result
    Failure Indicators: Any step in the chain fails, message not routed
    Evidence: .sisyphus/evidence/task-9-integration-chain.txt

  Scenario: Integration handles missing API key
    Tool: Bash (pnpm test)
    Preconditions: chrome.storage.local empty (no API key)
    Steps:
      1. Simulate SUMMARIZE message
      2. Assert: Response contains success: false
      3. Assert: Error code is "NO_API_KEY" or similar
      4. Assert: Error message suggests opening settings
    Expected Result: Graceful error with actionable message
    Failure Indicators: Crash, generic error, or attempt to call API without key
    Evidence: .sisyphus/evidence/task-9-no-api-key.txt
  ```

  **Commit**: YES
  - Message: `feat: wire end-to-end summarization flow`
  - Files: entrypoints/background.ts, entrypoints/sidepanel/App.tsx, integration/flow.test.ts
  - Pre-commit: `pnpm build && pnpm test --run`

- [ ] 10. 错误处理 + 边缘情况

  **What to do**:
  - **RED**: 写测试覆盖所有边缘情况
  - **GREEN**: 在各模块中添加/完善错误处理：
  - **Content Extraction 边缘情况**:
    - chrome:// / about: / chrome-extension:// 页面 → 提前检测并返回 "该页面类型不支持摘要"
    - 页面还在加载中（DOM 不完整）→ 等待 DOMContentLoaded 或返回 "页面仍在加载"
    - iframe-heavy 页面 → 仅提取主文档
  - **AI API 边缘情况**:
    - 429 Rate Limit → 显示 "请求过于频繁，请稍后重试"（**不实现自动重试**，仅友好提示）
    - 超时处理 → 为 fetch 添加 AbortController，30s 超时，显示 "请求超时，请重试"
    - 响应格式异常 → Zod parse 失败时返回 "AI 返回格式异常，请重试"
    - API Key 格式校验 → 发送前检查 Key 格式（以 "sk-" 开头，长度合理）
  - **Side Panel 边缘情况**:
    - 多次快速点击 "总结" 按钮 → 防抖/禁用按钮（进行中时 disabled）
    - 用户切换 Tab 后回来 → 保留上次结果（不自动清除）
  - **Service Worker 边缘情况**:
    - API Key 未设置 → 返回 `{ code: "NO_API_KEY", message: "请先在设置中配置 API Key" }`
  - **REFACTOR**: 统一错误代码和消息格式

  **Must NOT do**:
  - 不要实现自动重试逻辑（仅提示用户手动重试）
  - 不要添加错误日志上报/遥测
  - 不要创建自定义 Error 类层次结构
  - 不要添加 notification API 调用

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要跨多个模块添加边缘情况处理，理解各模块的错误传播路径
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (依赖 Task 9 的集成完成)
  - **Parallel Group**: Wave 3 — Sequential (after Task 9)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - Task 4 产出的 `providers/openai.ts` — 已有的 HTTP 状态码错误处理，在此基础上补充
  - Task 8 产出的 `entrypoints/sidepanel/components/ErrorState.tsx` — 错误 UI 组件，需要支持新的错误代码
  - Task 9 产出的集成流程 — 了解消息链路中错误如何传播

  **WHY Each Reference Matters**:
  - OpenAI Provider 已有基础错误处理（401/429/5xx），本任务需补充超时、格式异常等边缘情况
  - ErrorState 组件需要支持本任务新增的所有错误代码
  - 集成流程确认了错误传播路径：Content Script → Background → Side Panel

  **Acceptance Criteria**:

  - [ ] chrome:// 页面触发时显示友好提示
  - [ ] API 调用 30s 超时后显示超时提示
  - [ ] 429 错误显示频率限制提示
  - [ ] Zod parse 失败时显示格式异常提示
  - [ ] 快速多次点击按钮不会发送重复请求
  - [ ] 所有错误代码在 ErrorState 中有对应的用户友好消息
  - [ ] `pnpm test --run` 通过
  - [ ] `pnpm build` 成功

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chrome internal pages return friendly error
    Tool: Bash (pnpm test)
    Preconditions: Content script or background handles URL check
    Steps:
      1. Simulate summarization request for URL "chrome://settings"
      2. Assert: returns error with code "UNSUPPORTED_PAGE"
      3. Assert: error message contains "该页面类型不支持摘要" or similar Chinese/English message
    Expected Result: No API call made, user-friendly error returned
    Failure Indicators: API call attempted, generic error
    Evidence: .sisyphus/evidence/task-10-chrome-pages.txt

  Scenario: API call timeout after 30 seconds
    Tool: Bash (pnpm test)
    Preconditions: fetch mocked to never resolve (simulate timeout)
    Steps:
      1. Call summarize with valid content
      2. Wait for AbortController timeout (mock timers, advance 30s)
      3. Assert: throws error with code "TIMEOUT"
      4. Assert: error message mentions timeout
    Expected Result: Request aborted after 30s with timeout error
    Failure Indicators: Hangs indefinitely, wrong error code
    Evidence: .sisyphus/evidence/task-10-timeout.txt

  Scenario: Button disabled during summarization
    Tool: Bash (grep + file analysis)
    Preconditions: App.tsx with button state management
    Steps:
      1. Verify App.tsx disables "Summarize" button when state is "extracting" or "summarizing"
      2. Verify button re-enables on "done" or "error" state
      3. Verify disabled state uses `disabled` attribute or pointer-events CSS
    Expected Result: Button cannot be clicked during processing
    Failure Indicators: Button remains clickable during processing
    Evidence: .sisyphus/evidence/task-10-button-disabled.txt
  ```

  **Commit**: YES
  - Message: `fix: handle edge cases — empty content, non-article pages, API errors, timeout`
  - Files: Multiple files across providers/, entrypoints/, messaging/
  - Pre-commit: `pnpm build && pnpm test --run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run `pnpm build`, check dist/). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `pnpm build` + `pnpm test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify TypeScript strict mode compliance.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Load extension in Chrome via Bash/automation. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (content extraction → AI call → UI render). Test edge cases: empty page, non-article page, invalid API key. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no history, no export, no multi-provider impl, no custom prompts, no auto-summarize, no tiktoken. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Scope Creep [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Key Files |
|------|---------------|-----------|
| 1 | `feat: scaffold Chrome extension with WXT + React + TS + Tailwind + Vitest` | package.json, wxt.config.ts, tsconfig.json, tailwind.config.ts |
| 2 | `feat: add type definitions and Zod schemas for summary output` | types/, schemas/ |
| 3 | `feat: add Chrome storage utility module with TDD` | utils/storage.ts, utils/storage.test.ts |
| 4 | `feat: add AI provider interface and OpenAI implementation with TDD` | providers/, providers/*.test.ts |
| 5 | `feat: add Readability.js content extraction in content script with TDD` | entrypoints/content.ts, utils/extractor.ts, *.test.ts |
| 6 | `feat: add options page for API key and base URL management` | entrypoints/options/ |
| 7 | `feat: add message passing layer and service worker with TDD` | entrypoints/background.ts, messaging/, *.test.ts |
| 8 | `feat: add side panel UI with 4-section structured summary display` | entrypoints/sidepanel/ |
| 9 | `feat: wire end-to-end summarization flow` | integration wiring across modules |
| 10 | `fix: handle edge cases — empty content, non-article pages, API errors` | error handling across modules |

---

## Success Criteria

### Verification Commands
```bash
pnpm build          # Expected: exit 0, dist/ directory created
pnpm test           # Expected: all tests pass, 0 failures
pnpm test --coverage # Expected: business logic modules > 80% coverage
```

### Final Checklist
- [ ] All "Must Have" items implemented and verified
- [ ] All "Must NOT Have" items confirmed absent
- [ ] All unit tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Extension loads in Chrome without errors
- [ ] Side Panel renders correctly with structured 4-section layout
- [ ] Content extraction works on standard article pages
- [ ] OpenAI API integration returns structured summary
- [ ] Options page saves/loads API key correctly
- [ ] Error states handled gracefully (invalid key, network error, non-article page)
