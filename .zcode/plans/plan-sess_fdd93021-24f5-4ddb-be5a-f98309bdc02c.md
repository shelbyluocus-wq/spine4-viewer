# spine4-viewer 四项改进计划

## 根因分析

1. **放大后底部看不见**：缩放滑条同时做两件事——改变 `.spine-player` 的 CSS 尺寸（居中放大 + 180ms 过渡）和按 `previewScale` 缩小世界视口。画布元素居中向下顶满时，角色下半身被 `.stage-frame` 的 `overflow: hidden` 裁掉；且视口换算基于过渡中途测得的画布尺寸。两个"缩放"叠加导致结果不可预测，又没有平移手段补救。
2. **动画下沉**：切换动画/皮肤时从不重置 Spine 4.2 物理约束。`PhysicsConstraint` 的 `yOffset/yVelocity` 跨动画、跨皮肤持续保留并受重力持续累积，表现为角色整体下坠/沉底（spine-core.mjs:6862-6930 已确认）。修复：切换后调用 `skeleton.updateWorldTransform(Physics.reset)`（reset 后 fall-through 到 update，语义安全）。
3. **背景色**：canvas 全透明（clearColor '00000000'），可见背景全是 `.stage-frame` 的 CSS 渐变，因此改 CSS 即可，无需动 GL。

## 实施方案

### A. 视图系统重构（修问题 2 + 支持问题 4）
- `src/shared/playerViewport.ts`：
  - `createAnchorLockedViewport(canvasSize, scale)` 保持锚点语义（世界原点固定在画布水平中心、自顶部 77.64% 处），新增可选 pan 参数或新增 `createPannableViewport(canvasSize, { scale, panX, panY })`：`x = base.x + panX, y = base.y + panY`。
  - 新增纯函数 `zoomAtScreenPoint(canvasSize, view, screenPoint, nextScale)`：滚轮缩放时保持光标下世界坐标不动（这才是真正意义上的"固定住起点"）；新增 `panByPixels(...)` 拖拽换算（含 y 轴翻转）。
  - 新增 `resetSkeletonPhysics(player)`：调 `skeleton.updateWorldTransform(Physics.reset)`。
- `src/main.ts`：
  - state 增加 `panX/panY`；滑条缩放只改 scale、保持 pan（缩放围绕锚点=角色原点，起点固定不动）。
  - 在 `#stage-frame` 上接管指针事件：按住左键拖动 → 更新 pan → 重装视口（`setPointerCapture`，拖动中 cursor: grabbing）。
  - 新增滚轮缩放（围绕鼠标位置，clamp 0.5–2.5，与滑条双向同步）、双击舞台 = 重置视图。
  - 新增"重置视图"按钮（pan=0、scale=1）；加载新资源时自动重置视图。
- `src/style.css`：`.stage-host > .spine-player` 改为 `width/height: 100%` 铺满舞台（删除 CSS 尺寸缩放、180ms 过渡和 980px 媒体查询里的覆盖）；删除 `--preview-width/height`；`.stage-frame` 加 `cursor: grab` + `touch-action: none`。
- `src/shared/previewLayout.ts`：删除 `getPreviewLayoutStyle`（CSS 尺寸缩放逻辑随之作废），保留 `getPlayerBackgroundColor`。

> 附带效果：scale=1 时角色会比现在稍大一点（旧方案画布只占舞台 72%×84%，新方案铺满舞台），能放下的内容只会更多不会被裁；滑条数值从此与实际放大倍数一一对应。

### B. 背景色调节（问题 1）
- 右侧控制面板新增"背景"控件块：预设色板（默认 / 白 / 浅灰 / 深灰 / 黑）+ `<input type="color">` 自定义。
- 实现：`stageFrame.dataset.bgMode = 'default' | 'custom'` + `--stage-bg` CSS 变量；CSS 中 `[data-bg-mode='custom']` 用纯色覆盖渐变并隐藏 `.stage-backdrop`/`.stage-grid` 装饰层。选"默认"即还原。用 localStorage 记住选择。

### C. 下沉 bug 修复（问题 3）
- `applyAnimation()` 和 `applySkin()` 在切换后调用 `resetSkeletonPhysics`，清空物理偏移/速度残留。

### D. 测试
- `playerViewport.test.ts`：新增 pan 偏移、zoomAtScreenPoint 光标点不变、拖拽方向/符号、resetSkeletonPhysics 调用的用例；现有用例保持通过。
- `previewLayout.test.ts`：删除 `getPreviewLayoutStyle` 相关用例。

### 验证
- `npm test` 全绿；`npm run build` 通过；启动 `npm run dev` 手动验证：滚轮/滑条缩放时角色原点或光标点不漂移、拖动自由移动、放大到底部可拖回、切动画不再下沉、背景切换即时生效且重启后保留。