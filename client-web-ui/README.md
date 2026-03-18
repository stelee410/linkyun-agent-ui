# Linkyun Agent Web UI

基于 Next.js 的 Linkyun Agent Web 客户端，连接现有后端 API 服务。

## 功能

- **登录/注册**：Creator 账号认证
- **我的 Agents**：列出当前 Creator 的 Agents，支持创建会话
- **对话**：选择 Agent 开始对话，发送消息与 AI 交互

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

## 配置

复制 `.env.local.example` 为 `.env.local`，配置 API 地址：

```
NEXT_PUBLIC_API_URL=http://localhost:8081
```

确保后端服务已启动（默认端口 8081）。

## 构建

```bash
npm run build
npm start
```
