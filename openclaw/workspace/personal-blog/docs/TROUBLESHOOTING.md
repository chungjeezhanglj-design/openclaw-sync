# 故障恢复手册 · personal-blog

> 适用于生产环境 (chungjee.familyds.org) 的常见问题排查与恢复。
> 所有命令假设在项目根目录 `~/personal-blog` 执行。

---

## 🚨 快速参考

| 问题 | 一句话命令 |
|---|---|
| 服务挂了 | `docker compose ps && docker compose logs --tail=200 backend` |
| 后端无法启动 | `docker compose logs backend \| grep -i error` |
| DB 连不上 | `docker exec blog-mariadb mysql -u root -p"${DB_PASSWORD}" -e 'SELECT 1'` |
| 重启所有服务 | `docker compose restart` |
| 完全重建 | `docker compose down && docker compose up -d --build` |
| 备份 | `./scripts/backup-to-nas.sh` |
| 恢复备份 | `./scripts/backup.sh --restore <文件名>` |
| 健康检查 | `curl https://chungjee.familyds.org/health/ready` |

---

## 1. 服务完全挂掉

### 症状
- `https://chungjee.familyds.org` 无法访问
- `/health/live` 不返回 200

### 排查步骤

```bash
# 1. 容器状态
docker compose ps
# 期待输出: 3 个服务都是 'running' 或 'healthy'

# 2. 看具体错误
docker compose logs --tail=200 backend
docker compose logs --tail=100 mariadb
docker compose logs --tail=100 frontend

# 3. 资源占用
docker stats --no-stream
df -h
free -m
```

### 常见原因 + 修复

| 现象 | 原因 | 修复 |
|---|---|---|
| mariadb exit 1 | DB 损坏 / 磁盘满 | `df -h` 清理; `docker volume inspect personal-blog_mariadb_data` |
| backend restart loop | 代码 bug / env 缺失 | `docker compose logs backend` 看 stacktrace |
| frontend unhealthy | nginx 配置错 | `docker exec blog-frontend nginx -t` |
| 所有容器都 running 但 HTTP 不通 | nginx / 防火墙 / 端口 | `sudo nginx -t && sudo systemctl status nginx` |

---

## 2. 后端无法连接 MariaDB

### 症状
`/health/ready` 返回 503 + `dbConnected: false`

### 排查

```bash
# 1. MariaDB 容器在跑吗
docker ps | grep blog-mariadb

# 2. 网络是否通 (backend → mariadb)
docker exec blog-backend ping -c 3 mariadb

# 3. 直接连 DB
docker exec blog-mariadb mysql -u root -p"$DB_PASSWORD" -e 'SHOW DATABASES;'

# 4. 看 mariadb 日志
docker logs blog-mariadb --tail=100
```

### 常见错误

**错误**: `ECONNREFUSED 3306`
**原因**: mariadb 容器未启动 / 端口冲突
**修复**:
```bash
docker compose restart mariadb
sleep 10
docker compose restart backend
```

**错误**: `Access denied for user 'personal_blog'@'172.x.x.x'`
**原因**: DB 密码错 / 用户权限错
**修复**: 编辑 `.env` 检查 `DB_PASSWORD` 一致; `docker exec blog-mariadb mysql -u root -p"${MARIADB_ROOT_PASSWORD}" -e "GRANT ALL ON personal_blog.* TO 'personal_blog'@'%';"`

---

## 3. 磁盘空间不足

### 症状
- 备份失败
- DB 写入失败
- `docker compose up` 失败

### 排查 + 清理

```bash
# 整体磁盘
df -h

# Docker 占空间
docker system df

# 清理旧日志
sudo find /var/log/personal-blog -name "*.gz" -mtime +30 -delete
# 或触发 logrotate
sudo logrotate -f /etc/logrotate.d/personal-blog

# 清理 Docker 缓存 (谨慎)
docker system prune -a --filter "until=72h"

# 检查 uploads 目录大小
du -sh backend/uploads/
```

---

## 4. AI 服务不可用

### 症状
- 上传照片后没有自动生成标题/标签
- 搜索功能报 "AI API error"

### 排查

```bash
# 1. 看 backend 日志里的 AI 调用
docker logs blog-backend --tail=200 | grep -i "ai\|ollama\|tongyi"

# 2. 测试本地 Ollama (如果 AI_PROVIDER=ollama)
curl -s http://192.168.1.111:11434/api/tags

# 3. 测试云 API (以 tongyi 为例)
curl -sX POST "$TONGYI_ENDPOINT" \
    -H "Authorization: Bearer $TONGYI_API_KEY" \
    -d '{"model":"qwen-vl-plus","input":{"messages":[...]}}'
```

### 修复

| 场景 | 修复 |
|---|---|
| Ollama 华矿机关机 | 改 `AI_PROVIDER=tongyi` (云端备用) |
| 云 API key 过期 | 控制台 rotate, 更新 `.env`, `docker compose restart backend` |
| AI_FALLBACK_PROVIDER 没设 | `.env` 加 `AI_FALLBACK_PROVIDER=ollama` 或云端 |

---

## 5. 备份与恢复

### 自动备份

每天凌晨 3 点 cron 自动跑 `./scripts/backup-to-nas.sh`。
日志位置: `/var/log/personal-blog-backup.log`

### 手动备份

```bash
./scripts/backup-to-nas.sh             # 全量 + 推 NAS
./scripts/backup-to-nas.sh --local-only # 仅本地
./scripts/backup-to-nas.sh --verify     # 验证 NAS 备份
```

### 恢复

```bash
# 1. 列出备份
./scripts/backup.sh --list

# 2. 选一个备份恢复 (会会覆盖现有数据!)
./scripts/backup.sh --restore db-personal_blog-20260101-030000.sql.gz
./scripts/backup.sh --restore uploads-20260101-030000.tar.gz

# 3. 重启服务
docker compose restart backend
```

### 灾难恢复 (整机挂掉, 在新机器恢复)

```bash
# 1. 克隆代码
git clone <repo-url> personal-blog
cd personal-blog

# 2. 准备环境变量
cp backend/.env.production.example backend/.env.production
./scripts/generate-secrets.sh backend/.env.production
# 编辑 .env.production 填入 DB / AI 密钥

# 3. 启动服务
./scripts/deploy.sh --prod

# 4. 恢复数据 (假设 NAS 已挂载或可访问)
./scripts/backup.sh --restore <latest-db>
./scripts/backup.sh --restore <latest-uploads>

# 5. 配置反向代理 + HTTPS
sudo ./scripts/setup-https.sh
```

---

## 6. HTTPS 证书问题

### 症状
- 浏览器报 "您的连接不是私密连接"
- `curl https://...` 报证书错误

### 排查

```bash
# 检查证书过期时间
echo | openssl s_client -connect chungjee.familyds.org:443 -servername chungjee.familyds.org 2>/dev/null | openssl x509 -noout -dates

# 检查自动续期是否在跑
sudo systemctl list-timers | grep certbot
```

### 手动续期

```bash
sudo certbot renew --dry-run      # 测试
sudo certbot renew                # 实际续期
sudo systemctl reload nginx       # 重载
```

---

## 7. 性能问题

### 症状
- 页面加载慢
- 上传照片超时
- 搜索响应慢

### 排查

```bash
# 1. 后端响应时间
curl -w "Time: %{time_total}s\n" -o /dev/null -s https://chungjee.familyds.org/health/ready

# 2. 看慢请求
docker logs blog-backend --tail=500 | grep -i "slow\|timeout"

# 3. DB 慢查询
docker exec blog-mariadb mysql -u root -p"$DB_PASSWORD" personal_blog -e "
    SELECT * FROM information_schema.process_query
    WHERE time > 5
    ORDER BY time DESC LIMIT 20;
"

# 4. 资源监控
docker stats --no-stream
```

---

## 8. 安全事件响应

### 怀疑被入侵

```bash
# 1. 立即冻结 (停止后端, 但保留 DB 用于取证)
docker compose stop backend frontend

# 2. 拉取所有日志做快照
mkdir -p /tmp/incident-$(date +%Y%m%d)
docker logs blog-backend > /tmp/incident-$(date +%Y%m%d)/backend.log 2>&1
docker logs blog-mariadb > /tmp/incident-$(date +%Y%m%d)/mariadb.log 2>&1
docker logs blog-frontend > /tmp/incident-$(date +%Y%m%d)/frontend.log 2>&1
cp -r backend/uploads/ /tmp/incident-$(date +%Y%m%d)/

# 3. 轮换所有密钥
./scripts/generate-secrets.sh backend/.env.production
# 在所有 AI 服务控制台 rotate API keys
# 改 DB 密码 (MARIADB_ROOT_PASSWORD + DB_PASSWORD)
# 改 ADMIN_PASSWORD

# 4. 重启 + 验证
docker compose up -d
curl https://chungjee.familyds.org/health/ready

# 5. 复盘: 谁根根
grep -rE "(GET|POST|PUT|DELETE) /(api|uploads)" /var/log/nginx/personal-blog-access.log* \
 | | awk '{print $1, $7}' | sort | uniq -c | sort -rn | head -20
```

---

## 9. 升级流程

```bash
# 1. 备份 (升级前必做)
./scripts/backup-to-nas.sh

# 2. 拉取新代码
git pull origin main

# 3. 看是否有 schema 变更
cat docs/migrations.md    # 如果有
# 执行迁移
cd backend && npm run migration:run

# 4. 重新构建
docker compose build --pull

# 5. 滚动重启 (后端先, 前端后)
docker compose up -d --no-deps backend
sleep 30
curl https://chungjee.familyds.org/health/ready
docker compose up -d --no-deps frontend

# 6. 验证
./scripts/health-check.sh https://chungjee.familyds.org
```

---

## 📞 联系人

| 角色 | 联系方式 |
|---|---|
| 项目所有者 | JackLee (本机) |
| 服务器位置 | Synology NAS @ 192.168.1.141 |
| Ollama AI | 华矿机 @ 192.168.1.111 |
| 域名 | chungjee.familyds.org (Cloudflare / Synology DDNS) |

---

## 🔖 关键路径速查

| 内容 | 路径 |
|---|---|
| 项目根 | `~/personal-blog` |
| 后端代码 | `backend/src/` |
| 前端代码 | `frontend/src/` |
| 上传文件 | `backend/uploads/` |
| 数据库 volume | `personal-blog_mariadb_data` (Docker volume) |
| 本地备份 | `~/personal-blog/backup/` |
| NAS 备份 | `${NAS_USER}@192.168.1.141:/volume1/backup/personal-blog/` |
| 日志 | `/var/log/personal-blog/` · `/var/log/nginx/personal-blog-*.log` |
| nginx 主配置 | `/etc/nginx/sites-enabled/personal-blog` |
| SSL 证书 | `/etc/letsencrypt/live/chungjee.familyds.org/` |
| 部署脚本 | `scripts/deploy.sh` · `scripts/backup*.sh` |
| 健康检查 | `curl /health/live` · `curl /health/ready` |