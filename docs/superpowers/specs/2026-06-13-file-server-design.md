# FileServer 设计文档

> 日期: 2026-06-13 | 状态: 已批准

## 概述

全 TypeScript 文件服务器，支持通过 RESTful API 和 Web 前端界面浏览、上传、下载文件。面向可信内网环境，无需认证。支持大文件流式传输、常见文档格式渲染、视频播放。

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 后端框架 | Fastify | 高性能、内置流式支持、TypeScript 友好 |
| 前端框架 | React + Vite | 现代 SPA 开发体验 |
| 构建工具 | Vite + tsc | 前端 Vite 构建，后端 tsc 编译 |
| 运行时 | Node.js 24 | 最新 LTS |
| 测试 | Vitest + Playwright | 单元/集成 + E2E |

## 项目结构

```
FileServer/
├── package.json              # 根 package.json，scripts 统一管理
├── tsconfig.json             # 共享 TypeScript 配置
├── .env                      # 端口、存储路径等配置
├── start.sh                  # 一键启动（安装依赖 → 构建前端 → 启动服务）
├── nginx.conf.example        # nginx 反向代理参考配置
├── skill.md                  # API 接口文档（agent 可加载）
│
├── server/                   # Fastify 后端
│   ├── tsconfig.json
│   ├── package.json
│   ├── src/
│   │   ├── app.ts            # Fastify 实例创建 + 插件注册
│   │   ├── main.ts           # 入口，启动监听
│   │   ├── config.ts         # 环境变量读取 + 配置常量
│   │   ├── routes/
│   │   │   ├── files.ts      # GET /api/files?path=xxx  文件列表
│   │   │   ├── upload.ts     # POST /api/upload          上传文件
│   │   │   └── download.ts   # GET /api/download?path=xxx 下载文件
│   │   ├── services/
│   │   │   └── file.service.ts  # 文件操作核心逻辑
│   │   ├── middleware/
│   │   │   ├── path-safety.ts   # 路径遍历防护中间件
│   │   │   └── error-handler.ts # 统一错误处理
│   │   └── utils/
│   │       ├── path.util.ts     # 路径安全工具函数
│   │       └── mime.util.ts     # MIME 类型映射
│   └── __tests__/
│
├── client/                   # React + Vite 前端
│   ├── package.json
│   ├── vite.config.ts        # 开发代理到 Fastify
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── FileBrowser.tsx    # 文件浏览（表格/网格）
│       │   ├── FileUploader.tsx   # 文件上传（拖拽+点击）
│       │   ├── FileViewer.tsx     # 文件预览路由分发
│       │   ├── PdfViewer.tsx      # PDF 渲染
│       │   ├── MarkdownViewer.tsx # MD 渲染（含 Mermaid + 公式）
│       │   ├── OfficeViewer.tsx   # Office 文档预览
│       │   ├── VideoPlayer.tsx    # 视频播放
│       │   └── ui/                # 通用 UI 组件
│       ├── hooks/
│       │   ├── useFileList.ts     # 文件列表数据
│       │   ├── useFileUpload.ts   # 上传逻辑
│       │   └── useFileDownload.ts # 下载逻辑
│       └── lib/
│           └── api.ts             # API 请求封装
│
└── file_storage/             # 文件物理存储（.gitkeep 占位）
    └── .gitkeep
```

## API 设计

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/files` | 获取目录下的文件列表 |
| `GET` | `/api/download` | 流式下载文件 |
| `POST` | `/api/upload` | 上传文件（支持多文件） |
| `GET` | `/health` | 健康检查 |

### 统一响应格式

成功:
```json
{ "success": true, "data": { ... } }
```

失败:
```json
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

### GET /api/files

查询参数: `path` — 相对于 `file_storage/` 的子目录路径（可选，默认根目录）

响应 data:
```json
{
  "currentPath": "subdir",
  "parentPath": null,
  "items": [
    {
      "name": "report.pdf",
      "type": "file",
      "size": 2048000,
      "mimeType": "application/pdf",
      "lastModified": "2026-06-13T10:30:00.000Z"
    },
    {
      "name": "images",
      "type": "directory",
      "lastModified": "2026-06-12T08:00:00.000Z"
    }
  ]
}
```

### GET /api/download

查询参数: `path` — 要下载的文件路径（相对于 `file_storage/`）

响应: 流式传输文件内容，含 `Content-Type`、`Content-Disposition: attachment`、`Content-Length`

### POST /api/upload

`multipart/form-data`:
- `files`: 一个或多个文件
- `path`: 目标子目录（可选，默认根目录）

响应 data:
```json
{
  "uploaded": [{ "name": "report.pdf", "size": 2048000 }],
  "failed": [{ "name": "huge.zip", "reason": "File too large" }]
}
```

### 错误码

| 错误码 | HTTP 状态 | 触发条件 |
|--------|-----------|----------|
| `PATH_TRAVERSAL` | 403 | 路径试图逃逸存储根目录 |
| `FILE_NOT_FOUND` | 404 | 文件或目录不存在 |
| `NOT_A_DIRECTORY` | 400 | 对文件执行目录操作 |
| `UPLOAD_FAILED` | 500 | 磁盘写入失败 |
| `FILE_TOO_LARGE` | 413 | 超过单文件大小限制 |
| `INVALID_PATH` | 400 | 路径格式不合法 |

## 安全：路径遍历防护

三层防御:

1. **解析 + 规范化**: `path.resolve(FILE_ROOT, userPath)` → 得到绝对路径
2. **前缀校验（核心）**: 结果路径必须以 `FILE_ROOT` 开头，拒绝任何逃逸
3. **段检查（深度防御）**: 拒绝包含裸 `..` 的路径段

所有校验失败 → 403 Forbidden

## 前端设计

### 布局

- **桌面 (≥1024px)**: 左侧 280px 固定文件列表 + 右侧自适应预览面板
- **平板 (768-1023px)**: 左侧 220px + 右侧预览，面板可折叠
- **手机 (<768px)**: 上下堆叠，列表/预览切换全屏显示

### 文件渲染矩阵

| 文件类型 | 渲染方案 | 依赖库 |
|---------|---------|--------|
| PDF | Canvas 逐页渲染 | `pdfjs-dist` |
| Markdown | 解析 + 语法高亮 + Mermaid + 公式 | `react-markdown`, `remark-math`, `rehype-katex`, `mermaid`, `katex` |
| docx | 转 HTML 预览 | `mammoth.js` |
| xlsx | 表格渲染 | `sheetjs` (xlsx) |
| 视频 (.mp4/.webm/.mkv) | 原生 `<video>` | 无 |
| 图片 | 原生 `<img>` | 无 |
| 纯文本/代码 | `<pre>` 代码块 | 无 |

### 交互

- 左侧目录/文件列表，点击目录进入，点击文件选中并在右侧预览
- 顶部/底部上传按钮，支持拖拽文件上传（触屏降级为点击）
- 预览面板下方下载按钮，大文件显示进度
- 面包屑路径导航
- 所有触摸目标 ≥ 44px

### 设计风格

- 深色主题，编辑器/文件管理器风格
- 双栏可拖拽调整比例
- 文件列表支持 icon 和列表两种视图

## 并发 & 流式传输

### 并发策略

- Fastify 异步事件循环，天然高并发
- `fs.promises.readdir` 使用线程池，不阻塞事件循环
- 上传/下载全部流式 pipe，内存占用恒定
- 多文件上传并行写入，单文件失败不影响其他
- `maxFileSize` 限制单文件上限（默认 10GB）

### 流式流程

**下载**: `fs.createReadStream()` → pipe → `reply.send(stream)` — Transfer-Encoding: chunked，背压自动处理

**上传**: `@fastify/multipart` 逐文件解析 → `fs.createWriteStream()` pipe 写入磁盘

## 启动脚本

`start.sh`:
```bash
#!/bin/bash
set -e
echo "📦 Installing dependencies..."
npm install
echo "🔨 Building client..."
npm run build:client
echo "🔨 Building server..."
npm run build:server
echo "🚀 Starting FileServer on http://localhost:3000 ..."
npm start
```

## nginx 集成

`nginx.conf.example` 提供反向代理配置模板（`proxy_pass http://localhost:3000`），包括:
- `client_max_body_size` 配置
- `proxy_read_timeout` 长连接超时
- `proxy_buffering off` 流式传输优化

用户按需 include 到自己的 nginx 配置中。

## API 文档 (skill.md)

项目根目录 `skill.md` 以 skill 格式记录所有 API 端点、参数、响应格式，供 AI agent 加载后自动完成文件上传/下载操作。

## 测试策略

| 层级 | 工具 | 覆盖目标 |
|------|------|----------|
| 路径安全单元测试 | vitest + node:test | path.util.ts 100% |
| API 集成测试 | vitest + fastify.inject() | 所有端点，含异常路径 |
| 前端组件测试 | vitest + @testing-library/react | 核心组件 |
| E2E | Playwright | 上传→列表→下载完整流程 |

## 配置 (.env)

```
PORT=3000
FILE_STORAGE_ROOT=./file_storage
MAX_FILE_SIZE=10737418240
HOST=localhost
```
