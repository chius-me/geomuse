# GeoMuse 浏览器安全基线

日期：2026-07-26

本文件记录 GeoMuse 当前的浏览器安全边界。策略目标是在保持静态页面与
MapLibre 高性能渲染的同时，避免使用 `blob:` Worker，并将可执行资源限制在
同源。

## MapLibre CSP Worker

GeoMuse 使用 MapLibre GL JS 提供的 CSP 专用构建：

```text
maplibre-gl-csp.js
maplibre-gl-csp-worker.js
```

`predev` 和 `prebuild` 会运行 `scripts/sync-static-assets.mjs`，从当前锁定的
`maplibre-gl` npm 依赖复制 Worker 到：

```text
/vendor/maplibre-gl-csp-worker.js
```

生成文件不进入 Git。它始终由 `pnpm-lock.yaml` 中锁定的 MapLibre 版本产生，
同步脚本会输出文件大小和 SHA-256 短摘要。升级 MapLibre 后必须重新构建并运行
生产冒烟测试，不能单独保留旧 Worker。

MapLibre 主实例、Worker 设置和 PMTiles `addProtocol` 必须使用同一个 CSP
运行时。若 PMTiles 注册到标准构建、地球实例使用 CSP 构建，协议将不会被接管。

## Content Security Policy

响应头由 `src/security/headers.ts` 统一定义；静态生产构建由同步脚本生成
Cloudflare `_headers`。Next.js 静态导出不支持应用级 `headers()`，因此生产安全
契约以本地 Workers 预览和 Cloudflare 响应为准。关键限制：

```text
default-src 'self'
worker-src 'self'
connect-src 'self'
object-src 'none'
frame-src 'none'
frame-ancestors 'none'
```

`worker-src` 不允许 `blob:`。MapLibre Worker、PMTiles、Next.js 资源和当前字体
全部来自同源。

当前静态 Next.js 页面在 `script-src` 与 `style-src` 中仍使用
`'unsafe-inline'`，用于 Next.js 内联启动脚本和现有内联样式。若以后需要移除它，
应采用 nonce 或构建期 hash，并重新评估静态渲染、缓存和部署成本，不能直接删除
后假定页面仍能水合。

MapLibre 图片路径保留 `data:` 与 `blob:`，但它们只存在于 `img-src`，不会赋予
Worker 或脚本执行权限。

## 远程数据源

当前 `connect-src 'self'` 与本地 PMTiles 方案一致。未来启用远程
`BasemapProvider` 时，需要把经过审查的精确 HTTPS Origin 加入 `connect-src`；
不要使用 `https:` 或 `*` 放开全部网络请求。远程服务仍需满足 PMTiles Range、
ETag 与 CORS 契约。

## 其他响应头

当前统一发送：

- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Permissions-Policy` 禁用相机、麦克风、定位与浏览主题

HSTS 只应由确认全站 HTTPS 的生产入口设置，localhost 和未知部署环境不在应用层
提前发送该头。

## 自动验证

```bash
pnpm test
pnpm build
pnpm perf:budget
pnpm test:smoke:run
```

单元测试锁定 CSP 指令和基础响应头。生产 Chromium 冒烟测试进一步验证：

- HTML 实际收到安全响应头；
- `worker-src` 只有 `'self'`，没有 `blob:`；
- 同源 Worker 返回 200 和 JavaScript MIME；
- PMTiles 继续返回合法 `206 Partial Content`；
- 页面没有 CSP、控制台或未处理运行时错误。
