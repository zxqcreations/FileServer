# Nginx 配置说明

## 概览

本项目通过 **Nginx**（端口 9800）对外提供服务，Nginx 作为反向代理，负责：

- **静态文件直出**：前端 React SPA 由 Nginx 直接从 `client/dist/` 提供（不经过 Node）
- **API 代理**：`/api/*` 请求转发到后端 Fastify（`localhost:3000`）
- **WebSocket 代理**：`/ws` 连接升级转发到后端
- **健康检查**：`/health` 转发到后端

```
浏览器 ──→ Nginx (:9800) ──┬── 静态文件 (client/dist/)
                           ├── /api/* ──→ Fastify (:3000)
                           ├── /ws    ──→ Fastify (:3000)
                           └── /health ──→ Fastify (:3000)
```

---

## 文件位置

| 文件 | 路径 |
|------|------|
| Nginx 根目录 | `D:\ENV\nginx-1.30.2\` |
| 主配置文件 | `D:\ENV\nginx-1.30.2\conf\nginx.conf` |
| FileServer 站点配置 | `D:\ENV\nginx-1.30.2\conf\fileserver.conf` |
| 服务安装脚本 | `D:\ENV\FileServer\scripts\setup-nginx-service.ps1` |

---

## 当前站点配置

`conf/fileserver.conf` — 监听 **9800** 端口，服务于 FileServer。

以后添加其他网站时，在 `conf/` 下新建 `.conf` 文件，然后 `include` 到 `nginx.conf` 即可。例如：

```
# 新建 conf/myapp.conf
server {
    listen       9801;
    server_name  localhost;
    root   D:/path/to/myapp/dist;
    # ...
}
```

然后在 `nginx.conf` 的 `http` 块中加入 `include myapp.conf;`，执行 `.\nginx.exe -s reload` 即可生效。

---

## Windows 服务

系统部署了两个 Windows 服务，均开机自启：

| 服务名称 | 显示名称 | 端口 | 说明 |
|----------|----------|------|------|
| `NginxServer` | Nginx Server | 9800 | Nginx 反向代理 + 静态文件 |
| `FileServer` | FileServer Backend | 3000 | Fastify API 后端 |

服务管理使用 [NSSM](https://nssm.cc/)（`D:\ENV\nssm\nssm-2.24\win64\nssm.exe`）。

### NginxServer

| 属性 | 值 |
|------|-----|
| **服务名称** | `NginxServer` |
| **可执行文件** | `D:\ENV\nginx-1.30.2\nginx.exe` |
| **工作目录** | `D:\ENV\nginx-1.30.2\` |

```powershell
# 查看状态 / 启动 / 停止 / 重启
Get-Service NginxServer
Start-Service NginxServer
Stop-Service NginxServer
Restart-Service NginxServer
```

### FileServer（后端）

| 属性 | 值 |
|------|-----|
| **服务名称** | `FileServer` |
| **可执行文件** | `C:\Program Files\nodejs\node.exe` |
| **参数** | `dist/main.js` |
| **工作目录** | `D:\ENV\FileServer\server\` |
| **环境变量** | `PORT=3000`, `HOST=0.0.0.0` |
| **日志** | `D:\ENV\FileServer\server\logs\service-out.log` / `service-err.log` |

```powershell
# 查看状态 / 启动 / 停止 / 重启
Get-Service FileServer
Start-Service FileServer
Stop-Service FileServer
Restart-Service FileServer
```

### 修改 Nginx 配置后重载（无需重启服务）

```powershell
cd D:\ENV\nginx-1.30.2
.\nginx.exe -s reload
```

### 测试配置语法

```powershell
cd D:\ENV\nginx-1.30.2
.\nginx.exe -t
```

### 重新安装服务

如需重新安装（修改服务参数等），以**管理员身份**运行：

```powershell
# Nginx 服务
powershell -File "D:\ENV\FileServer\scripts\setup-nginx-service.ps1"

# FileServer 后端服务
powershell -File "D:\ENV\FileServer\scripts\setup-fileserver-service.ps1"
```

### 卸载服务

以**管理员身份**运行：

```powershell
sc.exe stop NginxServer
sc.exe delete NginxServer

sc.exe stop FileServer
sc.exe delete FileServer
```

---

## FileServer 请求流向

| 请求路径 | 处理方式 | 目标 |
|----------|----------|------|
| `/` | 静态文件 | `client/dist/index.html` |
| `/assets/*` | 静态文件（缓存 1 年） | `client/dist/assets/` |
| `/api/files` | 代理 | `http://127.0.0.1:3000/api/files` |
| `/api/upload` | 代理 | `http://127.0.0.1:3000/api/upload` |
| `/api/download` | 代理 | `http://127.0.0.1:3000/api/download` |
| `/health` | 代理 | `http://127.0.0.1:3000/health` |
| `/ws` | WebSocket 代理 | `http://127.0.0.1:3000/ws` |

---

## 注意事项

1. 两个 Windows 服务（`NginxServer` + `FileServer`）均已设为开机自启，重启后自动运行
2. 上传文件大小上限为 **10 GB**（Nginx `client_max_body_size` 和 FileServer 后端均已配置）
3. 静态资源（`/assets/`）带内容哈希的文件名，Nginx 设置了 1 年缓存
4. 所有非 API 路径回退到 `index.html`，支持 SPA 前端路由
5. 后端日志写入 `server\logs\`，排查问题时先看 `service-err.log`
