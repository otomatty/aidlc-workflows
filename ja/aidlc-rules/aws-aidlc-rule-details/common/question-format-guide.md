# 質問フォーマットガイド

## 必須：すべての質問はこのフォーマットを使用すること

### ルール：チャット内で質問しないこと
**重要**：チャット内で直接質問してはならない。すべての質問は専用の質問ファイルに配置すること。

### 質問ファイルのフォーマット

#### ファイル命名規則
- 説明的な名前を使用する：`{phase-name}-questions.md`
- 例：
  - `classification-questions.md`
  - `requirements-questions.md`
  - `story-planning-questions.md`
  - `design-questions.md`

#### 質問の構造
すべての質問には意味のある選択肢と最後の選択肢として「Other」を含める：

```markdown
## Question [Number]
[明確で具体的な質問文]

A) [最初の意味のある選択肢]

B) [2番目の意味のある選択肢]

[...必要に応じて追加の選択肢...]

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```

**重要**：
- すべての質問の最後の選択肢として「Other」は必須である
- 意味のある選択肢のみを含める―スロットを埋めるために選択肢を作り出さない
- 意味をなす範囲で選択肢の数は自由（最低2つ＋Other）
- **各選択肢は空行で区切ること**（IntelliJ、PyCharmなどの厳格なCommonMarkレンダラーが段落として折りたたまずに別々の行として表示できるよう）

### 完全な例

```markdown
# Requirements Clarification Questions

Please answer the following questions to help clarify the requirements.

## Question 1
What is the primary user authentication method?

A) Username and password

B) Social media login (Google, Facebook)

C) Single Sign-On (SSO)

D) Multi-factor authentication

E) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 2
Will this be a web or mobile application?

A) Web application

B) Mobile application

C) Both web and mobile

D) Other (please describe after [Answer]: tag below)

[Answer]: 

## Question 3
Is this a new project or existing codebase?

A) New project (greenfield)

B) Existing codebase (brownfield)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
```

### ユーザーの回答フォーマット
ユーザーは [Answer]: タグの後に選択肢の文字を記入して回答する：

```markdown
## Question 1
What is the primary user authentication method?

A) Username and password

B) Social media login (Google, Facebook)

C) Single Sign-On (SSO)

D) Multi-factor authentication

[Answer]: C
```

### ユーザーの回答を読む
ユーザーが完了を確認した後：
1. 質問ファイルを読み込む
2. [Answer]: タグ以降の回答を抽出する
3. すべての質問に回答が得られていることを確認する
4. 回答に基づいて分析を進める

### 多肢選択のガイドライン

#### 選択肢の数
- 最小：意味のある選択肢2つ＋「Other」（A、B、C）
- 標準：意味のある選択肢3〜4つ＋「Other」（A、B、C、D、E）
- 最大：意味のある選択肢5つ＋「Other」（A、B、C、D、E、F）
- **重要**：スロットを埋めるために選択肢を作り出さないこと―意味のある選択肢のみを含める

#### 選択肢の質
- 選択肢を相互排他的にする
- 最も一般的なシナリオをカバーする
- 意味があり現実的な選択肢のみを含める
- **「Other」は必ず最後の選択肢とすること**（必須）
- 具体的かつ明確にする
- **A、B、C、Dのスロットを埋めるための選択肢を作り出さない**

#### よい例：
```markdown
## Question 5
What database technology will be used?

A) Relational (PostgreSQL, MySQL)

B) NoSQL Document (MongoDB, DynamoDB)

C) NoSQL Key-Value (Redis, Memcached)

D) Graph Database (Neo4j, Neptune)

E) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 悪い例（避けること）：
```markdown
## Question 5
What database will you use?

A) Yes

B) No

C) Maybe

[Answer]: 
```

### ワークフローへの統合

#### ステップ1：質問ファイルを作成する
```markdown
Create aidlc-docs/{phase-name}-questions.md with all questions
```

#### ステップ2：ユーザーに伝える
```
"I've created {phase-name}-questions.md with [X] questions. 
Please answer each question by filling in the letter choice after the [Answer]: tag. 
If none of the options match your needs, choose the last option (Other) and describe your preference. Let me know when you're done."
```

#### ステップ3：確認を待つ
ユーザーが「done」「completed」「finished」または同様の言葉を言うまで待つ。

#### ステップ4：読み込んで分析する
```
Read aidlc-docs/{phase-name}-questions.md
Extract all answers
Validate completeness
Proceed with analysis
```

### エラー処理

#### 回答が欠落している場合
いずれかの [Answer]: タグが空の場合：
```
"I noticed Question [X] is not answered. Please provide an answer using one of the letter choices 
for all questions before proceeding."
```

#### 無効な回答の場合
回答が有効な文字の選択肢でない場合：
```
"Question [X] has an invalid answer '[answer]'. 
Please use only the letter choices provided in the question."
```

#### 曖昧な回答の場合
ユーザーが文字の代わりに説明文を提供した場合：
```
"For Question [X], please provide the letter choice that best matches your answer. 
If none match, choose 'Other' and add your description after the [Answer]: tag."
```

### 矛盾と曖昧さの検出

**必須**：ユーザーの回答を読んだ後、矛盾と曖昧さを必ず確認すること。

#### 矛盾の検出
論理的に矛盾する回答を探す：
- スコープの不一致：「バグ修正」だが「コードベース全体に影響する」
- リスクの不一致：「低リスク」だが「破壊的変更を伴う」
- タイムラインの不一致：「素早い修正」だが「複数のサブシステムに関わる」
- 影響の不一致：「単一コンポーネント」だが「大きなアーキテクチャの変更を伴う」

#### 曖昧さの検出
不明確または境界線上の回答を探す：
- 複数の分類に当てはまる可能性がある回答
- 具体性を欠く回答
- 複数の質問間で指標が矛盾している

#### 確認質問の作成
矛盾や曖昧さが検出された場合：

1. **確認ファイルを作成する**：`{phase-name}-clarification-questions.md`
2. **問題を説明する**：検出された矛盾/曖昧さを明確に述べる
3. **的を絞った質問をする**：問題を解決するために多肢選択フォーマットを使用する
4. **元の質問を参照する**：どの質問の回答が矛盾していたかを示す

**例**：
```markdown
# [Phase Name] Clarification Questions

I detected contradictions in your responses that need clarification:

## Contradiction 1: [Brief Description]
You indicated "[Answer A]" (Q[X]:[Letter]) but also "[Answer B]" (Q[Y]:[Letter]).
These responses are contradictory because [explanation].

### Clarification Question 1
[Specific question to resolve contradiction]

A) [Option that resolves toward first answer]

B) [Option that resolves toward second answer]

C) [Option that provides middle ground]

D) [Option that reframes the question]

[Answer]: 

## Ambiguity 1: [Brief Description]
Your response to Q[X] ("[Answer]") is ambiguous because [explanation].

### Clarification Question 2
[Specific question to clarify ambiguity]

A) [Clear option 1]

B) [Clear option 2]

C) [Clear option 3]

D) [Clear option 4]

[Answer]: 
```

#### 確認のワークフロー

1. **検出する**：すべての回答で矛盾/曖昧さを分析する
2. **作成する**：問題が見つかった場合は確認質問ファイルを生成する
3. **伝える**：問題と確認ファイルについてユーザーに知らせる
4. **待つ**：ユーザーが確認を提供するまで進めない
5. **再検証する**：確認後、一貫性を再度確認する
6. **進める**：すべての矛盾が解消された場合のみ先に進む

#### ユーザーへのメッセージ例
```
"I detected 2 contradictions in your responses:

1. Bug fix scope vs. codebase impact (Q1 vs Q2)
2. Low risk vs. breaking changes (Q7 vs Q4)

I've created classification-clarification-questions.md with 2 questions to resolve these.
Please answer these clarifying questions before I can proceed with classification."
```

### ベストプラクティス

1. **具体的であること**：質問は明確で曖昧さがないこと
2. **包括的であること**：必要な情報をすべてカバーすること
3. **簡潔であること**：質問は1つのトピックに絞ること
4. **実践的であること**：選択肢は現実的かつ実行可能であること
5. **一貫性を保つこと**：すべての質問ファイルで同じフォーマットを使用すること

### フェーズ別の例

#### 意味のある選択肢が2つの例：
```markdown
## Question 1
Is this a new project or existing codebase?

A) New project (greenfield)

B) Existing codebase (brownfield)

C) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 意味のある選択肢が3つの例：
```markdown
## Question 2
What is the deployment target?

A) Cloud (AWS, Azure, GCP)

B) On-premises servers

C) Hybrid (both cloud and on-premises)

D) Other (please describe after [Answer]: tag below)

[Answer]: 
```

#### 意味のある選択肢が4つの例：
```markdown
## Question 3
What architectural pattern should be used?

A) Monolithic architecture

B) Microservices architecture

C) Serverless architecture

D) Event-driven architecture

E) Other (please describe after [Answer]: tag below)

[Answer]: 
```

## まとめ

**覚えておくこと**：
- ✅ 常に質問ファイルを作成する
- ✅ 常に多肢選択フォーマットを使用する
- ✅ **「Other」は必ず最後の選択肢にする（必須）**
- ✅ 意味のある選択肢のみを含める―スロットを埋めるために選択肢を作り出さない
- ✅ 常に [Answer]: タグを使用する
- ✅ 常にユーザーの完了を待つ
- ✅ 常に矛盾がないか回答を検証する
- ✅ 必要であれば常に確認ファイルを作成する
- ✅ 常に矛盾を解消してから進める
- ❌ チャット内で質問しない
- ❌ A、B、C、Dのスロットを埋めるために選択肢を作り出さない
- ❌ 回答なしに進めない
- ❌ 未解消の矛盾がある状態で進めない
- ❌ 曖昧な回答について仮定を行わない
