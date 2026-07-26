# GeoMuse 基础底图

GeoMuse 的本地底图由 Natural Earth 的全球陆地、湖泊、主要河流和参考边界
数据生成，并以单个 PMTiles 文件交给 MapLibre GL JS 加载。它只服务于全球和
区域尺度的 3D 地球，不承担街道级导航。

## 数据版本

| 项目 | 值 |
| --- | --- |
| 版本 | 5.1.2 |
| 许可证 | Public domain |
| 输出缩放级别 | 0–6 |

| 数据集 | 上游文件 | SHA-256 | Source Layer | 起始 zoom |
| --- | --- | --- | --- | ---: |
| 1:110m Land | `ne_110m_land.geojson` | `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9` | `land` | 0 |
| 1:110m Lakes | `ne_110m_lakes.geojson` | `eb02ecc86c82004fccbf979058bfabbbd6c2d07968c7844d38eb1c9152d2ffc9` | `lakes` | 1 |
| 1:110m Rivers + Lake Centerlines | `ne_110m_rivers_lake_centerlines.geojson` | `55aa4497405afc07cdc931b7fbe062c4d6693ba2a550c0d24899953f5d507c8d` | `rivers` | 2 |
| 1:110m Admin 0 Boundary Lines Land | `ne_110m_admin_0_boundary_lines_land.geojson` | `d42479fd79552cca4eec7f85fcdca717a790d29ff06be7676f1af0568c6d3f7c` | `boundaries` | 2 |

Natural Earth 要求不多，但项目仍保留推荐署名：

> Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.

此署名同时写入 PMTiles 元数据，并由 MapLibre Attribution Control 显示。

## 生成

需要 Node.js 和 pnpm：

```bash
pnpm install
pnpm data:basemap
pnpm data:verify
```

脚本会：

1. 从固定的 Natural Earth 5.1.2 标签下载四个 GeoJSON；
2. 分别校验源文件 SHA-256；
3. 删除当前渲染不使用的要素属性，只保留几何；
4. 用 `geojson-vt` 与 `vt-pbf` 将四个 Source Layer 写入同一批矢量瓦片；
5. 按 PMTiles v3 规范写入目录、元数据和压缩后的瓦片；
6. 写入 `public/maps/geomuse-basemap.pmtiles`。

`pnpm data:verify` 不只检查 PMTiles 头和元数据，还会确认 `land`、`lakes`、
`rivers`、`boundaries` 分别在其起始 zoom 的真实 MVT 内容中出现。

## Source Layer 契约

底图使用 contract v1，单一事实来源是：

```text
src/globe/basemap-contract.ts
```

契约固定：

- Natural Earth 版本；
- 上游文件名和 SHA-256；
- Source Layer ID 与起始 zoom；
- PMTiles zoom 范围和预期瓦片数；
- 数据过滤规则与统一署名。

构建脚本、PMTiles 校验和 MapLibre 样式测试共同依赖该契约。新增、删除或重命名
Source Layer 时，必须显式提升契约版本，并同时更新数据与样式迁移说明。

PMTiles 元数据保存 `geomuse_basemap_contract: 1`，校验脚本会拒绝缺失或版本不匹配
的归档。

## 边界语义

Natural Earth 的 `Admin 0 Boundary Lines Land` 同时包含普通国际边界、争议线、
控制线、不确定边界和主张边界。GeoMuse contract v1 在构建阶段只允许：

```text
FEATURECLA = International boundary (verify)
```

以下类型不会进入 `boundaries` Source Layer：

- `Disputed (please verify)`；
- `Line of control (please verify)`；
- `Indefinite (please verify)`；
- 其他主张或不确定边界。

边界瓦片从 zoom 2 存在，地图样式从 zoom 2.5 才以低对比度显示。它仅用于
小比例尺地理参考，不代表 GeoMuse 对主权、管辖或法律边界的立场，也不应作为
行政、导航或法律用途的权威来源。

下载缓存位于 `.cache/`，不进入版本控制。最终 PMTiles 是可部署资源，默认 URL
为：

```text
/maps/geomuse-basemap.pmtiles
```

生产环境如将文件迁移到对象存储，使用不可变版本文件名并设置：

```text
NEXT_PUBLIC_BASEMAP_PMTILES_URL=https://static.example.com/maps/geomuse-basemap-v1.pmtiles
```

Provider URL 必须使用 HTTP(S)、以 `.pmtiles` 结尾，且不能包含用户名、密码、
查询参数或片段。HTTPS 页面只允许 HTTPS 底图。

## HTTP Range 与 CORS 验收

同源本地生产预览：

```bash
pnpm data:http
```

远程对象存储：

```bash
pnpm data:http -- \
  https://static.example.com/maps/geomuse-basemap-v1.pmtiles \
  https://geomuse.example.com
```

命令会真实执行：

1. 跨域时发送 OPTIONS 预检；
2. 验证 `GET`、`HEAD`、`Range` 和 `If-Match` 权限；
3. 请求 `Range: bytes=0-126`；
4. 要求 `206 Partial Content`、`Accept-Ranges: bytes` 和合法
   `Content-Range`；
5. 校验 127 字节 PMTiles v3 文件头；
6. 跨域时要求正确的 `Access-Control-Allow-Origin`、`ETag` 和
   `Access-Control-Expose-Headers: ETag`。

任何一步失败都会以非零状态退出，适合放进部署前 CI。对象存储的具体 CORS
配置格式以供应商文档为准；Cloudflare R2、S3 等平台都应遵守上述响应契约。

## 为什么从 Natural Earth 开始

- 全球尺度数据体积小，适合首屏；
- 公有领域，许可边界清晰；
- 海岸线在低缩放级别足够稳定；
- 湖泊和主要河流足以支撑全球、洲际和大区域尺度的地理辨识；
- 低权重参考边界只在区域级出现，不主导自然地理表达；
- 可以先验证球体、相机、样式和 PMTiles 管线，再逐步增加 OSM 数据。

它不是高精度海岸线。用户放大到区域或城市尺度后，未来应切换到独立的
OpenStreetMap 派生底图，而不是继续放大 1:110m 数据。
