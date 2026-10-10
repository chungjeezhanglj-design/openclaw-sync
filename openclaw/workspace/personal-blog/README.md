# 博客小时光系统 🦎

> 以照片为核心的个人博客平台，用 AI 赋能创作，记录时光里的每一个瞬间

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.3.3-blue.svg)](https://www.typescriptlang.org/)

---

## 📖 项目简介

博客小时光系统是一款**以照片为核心**的个人博客平台，强调时间与空间维度的内容展示。系统支持用户通过照片记录生活瞬间，并借助 AI 技术实现智能分析、语义搜索和语音朗读等功能。

### ✨ 核心特色

| 特性 | 说明 |
|------|------|
| 📍 **GPS 时光地图** | 照片自动提取 EXIF GPS，地图展示拍摄地点 |
| 🤖 **AI 智能分析** | 多模态模型自动理解照片内容，生成标题和标签 |
| 🔍 **语义搜索** | 自然语言解析时间/地点/关键词，精准搜索 |
| 📊 **行为分析** | 详细的用户行为追踪，支持运营分析 |
| 🎨 **多布局切换** | 4 种展示布局（时间线/网格/瀑布流/地图） |
| 🎙️ **语音朗读** | 本地 TTS，文章可听化 |
| 🌐 **多 AI 提供商** | 支持本地 Ollama + 多家云 API，灵活切换 |

---

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone <repo-url>
cd personal-blog

# 2. 配置环境变量
cp .env.example .env
vim .env  # 编辑配置

# 3. 启动服务
docker-compose up -d

# 4. 访问系统
open http://localhost

# 5. 初始化配置
# 浏览器访问 http://localhost/setup 完成初始化
```

### 方式二：本地开发

```bash
# 1. 启动数据库
docker-compose up -d mariadb

# 2. 安装后端依赖
cd backend
npm install

# 3. 配置后端环境变量
cp .env.example .env
vim .env

# 4. 启动后端
npm run dev

# 5. 安装前端依赖
cd ../frontend
npm install

# 6. 启动前端
npm run dev

# 7. 访问系统
# 前端：http://localhost:5173
# 后端：http://localhost:3000
```

---

## 📁 项目结构

```
personal-blog/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── config/            # 配置 (数据源、应用配置)
│   │   ├── controllers/       # 15 个控制器
│   │   ├── routes/            # 13 个路由模块
│   │   ├── models/            # 12 个数据模型
│   │   ├── services/          # 业务服务层
│   │   │   ├── ai/           # AI 服务 (5 个提供商)
│   │   │   ├── searchIntent.ts  # 搜索意图解析
│   │   │   └── geocoding.ts     # 地理编码
│   │   ├── middlewares/       # 8 个中间件
│   │   └── migrations/        # 数据库迁移
│   ├── uploads/               # 上传文件存储
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── components/        # 13 个可复用组件
│   │   ├── pages/             # 15 个页面路由
│   │   ├── hooks/             # 自定义 Hooks
│   │   ├── stores/            # Zustand 状态管理
│   │   ├── services/          # API 客户端
│   │   ├── types/             # TypeScript 类型
│   │   └── utils/             # 工具函数
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                       # 文档
│   ├── architecture.md        # 架构设计文档
│   ├── user-manual.md         # 用户手册
│   └── plans/                 # 产品规划
│
├── api-docs/                   # API 文档
│   └── openapi.yaml           # OpenAPI 3.0 规范
│
├── requirements.md             # 需求说明书
├── docker-compose.yml          # Docker 编排
├── .env.example                # 环境变量示例
└── README.md                   # 本文件
```

---

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.2.0 | UI 框架 |
| TypeScript | 5.3.3 | 类型系统 |
| Vite | 5.x | 构建工具 |
| Zustand | 4.4.7 | 状态管理 |
| TanStack Query | 5.13.4 | 服务端状态管理 |
| React Router | 6.21.0 | 路由管理 |
| Tailwind CSS | 3.x | CSS 框架 |
| React Leaflet | 4.2.1 | 地图组件 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x | 运行环境 |
| Express | 4.18.2 | Web 框架 |
| TypeScript | 5.3.3 | 类型系统 |
| TypeORM | 0.3.17 | ORM 框架 |
| MySQL2 | 3.6.5 | 数据库驱动 |
| JWT | 9.0.2 | 认证 Token |
| Bcryptjs | 2.4.3 | 密码加密 |
| Multer | 2.0.2 | 文件上传 |

### AI 服务

| 提供商 | 类型 | 说明 |
|--------|------|------|
| Ollama | 本地 | 支持 MiniCPM-V 等多模态模型 |
| 通义千问 | 云端 | 阿里云通义视觉理解 |
| MiniMax | 云端 | 海螺 AI 视觉理解 |
| 月之暗面 | 云端 | Kimi 视觉理解 |

---

## 📦 部署

### 生产环境部署

```bash
# 1. 准备服务器（推荐 2 核 4G 以上）
# 2. 安装 Docker 和 Docker Compose
# 3. 配置域名和 SSL 证书（可选）

# 4. 克隆代码
git clone <repo-url>
cd personal-blog

# 5. 配置环境变量
cp .env.example .env
vim .env

# 6. 启动服务
docker-compose up -d

# 7. 查看日志
docker-compose logs -f backend

# 8. 初始化配置
# 访问 http://your-domain/setup
```

### 环境变量配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `NODE_ENV` | 运行环境 | `production` |
| `PORT` | 后端端口 | `3000` |
| `DB_HOST` | 数据库主机 | `mariadb` |
| `DB_PORT` | 数据库端口 | `3306` |
| `DB_USERNAME` | 数据库用户名 | `root` |
| `DB_PASSWORD` | 数据库密码 | `secure_password` |
| `DB_DATABASE` | 数据库名称 | `personal_blog` |
| `JWT_SECRET` | JWT 密钥 | `your-secret-key` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `ADMIN_EMAIL` | 管理员邮箱 | `<CHANGE_ME>` ⚠️ **必须设置, 不能是 `admin@blog.com`** |
| `ADMIN_PASSWORD` | 管理员密码 | `<CHANGE_ME>` ⚠️ **必须设强密码, 不能是 `admin123`** |
| `OLLAMA_BASE_URL` | Ollama 地址 | `http://192.168.1.111:11434` |
| `OLLAMA_MODEL` | Ollama 模型 | `openbmb/minicpm-v4.5:8b` |

---

## 📚 文档

| 文档 | 路径 | 说明 |
|------|------|------|
| **需求说明书** | [`requirements.md`](requirements.md) | 完整功能需求、数据模型、API 接口 |
| **API 文档** | [`api-docs/openapi.yaml`](api-docs/openapi.yaml) | OpenAPI 3.0 规范，可导入 Swagger/Postman |
| **架构文档** | [`docs/architecture.md`](docs/architecture.md) | 系统架构、技术栈、核心流程图 |
| **用户手册** | [`docs/user-manual.md`](docs/user-manual.md) | 完整使用指南、常见问题 |

---

## 🔧 开发指南

### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 数据库迁移
npm run migration:generate -- src/migrations/CreateXXX
npm run migration:run
npm run migration:revert

# 创建数据库
npm run db:create

# 代码检查
npm run lint
npm run typecheck
```

### 前端开发

```bash
cd frontend

# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览构建结果
npm run preview

# 代码检查
npm run lint
```

---

## 🎯 核心功能

### 1. 用户系统
- ✅ 邮箱注册/登录
- ✅ 微信扫码登录（可选）
- ✅ 个人资料管理
- ✅ 关注/粉丝/好友系统
- ✅ 角色权限（user/editor/admin）

### 2. 内容管理
- ✅ 文章 CRUD
- ✅ 照片上传与管理
- ✅ EXIF 自动提取
- ✅ 多布局展示（时间线/网格/瀑布流/地图）
- ✅ 文章可见性（公开/好友/粉丝/私密）

### 3. 智能功能
- ✅ AI 照片分析（多提供商）
- ✅ 语义搜索（自然语言解析）
- ✅ 语音朗读（本地 TTS）
- ✅ GPS 地图展示

### 4. 互动系统
- ✅ 点赞
- ✅ 评论（支持回复、置顶、审核）
- ✅ 分享（QQ/微博/复制链接）

### 5. 行为追踪
- ✅ 页面浏览追踪
- ✅ 文章阅读分析
- ✅ 滚动深度统计
- ✅ IP 地址记录（IPv4/IPv6）

### 6. 日志系统
- ✅ 操作日志
- ✅ 行为日志
- ✅ 日志清理
- ✅ 实时日志流（SSE）

---

## 🔐 安全特性

- ✅ JWT Token 认证
- ✅ Bcrypt 密码加密
- ✅ CORS 严格限制
- ✅ SQL 注入防护（TypeORM 参数化）
- ✅ XSS 防护（前端输入转义）
- ✅ 速率限制（登录/注册接口）
- ✅ IP 过滤（排除本地和私有地址）

---

## 📊 性能优化

- ✅ 前端懒加载
- ✅ TanStack Query 缓存
- ✅ 数据库索引优化
- ✅ Node Cache 缓存热点数据
- ✅ 分页查询
- ✅ Docker 容器化部署

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 更新日志

### v1.0.0 (2026-03-03)
- ✨ 初始版本发布
- 🎯 核心功能：用户系统、内容管理、AI 分析、语义搜索
- 📍 GPS 时光地图
- 🎙️ 语音朗读
- 📊 行为追踪系统

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- [React](https://react.dev/)
- [TypeORM](https://typeorm.io/)
- [Ollama](https://ollama.ai/)
- [高德地图](https://lbs.amap.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📮 联系方式

- 项目仓库：`~/personal-blog`
- 系统帮助：访问 `/help` 页面
- API 文档：访问 `/api-docs` 页面

---

<div align="center">

**Made with ❤️ by JackLee**

🦎 博客小时光系统 - 记录时光里的每一个瞬间

</div>
