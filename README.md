# 品源管理系统 (Pingyuan Source Manager)

一个高效的视频源管理系统，支持定时检查 API 并自动更新视频源数据。

## 功能特性

✅ **定时自动更新** - 支持自定义 Cron 表达式的定时任务  
✅ **API 管理** - 添加、编辑、删除、禁用视频源 API  
✅ **视频源数据库** - 使用 SQLite 存储视频源信息  
✅ **REST API** - 完整的 RESTful API 接口  
✅ **Web 管理界面** - 简单易用的管理后台  
✅ **错误处理** - 自动重试和详细的错误日志  
✅ **实时监控** - 查看更新状态和历史记录  

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境

```bash
cp .env.example .env
```

编辑 `.env` 文件配置：
- `PORT` - 服务器端口 (默认 3000)
- `SCHEDULE_CRON` - Cron 表达式 (默认每6小时检查一次)
- `API_TIMEOUT` - API 超时时间
- `MAX_RETRIES` - 最大重试次数

### 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## API 文档

### 获取所有视频源 API

```bash
GET /api/sources
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "API 源 1",
      "url": "https://api.example.com/videos",
      "enabled": true,
      "updateInterval": "0 */6 * * *",
      "lastUpdated": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 创建新的视频源 API

```bash
POST /api/sources
```

**请求体：**
```json
{
  "name": "新视频源",
  "url": "https://api.example.com/videos",
  "enabled": true,
  "updateInterval": "0 */6 * * *"
}
```

### 获取单个视频源详情

```bash
GET /api/sources/:id
```

### 更新视频源 API

```bash
PUT /api/sources/:id
```

### 删除视频源 API

```bash
DELETE /api/sources/:id
```

### 手��触发更新

```bash
POST /api/sources/:id/update
```

### 获取更新历史

```bash
GET /api/sources/:id/history
```

### 获取系统状态

```bash
GET /api/status
```

## 项目结构

```
pingyuan-source-manager/
├── src/
│   ├── app.js                 # Express 应用主文件
│   ├── db.js                  # SQLite 数据库初始化
│   ├── scheduler.js           # 定时任务调度器
│   ├── routes/
│   │   ├── sources.js         # 视频源 API 路由
│   │   └── status.js          # 系统状态路由
│   ├── controllers/
│   │   └── sourceController.js # 业务逻辑
│   ├── utils/
│   │   ├── logger.js          # 日志工具
│   │   └── api-client.js      # HTTP 客户端
│   └── public/
│       ├── index.html         # Web 管理界面
│       ├── style.css
│       └── script.js
├── data/
│   └── sources.db             # SQLite 数据库文件
├── logs/                      # 日志文件目录
├── .env.example               # 环境变量示例
├── .gitignore
├── package.json
└── README.md
```

## Cron 表达式示例

| 表达式 | 说明 |
|--------|------|
| `0 * * * *` | 每小时 |
| `0 */6 * * *` | 每6小时 |
| `0 0 * * *` | 每天午夜 |
| `0 0 * * 0` | 每周日午夜 |
| `0 0 1 * *` | 每月1日午夜 |

## 管理界面

访问 `http://localhost:3000` 即可使用 Web 管理界面。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License
