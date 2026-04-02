# Result Panel UI Redesign

## TL;DR

> **Quick Summary**: Redesign the inline result bubble (floating-toolbar result panel) from a basic emoji-button layout into a polished three-section card — DeepL-style header with PageMind logo + model info, scrollable content area, and footer with thumbs feedback + SVG copy icon.
>
> **Deliverables**:
> - Fully redesigned `createResultPanel()` in `entrypoints/floating-toolbar.content.ts`
> - `model` field added to `TOOLBAR_INLINE_RESULT` message (types.ts + background.ts)
> - All existing behaviors preserved (cancel-on-close, retry, result panel visible flag)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: T1 (type contract) → T2 (panel structure) → T3 (header logic) → T4 (SVG icons + interactions) → T5 (CSS hardening + loading redesign)

---

## Context

### Original Request
用户希望将结果面板（内联气泡）重新设计为三段式精美布局，参考 DeepL 风格，并加入 PageMind Logo（方案 A：渐变字母 P）。

### Design Decisions (All Confirmed)
- **Logo**: 圆角方形徽章，白色粗体 P，蓝紫渐变 `#6366F1 → #818CF8`，圆角 8px，SVG inline
- **Header**: `[Logo 20px]  [model · action_info]  [✕]`
  - Translate: `gpt-4o · 自动检测 → 中文`（静态，无实时语言检测）
  - Explain: `gpt-4o · 💡 Explain`
  - Rewrite: `gpt-4o · ✏️ Rewrite`
  - model 名通过 TOOLBAR_INLINE_RESULT 消息传递（需扩展消息类型）
- **Content area**: 纯白背景，14px，可滚动，max-height 220px
- **Footer**: 左侧 👍👎 SVG 图标（纯展示切换，不发送任何数据）+ 右侧 ⧉ 双方块 SVG 复制图标
- **Visual style**: 全白极简，分割线区分层次，无渐变背景
- **Copy feedback**: 图标变绿色对勾，1.5s 后恢复
- **Thumbs**: 互斥切换（filled vs outline），新 action 触发时重置

### Metis Review — Gaps Addressed
- **模型名传递**: TOOLBAR_INLINE_RESULT 消息新增 `model` 字段，background.ts 发送时从 settings 读取
- **语言方向**: 静态显示 `自动检测 → 中文`，实时语言检测为未来单独任务
- **Thumbs 数据**: 纯 UI 状态，无持久化，无网络请求
- **Retry 布局**: 错误状态时，footer 整体替换为 `[🔄 重试]  [✕ 关闭]` 行，thumbs/copy 隐藏
- **CSS 隔离**: 面板容器设置关键样式时加 `!important` 防止宿主页污染

---

## Work Objectives

### Core Objective
用精美的三段式布局（Header / Content / Footer）替换当前简陋的 emoji 按钮面板，提升视觉专业度，同时完整保留所有现有行为。

### Concrete Deliverables
- `utils/types.ts`: `TOOLBAR_INLINE_RESULT` 消息新增 `model: string` 字段
- `entrypoints/background.ts`: 发送 `TOOLBAR_INLINE_RESULT` 时附加 `model` 字段
- `entrypoints/floating-toolbar.content.ts`: 全新 `createResultPanel()` 实现

### Definition of Done
- [ ] `bun run build` 通过，exit code 0
- [ ] `npx vitest run` 无新增失败（允许 openai.test.ts 中已有的 1 个既有失败）
- [ ] 面板三段结构正确渲染（Header / Content / Footer 各自分割）
- [ ] Logo SVG 在 20px 尺寸清晰可见
- [ ] 所有既有行为测试通过（cancel-on-close、retry、resultPanelVisible）

### Must Have
- 全白背景 + 分割线分区（无渐变、无 tinted header）
- Header 正确显示 model 名 + action 信息
- Footer 左 thumbs（互斥切换）+ 右 copy（SVG 图标，非 emoji）
- Copy 点击反馈：图标变绿，1.5s 后恢复
- 错误状态：footer 替换为 Retry + Close，隐藏 thumbs/copy
- 关闭行为：隐藏 panel + 隐藏 toolbar（现有逻辑不变）
- 加载中关闭：发送 TOOLBAR_INLINE_CANCEL（现有逻辑不变）

### Must NOT Have (Guardrails)
- **禁止** 任何 Tailwind CSS class
- **禁止** 修改 toolbar 按钮区（💡/🌐/✏️ 三个按钮、分割线、caret）
- **禁止** 修改 `positionToolbar()` 定位逻辑
- **禁止** 修改 `TOOLBAR_INLINE_ACTION` 消息协议（content script → background 方向）
- **禁止** Thumbs 点击触发任何网络请求或数据持久化
- **禁止** 语言自动检测（静态 `自动检测 → 中文`）
- **禁止** 修改 sidepanel / popup / 任何其他 entrypoint
- **禁止** 安装任何新 npm 包
- **禁止** 实时流式渲染（保持单次全量显示）
- **禁止** 键盘导航 / ARIA 支持（明确排除）
- **禁止** 深色模式（明确排除）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: Tests-after — update existing floatingToolbar.test.ts
- **Framework**: vitest + jsdom

### QA Policy
每个任务包含 agent 执行的 QA 场景，工具为 Bash（build/test 命令）。

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (可立即并行):
├── T1: 消息类型扩展 (types.ts + background.ts) — 加 model 字段 [quick]
└── T2: createResultPanel() 重建 — DOM 结构骨架 [visual-engineering]

Wave 2 (T1 + T2 完成后):
├── T3: Header 逻辑连线 — 读取 action/model，填充 header center 文字 [quick]
├── T4: SVG 图标 + 交互行为 — logo/thumbs/copy SVG，toggle逻辑，copy反馈 [visual-engineering]
└── T5: CSS 防污染 + Loading 状态 + 错误状态布局 [visual-engineering]

Wave FINAL:
├── F1: 构建 + 测试验证 [quick]
└── F2: 代码质量检查 [unspecified-high]
```

### Dependency Matrix
- T1: 无依赖 → T3 依赖
- T2: 无依赖 → T3, T4, T5 依赖
- T3: 依赖 T1, T2
- T4: 依赖 T2
- T5: 依赖 T2
- F1, F2: 依赖 T3, T4, T5

---

## TODOs

- [ ] 1. T1: 扩展 TOOLBAR_INLINE_RESULT 消息类型，加入 model 字段

  **What to do**:
  - 读取 `utils/types.ts`，找到 `TOOLBAR_INLINE_RESULT` 接口（约第 203 行）
  - 在该接口新增字段: `model: string;`
  - 读取 `entrypoints/background.ts`，找到发送 `TOOLBAR_INLINE_RESULT` 的行（约第 130 行）：
    ```typescript
    chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_RESULT', content: fullResult, action });
    ```
  - 改为：
    ```typescript
    chrome.tabs.sendMessage(tabId, { type: 'TOOLBAR_INLINE_RESULT', content: fullResult, action, model: settings.model });
    ```
    注意：`settings` 变量在该 async IIFE 的作用域内已存在（第 98 行 `const settings = await getSettings()`）

  **Must NOT do**:
  - 不修改 `TOOLBAR_INLINE_ACTION` 消息接口
  - 不添加新的消息类型
  - 不改变 background.ts 中其他任何逻辑

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T2 并行）
  - **Blocks**: T3
  - **Blocked By**: None

  **References**:
  - `utils/types.ts:203` — `TOOLBAR_INLINE_RESULT` 接口定义
  - `entrypoints/background.ts:130` — `chrome.tabs.sendMessage` 发送结果处

  **Acceptance Criteria**:
  - [ ] `utils/types.ts` 中 `TOOLBAR_INLINE_RESULT` 接口包含 `model: string` 字段
  - [ ] `entrypoints/background.ts` 发送消息时包含 `model: settings.model`
  - [ ] `bun run build` 通过

  **QA Scenarios**:
  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. cd 到项目根目录
      2. 运行 bun run build
    Expected Result: exit code 0，无 TypeScript 类型错误
    Evidence: 构建输出最后 10 行
  ```

  **Commit**: YES（与 T2 同组）
  - Message: `feat(types): add model field to TOOLBAR_INLINE_RESULT message`
  - Files: `utils/types.ts`, `entrypoints/background.ts`

---

- [ ] 2. T2: 重建 createResultPanel() DOM 结构骨架

  **What to do**:
  完全替换 `entrypoints/floating-toolbar.content.ts` 中的 `createResultPanel()` 函数（第 229–369 行），用新的三段式结构：

  **新结构**:
  ```
  #wps-result-panel  (flex column, white bg, border, shadow, rounded-12, min-w 320px, max-w 420px)
  ├── #wps-result-header  (flex row, align-center, padding 0 14px, height 44px, border-bottom)
  │   ├── #wps-result-logo  (20×20 SVG容器)
  │   ├── #wps-result-meta  (flex-1, center text: model · action_info, 12px, #64748b)
  │   └── #wps-result-close (24×24 hit area, ✕ text, hover bg circle)
  ├── #wps-result-loading  (display:none, padding 32px 16px, center)
  ├── #wps-result-content  (display:none, padding 14px 16px, 14px, overflow-y auto, max-height 220px)
  └── #wps-result-footer   (display:none, flex row, align-center, padding 0 14px, height 40px, border-top)
      ├── #wps-result-thumbs (flex row, gap 8px)
      │   ├── #wps-result-thumb-up   (24×24, SVG thumbs-up)
      │   └── #wps-result-thumb-down (24×24, SVG thumbs-down)
      └── #wps-result-copy (margin-left auto, 24×24, SVG 双方块)
  ```

  **样式规范**（所有用 `Object.assign(el.style, {...})` 或 `el.style.xxx = yyy`，禁用 className）:

  Panel 外层：
  ```typescript
  Object.assign(panel.style, {
    position: 'absolute', top: '100%', left: '0', marginTop: '8px',
    width: '340px',           // 固定宽度
    maxHeight: '340px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.09)',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif !important',
    overflow: 'hidden', display: 'none', flexDirection: 'column',
    zIndex: '2147483647',
  });
  ```

  Header：
  ```typescript
  Object.assign(header.style, {
    display: 'flex', alignItems: 'center', padding: '0 14px',
    height: '44px', minHeight: '44px', flexShrink: '0',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
    backgroundColor: '#ffffff',
  });
  ```

  Meta（中间文字区）：
  ```typescript
  Object.assign(meta.style, {
    flex: '1', textAlign: 'center',
    fontSize: '12px', color: '#64748b', fontWeight: '500',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    padding: '0 8px',
  });
  ```

  Close 按钮：
  ```typescript
  Object.assign(closeBtn.style, {
    width: '24px', height: '24px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    border: 'none', backgroundColor: 'transparent',
    borderRadius: '50%', cursor: 'pointer',
    fontSize: '14px', color: '#94a3b8',
    flexShrink: '0', outline: 'none',
    transition: 'background-color 0.15s',
  });
  ```

  Loading：
  ```typescript
  Object.assign(loadingEl.style, {
    display: 'none', padding: '32px 16px',
    textAlign: 'center', color: '#94a3b8', fontSize: '13px', flexShrink: '0',
  });
  ```

  Content：
  ```typescript
  Object.assign(contentEl.style, {
    display: 'none', padding: '14px 16px', flexGrow: '1',
    fontSize: '14px', lineHeight: '1.75', color: '#1f2937',
    overflowY: 'auto', maxHeight: '220px',
    wordBreak: 'break-word', whiteSpace: 'pre-wrap',
  });
  ```

  Footer：
  ```typescript
  Object.assign(footer.style, {
    display: 'none', flexShrink: '0',
    alignItems: 'center', padding: '0 14px',
    height: '40px', minHeight: '40px',
    borderTop: '1px solid rgba(0,0,0,0.07)',
    backgroundColor: '#ffffff',
  });
  ```

  此任务：**只建立 DOM 结构和静态样式，不接入任何行为逻辑（事件监听、SVG内容、状态切换留给 T4/T5）**。

  Close 按钮的现有事件逻辑（cancel-in-flight + hideResultPanel + hideToolbar）**必须从旧代码移植过来**，这是 T2 的责任。

  **同时需要更新** `showResultLoading()`、`showResultContent()`、`showResultError()`、`hideResultPanel()` 中对旧 element ID 的引用，改为新的 ID：
  - `#wps-result-loading` — 不变
  - `#wps-result-content` — 不变
  - `#wps-result-actions` → 改为 `#wps-result-footer`
  - `#wps-result-copy` — 不变
  - `#wps-result-close` — 不变（但现在在 header 中，不在 footer 中）
  - `#wps-result-retry` — 不变（动态注入到 footer 中）

  **Must NOT do**:
  - 不修改 `createToolbar()` 函数
  - 不修改 `positionToolbar()` 函数
  - 不修改 `showToolbar()` / `hideToolbar()` 函数
  - 不修改 `handleMouseDown` / `handleSelectionChange` / `handleMouseUp`
  - 不修改消息监听器

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1（与 T1 并行）
  - **Blocks**: T3, T4, T5
  - **Blocked By**: None

  **References**:
  - `entrypoints/floating-toolbar.content.ts:229-369` — 现有 `createResultPanel()` 完整实现（要替换的目标）
  - `entrypoints/floating-toolbar.content.ts:371-508` — `showResultLoading/Content/Error/hideResultPanel` 函数（需同步更新 ID 引用）
  - `entrypoints/floating-toolbar.content.ts:355-363` — 现有 close 按钮逻辑（必须移植）

  **Acceptance Criteria**:
  - [ ] 面板包含 `#wps-result-header`、`#wps-result-meta`、`#wps-result-close`、`#wps-result-loading`、`#wps-result-content`、`#wps-result-footer`、`#wps-result-thumbs`、`#wps-result-copy` 等元素
  - [ ] Close 按钮在 header 中（不在 footer）
  - [ ] `bun run build` 通过
  - [ ] `npx vitest run tests/floatingToolbar.test.ts` 不新增失败

  **QA Scenarios**:
  ```
  Scenario: 构建验证
    Tool: Bash
    Steps:
      1. bun run build
    Expected Result: exit code 0
    Evidence: 构建输出

  Scenario: 已有测试不回退
    Tool: Bash
    Steps:
      1. npx vitest run tests/floatingToolbar.test.ts
    Expected Result: 23 tests pass（或更多）
    Evidence: vitest 输出
  ```

  **Commit**: YES（与 T1 同组）
  - Message: `feat(toolbar): rebuild result panel DOM structure with 3-section layout`
  - Files: `entrypoints/floating-toolbar.content.ts`

---

- [ ] 3. T3: Header 逻辑连线 — 读取 action/model，动态填充 meta 文字

  **What to do**:
  在 `showResultLoading()`、`showResultContent()`、`showResultError()` 中，更新 header meta 文字。

  **Meta 文字规则**:
  ```typescript
  function getMetaText(action: string, model: string): string {
    const modelLabel = model || 'AI';
    if (action === 'translate') return `${modelLabel} · 自动检测 → 中文`;
    if (action === 'explain')   return `${modelLabel} · 💡 Explain`;
    if (action === 'rewrite')   return `${modelLabel} · ✏️ Rewrite`;
    return modelLabel;
  }
  ```

  **调用时机**:
  - `showResultLoading()` 内：用 `lastAction ?? ''` 和 `lastModelName`（新增状态变量）调用 `getMetaText`，写入 `#wps-result-meta` 的 textContent
  - `showResultContent(text, action, model)` — 函数签名扩展，接收 action 和 model
  - `browser.runtime.onMessage.addListener` 中接收 `TOOLBAR_INLINE_RESULT` 时，调用 `showResultContent(message.content, message.action, message.model)`

  **新增状态变量**（在文件顶部状态变量区域，紧跟 `lastSelectedText` 之后）:
  ```typescript
  let lastModelName: string = '';
  ```

  **在按钮 click handler 中**: `lastAction` 和 `lastSelectedText` 已在点击时设置，但 `lastModelName` 无法在内容脚本点击时获知（要等 background 返回结果）。因此:
  - `showResultLoading()` 时 meta 显示: `${lastAction ? getMetaText(lastAction, lastModelName) : 'AI'}` （lastModelName 此时可能是上一次的值，可接受）
  - `showResultContent(text, action, model)` 时: 更新 `lastModelName = model`，再调用 `getMetaText(action, model)` 更新 meta

  **Must NOT do**:
  - 不修改 DOM 结构（已在 T2 建立）
  - 不修改按钮点击处理逻辑
  - 不实现真实语言检测

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 sequential start
  - **Blocks**: F1
  - **Blocked By**: T1, T2

  **References**:
  - `entrypoints/floating-toolbar.content.ts:13-15` — 现有状态变量区（`lastAction`、`lastSelectedText`）
  - `entrypoints/floating-toolbar.content.ts:199-221` — 按钮 click handler（了解 lastAction 设置时机）
  - `entrypoints/floating-toolbar.content.ts:614-622` — onMessage listener（需扩展以读取 model 字段）

  **Acceptance Criteria**:
  - [ ] Explain action 后 meta 显示包含 `💡 Explain`
  - [ ] Translate action 后 meta 显示包含 `→ 中文`
  - [ ] Rewrite action 后 meta 显示包含 `✏️ Rewrite`
  - [ ] model 名正确显示（来自 TOOLBAR_INLINE_RESULT.model）
  - [ ] model 为空时显示 `AI` 作为 fallback
  - [ ] `bun run build` 通过

  **QA Scenarios**:
  ```
  Scenario: 构建验证
    Tool: Bash
    Steps: bun run build
    Expected Result: exit code 0
    Evidence: 构建输出
  ```

  **Commit**: YES（单独）
  - Message: `feat(toolbar): wire action/model info to result panel header`
  - Files: `entrypoints/floating-toolbar.content.ts`

---

- [ ] 4. T4: SVG 图标 + 交互行为（Logo、Thumbs、Copy）

  **What to do**:

  ### A. Logo SVG（插入到 `#wps-result-logo`）
  ```typescript
  const logoSvg = `<svg width="20" height="20" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="wps-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#818CF8"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#wps-logo-g)"/>
    <text x="16" y="23" font-family="-apple-system,BlinkMacSystemFont,sans-serif"
          font-size="20" font-weight="800" fill="white" text-anchor="middle">P</text>
  </svg>`;
  logoContainer.innerHTML = logoSvg;
  ```

  ### B. Thumbs Up SVG（插入到 `#wps-result-thumb-up`）
  ```typescript
  const thumbUpSvg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 6.5h2v7H2V6.5zm3.5-5.5a.5.5 0 01.5-.5h5.5L10 5h3a1 1 0 011 1v5a1 1 0 01-1 1H6a1 1 0 01-1-1V6L6.5 1H5.5z"
          fill="currentColor"/>
  </svg>`;
  thumbUpBtn.innerHTML = thumbUpSvg;
  ```

  ### C. Thumbs Down SVG（插入到 `#wps-result-thumb-down`）
  ```typescript
  const thumbDownSvg = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 9.5h-2v-7h2v7zm-3.5 5.5a.5.5 0 01-.5.5H4.5L6 11H3a1 1 0 01-1-1V5a1 1 0 011-1h7a1 1 0 011 1v5L9.5 15h1z"
          fill="currentColor"/>
  </svg>`;
  thumbDownBtn.innerHTML = thumbDownSvg;
  ```

  ### D. Copy SVG（插入到 `#wps-result-copy`）
  ```typescript
  const copySvgDefault = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="0" width="11" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <rect x="0" y="4" width="11" height="11" rx="2" fill="white" stroke="currentColor" stroke-width="1.5"/>
  </svg>`;
  const copySvgDone = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8l4 4 8-8" stroke="#22c55e" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`;
  copyBtn.innerHTML = copySvgDefault;
  ```

  ### E. Thumbs 互斥切换逻辑
  ```typescript
  let thumbsState: 'up' | 'down' | null = null;

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
  ```

  **在 `showResultLoading()` 中重置 thumbs**:
  ```typescript
  setThumbsState(null);  // 每次新 action 时重置
  ```
  注意：`setThumbsState` 需要在 `createResultPanel()` 作用域内定义（它引用 thumbUpBtn/thumbDownBtn）。
  `showResultLoading()` 无法直接调用它，需要将其暴露为 panel 对象的方法，或者在 panel 上存储引用：
  ```typescript
  (panel as any).__resetThumbs = () => setThumbsState(null);
  ```
  然后 `showResultLoading()` 中：
  ```typescript
  if (resultPanel && (resultPanel as any).__resetThumbs) {
    (resultPanel as any).__resetThumbs();
  }
  ```

  ### F. Copy 点击行为
  ```typescript
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(currentResultText);
    } catch {
      // fallback: execCommand
      const ta = document.createElement('textarea');
      ta.value = currentResultText;
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
  ```

  ### G. 各 icon button 基础样式
  ```typescript
  [thumbUpBtn, thumbDownBtn, copyBtn].forEach(btn => {
    Object.assign(btn.style, {
      width: '28px', height: '28px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: 'none', backgroundColor: 'transparent',
      borderRadius: '6px', cursor: 'pointer',
      color: '#94a3b8', outline: 'none',
      transition: 'color 0.15s, background-color 0.15s',
      padding: '0',
    });
    btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = 'rgba(0,0,0,0.05)'; });
    btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = 'transparent'; });
  });
  ```

  **Must NOT do**:
  - SVG 内容不使用 emoji
  - thumbs 不发送任何网络请求
  - 不使用外部 SVG 文件或 img 标签

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T3、T5 并行）
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: T2

  **References**:
  - `entrypoints/floating-toolbar.content.ts:229-369` — 被替换的旧 createResultPanel（参考结构）
  - `entrypoints/floating-toolbar.content.ts:321-328` — 现有 copy 点击逻辑（行为需保留）
  - `/Users/songjiayin/Leibaoxin/截图/pagemind_logo_A.png` — Logo 方案 A 视觉参考

  **Acceptance Criteria**:
  - [ ] Logo SVG 出现在 header 左侧，蓝紫渐变，20×20px
  - [ ] Thumbs Up/Down 为 SVG 图标，非 emoji
  - [ ] 点击 👍 后变蓝色，再次点击恢复灰色
  - [ ] 👍 激活时 👎 变半透明（opacity 0.4），反之亦然
  - [ ] Copy 为双方块 SVG，点击后变绿色对勾，1.5s 后恢复
  - [ ] Copy 有 try/catch + execCommand fallback
  - [ ] `bun run build` 通过

  **QA Scenarios**:
  ```
  Scenario: 构建验证
    Tool: Bash
    Steps: bun run build
    Expected Result: exit code 0
    Evidence: 构建输出

  Scenario: Thumbs 切换逻辑单元测试（手动描述）
    Agent 在完成代码后，手动 trace 以下场景的代码路径：
    - thumbsState=null → click up → thumbsState='up', thumbUpBtn.color='#6366F1'
    - thumbsState='up' → click up → thumbsState=null（toggle off）
    - thumbsState='up' → click down → thumbsState='down', thumbDownBtn.color='#6366F1'
    Expected Result: 每条路径符合描述
  ```

  **Commit**: YES（与 T3 同组或单独）
  - Message: `feat(toolbar): add SVG logo, thumbs feedback icons, copy icon with interactions`
  - Files: `entrypoints/floating-toolbar.content.ts`

---

- [ ] 5. T5: CSS 防污染硬化 + Loading 状态重设计 + 错误状态布局

  **What to do**:

  ### A. CSS 防宿主页污染
  在面板容器和 header、content、footer 的关键样式上加 `!important`：
  ```typescript
  // 在 panel 样式中，对字体相关属性加 !important
  panel.style.setProperty('font-family', '-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif', 'important');
  panel.style.setProperty('font-size', '14px', 'important');
  panel.style.setProperty('line-height', '1', 'important');
  panel.style.setProperty('box-sizing', 'border-box', 'important');
  // content area
  contentEl.style.setProperty('font-size', '14px', 'important');
  contentEl.style.setProperty('line-height', '1.75', 'important');
  contentEl.style.setProperty('color', '#1f2937', 'important');
  ```
  注意：`Object.assign(el.style, {...})` 不支持 `!important`，需改用 `el.style.setProperty('prop', 'val', 'important')`。

  ### B. Loading 状态重设计
  将当前 `⏳ Processing...` 文字替换为：旋转 SVG 圆环 + 文字
  ```typescript
  loadingEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
           style="animation:wps-spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" fill="none" stroke="#e2e8f0" stroke-width="2.5"/>
        <path d="M12 2 A10 10 0 0 1 22 12" fill="none" stroke="#6366F1" stroke-width="2.5"
              stroke-linecap="round"/>
      </svg>
      <span style="font-size:13px;color:#94a3b8;font-family:-apple-system,sans-serif;">AI 正在处理…</span>
    </div>
  `;
  ```
  需要在 panel 注入时添加 `@keyframes wps-spin`（一次性）：
  ```typescript
  if (!document.getElementById('wps-spin-style')) {
    const style = document.createElement('style');
    style.id = 'wps-spin-style';
    style.textContent = '@keyframes wps-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
  ```

  ### C. 错误状态布局重设计
  当前错误状态把 Retry 动态注入 action bar。新设计：
  - 错误时：在 `#wps-result-content` 中显示错误文字（红色，14px）
  - Footer 替换为错误操作行：隐藏 thumbs/copy，显示 Retry + Close 按钮
  ```typescript
  function showResultError(errorMsg: string): void {
    // ... existing panel check ...
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) {
      contentEl.style.display = 'block';
      contentEl.textContent = errorMsg;
      contentEl.style.setProperty('color', '#dc2626', 'important');
    }
    // Footer: hide thumbs and copy, show retry row
    const thumbsEl = resultPanel!.querySelector('#wps-result-thumbs') as HTMLElement;
    const copyEl   = resultPanel!.querySelector('#wps-result-copy')   as HTMLElement;
    if (thumbsEl) thumbsEl.style.display = 'none';
    if (copyEl)   copyEl.style.display = 'none';
    // create or show retry button (in footer right side)
    let retryBtn = resultPanel!.querySelector('#wps-result-retry') as HTMLButtonElement;
    if (!retryBtn) {
      retryBtn = document.createElement('button');
      retryBtn.id = 'wps-result-retry';
      retryBtn.textContent = '重试';
      Object.assign(retryBtn.style, {
        marginLeft: 'auto', padding: '5px 14px',
        backgroundColor: '#6366F1', color: 'white',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        fontSize: '12.5px', fontWeight: '600', outline: 'none',
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
      footer!.appendChild(retryBtn);
    }
    retryBtn.style.display = 'flex';
    if (footer) footer.style.display = 'flex';
    if (resultPanel) resultPanel.style.display = 'flex';
  }
  ```
  在 `showResultContent()` 中，恢复 thumbs/copy 的显示并隐藏 retry：
  ```typescript
  const thumbsEl = resultPanel!.querySelector('#wps-result-thumbs') as HTMLElement;
  const copyEl   = resultPanel!.querySelector('#wps-result-copy')   as HTMLElement;
  const retryBtn = resultPanel!.querySelector('#wps-result-retry')  as HTMLElement;
  if (thumbsEl) thumbsEl.style.display = 'flex';
  if (copyEl)   copyEl.style.display = 'flex';
  if (retryBtn) retryBtn.style.display = 'none';
  ```

  ### D. 删除 `hideTimeout` 死代码
  `let hideTimeout: NodeJS.Timeout | null = null;` 已声明但从未使用。从文件中删除该变量声明。

  **Must NOT do**:
  - 不修改面板的定位逻辑
  - 不修改工具栏按钮

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES（与 T3、T4 并行）
  - **Parallel Group**: Wave 2
  - **Blocks**: F1
  - **Blocked By**: T2

  **References**:
  - `entrypoints/floating-toolbar.content.ts:11` — `hideTimeout` 死代码位置
  - `entrypoints/floating-toolbar.content.ts:257-268` — 现有 loadingEl 文字实现
  - `entrypoints/floating-toolbar.content.ts:425-492` — 现有 `showResultError()` 完整实现
  - `entrypoints/floating-toolbar.content.ts:394-420` — 现有 `showResultContent()` 完整实现

  **Acceptance Criteria**:
  - [ ] Loading 状态显示旋转 SVG 圆环 + "AI 正在处理…" 文字
  - [ ] 错误状态 footer 隐藏 thumbs/copy，显示蓝色实心"重试"按钮
  - [ ] 结果显示时 thumbs/copy 正常显示
  - [ ] `hideTimeout` 变量已从文件中删除
  - [ ] `bun run build` 通过

  **QA Scenarios**:
  ```
  Scenario: 构建验证
    Tool: Bash
    Steps: bun run build
    Expected Result: exit code 0
    Evidence: 构建输出

  Scenario: 无 hideTimeout 引用
    Tool: Bash
    Steps: grep -n "hideTimeout" entrypoints/floating-toolbar.content.ts
    Expected Result: 无输出（变量已删除）
    Evidence: grep 输出为空
  ```

  **Commit**: YES
  - Message: `feat(toolbar): redesign loading/error states, add CSS host-page isolation`
  - Files: `entrypoints/floating-toolbar.content.ts`

---

## Final Verification Wave

- [ ] F1. **构建 + 测试验证** — `quick`
  运行 `bun run build` 和 `npx vitest run`。
  - 构建 exit code 0
  - vitest: 仅允许既有的 `openai.test.ts` 中 1 个失败，其余全部通过
  - 检查 `floating-toolbar.js` 输出文件大小合理（预期 15–25 kB）
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F2. **代码质量检查** — `unspecified-high`
  读取最终的 `entrypoints/floating-toolbar.content.ts`，检查：
  - 无 Tailwind className
  - 无未处理的 emoji（所有图标为 SVG）
  - `hideTimeout` 已删除
  - Close 按钮逻辑完整（cancel-in-flight + hideResultPanel + hideToolbar）
  - Copy 有 try/catch fallback
  - Thumbs 不触发任何 network 请求
  Output: `Checks [N/N pass] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

1. `feat(types): add model field to TOOLBAR_INLINE_RESULT message` — `utils/types.ts`, `entrypoints/background.ts`
2. `feat(toolbar): rebuild result panel DOM structure with 3-section layout` — `entrypoints/floating-toolbar.content.ts`
3. `feat(toolbar): wire action/model info to result panel header` — `entrypoints/floating-toolbar.content.ts`
4. `feat(toolbar): add SVG logo, thumbs feedback icons, copy icon with interactions` — `entrypoints/floating-toolbar.content.ts`
5. `feat(toolbar): redesign loading/error states, add CSS host-page isolation` — `entrypoints/floating-toolbar.content.ts`

---

## Success Criteria

```bash
bun run build       # ✔ Built extension in <1s
npx vitest run      # 207+ tests pass, 1 known fail (openai.test.ts)
grep -n "className\|tw-" entrypoints/floating-toolbar.content.ts  # no output
grep -n "hideTimeout" entrypoints/floating-toolbar.content.ts     # no output
grep -n "📋\|⏳\|🔄" entrypoints/floating-toolbar.content.ts     # no output (emoji replaced by SVG)
```

### Final Checklist
- [ ] Header 三要素：Logo（SVG 渐变 P）+ meta 文字 + Close 按钮
- [ ] meta 文字随 action 类型正确变化
- [ ] model 名显示正确（来自 TOOLBAR_INLINE_RESULT.model 字段）
- [ ] Footer 左 thumbs（SVG）+ 右 copy（SVG），互斥切换
- [ ] Copy 点击变绿色对勾，1.5s 恢复
- [ ] 错误状态：footer 替换为蓝色"重试"按钮
- [ ] Loading 状态：旋转 SVG 圆环
- [ ] `hideTimeout` 死代码已删除
- [ ] 全白背景，无渐变
- [ ] 所有既有行为（cancel、retry、resultPanelVisible）完整保留
