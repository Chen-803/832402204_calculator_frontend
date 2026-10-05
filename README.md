# 前后端分离计算器系统 · 前端

> 学号 **832402204** · 陈俊洁
> 前端仓库：`832402204_calculator_frontend`（后端仓库：`832402204_calculator_backend`，接口契约：`docs/API_CONTRACT.md`）

## 🔗 在线演示地址（打开即可使用，无需安装环境）

**https://london-click-extended-lewis.trycloudflare.com**

对应的后端接口文档：https://asset-mountains-roger-handbags.trycloudflare.com/docs

> 该地址通过 Cloudflare 快速隧道把本机正在运行的前后端映射到公网，**需要本机保持开机联网**；
> 隧道域名是临时的，重启后会变化。若失效，请按 README「常见问题」在本机 `npm run dev` 运行。

## 目录

- [一、项目简介](#一项目简介)
- [二、技术栈](#二技术栈)
- [三、运行环境](#三运行环境)
- [四、快速开始](#四快速开始)
- [五、配置说明](#五配置说明)
- [六、前后端连接方式](#六前后端连接方式)
- [七、目录结构](#七目录结构)
- [八、功能清单](#八功能清单)
- [九、使用说明](#九使用说明)
- [十、给自动化脚本的钩子](#十给自动化脚本的钩子)
- [十一、常见问题（FAQ）](#十一常见问题faq)
- [十二、开发规范](#十二开发规范)
- [十三、作者](#十三作者)

---

## 一、项目简介

本项目是「软件工程」课程作业——**前后端分离计算器系统**的**前端部分**。前端负责界面呈现与交互，后端负责全部业务计算与数据存储，两者通过 HTTP + JSON 通信。

### 核心设计红线（作业硬性要求）

> **最终计算结果必须由后端产生并返回前端。**

因此前端**只做**下面这些事情：

1. 界面呈现（显示屏、键盘、历史、统计、转换面板）；
2. 按键交互（点击 / 键盘快捷键）；
3. **表达式字符串拼接**（把 `sin(`、`7`、`+` 等符号按顺序拼成一个字符串）；
4. 发 HTTP 请求（`fetch`）；
5. 展示后端返回的 `resultText`；
6. 展示历史列表、发删除 / 收藏 / 清空请求；
7. 展示后端返回的错误 `message`。

前端**绝对不做**：

- ❌ 不使用 `eval` / `new Function` / 字符串定时器执行；
- ❌ 不自己写四则运算解析器（词法 / 语法 / AST / 求值一概没有）；
- ❌ 不引入 `mathjs`、`decimal.js` 等任何计算库；
- ❌ 不做进制换算、单位换算（这些同样调用后端接口）。

唯一允许的本地数值处理是**展示层格式化**，且代码中均有注释说明：

| 位置 | 内容 | 说明 |
| --- | --- | --- |
| `src/components/CalculatorPanel.vue` | `±` 键 | 仅在表达式字符串首部增删 `-`，不做数值运算 |
| `src/components/StatsPanel.vue` | `toPercent()` | 把后端返回的计数换算成柱状图高度 / 分布条宽度百分比 |
| `src/components/StatsPanel.vue` | `shortDate()` | 把 `2026-10-05` 截断成 `10-05` 用于横轴标签 |
| `src/components/ConverterPanel.vue` | `Number(value)` | 仅把用户输入的字符串转成 JSON 数字后再发给后端 |

## 二、技术栈

| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | **Vue 3**（`<script setup>` 组合式 API） | 未使用 Options API、未使用 mixins |
| 构建 | **Vite 6** + `@vitejs/plugin-vue` | `npm run dev` / `build` / `preview` |
| 语言 | **纯 JavaScript（ES2020+）** | 未使用 TypeScript |
| HTTP | **原生 `fetch`** 自行封装 | 见 `src/api/http.js`，未使用 axios |
| 状态管理 | `src/composables/` 组合式函数（模块级单例） | 未使用 Pinia / Vuex |
| 样式 | **手写 CSS**（CSS 变量 + BEM） | 未使用任何 UI 组件库（无 Element Plus / Ant Design / Tailwind），图表用纯 CSS 绘制 |
| 依赖数量 | **仅 3 个**：`vue`、`vite`、`@vitejs/plugin-vue` | `dependencies` 只有 `vue` |

## 三、运行环境

| 项目 | 要求 |
| --- | --- |
| Node.js | `^18.0.0 \|\| ^20.0.0 \|\| >=22.0.0`（Vite 6 要求）；本机实测 **v24.16.0** |
| npm | 随 Node 安装；本机实测 **11.13.0** |
| 浏览器 | Chrome / Edge / Firefox / Safari 等现代浏览器（使用 ES Module、`fetch`、CSS 变量） |
| 后端 | 需先启动在 `http://127.0.0.1:8000`（否则界面提示「无法连接后端服务」） |
| 操作系统 | Windows / macOS / Linux 均可 |

> **Windows 提示**：若 PowerShell 因执行策略禁止运行 `npm.ps1`（报 `无法加载文件 ...npm.ps1，因为在此系统上禁止运行脚本`），请改用：
> ```bat
> cmd /c "npm install"
> cmd /c "npm run build"
> ```

## 四、快速开始

```bash
# 1. 进入前端目录
cd 832402204_calculator_frontend

# 2. 安装依赖（只有 3 个：vue / vite / @vitejs/plugin-vue）
npm install

# 3. 启动开发服务器（默认 http://localhost:5173，支持热更新）
npm run dev

# 4. 生产构建（产物在 dist/）
npm run build

# 5. 本地预览构建产物（默认 http://localhost:4173）
npm run preview
```

| 脚本 | 命令 | 作用 |
| --- | --- | --- |
| `npm run dev` | `vite` | 启动开发服务器，默认 `http://localhost:5173` |
| `npm run build` | `vite build` | 生产构建，产物输出到 `dist/` |
| `npm run preview` | `vite preview` | 本地静态预览 `dist/`，默认 `http://localhost:4173` |

> 请先启动后端，再打开前端页面，这样顶栏会显示绿点「后端已连接」。
> 后端已按契约开启 CORS（允许 `http://localhost:5173` 访问），因此**不需要**配置代理。

## 五、配置说明

前端唯一的环境变量是 **`VITE_API_BASE_URL`**（后端基地址）。

- 文件：`.env.development`（已在仓库中）
  ```ini
  VITE_API_BASE_URL=http://127.0.0.1:8000
  ```
- `src/api/http.js` 中的读取方式（带兜底，未配置时也能跑）：
  ```js
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
  ```

### 想连别的后端地址？

| 场景 | 做法 |
| --- | --- |
| 只在本机改，且不想提交 | 新建 `.env.local`，写入 `VITE_API_BASE_URL=http://192.168.1.10:8000`（`.env.local` 已被 `.gitignore` 忽略，且优先级高于 `.env.development`） |
| 修改生产构建使用的地址 | 新建 `.env.production` 写入同样的内容 |
| 临时验证 | `set VITE_API_BASE_URL=http://127.0.0.1:9000 && npm run dev`（Windows CMD） |

> ⚠️ Vite 的环境变量是**构建期注入**的：改完 `.env.*` 必须**重启 `npm run dev`** 或**重新 `npm run build`** 才会生效。
> ⚠️ `npm run build`（production 模式）**不会**读取 `.env.development`，此时走代码里的兜底值 `http://127.0.0.1:8000`；要改生产构建地址请用 `.env.production` 或 `.env.local`。

## 六、前后端连接方式

### 6.1 统一响应信封

后端所有接口（含错误）都返回**扁平信封**，业务字段直接平铺在顶层：

```json
{ "success": true, "code": 0, "message": "OK", "...业务字段": "..." }
```

前端判定规则（实现见 `src/api/http.js`）：

1. **以 `success` 为准**：`success === false` 时抛出 `ApiError`，`message` 原样使用后端文案；
2. 同时结合 HTTP 状态码：非 2xx 且信封里没有 message 时才使用兜底文案；
3. 只有**传输层失败**（`fetch` 抛错 / 超时）才使用前端约定文案：
   - `无法连接后端服务（http://127.0.0.1:8000），请确认后端已启动后重试`
   - `请求超时：后端服务在 15000 毫秒内未响应`

### 6.2 前端调用的接口一览

| 方法 | 路径 | 用途 | 前端调用位置 | 对应功能 |
| --- | --- | --- | --- | --- |
| POST | `/api/calculate` | 表达式计算（核心） | `src/api/calculator.js` → `useCalculator.calculate()` | 3、8 |
| GET | `/api/history` | 查询历史（`keyword`/`page`/`pageSize`/`onlyFavorite`/`order`） | `src/api/history.js` → `useHistory.load()` | 5、9、10 |
| DELETE | `/api/history/{id}` | 删除指定历史 | `useHistory.removeItem()` | 5 |
| DELETE | `/api/history` | 清空全部历史 | `useHistory.clearAll()` | 11 |
| PATCH | `/api/history/{id}/favorite` | 切换收藏（`{favorite:true}`） | `useHistory.toggleFavorite()` | 10 |
| GET | `/api/stats` | 计算统计 | `src/api/calculator.js` → `StatsPanel.loadStats()` | 12 |
| POST | `/api/convert/base` | 进制转换 | `src/api/convert.js` → `ConverterPanel.runBaseConvert()` | 13 |
| GET | `/api/convert/units` | 单位类别与单位定义 | `ConverterPanel.loadUnits()` | 14 |
| POST | `/api/convert/unit` | 单位换算 | `ConverterPanel.runUnitConvert()` | 14 |
| GET | `/api/health` | 健康检查（顶栏指示灯，每 20 秒轮询一次，也可点击手动重检） | `src/api/calculator.js` → `useCalculator.checkBackend()` | 7 |

### 6.3 常见错误码与界面表现

| code | HTTP | 界面表现 |
| --- | --- | --- |
| `40001` | 400 | 显示屏下方红色错误条显示「表达式为空」 |
| `40002` | 400 | 显示「表达式语法错误：…」（后端文案） |
| `40003` | 400 | 显示「除数不能为 0」 |
| `40004` | 400 | 显示「表达式过长，最多支持 500 个字符」 |
| `40005` | 400 | 显示「不支持的函数：foo」 |
| `40006` | 400 | 显示「函数定义域错误：…」 |
| `40007` | 400 | 进制面板下方显示「进制转换参数不合法」 |
| `40008` | 400 | 单位面板下方显示「不支持的单位类别」 |
| `40401` | 404 | 轻提示（toast）显示「历史记录不存在：id=99」 |
| `42201` | 422 | 显示「请求参数不合法：…」 |
| `50000` | 500 | 显示「服务器内部错误」 |

> 所有错误文案都直接来自后端 `message`，前端不自行编造业务错误文案。

## 七、目录结构

```
832402204_calculator_frontend/
├── index.html                  # HTML 入口（含首屏主题预置脚本，避免暗色主题闪白）
├── package.json                # 依赖与脚本（dev / build / preview）
├── vite.config.js              # Vite 配置：vue 插件、@ -> src 别名、开发端口 5173
├── .env.development            # 开发环境变量 VITE_API_BASE_URL
├── .gitignore                  # 忽略 node_modules / dist / .env.local 等
├── README.md                   # 本文档
├── codestyle.md                # 代码规范（含规范来源与正反例）
├── public/                     # 静态资源目录（直接拷贝到 dist 根目录）
└── src/
    ├── main.js                 # 应用入口：挂载 App、引入全局样式、初始化主题
    ├── App.vue                 # 页面骨架：顶栏 + 左计算器 + 右侧标签面板 + 页脚 + 轻提示
    ├── api/
    │   ├── http.js             # fetch 封装：基地址、超时、统一解包信封、错误归一化（ApiError）
    │   ├── calculator.js       # POST /api/calculate、GET /api/stats、GET /api/health
    │   ├── history.js          # GET/DELETE /api/history、DELETE /api/history/{id}、PATCH 收藏
    │   └── convert.js          # POST /api/convert/base、GET /api/convert/units、POST /api/convert/unit
    ├── components/
    │   ├── AppHeader.vue       # 标题、副标题、后端连接状态指示灯、主题切换按钮
    │   ├── CalculatorPanel.vue # 显示屏 + 表达式输入框 + 键盘 + 角度制切换
    │   ├── DisplayScreen.vue   # 表达式回显、后端结果、复制按钮、红色错误条
    │   ├── KeypadButton.vue    # 单个按键（数字/运算符/功能/等号/科学 五种样式）
    │   ├── SciencePanel.vue    # 科学计算函数按钮（只往表达式追加符号）
    │   ├── HistoryPanel.vue    # 历史：搜索、分页、只看收藏、排序、删除、清空（二次确认）、回填
    │   ├── HistoryItem.vue     # 单条历史（id / 表达式 / 结果 / 时间 / 收藏 / 删除）
    │   ├── ConverterPanel.vue  # 进制转换 + 单位换算（两个子标签页）
    │   ├── StatsPanel.vue      # 统计卡片 + 纯 CSS 近七日柱状图 + 运算符分布
    │   └── ToastMessage.vue    # 轻提示队列
    ├── composables/
    │   ├── useCalculator.js    # 表达式 / 结果 / 错误 / 角度制状态，调后端计算，后端健康检查
    │   ├── useHistory.js       # 历史加载、搜索、分页、排序、收藏筛选、删除、清空、变更通知
    │   ├── useTheme.js         # 亮 / 暗主题，localStorage 记忆偏好，默认跟随系统
    │   ├── useToast.js         # 轻提示队列（相同文案只刷新计时器）
    │   └── useKeyboard.js      # 键盘快捷键绑定
    ├── utils/
    │   └── clipboard.js        # 复制到剪贴板（navigator.clipboard + execCommand 兜底）
    └── styles/
        ├── main.css            # 全局样式、CSS 变量、亮/暗主题变量、布局、通用组件
        └── calculator.css      # 计算器与各扩展面板专属样式
```

## 八、功能清单

### 基础功能（作业必做）

| # | 功能 | 实现位置 | 说明 |
| --- | --- | --- | --- |
| 1 | 数字键 0-9、小数点、`+` `-` `×` `÷`、`(` `)`、`=`、退格、清空 | `CalculatorPanel.vue` | 键盘按键 + `±` 键；`C` 清空、`⌫` 退格 |
| 2 | 显示屏：上行表达式（`×` `÷` 显示为符号），下行后端返回结果 | `DisplayScreen.vue` | 上行 `data-testid="display-expression"`，下行 `data-testid="display-result"` |
| 3 | 点击 `=` 调 `POST /api/calculate` 并展示后端 `resultText` | `useCalculator.calculate()` | 请求体 `{ expression, angleMode }` |
| 4 | 计算成功后自动刷新历史列表 | `useCalculator.calculate()` → `useHistory.notifyDataChanged()` | 同时通知统计面板刷新 |
| 5 | 历史展示 id/表达式/结果/时间；删除后**重新拉取** | `HistoryPanel.vue`、`HistoryItem.vue`、`useHistory.removeItem()` | 删除成功后调用 `load()` 重新请求后端，而不是只改本地数组 |
| 6 | 后端 `success:false` 时显著展示后端 `message` | `DisplayScreen.vue`（红色错误条）、`useHistory`（toast） | 不加工、不改写后端文案 |
| 7 | 连不上后端时明确提示 | `http.js` 的 `ApiError(network)`、`AppHeader.vue` 指示灯 | 显示「无法连接后端服务」，指示灯变红，可点击重检 |

### 扩展功能（加分项）

| # | 功能 | 实现位置 | 说明 |
| --- | --- | --- | --- |
| 8 | 科学计算 + DEG/RAD 角度制切换 | `SciencePanel.vue`、`CalculatorPanel.vue` | `sin cos tan asin acos atan sinh cosh tanh ln log log2 lg exp sqrt cbrt abs floor ceil round sign pow max min fact π e ! % mod ^`；按钮只追加符号，计算交给后端；`π` 按钮追加后端支持的常量 `pi`；角度制按钮 `data-testid="angle-mode"`，点击在 DEG/RAD 间切换，随请求发送 |
| 9 | 历史搜索关键字 + 分页 | `HistoryPanel.vue` | 搜索框 300ms 防抖；调后端 `keyword`/`page`/`pageSize`；上一页 / 下一页 / 页码信息；每页 10/20/50 可选 |
| 10 | 只看收藏 + ☆ 切换收藏 | `HistoryPanel.vue`、`HistoryItem.vue` | 复选框调 `onlyFavorite`；`PATCH /api/history/{id}/favorite` |
| 11 | 清空全部历史（二次确认） | `HistoryPanel.vue` | 弹层二次确认后调 `DELETE /api/history` |
| 12 | 统计面板 + 纯 CSS 近七日柱状图 | `StatsPanel.vue` | `GET /api/stats`：累计 / 今日 / 收藏数、近七日柱状图、运算符分布条、高频表达式；无任何图表库 |
| 13 | 进制转换面板 | `ConverterPanel.vue` | 2/8/10/16 快捷按钮 + 2..36 全量下拉，`POST /api/convert/base`，另显示后端返回的十进制值 |
| 14 | 单位换算面板 | `ConverterPanel.vue` | 类别下拉（长度/质量/温度/面积/时间/速度/数据存储，来自 `GET /api/convert/units`）、源/目标单位、⇄ 交换，`POST /api/convert/unit` |
| 15 | 键盘快捷键 | `useKeyboard.js` | `0-9 . + - * / ( ) ^ ! %`、`Enter` 计算、`Backspace` 退格、`Esc` 清空、`Ctrl+H` 显示/隐藏历史、`P` 输入 π；在输入框内打字不拦截字符键 |
| 16 | 主题切换（记住偏好） | `useTheme.js` | localStorage key `calc-theme`；从未手动切换过时跟随系统并实时响应系统变化 |
| 17 | 点击历史条目回填表达式 | `HistoryPanel.onUse()` | 只回填输入框，需用户再点 `=` 才计算 |
| 18 | 复制结果到剪贴板 + toast | `CalculatorPanel.onCopyResult()`、`utils/clipboard.js` | 复制后端 `resultText` 原文，成功/失败都有轻提示 |

## 九、使用说明

### 9.1 快捷键

| 按键 | 作用 |
| --- | --- |
| `0`-`9`、`.` | 输入数字与小数点 |
| `+` `-` `*` `/` | 输入运算符（`*` → `×`，`/` → `÷`） |
| `(` `)` `^` `!` `%` | 输入括号与后缀运算符 |
| `P` | 输入常量 `pi`（π） |
| `Enter` | 计算结果（调用后端） |
| `Backspace` | 退格 |
| `Esc` | 清空表达式与结果 |
| `Ctrl + H` | 显示 / 隐藏历史面板（切回上一次查看的面板） |

### 9.2 界面布局

- **左侧**：计算器面板 —— 右上角是角度制切换（`角度制 DEG`，点击切换为 `RAD`），下方是显示屏、表达式输入框、键盘。
- **右侧**：四个标签页 —— **科学计算** / **历史记录**（默认打开）/ **统计** / **转换**。统计与转换面板同样只展示后端返回的数据与换算结果。
- **窄屏（< 900px）**：自动改为单栏堆叠，键盘与面板依旧可用。

### 9.3 典型流程

1. 启动后端 → 打开页面 → 顶栏显示绿点「后端已连接」；
2. 点击按键或直接输入 `(1+2)*3` → 点 `=`（或按 Enter）→ 下行显示后端返回的 `9`，并显示后端耗时与历史记录 ID；
3. 右侧历史面板自动刷新，出现刚计算的记录；
4. 点历史条目的文字可把表达式回填到输入框；点 ☆ 收藏；点「删除」删除该条；点「清空全部」需二次确认；
5. 输入 `1/0` 再点 `=` → 红色错误条显示后端返回的「除数不能为 0」。

## 十、给自动化脚本的钩子

主要 DOM 元素都带有稳定的 `data-testid`，可直接用于 Playwright / Selenium 等自动化脚本：

| 用途 | `data-testid` |
| --- | --- |
| 表达式输入框（`<input>`） | `expression-input` |
| 显示屏表达式 / 结果 | `display-expression`、`display-result` |
| 主要按键 | `btn-equals`、`btn-clear`、`btn-backspace`、`btn-calculate`、`btn-copy`、`btn-sign` |
| 数字与运算符 | `key-0`…`key-9`、`key-dot`、`key-add`、`key-sub`、`key-mul`、`key-div`、`key-lparen`、`key-rparen` |
| 角度制切换 | `angle-mode` |
| 历史面板 | `history-list`、`history-item`、`history-delete`、`history-favorite`、`history-search`、`history-page-info`、`history-next`、`history-prev`、`history-clear-all`、`history-only-favorite` |
| 清空二次确认 | `clear-confirm`、`clear-confirm-ok`、`clear-confirm-cancel` |
| 轻提示 / 错误条 | `toast`、`error-banner` |
| 顶栏 | `theme-toggle`、`conn-status` |
| 统计面板 | `stats-total`、`stats-today`、`stats-favorite`、`stats-chart`、`stats-operators` |
| 转换面板 | `base-convert-input`、`base-convert-output`、`unit-convert-output`、`unit-category`、`unit-from`、`unit-to`、`unit-swap` |
| 标签页 | `tab-science`、`tab-history`、`tab-stats`、`tab-convert` |

脚本注意事项：

1. 右侧面板通过标签页切换，**默认打开「历史记录」**；科学计算面板在 `tab-science` 标签下（`v-show` 切换，未激活的面板不显示但存在于 DOM 中）。
2. 角度制切换是计算器面板右上角的**单个按钮**（`angle-mode`），点击在 `DEG` / `RAD` 之间切换。
3. 历史条目、收藏按钮、删除按钮都是**多条重复**的 testid，请用 `.first()` / `.nth(i)` 或按文本定位。
4. 轻提示 `toast` 2.4 秒后自动消失，截图请在触发后立即进行。

## 十一、常见问题（FAQ）

**Q1：页面顶栏显示红点「无法连接后端服务」怎么办？**
A：说明 `fetch` 没能连上后端。依次检查：① 后端是否已启动；② 后端是否监听 `127.0.0.1:8000`（用浏览器打开 `http://127.0.0.1:8000/api/health` 应返回 JSON）；③ 前端配置的 `VITE_API_BASE_URL` 是否与后端一致；④ 防火墙 / 代理是否拦截。修正后点一下顶栏的状态胶囊即可重新检测（也会每 20 秒自动检测一次）。

**Q2：浏览器控制台报 CORS 错误怎么办？**
A：按契约后端需开启 CORS 并允许 `http://localhost:5173`。若后端暂时没开，可在 `vite.config.js` 里启用注释掉的 `server.proxy`（把 `/api` 代理到 `http://127.0.0.1:8000`），并把 `VITE_API_BASE_URL` 设为空串走同源请求。

**Q3：端口被占用（5173 / 4173 / 8000）？**
A：开发端口可在 `vite.config.js` 的 `server.port` 修改（`strictPort: false` 时 Vite 会自动换端口，请以终端输出的地址为准）；预览端口改 `preview.port`。后端端口由后端自己配置，改完记得同步 `VITE_API_BASE_URL`。

**Q4：Windows 下 `npm install` 报「禁止运行脚本」？**
A：PowerShell 执行策略禁止了 `npm.ps1`。改用 `cmd /c "npm install"`，或执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

**Q5：改了 `VITE_API_BASE_URL` 不生效？**
A：环境变量在**构建期**注入。改完必须重启 `npm run dev` 或重新 `npm run build`；另外注意 `npm run build` 读取的是 `.env.production` / `.env.local`，不读 `.env.development`。

**Q6：点了 `=` 出现「表达式为空」「除数不能为 0」等红色提示，是前端算错了吗？**
A：不是。这些文案都是后端返回的 `message`（错误码 `40001`~`40009`），前端只是原样展示。表达式为空时前端也会照常请求后端，由后端判定，这是本作业「零计算」的刻意设计。

**Q7：历史列表一直是「暂无历史记录」？**
A：① 后端连上了吗（看顶栏）；② 表里确实还没有数据，先成功计算一次；③ 是否开了「只看收藏」或填了搜索关键字，清空筛选再试；④ 点「重试」按钮重新拉取。

**Q8：统计面板数字不更新？**
A：统计面板在「切到该标签页」「计算 / 删除 / 收藏之后」会自动刷新，也可以点右上角「刷新」按钮手动刷新。

**Q9：`dist/` 用浏览器双击直接打开（`file://`）没反应？**
A：构建产物是 ES Module + 跨域请求后端，`file://` 协议下会被浏览器拦截。请用 `npm run preview`，或用任意静态服务器（如 `npx serve dist`）以 http 方式访问，并且要让它在**根路径**下提供服务（产物里用的是 `/assets/...` 绝对路径）。

**Q10：在受限（禁止创建命名管道 / 无法派生子进程）的沙箱环境里 `npm run build` 报 `spawn EPERM`？**
A：这是 Vite 依赖的 **esbuild 需要启动常驻子进程**所致，与业务代码无关。在正常机器上 `npm run build` 不需要任何附加参数。受限环境可改用不依赖 esbuild 的兜底命令（会跳过压缩，产物稍大）：
```bash
npx vite build --configLoader runner --minify false --target esnext
```

**Q11：可以只用键盘操作吗？**
A：可以，见 [9.1 快捷键](#91-快捷键)。注意焦点在输入框内时，字符键交给浏览器原生输入，不会被重复追加。

## 十二、开发规范

本项目采用的编码规范见 [`codestyle.md`](./codestyle.md)（包含规范来源、命名 / 格式 / 组件 / CSS / 提交信息约定，以及大量正反例），其中最要紧的一条是：

> **前端不做任何表达式求值**。任何看起来需要"算一下"的需求，都必须改成调用后端接口。

## 十三、作者

| 项目 | 内容 |
| --- | --- |
| 学号 | 832402204 |
| 姓名 | 陈俊洁 |
| 课程 | 软件工程 |
| 作业 | 前后端分离计算器系统（前端仓库） |
