# 代码规范（codestyle.md）

> 项目：前后端分离计算器 · 前端（832402204 陈俊洁）

---

## 0. 规范来源

本项目的代码规范并非凭空制定，而是在以下公开规范的基础上，结合本项目的技术选型
（**零构建的原生 HTML + CSS + ES Module**）裁剪、补充而成：

| 编号 | 来源 | 本项目采用的部分 |
| --- | --- | --- |
| **[G]** | **Google JavaScript Style Guide** | 命名（文件名、类、常量、变量）、JSDoc 注释要求、模块导入顺序、`const`/`let` 优先、禁止 `eval` |
| **[A]** | **Airbnb JavaScript Style Guide** | 单引号、分号、2 空格缩进、箭头函数、`===` 严格相等、`for...of` 优先于 `for` 索引循环、`Object.prototype.hasOwnProperty.call()`、早返回（early return） |
| **[M]** | **MDN / WHATWG HTML & CSS 约定** | HTML 语义化与 `lang`/`charset`/`viewport`、`data-*` 自定义属性、CSS 自定义属性（变量）、`@media` 响应式与 `prefers-*`、无障碍（`aria-*`、`role`、`:focus-visible`）、`fetch` + `AbortController` 超时模式 |
| **[P]** | **本项目补充约定** | 见下文中标注 `[P]` 的条目，主要覆盖：前端零计算红线、`data-testid` 契约、API 错误分级、BEM 命名、中文注释与提单信息格式 |

> 约定优先级：**[P] 本项目补充约定 > [G]/[A] 通用规范 > [M] 平台约定**。
> 当通用规范与"前端不得计算表达式"这条红线冲突时（例如某些库式封装风格），以红线为准。

---

## 1. 命名规范

### 1.1 通用命名表

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 文件名 | `kebab-case` 或本项目的短小写单词 [P] | `config.js`、`api.js`、`style.css` |
| 类 / 错误类型 | `PascalCase` [G] | `ApiError` |
| 常量（模块级、导出、冻结对象） | `SCREAMING_SNAKE_CASE` [G] | `DEFAULT_API_BASE`、`WARNING_ERROR_CODES` |
| 变量 / 函数 | `camelCase` [A] | `normalizeExpressionForApi`、`refreshHistory` |
| 私有模块内变量 | `camelCase`，不加下划线前缀 [A] | `previewTimer`、`activeConfig` |
| 布尔量 | `is` / `has` / `can` / `should` 前缀 [P] | `isWarning`、`hasError`、`shouldNotifyOffline` |
| 事件处理函数 | `on` + 事件名 / `handle` + 对象 [P] | `onClick`、`onKeyDown`、`handleExpressionChanged` |
| DOM 引用集合 | `refs` + `.元素语义名` [P] | `refs.expressionInput`、`refs.historyList` |
| `data-testid` 值 | `kebab-case`，全局唯一（列表项可重复）[P] | `key-equals`、`display-result`、`history-item`、`fn-sqrt` |
| CSS 类名 | BEM，`block__element--modifier`，`kebab-case` [P] | `history-item__result`、`btn--danger` |
| CSS 变量 | `--color-*` / `--radius-*` / `--font-*` 语义前缀 [M][P] | `--color-accent`、`--radius-md` |

### 1.2 正 / 反例

```js
// ❌ 反例：含义模糊、类型不明、常量未大写
const d = 8000;
const flag = true;
const apibase = 'http://127.0.0.1:8000/api';

// ✅ 正例
const REQUEST_TIMEOUT_MS = 8000;          // [G] 常量 SCREAMING_SNAKE_CASE，带单位后缀
const isWarning = isWarningErrorCode(code); // [P] 布尔量 is 前缀
const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api';
```

```js
// ❌ 反例：函数名看不出动作，参数无语义
function exp(a, b) { /* ... */ }

// ✅ 正例：动词短语 + 名词明确的参数
function normalizeExpressionForApi(text) { /* ... */ }
function renderHistory(refs, page, options) { /* ... */ }
```

```html
<!-- ❌ 反例：选择器随意，无法稳定自动化 -->
<button class="btn1">=</button>

<!-- ✅ 正例：契约化的 data-testid + BEM 类名 + 无障碍属性 -->
<button type="button" class="key key--equals" data-testid="key-equals"
        data-action="equals" title="提交后端计算（persist=true）">=</button>
```

---

## 2. 文件组织

### 2.1 目录与职责 [P]

```
src/
├── index.html      # 仅结构与 data-testid 契约；不写内联脚本与内联样式
├── css/style.css   # 全部样式；按「变量 → 重置 → 区块 → 响应式」顺序组织
└── js/
    ├── config.js   # 配置常量 + URL 参数解析 + localStorage 读写封装
    ├── api.js      # 网络层：请求、超时、错误归一化；不含任何 DOM 操作
    ├── ui.js       # 视图层：DOM 引用、渲染、主题、Toast、事件绑定；不含业务编排
    └── app.js      # 编排层：状态机 + 事件回调 + 调用 api/ui；暴露 window.calculatorApp
```

### 2.2 分层与依赖方向 [P]

- 依赖必须**单向**：`app.js → { api.js, ui.js } → config.js`，**禁止循环依赖**。
- `api.js` 不得出现 `document` / `window` 之外的 DOM 访问；`ui.js` 不得直接调用 `fetch`。
- `index.html` 不写内联 `<script>` 逻辑（只允许一个 `<script type="module" src>`）。

```js
// ❌ 反例：视图层直接发请求，网络策略散落
// ui.js
export function renderHistory() {
  fetch('http://127.0.0.1:8000/api/history')  // 违反分层 + 地址硬编码
    .then((r) => r.json())
    .then((d) => { /* ... */ });
}

// ✅ 正例：api.js 负责网络，ui.js 只渲染
// api.js
getHistory(query) { return request('/history', { query }); }
// ui.js
export function renderHistory(refs, page, options) { /* 纯渲染 */ }
// app.js
const data = await api.getHistory(query);
ui.renderHistory(refs, data, { keyword: state.filters.keyword });
```

### 2.3 配置集中 [P]

后端地址、超时、分页大小、存储键**只允许在 `config.js` 定义一次**，其它模块通过
`getRuntimeConfig()` / 导入常量获取。

```js
// ❌ 反例：地址散落多处
fetch('http://127.0.0.1:8000/api/calculate', ...);   // app.js
fetch('http://127.0.0.1:8000/api/history', ...);     // ui.js

// ✅ 正例：唯一来源
// config.js
export const DEFAULT_API_BASE = 'http://127.0.0.1:8000/api';
// api.js
const url = buildApiUrl(getRuntimeConfig().apiBase, path, query);
```

---

## 3. 注释规范（JSDoc）[G][P]

1. 每个 `.js` 文件开头必须有文件级注释：`@file` + `@description` + 职责边界 + `@author`。
2. 所有**导出**的函数、常量、类必须有 JSDoc：`@param`、`@returns`（无返回值用 `@returns {void}`）。
3. 内部函数若逻辑非显然（如超时 / 取消、字符回退），也应有 JSDoc。
4. 注释解释**为什么**，不复述**做了什么**。
5. 注释使用中文；标识符、协议名、字段名保持英文原样。 [P]
6. 红线提示：涉及"不做计算"的关键位置应有显式注释，便于评审与查重。 [P]

```js
// ❌ 反例：复述代码、无 JSDoc、注释与代码不同步
// 把 a 加一
const b = a + 1;
export function calc(x) { /* ... */ }

// ✅ 正例
/**
 * 把界面表达式归一化成后端可识别的字符集（纯字符替换 + 去除空白，不含任何计算）。
 * @param {string} text 界面上的表达式
 * @returns {string} 发送给后端的表达式
 */
export function normalizeExpressionForApi(text) { /* ... */ }
```

```js
// ✅ 正例：解释「为什么」而非「做了什么」
// 按「字符」而不是 UTF-16 码元回退，避免把全角字符 / emoji 切坏
const before = Array.from(input.value.slice(0, start));
```

---

## 4. ES Module 规范 [G][P]

1. 浏览器端统一使用 `<script type="module">`；模块内使用 `export` / `import`，
   **不使用** IIFE、全局命名空间污染或 `<script>` 拼接。
2. `import` 必须带文件扩展名 `.js`（浏览器原生 ESM 不做扩展名补全）。
3. `import` 语句集中在文件顶部，顺序：**第三方（本项目无）→ 项目内模块 → 样式/资源**。 [G]
4. 命名导出优先；默认导出只用于"一个模块一个主对象"的场景（本项目仅 `api.js`）。
5. 常量对象用 `Object.freeze()` 冻结，避免运行期被意外改写。
6. **禁止任何动态代码执行**：`eval`、`new Function`、`setTimeout("字符串")`、
   `document.write` 拼接脚本。这是作业红线，也是安全规范。 [P]

```js
// ❌ 反例：无扩展名、动态执行、可变全局
import { api } from './api';
const result = eval(expression);
window.state = {};

// ✅ 正例
import { api, describeError, isAbortError } from './api.js';
export const ERROR_KIND = Object.freeze({ BACKEND: 'backend', NETWORK: 'network' });
```

```js
// ❌ 反例：前端自研求值（本作业直接 0 分）
function evaluateExpression(expr) {
  // 中缀转后缀 + 运算符优先级 + 逐项计算……
}

// ✅ 正例：把表达式交给后端，前端只处理返回值
const payload = await api.calculate(wireExpression, true);
ui.renderCalculation(refs, payload, rawExpression);
```

---

## 5. 异步与错误处理规范 [M][P]

### 5.1 硬性要求

1. **所有 `fetch` 必须**有 `try/catch` **和超时控制**（`AbortController` + `setTimeout`）。
2. 超时时间集中定义（`REQUEST_TIMEOUT_MS`），不散落魔法数字。
3. 错误必须**归一化**为统一结构 `ApiError`（`message` / `kind` / `errorCode` / `status`），
   界面展示统一走 `describeError()`。
4. 展示给用户的文案**优先使用后端 `message`**；网络类失败使用前端固定文案
   「无法连接后端服务，请确认后端已启动」。
5. 区分**静默失败**与**显式报错**：实时预览（`persist=false`）失败必须静默，
   不能弹 Toast 打扰输入。
6. 同一连接故障只提示一次（`offlineNotified` 去抖），避免 Toast 刷屏。
7. 顶层异步调用使用 `void asyncFn()` 明确表示"故意不 await"，避免未处理 Promise 警告。
8. **删除 / 收藏后必须重新查询**后端列表与统计，不允许在前端数组里就地增删。

### 5.2 正 / 反例

```js
// ❌ 反例：无 try/catch、无超时、错误直接抛给用户、地址硬编码
async function loadHistory() {
  const res = await fetch('http://127.0.0.1:8000/api/history?page=1');
  const json = await res.json();          // 后端 500 时这里直接崩
  render(json.data.items);
}

// ✅ 正例：网络层统一超时 + 错误归一化
async function request(path, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
  try {
    const response = await fetch(url, { method, headers, body, signal: controller.signal, mode: 'cors' });
    /* ...解析统一外壳... */
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError('请求超时…', { kind: ERROR_KIND.TIMEOUT });
    throw new ApiError('无法连接后端服务，请确认后端已启动', { kind: ERROR_KIND.NETWORK });
  } finally {
    clearTimeout(timer);
  }
}
```

```js
// ❌ 反例：前端自作主张，把错误吞掉且不区分级别
try { await api.calculate(wire, true); } catch { alert('错误'); }

// ✅ 正例：区分警示 / 错误级别，且历史区不受影响
const info = describeError(error);
ui.renderError(refs, info.message, info.level, info.expression || rawExpression);
ui.toast(refs, info.message, { type: info.level === ui.ERROR_LEVEL.WARNING ? 'warning' : 'error' });
```

```js
// ❌ 反例：删除后只改前端数组 —— 违反"必须重新向后端查询"
state.history.items = state.history.items.filter((item) => String(item.id) !== String(id));
ui.renderHistory(refs, state.history);

// ✅ 正例
await api.deleteHistoryItem(id);
await refreshHistory();      // 重新 GET /api/history
await refreshStatistics();   // 重新 GET /api/history/statistics
```

### 5.3 异步风格细则

- 统一使用 `async/await`，不混用 `.then()` 链。
- 并发且互不依赖的请求用 `Promise.all([...])`（例如计算成功后刷新历史 + 统计）。
- 需要"后来者取消前者"的场景（实时预览）必须用 `AbortController`，并忽略
  `ABORT` 类错误。
- 回调中触发异步动作时统一写 `void someAsyncFn()`，明确表达不等待。

---

## 6. JavaScript 细节规范 [A]

| 条目 | 规则 |
| --- | --- |
| 引号 / 分号 | 单引号；语句结尾必须写分号 |
| 缩进 | 2 空格，禁止 Tab |
| 相等判断 | 一律 `===` / `!==`；判空用 `=== null` / `=== undefined` 或 `== null` 二选一且全项目统一 |
| 变量声明 | 优先 `const`，需要重新赋值才用 `let`，禁止 `var` |
| 对象拷贝 | 浅合并用 `Object.assign({}, a, b)`（本作业不使用展开语法以外的语法糖，保持兼容） |
| 属性存在性 | 用 `Object.prototype.hasOwnProperty.call(obj, key)`，不直接用 `obj.hasOwnProperty` |
| 遍历 | 数组优先 `forEach` / `for...of`；对象用 `Object.keys(obj).forEach` |
| 类型转换 | 显式转换；`Number.isFinite()` 判数值有效，不用 `parseInt` 处理结果 |
| 早返回 | 校验失败立即 `return`，减少嵌套层级 |
| 魔法数字 | 抽为有名字的常量 |
| 全局变量 | 除唯一入口 `window.calculatorApp` 外，不污染全局命名空间 [P] |

```js
// ❌ 反例：var、==、嵌套四层、魔法数字
function f(list) {
  var out = [];
  if (list != null) {
    if (list.length > 0) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].total > 10) { out.push(list[i]); }
      }
    }
  }
  return out;
}

// ✅ 正例：早返回、常量、`for...of`
const MAX_TOTAL = 10;

function filterLargeRecords(list) {
  if (!Array.isArray(list) || list.length === 0) return [];
  const result = [];
  for (const record of list) {
    if (record.total > MAX_TOTAL) result.push(record);
  }
  return result;
}
```

---

## 7. HTML 规范 [M][P]

1. `<!DOCTYPE html>` + `<html lang="zh-CN">` + `<meta charset="utf-8">` +
   `<meta name="viewport">` 四要素必须齐全。
2. 使用语义化标签：`header` / `main` / `section` / `article` / `nav` / `footer` /
   `output`；每个区块有 `aria-label` 或可见标题。
3. **不写内联 `style` 与内联事件属性**（`onclick="..."`），事件统一在 JS 中
   `addEventListener` 绑定。
4. 无外部 CDN / 字体依赖，离线可打开。
5. 每个交互控件必须有 `type="button"`，避免在表单中误提交。
6. 所有自动化选择器使用 `data-testid`；类名只负责样式，**自动化脚本不应依赖类名**。 [P]
7. 列表项等可重复元素除了 `data-testid` 还应带业务标识（如 `data-id`）。 [P]

```html
<!-- ❌ 反例：内联样式 + 内联事件 + 无语义 -->
<div style="color:red" onclick="calc()">
  <div class="big">=</div>
</div>

<!-- ✅ 正例 -->
<section class="keypad" data-testid="keypad" role="group" aria-label="数字与基本运算符">
  <button type="button" class="key key--equals" data-testid="key-equals"
          data-action="equals" title="提交后端计算（persist=true）">=</button>
</section>
```

---

## 8. CSS 规范（BEM）[P][M]

1. **BEM 命名**：`block__element--modifier`，全部小写 + 连字符。
   - 块（Block）：独立组件，如 `history-item`、`card`、`key`、`toast-item`
   - 元素（Element）：块的组成部分，双下划线，如 `history-item__result`、`card__title`
   - 修饰符（Modifier）：状态或变体，双连字符，如 `btn--danger`、`key--equals`、
     `display__error--warning`
2. **禁止**多于两层的选择器嵌套、禁止 `#id` 选择器、禁止 `!important`（除覆盖第三方，本项目无）。
3. 颜色 / 圆角 / 字体 / 阴影等**主题化值必须走 CSS 变量**，明暗主题只在
   `:root` 与 `html[data-theme="dark"]` 两处定义。
4. 状态用属性选择器表达：`.status[data-state="offline"]`、`.history[data-loading="true"]`。
5. 布局优先 Flexbox / Grid；间距用 `gap`，不用 margin 链式拼接。
6. 必须提供响应式断点（本项目 JSON：`@media (min-width: 1100px)` 两栏，
   `@media (max-width: 560px)` 紧凑单列）。
7. 尊重用户偏好：`@media (prefers-reduced-motion: reduce)` 关闭动画。
8. 属性书写顺序：定位 → 盒模型 → 排版 → 视觉 → 动画。
9. 每个区块用注释分隔，如 `/* ==== 9. 数字键盘 ==== */`。

```css
/* ❌ 反例：驼峰类名、id 选择器、硬编码颜色、!important */
#calcResult { color: #0284c7 !important; }
.historyItem .resultSpan { font-size: 18px; }

/* ✅ 正例：BEM + 变量 + 属性状态 */
.history-item__result {
  font-family: var(--font-mono);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-accent);
  word-break: break-all;
}

.history[data-loading="true"] {
  opacity: 0.55;
}
```

```css
/* ❌ 反例：修饰符复用元素名，语义不清 */
.key.keyEquals { /* ... */ }

/* ✅ 正例 */
.key--equals { /* ... */ }
```

---

## 9. 提交信息规范 [P]

采用 **Conventional Commits**，格式：

```
<type>(<scope>): <subject>

<body 可选：说明为什么>

<footer 可选：关联 issue / 破坏性变更>
```

- `type`：`feat`（新功能）、`fix`（修缺陷）、`docs`（文档）、`style`（格式，不改逻辑）、
  `refactor`（重构）、`test`（测试）、`chore`（构建 / 工具）、`perf`（性能）
- `scope`：模块名，如 `ui`、`api`、`config`、`history`、`style`
- `subject`：中文或英文均可，**动词开头、结尾不加句号、不超过 50 字**
- 一次提交只做一件事；禁止 `update`、`fix bug`、`提交` 这类无信息量标题

```text
# ❌ 反例
更新
fix bug

# ✅ 正例
feat(ui): 历史列表支持点击回填表达式
fix(api): 修复请求超时后未清理 AbortController 监听器
docs(readme): 补充 ?api= 参数与联调验证步骤
refactor(ui): 把键盘快捷键绑定从 app.js 收敛到 ui.js
style(css): 统一按钮 hover 态的过渡时长
```

**红线自查**：任何提交都不得引入表达式求值代码。若提交信息涉及计算，应明确写出
"结果来自后端"，例如：

```text
feat(calculate): 计算结果改为完全由后端 /api/calculate 返回
```

---

## 10. 提交前自检清单

- [ ] `node --input-type=module --check < src/js/*.js` 全部通过（ES Module 语法检查）
- [ ] `index.html` 中引用的 `css/style.css`、`js/app.js` 路径存在且正确
- [ ] `app.js` 的 `import` 路径（`./config.js`、`./api.js`、`./ui.js`）存在且带 `.js` 后缀
- [ ] 全文检索 `eval` / `new Function` / `setTimeout("` ：无命中（红线）
- [ ] 全文检索 `127.0.0.1:8000` ：只出现在 `config.js`（与文档示例中）
- [ ] localStorage 只使用 `theme` 与 `calculator.ui-prefs` 两个键，且不存历史数据
- [ ] 每个 `fetch` 都有 `try/catch` 与超时
- [ ] 新增 / 修改的交互元素都有对应 `data-testid`
- [ ] 明暗两种主题下都检查过对比度与可读性
- [ ] 断网状态下验证：提示明确，且**没有任何计算结果**出现在界面上

---

© 2026 陈俊洁 832402204 · 规范用于本项目课程作业。
