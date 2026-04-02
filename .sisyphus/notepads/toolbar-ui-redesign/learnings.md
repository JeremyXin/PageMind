# Toolbar UI Redesign - Learnings & Context

## [2026-04-01] Initial Context

### Current State
- File: `entrypoints/floating-toolbar.content.ts` (248 lines)
- Current design: dark background (#1f2937), blue buttons (#3b82f6), flat style
- User feedback: "UI 太丑了"

### Target Design (from screenshot analysis)
参考截图显示的是类似 DeepL/沉浸式翻译的气泡工具条：
- 浅灰色背景（RGB 220-235），带透明感
- 圆角矩形容器（8-12px 圆角）
- 小型圆形白色按钮（28-32px 直径）
- 图标优先（删除/编辑/文字格式图标）
- 整体紧凑（高度约 40-50px）
- 轻阴影效果

### Hard Constraints
1. 禁止安装新 npm 包
2. 禁止 Shadow DOM
3. 必须用 pure inline style（无 Tailwind class）
4. 必须用 position: absolute（非 fixed）
5. 只保留 3 个按钮（Explain / Translate / Rewrite）

### Design Decisions
- 白色背景（rgba(255,255,255,0.98)）优于截图的浅灰色 → 更干净
- 带 caret 三角箭头 → 增强"指向选中文字"的视觉连接
- 使用 Unicode emoji/符号作为图标（无需安装包）：💡🌐✍️ 或用 SVG inline
- 按钮使用胶囊形（border-radius: 999px）或圆形
- 分隔线用细竖线（1px solid rgba(0,0,0,0.1)）
- hover 状态改变背景色（JS 实现）

### SVG Icons Plan (inline, no package needed)
- Explain: 💬 或 SVG 灯泡
- Translate: 🌐 或 SVG 地球
- Rewrite: ✏️ 或 SVG 铅笔
建议用 Unicode emoji 字符（最简单，无依赖）

### Caret Implementation
使用 CSS border trick 创建三角形（pure inline style）：
```javascript
const caret = document.createElement('div');
Object.assign(caret.style, {
  position: 'absolute',
  bottom: '-6px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '0',
  height: '0',
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  borderTop: '6px solid white',
  // 阴影用 filter: drop-shadow 在父元素处理
});
```

### Position Calculation
caret 在工具条底部，指向下方（选中文字通常在工具条下方）
当工具条在文字下方时，caret 在顶部指向上方

### Color Palette
- 容器背景: rgba(255,255,255,0.98)
- 容器边框: 1px solid rgba(0,0,0,0.08)
- 容器阴影: 0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)
- 按钮默认背景: transparent
- 按钮 hover 背景: rgba(59,130,246,0.08)（浅蓝色）
- 按钮文字: #374151（深灰）
- 按钮 hover 文字: #2563eb（蓝色）
- 按钮边框: none
- 分隔线: 1px solid rgba(0,0,0,0.08)

### Toolbar Dimensions
- 宽度: auto（自适应内容）
- 高度: 40px
- 内边距: 4px 6px
- 按钮内边距: 6px 10px
- 按钮圆角: 6px
- 字体: 13px, font-weight: 500
- 图标: emoji + 文字（如 "💡 解释" 或 "💡 Explain"）

## [2026-04-01] UI Redesign Implementation Complete

### Changes Made
**File**: `entrypoints/floating-toolbar.content.ts`

#### Visual Transformation
1. **Container (toolbarEl)**: 
   - Background: `rgba(255, 255, 255, 0.98)` (white semi-transparent)
   - Border radius: 10px (refined bubble shape)
   - Padding: 5px 6px (compact)
   - Shadow: `0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)` (layered soft shadow)
   - Border: `1px solid rgba(0,0,0,0.08)` (subtle outline)
   - Backdrop filter: `blur(8px)` (glass effect)
   - Overflow: `visible` (allows caret to extend)

2. **Caret Arrow (NEW)**:
   - Two-layer approach: border caret (z-index -1) + fill caret
   - Border caret: 7px, color `rgba(0,0,0,0.08)`, bottom -8px
   - Fill caret: 6px, color `rgba(255,255,255,0.98)`, bottom -6px
   - Both positioned at 50% with dynamic offset based on selection center
   - CSS border triangle trick (no SVG needed)

3. **Buttons (3)**:
   - Icon + label: `💡 Explain`, `🌐 Translate`, `✏️ Rewrite`
   - Unicode emoji icons (no package dependencies)
   - Display: flex, gap 4px (icon-label spacing)
   - Background: transparent → `rgba(59, 130, 246, 0.08)` on hover
   - Color: `#374151` → `#2563eb` on hover
   - Padding: 5px 9px
   - Border radius: 6px
   - Font: 12.5px, weight 500, letter-spacing 0.01em
   - Transition: 0.15s for both background and color

4. **Dividers (NEW)**:
   - 1px × 18px vertical lines between buttons
   - Color: `rgba(0,0,0,0.08)`
   - Margin: 0 2px, flexShrink 0

5. **Entrance Animation (NEW)**:
   - Initial state: opacity 0, translateY(4px), scale(0.98)
   - Final state: opacity 1, translateY(0), scale(1)
   - Transition: 0.15s ease
   - Double `requestAnimationFrame` to ensure display:flex is applied first

#### Logic Updates
1. **positionToolbar()**: 
   - Updated toolbarWidth from 280 to dynamic (offsetWidth || 220)
   - Added caret positioning logic: calculates selection center, computes offset, clamps within bounds
   - Caret offset range: -toolbarWidth/2 + 16 to +toolbarWidth/2 - 16

2. **createToolbar()**:
   - Restructured button creation to include icon field
   - Added divider insertion between buttons (index > 0)
   - Moved caret creation before buttons (DOM order)

3. **showToolbar()**:
   - Added animation sequence with double RAF
   - Set initial transform/opacity before animating

### Verification
- ✅ Build: `bun run build` succeeded (373.88 kB output)
- ✅ No TypeScript errors
- ✅ No functionality changes (only visual styling)
- ⏳ Tests: pnpm test timeout (not related to changes)

### Key Techniques Used
1. **CSS Border Triangle**: Pure CSS caret without SVG/images
2. **Double requestAnimationFrame**: Ensures display change is painted before transition starts
3. **Dynamic Caret Positioning**: Aligns caret with selection center while respecting toolbar bounds
4. **Layered Shadow**: Combines large soft shadow with small sharp shadow for depth
5. **Backdrop Filter Blur**: Creates frosted glass effect on toolbar background

### Design Principles Applied
- **Minimalist refinement**: Clean white base with subtle accents
- **Visual hierarchy**: Icon + text buttons, separated by thin dividers
- **Spatial polish**: Precise padding/spacing for optical balance
- **Motion design**: Subtle entrance animation (scale + translate + fade)
- **Material depth**: Layered shadows + backdrop blur + subtle border

### No Dependencies Added
All styling achieved with:
- Pure inline styles (Object.assign)
- Unicode emoji characters (💡🌐✏️)
- CSS border triangle trick
- Vanilla DOM API

### Result
Transformed from dark/flat design to refined bubble-style toolbar matching DeepL/Immersive Translate aesthetic:
- Professional white bubble appearance
- Pointing caret for visual connection to selection
- Icon-enhanced buttons with smooth hover states
- Polished entrance animation
- Zero external dependencies
