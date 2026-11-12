# 架构与代码规范（框架先行）

> 原则：**分层、单向依赖、纯逻辑可测、视图无副作用**。
> 任何文件超过 ~400 行就拆；任何"顺手加个全局变量"都算返工。

## 1. 分层与依赖方向

```
site/data/*.json            静态数据（构建产物，只读）
        │
        ▼
core/api.js  ──►  core/store.js  ──►  views/
                        ▲                 │
                        │                 ▼
                   domain/*  ◄──────  ui/components
                        ▲
                        │
                   features/*（AI、导入导出等有副作用的编排）
```

| 层 | 允许做 | 禁止做 |
|---|---|---|
| `domain/` | 纯函数、纯类、数学与规则 | `window` `document` `localStorage` `fetch`；直接调 `Date.now()`（时间必须作参数传入） |
| `core/store.js` | 唯一读写 localStorage 的模块；版本迁移 | 业务算法（放到 domain） |
| `core/dom.js` | DOM 创建工具 | 业务逻辑 |
| `core/router.js` | hash 路由、视图切换 | 具体页面逻辑 |
| `ui/` | 无状态可复用组件，接收 props 返回 DOM | 读 store、发请求 |
| `views/` | `(state, ctx) → DOM` | `fetch`、`localStorage`、业务计算、直接改 state |
| `features/` | 有副作用的编排（AI、备份、导入） | 直接操作 DOM（用回调/事件） |

依赖只能从上往下：`views → core → domain`，`features → core/domain`。**不允许反向 import。**

## 2. 目录与职责

```
cet-prep/
  docs/
    ARCHITECTURE.md        本文件
    CONTENT_SCHEMA.md      题目 JSON 契约
  tools/                   构建期脚本，不发布
    fetch_words.py         经 GitHub API 拉原始词库
    build_words.py         词库 → site/data/words.json
    gen_vocab_questions.py 生成 3900+ 词汇题
    build_site.py          合并 content/ + 题目 → site/data/*.json
    verify_content.py      内容校验
    verify_data.py         产物校验
    test_engine.mjs        domain 单测
  content/                 原创题目源（teammates 写入）
    reading/ cloze/ matching/ translate/ writing/ papers/
  site/
    index.html             只放骨架：meta、#app、入口 <script>
    manifest.webmanifest
    sw.js
    css/
      tokens.css           只放 CSS 变量
      base.css             reset、排版、布局原语、安全区
      components.css       .c-* 组件
      views.css            .v-* 页面布局
    js/
      main.js              启动：载数据 → 建 store → 建 router → 首屏（ensureExamData / ensureStories 懒加载）
      core/
        dom.js             h()、事件委托、清空
        api.js             loadJSON（带重试与缓存版本）
        store.js           状态、持久化、迁移、actions
        router.js          hash 路由
        format.js          日期/百分比/时长格式化
      domain/
        engine.js          Elo 校准 + SRS + 队列（纯函数）
        exam.js            判分、配分、计时（纯函数）
        importer.js        用户题库 JSON 校验（纯函数）
        questions.js       题目选取、判分（纯函数）
        writing-score.js   作文启发式评分：词汇难度 + 语法指标 → 15 分制
      ui/
        components.js      card/button/chip/progress/sheet/empty/toast
      views/
        onboarding.js      首次：选级别 → 3 分钟校准 → 生成词表
        today.js           今日新词 + 复习
        words.js           词库检索、筛选、逐词过筛
        exam.js            题库、分项练习、整卷
        library.js         图书馆：考试阅读 + 文学角、点词查义、已读记录
        me.js              设置、AI、统计、备份
        study.js           学习卡流程（被 today/words 复用）
      features/
        ai.js              同意闸门 + 调用编排
        writing-review.js  作文本地评分卡 + 可选 AI 精批
        share.js           分享链接 / 成绩卡片
        providers/
          openai.js        OpenAI / DeepSeek / 豆包 / 兼容端点
          claude.js        Anthropic Messages API
  deploy.ps1
  serve.ps1
  package.json             {"type":"module"}，仅供 node 跑单测
  README.md
```

## 3. 模块契约（导出签名）

### core/dom.js
```js
h(tag, props?, ...children) -> HTMLElement   // props: class/text/style/dataset/onXxx/attrs
delegate(root, eventType, selector, handler) // 事件委托
clear(node)
```

### core/api.js
```js
loadJSON(url, { timeout = 20000, retry = 2 }) -> Promise<any>
```

### core/store.js
```js
createStore({ key, defaults, migrate }) -> {
  get(), patch(partial, {persist=true}), subscribe(fn),
  actions: {...}            // 所有状态变更都从这里走
}
```
- 写盘节流 300ms；`beforeunload` 强制落盘。
- `migrate(old)` 按 `v` 逐级升级；解析失败先备份到 `key + '.bak'` 再重置。

### core/router.js
```js
createRouter({ routes, mount, fallback }) -> { start(), go(path) }
// routes: { 'today': (ctx) => HTMLElement, 'word/:w': (ctx, params) => HTMLElement }
```

### domain/engine.js（已实现）
`pKnow, zoneOf, clamp, recordAnswer, applyGrade, markKnown, unmarkKnown,
eligibleWords, Calibrator, spotCheck, applySpotCheck, buildQueue, estimateKnown,
dayKey, bumpDay`

### domain/exam.js
```js
scorePaper(sections, answers) -> {objective: {correct,total,score}, byType: {...}}
formatClock(ms) -> 'mm:ss'
sectionWeights(total = 710) -> {listening:249, reading:249, writing:106.5, translation:106.5}
```

### domain/questions.js
```js
grade(item, response) -> boolean
pick(bank, {level, type, count, seed, excludeIds}) -> item[]
```

### features/ai.js
```js
requestAI(action, payload, ctx) -> Promise<string>
// 内部：estimateTokens → ui.confirmSheet（用户点"发送"才继续）→ provider → 记账
// 任何异常归一化为 {code, message}，由调用方 toast
```

### providers/\*.js
```js
chat({ baseUrl, apiKey, model, messages, signal, onDelta }) -> Promise<{text, usage}>
```

## 4. 状态结构（store）

```js
{
  v: 1,
  profile: {
    level: 'cet4' | 'cet6' | 'both',
    examDate: 'YYYY-MM-DD',
    dailyNew: 20,
    onboarded: false
  },
  theta: 3.2,
  calib: { at: null, se: null, items: 0, spot: null },
  words: {                      // 只存接触过的词
    // "abide": {o:0.3, iv:2.5, ease:2.5, due:ts, reps:3, lapses:0, seen:4, wrong:1, k:1, m:1}
  },
  stats: { days: {}, streak: 0, lastDay: null },
  wrong: { "abide": 2 },
  fav: ["abide"],
  papers: { "p1": {at, timeMs, answers, score} },
  ai: { provider:'deepseek', baseUrl:'', key:'', model:'', sessionTokens:0, budget:0, remember:false },
  ui: { tab: 'today' }
}
```

- 只存"接触过的词"，不给 6661 个词写默认值（否则 localStorage 撑爆）。
- 词状态字段：`o` 单词偏移、`iv` 间隔、`ease`、`due`、`reps`、`lapses`、`seen`、`wrong`、`k` 已会、`m` 手动标记。
- 词本身（释义/例句）永远从 `words.json` 取，不进 store。

## 5. 渲染与事件约定

- **禁用 `innerHTML` 拼接**；所有文本用 `textContent`，节点用 `h()`。唯一例外是已转义的静态常量。
- 视图签名：`render(ctx) -> HTMLElement`；`ctx = { state, actions, data, go, toast }`。
- 路由表集中在 `main.js`，视图内只调 `ctx.go('#/word/abide')`。
- 事件一律 `data-act="xxx"` + 容器委托；禁止在循环里给上千个节点挂监听（词表必须虚拟化或分页）。
- 三态统一：`ui/components.js` 提供 `statePanel('loading'|'empty'|'error', opts)`。
- 词表渲染：分页（每页 60 条），避免 6661 节点卡死。

## 6. 样式约定

- `tokens.css`：只放变量。`--paper --ink --red --yellow --blue --mint --violet --edge --shadow --radius ...`
- `base.css`：reset、`html/body`、排版、`.row/.col/.grid` 原语、`env(safe-area-inset-*)`。
- `components.css`：`.c-btn .c-card .c-chip .c-sheet .c-progress .c-nav .c-input .c-sticker`
- `views.css`：`.v-today__hero`、`.v-words__list` 这种，一个页面一段，段首注释。
- 禁止内联 `style`，只有运行时变量例外：`el.style.setProperty('--p', pct)`。
- 断点：`<600` 手机 / `600–1023` 平板 / `≥1024` 桌面，`min-width` 递进。
- 触控目标 ≥44px；`touch-action: manipulation`；尊重 `prefers-reduced-motion`。

## 7. 数据契约（构建产物，分三波加载）

```jsonc
// site/data/words.json  —— 首屏唯一必需的数据（约 244 KB gz）
{ "meta": {"count":6662,"cet4":4544,"cet6":3991,"cet6only":2118},
  "words": [{"w":"abide","i":"əˈbaɪd","t":[["v","忍受"]],"g":["cet6","cet6only"],"d":8.1}] }

// site/data/words-detail.json  —— 例句与搭配，首屏后后台预取（约 745 KB gz）
{ "meta": {"count":6466}, "items": [{"w":"abide","e":[["en","cn"]],"p":[["ph","cn"]]}] }

// site/data/questions-vocab.json  —— 打开「题库」时才加载（约 265 KB gz）
{ "meta": {"count":3893}, "items": [{"id":"w2m-00001","type":"w2m","level":"cet6","prompt":"abide","options":["忍受","放弃","加速","测量"],"answer":0,"explain":"abide = 忍受","word":"abide"}] }

// site/data/content.json / papers.json  —— 同属题库包（约 87 KB gz）
```

**加载顺序（main.js）**

| 波次 | 内容 | 时机 | 失败处理 |
|---|---|---|---|
| 1 | `words.json.gz` | 启动，阻塞首屏 | 显示错误面板 + 重试按钮 |
| 2 | `words-detail.json.gz` | 首屏渲染后 requestIdleCallback | 静默失败，卡片显示"例句正在后台加载…" |
| 3 | 题库三件套 | 进入 `#/exam` 时 await | 路由层捕获并显示错误面板 |

- 所有数据都提供 `.json.gz`；`core/api.js` 优先用 `DecompressionStream` 解压，失败自动回退到明文 JSON。
- `index.html` 用 `<link rel="modulepreload">` 并行预加载整张模块图，避免慢网络上逐个发现 import。
- 首屏预算：HTML+CSS+JS ≈ 160 KB，加词库约 400 KB（原方案 3.7 MB）。

## 8. 测试

| 命令 | 作用 |
|---|---|
| `node tools/test_engine.mjs` | 校准精度、SRS 间隔、队列排除已会词 |
| `python tools/verify_content.py` | 原创题目 schema |
| `python tools/verify_data.py` | 词库/题目产物完整性 |
| `python -m http.server` + 浏览器 | 手动走查 |

校准精度测试是**验收核心**：构造虚拟用户，断言"已会"分区误判 <10%、"未会"分区误判 <10%。

## 9. 实施顺序（严格按层，不跳步）

1. `css/tokens.css` → `base.css` → `components.css`
2. `core/dom.js` → `core/store.js` → `core/router.js` → `core/api.js` → `core/format.js`
3. `ui/components.js`
4. `views/onboarding.js` → `study.js` → `today.js` → `words.js` → `exam.js` → `me.js`
5. `features/ai.js` + `providers/*`
6. 构建脚本产出数据 → `sw.js` / `manifest` / 图标
7. `deploy.ps1` → 上线 → 真机验收

## 10. 反模式黑名单

- ❌ 一个 `app.js` 干所有事
- ❌ 视图里 `localStorage` / `fetch`
- ❌ `innerHTML` 拼字符串
- ❌ 全局可变变量（除 `main.js` 的 `ctx`）
- ❌ 复制粘贴的卡片/按钮标记（必须走 `ui/components.js`）
- ❌ 在 6661 个词上直接挂事件监听
- ❌ 未捕获的 Promise（统一 `.catch` → toast）
