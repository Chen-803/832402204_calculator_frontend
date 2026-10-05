/**
 * main.js —— 应用入口
 * 挂载根组件，引入全局样式，并在启动时初始化主题。
 */
import { createApp } from 'vue';
import App from '@/App.vue';
import { useTheme } from '@/composables/useTheme';
import '@/styles/main.css';
import '@/styles/calculator.css';

// 初始化主题：优先用户本地偏好，其次跟随系统
useTheme();

createApp(App).mount('#app');
