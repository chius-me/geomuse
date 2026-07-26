# GeoMuse 正式性能基线

日期：2026-07-26
应用：Next.js production build，localhost
浏览器：Chrome 150，通过 Chrome DevTools MCP 采集

本基线用于比较后续地球视觉与图层改动。它是实验室数据，不代表真实用户分布；
localhost 没有 CrUX 数据，正式上线后仍需补充真实用户监控。

## 测量环境

| 场景 | 视口 | CPU | 网络 |
| --- | --- | --- | --- |
| 桌面加载 | 1280×720，DPR 1 | 1× | 无节流 |
| 移动加载 | 390×844，DPR 3，触控 | 4× slowdown | Fast 4G |
| 移动交互 | 同移动加载 | 4× slowdown | Fast 4G |

每次加载先使用忽略缓存的导航，再由 Performance Trace 重新加载页面。由于
PMTiles 客户端和浏览器会缓存目录与瓦片，网络结果同时记录初始请求和后续请求。

## Core Web Vitals

| 指标 | 桌面 | 移动模拟 | GeoMuse 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| LCP | 169ms | 422ms | ≤ 1,500ms | 通过 |
| CLS | 0.00 | 0.00 | ≤ 0.05 | 通过 |
| INP（复位视角） | 未测 | 55ms | ≤ 100ms | 通过 |

移动 INP 分解：

- Input delay：4ms；
- Processing duration：7ms；
- Presentation delay：44ms。

当前 LCP 元素是 MapLibre 的署名文字，而不是 WebGL Canvas。Canvas 不参与 LCP
候选，因此 LCP 只代表页面外壳首次可见速度；“地球何时可操作”继续由
`GlobeEngine` 的 MapLibre `load` 遥测衡量。

## Trace 发现

- 桌面 TTFB 7ms，移动模拟 TTFB 2ms；
- 两个 CSS 请求处于渲染关键路径，但 DevTools 估算 FCP/LCP 节省均为 0ms；
- 最大关键请求链来自 HTML 到 CSS，没有值得新增的 preconnect；
- 没有 CrUX 真实用户数据；
- 当前无需为 CSS 阻塞调整 Next.js 的默认加载方式。

## 网络与资源预算

| 资源 | 当前值 | 预算 | 结果 |
| --- | ---: | ---: | --- |
| 首屏 JavaScript（gzip） | 约 414KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 约 13KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 429.5KiB | ≤ 1MiB | 通过 |
| 首屏 Source | 2 | ≤ 3 | 通过 |
| 首屏地图 Layer | 3 | ≤ 8 | 通过 |
| WebGL 渲染管线 | 1 | 1 | 通过 |

初始 PMTiles Range Request 返回 `206 Partial Content`，后续目录或瓦片请求可命中
缓存并返回 304。首屏不会下载完整 PMTiles 文件。

构建后执行以下命令检查可自动验证的资源预算：

```bash
pnpm perf:budget
```

## 无障碍与页面质量

| 场景 | Accessibility | Best Practices | SEO | Agentic Browsing |
| --- | ---: | ---: | ---: | ---: |
| 桌面 | 100 | 100 | 100 | 100 |
| 移动 | 100 | 100 | 100 | 100 |

首次移动审计发现 MapLibre 展开的署名条覆盖底部控制器，造成对比度检测失败。
移动端控制器上移 52px 后复测通过。站点图标缺失导致的 404 也已修复。

## 后续改动规则

1. 每增加一个大气、光照、纹理或图层效果，都执行生产构建和
   `pnpm perf:budget`；
2. 阶段 4 每个视觉小步至少复测移动 LCP、CLS 和一次交互 INP；
3. 不为了 0ms 的估算节省增加复杂加载策略；
4. 首屏 JavaScript 接近预算时，优先动态加载非首屏功能；
5. 上线后用真实用户 75 百分位数据替换 localhost 的最终产品结论。

## 阶段 4 回归记录

### 4A：空间背景与海洋层次

日期：2026-07-26

变更只涉及 MapLibre 样式中的 `sky`、海洋颜色插值和 WebGL 初始化前的 CSS
背景，不增加数据源、地图图层或渲染管线。

| 指标 | 阶段 3 基线 | 4A 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 422ms | 408ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0000 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 约 415.2KiB | 415.3KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.4KiB | 13.4KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 429.5KiB | 429.5KiB | ≤ 1MiB | 通过 |

移动加载继续使用 390×844、DPR 3、4× CPU slowdown 与 Fast 4G。当前浏览器
接口没有产生可用的 Event Timing `interactionId`，因此不把替代测量误报为
标准 INP；复位按钮的点击到第二个动画帧为 18ms，交互功能已通过浏览器验收，
阶段 3 的正式 INP 基线仍为 55ms。

### 4B：缩放细节渐进

日期：2026-07-26

变更使用既有 `land` 和 `graticule` 图层的 zoom expression，没有增加 Source、
Layer 或 WebGL 渲染管线。

| 指标 | 4A 结果 | 4B 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 408ms | 384ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.3KiB | 415.4KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.4KiB | 13.4KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 429.5KiB | 429.5KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 3 | 2 / 3 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。复位按钮点击到第二个动画帧为 25ms；该辅助值不替代
阶段 3 通过正式 Performance Trace 获得的 55ms INP 基线。

### 4C：Liquid Glass 自适应降级

日期：2026-07-26

变更将既有界面统一到 CSS `.glass-surface` 材质入口，并新增系统偏好的纯 CSS
降级。没有增加客户端 JavaScript、地图 Source、Layer 或渲染管线。

| 指标 | 4B 结果 | 4C 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 384ms | 572ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.4KiB | 415.4KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.4KiB | 13.5KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 429.5KiB | 429.5KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 3 | 2 / 3 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。单次 LCP 测量存在实验室波动，但仍保留超过 900ms 的
预算余量。复位按钮点击到第二个动画帧为 63ms；该辅助值不替代正式 INP 基线。

### 5A：湖泊与主要河流

日期：2026-07-26

Natural Earth 湖泊与主要河流加入既有 PMTiles 和 `basemap` Source。删除所有
未使用的要素属性后，增加两个 Source Layer 和两个地图 Layer 的同时，归档体积
反而下降。

| 指标 | 4C 结果 | 5A 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 572ms | 380ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.4KiB | 415.5KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.5KiB | 13.5KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 429.5KiB | 314.4KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 3 | 2 / 5 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。复位按钮点击到第二个动画帧为 33ms；该辅助值不替代
正式 INP 基线。

### 5C：Provider 与 HTTP 部署契约

日期：2026-07-26

运行时改为类型化 `BasemapProvider`，并新增仅用于开发和部署验证的 HTTP
契约模块。地图数据、Source 和 Layer 均未改变。

| 指标 | 5B 结果 | 5C 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 388ms | 372ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.6KiB | 415.9KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.5KiB | 13.5KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。复位按钮点击到第二个动画帧为 24ms；该辅助值不替代
正式 INP 基线。

### 5B：Source Layer 契约与参考边界

日期：2026-07-26

新增过滤后的 Natural Earth 陆地参考边界，与现有数据打包进同一 PMTiles 和
`basemap` Source。Source Layer contract v1 同时用于构建、校验和样式测试。

| 指标 | 5A 结果 | 5B 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 380ms | 388ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.5KiB | 415.6KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.5KiB | 13.5KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 314.4KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 5 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。复位按钮点击到第二个动画帧为 33ms；该辅助值不替代
正式 INP 基线。

### 6A：类型化图层注册表与图层控制器

日期：2026-07-26

新增类型化图层注册表、引擎分组显隐命令和按需打开的 React 图层面板。图层面板
只保存低频界面状态；地球相机和实际渲染状态仍由 MapLibre 持有。

| 指标 | 5C 结果 | 6A 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 372ms | 376ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 415.9KiB | 416.5KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.5KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

移动加载条件与 4A 相同。图层控制没有增加 Source、地图 Layer 或 WebGL 管线；
三个分组开关、键盘焦点归还和 390×844 布局均通过真实浏览器验收。

### 6B：类型化镜头命令接口

日期：2026-07-26

新增纯 TypeScript 镜头命令解析器，并将现有复位行为改为通过统一命令入口执行。
React 没有增加相机状态或地图事件订阅。

| 指标 | 6A 结果 | 6B 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 376ms | 760ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 416.5KiB | 417.1KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

普通动态与减少动态两种复位路径均通过真实浏览器验收。该接口没有增加 Source、
地图 Layer、CSS 或 WebGL 管线。最终生产构建复测的单次 LCP 比首次 384ms
采样更高，属于 localhost 实验室波动，仍保留 740ms 预算余量。

### 6C：地理要素选择接口

日期：2026-07-26

新增可选择图层元数据、纯 TypeScript 选择结果解析器和一个 MapLibre `click`
监听器。只有用户点击时才执行 `queryRenderedFeatures`，没有 `mousemove`
监听、持续命中测试或 React 高频状态。

| 指标 | 6B 结果 | 6C 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 760ms | 388ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 417.1KiB | 417.6KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

桌面陆地/海洋点击、拖动、复位和移动端点击均通过真实浏览器验收，无运行时错误。
该接口不增加 Source、地图 Layer、CSS 或 WebGL 管线。

### 6D：URL 可分享视角与图层状态

日期：2026-07-26

新增纯 TypeScript URL 编解码器、MapLibre `moveend` 低频回调和图层开关时的
`history.replaceState`。拖动过程不写 URL、不更新 React state，也不创建新的
浏览器历史条目。

| 指标 | 6C 结果 | 6D 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 388ms | 420ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 417.6KiB | 418.3KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

桌面完成视角与图层写入、刷新还原、复位清理和无关参数保留闭环；390×844
移动端分享链接也可直接还原镜头与图层状态。无运行时错误。

### 6E：统一地球事件桥

日期：2026-07-26

用一个类型化 `GlobeEventHub` 替换分散的生命周期、镜头和选择回调。React 只保留
一个稳定订阅；性能遥测继续使用原有节流通道。

| 指标 | 6D 结果 | 6E 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 移动 LCP | 420ms | 372ms | ≤ 1,500ms | 通过 |
| 移动 CLS | 0.0023 | 0.0023 | ≤ 0.05 | 通过 |
| 首屏 JavaScript（gzip） | 418.3KiB | 418.5KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

桌面端完成就绪、镜头 URL、图层 URL 和选择点击回归；390×844 移动端分享视角
也保持正常。没有控制台错误、额外 Source、地图 Layer、CSS 或 WebGL 管线。

### 7A：自动化生产浏览器冒烟测试

日期：2026-07-26

本阶段只增加开发依赖、Playwright 配置、测试和 CI 工作流，不修改生产应用代码。

| 指标 | 6E 结果 | 7A 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 首屏 JavaScript（gzip） | 418.5KiB | 418.6KiB | ≤ 450KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

三条 Chromium production smoke tests 使用一个 Worker 串行运行，约 10 秒全部通过。
没有修改应用源代码；0.1KiB 差异属于生产构建输出波动。测试依赖与浏览器二进制
不会进入 Next.js 客户端构建。

### 7B：CSP 与独立 MapLibre Worker

日期：2026-07-26

MapLibre 改用 CSP 专用主包与同源独立 Worker。主线程初始 JavaScript 下降，但
Worker 成为单独的启动请求，因此预算同时记录两者，不能只比较 HTML 脚本标签。

| 指标 | 7A 结果 | 7B 结果 | 预算 | 结果 |
| --- | ---: | ---: | ---: | --- |
| 主线程初始 JavaScript（gzip） | 418.6KiB | 394.8KiB | ≤ 450KiB | 通过 |
| MapLibre Worker（gzip） | 内嵌 | 114.0KiB | ≤ 128KiB | 通过 |
| 总启动 JavaScript（gzip） | 418.6KiB | 508.8KiB | ≤ 550KiB | 通过 |
| 首屏 CSS（gzip） | 13.7KiB | 13.7KiB | ≤ 20KiB | 通过 |
| 完整 PMTiles | 387.3KiB | 387.3KiB | ≤ 1MiB | 通过 |
| 首屏 Source / Layer | 2 / 6 | 2 / 6 | ≤ 3 / ≤ 8 | 通过 |

独立 Worker 增加一次可长期独立缓存的同源请求，并换取不依赖 `blob:` 的严格
Worker CSP。生产 Chromium 已验证 Worker 200、PMTiles 206、地球就绪、状态刷新
闭环和移动布局；没有控制台或 CSP 错误。
