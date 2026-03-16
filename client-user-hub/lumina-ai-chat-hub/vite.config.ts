import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** 构建时生成 version.json，用于运行时检测是否有新版本（避免长期使用浏览器缓存） */
function versionJsonPlugin() {
  const outDir = path.resolve(__dirname, 'dist');
  return {
    name: 'version-json',
    writeBundle() {
      const version = { buildTime: Date.now(), version: '0.0.0' };
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'version.json'), JSON.stringify(version), 'utf-8');
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3001,
        host: '0.0.0.0',
      },
      appType: 'spa', // SPA 路由：/messages、/contacts、/discovery、/moments 等路径需回退到 index.html
      plugins: [
        react(),
        versionJsonPlugin(),
        VitePWA({
          registerType: 'prompt', // 有更新时提示用户刷新，避免长期使用旧缓存
          includeAssets: ['pwa-icon.svg'],
          manifest: {
            name: 'Linkyun AI - Chat Hub',
            short_name: 'Chat Hub',
            description: 'AI Chat Hub - 与 AI 助手畅聊',
            theme_color: '#13b6ec',
            background_color: '#101d22',
            display: 'standalone',
            start_url: '/',
            icons: [
              { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            navigateFallback: '/index.html',
            // 避免 workbox 内部 terser 与 Rollup 收尾时的竞态导致 build 失败
            mode: 'development',
            // 主 chunk 含 mermaid 等较大依赖，超过默认 2 MiB，提高到 5 MiB
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
