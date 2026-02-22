#!/bin/bash
# Linkyun Agent UI - Setup Script
# Generates docker-compose.yml and configuration based on deployment choices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=============================================="
echo "  Linkyun Agent UI - Deployment Setup"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# 1. Deploy client-web-ui (Creator UI)?
# ---------------------------------------------------------------------------
DEPLOY_CREATOR=""
CREATOR_DOMAIN=""
while true; do
  read -p "Do you want to deploy client-web-ui (Creator UI)? [y/N]: " ans
  ans="${ans:-n}"
  case "${ans,,}" in
    y|yes)
      DEPLOY_CREATOR="yes"
      read -p "Enter the domain for Creator UI (e.g. creator.example.com): " CREATOR_DOMAIN
      CREATOR_DOMAIN="${CREATOR_DOMAIN:-creator.example.com}"
      break
      ;;
    n|no|"")
      break
      ;;
    *)
      echo "Please enter y or n."
      ;;
  esac
done

# ---------------------------------------------------------------------------
# 2. Deploy Luminia-ai-chat-hub (User UI)?
# ---------------------------------------------------------------------------
DEPLOY_USER_HUB=""
USER_HUB_DOMAIN=""
while true; do
  read -p "Do you want to deploy Luminia-ai-chat-hub (User UI)? [y/N]: " ans
  ans="${ans:-n}"
  case "${ans,,}" in
    y|yes)
      DEPLOY_USER_HUB="yes"
      read -p "Enter the domain for User UI (e.g. chat.example.com): " USER_HUB_DOMAIN
      USER_HUB_DOMAIN="${USER_HUB_DOMAIN:-chat.example.com}"
      break
      ;;
    n|no|"")
      break
      ;;
    *)
      echo "Please enter y or n."
      ;;
  esac
done

# Must deploy at least one
if [[ -z "$DEPLOY_CREATOR" && -z "$DEPLOY_USER_HUB" ]]; then
  echo -e "${RED}Error: You must deploy at least one of Creator UI or User UI.${NC}"
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Same-domain proxy?
# ---------------------------------------------------------------------------
SAME_DOMAIN_PROXY=""
LINKYUN_SERVER=""
while true; do
  read -p "Do you want to use same-domain proxy (API via nginx)? [y/N]: " ans
  ans="${ans:-n}"
  case "${ans,,}" in
    y|yes)
      SAME_DOMAIN_PROXY="yes"
      read -p "Enter Linkyun server address (e.g. https://api.linkyun.co): " LINKYUN_SERVER
      LINKYUN_SERVER="${LINKYUN_SERVER:-https://api.linkyun.co}"
      # Remove trailing slash
      LINKYUN_SERVER="${LINKYUN_SERVER%/}"
      break
      ;;
    n|no|"")
      read -p "Enter Linkyun server address (e.g. https://api.linkyun.co): " LINKYUN_SERVER
      LINKYUN_SERVER="${LINKYUN_SERVER:-https://api.linkyun.co}"
      LINKYUN_SERVER="${LINKYUN_SERVER%/}"
      break
      ;;
    *)
      echo "Please enter y or n."
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "----------------------------------------------"
echo "  Configuration Summary"
echo "----------------------------------------------"
echo "Creator UI:     ${DEPLOY_CREATOR:-no} ${CREATOR_DOMAIN:+($CREATOR_DOMAIN)}"
echo "User UI:        ${DEPLOY_USER_HUB:-no} ${USER_HUB_DOMAIN:+($USER_HUB_DOMAIN)}"
echo "Same-domain:    ${SAME_DOMAIN_PROXY:-no}"
echo "Linkyun server: $LINKYUN_SERVER"
echo "----------------------------------------------"
echo ""

# ---------------------------------------------------------------------------
# Generate .env.local files (when NOT using same-domain proxy)
# ---------------------------------------------------------------------------
if [[ -z "$SAME_DOMAIN_PROXY" ]]; then
  echo "Generating .env.local files with direct Linkyun server address..."
  
  if [[ -n "$DEPLOY_CREATOR" ]]; then
    mkdir -p "$SCRIPT_DIR/client-web-ui"
    cat > "$SCRIPT_DIR/client-web-ui/.env.local" << EOF
# Linkyun Agent API address (direct connection)
NEXT_PUBLIC_API_URL=$LINKYUN_SERVER
EOF
    echo -e "  ${GREEN}Created client-web-ui/.env.local${NC}"
  fi
  
  if [[ -n "$DEPLOY_USER_HUB" ]]; then
    mkdir -p "$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub"
    cat > "$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub/.env.local" << EOF
# Linkyun API address (direct connection)
VITE_API_URL=$LINKYUN_SERVER

# Gemini API Key (optional, for chat features)
GEMINI_API_KEY=
EOF
    echo -e "  ${GREEN}Created client-user-hub/lumina-ai-chat-hub/.env.local${NC}"
  fi
else
  # Same-domain: set API URL to the frontend's own domain so requests go through nginx
  echo "Generating .env.local files for same-domain proxy..."
  
  if [[ -n "$DEPLOY_CREATOR" ]]; then
    mkdir -p "$SCRIPT_DIR/client-web-ui"
    CREATOR_ORIGIN="https://$CREATOR_DOMAIN"
    cat > "$SCRIPT_DIR/client-web-ui/.env.local" << EOF
# Same-domain proxy: API requests go to this domain, nginx proxies to Linkyun
NEXT_PUBLIC_API_URL=$CREATOR_ORIGIN
EOF
    echo -e "  ${GREEN}Created client-web-ui/.env.local (same-domain)${NC}"
  fi
  
  if [[ -n "$DEPLOY_USER_HUB" ]]; then
    mkdir -p "$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub"
    USER_HUB_ORIGIN="https://$USER_HUB_DOMAIN"
    cat > "$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub/.env.local" << EOF
# Same-domain proxy: API requests go to this domain, nginx proxies to Linkyun
VITE_API_URL=$USER_HUB_ORIGIN

# Gemini API Key (optional, for chat features)
GEMINI_API_KEY=
EOF
    echo -e "  ${GREEN}Created client-user-hub/lumina-ai-chat-hub/.env.local (same-domain)${NC}"
  fi
fi

# ---------------------------------------------------------------------------
# Generate nginx config
# ---------------------------------------------------------------------------
NGINX_CONF="$SCRIPT_DIR/nginx/nginx.conf"
mkdir -p "$SCRIPT_DIR/nginx"

# Extract host from LINKYUN_SERVER for proxy_pass (e.g. https://api.linkyun.co -> api.linkyun.co)
LINKYUN_HOST="${LINKYUN_SERVER#*://}"
LINKYUN_HOST="${LINKYUN_HOST%%/*}"
LINKYUN_SCHEME="${LINKYUN_SERVER%%://*}"
LINKYUN_SCHEME="${LINKYUN_SCHEME:-https}"

cat > "$NGINX_CONF" << 'NGINX_HEADER'
# Linkyun Agent UI - Nginx Reverse Proxy
# Auto-generated by setup.sh

worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;
    client_max_body_size 50M;

NGINX_HEADER

# Creator UI server block
if [[ -n "$DEPLOY_CREATOR" ]]; then
  cat >> "$NGINX_CONF" << NGINX_CREATOR

    server {
        listen 80;
        server_name $CREATOR_DOMAIN;

        # Same-domain API proxy
NGINX_CREATOR
  if [[ -n "$SAME_DOMAIN_PROXY" ]]; then
    cat >> "$NGINX_CONF" << NGINX_API_PROXY
        location /api/ {
            proxy_pass $LINKYUN_SERVER;
            proxy_http_version 1.1;
            proxy_set_header Host $LINKYUN_HOST;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_ssl_server_name on;
            proxy_ssl_protocols TLSv1.2 TLSv1.3;
        }
NGINX_API_PROXY
  fi
  cat >> "$NGINX_CONF" << NGINX_CREATOR_APP

        # Creator UI (Next.js)
        location / {
            proxy_pass http://creator-ui:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
        }
    }
NGINX_CREATOR_APP
fi

# User Hub server block
if [[ -n "$DEPLOY_USER_HUB" ]]; then
  cat >> "$NGINX_CONF" << NGINX_USER

    server {
        listen 80;
        server_name $USER_HUB_DOMAIN;

        # Same-domain API proxy
NGINX_USER
  if [[ -n "$SAME_DOMAIN_PROXY" ]]; then
    cat >> "$NGINX_CONF" << NGINX_API_PROXY2
        location /api/ {
            proxy_pass $LINKYUN_SERVER;
            proxy_http_version 1.1;
            proxy_set_header Host $LINKYUN_HOST;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_ssl_server_name on;
            proxy_ssl_protocols TLSv1.2 TLSv1.3;
        }
NGINX_API_PROXY2
  fi
  cat >> "$NGINX_CONF" << NGINX_USER_APP

        # User UI (Vite SPA)
        location / {
            proxy_pass http://user-hub:80;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
NGINX_USER_APP
fi

# Close http block
cat >> "$NGINX_CONF" << 'NGINX_FOOTER'
}
NGINX_FOOTER

echo -e "  ${GREEN}Created nginx/nginx.conf${NC}"

# ---------------------------------------------------------------------------
# Generate docker-compose.yml
# ---------------------------------------------------------------------------
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

cat > "$COMPOSE_FILE" << COMPOSE_HEADER
# Linkyun Agent UI - Docker Compose
# Auto-generated by setup.sh

services:
  nginx:
    image: nginx:alpine
    container_name: linkyun-ui-nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
COMPOSE_HEADER

# Add depends_on based on what we deploy
if [[ -n "$DEPLOY_CREATOR" ]]; then
  echo "      - creator-ui" >> "$COMPOSE_FILE"
fi
if [[ -n "$DEPLOY_USER_HUB" ]]; then
  echo "      - user-hub" >> "$COMPOSE_FILE"
fi

# Creator UI service
if [[ -n "$DEPLOY_CREATOR" ]]; then
  CREATOR_API_URL="$LINKYUN_SERVER"
  [[ -n "$SAME_DOMAIN_PROXY" ]] && CREATOR_API_URL="https://$CREATOR_DOMAIN"
  cat >> "$COMPOSE_FILE" << COMPOSE_CREATOR

  creator-ui:
    build:
      context: ./client-web-ui
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: "$CREATOR_API_URL"
    container_name: linkyun-creator-ui
    environment:
      - NODE_ENV=production
COMPOSE_CREATOR
fi

# User Hub service
if [[ -n "$DEPLOY_USER_HUB" ]]; then
  USER_API_URL="$LINKYUN_SERVER"
  [[ -n "$SAME_DOMAIN_PROXY" ]] && USER_API_URL="https://$USER_HUB_DOMAIN"
  cat >> "$COMPOSE_FILE" << COMPOSE_USER

  user-hub:
    build:
      context: ./client-user-hub/lumina-ai-chat-hub
      dockerfile: Dockerfile
      args:
        VITE_API_URL: "$USER_API_URL"
    container_name: linkyun-user-hub
COMPOSE_USER
fi

echo -e "  ${GREEN}Created docker-compose.yml${NC}"

# ---------------------------------------------------------------------------
# Create Dockerfiles if they don't exist
# ---------------------------------------------------------------------------
CREATOR_DOCKERFILE="$SCRIPT_DIR/client-web-ui/Dockerfile"
if [[ -n "$DEPLOY_CREATOR" && ! -f "$CREATOR_DOCKERFILE" ]]; then
  cat > "$CREATOR_DOCKERFILE" << 'DOCKERFILE_CREATOR'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p public
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
DOCKERFILE_CREATOR
  echo -e "  ${GREEN}Created client-web-ui/Dockerfile${NC}"
  echo -e "  ${YELLOW}Note: Next.js standalone output must be enabled. Add 'output: \"standalone\"' to next.config.ts${NC}"
fi

USER_HUB_DOCKERFILE="$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub/Dockerfile"
USER_HUB_NGINX="$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub/nginx-spa.conf"
if [[ -n "$DEPLOY_USER_HUB" ]]; then
  mkdir -p "$SCRIPT_DIR/client-user-hub/lumina-ai-chat-hub"
  if [[ ! -f "$USER_HUB_NGINX" ]]; then
    cat > "$USER_HUB_NGINX" << 'NGINX_SPA'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_SPA
    echo -e "  ${GREEN}Created client-user-hub/lumina-ai-chat-hub/nginx-spa.conf${NC}"
  fi
  if [[ ! -f "$USER_HUB_DOCKERFILE" ]]; then
    cat > "$USER_HUB_DOCKERFILE" << 'DOCKERFILE_USER'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
DOCKERFILE_USER
    echo -e "  ${GREEN}Created client-user-hub/lumina-ai-chat-hub/Dockerfile${NC}"
  fi
fi

# Ensure Next.js has standalone output for Docker
NEXT_CONFIG="$SCRIPT_DIR/client-web-ui/next.config.ts"
if [[ -n "$DEPLOY_CREATOR" && -f "$NEXT_CONFIG" ]]; then
  if ! grep -q "standalone" "$NEXT_CONFIG"; then
    echo -e "  ${YELLOW}Adding output: 'standalone' to next.config.ts for Docker deployment${NC}"
    sed 's/const nextConfig: NextConfig = {};/const nextConfig: NextConfig = { output: "standalone" };/' "$NEXT_CONFIG" > "${NEXT_CONFIG}.tmp" && mv "${NEXT_CONFIG}.tmp" "$NEXT_CONFIG"
  fi
fi

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Build and run: docker compose up -d --build"
echo "  2. Point your domains to this server's IP"
echo "  3. For HTTPS, consider using certbot with nginx"
echo ""
</think>
Checking Next.js 15 standalone output structure and fixing the Dockerfile:
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
WebSearch</think>
Fixing the nginx config: using direct `proxy_pass` instead of the upstream block.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read