# ADR 001：固定 MapLibre GL JS 5.12.0

状态：已接受
日期：2026-07-26

## 背景

GeoMuse 的首个运行版本使用 MapLibre GL JS 6.0.0。自动化类型检查和生产构建
通过，但真实浏览器中 Vector Tile 和 GeoJSON 图层没有完成加载。

## 决策

项目固定使用 MapLibre GL JS 5.12.0，不使用宽松版本范围。

## 原因

- 5.12.0 在当前 Next.js、PMTiles 和 Chromium 环境中通过真实浏览器验收；
- Globe Projection、PMTiles Vector Tile、GeoJSON 经纬网和相机交互均正常；
- 当前产品更需要稳定、可测量的渲染基线，而不是追逐主版本号；
- 6.x 没有提供当前阶段必须使用的能力。

## 影响

- `package.json` 必须保留精确版本；
- Dependabot 或人工升级不能直接合并 MapLibre 主版本更新；
- 升级 6.x 前必须创建独立分支，并重复 PMTiles、GeoJSON、加载生命周期、交互和
  性能验收；
- 该决定不妨碍未来升级，只是要求升级有证据。
