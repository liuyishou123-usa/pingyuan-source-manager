# 🚀 Cloudflare Workers 部署快速指南

## 一键部署步骤

### 第1步：克隆仓库
```bash
git clone https://github.com/liuyishou123-usa/pingyuan-source-manager.git
cd pingyuan-source-manager
npm install
```

### 第2步：安装 Wrangler（Cloudflare CLI）
```bash
npm install
```
> Wrangler 已在 devDependencies 中，npm install 会自动安装

### 第3步：登录 Cloudflare 账户
```bash
npx wrangler login
```
> 浏览器会打开 Cloudflare 登录页面，授权后自动返回

### 第4步：创建 KV 命名空间
```bash
# 生产环境
npx wrangler kv:namespace create "SOURCES_KV"

# 开发环境预览
npx wrangler kv:namespace create "SOURCES_KV" --preview
```

复制返回的 `id` 和 `preview_id`，更新 `wrangler.toml` 文件中的这两行：
```toml
[[kv_namespaces]]
binding = "SOURCES_KV"
id = "YOUR_KV_NAMESPACE_ID"           # ← 粘贴 id
preview_id = "YOUR_KV_PREVIEW_ID"     # ← 粘贴 preview_id
```

### 第5步：本地测试（可选）
```bash
npm start
```
访问 http://localhost:8787 测试

### 第6步：部署到 Cloudflare
```bash
npm run deploy
```

✅ 部署成功！你会看到类似这样的输出：
```
✨ Successfully published your Worker to:
https://pingyuan-source-manager.YOUR-USERNAME.workers.dev
```

---

## 📝 部署后的配置

### 查看部署日志
```bash
npx wrangler tail
```

### 重新部署
```bash
npm run deploy
```

### 修改定时任务间隔
编辑 `wrangler.toml` 中的 `triggers.crons`：
```toml
[[triggers.crons]]
crons = ["0 */6 * * *"]  # 修改这里
```

常见 Cron 表达式：
- `0 * * * *` - 每小时
- `0 */6 * * *` - 每6小时 ⭐ 默认
- `0 0 * * *` - 每天午夜
- `0 0 * * 0` - 每周日午夜
- `*/5 * * * *` - 每5分钟

---

## 🌐 使用方式

### 1️⃣ 访问 Web 管理界面
```
https://pingyuan-source-manager.YOUR-USERNAME.workers.dev/
```

### 2️⃣ API 调用示例

**添加视频源**
```bash
curl -X POST https://pingyuan-source-manager.YOUR-USERNAME.workers.dev/api/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "我的视频源",
    "url": "https://api.example.com/videos",
    "enabled": true,
    "updateInterval": "0 */6 * * *"
  }'
```

**获取所有视频源**
```bash
curl https://pingyuan-source-manager.YOUR-USERNAME.workers.dev/api/sources
```

**手动触发更新**
```bash
curl -X POST https://pingyuan-source-manager.YOUR-USERNAME.workers.dev/api/sources/1/update
```

**获取系统状态**
```bash
curl https://pingyuan-source-manager.YOUR-USERNAME.workers.dev/api/status
```

---

## 💰 免费额度

Cloudflare Workers 免费计划：
- ✅ 100,000 请求/天
- ✅ KV 存储 1GB
- ✅ 定时任务无限制
- ✅ 支持自定义域名

---

## 🔧 故障排查

### 问题：部署时找不到 wrangler
**解决**：
```bash
npm install
npx wrangler deploy
```

### 问题：KV 命名空间未找到
**解决**：
1. 检查 `wrangler.toml` 中的 id 和 preview_id 是否正确
2. 确保创建了两个命名空间（生产 + 预览）

### 问题：定时任务不执行
**解决**：
1. 检查 `wrangler.toml` 中是否有 `[[triggers.crons]]` 配置
2. 部署后等待几分钟
3. 运行 `npx wrangler tail` 查看日志

### 问题：无法登录 Cloudflare
**解决**：
```bash
npx wrangler logout
npx wrangler login
```

---

## 📚 完整 API 文档

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/sources` | 获取所有视频源 |
| POST | `/api/sources` | 创建新视频源 |
| GET | `/api/sources/:id` | 获取单个视频源 |
| PUT | `/api/sources/:id` | 更新视频源 |
| DELETE | `/api/sources/:id` | 删除视频源 |
| POST | `/api/sources/:id/update` | 手动触发更新 |
| GET | `/api/status` | 获取系统状态 |
| GET | `/` | Web 管理界面 |

---

## 🎯 下一步

1. ✅ 部署完成后，访问你的 Worker URL
2. 📝 在 Web 界面中添加你的第一个视频源
3. 🔄 定时任务会自动执行更新
4. 📊 使用 `npm start` 本地开发和测试新功能

---

## ❓ 需要帮助？

- 查看 Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
- 查看 Wrangler CLI 文档：https://developers.cloudflare.com/workers/wrangler/
- 提交 Issue：https://github.com/liuyishou123-usa/pingyuan-source-manager/issues
