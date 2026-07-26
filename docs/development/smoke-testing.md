# GeoMuse 生产浏览器冒烟测试

日期：2026-07-26

## 目标

冒烟测试验证真正的 Next.js 静态生产构建，并通过本地 Cloudflare Workers
Static Assets 提供服务，而不是开发服务器。测试覆盖地球首屏、PMTiles Range
Request、镜头和图层 URL、刷新还原及移动端关键布局。

## 首次安装

依赖安装后，单独安装 Chromium：

```bash
pnpm test:smoke:install
```

Playwright 的 npm 包和浏览器二进制版本需要匹配。升级
`@playwright/test` 后应重新执行安装命令。

## 运行

完整生产测试：

```bash
pnpm test:smoke
```

该命令依次执行生产构建和浏览器测试。已经存在最新 `out/` 构建时，可以只运行：

```bash
pnpm test:smoke:run
```

测试服务器使用 `127.0.0.1:3100`，不会占用日常预览的 3000 端口。

## 当前用例

| 用例 | 主要断言 |
| --- | --- |
| 桌面生产加载 | 安全响应头、同源 CSP Worker、地球就绪、PMTiles 206 |
| 状态刷新闭环 | `gm-view`、`gm-hidden`、刷新还原、复位清理、无关参数保留 |
| 390×844 移动 | 分享镜头、隐藏图层、面板边界、控制器与署名无重叠 |

桌面加载还会确认 `worker-src` 不含 `blob:`、Worker 返回 JavaScript MIME，
PMTiles 返回合法 `Content-Range`。每条用例都会收集 `console.error` 和未处理
的页面异常，任何错误都会导致测试失败。

## 失败产物

失败时生成：

```text
test-results/
playwright-report/
```

本地打开 HTML 报告：

```bash
pnpm exec playwright show-report
```

Trace 只在失败时保留，可以用报告中的 Trace Viewer 查看网络、DOM、截图和操作步骤。

## CI

`.github/workflows/smoke.yml` 在 Pull Request、`main` 推送和手动触发时运行：

```text
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium
pnpm test:smoke:run
```

CI 串行运行三条用例，减少共享 WebGL 和本地生产服务造成的波动。失败时上传
Playwright HTML 报告，保留 7 天；`main` 在完整门禁通过后进入 Cloudflare
部署步骤。
