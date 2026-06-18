# templateDetail 液态玻璃适配设计

## 概述
为 `templateDetail.vue` 中的 `custom-color-card`（自定义颜色弹窗）和 `animate-pop`（弹入动画）添加液态玻璃（glassmorphism）风格支持。

## 改动范围
只修改一个文件：`static/css/liquid-glass.css`

## 设计细节

### 1. `.custom-color-card` 玻璃化
在 `liquid-glass.css` 的 `templateDetail.vue` 覆盖段追加规则：
- **light 模式**：半透明白玻璃 `rgba(255,255,255,0.55)` + blur(16px) saturate(160%)，与 `color-picker-card` 一致
- **通用**：使用 `--glass-bg` CSS 变量 + blur(12px) saturate(140%) + 玻璃边框/阴影

### 2. 分隔线适配
`.custom-header::after` 颜色改为 `var(--glass-border)`

### 3. 输入框（`.modern-input`）玻璃化
应用 `glass-input` 风格的背景/边框/阴影

### 4. 取消按钮（`.btn-cancel`）玻璃化
使用 `var(--glass-btn-bg)` + 玻璃边框/阴影

### 5. 预览色块边框适配
`.preview-box` 边框改为 `var(--glass-border)`

### 6. 遮罩层（`.color-popup-overlay`）玻璃化
- light：`rgba(0,0,0,0.15)` + blur(12px)
- dark：`rgba(0,0,0,0.35)` + blur(12px)

### 7. `animate-pop` 动画增强
新的 popIn keyframes：
- 时长 0.4s，缓动 `cubic-bezier(0.16, 1, 0.3, 1)`（带轻微过冲）
- 起始缩放 0.92，中间过冲到 1.02，最终回弹到 1
- blur 从 24px → 16px 渐进过渡

## 不变项
- `templateDetail.vue` 无需修改
- 确认添加按钮保持原有蓝色渐变
