# GeoMuse — 地球万象

转动地球，理解世界。

GeoMuse 是一个以高性能交互式 3D 地球为入口的地理科普产品。目前版本专注于
地图引擎底座：全球到区域尺度浏览、可复现的开源底图、图层控制、镜头命令、
地理要素选择、可分享 URL 状态与生产级浏览器安全策略。

## 技术栈

- Next.js 16、React 19、严格 TypeScript
- MapLibre GL JS Globe Projection
- Natural Earth、PMTiles
- Cloudflare Workers Static Assets
- Playwright 生产浏览器回归

## 本地开发

要求 Node.js 24 和 pnpm 11.9。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>。

## 验证

```bash
pnpm test
pnpm data:verify
pnpm lint
pnpm typecheck
pnpm build
pnpm perf:budget
pnpm deploy:cloudflare:check
pnpm test:smoke:run
```

首次运行浏览器测试前安装 Chromium：

```bash
pnpm test:smoke:install
```

## 部署

生产环境：<https://geomuse.chius.dev>。构建导出到 `out/`，由 Cloudflare Workers Static Assets 托管：

```bash
pnpm build
pnpm deploy:cloudflare
```

`main` 分支的 GitHub Actions 会执行完整质量门禁；配置
`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 后自动部署。完整说明见
[`docs/development/deployment.md`](docs/development/deployment.md)。

## 文档

- [架构基础](docs/architecture/foundation.md)
- [Liquid Glass 设计规范](docs/design/liquid-glass.md)
- [增量开发路线](docs/development/roadmap.md)
- [性能基线](docs/development/performance-baseline.md)
- [浏览器安全基线](docs/development/security.md)
- [底图数据](docs/data/basemap.md)

## License

- 软件源代码：Apache License 2.0
- `docs/` 下原创科普与设计内容：CC BY-SA 4.0
- 第三方数据和软件：遵循各自许可证
- GeoMuse 名称、Logo 与品牌视觉：保留所有权利

详见 `LICENSE`、`LICENSE-CONTENT`、`NOTICE` 和
`THIRD_PARTY_NOTICES.md`。
