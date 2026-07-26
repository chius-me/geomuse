# GeoMuse 技术架构基线

> 状态：已采纳
> 最后更新：2026-07-26

## 1. 目标

第一阶段只建设一个高性能、可扩展的交互式地球底座。当前不包含故事节点、账号、实时数据、Supabase 或 AI。

## 2. 技术选型

| 层级 | 选择 |
| --- | --- |
| Web 框架 | Next.js App Router |
| UI | React |
| 语言 | TypeScript strict |
| 包管理 | pnpm |
| 地球引擎 | MapLibre GL JS 5.12.0（精确固定） |
| 地图归档 | PMTiles |
| 全球数据 | Natural Earth，后续补充 OpenStreetMap |
| 样式 | Tailwind CSS + CSS Variables |
| 动效 | Motion |
| 部署 | 暂未决定 |

## 3. 模块边界

```text
React UI
├── GlassSurface
├── SearchControl
├── LayerControl
└── GlobeViewport
         ↓
GlobeEngine
├── Map lifecycle
├── CameraController
├── SourceRegistry
├── LayerRegistry
├── StyleController
├── GlobeEventHub
└── PerformanceMonitor
         ↓
MapLibre GL JS + PMTiles
```

### React UI

- 负责页面结构、无障碍语义和低频 UI 状态。
- 不直接保存或频繁同步 MapLibre 相机状态。
- 不在 React render 中创建 MapLibre Source、Layer 或 Marker。

### GlobeViewport

- 是 MapLibre Canvas 的唯一 React 宿主。
- 只负责创建、连接和销毁 `GlobeEngine`。
- 通过稳定的命令接口与引擎通信。

### GlobeEngine

- 是唯一持有 `maplibregl.Map` 实例的模块。
- 管理地图生命周期、来源、图层和相机。
- 高频地图事件保留在引擎内部，不进入 React state。
- 对外暴露语义命令，例如 `flyTo()`、`resetView()` 和 `setLayerVisibility()`。
- 图层命令只接受 `GlobeLayerId` 或 `GlobeLayerGroupId`，避免界面传入任意字符串。

### LayerRegistry

`src/globe/layer-registry.ts` 是地图图层身份和分组的唯一来源：

- 每个条目声明稳定 ID、MapLibre `source-layer`、是否允许用户切换；
- 水系、参考边界和经纬网通过语义分组控制；
- `style.ts` 使用同一注册表创建图层；
- `GlobeEngine` 将分组命令解析为一组 MapLibre 图层显隐操作；
- 新增底图 Source Layer 时，必须同时通过底图契约和注册表测试。

图层面板状态属于低频 React UI 状态。MapLibre 仍持有实际渲染状态；界面只在用户
操作时向引擎发送单向命令，地球移动和渲染不会引起 React 重渲染。

### CameraCommand

`src/globe/camera-command.ts` 是所有程序化镜头操作的稳定边界。当前命令集合：

```text
jump-to     立即定位
fly-to      平滑飞向一个中心点
fit-bounds  让一个地理范围完整进入视口
reset       返回首页默认镜头
stop        取消当前镜头动画
```

命令先完成数值验证、默认值解析和减少动态降级，再由 `GlobeEngine` 转换为
MapLibre 调用。执行任意命令时先停止现有动画，因此未来专题连续发出镜头步骤时
不会形成并行过渡。

React 不订阅 `move` 或 `render` 事件来保存相机位置。未来 URL 分享功能应在明确的
低频提交点读取相机快照，而不是让每一帧进入 React state。

### FeatureSelection

`src/globe/selection.ts` 定义 MapLibre 与产品界面之间的选择数据边界：

```text
MapLibre click / programmatic screen point
                ↓
queryRenderedFeatures(selectable layer ids)
                ↓
GlobeSelectionChange
├── coordinate
├── screenPoint
└── feature | null
```

可选择性由 `layer-registry.ts` 声明，而不是由界面临时拼接图层 ID。当前陆地、
湖泊、主要河流和参考边界可选；海洋背景和经纬网不可选。

进入 React 前只保留稳定的图层 ID、来源、几何类型、要素 ID 和原始类型属性。
嵌套对象、非有限数字及其他 MapLibre 内部结构不会跨越边界。React 通过稳定 ref
读取最新回调，因此父组件回调变化不会触发地球实例重建。当前接口不持有选择状态，
状态应由未来真正消费它的低频界面决定。

### URLState

`src/globe/url-state.ts` 提供不依赖 Next.js Router 的纯编解码边界：

```text
gm-view=1,lng,lat,zoom,bearing,pitch
gm-hidden=water,graticule
```

`gm-view` 的第一项是协议版本；无效或未知版本回退到默认镜头。
`gm-hidden` 使用图层注册表中的语义组 ID，只记录相对默认值的差异。

浏览器只在 MapLibre `moveend` 和用户切换图层时调用 `history.replaceState`。
这不会为每次拖动制造历史记录，也不会引起 Next.js 路由刷新。初始化时直接从
`window.location.search` 读取一次，不订阅查询参数变化；相机高频状态仍然只存在于
MapLibre。默认状态会从 URL 中省略，其他应用参数与 hash 保持不变。

### GlobeEventHub

`src/globe/events.ts` 是引擎到产品界面的唯一产品事件出口：

```text
GlobeEngine
├── ready
├── error
├── camera-change
├── selection-change
└── layer-visibility-change
        ↓
GlobeEventHub
        ↓ one stable subscription
GlobeViewport
├── runtime reducer
├── URL synchronization
└── optional product callback
```

事件使用判别联合类型，消费者必须按 `type` 收窄。Hub 使用稳定监听器快照，
取消订阅函数幂等，`destroy()` 会清空全部监听器。React 只建立一次订阅，并通过
ref 访问最新产品回调，因此回调身份变化不触发 MapLibre 重建。

性能快照不是产品交互事件，继续使用独立且节流的开发遥测回调，避免未来产品订阅者
意外处理帧级数据。

## 4. 状态归属

```text
React state
└── 菜单、按钮、弹层等低频 UI 状态

MapLibre
└── 相机、缩放、手势、实际图层显隐和渲染状态

URL
└── 未来需要分享的视角、地点和图层状态
```

当前不引入 Zustand。只有多个页面或独立组件需要共享稳定业务状态时才重新评估。

## 5. PMTiles 数据契约

项目默认加载仓库中的本地底图：

```text
/maps/geomuse-basemap.pmtiles
```

运行 `pnpm data:basemap` 可以从固定版本的 Natural Earth 数据重新生成该文件。
完整的数据来源和构建说明见 `docs/data/basemap.md`。

部署到对象存储后，可通过以下公开环境变量覆盖底图：

```text
NEXT_PUBLIC_BASEMAP_PMTILES_URL
```

允许的值：

```text
/maps/geomuse-basemap.pmtiles
https://static.example.com/maps/geomuse-basemap.pmtiles
```

当前底图 contract v1 包含：

```text
land
lakes
rivers
boundaries
```

`src/globe/basemap-provider.ts` 是运行时 Provider 边界。页面只传递序列化的
Provider 配置，`GlobeEngine` 在浏览器中根据当前 Origin 解析最终 URL。Provider
会拒绝非 HTTP(S)、内嵌凭据、查询参数、片段、非 `.pmtiles` 路径和 HTTPS
页面上的混合内容。

本地和远程 Natural Earth 归档共享相同 Source Layer contract 与署名。未来增加
区域级 OSM 时，应新增独立 Provider ID 和契约，不能让同一个 ID 在运行时改变
Source Layer 语义。

PMTiles 元数据必须包含真实的数据来源和署名。界面不得隐藏 MapLibre Attribution Control。

底图请求失败时，地球仍需显示背景、大气和经纬网，便于独立开发和性能诊断。

## 6. 地图样式

- 地图样式由 TypeScript 工厂生成并接受类型检查。
- 不把 MapTiler、Mapbox 或其他商业服务 URL 写入默认代码。
- 字体、Sprite 和地图数据最终全部可自托管。
- 第一版目标缩放范围为全球尺度 `0–6`。
- 默认不加载道路、建筑和街道级地名。

## 7. 性能边界

- 全站只创建一个主要 MapLibre 实例。
- PMTiles Protocol 在应用生命周期内只注册一次。
- 远程 Provider 上线前必须运行 `pnpm data:http -- <archive-url> <page-origin>`。
- 大数据使用矢量瓦片，不长期加载大型 GeoJSON。
- GeoJSON 仅用于小型调试图层和低数量动态要素。
- 不为 Liquid Glass 创建持续运行的第二套全屏 WebGL 管线。
- 地球交互期间不触发高频 React 更新。
- 新增图层必须验证桌面和移动端帧率、内存和加载耗时。

## 8. 当前不引入

- CesiumJS
- deck.gl
- Three.js
- Zustand
- Supabase
- 用户认证
- Headless CMS
- 实时气象管道
- AI 问答

## 9. 相关规范

- [Liquid Glass 设计规范](../design/liquid-glass.md)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre)
