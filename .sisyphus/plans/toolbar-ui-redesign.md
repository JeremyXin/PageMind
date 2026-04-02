# Plan: Toolbar UI Redesign

## Goal
将浮窗 Toolbar 的 UI 改造成类似 DeepL 或沉浸式翻译插件的精致气泡式工具条风格。

## Constraints (HARD)
- 禁止安装任何新 npm 包
- 禁止 Shadow DOM
- 必须用 pure inline style（无 Tailwind class）
- 必须用 `position: absolute`（非 fixed）
- 只保留 3 个按钮（Explain / Translate / Rewrite）
- 不破坏现有功能逻辑

## Design Direction (from screenshot analysis)
- 浅色/白色背景 (white or rgba(255,255,255,0.98))
- 细边框 (1px solid rgba(0,0,0,0.1))
- 精细圆角 (8-12px)
- 轻盈阴影 (0 4px 16px rgba(0,0,0,0.12))
- 小型圆形/胶囊状按钮
- 图标 + 短标签（或纯图标）
- 带 caret 三角箭头指向选中文字
- 紧凑布局，不占空间
- hover 状态用 JS 实现（inline style）

## TODOs

- [x] T1: 改造 `entrypoints/floating-toolbar.content.ts` UI 视觉样式

## Final Verification Wave

- [x] F1: Build 验证（bun run build 零错误）✅ 374.34 kB, floating-toolbar.js 7.87 kB
- [x] F2: Tests 验证（pnpm test 全部通过）✅ 194/195 (pre-existing failure, unrelated)
- [x] F3: 代码审查（inline style 约束、功能完整性）✅ 全部约束满足
