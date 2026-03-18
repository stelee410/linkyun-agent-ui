#!/usr/bin/env bash
# ===========================================
# Linkyun-Agent-UI 部署脚本
# 交互输入远程用户名和服务器 IP，
# 将 dist/ 下所有 zip 包上传到远端 ~/workspace/dist/
# ===========================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
REMOTE_DIR="~/workspace/dist"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "错误: 未找到 dist 目录: $DIST_DIR"
  echo "请先执行 ./build.sh"
  exit 1
fi

shopt -s nullglob
ZIP_FILES=("$DIST_DIR"/*.zip)
shopt -u nullglob

if [[ ${#ZIP_FILES[@]} -eq 0 ]]; then
  echo "错误: 未找到任何 zip 包: $DIST_DIR/*.zip"
  echo "请先执行 ./build.sh 生成打包产物"
  exit 1
fi

read -r -p "远程用户名: " USERNAME
if [[ -z "${USERNAME// }" ]]; then
  echo "错误: 用户名不能为空"
  exit 1
fi

read -r -p "远端服务器 IP: " IP
if [[ -z "${IP// }" ]]; then
  echo "错误: IP 地址不能为空"
  exit 1
fi

REMOTE="${USERNAME}@${IP}"

echo ">>> 将通过 SSH/SCP 连接到 $REMOTE"
echo ">>> 如未配置免密登录，命令执行时会提示你手动输入密码。"
echo ">>> 确保远端目录 $REMOTE:$REMOTE_DIR 存在..."
ssh -o StrictHostKeyChecking=accept-new "$REMOTE" "mkdir -p $REMOTE_DIR"

echo ">>> 开始上传 zip 包到 $REMOTE:$REMOTE_DIR/"
for zip_file in "${ZIP_FILES[@]}"; do
  echo "    待上传: $(basename "$zip_file")"
done

# 一次 scp 传多个文件，通常只需输入一次密码（取决于服务器配置）
scp -o StrictHostKeyChecking=accept-new "${ZIP_FILES[@]}" "$REMOTE:$REMOTE_DIR/"

echo ">>> 上传完成。远端目录: $REMOTE:$REMOTE_DIR/"

ssh root@47.76.253.198 "cd ~ && ./deploy.sh"

echo ">>> 远程部署完成"
