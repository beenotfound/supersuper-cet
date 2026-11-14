# supersuper四六级 · 使用与维护手册

> 一个先测后学的 CET-4/6 学习 PWA：词汇、真题题库、图书馆、写作批改、可选 AI。
> 在线：<https://cet-prep-6ee.pages.dev/>（主站） · <https://beenotfound.github.io/cet-prep/>（备用）

---

## 目录

1. [它是什么](#1-它是什么)
2. [快速开始](#2-快速开始)
3. [五个页面](#3-五个页面)
4. [规则说明（分数怎么来的）](#4-规则说明分数怎么来的)
5. [AI 功能与费用](#5-ai-功能与费用)
6. [数据、隐私与统计](#6-数据隐私与统计)
7. [内容来源与版权](#7-内容来源与版权)
8. [常见问题](#8-常见问题)
9. [开发者：目录与数据管线](#9-开发者目录与数据管线)
10. [开发者：测试与发布](#10-开发者测试与发布)
11. [更新日志](#11-更新日志)

---

## 1. 它是什么

大多数背单词软件从 A 排到 Z，逼你背已经会的词。supersuper四六级反过来：

- **先测**：3 分钟校准，估计你的词汇能力 θ
- **再学**：只把你**还不会**的词排进队列，已经会的直接跳过
- **读得懂**：按 i+1 生词率推荐阅读，只差几个词就能读懂
- **可离线**：Service Worker 缓存全部词库和题目，断网也能学（AI 除外）
- **不偷跑**：AI 默认完全不调用，每一次都弹确认单，不点不花钱

---

## 2. 快速开始

### 2.1 打开

- 主站（Cloudflare，国内通常更快）：<https://cet-prep-6ee.pages.dev/>
- 备用（GitHub Pages）：<https://beenotfound.github.io/cet-prep/>

### 2.2 安装到主屏

| 设备 | 操作 |
|---|---|
| iPhone / iPad | Safari 打开 → 分享 → **添加到主屏幕** |
| Android | Chrome 打开 → 菜单 → **安装应用 / 添加到主屏幕** |
| 桌面 | Chrome / Edge 地址栏右侧安装图标 |

装到主屏后从图标打开是全屏 App，且优先用本地缓存，断网可用。

### 2.3 首次校准

1. 首页点「开始词汇量校准」
2. 每题三选一：**认识 / 眼熟（见过但不知道意思）/ 不认识**
3. 约 24 题，系统估计 θ，生成你的候选词表
4. 校准只影响"预测你会哪些词"，不会清空已有学习记录

> 之后可以在「我的 → 重新校准」随时重测；也可以在「我的 → 关于 → 刷新到最新版本」强制更新缓存。

---

## 3. 五个页面

### 今日

- 新词 + 到期复习，按每日新词量出队
- 学习卡四档自评：**不认识 / 模糊 / 认识 / 熟练**（SRS 排期）
- 显示预计已掌握、阅读覆盖率、连续天数、距考试天数
- 按 i+1 推荐一篇阅读，可直接开读或去做题
- 「已进入复习」显示已经进入排期的词数

### 单词

- 6662 词检索、按级别/难度/首字母筛选
- 逐词过筛（认识/眼熟/不认识），快速标出真不会的
- 单词详情：音标、释义、例句、难度、收藏、标记已会
- 收藏夹：随时回看

### 题库

| 类型 | 内容 |
|---|---|
| 词汇速练 | 5689 题：英译中、中译英、选词填空、拼写 |
| 仔细阅读 | 164 篇，四选一，含解析 |
| 选词填空 | 86 套，15 词库选 10 空 |
| 长篇匹配 | 84 套，段落匹配 |
| 翻译 | 112 篇，含参考译文与要点 |
| 写作 | 97 篇，含范文；提交后给**本地评分** |
| 整卷 | 87 套：六级 23 / 四级 64（含 2020–2026 四级真题、2023–2025 六级真题） |

- 词汇题点选项**立即判分**；阅读/选词/匹配提交后判分并展开解析
- 写作提交后先给**免费本地评分**（15 分制，词汇难度 + 语法指标），觉得不准再点「AI 精批」走确认闸门
- 整卷列表默认折叠为 6 套，按年份倒序，可展开全部
- 支持按 四级 / 六级 / 混合 切换；支持导入自己的题库 JSON

### 图书馆

- **考试阅读**：按 i+1 生词率推荐 3 篇「只差几个词就能读懂」，下面是按好读程度排序的全量列表
- **文学角**：30 篇公版短篇（安徒生、格林、马克·吐温、吉卜林、Saki、欧·亨利、爱伦·坡），带中文摘要、词数、生词率
- **阅读器**：
  - 点任意单词 → 音标 / 释义 / 难度 / **朗读**（浏览器 TTS）/ **收藏**（进生词本）
  - 底部：标记已读 / 标记未读（可来回切）/ 下一篇 / 返回列表
  - 考试阅读多一个「去做题」，直接跳到题库同一篇
- 已读篇数与列表标签会同步；已读状态存在本地

### 我的

- 学习档案：目标级别、考试日期、每日新词、重新校准
- 学习统计：预计已掌握、手动标记已会、接触过的词、学习天数、连续天数、覆盖率
- 分享：生成 1080×1350 学习画像 PNG，可保存 / 系统分享 / 复制链接
- AI 设置：provider、Base URL、Key、模型、会话预算
- 数据备份：导出 / 导入 JSON、清空全部数据
- 关于：数据来源、版本、**刷新到最新版本**（清 Service Worker 与缓存）

---

## 4. 规则说明（分数怎么来的）

### 4.1 词汇能力 θ 与"已掌握"

- 每个词有难度 `d`（0.8–9.5，由词频分位归一化）
- 认识概率：`p = 1 / (1 + 10^((d - θ) / 2))`
- θ 只由**校准**（和复核）更新；学习卡的自评**不会**抬高 θ
- 「预计已掌握」= 所有候选词 p 的求和，是估计值，不是精确计数

### 4.2 学习卡与 SRS

四档对应 0–3 分，按 SM-2 思路调整间隔与 ease：

| 选择 | 效果 |
|---|---|
| 不认识 | 重新排近期复习，难度偏移上调 |
| 模糊 | 短间隔复习 |
| 认识 | 正常间隔 |
| 熟练 | 拉长间隔 |

每张卡只改**这个词自己**的状态，不会影响其他词。

### 4.3 整卷计分

- 客观题按题型权重折算：阅读 249、写作 106.5、翻译 106.5（710 分制）
- 主观题不自动判分，写作走本地评分 / AI 精批，翻译给参考译文
- 结果页按题型拆分，只有 ≥2 种题型时显示分项

### 4.4 写作本地评分（15 分制）

三项各 5 分，**相加等于总分**：

| 维度 | 依据 |
|---|---|
| 内容 | 字数、分段、与题目/范文主题词重合度 |
| 结构 | 段落数、连接词密度、从句占比 |
| 语言 | 词汇难度（词库 d 值、高级词占比、词汇多样性）+ 语法复杂度（句长、从句、连接词） |

用站内范文做百分位校准：范文水平 ≈ 3/5，明显更好的接近 5/5，空文 1 分档。评级：优秀 13–15 / 良好 10–12 / 中等 7–9 / 较差 4–6 / 差 1–3。

> 本地评分是启发式，免费离线；想要逐句修改就用「AI 精批」。

### 4.5 阅读覆盖率与 i+1

- 覆盖率：按词频加权的"你认识的比例"，词库外的词（人名、功能词）按已知处理
- i+1：推荐覆盖率最接近 95% 的篇章——只差几个词，正好可读
- 阅读角里每篇显示"生词率 / 还差几个词"

---

## 5. AI 功能与费用

支持：**OpenAI / Claude / DeepSeek / 豆包（火山方舟）/ 任意 OpenAI 兼容接口**（通义、GLM、Kimi 等）。

- **Key 只存在你的浏览器 localStorage**，请求直连厂商，不经过任何中转服务器
- **每一次调用前弹确认单**：发什么、用哪个模型、大约多少 token
- 不点「发送并消耗」就不会调用；没有后台自动生成、没有页面加载即调用
- 可设「本次会话预算上限」，超出即拒绝
- 浏览器直连被 CORS 拦截时，会明确提示，并提供"手动复制提示词"的退路
- 所有 Key、模型、预算都可以在「我的 → AI 设置」里修改或清空

---

## 6. 数据、隐私与统计

- **无账号、无后端**：学习记录、收藏、已读、AI Key 全部只在本机 `localStorage`
- 换设备：在「我的 → 导出 JSON」，到新设备「导入 JSON」
- 清除：设置里「清空全部数据」，会删除全部本地记录
- **访问统计**：Cloudflare Web Analytics，无 cookie、不采集个人身份，只做聚合 PV/UV、来源、国家、设备；广告拦截与网络波动会漏报
- 站点是纯静态：不收集、不上传任何学习内容

---

## 7. 内容来源与版权

| 内容 | 来源 | 许可 |
|---|---|---|
| 词库 | [KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary) | BSD-3-Clause |
| 词频难度 | [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) | MIT |
| 四级题库（模拟/原创） | [cypher-yht/dsh-plugins-exam-practice](https://github.com/cypher-yht/dsh-plugins-exam-practice) | MIT |
| 六级真题风格卷 | [Drhm1224/cet6-all-in-one](https://github.com/Drhm1224/cet6-all-in-one) | 非商用学习 |
| 四级真题（2020–2026） | [123xzw999/cet4-exam-quiz](https://github.com/123xzw999/cet4-exam-quiz) | 非商用学习 |
| 文学角 | Project Gutenberg / Wikisource 公版文本 | 作者去世 50 年以上 |
| 听力题库与音频 | 合作者提供的 50 套真题听力（1158 小题） | 非商用学习 |
| 词汇题、写作/翻译范文补充 | 本站原创 / 程序生成 | — |

- 听力：50 套真题（四级 23 / 六级 27，1158 小题），保留原始立体声与码率（128–320 kbps），长音频按 ≤24 MiB 分段播放，总计约 1.08 GB；7 个源文件本身为单声道。仅用于非商用学习
- 中文摘要、解析、评分规则由本站撰写；请勿将本仓库内容用于商业用途

---

## 8. 常见问题

**Q：看不到新题 / 新功能？**
A：Service Worker 缓存了旧文件。到「我的 → 关于 → 刷新到最新版本」，或彻底关闭 PWA 再打开。

**Q：分享到微信失败？**
A：iOS 要求分享面板在点击的同一手势里同步打开，已修复；若仍在微信内置浏览器里，点右上角 `···` → 在浏览器中打开。桌面端按钮是「下载卡片」。

**Q：写作没有范文？**
A：部分六级写作只有题目和开头句，没有参考范文；本地评分仍可用，AI 精批也可以。

**Q：听说有听力？**
A：有。底部导航「听力」进去，50 套真题按大题逐块作答；无标准答案的套卷支持逐题自评。

**Q：真题是全的吗？**
A：四级 2020–2026、六级 2023–2025 的真题/风格卷，来源是公开整理仓库；听力另附 50 套真题音频。数量会随导入脚本更新。

**Q：为什么我点了"标记已读"想撤回？**
A：阅读器底部再点一次「标记未读」即可，状态会在列表和统计里同步。

**Q：手机上日期框超出卡片？**
A：已针对 iOS WebKit 修过（16px 字号 + `min-width: 0` + 关闭原生外观）；仍异常请告诉我机型和浏览器。

**Q：能看多少人访问吗？**
A：能看聚合 PV/UV（Cloudflare Web Analytics），看不到具体是谁；统计从安装脚本那天开始，之前的数据无法回溯。

**Q：能离线用吗？**
A：可以。首次加载后词库、题库、阅读都会缓存；AI 需要联网。

---

## 9. 开发者：目录与数据管线

### 9.1 目录结构

```
site/                 直接部署的静态站点
  index.html          shell + 图标 sprite
  manifest.webmanifest / sw.js
  js/core/            路由、状态、存储、请求、DOM
  js/domain/          纯逻辑：engine/exam/coverage/importer/writing-score
  js/views/           today/words/study/exam/exam-items/me/onboarding/library
  js/ui/              components/icons
  js/features/        ai/share/writing-review/providers
  css/                tokens/base/components/views
  data/               构建产出的 json / json.gz
content/              题目源文件（原创 + 导入）
  imported/           导入的题目（bank/cet6/real4）
data/source/          原始数据（词表、题库缓存、故事源、公版全文）
tools/                构建、导入、校验、测试、部署脚本
docs/                 架构、题库 schema、本手册
.github/workflows/    自动部署 Cloudflare Pages
```

### 9.2 数据构建

```powershell
# 1) 词库：下载 → 合并 → 难度 → 轻量/详情两份
python tools\fetch_words.py
python tools\build_words.py

# 2) 词汇题生成（5689 题）
python tools\gen_vocab_questions.py

# 3) 题库导入（一次性）
python tools\import_bank.py          # 四级模拟/原创（MIT）
node   tools\import_cet6.cjs        # 六级真题风格卷
node   tools\import_cet4_real.cjs   # 四级真题 2020–2026

# 4) 文学角（公版短文）
python tools\build_stories.py

# 5) 汇总 → site/data/*.json + .gz
python tools\build_site.py
```

没有 `data/source/*.jsonl` 时，先跑 `fetch_words.py` 重新下载。

### 9.3 校验

```powershell
python tools\verify_data.py      # 词库、题目、试卷、覆盖率数据一致性
python tools\verify_content.py   # 题目 schema 与答案合法性
```

### 9.4 新增题目

- 结构见 `docs/CONTENT_SCHEMA.md`
- 放到 `content/`（或 `content/imported/`），跑 `build_site.py` 与 `verify_content.py`
- 支持类型：`reading / cloze / matching / translation / writing`
- 导入题目时 `source` 用 `imported`，`paperId/paperTitle` 可选，用于生成整卷

### 9.5 新增文学篇目

1. 把公版原文清洗后放到 `data/source/stories/story-*.json`（字段：id/title/author/source/year/text/summaryZh）
2. 跑 `python tools\build_stories.py`，自动算词数、生词率、难度、级别
3. `library_test.cjs` 会检查列表与阅读器

---

## 10. 开发者：测试与发布

### 10.1 本地预览

```powershell
python tools\local_open.py          # 启动 127.0.0.1:8765 并打开浏览器
python tools\local_open.py --stop   # 停止
```

### 10.2 自动化测试

| 脚本 | 覆盖 |
|---|---|
| `test_engine.mjs` / `test_coverage.mjs` | 校准、SRS、覆盖率纯函数 |
| `smoke.cjs` | 全路由冒烟 + 文本 null 检查 |
| `exam_test.cjs` / `exam_flow.cjs` / `exam_levels.cjs` | 题库、整卷、级别切换 |
| `reading_pick.cjs` / `reading_layout.cjs` | 阅读推荐、分栏布局 |
| `imported_ui.cjs` / `import_test.cjs` | 导入题库、导入题渲染 |
| `library_test.cjs` / `library_ui_test.cjs` | 图书馆、查词、已读/未读 |
| `progress_test.cjs` | 学习不抬高 θ、旧数据迁移 |
| `writing_score_test.mjs` / `writing_ai_test.cjs` | 作文评分、AI 闸门 |
| `share_test.cjs` / `copy_check.cjs` | 分享卡片、文案 |
| `jitter_check.cjs` / `live_ui.cjs` / `live_check.cjs` | 级别切换抖动、线上检查 |

全部需要本地服务与 Playwright（脚本里写死了本机路径）。

### 10.3 发布

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."   # Cloudflare Pages:Edit
python tools\deploy_all.py          # 只发 Cloudflare（主站）
python tools\deploy_all.py --github # 再补 GitHub Pages
```

- Cloudflare：自动 bump Service Worker 版本 → `wrangler pages deploy`
- GitHub Pages：`tools/deploy.py --lean` 走 Git Data API，只上传变化的 blob，跳过 >200KB 的原始 json
- CI：`.github/workflows/deploy-cloudflare.yml`，需在仓库 Secrets 配 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`

### 10.4 网络与传输（国内直连 GitHub）

实测（2026-11，广州校园网）：

| 项目 | 结果 |
|---|---|
| DNS（阿里/腾讯/Google） | 都解析到 20.205.243.166（新加坡），TCP 87ms、TLS 185ms |
| 美国 140.82.x | 延迟 300ms+，codeload 仅 6KB/s，**不要用 hosts 指过去** |
| api.github.com | 20/20 成功，平均 0.35s |
| raw.githubusercontent.com | 能连但下载挂起，**禁用**（脚本统一走 API blob） |
| git smart HTTP | 间歇性 0/5 全部 10s 超时，随后 3/3 成功 0.5s |
| SSH ssh.github.com:443 | 握手正常（约 106ms） |

**建议做法（不装任何软件）**：

1. 用 Windows 自带 OpenSSH 走 **SSH over 443**：
   - `ssh-keygen -t ed25519 -f %USERPROFILE%\.ssh\id_ed25519_github -N '""'`
   - 公钥加到 GitHub → Settings → SSH and GPG keys
   - `%USERPROFILE%\.ssh\config` 加 `Host github.com / HostName ssh.github.com / Port 443 / IdentityFile ~/.ssh/id_ed25519_github`
   - **关键**：Git for Windows 自带的 ssh 在中文用户名下会把 HOME 解析成乱码路径（`/c/Users/汉字/`），导致读不到 known_hosts 和密钥、报 `Host key verification failed`；让 Git 改用系统 OpenSSH：
     `git config core.sshCommand '"C:/Windows/System32/OpenSSH/ssh.exe" -o StrictHostKeyChecking=accept-new'`
   - `git remote set-url origin git@github.com:beenotfound/supersuper-cet.git`
2. HTTPS 兜底：`http.version HTTP/1.1`、`http.postBuffer 512MB`、`http.lowSpeedLimit 1000`、`http.lowSpeedTime 60`（卡住快速失败）。
3. 大提交用 `tools/git_push.ps1`（5 次指数退避）；体检用 `tools/net_check.ps1`。
4. 不推荐改 hosts / DNS / MTU：当前解析已是最优，改美国 IP 反而更慢。
5. 链路实在差时：日常推 Gitee，GitHub 用 Actions 定时同步（见 §10.3）。

### 10.5 数据文件

`site/data/` 下的 `.json.gz` 是运行时真正加载的文件（首次加载约 244 KB，题库懒加载约 700 KB，故事 62 KB）。原始 `.json` 仅作兼容回退，发布时可用 `--lean` 跳过上传。

---

## 11. 更新日志

- **v1.0**：词库、校准、SRS、题库（词汇/阅读/选词/匹配/翻译/写作）、整卷
- **v1.1**：四级真题 2020–2026、写作本地评分 + AI 精批、分享卡片、图书馆（考试阅读 + 30 篇公版文学）、移动端适配、Cloudflare Pages 主站
