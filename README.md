# supersuper四六级

一个**先测后学**的四六级备考 PWA：先花 3 分钟校准你真正不认识的词，之后只学那些词。
免安装、可离线、iPad / iPhone / Android / 桌面通用，不需要 App Store 开发者账号。

- 使用与维护手册：[docs/MANUAL.md](docs/MANUAL.md)
- 源码仓库：<https://github.com/beenotfound/supersuper-cet>
- 线上主站：<https://cet-prep-6ee.pages.dev/> · 备用：<https://beenotfound.github.io/cet-prep/>

首屏只下载约 300 KB（词表），例句与题库在后台/按需加载，首访后由 Service Worker 全量缓存、断网可用。

---

## 它解决什么问题

常见背单词 App 的"词汇量测试"只给你一个数字，然后继续推你早就会的词。

这里不同：

- **6662 词**：四级 4544 + 六级 3991（交集 1873，**六级独有 2118**）。
- **3 分钟自适应校准**：24 道题，按难度阶梯估算你的能力值 θ，三档作答 —— **认识 / 眼熟（见过但说不出意思，按半对算）/ 不认识**；输出三分区——✅ 已会（默认不进队列）/ 🟡 边缘（优先确认）/ 🔴 未掌握（进队列）。
- **复核校准**：从"已会"和"不会"各抽 5 词重测，让边界更准；命中率低于 80% 会自动放宽边界。
- **越用越准**：每次答题都会微调该词的难度偏移，任何卡片上点「我会了」都会把词永久移出队列。
- **阅读覆盖率**：把"认识 1243 词"翻译成"能读懂站内阅读的 96% 单词"。
- **i+1 阅读推荐**：按你的词表算出每篇的生词率，挑一篇"只差 10 个词就全认识"的，点开即可读。

## 四个入口

| 入口 | 内容 |
|---|---|
| 今日 | 新词 + 到期复习，4 档自评（不认识/模糊/认识/熟练），自动排期；按生词率推荐一篇阅读 |
| 单词 | 6662 词检索/筛选、逐词过筛、单词详情、收藏、标记已会 |
| 听力 | 50 套真题听力（四级 23 / 六级 27，共 1158 小题），按大题逐块作答、音频播放、交卷自动判分；无标准答案的套卷支持逐题自评 |
| 题库 | 词汇速练（5689 题）、仔细阅读、选词填空、长篇匹配、翻译、写作（本地评分：词汇难度 + 语法指标，15 分制）、87 套整卷（六级 23 / 四级 64，含 2020–2026 四级真题）；整卷交卷后生成**模考报告**（分项估算/薄弱项/错题/时间/历史），整卷卡片显示上次成绩；「学习记录」页可回看模考/专项记录、错题本，支持重做错题；支持「完整模考」运行时搭配听力与按随机/优先未做/只练错题抽题；支持按级别切换与导入自己的题库 |
| 图书馆 | 考试阅读（i+1 生词率推荐）+ 文学角（30 篇公版短篇），点词查义、朗读、收藏进生词本，记录已读 |
| 我的 | 目标与考试日期、统计、AI 设置、导入单词表 / 题库、导入导出备份 |

## 导入自己的单词表

「我的 → 导入单词表」（单词库右上角「导入词表」可直达）支持两种方式：

- 直接粘贴：每行 `英文单词 中文释义`，空格 / 逗号 / Tab 分隔都可以
- 选择 `.txt` / `.csv` 文件

导入后会生成自定义词汇题（拼写 + 词义选择），在「题库 → 词汇速练」里练习，只存本机；今日词表仍使用内置 6662 词。进阶的整题 JSON 导入在下方「导入题库 JSON」。

## 学习记录 / 错题本 / 抽题策略

- 整卷卡片显示「未做 / 上次 X 分」，可直接「重做」或「看上次报告」
- 「题库 → 全部记录 / 错题本」：模考记录（本机 20 条）、专项练习记录（本机 30 条）、错题本
- 整卷和专项答错的客观题会自动收进错题本（按题/空记录，最多 300 条），可按题型筛选、移出、重做错题
- 专项练习可切换抽题策略：随机 / 优先未做 / 只练错题；做过/错过的题会记录在本机，不上传
- 记录只在本机 localStorage，换设备用「我的 → 导出 JSON」

## 模考报告与分数预测

整卷交卷后不再只显示正确率，而是生成一份本地报告：

- **分项分**：听力 248.5 / 阅读 248.5（选词 35.5 + 匹配 71 + 仔细阅读 142）/ 写作 106.5 / 翻译 106.5
- **预估总分区间**：按 CET 分项权重估算，写作用本地 15 分制换算，翻译按参考译文关键词覆盖率估算；明确标注「估算，非官方成绩」，不展示伪造的百分位
- **薄弱项 TOP2**：按部分正确率排序，附一句可执行的练法，一键去练
- **错题明细**：题号、你的答案、正确答案、解析（最多 12 道）
- **时间分配**：各部分实际耗时 vs 建议时间，超 1.3 倍标红
- **历史记录**：最近 20 次整卷保存在本机，可回看、对比

听力与整卷是分开的题库，**不改整卷内容**；「完整模考」会按级别/年份在运行时把一套听力配给整卷，开始前可手动换听力套，交卷后合并成 710 分制报告。听力无标准答案的题用自评，报告中会降低置信度。

## AI（可选，默认完全不消耗）

支持 **OpenAI / Claude / DeepSeek / 豆包（火山方舟）/ 任意 OpenAI 兼容接口**（通义、GLM、Kimi 等）。

- Key 只存在你自己的浏览器 localStorage 里，请求直连厂商，不经过任何中转服务器。
- **每一次调用前都会弹确认单**：发什么内容、用哪个模型、大约消耗多少 token，点"发送并消耗"才真的调用。
- 不点就不花钱：没有后台自动生成、没有自动批改、没有页面加载即调用。
- 作文先给**本地评分**（免费、离线）；觉得不够准，再点「AI 精批」才会弹确认单。
- 可设"本次会话预算上限"，超过即拒绝。
- 浏览器直连被 CORS 拦截时，会明确提示，并保留"手动复制提示词"的退路。

## 安装到手机 / 平板

**iPhone / iPad**：Safari 打开线上地址 → 分享 → **添加到主屏幕** → 从主屏幕打开即全屏 App。
**Android**：Chrome 打开 → 菜单 → **安装应用 / 添加到主屏幕**。
**桌面**：Chrome/Edge 地址栏右侧的安装图标。

首访后 Service Worker 会缓存全部词库与题目，**断网也能学**（AI 需联网）。

## 本地打开（Windows）

桌面已生成两个快捷方式：

- **supersuper四六级（本地）.lnk** —— 双击后在后台启动本地服务，并自动打开 <http://127.0.0.1:8765/>
- **supersuper四六级（在线）.url** —— 直接打开线上版

> 不要直接双击 `site/index.html`：浏览器会以 `file://` 打开，ES module 与数据请求会被拦截，页面会空白。

停止本地服务：运行项目里的 `关闭本地服务.cmd`（等价于 `python tools/local_open.py --stop`）。
端口 8765 被占用时会自动顺延到 8766–8776。

本地版与线上版的浏览器存储**相互独立**，学习记录不互通；需要迁移用「我的 → 导出 JSON / 导入 JSON」。

## 本地开发

```powershell
# 只预览（不需要构建）
.\serve.ps1            # http://127.0.0.1:8765/

# 重建数据（数据源已缓存在 data/source/）
python tools\build_words.py          # 词库 -> site/data/words.json
python tools\gen_vocab_questions.py  # 5689 道词汇题
python tools\build_site.py           # 合并 content/ -> content.json + papers.json

# 校验
python tools\verify_content.py       # 原创题目 schema
python tools\verify_data.py          # 产物完整性
node tools\test_engine.mjs           # 校准 / 排期 / 队列的验收测试
```

需要 Python 3.10+；`build_words.py` 首次需要 `data/source/` 里的原始数据（`tools/fetch_words.py` 下载）。

## 匿名统计（无账号、无第三方）

站点只上报匿名事件到 Cloudflare Pages Function（`/api/e`），落库在 Cloudflare D1：

- 只记录：随机匿名 ID（localStorage，仅本站）、事件名、页面路径、少量计数（如完成题数、评分档位）
- 不记录：单词内容、答案文本、AI Key、任何个人信息
- Service Worker 不含音频；统计请求不影响离线学习
- 关闭方式：「我的 → 匿名统计 → 关闭」，或浏览器开启 DNT / GPC

事件：`app_open`、`page_view`、`calibration_start/complete`、`recheck_start/complete`、`study_start/answer/finish`、`listening_start/submit`、`exam_start/finish`。

看数据：

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."
python tools\analytics_report.py   # DAU、次日/7日留存、校准/学习/听力完成率
```

## 国内网络

- 发布不走 GitHub：`python tools\deploy_all.py` 直接传 Cloudflare（几秒到几十秒）。
- 访问 GitHub 慢/断时，用 **SSH over 443**（Windows 自带 OpenSSH）：公钥加到 GitHub 后，`~/.ssh/config` 把 `github.com` 指向 `ssh.github.com:443`；中文用户名下还需 `git config core.sshCommand '"C:/Windows/System32/OpenSSH/ssh.exe"'`（Git 自带 ssh 会把 HOME 解析成乱码路径）。
- 体检：`powershell -File tools\net_check.ps1`；大提交：`powershell -File tools\git_push.ps1`。
- 不要用 hosts 把 GitHub 指到美国 IP（实测更慢）；不要用 raw.githubusercontent.com（会挂起）。

## 发布

主站是 Cloudflare Pages（国内打开更快），默认只发它：

```powershell
$env:CLOUDFLARE_API_TOKEN = "..."   # Cloudflare API Token，Cloudflare Pages:Edit
python tools\deploy_all.py          # 只发 Cloudflare Pages（自动换 SW 版本号）
```

需要时再补 GitHub Pages（国内链路经常断，可选）：

```powershell
python tools\deploy_all.py --github
```

- 主站：`https://cet-prep-6ee.pages.dev/`
- 备用：`https://beenotfound.github.io/cet-prep/`
- `.github/workflows/deploy-cloudflare.yml`：push 到 main 时自动发 Cloudflare（需在仓库 Secrets 里加 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`）
- 用户端看不到新内容时：我的 → 关于 → 「刷新到最新版本」

## 目录结构

```
site/                直接部署的静态站点
  js/core/           路由、状态、存储、请求（唯一写 localStorage 的地方）
  js/domain/         纯逻辑：校准、排期、判分（可在 Node 里单测）
  js/views/          每个页面只做 state -> DOM
  js/features/       AI 编排 + 各家 provider
  data/              构建产物
content/             原创题目源（JSON，一人一文件）
tools/               构建、校验、部署脚本
docs/ARCHITECTURE.md 分层与代码规范
docs/CONTENT_SCHEMA.md 题目 JSON 契约
```

## 数据来源

- 词库：KyleBing/english-vocabulary（BSD-3-Clause）
- 词频：hermitdave/FrequencyWords `en_50k`（MIT），用于估算难度
- 题目：原创、程序生成，或来自公开整理仓库 [cypher-yht/dsh-plugins-exam-practice](https://github.com/cypher-yht/dsh-plugins-exam-practice)（MIT）、[Drhm1224/cet6-all-in-one](https://github.com/Drhm1224/cet6-all-in-one)、[123xzw999/cet4-exam-quiz](https://github.com/123xzw999/cet4-exam-quiz)（四级真题 2020–2026）；仅用于非商用学习
- 文学角：Project Gutenberg / Wikisource 公版文本（作者去世 50 年以上），中文摘要由本站撰写
- 听力：50 套真题听力（四级 23 / 六级 27，共 1158 小题），保留原始码率（128–320 kbps）与立体声，长音频按 ≤24 MiB 分段播放；音频托管在独立的 Cloudflare Pages 项目（https://cet-audio.pages.dev/），仓库只保留外链，不再包含音频文件。其中 7 个源文件本身是单声道。仅用于非商用学习；无标准答案的套卷支持自评

## 已知边界

- 无云同步：学习记录只在本机，换设备请用「我的 → 导出 JSON」。
- 真题：内置四级 2020–2026、六级 2023–2025 真题（含解析），来源见「关于」；仅非商用学习。
- 听力：题库与音频已内置；无标准答案的套卷需自己对照解析逐题自评。
- 主观题：写作先本地评分（词汇难度 + 语法指标，15 分制），觉得不够准可再点 AI 精批；翻译提供参考译文并可选用 AI 点评。
