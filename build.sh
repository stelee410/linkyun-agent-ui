#!/usr/bin/env bash
# ===========================================
# Linkyun-Agent-UI 本地构建脚本（方式二）
# 构建 client-web-ui、lumina-ai-chat-hub，并将产物打成 zip 放到 dist/
# 用法: ./build.sh
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"

# ---------- 交互：API 地址（client-web-ui 与 lumina-ai-chat-hub 可分别设置）----------
DEFAULT_NEXT_PUBLIC_API_URL="https://creator.linkyun.co"
DEFAULT_VITE_API_URL="https://linkyun.co"
read -p "NEXT_PUBLIC_API_URL (client-web-ui) [$DEFAULT_NEXT_PUBLIC_API_URL]: " NEXT_PUBLIC_API_URL
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$DEFAULT_NEXT_PUBLIC_API_URL}"
read -p "VITE_API_URL (lumina-ai-chat-hub) [$DEFAULT_VITE_API_URL]: " VITE_API_URL
VITE_API_URL="${VITE_API_URL:-$DEFAULT_VITE_API_URL}"
export NEXT_PUBLIC_API_URL
export VITE_API_URL
echo "    client-web-ui 使用: $NEXT_PUBLIC_API_URL"
echo "    lumina-ai-chat-hub 使用: $VITE_API_URL"
echo ""

echo "==> 输出目录: $DIST_DIR"
mkdir -p "$DIST_DIR"

# ---------- 1. 构建 lumina-ai-chat-hub (Vite) ----------
HUB_DIR="$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub"
echo "==> [1/2] 构建 lumina-ai-chat-hub ..."
cd "$HUB_DIR"
npm run build
echo "    打包 dist 为 zip ..."
(cd dist && zip -r -q "$DIST_DIR/lumina-ai-chat-hub.zip" .)
echo "    已生成 $DIST_DIR/lumina-ai-chat-hub.zip"

# ---------- 2. 构建 client-web-ui (Next.js standalone) ----------
WEB_DIR="$SCRIPT_DIR/client-web-ui"
echo "==> [2/2] 构建 client-web-ui ..."
cd "$WEB_DIR"
npm run build

# Next.js standalone 需将 .next/server、.next/static、public 与 standalone 合并为可部署目录
# 注意：* 不匹配隐藏目录，必须显式拷贝 .next（含 server）
STAGING="$SCRIPT_DIR/dist/client-web-ui-staging"
rm -rf "$STAGING"
mkdir -p "$STAGING"
cp -r .next/standalone/* "$STAGING"
cp -r .next/standalone/.next "$STAGING/"
cp -r .next/static "$STAGING/.next/"
cp -r public "$STAGING/" 2>/dev/null || true
echo "    打包 standalone 为 zip ..."
cd "$STAGING"
zip -r -q "$DIST_DIR/client-web-ui.zip" .
cd "$SCRIPT_DIR"
rm -rf "$STAGING"
echo "    已生成 $DIST_DIR/client-web-ui.zip"

echo ""
echo "==> 全部完成。产物："
ls -la "$DIST_DIR"/*.zip 2>/dev/null || true
