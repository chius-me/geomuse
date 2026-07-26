# 地球引擎开发遥测

日期：2026-07-26

本页记录阶段 3A 的开发环境遥测能力。它用于开发时快速发现退化，不替代 Chrome
Performance Trace，也不作为跨设备性能结论。

## 已实现指标

| 指标 | 定义 |
| --- | --- |
| 地图加载耗时 | `GlobeEngine` 初始化到 MapLibre `load` 事件 |
| 帧均值 | 最近 120 个有效 MapLibre `render` 事件的平均间隔 |
| 帧 P95 | 最近 120 个有效帧间隔的第 95 百分位 |
| 长任务 | 浏览器 `longtask` Performance Entry 的数量与最大耗时 |

大于 250ms 的帧间隔被视为标签页空闲、后台挂起或两段交互之间的间隔，不纳入帧
统计。浏览器不支持 `longtask` 时，该项保持为 0。

## 开销控制

- 仅开发构建创建采样器和显示面板；
- MapLibre 仍管理高频渲染状态；
- React 最多每 500ms 接收一次快照；
- 采样窗口固定为 120 帧，不随运行时间增长；
- 生产构建不传入性能回调，因此不创建采样器。

## 浏览器验收

环境：1280×720，Codex in-app browser，Next.js 开发构建。

| 操作 | 预期 | 结果 |
| --- | --- | --- |
| 首次进入 | 加载完成后出现地图加载耗时 | 通过 |
| 拖动地球 | 帧均值随新渲染样本更新 | 通过 |
| Long Task API | 显示数量与最大耗时 | 通过 |
| 干净页面会话 | Console 无 warning/error | 通过 |
| 控件布局 | MapLibre Logo 不遮挡复位按钮 | 通过 |

验收时观察到的加载与帧数据只证明采样链路有效。开发服务器、设备负载和热缓存都
会影响数值，因此不写入正式预算。

## 正式基线

正式阶段 3B 已通过 Chrome DevTools MCP 完成，包括：

1. production build 冷启动 Trace；
2. Core Web Vitals 与主线程分析；
3. PMTiles、MapLibre worker 和首屏资源请求分析；
4. 桌面与移动视口的可比较基线；
5. 可访问性树快照。

完整结果与预算见 `docs/development/performance-baseline.md`。开发面板数值仍只用于
快速发现退化，正式比较以 production Trace 为准。
