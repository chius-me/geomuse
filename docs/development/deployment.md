# GeoMuse Cloudflare CI/CD

日期：2026-07-26

## 架构选择

GeoMuse 是静态导出的 Next.js 应用，但底图 PMTiles 依赖标准 HTTP
`206 Partial Content`。Cloudflare Pages 当前会把 Range 请求作为 `200` 返回，
因此不满足项目已有的 PMTiles HTTP 契约。

首版使用 Cloudflare Workers Static Assets：

```text
Next.js static export
        ↓
       out/
        ↓
Cloudflare Workers Static Assets
        ↓
HTML / Next 静态资源 / MapLibre Worker / PMTiles
```

只有 `/maps/*` 进入 Worker：它负责 PMTiles Range 与一小时边缘缓存，优先使用
Cloudflare Cache API 的标准 Range 命中，冷缓存时返回首个合法 `206`。其他静态
资源绕过 Worker，由 Cloudflare 资产层直接处理。当前没有数据库或其他绑定。

## 本地构建与预览

```bash
pnpm install
pnpm build
pnpm preview:cloudflare
```

`prebuild` 自动同步 MapLibre CSP Worker，并从
`src/security/headers.ts` 生成 Cloudflare `_headers`。不要手动编辑生成文件。

部署配置位于 `wrangler.jsonc`：

- 项目名：`geomuse`
- 输出目录：`out`
- 未找到页面：静态 `404.html`
- URL：自动尾斜杠策略

发布前执行：

```bash
pnpm deploy:cloudflare:check
```

## GitHub Actions

`.github/workflows/smoke.yml` 在 Pull Request、`main` 推送和手动触发时运行：

1. 冻结锁文件安装；
2. 单元与契约测试；
3. 底图验证；
4. lint 与 TypeScript；
5. Next.js 静态构建；
6. 性能预算；
7. Wrangler dry run；
8. Chromium 生产冒烟测试；
9. `main` 分支自动部署。

部署只在以下 GitHub Actions Secrets 都存在时执行：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

API Token 只授予目标 Cloudflare Account 的 `Workers Scripts: Edit` 权限。不要把
Token、Account ID 或 `.dev.vars` 提交到仓库。

使用 GitHub CLI 配置：

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

未配置 Secrets 时，质量门禁照常运行，部署步骤会明确跳过。

## 手动部署

本机完成 `wrangler login` 后：

```bash
pnpm build
pnpm deploy:cloudflare
```

首次部署会创建 `geomuse` Worker。后续部署由 GitHub Actions 执行。

## 上线验收

部署 URL 必须通过：

```bash
pnpm data:http -- <production-pmtiles-url>
```

并检查：

- HTML 与 Worker 响应包含 CSP；
- `/vendor/maplibre-gl-csp-worker.js` 返回 JavaScript MIME；
- PMTiles Range 请求返回 `206`、`Accept-Ranges` 和合法 `Content-Range`；
- 地球进入“地球已就绪”；
- 浏览器控制台没有 CSP 或未处理错误。
