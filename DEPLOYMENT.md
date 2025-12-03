# 生产环境部署指南

## 🎯 CORS 代理配置

在生产环境中，CORS代理URL已被设置为固定配置，用户无需手动配置，也不会在UI中看到此选项。

## 📦 部署方案

### 方案一：使用 Vercel/Netlify + Serverless Functions (推荐)

这是最简单的部署方案，无需管理服务器。

#### 1. 准备 Serverless Function

创建 `api/notion-proxy.ts` (Vercel) 或 `netlify/functions/notion-proxy.ts` (Netlify):

```typescript
// api/notion-proxy.ts (Vercel)
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 启用 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 从 URL 中提取 Notion API 路径
    const notionPath = req.url?.replace('/api/notion-proxy/', '') || '';
    const notionUrl = `https://api.notion.com/${notionPath}`;

    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
        'Notion-Version': (req.headers['notion-version'] as string) || '2022-06-28'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
```

#### 2. 配置环境变量

在 Vercel/Netlify 项目设置中添加：

```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_NOTION_PROXY_URL=https://your-app.vercel.app/api/notion-proxy/
```

#### 3. 部署

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod
```

---

### 方案二：独立 Node.js 代理服务器

如果你已经有自己的服务器或VPS。

#### 1. 准备服务器文件

使用项目中的 `proxy-server.cjs`，或创建优化版本：

```javascript
// production-proxy-server.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 8080;

// 配置 CORS（生产环境应限制来源）
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Notion-Version']
}));

app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Notion 代理端点
app.use('/notion', async (req, res) => {
  try {
    const notionPath = req.path.substring(1);
    const notionUrl = `https://api.notion.com/${notionPath}`;

    console.log(`[${new Date().toISOString()}] ${req.method} ${notionUrl}`);

    const response = await fetch(notionUrl, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json',
        'Notion-Version': req.headers['notion-version'] || '2022-06-28'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);

    console.log(`[${new Date().toISOString()}] Response: ${response.status}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Production Proxy Server running on port ${PORT}`);
  console.log(`📍 Proxy endpoint: http://localhost:${PORT}/notion/`);
});
```

#### 2. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start production-proxy-server.js --name notion-proxy

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs notion-proxy
```

#### 3. 配置 Nginx 反向代理（可选）

```nginx
server {
    listen 443 ssl http2;
    server_name proxy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /notion/ {
        proxy_pass http://localhost:8080/notion/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 4. 前端配置环境变量

```bash
# .env.production
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_NOTION_PROXY_URL=https://proxy.yourdomain.com/notion/
```

---

### 方案三：使用 Docker 部署完整应用

#### 1. 创建 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_GEMINI_API_KEY
ARG VITE_NOTION_PROXY_URL
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_NOTION_PROXY_URL=$VITE_NOTION_PROXY_URL

RUN npm run build

# Production image
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  # 前端应用
  frontend:
    build:
      context: .
      args:
        VITE_GEMINI_API_KEY: ${VITE_GEMINI_API_KEY}
        VITE_NOTION_PROXY_URL: http://proxy:8080/notion/
    ports:
      - "3000:80"
    depends_on:
      - proxy

  # CORS 代理服务器
  proxy:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - ./proxy-server.cjs:/app/proxy-server.cjs
      - ./package.json:/app/package.json
    command: sh -c "npm install express cors node-fetch@2 && node proxy-server.cjs"
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
```

#### 3. 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

---

## 🔒 安全建议

### 1. 限制 CORS 来源

生产环境中，不要使用 `*` 允许所有来源：

```javascript
// proxy-server.cjs
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Notion-Version']
}));
```

### 2. 添加速率限制

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 限制每个IP 100次请求
});

app.use('/notion', limiter);
```

### 3. 添加请求日志

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

### 4. 环境变量安全

- 不要将 `.env.production` 提交到 Git
- 在 CI/CD 平台中配置环境变量（Vercel、Netlify、GitHub Actions）
- API Key 要定期轮换

---

## 📊 监控和维护

### 1. 健康检查

代理服务器应提供健康检查端点：

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

### 2. 日志监控

- 使用 PM2 监控进程状态
- 配置日志轮转
- 设置错误告警

### 3. 性能监控

- 监控代理服务器响应时间
- 监控 Notion API 调用频率和失败率
- 使用 APM 工具（如 New Relic、Datadog）

---

## 🚀 推荐部署流程

1. **开发环境**：使用本地 proxy-server.cjs（已配置）
2. **测试环境**：部署到 Vercel Preview 或 Netlify Preview
3. **生产环境**：使用 Vercel/Netlify + Serverless Functions

这样配置后，用户只需要输入：
- Notion API Key
- Records Database ID
- Goals Database ID

代理服务器地址完全对用户不可见，由环境变量控制。

---

## 📝 部署检查清单

- [ ] 配置生产环境变量（VITE_GEMINI_API_KEY, VITE_NOTION_PROXY_URL）
- [ ] 部署代理服务器（Serverless Function 或独立服务器）
- [ ] 测试代理服务器健康状态
- [ ] 配置 CORS 只允许前端域名
- [ ] 添加速率限制
- [ ] 配置 HTTPS/SSL 证书
- [ ] 设置日志和监控
- [ ] 测试完整的 Notion 同步流程
- [ ] 配置 CI/CD 自动部署
- [ ] 准备回滚方案
