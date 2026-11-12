# 题目内容 JSON Schema（锁定版）

所有原创题目均为 **UTF-8 JSON，一个题目一个文件**，放在 `content/<类型>/` 下。
构建脚本会读取 `content/**/*.json`（`content/papers/` 除外）并做校验，任何一条不合规都会让构建失败。

## 通用字段（每条必填）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 全局唯一，见下方命名规则 |
| `type` | string | `reading` / `cloze` / `matching` / `translation` / `writing` |
| `level` | string | `cet4` 或 `cet6` |
| `title` | string | 标题（中文或英文均可） |
| `difficulty` | int | 1–5，1 最易 |
| `source` | string | 固定写 `"original"` |
| `targetWords` | string[] | 2–6 个本题重点考查的单词（小写原形） |

## 命名规则

| 类型 | 文件名 | 数量 |
|---|---|---|
| 仔细阅读 | `content/reading/read-001.json` … `read-012.json` | 12 |
| 选词填空 | `content/cloze/cloze-001.json` … `cloze-012.json` | 12 |
| 长篇匹配 | `content/matching/match-001.json` … `match-008.json` | 8 |
| 翻译 | `content/translate/trans-001.json` … `trans-030.json` | 30 |
| 写作 | `content/writing/write-001.json` … `write-015.json` | 15 |

`id` 与文件名去掉扩展名后一致（例如 `read-001`）。

---

## 1. reading（仔细阅读）

```json
{
  "id": "read-001",
  "type": "reading",
  "level": "cet6",
  "title": "Why Cities Are Getting Quieter",
  "difficulty": 3,
  "source": "original",
  "targetWords": ["alleviate", "persistent", "intervene"],
  "passage": "English passage, 280-360 words, 4-6 paragraphs separated by \\n\\n.",
  "questions": [
    {
      "q": "What does the author suggest about urban noise?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explain": "中文解析，1-2 句，说明为什么选它、其余为什么不对。"
    }
  ]
}
```

规则：
- `questions` 恰好 5 题，每题 4 个选项，`answer` 为 0–3 的整数索引。
- 5 题的答案分布不要集中在同一个索引上（至少覆盖 3 个不同索引）。
- 干扰项必须看似合理，禁止 "All of the above" / "None of the above"。
- 题目顺序与文章行文顺序一致；至少 1 题是推断题、1 题是词义/指代题。
- 不写具体统计数据或需要引用的事实断言；用一般性论述。
- 英文正文 280–360 词。

## 2. cloze（选词填空）

```json
{
  "id": "cloze-001",
  "type": "cloze",
  "level": "cet6",
  "title": "The Return of the Night Train",
  "difficulty": 3,
  "source": "original",
  "targetWords": ["reluctant", "sustain", "keen"],
  "passage": "English passage 220-280 words with exactly ten blanks written as {{1}} ... {{10}}.",
  "bank": ["word1","word2","word3","word4","word5","word6","word7","word8","word9","word10","word11","word12","word13","word14","word15"],
  "blanks": [
    { "n": 1, "answer": "reluctant", "explain": "中文解析：此处需要形容词，表示不情愿。" }
  ]
}
```

规则：
- `passage` 恰好含 `{{1}}`…`{{10}}` 十个占位符，顺序出现在文中。
- `bank` 恰好 15 个词，全部小写、无重复；其中恰好 10 个是答案。
- `blanks` 恰好 10 项，`n` 为 1–10，`answer` 必须存在于 `bank`。
- 每个空只能有一个语法与语义都正确的答案（同词性、同单复数形式已在 bank 中区分）。
- 文中不得泄露答案（bank 里的词不能出现在 passage 里）。
- 英文正文 220–280 词。

## 3. matching（长篇阅读 / 信息匹配）

```json
{
  "id": "match-001",
  "type": "matching",
  "level": "cet6",
  "title": "The Future of Remote Work",
  "difficulty": 4,
  "source": "original",
  "targetWords": ["flexible", "collaborate"],
  "paragraphs": [
    { "label": "A", "text": "Paragraph text..." },
    { "label": "B", "text": "Paragraph text..." }
  ],
  "statements": [
    { "text": "Statement paraphrasing one paragraph.", "answer": "C" }
  ]
}
```

规则：
- `paragraphs` 恰好 10 段，`label` 为 A–J；每段 60–110 词。
- `statements` 恰好 10 题，`answer` 为 A–J 中的一个标签。
- 每个标签至少被使用一次；可以是同一标签被多题使用（真题允许复用）。
- 陈述句必须是对某段意思的**改写**，不能直接抄句子。
- 总长度控制在 800–1000 词。

## 4. translation（翻译）

```json
{
  "id": "trans-001",
  "type": "translation",
  "level": "cet6",
  "title": "中国茶文化",
  "difficulty": 3,
  "source": "original",
  "targetWords": ["heritage", "ritual"],
  "prompt": "中文段落，140–170 字，主题为中国文化/社会/科技/教育/环境。",
  "reference": "English reference translation.",
  "keyPoints": ["要点1", "要点2", "要点3"]
}
```

规则：
- 中文段落 140–170 字，句子 5–7 句。
- `reference` 为地道英文参考译文，150–200 词。
- `keyPoints` 3–5 条，指出评分要点（如"把'…'译成被动语态"）。

## 5. writing（写作）

```json
{
  "id": "write-001",
  "type": "writing",
  "level": "cet6",
  "title": "The Value of Failure",
  "difficulty": 3,
  "source": "original",
  "targetWords": ["resilience", "setback"],
  "prompt": "Directions: For this part, you are allowed 30 minutes to write an essay on the value of failure. You should write at least 150 words but no more than 200 words.",
  "reference": "Sample essay, 170-200 words.",
  "keyPoints": ["立场明确", "两个分论点", "结论"]
}
```

规则：
- `prompt` 必须是英文指令，包含时间与字数要求。
- 题目类型在议论文 / 图表描述 / 名言评论 之间轮换。
- `reference` 170–200 词，结构清晰，用词达到六级水平。

---

## 质量红线（违反即返工）

1. **原创**：不得复制任何真题原文、网络文章段落。
2. **答案唯一且可辩护**：每题只有一个正确选项，解析能自圆其说。
3. **无事实性风险**：不写具体数字、年份、人名、机构名；用一般性表述。
4. **英文地道**：不用中式英语；句式有变化；六级词汇密度合理。
5. **JSON 合法**：双引号、无尾逗号、无注释、无 BOM。
6. **解释用中文**，且说明干扰项错在哪。
7. 不要在文件里写 markdown 代码块，直接写纯 JSON。

## 校验命令

写完后运行（在 `cet-prep/` 目录）：

```powershell
python tools/verify_content.py
```

它会逐条检查字段、数量、答案索引、占位符、bank 一致性，并打印失败明细。
