# Netlify 部署说明

这个项目现在支持两种运行方式：

- 本地版：`npm start` 或 `npm run start:proxy`，地址仍然是 `http://127.0.0.1:4188`。
- 分享版：部署到 Netlify 后，别人可以打开 `https://你的站点名.netlify.app/`。

## 推荐部署方式

1. 把 `F:\codex\work\game-reference-radar` 上传到 GitHub。
2. 打开 Netlify，选择 `Add new site` -> `Import an existing project`。
3. 连接这个 GitHub 仓库。
4. Build settings 保持：
   - Build command：留空
   - Publish directory：`public`
   - Functions directory：`netlify/functions`
5. 部署完成后，Netlify 会给一个 `*.netlify.app` 链接。

项目里的 `netlify.toml` 已经配置好了：

- `/api/*` 会转到 Netlify Function。
- 页面文件从 `public/` 发布。
- 刷新页面时仍然回到 `index.html`。

## API Key

部署版有两种 key 使用方式：

- 个人临时使用：在网页设置页填写，key 会保存在当前浏览器本地，并在刷新推荐时发给云函数使用。
- 站点统一使用：在 Netlify 后台的 Environment variables 里配置：
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
  - `PEXELS_API_KEY`
  - `UNSPLASH_ACCESS_KEY`

默认推荐已经以 App Store / Google Play 竞品素材为主，不依赖 Pexels 和 Unsplash。

## 注意

Netlify Functions 不适合长期写本地文件，所以部署版的收藏、反馈和设置优先保存在访问者自己的浏览器里。本地版仍然会保存到 `data/`。
