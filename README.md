# Game Reference Radar

每日游戏创意灵感日报工具。它会从 App Store、Google Play 等公开来源抓取休闲游戏竞品素材，生成 10 张精选灵感卡片。每张卡片包含图片、灵感类型、素材类型、推荐理由、可转化成游戏想法、来源信息和反馈按钮。

## 功能

- 今日精选 10 张游戏参考图。
- 按游戏品类筛选：螺丝解谜、货架整理、三消、合成、装修、找物、停车、放置经营等。
- 按灵感类型筛选：玩法机制、关卡结构、场景氛围、道具交互、视觉风格、UI反馈、反常组合。
- 按素材类型筛选：ICON、宣传图、活动图。
- 收藏、跳过、更多类似、屏蔽标签反馈。
- 本地版支持 Windows 计划任务和系统通知。
- 分享版支持 Netlify 部署。

## 本地启动

```powershell
cd F:\codex\work\game-reference-radar
node src\server.js
```

打开：

```text
http://127.0.0.1:4188
```

如果 Google Play 需要走系统代理：

```powershell
npm run start:proxy
```

PowerShell 如果拦截 `npm.ps1`，可以用：

```powershell
cmd /c npm run start:proxy
```

## 生成日报

```powershell
node src\daily.js --no-notify
```

走系统代理：

```powershell
npm run daily:proxy
```

## Netlify 部署

项目已经包含 `netlify.toml` 和 `netlify/functions/api.mjs`。

推荐方式：

1. 上传到 GitHub。
2. 在 Netlify 选择 `Add new site` -> `Import an existing project`。
3. 选择这个仓库。
4. Build command 留空。
5. Publish directory 填 `public`。
6. Functions directory 填 `netlify/functions`。
7. 部署后得到 `*.netlify.app` 链接。

也可以使用 CLI：

```powershell
cmd /c npm run deploy:netlify
```

## API Key

默认以 App Store / Google Play 竞品素材为主，不依赖 Pexels 或 Unsplash。

可选环境变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`

部署版也支持在网页设置页填写 key。key 会保存在当前浏览器本地，并在刷新推荐时发送给 Netlify Function 使用。

## 隐私和合规

- 不上传 `data/secrets.json`。
- 不上传个人反馈、历史日报、缩略图缓存和日志。
- Pinterest 仅支持官方授权或手动种子链接，不抓取页面、不绕过登录、不批量下载原图。
- 默认只缓存缩略图和元数据，不批量下载原图。
