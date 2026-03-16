FROM node:20-alpine AS builder
WORKDIR /app
# 前端模块多、bundle 大，构建时需足够堆内存，避免在 transform 阶段卡住或 OOM
ENV NODE_OPTIONS="--max-old-space-size=4096"
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
