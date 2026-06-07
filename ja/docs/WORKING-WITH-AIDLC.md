# AI-DLC との連携

このガイドでは、AI-DLC(AI駆動開発ライフサイクル) を最大限に活用する方法を説明します。最初のプロンプトから動作するコードに至るまで、各ステージで AI と効果的にやり取りする方法を解説します。

各セクションの基本から始めてください。上級のヒントは実際のワークショップ経験から得られたもので、基礎に慣れたチームが最も役立つと感じたパターンを紹介しています。

---

## 目次

1. [一般ルール](#1-一般ルール)
2. [Inception フェーズ](#2-inception-フェーズ)
3. [Construction フェーズ](#3-construction-フェーズ)
4. [バイブコーディングを絶対にしない](#4-バイブコーディングを絶対にしない)

---

## 1. 一般ルール

### ファイルを変更せずに質問する

早期に身につけるべき最も重要な習慣の一つ: **すべての質問がドキュメントの更新をトリガーする必要はありません**。

質問に注意を払わずに AI に尋ねると、それを変更リクエストと解釈して設計ドキュメントをすぐに更新してしまう可能性があります。これを防ぐには、探索的な質問には変更なし指示を明確なプレフィックスとして付けてください。

**基本パターン:**

```text
Do not update any documents. Help me understand why [this decision] was made.
```

```text
Do not update any documents. For [component name], is it reasonable to use [library or technology] here?
```

```text
Do not change anything. Assess the impact of [proposed change].
I want to understand the consequences before we decide.
```

これらのパターンにより、AI と声に出して考え、選択肢を評価し、何も確定させずに決定に異議を唱えることができます。回答に満足したら、必要に応じて明確な更新指示でフォローアップしてください。

> **ヒント**: すべての探索的なメッセージを「Do not update any documents.」で始めましょう。行動する準備ができたら、その制約をいつでも外せます。

---

### 質問 → ドキュメント → 承認のフロー

AIDLC はチャット内でインラインに確認質問をしません。質問を Markdown ファイルに書き込み、そこに回答を記入するまで待ちます。これにより、すべての決定の永続的な記録が残り、チーム全体が貢献しやすくなります。

**ステップ 1 — AIDLC が質問ファイルを作成する**

AI は `aidlc-docs/inception/requirements/requirement-verification-questions.md` のようなファイルを作成して停止します。回答するまで先に進みません。

**ステップ 2 — 回答を記入する**

ファイルを開いて各 `[Answer]:` タグに記入します。質問は多肢選択形式を使用します。

```markdown
## Question: Deployment model
Where will this service be deployed?

A) AWS Lambda (serverless)

B) AWS ECS Fargate (containerized)

C) Existing on-premises infrastructure

X) Other (please describe after [Answer]: tag below)

[Answer]: B
```

回答する際にうまく機能するいくつかの点:

- **文字とともにラベルを追加する。** `C — financial summary and debt service coverage` は `C` だけよりも明確です。
- **簡単な理由を添える。** `A — design-first; generate the OpenAPI spec before writing code` は意図を確認し、AI が後続のステップで引き継ぐコンテキストを提供します。
- **両方を意味するときは選択肢を組み合わせる。** `B and C — rate limiting at both API Gateway level and application level (not D)` は明確です。
- **選択肢がほぼ正しい場合は注意書きを加える。** `B — migration is a separate project; however, include a one-time migration into the new data structures.`
- **X を積極的に使用する。** 選択肢が合わない場合は、間違った回答を無理に選ぶよりも X が正しい選択です。

**ステップ 3 — 回答の準備ができたことを AI に伝える**

チャットに戻り、「We have answered your clarification questions. Please re-read the file and proceed.」と言います。

ヒント: AI に明示的にファイルを*再読み込み*するよう求めることで、最新の編集が反映されていない可能性があるインメモリバージョンに頼るのではなく、ディスクから回答を確実に読み込みます。

**ステップ 4 — AIDLC が検証して続行する**

AI が回答を読み込み、残っているあいまいな点にフラグを立て、次の成果物の生成に進みます。

> **上級ヒント**: AI の質問に答えるドキュメントがある場合、AI 自身に解決するよう指示できます: 「Analyze the rationale for each question. If a question has already been answered through the provided documentation, answer it yourself. Only ask me if it is still unclear.」これにより、ゲートポイントでの不必要なやり取りが減ります。

**承認ゲート**

各ステージの終わりに、AIDLC は 2 つの選択肢を含む完了メッセージを提示します。

- **Request Changes** — 次に進む前に修正を依頼する
- **Approve and Continue** — 出力を受け入れて次に進む

承認する前に生成された成果物を読んでください。必要であればチームで議論してください。満足したときのみ承認してください。

---

### コンテキスト管理

コンテキストはセッションにおける AI の作業メモリです。AIDLC は一貫した下流の出力を生成するために、成果物と指示の完全な連鎖をコンテキストに持つことに依存しています。コンテキストを上手に管理することは、最も高い効果をもたらす習慣の一つです。

**核心ルール: すべての自然な意思決定ポイントでコンテキストをクリアする。**

AIDLC はゲートを中心に構築されています。つまり AI が止まって何かを尋ねる瞬間があります: 回答する質問ファイル、承認するドキュメント、レビューするプラン。これらの一時停止は単なる承認チェックポイントではありません。続行する前に新鮮なコンテキストを開始する適切な瞬間です。

ゲートでのコンテキストのクリアはリスクが低いです。AI の現在の作業はすでにファイルに保存されているためです。次のコンテキストはクリーンに開始し、関連する成果物をディスクから読み込み、以前のすべてのステップで蓄積されたノイズを持ち越さずに進行します。

複数のゲートにわたってコンテキストを蓄積させると、AI は以前の指示と成果物の圧縮された、または部分的に失われたバージョンから作業を始めます。出力品質は微妙で診断が難しい形で低下します。

**実践的に:**

- AI に質問ファイルへの回答を求められた場合 — 質問に回答し、**新しいコンテキストを開始**して AI にファイルを再読み込みして続行するよう伝える
- AI がドキュメントを提示して承認を求めた場合 — レビューし、**新しいコンテキストを開始**して変更を依頼するか承認して進む
- ツールがワークフローの途中で「コンテキストのコンパクト化」プロンプトを提供した場合 — **常に断る** — コンパクト化はクリーンなリセットと同じではなく、保存するより多くのものを失います

**コンテキストのリセット後の再開方法:**

オプション 1 — 状態ファイルメソッド（推奨）:

```text
Go to aidlc-docs/aidlc-state.md, find the first unchecked item,
then go to the corresponding plan file and resume from that point.
```

オプション 2 — 手動ハンドオフ:

```text
I am resuming a previously stopped conversation. Here is the context:
[paste summary of last output or recent change]
Please continue with [next action or section X].
```

> **ヒント**: コンテキストをリセットするたびに現在のすべての変更をリポジトリにコミットしてプッシュしてください。数秒で完了し、常にクリーンな回復ポイントを持てます。

```text
Please commit and push all current changes to the repository.
```

---

### プロンプトのバッチ処理

すべてのプロンプトを個別に送信する必要はありません。ワークショップ経験からのシンプルなルール:

**2 つの変更が同じ対象に密接に結びついている場合は、1 つのプロンプトに両方を含める。2 つの変更が無関係の場合は、一度に 1 つずつ行う。**

過剰なバッチ処理（無関係な変更の組み合わせ）は、AI の焦点を失わせて詳細を見逃させます。過少なバッチ処理（密接に関連することを別々のプロンプトで）は不要なやり取りを増やします。迷った場合は、分離する方向に傾いてください。

---

### 外部参照ファイルの読み込み

AIDLC に既存のドキュメント（スキーマ、アーキテクチャ図、データ辞書、API 仕様など）を指示することで、そのコンテンツを現在のステージに組み込めます。

**基本パターン:**

```text
Please read [file path or description]. Use it as the basis for [what you want].
```

```text
We have an existing audit table structure. Please add it to the inception documents
and reference it for this service. When we proceed, expect new requirements and
stories related to this service.
```

> **上級ヒント**: ドキュメントはどのステージでも読み込むことができます。最初だけではありません。Construction 中に新しい制約が生じた場合（更新されたセキュリティポリシー、修正されたデータモデルなど）、それを読み込んで進行前に AIDLC に影響を評価させてください。
>
> **上級ヒント — エンタープライズ標準を拡張として**: 組織がすべてのプロジェクトに適用すべきセキュリティ、コンプライアンス、または API ガイドラインを持っている場合、それらを `aidlc-rules/extensions/` 内の Markdown の steering(英語のまま) ファイルとして追加してください。AIDLC は手動による注入を必要とせず、すべてのフェーズに自動的に読み込みます。

---

### 独立した批評を得る

AIDLC は自身の以前の決定を擁護します。成果物の偏りのない評価を求める場合は、**新しいコンテキスト**で批評を依頼してください。その決定をなぜ行ったかの記憶が AI にない状態で行います。

```text
Produce a critique document of [the requirements document / the component design].
Do this in a new context separate from everything else.
```

これにより、成果物が作成されたのと同じセッションで批評を依頼するよりも、より有用で客観的なフィードバックが得られます。

---

### 深度レベル

AIDLC はリクエストの複雑さに基づいて各ステージの実行の深さを適応させます。これに影響を与えることができます。

```text
Keep this at minimal depth — we just need the basic structure documented.
```

```text
This is a production-critical component. Please run at comprehensive depth.
```

---

## 2. Inception フェーズ

Inception フェーズは、設計やコード作業が始まる前に、あなたと AI が*何を構築し、なぜ構築するか*について合意する場所です。ここに持ち込むコンテキストが多ければ多いほど、Construction での確認質問や手戻りが少なくなります。

### 開始前に入力を準備する

AIDLC を開始する前にできる最も効果的なことは、次の 2 つのドキュメントを準備することです。

1. **ビジョンドキュメント** — 何を構築し、なぜ構築するか
2. **技術環境ドキュメント** — どのツールと制約が適用されるか

これらのドキュメントにより、AIDLC が尋ねる確認質問の数が大幅に減り、AI がチームの想定から外れた前提を立てるのではなく、実際のコンテキストから開始できます。

**どこから始めるか:**

- [writing-inputs/inputs-quickstart.md](writing-inputs/inputs-quickstart.md) — グリーンフィールドとブラウンフィールド両方のクイックサマリー
- [writing-inputs/vision-document-guide.md](writing-inputs/vision-document-guide.md) — テンプレート付きの完全なビジョンガイド
- [writing-inputs/technical-environment-guide.md](writing-inputs/technical-environment-guide.md) — テンプレート付きの完全な技術環境ガイド

**ブラウンフィールドプロジェクト**（既存のコードベースへの追加）には若干異なる入力が必要です。ビジョンドキュメントには現在の状態の説明と変更してはならないことの明確なリストが必要です。技術環境ドキュメントは希望するものではなく既存のスタックを説明する必要があり、サンプルコードは実際の既存ファイルから持ってくる必要があります。ブラウンフィールドの最小要件と実例については [writing-inputs/inputs-quickstart.md](writing-inputs/inputs-quickstart.md) を参照してください。

**素早く開始したい場合の最小限の入力:**

ビジョンについて: 何を誰のために構築しているかを説明する 1 段落、スコープ内の MVP 機能リスト、明示的にスコープ外の機能リスト、および未解決の質問（すでに不確実だとわかっていること）。未解決の質問は要件分析に事前宣言されたあいまいさとして直接入力されるため、設計の途中でサプライズとして表面化するのではなく、早期に解決されます。

技術環境について: 言語とバージョン、パッケージマネージャー、Web フレームワーク、クラウドプロバイダーとデプロイメントモデル、テストフレームワーク、禁止ライブラリテーブル（各エントリに理由と推奨代替手段を含む）、セキュリティの基本、および典型的なエンドポイント、関数、テストのサンプルを少なくとも 1 つずつ。

禁止ライブラリテーブルは単純なリストよりも重要です — 理由と代替手段の列は AI-DLC にライブラリが禁止されている*理由*を伝え、より良い代替手段の決定につながります。サンプルコードパターンは基本を超えた最も高い効果をもたらす追加要素です。AI-DLC がコード生成中に独自のパターンを発明するのではなく、従うべき具体的なパターンを提供します。

> **ヒント**: 事前に埋めたすべてのギャップは、要件分析中の確認質問が 1 つ減ることを意味します。

---

### 新しいプロジェクトを開始する

入力ドキュメントの準備ができたら:

```text
I want to start a new project. Please read [path to vision document] and
[path to technical environment document], then begin the AIDLC workflow.
```

AIDLC はワークスペースをスキャンし、グリーンフィールドかブラウンフィールドかを判断し、ドキュメントを主要なソースとして使用して要件分析に進みます。カバーされていない内容についてのみ質問します。

ブラウンフィールドプロジェクトの場合、AIDLC は最初にリバースエンジニアリングを実行し、既存のコードベースを分析してアーキテクチャ、コンポーネント、API ドキュメントを生成します。これらの成果物を注意深くレビューしてください。後続のすべての基盤になります。

---

### 要件に関する質問への回答

文字、ラベルの追加、選択肢の組み合わせ、カスタム回答のための X の使用に関する完全なガイダンスについては [セクション 1](#質問--ドキュメント--承認のフロー) の回答ヒントを参照してください。要件分析に特有のいくつかの追加ポイント:

- **全ビジョンと MVP を明示的に分離する。** AIDLC が含めるべき機能を尋ねた場合は、名前を挙げてください。スコープ外のものはそう言ってください。あいまいにしないでください。
- **意図的な「ノー」の決定を明確に述べる。** `D — no caching required at this time` は意図を示します。空の回答は AI に推測の選択をする余地を与えます。
- **段階的なアプローチをインラインで説明する。** `X — simple role-based workflow now; replace with external workflow engine when available` は、適切な拡張ポイントを持つ現在のソリューションを AIDLC が設計できるようにします。

> **上級ヒント — セキュリティ拡張**: 要件分析中に、AIDLC はセキュリティ拡張ルールを適用するかどうかを尋ねます。本番グレードのアプリケーションの場合は「はい」を選択してください。プロトタイプの場合は「いいえ」で構いません。この決定は記録されて Construction 全体を通じて適用されるため、意図的に選択してください。

---

### Inception フェーズ特有のやり取り

**途中で機能を延期する:**

```text
We are going to backlog the [feature name] capability for the current release.
Please remove it from the component design and flag the related user stories as backlogged.
```

削除するのではなくバックログに入れることで、現在のビルドに影響を与えることなく将来のイテレーションのために作業を保持します。

**既存のデータ構造を登録する:**

```text
We have an existing [schema/structure name]. Please add it to the inception documents
and reference it for this service. When we proceed, expect new requirements and
stories related to this service.
```

**暗黙のデータソースを明示する:**

```text
For the [service name], add the understanding that [new data source] is also a
data source for this feature, in addition to [existing data source]. Then review
requirements and user stories to ensure this is captured.
```

**設計変更後の上流への影響を確認する:**

設計成果物に意味のある変更を加えた後は、以前のドキュメントがまだ一貫しているか AIDLC に確認させてください:

```text
Now review the previous steps — user stories and requirements — to ensure
this change does not require updates to any of those documents.
```

> **上級ヒント — 定常的な逆伝播ルール**: 変更のたびに尋ねる代わりに、フェーズの開始時に定常的な指示として設定してください: 「Every time you update a document, check whether the change impacts the requirements document and user stories, and prompt me if it does.」これにより、毎回覚えておく必要なく自動的なセーフティネットが作成されます。

**コンポーネント設計のチームによる並行レビュー:**

チームが異なるコンポーネントを同時にレビューするために分かれる場合:

```text
Restrict your edits to the files under your team's control. When all teams are done,
we will ask the AI to review all changes and confirm there are no conflicts.
Then we will ask it to review impacts to user stories and requirements.
```

全員が完了したら、コンフリクトチェックをトリガーします:

```text
We had [N] independent groups editing component design files. Please review all files
and report any conflicts or inconsistencies. Do not edit the files — produce a report
for our review.
```

各コンフリクトを番号で明示的に解決します:

```text
For conflict #[number] ([conflict description]):
update [target file] to reflect [your decision].
```

```text
For conflict #[number] ([capability name]):
this capability is backlogged. Update the documentation to clearly mark it as
backlogged so code generation does not attempt to implement it.
```

**古い設計ファイルをアーカイブする:**

設計中の探索で生成されたがもはや必要でないファイルがある場合:

```text
Move the [file descriptions] to an archive folder — do not delete them.
Then confirm whether they are required for code generation.
```

> **上級ヒント — コンポーネントサイズの制約**: 1 スプリントで実装するには大きすぎるコンポーネントを防ぎたい場合は、アプリケーション設計中にストーリーポイントの上限を設定してください: 「At the component design phase, inject the following instruction: no single component should have more than [X] aggregate story points. If a component exceeds this limit, break it down into smaller sub-components.」
>
> **上級ヒント — フェーズ途中のコンテキストリセット**: セッションが中断された場合は、これを使って状態を再確立してください:
>
> ```text
> Stop. New context. We just completed [description of recent work].
> Please review [upstream artifacts] to assess any impact of the recent change.
> [Paste the change description here.]
> ```

---

## 3. Construction フェーズ

Construction フェーズは設計がコードになる場所です。各作業単位(unit of work)は、コード生成（常に実行）の前に一連の設計ステージ（条件付き）を経ます。すべてのユニットが完了した後、ビルドとテストが作業を締めくくります。

### 設計レビュープロセス

各作業単位(unit of work)について、AIDLC はコードを生成する前に以下の設計ステージのいくつかまたはすべてを実行する場合があります:

- **機能設計** — ビジネスロジック、ドメインモデル、データスキーマ
- **NFR 要件** — パフォーマンス、セキュリティ、スケーラビリティ、技術スタックの選定
- **NFR 設計** — 設計への NFR パターンの適用
- **インフラストラクチャ設計** — 実際のクラウドサービスへの設計マッピング

各ステージは `aidlc-docs/construction/{unit-name}/` 内のドキュメントを生成します。各ゲートでのあなたの仕事は、ドキュメントを読んで決める: 変更を依頼するか、承認するか。

**承認する前に読む。** 設計ドキュメントはコード生成の真実の源です。ここでスリップしたミスは後で修正するのが難しくなります。

**設計からコードへの移行:**

コード生成に移行する準備ができたら、AI に最初から必要な構造コンテキストを提供してください:

```text
We have completed component design review. We are ready for code creation.
Please use the following directory and source code structure:
[reference an existing service or folder structure].
Use this pattern for APIs. For the UI, follow the [Vue.js composables/components/store]
directory structure. Please ask any questions you have before proceeding.
```

生成が始まる前に質問を招くことで、ファイル作成の途中ではなく計画段階でのあいまいさを解決できます。

**対象を絞った修正を依頼する:**

正確に — 要素名、何が間違っているか、何であるべきかを名前で指定してください:

```text
The [endpoint description] should use [correct parameter], not [incorrect parameter].
Please update the [component name] accordingly.
```

**AI が提示した選択肢から選ぶ:**

```text
Please implement Option B — [option description] — for [feature name].
Update all component design documents accordingly.
```

選択肢を文字と説明の両方で参照し、質問が生じた 1 つのドキュメントだけでなく、影響を受けるすべてのドキュメントへの更新を明示的にスコープしてください。

**設計パターンをオーバーライドする:**

```text
We prefer to deviate from [standard pattern] and use [our preferred approach]
to allow [rationale]. Please update the component design documents accordingly.
```

理由は重要です。AIDLC はそれを後のステージに引き継ぎ、逸脱が静かに元に戻されることを防ぎます。

> **上級ヒント — コミットする前の影響評価**: 重大な設計変更については、行動する前に評価してください:
>
> ```text
> Do not change anything. Assess the impact of [proposed change].
> [Describe the proposed change in detail.]
> ```
>
> **上級ヒント — インラインコードドキュメント**: すべてのユニットに一貫してインラインドキュメントを適用したい場合は、ユニットごとに繰り返すのではなく Construction フェーズの開始時に定常的なルールとして追加してください: 「Add inline code documentation as a standard rule for the construction phase.」

---

### コード生成プロセス

コード生成には 2 つの異なる部分があります。どちらも明示的な承認が必要です。

**パート 1 — 計画**

AIDLC は作成または変更するすべてのファイルの番号付き、チェックボックス追跡の計画を作成します。承認する前にこの計画をレビューしてください。確認事項:

- すべてのファイルが正しい場所にある（アプリケーションコードはワークスペースのルート、`aidlc-docs/` 内ではない）
- ステップが設計ドキュメントで指定されたすべてをカバーしている
- ブラウンフィールドプロジェクトでは、元のファイルの隣に新しい重複ではなく、変更する既存ファイルがリストされている

> **上級ヒント — 内部ライブラリ**: 計画を承認する前に、Q&A ファイルまたは実装計画に内部ライブラリの要件を注入してください:
>
> ```text
> In addition to my answers, you must use the following libraries from our
> [starter project / building blocks]: [list each library explicitly].
> Explain why and when each should be used, not just what it is.
> ```
>
> 内部ライブラリへのキュレーションされた Markdown ガイドは、AI をリポジトリに指示するよりも効果的です。作成してコード生成の入力として参照してください。
>
> **上級ヒント — Figma デザインからの UI**: Figma デザインのスクリーンショットを撮り、ビジョン対応モデル（例: ChatGPT）に渡してスクリーンショットからフレームワークコードを生成させ、その出力を UI 実装の入力として AIDLC に提供してください。これにより、生のデザインツールのエクスポートではなく、具体的なツールが読める仕様が生成されます。

**パート 2 — 生成**

AIDLC は各ステップを順番に実行し、完了するたびに各ステップにチェックを入れます。すべてのステップが完了すると、生成されたファイルへのパスとともに完了メッセージを提示します。

承認する前に生成されたコードをレビューしてください。何かが正しくない場合:

```text
Request Changes: [describe specifically what needs to change]
```

> **上級ヒント — ブラウンフィールドのファイル変更**: 既存のコードベースでは、AIDLC はファイルをその場で変更します。元のファイルの隣に `ClassName_modified.java` や `service_new.ts` が表示された場合は、すぐにフラグを立ててください:
>
> ```text
> I see [ClassName_modified.java] alongside [ClassName.java]. Please merge the changes
> into the original file and delete the duplicate.
> ```

---

### ビルドとテスト

すべてのユニットが完了した後、AIDLC はすべてのユニットのビルドとテストの指示を生成します。知っておく価値のあるいくつかのパターン:

**適切なタイミングでのテストツールの注入:**

プロジェクト開始時にテストフレームワークやテスト管理システムの指示を追加しないでください。コード生成が始まる頃には、多くの介在するステージを経て、それらの詳細が圧縮または失われている可能性があります。Just-in-time に注入してください:

```text
At the functional test generation step, inject the following instruction:
generate functional tests using the [test management system] format described
in this document: [attach specification]. Use this API endpoint to push the
generated test cases to the [test management system] repository: [endpoint details].
```

この原則はツール固有の指示すべてに適用されます: プロジェクト開始時ではなく、必要なフェーズで注入してください。

**ユニットテストカバレッジのスコープ設定:**

```text
When generating unit tests, exclude third-party external dependencies from
code coverage calculations. Require a minimum of 80% coverage on internal
code paths only.
```

---

### コード生成後: 変更の逆伝播

コード生成中に行われた変更（小さな設計上の決定、コードを書く中で発見された調整）を設計ドキュメントに戻す必要があります。アドホックではなく、コードの調整が完了した後に意図的なスイープとして行ってください:

```text
When you have finished polishing the code, review each unit's final design files
and propagate any changes back up the chain to requirements and user stories.
Make a plan for how to do this step by step before executing.
```

実行前に計画を求めることで、スイープがすべてのユニットにわたって選択的ではなく体系的になります。

> **上級ヒント — 再利用可能な仕様の抽出**: 完成したプロジェクトの終わりに、確立したパターンを将来のプロジェクト向けの再利用可能な仕様ドキュメントに抽出してください:
>
> ```text
> Create a set of reusable specification documents from the patterns expressed
> in this project: one for API design, one for security, one for UI specifications,
> one for the technology stack, and one for directory structure. Use the completed
> units as the source. I will review and approve each document before it is used
> in future projects.
> ```

---

## 4. バイブコーディングを絶対にしない

バイブコーディングとは、設計ドキュメントを完全にバイパスして、クイックフィックスや試行のために生成されたコードファイルを直接編集することです。その瞬間は速く感じられますが、すぐに問題が生じます。

問題は編集そのものではありません。AIDLC がすべての後続操作に使用する真実の源である設計ドキュメントが、コードが実際に何をするかを反映しなくなることです。AIDLC が関連するユニットのコード生成を次に実行するとき、またはセッションを再開するとき、または同僚が作業を引き継ぐとき、この乖離が混乱と手戻りを引き起こします。

あるチームはワークショップ中に直接的に表現しました:

> 「コードを直接修正することは絶対にしない。問題を発見したら、AIDLC に戻って言う: 私は問題 X を発見しました。設計をレビューして修正する計画を立ててください。これが設計に影響する場合は更新し、そのあとコードを更新してください。」

**ルール: まず設計を更新し、それからコードを生成する。**

---

### 変更を行う正しい方法

バグを見つけた、設計上の決定について考えが変わった、または新しい要件を受け取った場合でも、フローは同じです:

**ステップ 1 — 何も触れずに問題を説明する:**

```text
Do not update any documents yet. I have discovered issue [X].
Review the design and help me understand where this needs to be addressed.
```

**ステップ 2 — 設計ドキュメントを修正する:**

```text
Please update [specific design document] to reflect [the fix].
Then check whether any upstream documents — requirements, user stories —
also need to be updated.
```

**ステップ 3 — 影響を受けるコードを再生成する:**

```text
The design for [unit name] has been updated. Please re-run code generation
for the affected files only.
```

このフローは、ファイルを直接編集するよりも数分余分にかかります。ドキュメントを同期させ、監査証跡を完全に保ち、チームが実際に何が構築されたかについて整合させます。

---

### 「ファイルをただ編集したい」と思うとき

**「1 行の修正だけだ。」**

設計をバイパスする 1 行の修正でもドリフトを生じさせます。関連する設計ドキュメントに修正をメモし、AIDLC に適用させてください:

```text
In [functional-design.md for unit X], update [method or rule] to [the fix].
Then regenerate [the affected file].
```

**「ただ探索しているだけ — まだ何も確定していない。」**

探索はまさに「Do not update any documents」のためにあります。チャットで自由に探索してください。準備ができたときにのみコミットしてください。

**「今すぐチームのブロックを解除する必要がある。」**

時には速く動く必要があります。直接編集を行った場合は、監査証跡を正確に保つために正直に記録してください:

```text
We made a temporary direct edit to [file] to unblock the team.
The fix was [description]. Please update [design document] to reflect this
and verify no other documents are inconsistent.
```

---

### ドリフトを防ぐ定常ルール

Construction フェーズの開始時に設定できる 2 つの定常指示で、毎回覚えておく必要なく早期に問題を検出できます:

**すべての更新での逆伝播:**

```text
Every time you update a document, check whether the change impacts the
requirements document and user stories, and prompt me if it does.
```

**すべてのコード決定でのデザインファースト:**

```text
When you make a design decision during code generation, always make sure
the documentation reflects this change before proceeding.
```

Construction の開始時にこれらを一度設定すれば、フェーズ全体に適用されます。

---

### レポートを aidlc-docs に保存しない

実用的なメモ: AIDLC に人間向けのレポート（アーキテクチャ図、コンポーネントのサマリー、ステークホルダー向けプレゼンテーション）を生成させる場合は、`aidlc-docs/` に保存しないでください。これらのファイルは後のステージで成果物として読み込まれ、トークン数を膨らませ、何が権威ある設計入力であるかについて AI を混乱させる可能性があります。

別の `reports/` フォルダを使用し、よりクリーンな出力のために、専用のレポート仕様ファイルとともに新しいコンテキストでレポートを生成してください:

```text
Pause the process. Start a new context. Read [report specification markdown file]
and produce the report based on the current state of the AIDLC artifacts.
Save the output to a reports/ folder, not aidlc-docs/.
```

---

*入力ドキュメントの準備に関するガイドについては、[writing-inputs/inputs-quickstart.md](writing-inputs/inputs-quickstart.md) を参照してください。*
