# 前端代码规范（codestyle.md）

> 适用仓库：`832402204_calculator_frontend`（Vue 3 + Vite 纯 JavaScript 项目）
> 学号 832402204 · 陈俊洁

---

## 一、规范来源

本规范不是凭空写的，主要参考以下官方规范，并结合本项目（Vue 3 `<script setup>` + Vite + 纯 JavaScript）的实际写法做了裁剪与细化：

| 来源 | 链接 | 本项目采纳的部分 |
| --- | --- | --- |
| **Google JavaScript Style Guide** | <https://google.github.io/styleguide/jsguide.html> | 文件组织、命名、字符串引号、分号、注释与 JSDoc、模块导入导出、异常处理 |
| **Vue 官方风格指南**（优先级 A/B/C 规则） | <https://cn.vuejs.org/style-guide/> | 组件命名（多单词 PascalCase）、props 定义、`v-for` 与 `v-if` 使用、`<script setup>` 内代码顺序、模板中 ref 自动解包 |
| Vue 3 组合式 API 文档 | <https://cn.vuejs.org/guide/introduction.html> | 组合式函数（composable）的命名与返回值约定 |
| MDN JavaScript 参考 | <https://developer.mozilla.org/zh-CN/docs/Web/JavaScript> | 语言特性与浏览器 API 的正确用法（`fetch`、`AbortController`、Clipboard API） |
| Conventional Commits | <https://www.conventionalcommits.org/zh-hans/v1.0.0/> | Git 提交信息格式 |

**效力顺序**：与上述官方规范冲突时，以官方规范为准；官方规范未覆盖的细节，以本文件为准；本文件未覆盖的细节，以「同一目录内已有代码的写法」为准（一致性优先）。

---

## 二、适用范围与基本原则

1. **可读性优先**：代码是写给人看的，其次才是给机器执行的。
2. **一致性优先**：同一个仓库里，同样的东西只有一种写法；不要在一个文件里混用两种风格。
3. **不引入额外依赖**：本项目的依赖只有 `vue`、`vite`、`@vitejs/plugin-vue` 三个。任何"为了少写几行代码"而引入的库（UI 组件库、axios、状态管理库、图表库、计算库）都不被允许。
4. **业务红线优先于风格**：见第九节「业务红线：前端零计算」。

---

## 三、文件与目录组织

```
src/
├── main.js              # 入口：挂载应用、引入全局样式、初始化主题
├── App.vue              # 页面骨架（布局、标签页、键盘绑定）
├── api/                 # 只放 HTTP 调用：一个后端资源一个文件
├── components/          # 展示型组件，文件名 PascalCase.vue
├── composables/         # 组合式函数，文件名 useXxx.js
├── utils/               # 与框架无关的纯工具函数
└── styles/              # 全局样式（main.css 全局变量与布局，calculator.css 业务样式）
```

规则：

- 一个文件只做一件事；组件超过 ~400 行应拆分。
- 组件文件用 **PascalCase.vue**；JS 文件用 **camelCase.js**；样式文件用 **kebab-case.css**。
- 目录名用小写单词（`components`、`composables`），不使用复数以外的变形。
- 不提交 `node_modules/`、`dist/`、`.env.local`（见 `.gitignore`）。

---

## 四、命名规范

| 对象 | 规则 | 正例 | 反例 |
| --- | --- | --- | --- |
| 变量 / 函数 | `camelCase`，语义完整，避免无意义缩写 | `pageInfo`、`loadUnits()` | `pi`、`d1`、`getU()` |
| 模块级常量 | `UPPER_SNAKE_CASE` | `BASE_URL`、`DEFAULT_PAGE_SIZE` | `baseUrl`、`defaultpagesize` |
| 布尔值 | `is` / `has` / `can` / `only` 等前缀 | `loading` 之外的 `isDark`、`hasNext`、`onlyFavorite` | `dark`、`next`、`fav` |
| 类 / 组件 | `PascalCase`，**多单词** | `HistoryPanel`、`KeypadButton` | `History`、`Button`、`historyPanel` |
| 组件文件 | `PascalCase.vue` | `ConverterPanel.vue` | `converter-panel.vue`、`converterPanel.vue` |
| 组合式函数 | 文件名与函数名都以 `use` 开头，`camelCase` | `useHistory.js` / `export function useHistory()` | `HistoryStore.js` / `getHistory()` |
| 事件处理函数 | 模板里 `handleXxx`；组合式 API 内部回调可 `onXxx` | `handleClick()`、`onKeyPress(key)` | `click1()`、`doIt()` |
| 事件名（emit） | 定义用 `camelCase`，模板监听用 `kebab-case` | `defineEmits(['toggleFavorite'])` + `@toggle-favorite` | `defineEmits(['toggle_favorite'])` |
| API 模块导出 | 动词开头，语义化 | `calculate()`、`listHistory()`、`convertBase()` | `api1()`、`getData()` |
| CSS 类名 | `kebab-case` + BEM：`块__元素--修饰符` | `.history-item__result`、`.tab--active` | `.historyItemResult`、`.active` |
| CSS 变量 | `--kebab-case`，语义化 | `--color-primary`、`--radius-md` | `--primary`、`--r1` |
| `data-testid` | `kebab-case`，与功能对应且稳定 | `expression-input`、`btn-equals` | `input1`、`testBtn` |

---

## 五、格式规范

- **缩进**：2 个空格，禁止 Tab。
- **引号**：字符串统一单引号 `'...'`；需要插值时才用反引号模板字符串。
- **分号**：语句末尾必须写 `;`。
- **尾随逗号**：多行对象 / 数组 / 参数的最后一个元素后加尾随逗号。
- **行长**：单行不超过 **110** 字符。
- **空格**：二元运算符两侧各一个空格；一元运算符后不加空格；`if (`、`function fn(`、`{ a: 1 }` 按示例书写。
- **换行**：文件使用 LF；文件末尾保留一个空行；不留行尾空格。
- **编码**：UTF-8（无 BOM）。

✅ 正例

```js
const TABS = [
  { key: 'history', label: '历史记录', testid: 'tab-history' },
  { key: 'stats', label: '统计', testid: 'tab-stats' },
];

function selectTab(key) {
  if (key === activeTab.value) {
    return;
  }
  activeTab.value = key;
}
```

❌ 反例

```js
const TABS = [
    { key: "history", label: "历史记录", testid: "tab-history" },   // 4 空格缩进、双引号、缺少尾随逗号
    { key: "stats" }
]
function selectTab(key){                       // 括号与花括号缺少空格
	if(key==activeTab.value)return            // Tab 缩进、运算符两侧无空格、缺少分号
	activeTab.value=key;
}
```

---

## 六、JavaScript 规范

### 6.1 变量声明

只用 `const` / `let`，禁用 `var`；不会被重新赋值的用 `const`。

✅ 正例

```js
const DEFAULT_TIMEOUT = 15000;
let searchTimer = null;
```

❌ 反例

```js
var DEFAULT_TIMEOUT = 15000;
let BASE_URL = 'http://127.0.0.1:8000'; // 从未重新赋值，应为 const
```

### 6.2 函数与异步

- 优先小函数、单一职责；函数名是动词短语。
- 异步统一用 `async/await`，不使用 `.then()` 链式回调。
- `async` 函数内用 `try/catch/finally`，禁止空 `catch {}` 吞掉异常。

✅ 正例

```js
async function load() {
  loading.value = true;
  error.value = null;
  try {
    const data = await listHistory({ page: page.value });
    items.value = Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    error.value = { message: err.message, network: Boolean(err.network) };
  } finally {
    loading.value = false;
  }
}
```

❌ 反例

```js
function load() {
  loading.value = true;
  listHistory({ page: page.value })
    .then((data) => { items.value = data.items; })
    .catch(() => {}); // 吞掉异常，界面既不提示也不复位 loading
}
```

### 6.3 模块导入 / 导出

- 统一 ES Module（`import` / `export`）；优先具名导出。
- 路径别名 `@` 指向 `src`。
- 导入顺序：① `vue` 等运行时框架 → ② 第三方库 → ③ `@/api/*` → ④ `@/composables/*` → ⑤ `@/components/*` → ⑥ 样式。

✅ 正例

```js
import { computed, ref } from 'vue';
import HistoryItem from '@/components/HistoryItem.vue';
import { useCalculator } from '@/composables/useCalculator';
import { useHistory } from '@/composables/useHistory';
import { copyText } from '@/utils/clipboard';
```

❌ 反例

```js
import { useHistory } from '../../composables/useHistory'; // 应使用 @ 别名
import { copyText } from '@/utils/clipboard';
import { ref } from 'vue'; // 导入顺序混乱
```

### 6.4 错误对象

所有接口异常统一用 `src/api/http.js` 暴露的 `ApiError`（字段：`message` / `code` / `status` / `network` / `payload`），UI 层只读 `message`（后端文案）与 `network`（是否连不上后端）。

✅ 正例

```js
throw new ApiError('无法连接后端服务（http://127.0.0.1:8000），请确认后端已启动后重试', {
  network: true,
  code: -1,
});
```

❌ 反例

```js
throw { msg: '出错了' }; // 结构随意，且文案是前端自编的
```

---

## 七、Vue 组件规范

### 7.1 SFC 结构与代码顺序

- 一律使用 `<script setup>` 组合式 API；**禁止** Options API 与 `mixins`。
- SFC 块顺序：`<template>` → `<script setup>` →（可选）`<style>`；本项目样式集中在 `src/styles/*.css`，组件内**不写** `<style>` 块。
- `<script setup>` 内部顺序固定：
  1. `import`
  2. `defineProps` / `defineEmits`
  3. 组合式函数调用（`useXxx()`）
  4. 响应式状态（`ref` / `reactive`）
  5. 计算属性（`computed`）
  6. 方法
  7. 生命周期钩子（`onMounted` 等）

✅ 正例

```vue
<script setup>
import { computed, ref } from 'vue';
import { useCalculator } from '@/composables/useCalculator';

const props = defineProps({
  active: { type: Boolean, default: true },
});

const emit = defineEmits(['press']);

const { expression, append } = useCalculator();

const doubleWidth = ref(false);
const title = computed(() => `当前表达式：${expression.value || '0'}`);

function handlePress(token) {
  append(token);
  emit('press');
}
</script>
```

❌ 反例

```vue
<script>
export default {
  props: ['active'],                 // 数组式 props，无类型
  data() { return { doubleWidth: false }; },
  methods: { handlePress() {} },     // Options API，与项目风格不一致
};
</script>
```

### 7.2 props / emits

- props 必须对象写法，声明 `type`；必要时给 `default` / `required` / `validator`。
- emits 必须先用 `defineEmits` 声明，禁止"隐式 emit"。

✅ 正例

```js
const props = defineProps({
  label: { type: String, required: true },
  testid: { type: String, required: true },
  variant: { type: String, default: 'num' },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['press']);
```

❌ 反例

```js
const props = defineProps(['label', 'variant']); // 无类型、无默认值
this.$emit('press');                             // 未声明 emits，且用了 Options API 写法
```

### 7.3 模板

- `v-for` 必须带 `:key`，且 key 用业务唯一字段（如 `item.id`），不要用索引。
- `v-if` 与 `v-for` 不写在同一元素上。
- 模板中访问组合式函数返回的 ref **不写** `.value`；在 JS 里必须写。
- 复杂表达式抽成 `computed` 或方法，不写在模板里。
- 无障碍：可点击的非按钮元素要加 `role` 与键盘事件；纯装饰元素加 `aria-hidden="true"`。

✅ 正例

```vue
<ul class="history__list" data-testid="history-list">
  <HistoryItem v-for="item in items" :key="item.id" :item="item" @remove="removeItem(item.id)" />
</ul>
```

❌ 反例

```vue
<ul>
  <li v-for="(item, index) in items" :key="index" v-if="item.id > 0">
    {{ item.expression }} = {{ item.resultText }}
  </li>
</ul>
```

### 7.4 组合式函数（composables）

- 命名 `useXxx`，返回值用**对象**（便于按需解构），返回 `ref` 本身而不是 `.value`。
- 跨组件共享的状态放在模块作用域（单例），如 `useHistory.js`、`useCalculator.js`。
- 组合式函数里不直接操作 DOM。

✅ 正例

```js
const items = ref([]);

async function load() {
  /* ... */
}

export function useHistory() {
  return { items, load };
}
```

❌ 反例

```js
export default function history() {     // 未以 use 开头
  const items = [];                     // 普通数组，失去响应式
  return items;                         // 返回裸数组，无法解构共享状态
}
```

---

## 八、CSS 规范

- 类名 **BEM**：`.块__元素--修饰符`，块名与组件语义对应（`.calc`、`.history-item`、`.stat-card`）。
- 主题色、圆角、阴影、字体统一用 `src/styles/main.css` 里的 CSS 变量；亮/暗主题通过 `:root[data-theme='dark']` 覆盖变量，组件样式里**不写**具体色值。
- 选择器嵌套层级不超过 2 层，禁止使用标签选择器做业务样式。
- 不使用 `!important`；不使用行内 `style`（除动态百分比这类必须计算的展示值）。
- 布局优先 Flex / Grid；响应式断点统一为 `900px`（窄屏单栏）与 `420px`（小屏按键）。

✅ 正例

```css
.history-item__result {
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-primary);
}

.history-item--favorite {
  border-left: 4px solid var(--color-warning);
}
```

❌ 反例

```css
div .history .item .result span {   /* 层级过深、语义不明 */
  color: #3b6ef6 !important;        /* 硬编码颜色 + !important */
}
```

---

## 九、业务红线：前端零计算

> 本作业的评分点之一是「最终计算结果必须由后端产生并返回前端」。

**必须遵守**：

1. 禁止 `eval`、`new Function`、`setTimeout('code')` 等一切把字符串当代码执行的手段；
2. 禁止自研词法/语法/求值逻辑（四则运算解析器、AST、优先级处理……一律没有）；
3. 禁止引入 `mathjs`、`decimal.js`、`big.js` 等计算库；
4. 进制换算、单位换算同样必须调用后端接口，前端不得内置换算系数或进制算法；
5. 错误提示必须使用后端返回的 `message`；只有**网络层失败**（`fetch` 抛错/超时）才允许使用前端约定文案「无法连接后端服务」；
6. 允许的本地数值处理仅限**展示层格式化**（字符串首尾处理、把后端返回的计数换算成柱状图百分比等），且必须写注释说明用途。

✅ 正例

```js
/** 纯展示用：把后端返回的计数映射成 CSS 高度百分比（不是业务计算） */
function toPercent(count, max) {
  const value = Number(count) || 0;
  if (!max || value <= 0) {
    return 0;
  }
  return Math.round((value / max) * 100);
}

/** 计算结果一律来自后端 */
async function calculate() {
  const data = await requestCalculate(expression.value, angleMode.value);
  result.value = { resultText: data.resultText, historyId: data.historyId };
}
```

❌ 反例

```js
// 绝对禁止：前端自己算
const value = eval(expression.value);
const value2 = new Function(`return ${expression.value}`)();
const value3 = math.evaluate(expression.value);
if (expression.value.includes('+')) {
  const [a, b] = expression.value.split('+');
  result.value = Number(a) + Number(b);   // 自研四则运算
}
// 绝对禁止：前端自己编错误文案
error.value = '你的表达式写错了，请检查括号';
```

---

## 十、注释与文档规范

- 每个模块文件顶部用块注释 `/** ... */` 说明用途与关键约束（中文）。
- 导出的函数/组合式函数用 JSDoc 标注参数与返回值（`@param` / `@returns`）。
- 关键分支、易踩坑处写行内注释说明"为什么"，而不是"做了什么"。
- 不提交被注释掉的大段死代码；不使用 `TODO` 占位符描述已完成功能。
- 面向用户的文案一律**简体中文**。

✅ 正例

```js
/**
 * 删除单条历史：调用 DELETE /api/history/{id}，成功后重新拉取列表
 * （不做前端假删除，保证与后端数据一致）
 */
async function removeItem(id) {
  // 删掉当前页最后一条时回退一页，避免停留在空页
  if (items.value.length === 1 && page.value > 1) {
    page.value -= 1;
  }
}
```

❌ 反例

```js
// 删除
function f(id) {
  // let old = ...  （注释掉的历史代码）
  // TODO: 以后再说
}
```

---

## 十一、Git 提交信息规范

采用 **Conventional Commits**，格式：

```
type(scope): 中文简述

（可选正文：说明「为什么」这样改，而不是「改了什么」）
```

- `type` 取：`feat`（新功能）、`fix`（修缺陷）、`docs`（文档）、`style`（格式，不影响逻辑）、`refactor`（重构）、`perf`（性能）、`chore`（构建/依赖等杂项）。
- `scope` 用模块名：`calculator`、`history`、`stats`、`convert`、`api`、`styles`、`readme` 等。
- 标题不超过 50 个字符，句末不加句号；一次提交只做一件事。

✅ 正例

```
feat(calculator): 新增科学计算面板与 DEG/RAD 角度制切换
fix(history): 删除成功后重新拉取列表并处理空页回退
fix(api): 后端返回 success=false 时改用后端 message 展示
docs(readme): 补充 VITE_API_BASE_URL 配置与常见问题
style(styles): 统一按键按下反馈与阴影变量
```

❌ 反例

```
update            // 无类型、无范围、看不出改了什么
修复bug           // 未遵循约定格式
feat: 加了科学计算、历史搜索、分页、统计图表、进制转换、单位换算、主题切换……  // 一次提交做太多事
```

---

## 十二、提交前自检清单

- [ ] `npm run build` 通过，`dist/index.html` 正常生成；
- [ ] 没有 `console.log` 调试残留（`console.error` 仅用于真实异常）；
- [ ] 没有 `eval` / `new Function` / 计算库，没有前端自研求值逻辑；
- [ ] 所有接口路径、请求体、查询参数与 `docs/API_CONTRACT.md` 一致；
- [ ] 新增交互元素带稳定的 `data-testid`；
- [ ] 错误提示使用后端 `message`；网络失败才用「无法连接后端服务」；
- [ ] 亮色 / 暗色主题下都检查过对比度；
- [ ] 窄屏（< 900px）下单栏布局正常；
- [ ] 未引入任何新依赖（依赖仍为 vue / vite / @vitejs/plugin-vue）；
- [ ] 提交信息符合第十一节的格式。
