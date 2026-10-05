/**
 * useTheme.js —— 亮色 / 暗色主题（模块级单例）
 *
 * 规则：
 * 1. 用户手动切换后写入 localStorage（key: calc-theme），下次进入沿用该偏好；
 * 2. 用户从未手动切换过时，跟随系统 prefers-color-scheme，并实时响应系统切换；
 * 3. 主题通过 <html data-theme="light|dark"> 生效，样式变量定义在 src/styles/main.css。
 */
import { computed, ref } from 'vue';

const STORAGE_KEY = 'calc-theme';

const theme = ref('light');
let mediaQuery = null;
let initialized = false;

function readStoredTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : '';
  } catch (error) {
    return '';
  }
}

function systemPrefersDark() {
  return Boolean(window.matchMedia) && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(value) {
  document.documentElement.dataset.theme = value;
}

function initTheme() {
  if (initialized) {
    return;
  }
  initialized = true;
  const stored = readStoredTheme();
  theme.value = stored || (systemPrefersDark() ? 'dark' : 'light');
  applyTheme(theme.value);

  if (window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (event) => {
      // 用户已显式选择过主题时，不再跟随系统
      if (readStoredTheme()) {
        return;
      }
      theme.value = event.matches ? 'dark' : 'light';
      applyTheme(theme.value);
    });
  }
}

function setTheme(value) {
  theme.value = value === 'dark' ? 'dark' : 'light';
  applyTheme(theme.value);
  try {
    window.localStorage.setItem(STORAGE_KEY, theme.value);
  } catch (error) {
    // localStorage 不可用（隐私模式等）时仅本次会话生效
  }
}

function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark');
}

export function useTheme() {
  initTheme();
  const isDark = computed(() => theme.value === 'dark');
  const themeLabel = computed(() => (theme.value === 'dark' ? '切换为亮色' : '切换为暗色'));
  const themeIcon = computed(() => (theme.value === 'dark' ? '☀' : '☾'));
  return { theme, isDark, themeLabel, themeIcon, setTheme, toggleTheme };
}

export default useTheme;
