# GeoMuse 增量开发路线

GeoMuse 目前聚焦高性能 3D 地球引擎，不制作故事节点。开发采用“小步实现、
逐步验收”的方式：每个阶段只解决一类问题，通过对应检查后再进入下一阶段。

## 工作原则

1. 每一步开始前写明用户可感知的结果；
2. 每一步只引入完成该结果所需的最少代码与依赖；
3. 数据、逻辑、界面和生产构建分别验证；
4. 性能结论以测量为准，不凭视觉感觉判断；
5. 新能力不能破坏无障碍、低透明度和减少动态效果的降级路径；
6. MapLibre 管理地图渲染状态，React 只管理低频界面状态。

## 阶段 0：工程与数据基础

状态：已完成。

- Next.js、React、严格 TypeScript；
- MapLibre GL JS Globe Projection；
- PMTiles 协议；
- Natural Earth 可复现底图；
- Liquid Glass 设计规范；
- lint、类型检查和生产构建。

验收命令：

```bash
pnpm data:verify
pnpm lint
pnpm typecheck
pnpm build
```

## 阶段 1：运行可靠性

状态：已完成。

目标：用户不会面对无法解释的空白或黑屏。

- 地球初始化状态；
- 地球加载完成状态；
- 底图、样式或 WebGL 初始化失败状态；
- 对辅助技术播报状态变化；
- 状态转换单元测试。

完成标准：

- 成功加载时由“正在初始化”切换为“地球已就绪”；
- 失败时显示可理解的错误信息；
- 错误界面不依赖 WebGL；
- `pnpm test`、数据验证、lint、类型检查和生产构建全部通过。

## 阶段 2：相机与交互基线

状态：主要功能已完成。鼠标拖动、滚轮缩放、键盘、复位与 390×844 响应式布局
已通过浏览器验收；真实触屏手势仍待实体设备验收。

目标：桌面端、触屏和触控板上都能稳定操纵地球。

- 旋转、缩放、惯性和边界；
- 首页默认视角与复位；
- ResizeObserver 与容器尺寸变化；
- 键盘操作和清晰焦点；
- `prefers-reduced-motion` 下缩短镜头动画。

完成标准：

- 鼠标、触控板、触屏和键盘均可完成基本浏览；
- 视口变化不产生尺寸错位；
- 复位操作结果确定；
- 交互逻辑测试与生产构建通过。

## 阶段 3：性能基线

状态：已完成。3A 开发环境遥测与 3B 正式 Chrome Performance Trace 均已完成。
基线见 `docs/development/performance-baseline.md`。

目标：先建立测量能力，再增加视觉复杂度。

- 开发环境性能面板；（已完成）
- 帧耗时、地图加载耗时和长任务记录；（已完成）
- 首屏资源大小预算；（已完成）
- MapLibre worker 与瓦片请求观察；（已完成）
- 桌面和移动设备基线记录。（已完成）

初始预算：

| 指标 | 初始目标 |
| --- | --- |
| 本地 PMTiles | 小于 1 MB |
| 首屏 Source Layers | 不超过 3 |
| 首屏动态地图图层 | 不超过 8 |
| 连续第二套 WebGL 渲染管线 | 0 |
| 地球静止时不必要的 React 重渲染 | 0 |

## 阶段 4：地球视觉

状态：已完成。4A「空间背景与海洋层次」、4B「缩放细节渐进」和
4C「Liquid Glass 自适应降级」均已通过验收。

目标：形成 GeoMuse 自己的地球视觉，而不牺牲阶段 3 的性能预算。

- 海洋、陆地和海岸线层次；（4A 已完成基础层次）
- 大气、天空和空间背景；（4A 已完成）
- 不同缩放级别的细节渐进；（4B 已完成）
- Liquid Glass 品牌栏和地球控制器；（4C 已完成）
- 深浅色、透明度与高对比度降级。（4C 已完成）

每增加一个视觉效果，都要重新检查性能基线。

### 4A：空间背景与海洋层次

- 使用 MapLibre Style Spec 的 `sky` 配置大气边缘与空间背景；
- `atmosphere-blend` 随缩放级别降低，靠近地表时不遮挡地图细节；
- 海洋颜色随缩放渐进，避免全球视角是一块无层次的纯色；
- CSS 渐变只作为 WebGL 初始化前和失败时的视觉兜底；
- 不增加 Source、地图 Layer 或第二套 WebGL 渲染管线。

浏览器验收：

| 场景 | 结果 |
| --- | --- |
| 1280×720 桌面 | 地球、大气边缘、陆海与经纬网清晰；无控制台警告或错误 |
| 390×844 移动 | 地球完整可见；控制器、状态与 MapLibre 署名不重叠 |
| 复位视角 | 单一可访问按钮可用，操作后保持“地球已就绪” |

`sky` 在 MapLibre Style Spec 中仍标记为实验性能力，因此 4A 的回退边界保持为
`src/globe/style.ts` 的 `sky` 字段；移除该字段不会影响底图数据与交互能力。

### 4B：缩放细节渐进

- 全球视角保持稳定的陆海对比与可读经纬网；
- 放大时陆地逐步提亮、海岸线逐步增强；
- 经纬网透明度随缩放降低，避免区域视角被辅助线主导；
- 所有变化均使用既有图层的 MapLibre zoom expression；
- 新增样式契约测试，自动锁定 2 个 Source、3 个 Layer 的首屏预算。

浏览器验收覆盖 1280×720 全球视角、桌面区域缩放和 390×844 移动视角。
三个场景都保持“地球已就绪”，无控制台警告或错误。

### 4C：Liquid Glass 自适应降级

- 品牌栏、运行状态、性能面板和地球按钮统一使用 `.glass-surface` 材质入口；
- 系统浅色偏好切换为浅色玻璃和深色文字，地球本身保持暗色科学可视化主题；
- 减少透明度时切换高不透明度背景并关闭 `backdrop-filter`；
- 增强对比度时使用实色背景、2px 边界并取消阴影；
- 强制颜色模式使用系统 `Canvas` / `CanvasText`，Logo 标记退化为纯色轮廓；
- 减少动态时关闭加载脉冲，并将玻璃过渡缩短至 1ms；
- 不增加 JavaScript、React 状态或第二套 WebGL 管线。

桌面端已模拟默认深色、系统浅色、增强对比度、减少透明度、减少动态和强制颜色；
390×844 移动布局也已复测。所有模式均无控制台警告或错误。

## 阶段 5：底图扩展

状态：已完成。5A「湖泊与主要河流」、5B「Source Layer 契约与参考边界」和
5C「Provider 与 HTTP 部署契约」均已通过验收。

目标：从全球尺度平滑扩展到区域尺度。

- 增加 Natural Earth 河流、湖泊和边界；（已完成）
- 设计 Source Layer 版本契约；（已完成）
- 为区域级 OSM PMTiles 预留 Provider；（已完成 Provider 边界）
- 验证对象存储 Range Request 与 CORS；（已完成）
- 明确数据许可和署名。（已完成）

### 5A：湖泊与主要河流

- 固定 Natural Earth 5.1.2 的 Land、Lakes、Rivers + Lake Centerlines；
- 三个数据集分别保存 SHA-256，构建时强制校验；
- 删除渲染不使用的属性，只保留几何；
- `land`、`lakes`、`rivers` 打包进同一 PMTiles；
- 湖泊从 zoom 1、河流从 zoom 2 渐进显示；
- 保持 2 个 Source，地图 Layer 从 3 增至 5；
- PMTiles 从 429.5KiB 降至 314.4KiB。

浏览器验收覆盖桌面全球视角、亚洲区域缩放和 390×844 移动视角。湖泊可辨识，
河流放大后增强且不压过陆地，经纬网与水系层级明确；无控制台警告或错误。

### 5B：Source Layer 契约与参考边界

- 新增 `basemap-contract.ts`，固定 contract v1、数据版本、哈希、图层和过滤规则；
- 构建、PMTiles 校验和样式测试共享同一契约；
- PMTiles 元数据写入 `geomuse_basemap_contract: 1`；
- `boundaries` Source Layer 只保留普通国际边界；
- 争议线、控制线、不确定边界和主张边界在构建阶段排除；
- 边界瓦片从 zoom 2 存在，视觉图层从 zoom 2.5 低对比度出现；
- 保持 2 个 Source，地图 Layer 从 5 增至 6；
- PMTiles 为 387.3KiB，仍低于 1MiB 预算。

浏览器验收覆盖桌面全球视角、亚洲区域缩放、近区域缩放和 390×844 移动视角。
全球视角不显示边界；放大后参考边界与青色河流可区分，无控制台警告或错误。

### 5C：Provider 与 HTTP 部署契约

- `BasemapProvider` 将页面配置、浏览器 URL 解析和 MapLibre 样式分离；
- 本地与远程 Natural Earth 归档共享 contract v1 和署名；
- 拒绝危险协议、内嵌凭据、查询参数、片段、错误扩展名和混合内容；
- `data:http` 对同源服务执行真实 127 字节 Range 验证；
- 跨域集成测试执行真实 OPTIONS 预检与 Range 请求；
- 远程验证要求 `GET`、`HEAD`、`Range`、`If-Match`、`ETag` 和正确 CORS；
- 保持 2 个 Source、6 个地图 Layer 和 1 套 WebGL 管线。

桌面和 390×844 移动端均保持“地球已就绪”，无控制台警告或错误。

## 阶段 6：地理能力接口

状态：已完成。6A「类型化图层注册表与图层控制器」、
6B「类型化镜头命令接口」、6C「地理要素选择接口」、
6D「URL 可分享状态」和 6E「统一地球事件桥」均已完成。

目标：为未来热点、专题和故事提供稳定接口，但暂不制作故事内容。

- 图层注册表；（6A 已完成）
- 相机指令接口；（6B 已完成）
- 地理要素选择；（6C 已完成）
- URL 可分享视角；（6D 已完成）
- 地球事件与 React UI 的单向桥接。（6E 已完成）

### 6A：类型化图层注册表与图层控制器

- `layer-registry.ts` 统一声明地图图层 ID、Source Layer、可切换性和所属分组；
- 水系、参考边界与经纬网形成三个语义分组，默认可见；
- `style.ts` 和 `GlobeEngine` 共享注册表，不再重复硬编码图层 ID；
- `GlobeEngine` 提供类型安全的单图层与分组显隐命令；
- React 只保存面板开关和分组显隐等低频状态，不订阅地图渲染事件；
- 图层面板具有原生 checkbox 语义、44px 控件高度、清晰焦点和 `Esc` 焦点归还；
- 不增加 Source、地图 Layer 或第二套 WebGL 渲染管线。

浏览器验收：

| 场景 | 结果 |
| --- | --- |
| 1280×720 桌面 | 三个分组可独立开关，地图立即更新 |
| 键盘 | `Esc` 关闭面板并将焦点归还“图层”按钮 |
| 390×844 移动 | 面板完整可用，未遮挡主控制与 MapLibre 署名 |

### 6B：类型化镜头命令接口

- `camera-command.ts` 定义 `jump-to`、`fly-to`、`fit-bounds`、`reset` 和 `stop`；
- 所有命令使用经纬度元组和明确的镜头目标，不暴露 MapLibre 宽泛输入类型；
- 新命令执行前调用 `map.stop()`，保证连续指令不会叠加动画；
- 动画时长、坐标、缩放、俯仰和边距在进入 MapLibre 前统一验证；
- 相机缩放限制由命令解析器和 MapLibre 实例共享；
- 减少动态模式把所有动画命令解析为 0ms；
- React 复位按钮只发送语义命令，不保存或订阅相机状态。

浏览器验收：

| 场景 | 结果 |
| --- | --- |
| 普通动态 | 移动和缩放后，复位命令平滑返回默认亚洲视角 |
| 减少动态 | 同一复位命令立即返回默认视角，没有过渡动画 |
| 390×844 移动 | 地球加载与既有控制保持正常 |

### 6C：地理要素选择接口

- 图层注册表明确声明每个地图图层是否参与选择；
- 当前只有陆地、湖泊、主要河流和参考边界进入命中测试；
- `selection.ts` 将 MapLibre 原始要素压缩成稳定、只读的产品数据；
- 选择结果包含经纬度、屏幕坐标、图层、几何类型、要素 ID 和简单属性；
- 点击海洋、经纬网或空白区域返回明确的空选择；
- `GlobeEngine.selectAt()` 同时支持指针点击和未来的程序化选择；
- React 使用稳定 ref 转发最新回调，不因回调变化重建 MapLibre；
- 当前不保存选择状态、不显示知识卡片，也不增加选中态图层。

浏览器验收：

| 场景 | 结果 |
| --- | --- |
| 1280×720 桌面 | 陆地与海洋点击、拖动、复位均正常，无运行时错误 |
| 390×844 移动 | 地图点击保持就绪，控制器与署名布局不变 |
| 连续交互 | 选择查询不影响后续拖动和镜头命令 |

### 6D：URL 可分享视角与图层状态

- `gm-view` 以版本、经度、纬度、缩放、方向和俯仰编码镜头；
- `gm-hidden` 只记录关闭的语义图层组；
- 默认视角和默认图层不写入 URL，保持首页地址干净；
- 解析阶段拒绝未知版本、越界坐标、非有限数字和多余字段；
- 未知图层组被忽略，未来新增组时保持向前兼容；
- 其他业务查询参数和 URL hash 原样保留；
- MapLibre 初始化时直接使用 URL 镜头，不先显示默认镜头再跳转；
- 只在 `moveend` 和图层开关时使用 `history.replaceState`；
- 不订阅 Next.js 查询参数，也不在拖动过程中更新 React state；
- 刷新页面可还原镜头与图层，复位后自动删除默认状态参数。

浏览器验收：

| 场景 | 结果 |
| --- | --- |
| 调整视角 | `gm-view` 在 `moveend` 后更新，原有 `ref` 参数保留 |
| 关闭水系 | URL 增加 `gm-hidden=water` |
| 刷新 | 镜头与水系关闭状态完整还原 |
| 复位并恢复图层 | GeoMuse 参数被移除，原有业务参数保留 |
| 390×844 分享链接 | 指定镜头和经纬网关闭状态直接还原 |

### 6E：统一地球事件桥

- `events.ts` 定义 `ready`、`error`、`camera-change`、
  `selection-change` 和 `layer-visibility-change` 联合类型；
- `GlobeEventHub` 提供订阅、幂等取消订阅和统一清理；
- 事件派发使用监听器快照，派发期间取消其他监听器不会破坏当前顺序；
- `GlobeEngine` 不再接收分散的生命周期、镜头和选择回调；
- `GlobeViewport` 只建立一个订阅，先处理运行状态和 URL，再转发给产品 UI；
- 最新产品事件处理器保存在 ref 中，变化时不重建 MapLibre；
- 初始图层应用不重复发出用户图层变更事件；
- 性能遥测保持独立，不混入产品事件通道；
- 销毁引擎时先清空订阅，再移除 MapLibre 实例。

浏览器验收：

| 事件路径 | 结果 |
| --- | --- |
| `ready` | 桌面与移动端均稳定进入“地球已就绪” |
| `camera-change` | 拖动结束后继续正确更新 `gm-view` |
| `layer-visibility-change` | 经纬网关闭后继续更新 `gm-hidden` |
| `selection-change` | 陆地点击后地图、拖动和 URL 同步保持正常 |
| `error` 回归 | 上述流程无控制台错误或未捕获异常 |

## 阶段 7：生产就绪

状态：进行中。7A「自动化生产浏览器冒烟测试」、
7B「Content Security Policy 与 MapLibre Worker 策略」和
7C「Cloudflare 静态部署与缓存边界」已完成。

目标：将已稳定的地球引擎变成可长期公开部署、可持续回归的产品底座。

- 自动化生产浏览器冒烟测试；（7A 已完成）
- Content Security Policy 与 MapLibre Worker 策略；（7B 已完成）
- 静态资源与 PMTiles 缓存策略；（7C 已完成）
- 真实触屏设备和低端 GPU 验收；
- WebGL 上下文丢失后的可恢复路径；
- 部署环境的错误与性能观测边界。

### 7A：自动化生产浏览器冒烟测试

- 精确固定 `@playwright/test`，只安装和运行 Chromium；
- Playwright 在独立 3100 端口启动本地 Workers Static Assets，不依赖开发服务器；
- `pnpm test:smoke` 先执行生产构建，再运行浏览器测试；
- 桌面用例验证地球就绪、WebGL Canvas 和 PMTiles `206 Partial Content`；
- 状态用例验证镜头 URL、图层 URL、刷新还原、复位清理和参数保留；
- 移动用例固定 390×844，验证分享状态与控制器/署名不重叠；
- 每条用例捕获 `console.error` 和未处理页面异常；
- 失败时保留截图、Trace 与 HTML 报告；
- GitHub Actions 在 Pull Request 和 `main` 推送时执行同一命令；
- CI 只安装 Chromium，降低下载体积和运行时间。

本地三条生产冒烟用例串行执行，全部通过，耗时约 10 秒。完整说明见
`docs/development/smoke-testing.md`。

### 7B：Content Security Policy 与 MapLibre Worker 策略

- 应用实际使用 MapLibre 5.12.0 的 CSP 专用主包；
- `predev` 与 `prebuild` 从锁定依赖同步独立 Worker 到同源静态路径；
- Worker 生成文件不进入 Git，构建时输出体积与 SHA-256 短摘要；
- MapLibre 地球、Worker 设置和 PMTiles 协议统一使用同一个 CSP 运行时；
- 全站 CSP 将 `worker-src` 收紧到 `'self'`，不允许 `blob:` Worker；
- `connect-src` 只允许同源，当前本地 PMTiles 无需额外数据域名；
- 禁止对象、iframe 和第三方嵌入，并发送基础浏览器安全响应头；
- 单元测试锁定 CSP 契约，生产 Chromium 验证真实响应头与 Worker 请求；
- 独立 Worker 和总启动 JavaScript 都加入性能预算。

生产冒烟测试覆盖桌面、URL 状态与 390×844 移动端，三条用例全部通过。完整
安全边界见 `docs/development/security.md`。

### 7C：Cloudflare 静态部署与缓存边界

- Next.js 使用静态导出，生产资产统一进入 `out/`；
- 采用 Workers Static Assets，避免 Pages 当前 Range 响应不符合 PMTiles 契约；
- Next.js 指纹资源使用一年浏览器缓存与 `immutable`；
- HTML、稳定路径 Worker 和 PMTiles 使用 ETag 重新验证；
- `/maps/*` 单独进入轻量 Worker，其余静态请求不产生 Worker invocation；
- PMTiles 优先由 Cloudflare Cache API 返回 Range 命中；
- 冷缓存路径具备明确的单段 Range 解析与 `206`/`416` 回退；
- PMTiles 完整响应在边缘缓存一小时，浏览器仍每次重新验证；
- Wrangler dry run 和本地 Workers 生产冒烟测试进入 GitHub Actions；
- `main` 质量门禁通过且 Cloudflare Secrets 已配置时自动部署。

本地 Workers Static Assets 已验证 PMTiles 冷请求、缓存请求与 Chromium 页面加载
均返回合法 `206 Partial Content`。完整配置见
`docs/development/deployment.md`。

下一步 7D：真实触屏设备和低端 GPU 验收。

## 每一步固定检查

根据改动范围选择最小集合，合并阶段前执行完整集合：

```bash
pnpm test
pnpm data:verify
pnpm perf:budget
pnpm lint
pnpm typecheck
pnpm build
```

如果某一步需要人工浏览器测试，必须写明测试设备、操作、预期结果和实际结果，
不能只写“看起来正常”。
