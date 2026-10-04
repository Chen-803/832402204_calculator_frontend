# 前后端分离计算器 · 前端

> 软件工程课程作业 · 前端部分
> 学号：**832402204**　姓名：**陈俊洁（Chen Junjie）**

一个**零构建**的前端计算器客户端：只用原生 HTML + CSS + 原生 JavaScript（ES Module），
不引入 npm、打包工具、框架或任何第三方库。所有运算结果都由后端
`POST /api/calculate` 返回，前端只负责界面展示、按键交互、表达式输入、发请求、
展示结果与历史、以及展示后端返回的错误信息。

---

## 1. 项目介绍

| 项目 | 说明 |
| --- | --- |
| 名称 | 前后端分离计算器（前端部分） |
| 定位 | 浏览器端界面层；**不做任何表达式求值** |
| 界面语言 | 简体中文 |
| 风格 | 极简科幻风，明 / 暗双主题，无外部字体与 CDN，完全离线可用 |
| 架构 | 前后端分离，通过 REST + JSON 通信，后端已开启 CORS |

### 1.1 前端职责边界（作业红线）

1. **前端不计算任何表达式结果。**
   - 代码中不存在 `eval`、`Function`、`new Function`、`setTimeout("字符串")`，
     也没有任何自研的表达式解析 / 求值实现（无词法分析、无中缀转后缀、无运算符优先级表）。
   - 界面上出现的每一个数字结果，都是后端响应字段（`result` / `display_result`）的**原样字符串**。
   - 实时预览也是把表达式发给后端并用 `persist=false` 试算，而不是前端估算。
2. **前端只做这些事**：界面展示、按键交互、表达式输入、发请求、展示结果、
   展示历史、发删除 / 收藏请求、展示后端返回的错误信息。
3. **localStorage 只存主题与界面偏好**（`theme`、`calculator.ui-prefs`），
   **绝不缓存计算历史**；历史每次都重新向后端 `GET /api/history` 查询。
4. 删除 / 收藏成功后，**必须重新拉取**历史列表与统计，不在前端数组里"就地删除"。

### 1.2 前端"字符归一化"与"计算"的区别

界面上的 `×`、`÷` 是给人看的显示字符，发送给后端前会被统一替换成 `*`、`/`：

| 界面显示 | 发送给后端 |
| --- | --- |
| `×` `✕` `＊` | `*` |
| `÷` `／` | `/` |
| `−` `–` `—` `－` | `-` |
| `（` `）` `＋` `．` | `(` `)` `+` `.` |
| `π` | `pi` |
| `√` | `sqrt` |
| 全角数字 `０`…`９` | `0`…`9` |

这只是**字符替换**（`app.js` 中的 `WIRE_NORMALIZATION_MAP` 与 `normalizeExpressionForApi`），
不涉及任何求值、优先级判断或结果推断。

---

## 2. 技术栈

| 层次 | 选型 | 说明 |
| --- | --- | --- |
| 结构 | HTML5 | 语义化标签（`header` / `main` / `section` / `article` / `nav` / `output`） |
| 样式 | 原生 CSS3 | CSS 变量实现明暗主题；Grid + Flexbox 布局；BEM 命名 |
| 脚本 | 原生 JavaScript (ES2019+) | **ES Module**（`<script type="module">`），无打包、无转译 |
| 网络 | `fetch` + `AbortController` | 统一超时控制与取消；统一错误归一化 |
| 存储 | `localStorage` | **仅**保存主题与界面偏好 |
| 依赖 | **无** | 无 npm、无 CDN、无框架、无第三方库 |

---

## 3. 运行环境

- 任意现代浏览器（Chrome / Edge / Firefox / Safari 近两年版本），需支持 ES Module、
  `fetch`、`AbortController`、可选链与 CSS 变量。
- 一个静态文件服务器（推荐 Python 3 自带的 `http.server`）。
  ⚠️ **必须通过 HTTP 访问，不能直接双击打开 `file://`**：
  浏览器的 ES Module 受同源策略限制，`file://` 下会被 CORS 拦截。
- 后端服务需同时运行在 `http://127.0.0.1:8000`（或在页面用 `?api=` 指定）。

---

## 4. 目录结构

```
832402204_calculator_frontend/
├── src/
│   ├── index.html          # 页面骨架，含全部 data-testid 自动化选择器
│   ├── css/
│   │   └── style.css       # 全部样式：主题变量、布局、组件、响应式
│   └── js/
│       ├── config.js       # API 基地址、超时、分页、localStorage 键与 URL 参数解析
│       ├── api.js          # fetch 封装：超时、JSON 编解码、统一错误归一化
│       ├── ui.js           # DOM 引用、渲染、主题、Toast、键盘与事件绑定
│       └── app.js          # 主流程编排 + window.calculatorApp 自动化接口
├── README.md               # 本文件
├── codestyle.md            # 代码规范（含正 / 反例）
└── .gitignore
```

模块依赖方向（单向，无循环依赖）：

```
index.html → app.js → { config.js, api.js, ui.js }
api.js     → config.js
```

---

## 5. 启动方法

### 5.1 启动后端（先启动）

按后端项目 `832402204_calculator_backend/README.md` 的说明启动，确认监听 `127.0.0.1:8000`：

```bash
# 浏览器或命令行验证后端可用
curl http://127.0.0.1:8000/api/health
```

### 5.2 启动前端静态服务器

在 **`832402204_calculator_frontend` 目录**下执行：

```bash
python -m http.server 5173 --directory src
```

### 5.3 访问页面

浏览器打开：

```
http://127.0.0.1:5173/
```

> 端口 `5173` 可自行更换；`--directory src` 让静态根目录直接指向 `src/`，
> 这样 `http://127.0.0.1:5173/` 就是 `src/index.html`。

---

## 6. 配置说明

### 6.1 `src/js/config.js`

| 常量 | 默认值 | 说明 |
| --- | --- | --- |
| `DEFAULT_API_BASE` | `http://127.0.0.1:8000/api` | **全项目唯一**写死后端地址的地方 |
| `REQUEST_TIMEOUT_MS` | `8000` | 单次请求超时（毫秒） |
| `PREVIEW_DEBOUNCE_MS` | `400` | 实时预览防抖（毫秒） |
| `SEARCH_DEBOUNCE_MS` | `300` | 历史搜索防抖（毫秒） |
| `DEFAULT_PAGE_SIZE` | `10` | 历史每页条数 |
| `STORAGE_KEY_THEME` | `theme` | 主题偏好存储键 |
| `STORAGE_KEY_UI_PREFS` | `calculator.ui-prefs` | 界面偏好存储键（不含历史数据） |

修改后端地址时**只改这一处**即可。

### 6.2 API 基地址解析优先级

程序启动时会按下面的优先级决定实际请求的 API 基地址：

| 优先级 | 来源 | 说明 |
| --- | --- | --- |
| 1 | URL 参数 `?api=...` | 最高优先级，适合临时切换到别的后端 |
| 2 | `window.__CALC_API_BASE__` | 由页面注入；同源部署时反向代理会在 `index.html` 里注入 `'/api'` |
| 3 | 自动推断 | 页面在本机打开（`localhost` / `127.0.0.1`）→ `http://127.0.0.1:8000/api`；<br>页面在其它主机名打开（局域网 IP、云服务器、隧道域名）→ 同源 `/api` |

第 3 条的意义：**公网部署时裸链接就能直接使用**，不需要在网址后面拼 `?api=` 参数。
前提是该域名下已经把 `/api` 反向代理到后端（见项目根目录的
`tools/serve_public.py`，或生产环境用 Nginx 做同样的转发）。

> 如果只发布了前端静态页面、没有同源代理，请用 `?api=http://<后端地址>/api` 显式指定。

### 6.3 URL 参数

| 参数 | 示例 | 作用 |
| --- | --- | --- |
| `api` | `?api=http://127.0.0.1:8001/api` | 覆盖 API 基地址；未以 `/api` 结尾时自动补上；也支持相对路径 `?api=/api` |
| `theme` | `?theme=dark` | 覆盖主题（`light` / `dark`），并写入 localStorage |
| `expr` | `?expr=1%2B2*3` | 预填表达式，并在页面加载后自动 `persist=true` 计算一次（写入历史） |

组合示例（用于演示与截图）：

```
http://127.0.0.1:5173/?theme=dark&expr=(1%2B2)*3
http://127.0.0.1:5173/?api=http://127.0.0.1:8001/api&expr=sqrt(9)
```

### 6.4 运行时可调用的自动化接口

页面加载后，`window.calculatorApp` 可用：

```js
window.calculatorApp.calculate('(1+2)*3')      // 调后端计算（默认 persist=true），返回后端响应体
window.calculatorApp.calculate('1/0', { persist: false })  // 只试算，不写历史
window.calculatorApp.refreshHistory()          // 重新查询历史（返回分页数据）
window.calculatorApp.refreshStatistics()       // 重新查询统计
window.calculatorApp.setTheme('dark')          // 切换主题并保存偏好
window.calculatorApp.getState()                // 读取当前状态快照（表达式、结果、主题、历史、统计…）
window.calculatorApp.checkHealth()             // 重新做健康检查
window.calculatorApp.setApiBase('http://127.0.0.1:8001/api')  // 运行时切换后端地址
```

调用 `calculate` **不会**在前端运算：它把表达式发到后端并渲染返回值，失败时返回 `null`
（错误信息同时出现在结果区与 Toast）。

---

## 7. 前后端连接方式

- 通信协议：HTTP，`Content-Type: application/json; charset=utf-8`。
- 统一响应外壳：

```jsonc
// 成功
{ "success": true, "data": {}, "message": "ok" }
// 失败
{ "success": false, "message": "错误描述", "error_code": "XXX" }
// /api/calculate 成功时是扁平结构（无 data 字段）
{ "success": true, "expression": "(1+2)*3", "result": 9, "display_result": "9", "record": {} }
```

- 前端使用的接口：

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 页面加载时健康检查，驱动顶部后端状态徽标 |
| `GET` | `/api/meta/functions` | 动态渲染科学面板按钮（失败则降级隐藏动态函数区） |
| `POST` | `/api/calculate` | 计算；`persist=false` 用于实时预览 |
| `GET` | `/api/history` | 历史分页 / 关键字 / 日期区间 / 仅收藏 / 排序 |
| `GET` | `/api/history/statistics` | 统计卡片 |
| `GET` | `/api/history/{id}` | 查询单条（`api.getHistoryItem`，供扩展使用） |
| `DELETE` | `/api/history/{id}` | 删除单条 |
| `DELETE` | `/api/history` | 清空全部 |
| `PATCH` | `/api/history/{id}/favorite` | 收藏 / 取消收藏 |

- **错误分级显示**（按后端 `error_code`）：
  - 黄色警示：`DIVISION_BY_ZERO`、`MATH_DOMAIN_ERROR`、`OVERFLOW_ERROR`
  - 红色错误：`EMPTY_EXPRESSION`、`EXPRESSION_TOO_LONG`、`INVALID_CHARACTER`、
    `INVALID_EXPRESSION`、`UNKNOWN_ERROR`，以及所有网络 / 超时 / HTTP 错误
- **连接失败处理**：`fetch` 抛错或超时（8 秒）时，前端提示
  「无法连接后端服务，请确认后端已启动」，并把顶部状态徽标置为「后端未连接」，
  **绝不**给出任何计算结果。

---

## 7.1 永久部署到 GitHub Pages

本项目是**零构建的纯静态站点**（`src/` 目录就是站点根目录），
因此可以直接免费、永久地发布到 GitHub Pages，不依赖任何人的电脑开机。

仓库里已经准备好工作流：`.github/workflows/deploy-pages.yml`。

**使用前在 GitHub 仓库里配置两项（各点几下）：**

| 位置 | 配置 |
| --- | --- |
| Settings → Secrets and variables → Actions → **Variables** | 新建变量 `CALC_API_BASE` = `https://<你的后端地址>/api` |
| Settings → **Pages** → Build and deployment → Source | 选择 **GitHub Actions** |

之后每次 push 到 `main` 分支（或在 Actions 页面手动 Run workflow），
就会自动发布到 `https://<用户名>.github.io/<仓库名>/`。

**工作流做了什么**：在构建时把

```html
<script>window.__CALC_API_BASE__ = 'https://<你的后端地址>/api';</script>
```

注入到 `src/index.html` 的 `</head>` 之前，因此**源码一行都不用改**——
本地开发依旧默认连 `127.0.0.1:8000`，线上则自动指向云端后端。
这正是第 6.2 节那条优先级规则（`?api=` > 注入值 > 自动推断）发挥作用的地方。

> 完整的端到端部署步骤（含后端与数据库）见项目根目录的
> `docs/永久部署指南.md`。

---

## 8. 与后端联调的验证步骤

按顺序执行，每步都有明确的预期结果：

1. **后端未启动时打开前端** → 顶部徽标显示「后端未连接」，右下角 Toast 提示
   「无法连接后端服务，请确认后端已启动」，结果区始终是 `—`（**没有任何计算结果**）。
2. 启动后端，刷新页面 → 徽标变为「后端已连接 · calculator-backend v1.0.0」。
3. 科学面板出现由 `/api/meta/functions` 渲染出的按钮（如 `√`、`π`、`e`），
   面板标题右侧提示「后端提供 N 个函数、M 个常量」。
4. 点击 `1` `+` `2` `×` `3` `=` → 结果区显示 `9`，表达式区显示 `1+2×3`，
   历史区立即出现该条记录，统计区计数 +1。
5. 点击 `÷` 后输入 `0` 再点 `=`（如 `1÷0`）→ 结果区出现**黄色**警示条并显示后端 message，
   Toast 同步提示，历史区不受影响。
6. 输入框键入 `abc` 后点 `=` → 结果区出现**红色**错误条，显示后端 `message`。
7. 输入框输入 `sqrt(9)`（或点击面板的 `√` 再输入 `9)`）→ 结果区出现淡色
   「预览：3」，此时历史区**不新增**记录（因为 `persist=false`）。
8. 点 `=` → 历史区新增记录。
9. 点历史条目的 `☆` → 变成 `★`，且**历史列表重新从后端拉取**；
   打开「仅看收藏」→ 只剩收藏项；分页信息随筛选更新。
10. 在关键字框输入 `2` → 列表按后端 `keyword` 参数过滤；
    设置起始 / 结束日期 → 列表按日期过滤。
11. 点某条历史的「删除」→ Toast 提示「已删除 #id」，列表与统计**重新查询**后刷新。
12. 点「清空全部」→ 第一次点击变成「再次点击确认清空」（5 秒内有效），
    第二次点击后后端清空，列表与统计刷新。
13. 点「复制结果」→ Toast 提示「已复制结果：…」；非 HTTPS / 剪贴板被拒时降级为
    「已选中结果文本，请按 Ctrl/Cmd + C 复制」。
14. 按 `Ctrl/Cmd + D` 或点右上角按钮切换主题 → 刷新页面后主题保持（localStorage）。
15. 访问 `http://127.0.0.1:5173/?expr=1%2B2*3` → 页面加载后自动计算一次并显示 `9`，
    历史区新增一条。
16. 访问 `http://127.0.0.1:5173/?api=http://127.0.0.1:8001/api` → 底部「当前 API 基地址」
    随之变化，请求发往新地址。

---

## 9. 功能清单

### 9.1 基础功能

- [x] 按键：`0`–`9`、`.`、`+`、`-`、`×`（发送 `*`）、`÷`（发送 `/`）、`(`、`)`、`=`、`C`、`⌫`
- [x] 表达式输入框可直接键盘输入；`=` 或 `Enter` 触发后端计算
- [x] 结果区展示后端 `display_result` 与本题原始 `expression`
- [x] 错误提示：结果区红色 / 黄色提示条 + Toast，均使用后端 `message`；**历史区不受影响**
- [x] 历史列表：默认每页 10 条，显示 ID / 表达式 / 结果 / 时间 / 收藏状态
- [x] 每条历史有「删除」按钮；有「清空全部」按钮；点击历史条目回填表达式
- [x] 页面加载自动 `GET /api/history` 与 `GET /api/history/statistics`
- [x] 后端不可用时明确提示，且不给任何计算结果

### 9.2 扩展功能

- [x] **科学计算面板**：按钮由 `/api/meta/functions` 动态生成，点击插入 `sqrt(` 这类片段；
      含 `π`、`e`（来自 constants）与 `^`、`!`、`%`；元数据接口失败时降级隐藏动态函数区
- [x] **实时预览**：输入变化 400ms 防抖后 `POST /api/calculate` 且 `persist=false`，
      结果区淡色显示；失败静默（不显示错误、不弹 Toast）；只有 `=` 才 `persist=true` 并刷新历史
- [x] **历史检索与分页**：关键字 / 起始日期 / 结束日期 / 仅看收藏 / 上一页 / 下一页 / 页码信息
- [x] **收藏**：`☆`/`★` 按钮调用 `PATCH /api/history/{id}/favorite`，之后重新查询
- [x] **统计卡片**：总数、今日、收藏数、最常用运算符、运算符分布、首次 / 最近计算时间
- [x] **主题切换**：明 / 暗主题，偏好写 localStorage，刷新后保持
- [x] **键盘快捷键**：`Enter` 计算、`Esc` 清空、`Backspace` 退格、数字 / 运算符直接输入、
      `Ctrl/Cmd + D` 切换主题
- [x] **复制结果**：`navigator.clipboard`，失败降级为选中文本 + 提示
- [x] **URL 参数演示**：`?expr=` 预填并自动计算、`?api=` 覆盖基地址、`?theme=` 指定主题

### 9.3 界面与工程

- [x] 中文界面，清晰区分「输入区 / 结果区 / 科学面板 / 历史区 / 统计区」
- [x] 响应式：宽度 ≥1100px 左右两栏（左计算器 / 右统计 + 历史），窄屏单列堆叠
- [x] 顶部标题「前后端分离计算器 · 832402204 陈俊洁」
- [x] 无外部字体 / CDN 依赖，离线可用
- [x] 所有 `fetch` 都有 `try/catch` 与 8 秒超时（`AbortController`）
- [x] 统一 `data-testid` 选择器，便于自动化截图与端到端脚本
- [x] `window.calculatorApp` 暴露编排接口

---

## 10. 自动化测试选择器（`data-testid`）

| 区域 | `data-testid` |
| --- | --- |
| 显示区 | `display-expression`、`display-result`、`display-preview`、`display-error` |
| 按键 | `key-0`…`key-9`、`key-dot`、`key-plus`、`key-minus`、`key-multiply`、`key-divide`、`key-lparen`、`key-rparen`、`key-equals`、`key-clear`、`key-backspace`、`key-percent`、`key-power`、`key-factorial` |
| 输入框 | `expression-input` |
| 科学面板 | `sci-panel`（容器）、`sci-fn-list`（动态按钮容器）、`sci-panel-hint`；动态按钮 `fn-<name>`（如 `fn-sqrt`、`fn-pi`、`fn-e`） |
| 历史 | `history-list`、`history-item`（含 `data-id`）、`history-delete`、`history-favorite`、`history-search`、`history-clear-all`、`history-page-prev`、`history-page-next`、`history-page-info`、`history-favorite-only`、`history-start-date`、`history-end-date` |
| 统计 | `statistics`、`stat-total`、`stat-today`、`stat-favorite`、`stat-operator` |
| 其它 | `theme-toggle`、`copy-result`、`toast`（容器）、`toast-item`（单条）、`backend-status` |

补充（非必需但可用）：`keypad`、`history-empty`、`history-error`、`statistics-message`、
`stat-first-time`、`stat-last-time`、`stat-distribution`、`api-base`、`sci-panel-note`。

---

## 11. 常见问题（FAQ）

**Q1：页面右上角一直显示「后端未连接」。**
A1：依次检查：① 后端是否已启动并监听 `127.0.0.1:8000`；
② `curl http://127.0.0.1:8000/api/health` 是否返回 `{"success":true,...}`；
③ 后端是否开启 CORS；④ 如果后端换了端口，用 `?api=http://127.0.0.1:新端口/api` 打开页面。

**Q2：打开页面一片空白 / 控制台报 CORS 或 MIME 错误。**
A2：多半是直接双击用 `file://` 打开了 HTML。ES Module 必须通过 HTTP 加载，
请使用 `python -m http.server 5173 --directory src`。

**Q3：为什么输入框里显示 `×`，但网络请求里是 `*`？**
A3：`×`、`÷` 是中文界面习惯写法，发送前由 `normalizeExpressionForApi` 统一替换为
`*`、`/`（纯字符替换，不是计算），以保证与后端契约一致。

**Q4：预览的数字和按 `=` 的结果不一致？**
A4：两者都来自后端同一接口。预览使用 `persist=false`（不写历史），
`=` 使用 `persist=true`（写历史）。若不一致，通常是两次请求之间表达式已被修改。

**Q5：科学面板里的函数按钮没有出现。**
A5：说明 `GET /api/meta/functions` 失败或返回空。此时面板会降级：
标题提示「科学函数不可用（原因）」，动态函数区隐藏，固定的 `^`、`!`、`%` 仍可使用。

**Q6：历史数据为什么刷新后就"没了"？**
A6：历史只存在于后端数据库，前端**不会**缓存。若刷新后为空，请检查后端
`GET /api/history` 是否正常工作、是否被后端按日期或关键字过滤。

**Q7：点「清空全部」没有立即删除。**
A7：这是刻意的二次确认设计：第一次点击按钮变为「再次点击确认清空」（5 秒内有效），
第二次点击才真正调用 `DELETE /api/history`。这样避免了阻塞式 `window.confirm`
打断自动化截图脚本。

**Q8：复制结果提示失败。**
A8：`navigator.clipboard` 只在安全上下文（HTTPS 或 `localhost` / `127.0.0.1`）可用。
降级方案会自动选中结果文本，按 `Ctrl/Cmd + C` 即可。

**Q9：`Enter` 在搜索框里也会触发计算吗？**
A9：不会。`Enter` 只在表达式输入框或页面非输入区域触发计算；
在其他输入控件（如关键字搜索框）中保持浏览器原生行为。

**Q10：如何确认前端真的没有计算？**
A10：可用浏览器 DevTools 断网（Network → Offline）后点击 `=`：
不会出现任何结果，只会提示「无法连接后端服务」。另外全文检索
`eval` / `Function` / `setTimeout("` 均无命中。

---

## 12. 代码规范

命名、注释、ES Module、错误处理、CSS（BEM）、提交信息等规范详见
[codestyle.md](./codestyle.md)。规范来源：Google JavaScript Style Guide、
Airbnb JavaScript Style Guide、MDN / WHATWG HTML & CSS 约定，以及本项目补充约定。

---

## 13. 自检记录

### 13.1 静态检查（可直接复现）

```bash
# 1) 每个 JS 文件做 ES Module 语法检查
node --input-type=module --check < src/js/config.js
node --input-type=module --check < src/js/api.js
node --input-type=module --check < src/js/ui.js
node --input-type=module --check < src/js/app.js

# 2) 确认 HTML 引用的资源与模块 import 路径都存在
#    src/index.html -> ./css/style.css, ./js/app.js
#    app.js -> ./config.js, ./api.js, ./ui.js
```

结果：4 个 JS 文件全部通过；HTML 引用的 `css/style.css`、`js/app.js` 存在；
`app.js` 的三个 `import` 路径全部命中；`api.js`、`ui.js` 的跨模块调用与 `refs` 键
交叉引用无悬空引用。

### 13.2 红线审计

| 检查项 | 结果 |
| --- | --- |
| `eval(` / `new Function(` / `setTimeout("…")` | 0 命中 |
| `Math.` / `parseFloat(` / `parseInt(` | 0 命中（前端不参与任何数值计算） |
| 自研表达式求值（词法 / 优先级 / 中缀转后缀） | 不存在 |
| `127.0.0.1:8000` 出现位置 | 仅 `config.js`（1 处常量 + 2 处 JSDoc 示例） |
| localStorage 键 | 仅 `theme` 与 `calculator.ui-prefs`，不含历史数据 |
| 每个 `fetch` 的超时与 `try/catch` | 统一在 `api.js::request` 中实现（8 秒超时） |
| `data-testid` 契约 | 51 个必需选择器全部存在，动态按钮模板 `fn-<name>` 存在 |

### 13.3 运行时行为验证（DOM 垫片 + 桩后端，一次性调试用，未随项目交付）

用一份临时的 DOM 垫片真实加载 `src/js/app.js`，并以桩后端（按契约返回 JSON）
跑通启动、按键、计算、预览、错误分级、历史增删改查、统计、主题、URL 参数等流程，
共 6 组、414 项断言全部通过：

| 场景 | 断言数 | 结果 |
| --- | --- | --- |
| 默认参数 | 77 | 全部通过 |
| `?theme=dark&expr=1%2B2*3`（预填 + 自动计算 + 主题） | 82 | 全部通过 |
| `?api=192.168.1.5:9001`（自动补协议与 `/api`） | 79 | 全部通过 |
| `?api=http://example.test:9001/api`（不重复拼接 `/api`） | 79 | 全部通过 |
| `?api=http://127.0.0.1:9001` | 79 | 全部通过 |
| **后端离线**（`fetch` 抛网络错误） | 18 | 全部通过 |

其中离线专项断言覆盖了最重要的红线行为：提示「无法连接后端服务，请确认后端已启动」、
科学面板降级、历史/统计区显示错误、`calculate` 返回 `null`，
且结果区始终保持 `—`——**不会出现任何前端算出的数值**。

### 13.4 真实后端联调（后端运行在 `127.0.0.1:8000` 时执行）

| 验证对象 | 断言数 | 结果 |
| --- | --- | --- |
| `api.js` 对真实接口的解析（health / meta / calculate / history / statistics / 单条 / 收藏 / 删除 / 404 / 错误码 / 网络错误） | 60 | 全部通过 |
| `app.js` 端到端（真实 `/api/calculate`、实时预览、错误分级、历史与统计渲染、`fn-*` 动态按钮） | 22 | 全部通过 |

联调中确认了以下真实响应特征，并据此加固了前端（详见 `api.js::request` 注释）：

- `POST /api/calculate` 成功响应是**扁平结构**（不含 `data` 包装），
  字段为 `success / expression / raw_expression / result / display_result / record / message`。
  为了兼容不同后端实现，前端的通用解包规则是：`data` 缺失或为 `null` 时返回整个响应体。
- 计算失败的响应会回带 `expression`（原始输入），并可能带 `position`（出错字符下标）；
  前端优先使用后端回带的表达式，缺失时才回退到本地输入值。
- 真实 `error_code` 覆盖 `DIVISION_BY_ZERO`、`MATH_DOMAIN_ERROR`、`OVERFLOW_ERROR`
  （黄色警示）与 `EMPTY_EXPRESSION`、`INVALID_EXPRESSION`、`RECORD_NOT_FOUND`（红色错误），
  与前端分级逻辑一致。
- `GET /api/meta/functions` 返回 24 个函数与 2 个常量（`pi`、`e`），
  `usage` 形如 `"sqrt("`，前端据此生成 `fn-sqrt`、`fn-pi` 等按钮。

---

## 14. 相关仓库

| 内容 | 地址 |
| --- | --- |
| 前端仓库 | <https://github.com/Chen-803/832402204_calculator_frontend> |
| 后端仓库 | <https://github.com/Chen-803/832402204_calculator_backend> |
| 前端代码规范 | <https://github.com/Chen-803/832402204_calculator_frontend/blob/main/codestyle.md> |
| 后端代码规范 | <https://github.com/Chen-803/832402204_calculator_backend/blob/main/codestyle.md> |

---

© 2026 陈俊洁 832402204 · 本项目仅用于课程作业演示。
