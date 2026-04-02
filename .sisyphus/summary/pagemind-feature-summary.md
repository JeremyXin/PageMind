# PageMind 功能与特性总览

> 文档生成日期：2026-04-02  
> 版本：0.0.1  
> 技术栈：WXT + React + TypeScript + Tailwind CSS（Side Panel）+ 纯 Inline Style（Floating Toolbar）

---

## 一、产品概览

PageMind 是一款 AI 驱动的 Chrome 扩展，让用户无需离开当前页面即可对网页内容进行摘要、翻译、解释和改写。核心理念是"零切换、即时处理"——选中文字、打开侧边栏，AI 即刻响应。

---

## 二、核心功能模块

### 2.1 浮动工具栏（Floating Toolbar）

**触发方式**：在任意网页上选中 ≥3 个字符的文本后，工具栏自动弹出于选区上方。

**三个操作按钮**：

| 按钮 | 功能 | AI Prompt |
|------|------|-----------|
| 💡 Explain | 详细解释选中文本 | `Explain the following text in detail` |
| 🌐 Translate | 将选中文本翻译为中文 | `Translate the following text to Chinese` |
| ✏️ Rewrite | 改写选中文本，保留原意 | `Rewrite and improve the following text while preserving its meaning` |

**智能定位**：
- 默认显示于选区上方，带小三角箭头指向选区中心
- 左右边界检测：超出视口时自动贴边
- 顶部边界检测：空间不足时自动移到选区下方

**禁用场景**：
- 输入框（`<input>`）、文本域（`<textarea>`）、`contenteditable` 元素内不显示
- Chrome 内部页面（`chrome://`）不注入

---

### 2.2 内联结果面板（Inline Result Panel）

点击工具栏按钮后，AI 结果直接显示在工具栏下方气泡中，**无需打开侧边栏**。

**三段式布局**：

```
┌─────────────────────────────────────┐  ← 340px 宽，最大高度 340px
│  [P]  gpt-4o · 💡 Explain      [✕] │  ← Header（44px）
├─────────────────────────────────────┤
│  AI 返回的结果文字...               │  ← Content（最大 220px，可滚动）
│  （14px，行高 1.75）                │
├─────────────────────────────────────┤
│  [👍] [👎]              [⧉ Copy]  │  ← Footer（40px）
└─────────────────────────────────────┘
```

**Header 详情**：
- **Logo**：渐变 P 字母 SVG（`#6366F1 → #818CF8`，圆角 8px，20×20px）
- **Meta 文字**（动态，随 action 变化）：
  - Translate：`gpt-4o · 自动检测 → 中文`
  - Explain：`gpt-4o · 💡 Explain`
  - Rewrite：`gpt-4o · ✏️ Rewrite`
- **关闭按钮**：✕，点击同时取消进行中的 AI 请求（AbortController）

**Footer 交互**：
- **👍 / 👎 Thumbs**：SVG 图标，互斥切换（激活变蓝 `#6366F1`，另一个变半透明 0.4）；纯 UI 状态，不发送任何网络请求
- **⧉ Copy**：双方块 SVG 图标；点击后变绿色对勾（`#22c55e`），1.5 秒后恢复；含 `execCommand` fallback 兼容性处理

**状态机**：

| 状态 | 显示内容 |
|------|----------|
| Loading | 旋转 SVG 圆环 + "AI 正在处理…"文字 |
| Success | 结果文字 + 完整 Footer（Thumbs + Copy） |
| Error | 红色错误信息 + Footer 替换为蓝色"重试"按钮（隐藏 Thumbs/Copy） |

**并发保护**：每个 Tab 维护独立的 `AbortController`，新请求自动取消旧请求（`activeInlineAbortControllers Map`）。

**CSS 隔离**：面板使用 `position: absolute`，关键样式通过 `style.setProperty('prop', 'val', 'important')` 防止宿主页 CSS 污染。

---

### 2.3 侧边栏 AI 对话（Side Panel Chat）

**打开方式**：点击 Chrome 工具栏中的 PageMind 图标，侧边栏自动打开。

**功能特性**：

#### 流式对话
- 使用 Chrome 长连接 Port（`chrome.runtime.connect({ name: 'chat-stream' })`）实现实时流式输出
- AI 回复逐字符渲染，体验接近 ChatGPT
- 最多保留最近 50 条历史消息作为上下文

#### 页面上下文感知
- 通过 `/summarize` 命令获取页面摘要后，AI 自动以摘要内容作为 system prompt 的一部分
- 验证当前 Tab URL 与上下文 URL 一致性，防止跨页面污染

#### 右键菜单接入
- 右键选中文本 → Explain / Translate / Rewrite → 结果发送到侧边栏聊天

---

### 2.4 斜杠命令系统（Slash Commands）

在聊天输入框中输入 `/` 触发命令选择器。支持键盘上下键导航 + Enter 确认，也可继续输入字母过滤。

**完整命令列表**：

| 命令 | 功能描述 | 触发内容 |
|------|----------|----------|
| `/summarize` | 总结当前页面 | 提取页面全文 → AI 生成结构化摘要 |
| `/translate` | 翻译页面内容为中文 | 提取页面全文 → AI 翻译 |
| `/rewrite` | 改写页面内容 | 提取页面全文 → AI 改写，更清晰易读 |
| `/shorter` | 精简页面内容 | 提取页面全文 → 只保留核心要点 |
| `/longer` | 扩写页面内容 | 提取页面全文 → 增加详细说明和示例 |
| `/eli5` | 简单语言解释 | 提取页面全文 → 像向5岁孩子解释 |
| `/pros-cons` | 优缺点分析 | 提取页面全文 → 列出主要话题的利弊 |
| `/actions` | 提取行动事项 | 提取页面全文 → 输出待办清单和可执行建议 |
| `/clear` | 清空当前会话 | 清除所有消息记录 |
| `/new` | 开始新会话 | 创建新 session，保留旧 session |
| `/help` | 显示帮助 | 输出所有可用命令列表 |

---

### 2.5 页面摘要（Page Summarization）

**结构化输出**（`SummaryResult`）：
```typescript
{
  summary: string;        // 主要摘要段落
  keyPoints: string[];    // 关键要点列表
  viewpoints: Viewpoint[];  // 多方观点（perspective + stance）
  bestPractices: string[];  // 最佳实践或建议
}
```

**触发方式**：
1. `/summarize` 斜杠命令
2. 右键菜单中的 Summarize 选项

**错误处理**：
- `chrome://` 等内部页面：返回 `UNSUPPORTED_PAGE` 错误，友好提示
- 无 API Key：拦截在 background 层，提示配置
- 内容脚本未注入：自动尝试 `scripting.executeScript` 重新注入

---

### 2.6 会话历史与搜索（Session History & Search）

**存储机制**：`chrome.storage.local`，键值为 `chatSessions` + `activeChatSessionId`

**会话限制**：
- 最多 50 个会话（`MAX_SESSIONS = 50`）
- 每个会话最多 100 条消息（`MAX_MESSAGES_PER_SESSION = 100`）
- 超出上限时自动删除最旧的会话

**会话自动命名**：基于首条消息内容自动生成会话标题

**全局搜索**：
- 关键词搜索所有会话的所有消息
- 返回 `SearchResult`：包含 sessionId、消息内容、匹配位置（matchIndex）
- 搜索 UI 集成在侧边栏顶部（SearchBar 组件）
- 点击搜索结果可直接切换到对应会话

**会话列表**（SessionList 组件）：展示所有历史会话，支持一键切换

**对话导出**：
- 点击侧边栏顶部 📥 图标
- 导出格式：纯文本（`.txt`），包含每条消息的角色标签和时间戳
- 文件名格式：`chat-export-YYYY-MM-DD.txt`

---

### 2.7 设置（Settings）

**设置项**：

| 字段 | 说明 | 默认值 |
|------|------|--------|
| API Key | OpenAI 兼容 API 密钥 | 空 |
| Base URL | API 端点 URL | `https://api.openai.com/v1` |
| Model | 模型名称 | `gpt-4o-mini` |

**连接测试**：
- 先尝试 `GET /models` 端点（标准 OpenAI 兼容检测）
- 若返回 404，回退到 `POST /chat/completions` 发送最小请求（max_tokens=1）
- 超时设置：15 秒
- 支持 Base URL 自定义，兼容所有 OpenAI API 格式的第三方提供商（如 DeepSeek、Moonshot 等）

**错误码分类**：`INVALID_API_KEY` / `WRONG_URL` / `NETWORK_ERROR` / `SERVER_ERROR` / `UNKNOWN`

---

## 三、技术架构

### 3.1 Extension 架构（Manifest V3）

```
Chrome Extension (MV3)
├── background.ts           ← Service Worker，处理所有消息路由和 AI 请求
├── content.ts              ← 内容提取脚本（EXTRACT_CONTENT 消息处理）
├── floating-toolbar.content.ts  ← 浮动工具栏 + 内联结果面板
├── sidepanel/              ← React 侧边栏应用
│   ├── App.tsx
│   └── components/
│       ├── ChatPanel.tsx   ← 主对话组件（流式 + 斜杠命令 + 会话管理）
│       ├── ChatInput.tsx   ← 带斜杠命令自动补全的输入框
│       ├── ChatMessage.tsx ← 消息气泡渲染
│       ├── SearchBar.tsx   ← 全局搜索 + 会话列表
│       ├── SessionList.tsx ← 历史会话列表
│       └── SettingsModal.tsx ← 设置弹窗（API Key / Base URL / Model）
└── options/                ← 扩展选项页（独立 HTML 页面）
```

### 3.2 消息系统

**消息类型全表**：

| 消息类型 | 方向 | 用途 |
|----------|------|------|
| `EXTRACT_CONTENT` | SidePanel/BG → ContentScript | 提取页面全文 |
| `EXTRACT_AND_SUMMARIZE` | SidePanel → Background | 提取+摘要一体化 |
| `SUMMARIZE` | Background 内部 | 执行摘要生成 |
| `TEST_CONNECTION` | SidePanel → Background | 测试 API 连通性 |
| `CHAT_SEND` | SidePanel → Background (Port) | 发送聊天消息 |
| `CHAT_STREAM_CHUNK` | Background → SidePanel (Port) | 流式输出块 |
| `CHAT_STREAM_END` | Background → SidePanel (Port) | 流式输出结束 |
| `CHAT_STREAM_ERROR` | Background → SidePanel (Port) | 流式输出错误 |
| `TOOLBAR_INLINE_ACTION` | ContentScript → Background | 触发浮窗 AI 操作 |
| `TOOLBAR_INLINE_RESULT` | Background → ContentScript | 返回 AI 结果（含 model 字段） |
| `TOOLBAR_INLINE_ERROR` | Background → ContentScript | 返回错误信息 |
| `TOOLBAR_INLINE_CANCEL` | ContentScript → Background | 取消进行中的请求 |
| `CONTEXT_MENU_ACTION` | Background → SidePanel | 右键菜单操作转发 |

**两种通信模式**：
- **请求-响应**：`chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`（一次性操作）
- **长连接流式**：`chrome.runtime.connect({ name: 'chat-stream' })`（AI 聊天流）

### 3.3 AI Provider 层

```
providers/
├── ai-provider.ts   ← AIProvider 接口定义
├── openai.ts        ← OpenAIProvider（摘要功能，非流式）
├── chat.ts          ← ChatProvider（聊天 + 浮窗，流式 AsyncGenerator）
└── prompts.ts       ← 摘要系统 Prompt
```

**ChatProvider** 实现 `async *chat()` 异步生成器，通过 SSE 流式读取 API 响应，支持 `AbortSignal` 取消。

**OpenAIProvider** 实现 `summarize()` 非流式调用，返回结构化 `SummaryResult`。

### 3.4 数据存储

```
utils/
├── storage.ts       ← 设置存储（apiKey, baseUrl, model）
├── chatStorage.ts   ← 会话存储（CRUD + 搜索 + 清理）
├── schemas.ts       ← Zod 数据验证 schema
└── sessionTitle.ts  ← 会话自动命名逻辑
```

存储后端：`chrome.storage.local`（通过 `wxt/browser` 封装）

### 3.5 权限声明

```json
{
  "permissions": ["sidePanel", "storage", "activeTab", "scripting", "contextMenus"],
  "host_permissions": ["https://api.openai.com/*", "https://*/*", "http://localhost/*"]
}
```

---

## 四、代码规模与测试

### 文件行数统计（主要文件）

| 文件 | 行数 | 职责 |
|------|------|------|
| `sidepanel/components/ChatPanel.tsx` | 715 | 侧边栏主组件 |
| `entrypoints/floating-toolbar.content.ts` | 747 | 浮窗 + 内联结果面板 |
| `entrypoints/background.ts` | 459 | Service Worker 消息路由 |
| `utils/chatStorage.ts` | 183 | 会话存储管理 |
| `utils/types.ts` | 222 | 全局类型定义 |

### 测试覆盖

| 测试文件 | 覆盖范围 |
|----------|----------|
| `tests/floatingToolbar.test.ts` | 浮窗 + 结果面板（23 tests） |
| `tests/background.test.ts` | Background 消息处理 |
| `providers/chat.test.ts` | ChatProvider 流式输出 |
| `providers/openai.test.ts` | OpenAIProvider 摘要（1 known fail） |
| `utils/chatStorage.test.ts` | 会话 CRUD |
| `utils/chatStorage.search.test.ts` | 全局搜索 |
| `utils/storage.test.ts` | 设置存储 |
| `utils/schemas.test.ts` | Zod schema 验证 |
| `utils/extractor.test.ts` | 内容提取 |
| `utils/formatSummary.test.ts` | 摘要格式化 |
| `utils/sessionTitle.test.ts` | 会话命名 |
| `utils/actionPrompts.test.ts` | 操作 Prompt 生成 |
| `sidepanel/components/*.test.tsx` | UI 组件测试 |
| `messaging/messages.test.ts` | 消息发送工具 |
| `integration/flow.test.ts` | 端到端集成测试 |

**测试框架**：Vitest + jsdom

---

## 五、已完成的迭代计划

按开发顺序（`.sisyphus/plans/` 记录）：

| 计划 | 内容 |
|------|------|
| `webpage-summary-extension.md` | 初始版本：摘要 + 内容提取 + OpenAI 接入 |
| `chat-feature.md` | 侧边栏 AI 对话（流式）+ 会话管理 |
| `context-and-persistence.md` | 页面上下文感知 + 会话持久化 |
| `chat-first-redesign.md` | 侧边栏 UI 重设计（Chat-first 布局） |
| `slash-commands-and-floating-toolbar.md` | 斜杠命令系统 + 浮动工具栏 |
| `search-history-enhancement.md` | 全局搜索 + 会话历史增强 |
| `toolbar-ui-redesign.md` | 工具栏 UI 视觉优化 |
| `readme-and-rename.md` | 项目重命名为 PageMind + README 更新 |
| `inline-result-panel.md` | 内联结果面板（DeepL 风格，不打开侧边栏） |
| `result-panel-ui-redesign.md` | 结果面板三段式 UI 精美改版（最新） |

---

## 六、当前已知限制

| 限制 | 说明 |
|------|------|
| 单语言翻译 | Translate 固定翻译为中文，不支持目标语言选择 |
| 无实时流式渲染（浮窗） | 浮窗结果为全量显示，不逐字符渲染 |
| 无深色模式 | 界面仅支持浅色主题 |
| 无 ARIA / 键盘导航（浮窗） | 结果面板无无障碍支持 |
| Thumbs 无数据持久化 | 点赞/踩仅为纯 UI 状态，刷新后重置 |
| 语言检测静态 | Translate 显示"自动检测 → 中文"，未实际检测源语言 |
| openai.test.ts 1 个已知失败 | 与 mock 配置相关，不影响功能 |
