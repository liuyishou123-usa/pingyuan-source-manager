# Cloudflare Workers 部署指南

## 快速开始

### 1. 安装 Wrangler

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 创建 KV 命名空间

```bash
wrangler kv:namespace create "pingyuan-sources"
wrangler kv:namespace create "pingyuan-sources" --preview
```

复制返回的命名空间 ID 和 preview_id，更新 `wrangler.toml` 文件。

### 4. 本地开发

```bash
npm start
```

访问 `http://localhost:8787` 进行测试。

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

## 功能特性

✅ **REST API** - 完整的视频源管理接口
- `GET /api/sources` - 获取所有视频源
- `POST /api/sources` - 创建新视频源
- `GET /api/sources/:id` - 获取单个视频源
- `PUT /api/sources/:id` - 更新视频源
- `DELETE /api/sources/:id` - 删除视频源
- `POST /api/sources/:id/update` - 手动触发更新
- `GET /api/status` - 获取系统状态

✅ **定时任务** - 自动检查和更新视频源
- 支持自定义 Cron 表达式
- 默认每 6 小时执行一次
- 自动记录更新历史

✅ **Web 管理界面** - 访问 `/` 获取管理后台
- 查看所有视频源
- 添加/编辑/删除视频源
- 手动触发更新
- 查看系统状态

✅ **数据存储** - 使用 Cloudflare KV 存储
- 视频源配置
- 更新历史记录
- 视频源数据缓存

## 环境变量

在 `wrangler.toml` 中配置：

```toml
[env.production]
vars = { ENVIRONMENT = "production" }

[env.development]
vars = { ENVIRONMENT = "development" }
```

## 定时任务配置

编辑 `wrangler.toml` 中的 `triggers.crons` 部分：

```toml
[[triggers.crons]]
crons = ["0 */6 * * *"]  # 每6小时执行一次
```

常见 Cron 表达式：
- `0 * * * *` - 每小时
- `0 */6 * * *` - 每6小时
- `0 0 * * *` - 每天午夜
- `0 0 * * 0` - 每周日午夜

## 文件结构

```
.
├── src/
│   └── index.js              # 主应用文件
├── wrangler.toml            # Cloudflare Workers 配置
├── package.json             # 项目配置
├── README.md                # 原始 README
└── README-CLOUDFLARE.md     # 本文件
```

## 成本估计

Cloudflare Workers 提供：
- 免费账户：100,000 请求/天
- KV 存储：免费 1GB
- 定时任务：免费

## 故障排查

### KV 命名空间未找到

确保在 `wrangler.toml` 中正确配置了命名空间 ID。

### 定时任务不执行

1. 确认已在 `wrangler.toml` 中配置 `[[triggers.crons]]`
2. 部署后等待几分钟
3. 在 Cloudflare Dashboard 中查看日志

### 部署失败

运行 `wrangler publish` 查看详细错误信息。

## API 示例

### 创建新视频源

```bash
curl -X POST https://your-worker.workers.dev/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的视频源",
    "url": "https://api.example.com/videos",
    "enabled": true,
    "updateInterval": "0 */6 * * *"
  }'
```

### 手动触发更新

```bash
curl -X POST https://your-worker.workers.dev/api/sources/1/update
```

### 获取所有视频源

```bash
curl https://your-worker.workers.dev/api/sources
```

## 许可证

MIT License
