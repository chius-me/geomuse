# 3D 地球浏览器验收基线

日期：2026-07-26
构建：Next.js production build
浏览器：Chromium 内核的 Codex in-app browser
MapLibre GL JS：5.12.0

## 验收结果

| 项目 | 环境 | 结果 | 证据 |
| --- | --- | --- | --- |
| PMTiles Range Request | localhost | 通过 | 返回 `206 Partial Content` |
| PMTiles 协议读取 | Node + HTTP | 通过 | v3、2,951 个 MVT、`land` 图层 |
| 地球首次加载 | 1280×720 | 通过 | 状态切换为“地球已就绪” |
| Natural Earth 陆地 | 1280×720 | 通过 | 亚洲、澳大利亚等轮廓可见 |
| 经纬网 | 1280×720 | 通过 | 纬线和经线随球体正确弯曲 |
| 鼠标拖动 | 1280×720 | 通过 | 视角由亚洲旋转到非洲 |
| 滚轮缩放 | 1280×720 | 通过 | 画面尺度发生变化 |
| 键盘方向键 | 1280×720 | 通过 | 聚焦地图后视角发生变化 |
| 复位视角 | 1280×720 | 通过 | 返回亚洲默认视角 |
| 响应式布局 | 390×844 | 通过 | 品牌栏、地球、状态和复位控件均在视口内 |
| 开发性能遥测 | 1280×720 | 通过 | 加载、帧均值、帧 P95 和 Long Task 正常更新 |
| MapLibre Logo 遮挡 | 1280×720 | 通过 | 复位按钮与左下角 Logo 保持间距 |
| 真实触屏手势 | 实体触屏设备 | 待验收 | 浏览器自动化不能替代真实触摸事件 |
| WebGL 失败界面 | 无 WebGL 环境 | 待验收 | 状态转换已有单元测试 |

浏览器交互通过前后截图的 SHA-256 变化验证画面确实发生变化，而不是只验证事件
是否被触发。

## 兼容性发现

最初使用 MapLibre GL JS 6.0.0 时出现：

- WebGL Canvas 和背景球体能够创建；
- Vector Tile 与 GeoJSON 工作线程图层不完成加载；
- `load` 事件不触发；
- 页面持续停留在“正在初始化地球”；
- 无明确控制台错误。

同一份代码、PMTiles、浏览器和生产构建切换到 5.12.0 后，陆地、经纬网和加载
状态全部恢复。因此当前项目固定使用 5.12.0。升级到 6.x 必须作为独立兼容性
任务执行，不能直接修改依赖版本。

## 本轮修正

- PMTiles 相对路径先根据当前 Origin 解析为绝对 URL；
- Source 使用显式瓦片模板、缩放范围和署名；
- MapLibre 固定为 5.12.0；
- 暂时移除未经性能与兼容验证的自定义 `sky` 和 `light`；
- 清理失败的 Go 转换产生的约 1.2 GB 可再生成缓存。

## 性能阶段依赖

开发态遥测见 `docs/development/performance-telemetry.md`；production Chrome
Performance Trace、网络预算和移动审计见
`docs/development/performance-baseline.md`。
