/**
 * config.js —— 运行时配置（不参与打包，可在部署后直接修改）
 *
 * 作用：给静态托管（如 GitHub Pages、对象存储、任意静态服务器）提供一个
 *       「不用重新构建就能换后端地址」的入口。
 *
 * 用法：把下面的空串改成后端地址即可，例如：
 *   window.__API_BASE__ = 'https://pic-privacy-merit-detailed.trycloudflare.com';
 *
 * 优先级（见 src/api/http.js 的 resolveBaseUrl）：
 *   ?api= 参数  >  localStorage  >  本文件  >  构建期 VITE_API_BASE_URL  >  http://127.0.0.1:8000
 *
 * 也就是说：临时想连别的后端，直接在页面地址后面加 `?api=https://xxxx` 即可
 * （会记住到 localStorage，下次打开仍然生效）。
 */
window.__API_BASE__ = '';
