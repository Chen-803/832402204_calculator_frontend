import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Vite 配置
// 说明：后端接口地址通过环境变量 VITE_API_BASE_URL 注入（见 .env.development），
// 后端已开启 CORS，因此开发期直接跨域请求 http://127.0.0.1:8000，无需代理。
//
// 关于 allowedHosts：
//   Vite 6 默认只响应 Host 为 localhost / IP 的请求，这是为了防止 DNS rebinding 攻击。
//   当项目通过**反向代理或内网穿透**（如 Cloudflare Tunnel、ngrok）对外提供演示时，
//   外部域名会被 Vite 直接以 403 拒绝（提示 "Blocked request. This host is not allowed."），
//   因此需要把外部域名加入白名单。以 "." 开头表示连同其所有子域名一起放行。
//   如需换成自己的域名，修改下面这个数组即可（或用环境变量 VITE_ALLOWED_HOSTS 覆盖）。
const ALLOWED_HOSTS = (process.env.VITE_ALLOWED_HOSTS || '.trycloudflare.com,localhost,127.0.0.1')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    open: false,
    allowedHosts: ALLOWED_HOSTS,
    // 如果后端未开启 CORS，可改用下面的代理方案，并把 VITE_API_BASE_URL 设为空串（走同源 /api）：
    // proxy: {
    //   '/api': {
    //     target: 'http://127.0.0.1:8000',
    //     changeOrigin: true,
    //   },
    // },
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    allowedHosts: ALLOWED_HOSTS,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
