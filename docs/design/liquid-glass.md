# GeoMuse Liquid Glass 设计规范

> 状态：已采纳
> 适用范围：GeoMuse Web 界面
> 最后更新：2026-07-26

## 1. 目的

本文定义 GeoMuse 的玻璃材质、界面层级、交互方式、无障碍降级和性能边界，供设计、开发和代码评审持续使用。

GeoMuse 借鉴 Apple Liquid Glass 的设计原则，但不追求逐像素复制。我们的目标是建立适合交互式地球的独立视觉语言：

- 地球和地理数据始终是视觉主角。
- 导航与控制像一层轻盈、可感知深度的玻璃悬浮在地球上方。
- 玻璃帮助用户理解界面层级，不作为装饰铺满页面。
- 效果必须在可读性、可访问性和地图帧率之后。

## 2. 核心原则

### 2.1 内容优先

MapLibre 地球、地图图层、卫星影像、地理标注和知识内容属于内容层，不应用强玻璃效果。

玻璃仅用于内容上方的功能层：

- 顶部导航
- 搜索
- 图层或“镜片”切换
- 时间控制
- 地图缩放、定位等工具
- 短暂出现的菜单和轻量信息浮层

### 2.2 玻璃表达功能层级

使用玻璃的原因必须是“这是悬浮在内容之上的操作界面”，而不能只是“这样更好看”。

禁止：

- 将长篇正文放进强折射玻璃。
- 给普通内容卡片批量套用玻璃。
- 在玻璃组件内部再嵌套另一层玻璃。
- 同一屏幕同时出现大量不同材质和透明度。
- 让大面积玻璃遮挡用户正在观察的地球。

### 2.3 形状服从交互

- 单个图标按钮使用圆形。
- 一组紧密相关的操作使用胶囊形。
- 搜索、菜单和信息浮层使用圆角矩形。
- 相邻容器的圆角应具有同心关系。
- 可点击目标最小为 `44 × 44 CSS px`。
- 形状变化必须表达状态变化，例如按钮展开为菜单，而不是无意义变形。

### 2.4 自适应而非固定外观

玻璃不能依赖某个固定背景颜色。地球会不断旋转和切换图层，组件必须在明暗、海洋、陆地和卫星影像上保持可读。

每个玻璃组件必须同时具备：

- 半透明材质
- 内高光或边缘定义
- 与内容层分离的阴影
- 必要时的暗色或亮色遮罩
- 不支持透明效果时的实色降级

## 3. 界面层级

GeoMuse 使用以下固定层级：

```text
L0  空间背景
    星空、页面底色

L1  地球内容
    MapLibre Canvas、地形、底图、数据图层

L2  地图标注
    地名、热点、路径、图例

L3  玻璃控制层
    搜索、导航、镜片、时间轴、地图工具

L4  临时呈现层
    菜单、Popover、Tooltip、轻量说明

L5  模态层
    Dialog、重要确认、阻断式提示
```

规则：

- L3 可以使用 Liquid Glass。
- L4 应降低透明度、增强阴影，确保与 L3 分离。
- L5 优先使用高不透明度表面，不依赖玻璃维持可读性。
- L3–L5 之间不得通过增加更多模糊来表达层级，应使用位置、阴影、遮罩和内容密度。

## 4. 材质类型

### 4.1 Regular Glass

默认材质，适用于绝大多数导航和控制组件。

特征：

- 中等透明度
- 中等背景模糊
- 轻微饱和度提升
- 清晰内边缘
- 柔和外阴影
- 在复杂背景上增加自适应遮罩

适用：

- 顶部导航
- 搜索框
- 图层切换器
- 时间控制器
- 地图工具组
- Popover

### 4.2 Clear Glass

更透明、更强调折射的材质，只允许用于少量、短文本、强图标的控件。

使用 Clear Glass 必须同时满足：

1. 背后是图像丰富的地图或媒体内容。
2. 控件内只有醒目的图标或极短文字。
3. 增加局部遮罩后不会破坏地球内容。

适用：

- 单个圆形地图按钮
- 当前选中的关键操作
- 短暂出现的聚焦控制

禁止：

- 正文
- 表单
- 长菜单
- 复杂信息面板
- 与 Regular Glass 在同一组件组中混用

### 4.3 Opaque Fallback

Opaque Fallback 不是第三种装饰材质，而是无障碍、性能不足或浏览器不支持时的必备降级模式。

特征：

- 高不透明度背景
- 无背景折射
- 无动态高光
- 明确边框
- 保留相同尺寸、层级和交互结构

## 5. 视觉令牌

以下令牌是实现起点，可以在真实地球背景上测试后调整。业务组件不得直接写散落的玻璃参数。

```css
:root {
  /* Geometry */
  --glass-radius-control: 14px;
  --glass-radius-panel: 22px;
  --glass-radius-pill: 999px;

  /* Regular material */
  --glass-regular-bg: rgb(18 25 34 / 44%);
  --glass-regular-blur: 20px;
  --glass-regular-saturation: 140%;
  --glass-regular-border: rgb(255 255 255 / 16%);
  --glass-regular-highlight: rgb(255 255 255 / 22%);

  /* Clear material */
  --glass-clear-bg: rgb(18 25 34 / 22%);
  --glass-clear-blur: 12px;
  --glass-clear-saturation: 125%;
  --glass-clear-border: rgb(255 255 255 / 22%);

  /* Depth */
  --glass-shadow:
    0 12px 36px rgb(0 0 0 / 22%),
    0 2px 8px rgb(0 0 0 / 14%);
  --glass-shadow-elevated:
    0 20px 56px rgb(0 0 0 / 30%),
    0 4px 14px rgb(0 0 0 / 18%);

  /* Motion */
  --glass-duration-fast: 140ms;
  --glass-duration-normal: 220ms;
  --glass-ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  /* Accessibility fallback */
  --glass-opaque-bg: rgb(20 27 36 / 94%);
  --glass-opaque-border: rgb(255 255 255 / 24%);
}
```

基础材质：

```css
.glass-surface {
  position: relative;
  isolation: isolate;
  color: white;
  background: var(--glass-regular-bg);
  border: 1px solid var(--glass-regular-border);
  box-shadow:
    inset 0 1px 0 var(--glass-regular-highlight),
    var(--glass-shadow);
  backdrop-filter:
    blur(var(--glass-regular-blur))
    saturate(var(--glass-regular-saturation));
  -webkit-backdrop-filter:
    blur(var(--glass-regular-blur))
    saturate(var(--glass-regular-saturation));
}
```

说明：

- 颜色值应通过语义令牌使用，不得以 Apple 系统颜色名作为产品 API。
- 不通过提高模糊值解决对比度问题，应提高遮罩不透明度。
- 不在普通业务组件中直接使用 `backdrop-filter`，统一通过 `GlassSurface`。

## 6. 组件接口

计划中的基础组件：

```tsx
type GlassSurfaceProps = {
  variant?: "regular" | "clear";
  shape?: "circle" | "pill" | "panel";
  elevation?: "base" | "elevated";
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
};
```

示例：

```tsx
<GlassSurface
  variant="regular"
  shape="pill"
  interactive
>
  <SearchControl />
</GlassSurface>
```

约束：

- `GlassSurface` 负责材质、边界、阴影和降级。
- 业务组件负责语义、布局和行为。
- `GlassSurface` 不读取或修改 MapLibre 状态。
- 地图与 UI 通过明确的命令和事件通信。
- 不允许业务组件复制玻璃 CSS 创建“临时版本”。

## 7. 交互状态

### 7.1 默认

- 材质保持稳定。
- 高光低调，不持续移动。
- 阴影足以将控件与地图分离。

### 7.2 Hover

- 边缘高光略微增强。
- 背景不透明度可以小幅提高。
- 可使用轻微位移或不超过 `1.02` 的缩放。
- 禁止持续波动、晃动和强烈色散。

### 7.3 Press

- 控件产生短促压缩反馈。
- 推荐缩放范围为 `0.97–0.99`。
- 光照响应指针位置，但不能成为唯一反馈。

### 7.4 Selected

- 使用产品强调色 Tint。
- 同时使用图标、形状、文字或标记表达选中状态。
- 不得仅依赖颜色区分。

### 7.5 Expand / Morph

当按钮展开为菜单或控制面板时：

- 保持触发点与展开内容的空间连续性。
- 优先改变尺寸与圆角，不突然替换成无关位置的面板。
- 展开过程中内容延迟淡入，避免文字随容器强烈拉伸。
- 大尺寸材质应提高遮罩和阴影，模拟更厚的表面并保证可读性。

### 7.6 Disabled

- 降低内容和边缘对比度。
- 保持边界可识别。
- 移除高光跟随、形变和按压反馈。
- 使用正确的 `disabled` 或 `aria-disabled` 语义。

## 8. 可读性与无障碍

### 8.1 对比度

- 普通文字与动态背景的对比度至少为 `4.5:1`。
- 大号文字至少为 `3:1`。
- 控件边界、图标和状态不能依赖偶然出现的地图颜色。
- 无法稳定满足对比度时，必须增加内部遮罩或切换为 Opaque Fallback。

### 8.2 用户偏好

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  .glass-surface {
    transition-duration: 1ms;
  }
}

@media (prefers-reduced-transparency: reduce) {
  .glass-surface {
    background: var(--glass-opaque-bg);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
}

@media (prefers-contrast: more) {
  .glass-surface {
    background: var(--glass-opaque-bg);
    border-color: rgb(255 255 255 / 44%);
  }
}

@media (forced-colors: active) {
  .glass-surface {
    color: CanvasText;
    background: Canvas;
    border: 1px solid CanvasText;
    box-shadow: none;
    backdrop-filter: none;
  }
}
```

即使目标浏览器暂不支持某个媒体查询，也必须保留规则，并提供应用内“减少视觉效果”选项作为补充。

### 8.3 语义和输入方式

- 所有玻璃按钮必须使用真实的 `button`、`a` 或等价语义元素。
- 键盘焦点必须清晰，不能只使用玻璃高光表示。
- Hover 效果不能成为发现功能的唯一方式。
- 触摸、鼠标和键盘必须获得等价操作结果。
- Tooltip 不承载完成任务所必需的唯一信息。

## 9. 性能规范

MapLibre 已经使用 GPU 渲染地球，因此玻璃层必须保持克制。

### 9.1 默认实现

生产默认采用：

```text
CSS 半透明背景
+ backdrop-filter
+ 边框
+ 内外阴影
+ 少量 SVG 边缘效果
```

第一版不采用：

- 第二套持续运行的全屏 WebGL 折射引擎
- `html2canvas` 持续捕获 MapLibre Canvas
- 大面积实时色散
- 每帧变化的模糊半径
- 为每个按钮分别创建 Canvas 或 WebGL Context

### 9.2 动画性能

- 优先动画 `transform` 和 `opacity`。
- 避免动画 `filter`、`backdrop-filter`、大面积阴影和模糊半径。
- `will-change` 只能在交互前短暂设置，不得全局常驻。
- 地球交互期间可以降低或暂停装饰性玻璃动画。
- 低性能设备和省电模式优先进入简化材质。

### 9.3 SVG 与 Shader

- SVG 折射只用于少量固定尺寸控件。
- 必须为 Safari 和 Firefox 提供无折射降级。
- WebGL/WebGPU Shader 仅作为后续增强实验，不进入基础组件默认路径。
- 引入任何 Shader 方案前，必须与纯 CSS 版本进行 FPS、GPU、显存和耗电对比。

### 9.4 性能验收

涉及玻璃材质的改动至少检查：

- 地球静止时的 CPU/GPU 占用
- 连续旋转和缩放时的帧率
- 打开多个玻璃控件后的帧率
- 高 DPR 移动设备
- Safari、Chrome 和 Firefox
- 页面隐藏再恢复后的 WebGL 状态

视觉效果不得明显降低地球交互的流畅度。

## 10. 浏览器降级

渐进增强顺序：

```text
Level 0
实色背景 + 边框 + 静态阴影

Level 1
半透明背景

Level 2
backdrop-filter 模糊与饱和度

Level 3
SVG 边缘折射与交互高光

Level 4
实验性的 Shader 折射
```

基础结构和操作必须在 Level 0 下完全可用。

使用功能检测：

```css
@supports not ((backdrop-filter: blur(1px)) or
               (-webkit-backdrop-filter: blur(1px))) {
  .glass-surface {
    background: var(--glass-opaque-bg);
  }
}
```

## 11. 推荐与禁止

### 推荐

- 让完整地球延伸到视口边缘。
- 将少量核心控制悬浮在地球上。
- 用一致的圆角和间距形成控制组。
- 通过局部 Tint 表达选中状态。
- 让玻璃在交互后安静下来。
- 使用短文本、清晰图标和足够点击面积。
- 用实色内容面板承载长篇解释。

### 禁止

- 整个页面覆盖一层毛玻璃。
- 每张卡片都使用不同的透明度。
- 在地图上同时漂浮十几个玻璃面板。
- 玻璃嵌套玻璃。
- 用强色差影响文字边缘。
- 为了视觉效果牺牲对比度。
- 持续运行无意义的流体动画。
- 直接复制 Apple 的图标、品牌资源或系统界面。

## 12. 开发与评审清单

提交涉及玻璃界面的改动前，逐项确认：

### 层级

- [ ] 组件确实属于导航或控制层。
- [ ] 没有将玻璃用于主要内容。
- [ ] 没有玻璃嵌套。
- [ ] 没有遮挡关键地理信息。

### 视觉

- [ ] 使用统一的视觉令牌。
- [ ] 圆角、间距和同组控件一致。
- [ ] 明暗地图背景下都能识别边界。
- [ ] 选中状态不仅依赖颜色。

### 交互

- [ ] Hover、Press、Selected 和 Disabled 状态完整。
- [ ] 键盘焦点清晰。
- [ ] 触摸目标至少为 `44 × 44 CSS px`。
- [ ] 减少动态效果后仍能理解状态变化。

### 无障碍

- [ ] 普通文字达到 `4.5:1` 对比度。
- [ ] 支持减少透明度。
- [ ] 支持增强对比度和强制颜色。
- [ ] Level 0 降级仍可完成全部操作。

### 性能

- [ ] 没有为普通控件创建独立 WebGL Context。
- [ ] 没有持续捕获 MapLibre Canvas。
- [ ] 没有动画大面积模糊。
- [ ] 在桌面和移动设备上验证过地图交互。

## 13. 参考资料

### 官方设计规范

- [Apple — Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)
- [Apple Human Interface Guidelines — Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [Apple — Liquid Glass technology overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [W3C WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
- [W3C Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)

### 开源实现参考

- [Liquid Glass Studio](https://github.com/iyinchao/liquid-glass-studio) — WebGL2/WebGPU、SDF、折射、色散和参数实验
- [Leonxlnx/liquid-glass](https://github.com/Leonxlnx/liquid-glass) — React、SVG Filter、CSS backdrop-filter 和浏览器降级
- [liquidGL](https://github.com/naughtyduk/liquidGL) — WebGL 折射与页面捕获，作为实验参考
- [Liquid Glass JS](https://github.com/dashersw/liquid-glass-js) — WebGL Shader 与嵌套材质研究

## 14. 决策记录

GeoMuse 当前采用以下实现方向：

```text
Apple 的层级与适应性原则
        +
CSS backdrop-filter 基础材质
        +
少量 SVG 边缘效果
        +
完整的无障碍和实色降级
```

暂不将任何 Liquid Glass 开源项目作为生产依赖。项目通过 `.glass-surface` 维护
唯一的基础材质入口；当组件变体需要类型化参数时，再将它封装为 React
`GlassSurface` 组件。渐进增强不能影响 MapLibre 地球性能。

当前基础材质已覆盖：

- 品牌栏、地球控制、运行状态和开发性能面板；
- 深色与系统浅色外观；
- `prefers-reduced-motion`；
- `prefers-reduced-transparency`；
- `prefers-contrast: more`；
- `forced-colors: active`；
- 不支持 `backdrop-filter` 时的 Opaque Fallback。

业务组件只能通过 `.glass-surface` 使用玻璃材质，不再复制背景、边界、阴影和
模糊参数。
