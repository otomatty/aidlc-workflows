# Inception Phase -- Stage Reference (2.1--2.9)

## Phase Overview

Inception は、AI-DLC 方法論の 5 フェーズのうち 3 番目です。Ideation が捉えたビジネスインテントとスコープを、具体的な技術成果物へ落とします。brownfield 向けのリバースエンジニアリング、チームのプラクティスと運用ルール、正式な要件、ユーザーストーリー、洗練したモック、アプリケーションアーキテクチャ、作業ユニットへの分解、そして Construction を支配するデリバリー計画です。

Inception はステージ 2.1 から 2.9（9 ステージ）を走り、Construction へ渡す前にステージ 2.9（Delivery Planning）でフェーズ境の検証をします。

> **Path convention.** 各ワークフローの成果物は **インテントのレコードディレクトリ** の下に置きます — `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（`<space>` は非既定スペースを使っていなければ `default`。`<YYMMDD>` は UTC の短い日付接頭辞で、レコードが時系列に並ぶ。`<label>` はリクエストの本質を短い kebab-case にしたもの。同日の衝突は数値カウンタ）。衝突しない正本の id は、`intents.json` のレジストリ行に残る UUIDv7 です。ディレクトリ名は人が読むラベルにすぎません。以降、`<record>/` はそのディレクトリの略です。例:
> `<record>/inception/requirements-analysis/requirements.md` は
> `aidlc/spaces/default/intents/<YYMMDD>-<label>/inception/requirements-analysis/requirements.md` に展開します。
> Reverse Engineering の出力だけ例外で、インテントレコードの外、リポジトリごとの残るストア
> `aidlc/spaces/<active-space>/codekb/<repo>/` に置きます。
> （インテントごとの配置より前に作ったプロジェクトは平らな木でした。エンジンは初回実行で移行します。）

このフェーズには、派遣トポロジが 3 つあります。ステージ 2.1 の 2 段 Reverse Engineering パイプライン、ステージ 2.2 の Practices Discovery ハブ＆スポーク、ステージ 2.4 の User Stories モブです。

**Inception フェーズの要点:**

- フェーズは技術発見のステージ（2.1 Reverse Engineering）から始まり、2 段パイプラインを使います。続けて方法論発見のステージ（2.2 Practices Discovery）がサブエージェントのハブ＆スポークを使い、そのあとインラインの要件ステージ、モブのストーリーステージ、インラインの設計・計画ステージ 5 つです。
- ステージ 2.1 は 2 段パイプラインです。aidlc-developer-agent がコードをスキャンし、aidlc-architect-agent がスキャンを 9 つの構造化成果物へ合成します。人が再利用、置き換えるフル再スキャン、焦点スキャン（共有ストアへ知識を累積マージ）のどれかを選ぶ前に、各 brownfield リポジトリの既存ストアを見ます。
- ステージ 2.2 は greenfield でも brownfield でも同じトポロジです。pipeline-deploy のリード下書き、互いに見えない quality / developer / devsecops のスポーク、人へのインタビュー、リード統合。確認すると、内容は `<record>/inception/practices-discovery/` からスペースのメモリ層 — `aidlc/spaces/<active-space>/memory/team.md` と `project.md` — へ昇格します。この行をまたぐ昇格が、このステージをほかのどのステージとも構造的に分けます。
- ステージ 2.7 は `unit-of-work.md` を出します。Construction フェーズの段階的な構築の流れを駆動するユニットを定義します。
- ステージ 2.9 は承認済みのボルト計画（経済的な並び、複数ユニットのまとめ、DoD、確信度の仮説、オーナーシップ）を出します。それは計画の中身です。Construction の実行時バッチは `unit-of-work-dependency.md`（2.7）から出ます。ステージ 2.9 は、チームの Way of Working、Walking Skeleton の姿勢、Deployment の節を `aidlc/spaces/<active-space>/memory/{org,team,project}.md` から読みます。
- ステージ 2.9 のフェーズ境検証は、Requirements → Stories → Architecture の整合を見ます。

**スコープによるステージの所属:**

| Scope            | Stages Included                                                |
|------------------|----------------------------------------------------------------|
| enterprise       | All 2.1--2.9                                                   |
| feature          | All 2.1--2.9                                                   |
| mvp              | 2.1 (if brownfield), 2.2, 2.3, 2.4, 2.5 (if UI), 2.6, 2.7, 2.8, 2.9 |
| poc              | 2.1 (if brownfield), 2.3 (minimal)                             |
| bugfix           | 2.1 (always -- find the bug), 2.3 (minimal -- bug description) |
| refactor         | 2.1 (always -- understand current code), 2.3 (minimal)         |
| infra            | 2.2, 2.3 (infra requirements)                                  |
| security-patch   | 2.1 (find vulnerability context), 2.3 (minimal)                 |
| classic          | 2.1--2.9                                                       |
| workshop         | 2.1--2.9                                                       |
| express          | 2.1 (if brownfield), 2.3                                      |

---

## Stage Summary Table

| Stage | Name                   | Condition   | Lead Agent             | Support Agents                                       | Mode                             |
|-------|------------------------|-------------|------------------------|------------------------------------------------------|----------------------------------|
| 2.1   | Reverse Engineering    | CONDITIONAL | aidlc-developer-agent        | aidlc-architect-agent                                      | pipeline (aidlc-developer-agent → aidlc-architect-agent, 2-link chain) |
| 2.2   | Practices Discovery    | CONDITIONAL | aidlc-pipeline-deploy-agent  | aidlc-quality-agent, aidlc-developer-agent, aidlc-devsecops-agent      | subagent (hub-and-spoke on greenfield and brownfield) |
| 2.3   | Requirements Analysis  | ALWAYS      | aidlc-product-agent          | --                                                   | inline                           |
| 2.4   | User Stories           | CONDITIONAL | aidlc-product-agent          | aidlc-design-agent, aidlc-developer-agent, aidlc-quality-agent | mob                              |
| 2.5   | Refined Mockups        | CONDITIONAL | aidlc-design-agent           | aidlc-product-agent                                        | inline                           |
| 2.6   | Domain Design     | CONDITIONAL | aidlc-architect-agent        | aidlc-aws-platform-agent, aidlc-design-agent               | inline                           |
| 2.7   | Units Generation       | ALWAYS      | aidlc-architect-agent        | aidlc-delivery-agent                                       | inline                           |
| 2.8   | Contract Design        | CONDITIONAL | aidlc-architect-agent        | aidlc-aws-platform-agent                                   | inline                           |
| 2.9   | Delivery Planning      | ALWAYS      | aidlc-delivery-agent         | aidlc-architect-agent                                      | inline                           |

---

## Stage 2.1: Reverse Engineering

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.1                                                                    |
| Condition        | CONDITIONAL -- brownfield; verified-current stores may be reused        |
| Lead Agent       | aidlc-developer-agent                                                        |
| Support Agents   | aidlc-architect-agent                                                        |
| Mode             | pipeline (2-link chain: aidlc-developer-agent scans, aidlc-architect-agent synthesizes and writes) |
| Completion Emoji | (uses stage-protocol.md completion template)                           |

### Purpose

Reverse Engineering は、brownfield プロジェクト向けに既存コードベースを包括的に分析します。2 段パイプライン（`mode: pipeline`）で走ります。先に aidlc-developer-agent がコードベース全体をスキャンし、続けて aidlc-architect-agent がスキャン結果を 9 つの構造化成果物へ合成して書きます。これらの成果物が、以降の Inception と Construction のステージが乗る技術基盤です。

**再実行ガード:** Reverse Engineering はスキャンの前に、各リポジトリに記録したスコープと作業ツリーのフィンガープリントを見ます。人は、カバレッジがインテントに合う verified-current ストアを再利用できます。古い、未検証、レガシー、不一致のストアは、フルまたは焦点の再スキャンが要ります。フル再スキャンはストアを置き換え、焦点再スキャンは新しく分析した領域をマージしつつ、以前の散文を残します。複数リポジトリのインテントでは、ステージ単位のライフサイクル報告の前に、判断をすべて解決します。

### Inputs

- `<record>/aidlc-state.md`（プロジェクト種別の確認）

### Steps

1. **Check Conditions** -- `<record>/aidlc-state.md` を読み、プロジェクト種別が brownfield か確認します。brownfield でなければ、このステージを `aidlc-orchestrate.ts report --stage reverse-engineering --result skipped --reason "greenfield workspace has no existing codebase to reverse engineer"` で飛ばします。エンジンは `[S]` を記録し、原子的に先へ回します。

2. **Developer Code Scan** -- Task ツールで aidlc-developer-agent サブエージェント（`subagent_type="aidlc-developer-agent"`）へ委譲します。委譲プロンプトには `agents/aidlc-developer-agent.md` のペルソナと `.claude/knowledge/aidlc-developer-agent/` のナレッジを含めます。文脈として `aidlc-state.md` のワークスペース状態も入れます。

   developer がコードベース全体で見るもの:
   - 全パッケージ、モジュールとその目的
   - ビルドシステム、設定、依存関係
   - 外部・内部 API（エンドポイント、契約、メソッド）
   - フレームワーク、ライブラリとその版
   - テストディレクトリ、テストフレームワーク、カバレッジ設定
   - コード品質の指標（lint、CI/CD、ドキュメント）
   - 技術的負債の信号

   developer は、`{{HARNESS_DIR}}/knowledge/aidlc-developer-agent/re-artifacts.md` の Developer Code Scan Template に従った構造化スキャン結果を返します。

3. **Architect Synthesis** -- Task ツールで aidlc-architect-agent サブエージェント（`subagent_type="aidlc-architect-agent"`）へ委譲します。委譲プロンプトには `agents/aidlc-architect-agent.md` のペルソナと `.claude/knowledge/aidlc-architect-agent/` のナレッジを含めます。developer のスキャン結果一式を文脈として渡し、`aidlc-state.md` のワークスペース状態も入れます。リポジトリの出力ディレクトリは `bun {{HARNESS_DIR}}/tools/aidlc-utility.ts codekb-path --repo <repo>` で解決します。スキャンの直前に `codekb-snapshot` でソース／ストア世代を取ります。既存ストアとそのスナップショットを architect へ渡します。

   architect はスキャン結果を、一時の完全候補ディレクトリへ 9 つの出力成果物（下の Outputs）として合成します。エンジンはその候補を `codekb-publish` で公開します。ソース変更や並行する共有ストア世代があれば拒否し、再試行の前に新しいスキャンまたは再マージを求めます。

4. **Prepare Completion** -- 成果物 9 つがすべて存在することを確認します。`aidlc-state.md` は編集しません。ライフサイクル完了はゲート後の report のものです。

5. **Present Completion & Request Approval** -- `aidlc-orchestrate.ts report --stage reverse-engineering --result awaiting-approval` でゲートを開き、成果物 9 つを見せ、人の approved / rejected の結果を同じエンジンコマンドで報告します。

### Outputs

各リポジトリの成果物 9 つは `aidlc/spaces/<active-space>/codekb/<repo>/` へ書きます。ディレクトリは `aidlc-utility.ts codekb-path --repo <repo>` が印字するそのままです:

| #  | File                             | Contents                                                    |
|----|----------------------------------|-------------------------------------------------------------|
| 1  | `business-overview.md`           | ビジネス領域、目的、主要機能                 |
| 2  | `architecture.md`                | システムアーキテクチャ、パターン、コンポーネント関係（Mermaid 図付き）。MUST: ビジネストランザクションがコンポーネント横断でどう実装されるかを描く Interaction Diagrams 節（シーケンスまたはフロー図） |
| 3  | `code-structure.md`              | パッケージ／モジュール構成、ファイル分類、コードパターン |
| 4  | `api-documentation.md`           | 外部・内部 API 面、エンドポイント、契約    |
| 5  | `component-inventory.md`         | 責任と依存付きの完全なコンポーネント一覧 |
| 6  | `technology-stack.md`            | 言語、フレームワーク、ライブラリと版              |
| 7  | `dependencies.md`                | 外部依存、パッケージ間の内部依存  |
| 8  | `code-quality-assessment.md`     | テストカバレッジ、lint、CI/CD、ドキュメント品質、技術的負債 |
| 9  | `reverse-engineering-timestamp.md` | RE をいつ行ったか（日付、あればコミットハッシュ、分析スコープ） |

### Approval Gate

標準の 2 択ゲート: **Approve**（Requirements Analysis へ進む） / **Request Changes**。

### Notes

- **再実行ガード:** このステージは、人が再利用か再スキャンかを選ぶ前に、各 brownfield リポジトリの記録スコープとフィンガープリントを検証します。上流参照からの意図した逸脱で、SKILL.md の "Deliberate Deviations" 節に書いてあります。
- **2 段パイプライン:** aidlc-developer-agent が生のコードスキャンを行い（リンク 1、リード）、aidlc-architect-agent がスキャンを構造化成果物へ合成して書きます（リンク 2、最終リンク）。スキャンは徹底し（developer の視点）、合成はアーキテクチャに通じたものになります（architect の視点）。
- bugfix と refactor スコープでは、greenfield に近い場合でもこのステージは必ず走ります。既存コードの理解が欠かせないからです。
- security-patch スコープでは、脆弱性の文脈を見つけるために走ります。
- ここで出る 9 成果物は、Requirements Analysis（2.3）、User Stories（2.4）、Domain Design（2.6）、Units Generation（2.7）が消費します。
- `architecture.md` には、ビジネストランザクションがコンポーネント横断でどう実装されるかを示す Interaction Diagrams が必須です。シーケンスまたはフロー図を使います。

---

## Stage 2.2: Practices Discovery

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.2                                                                    |
| Condition        | CONDITIONAL -- always rerun for freshness on EXECUTE scopes            |
| Lead Agent       | aidlc-pipeline-deploy-agent                                                  |
| Support Agents   | aidlc-quality-agent, aidlc-developer-agent, aidlc-devsecops-agent                        |
| Mode             | subagent (lead draft → three mutually blind spokes → human interview → lead integration) |
| Completion Emoji | (uses stage-protocol.md completion template)                           |

### Purpose

Practices Discovery は、AI-DLC で二軸設定モデルの両行へ書く唯一のステージです。チームの働き方、ウォーキングスケルトンの姿勢、テスト姿勢、デプロイの拍子、コードスタイルのルールを発見します。brownfield はリポジトリと Reverse Engineering の証拠を使い、greenfield はアクティブスペースの `org.md` からリード下書きを種まきます。どちらも同じサブエージェントのハブ＆スポークです。pipeline-deploy のリード下書き、互いに見えない quality / developer / devsecops の寄与、人へのインタビュー、リード統合。人の確認ゲートで承認したあと、ステージが承認を報告する前に、内容は `aidlc/spaces/<active-space>/memory/team.md` と `project.md` へ昇格します。

### Inputs

- `<record>/aidlc-state.md`（プロジェクト種別）
- brownfield のみ: reverse-engineering の 9 成果物、`aidlc/spaces/<active-space>/codekb/<repo>/`（business-overview、architecture、code-structure、api-documentation、component-inventory、technology-stack、dependencies、code-quality-assessment、reverse-engineering-timestamp）
- `aidlc/spaces/<active-space>/memory/{org,team,project}.md`（既定と以前の確認）
- `.claude/knowledge/aidlc-pipeline-deploy-agent/branching-strategies.md`（リードエージェントの KB）

### Outputs

リード成果物 4 つとスポーク寄与 3 つを `<record>/inception/practices-discovery/` へ書きます:

- `team-practices.md` -- 記述的、チームの声の散文。`team.md` の見出しに揃えた 5 節: Way of Working、Walking Skeleton、Testing Posture、Deployment、Code Style。Testing Posture は構造化した `Methodology: tdd|bdd|atdd|test-after|custom` と `Ordering: ...` の箇条を運び、カバレッジ／ツール／スコープの注記は追加の散文のままです。
- `discovered-rules.md` -- 是正的、エージェント向け。2 節: Mandated（`ALWAYS …` ルール）と Forbidden（`NEVER …` ルール）。
- `evidence.md` -- エージェントごとの発見要約。再実行の鮮度の跡。
- `practices-discovery-timestamp.md` -- 実行タイムスタンプ + コミットハッシュ。
- `contributions/aidlc-{quality,developer,devsecops}-agent.md` -- 互いに見えない各スポークからの、身元付き寄与 1 つ。これらのファイルはエンジンが検査する完了証拠です。

確認すると、内容は次へ昇格します:

- `aidlc/spaces/<active-space>/memory/team.md` -- `replaceSection` による節置換（再実行は蓄積せず、節の中身を上書き）。
- `aidlc/spaces/<active-space>/memory/project.md` -- `appendUnderHeading` による見出し下への追記（ルールは蓄積し、日付スタンプで区別）。

### Steps

1. **Classify Inputs** -- `aidlc-state.md` を読み、greenfield か brownfield かを分類し、アクティブスペースを解決します。brownfield は Reverse Engineering 成果物とリポジトリ証拠を載せます。greenfield は `memory/org.md` の既定を載せます。再実行は以前の `team.md` と `project.md` も載せます。
2. **Lead Draft** -- `aidlc-pipeline-deploy-agent` を派遣します。初期の `team-practices.md`、`discovered-rules.md`、`evidence.md` を書きます。brownfield は観察した証拠から下書きし、greenfield は org 既定から下書きし、未確認の仮定をすべて明示します。
3. **Three Mutually Blind Spokes** -- 1 つの並行バッチで `aidlc-quality-agent`、`aidlc-developer-agent`、`aidlc-devsecops-agent` をリード下書きに対して派遣します。ブリーフには下書きのパスは入りますが、ほかのスポークの出力は入りません。各々が `contributions/` 下へ身元付き寄与ファイルを書き、リードの成果物は編集しません。
4. **Human Interview** -- スポーク 3 つが戻ったあと、構造化した質問を出します。brownfield は証拠の穴と方針判断を聞き、greenfield は 5 つのプラクティス領域すべてを、org 既定を提案として聞きます。再実行は以前確認した文を事前入力します。質問と正確な答えをすべて残します。
5. **Lead Integration** -- 下書き、寄与パス 3 つ、インタビューの答えを持たせて pipeline-deploy リードを再派遣します。リードだけが最終成果物を統合し、`PRACTICES_DISCOVERED` を出します。混在する拍子は `Methodology: custom` を使い、Code Generation が答えを TDD へ押し込めず、明示の順序を保つようにします。
6. **Open the Affirmation Gate** -- 聞く前に `aidlc-orchestrate.ts report --stage practices-discovery --result awaiting-approval` を呼びます。下書きをちょうど 2 択で出します: **Approve** / **Request Changes**。Request Changes は `--result rejected` で報告し、昇格は起きません。
7. **Promote After Human Approval** -- 人が Approve を選んだあとだけ、決定論的な昇格をアクティブスペースの `team.md` と `project.md` へ走らせます。先に `project.md`、続けて `team.md` を書き、`PRACTICES_AFFIRMED` を出します。昇格が失敗したら `PRACTICES_OVERRIDE` を出し、ステージを `[?]` のままゲートを開け、承認は報告しません。
8. **Verify Receipt, Then Report** -- 昇格が成功すると、原子的に `Practices Affirmed Timestamp` と一致する `PRACTICES_AFFIRMED` 監査レシートを記録します。そのあと `aidlc-orchestrate.ts report --stage practices-discovery --result approved --user-input "Approve"` を呼びます。エンジンは寄与ファイル 3 つと、いまの試行のレシートを検証してから完了し、回します。

### Approval Gate

標準の 2 択ゲート: **Approve** / **Request Changes**。Approve は昇格が走るあいだ開けたままです。昇格と確認タイムスタンプが成功したあとだけ、コンダクターは `--result approved --user-input "<exact choice>"` を報告できます。昇格失敗はゲートを開けたまま、ステージは未完了です。

### Notes

- `.claude/tools/aidlc-lib.ts` の `replaceSection` ヘルパはマイルストーン 8 で、team.md の行またぎ昇格のために足しました（既存の `appendUnderHeading` は再実行で重複を蓄積します）。
- `org.md` と `team.md` は同じ Title Case 見出し集合を共有します（`## Way of Working`、`## Walking Skeleton`、`## Testing Posture`、`## Deployment`、`## Code Style`）。ステージは `extractMarkdownSection` で一致する Title Case 見出しから `org.md` の各節を読み、同じ見出しを `team.md` で節置換します。
- Code Generation の決定論的な姿勢リゾルバは、構造化した Testing Posture フィールドを、カバレッジ、ツール、スコープの注記から独立して読みます。プロジェクトだけのカバレッジ注記は、チーム節の方法論を消さずに専門化します。
- 再開時は、リード下書きと既存の寄与ファイルをすべて残します。欠けたスポークだけ派遣し、インタビューとリード統合へ続けます。完了したサポート作業は繰り返しません。
- 寄与の証拠は必須です。quality、developer、devsecops の寄与が欠けている、または身元マーカが違うと、承認は拒否されます。

---

## Stage 2.3: Requirements Analysis

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.3                                                                    |
| Condition        | ALWAYS -- depth adapts to complexity                                   |
| Lead Agent       | aidlc-product-agent                                                          |
| Support Agents   | (none)                                                                 |
| Mode             | inline                                                                 |
| Completion Emoji | :mag:                                                                  |

### Purpose

Requirements Analysis は、利用者のインテントと、あればリバースエンジニアしたコードベース理解を、正式で構造化した要件へ落とします。リクエストの明確さ、種別、スコープ、複雑さを評価し、適切な深度を決め、すでに分かっていることを抜き、6 次元で完全性を分析し、確認質問を出し、正式な要件文書を作ります。

このステージはいつも走りますが、プロジェクトの複雑さに合わせて深度を変えます。明確で狭いスコープなら minimal、中程度なら standard、未知が多く大きいスコープなら comprehensive です。

### Inputs

- ステージ 2.1 の Reverse Engineering 成果物（`aidlc/spaces/<active-space>/codekb/<repo>/`）、brownfield のとき
- インテントの `audit/` シャードにある、利用者のプロジェクト説明

### Steps

1. **Load Prior Context** -- brownfield なら `aidlc/spaces/<active-space>/codekb/<repo>/` から RE 成果物を読みます。インテントの `audit/` シャードから利用者のプロジェクト説明を読みます。

2. **Analyze User Request** -- リクエストを次で評価します:
   - **Clarity**: リクエストはどれだけ定義されているか
   - **Type**: 新機能、拡張、リファクタ、バグ修正、移行
   - **Scope**: 単一コンポーネント、複数コンポーネント、システム全体
   - **Complexity**: Simple、standard、complex

3. **Determine Depth** -- 複雑さの評価に基づき:
   - **Minimal**: 明確なリクエスト、狭いスコープ、よく分かった領域
   - **Standard**: 中程度のスコープ、いくらか未知、複数ステークホルダー
   - **Comprehensive**: 大きいスコープ、未知が多い、複雑な領域

4. **Assess Current Requirements** -- 利用者入力からすでに分かっていることを抜き、整理します。明示の機能要件、含意の非機能要件、制約と仮定、ビジネス文脈と目標です。

5. **Completeness Analysis** -- 6 次元のカバレッジを評価します:
   1. 機能要件 -- 中核の振る舞い、機能、ユースケース
   2. 非機能要件 -- 性能、セキュリティ、スケーラビリティ、信頼性、可観測性
   3. ユーザーシナリオ -- ユーザーワークフロー、エッジケース、エラーシナリオ
   4. ビジネス文脈 -- 目標、成功指標、ステークホルダー、制約
   5. 技術文脈 -- 統合点、プラットフォーム要件、技術制約
   6. 品質属性 -- 保守性、テスト容易性、アクセシビリティ、使いやすさ

   各次元の穴を特定します。

6. **Generate Clarifying Questions** -- PROACTIVE: 6 次元すべてで要件が例外なく明確で完全でない限り、確認質問をいつも出します。`<record>/inception/requirements-analysis/requirements-analysis-questions.md` を `[Answer]:` タグ形式で作ります。文脈に合う質問に A–E 選択肢を付けます。普通の確認質問は、最後の選択肢を必ず `X. Other (please specify)` で終わります。`[Answer]:` タグはすべて空です。

   三モードの質問フローを出します: Guide Me / Edit File / Chat。

7. **Collect and Analyze Answers** -- 質問ファイルを読み、`[Answer]:` タグがすべて埋まっていることを確認します。空があれば、未回答の質問を AskUserQuestion で出し、答えを書き戻します。部分回答のまま進んではいけません。次を走らせます:
   - MANDATORY なあいまいさ検出: 全応答を曖昧な言い回し（"mix of"、"not sure"、"depends"、"probably"、"maybe"）でスキャン
   - 答え同士の矛盾検査
   - 欠けた詳細の特定

8. **Follow-Up Questions** -- あいまいさ、曖昧さ、矛盾が 1 つでもあれば、その問題を狙ったフォローアップ質問を作ります。進む前にあいまいさをすべて解消します。"When in doubt, ask."

9. **Generate Requirements** -- `<record>/inception/requirements-analysis/requirements.md` を作り、次を含めます:
    - インテント分析 -- 利用者が達成しようとしていること（機能だけでなく目標）
    - 機能要件 -- 機能領域またはドメインで整理。各要件に安定した `FR{n}` ID（例: `FR1`）、各サブ要件に `FR{n}.{m}` ID（例: `FR1.2`）
    - 非機能要件 -- 性能、セキュリティ、スケーラビリティ、信頼性、可観測性の目標。各々に安定した `NFR{n}` ID
    - 制約 -- 技術、ビジネス、組織
    - 仮定 -- 根拠付きで文書化
    - スコープ外 -- 明示的に除外したもの
    - 未決の問い -- 後段へ残る不確かさ

10. **Prepare Completion** -- 要件成果物を検証します。`<record>/aidlc-state.md` は編集しません。完了と経路はエンジンが持ちます。

11. **Present Completion & Request Approval** -- :mag: 絵文字とレビューパス付きで完了メッセージを出します。承認ゲートは 2 変種です:

    **実行状態で User Stories が SKIP のとき:** 3 択ゲート: Approve / Request Changes / Add User Stories（いま飛ばしている User Stories ステージを入れる）。"Add User Stories" を選んだら `bun {{HARNESS_DIR}}/tools/aidlc-utility.ts recompose --add user-stories` を走らせます。チェックボックスは直接編集しません。

    **User Stories が SKIP でないとき:** 標準の 2 択ゲート: Approve / Request Changes。

### Outputs

成果物はすべて `<record>/inception/requirements-analysis/` へ書きます:

| File                                 | Contents                                                |
|--------------------------------------|---------------------------------------------------------|
| `requirements.md`                    | 正式な要件: インテント分析、機能／非機能要件、制約、仮定、スコープ外、未決の問い |
| `requirements-analysis-questions.md` | `[Answer]:` タグ付きの確認質問（入力成果物） |

### Approval Gate

条件付きゲート形式:

- **User Stories がスキップのとき:** 3 択ゲート -- **Approve** / **Request Changes** / **Add User Stories**
- **User Stories がスキップでないとき:** 標準の 2 択ゲート -- **Approve** / **Request Changes**

### Notes

- ワークフローでもっとも詳しい質疑のステージです。必須のあいまいさ検出を強制し、部分的または曖昧な答えのまま進みません。
- 深度は複雑さに比例します。bugfix / poc は minimal、feature は standard、enterprise は comprehensive。
- bugfix スコープでは、このステージはバグ説明を最小深度で捉えます。
- infra スコープでは、インフラ要件を捉えます。
- ここで出る要件文書は、User Stories（2.4）、Refined Mockups（2.5）、Domain Design（2.6）、Units Generation（2.7）、Contract Design（2.8）、Delivery Planning（2.9）が消費します。

---

## Stage 2.4: User Stories

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.4                                                                    |
| Condition        | CONDITIONAL -- execute for user-facing features, multiple personas, complex business logic, or cross-team work |
| Lead Agent       | aidlc-product-agent                                                          |
| Support Agents   | aidlc-design-agent, aidlc-developer-agent, aidlc-quality-agent               |
| Mode             | mob (the 2.5.0 mob-elaboration showcase)                               |
| Completion Emoji | :books:                                                                |

### Purpose

User Stories は、正式な要件を、各機能の「誰が、何を、なぜ」を定義するユーザー中心のストーリーへ訳します。二部構成です。PART 1 が確認質問付きのストーリー計画を作り、PART 2 が実際のストーリーとペルソナを生成します。計画とストーリーは完了ゲートでまとめてレビューします。

このステージはモブ精錬の見本（mode: mob）です。Product Manager がリードし、design、developer、quality エージェントをリード下書きに対する独立した協働者として派遣します。ブラインドラウンド、統合、有界の異議ラウンド 1 回。そのあと Product Leader がレビューします。aidlc-design-agent の UX 視点は、上流参照に無い意図した追加で、SKILL.md の "Deliberate Deviations" 節に書いてあります。

### Inputs

- `<record>/inception/requirements-analysis/requirements.md`
- ステージ 2.1 の RE 成果物（`aidlc/spaces/<active-space>/codekb/<repo>/`）、brownfield のとき

### Steps

1. **Load the Lead Persona** -- `agents/aidlc-product-agent.md` から aidlc-product-agent ペルソナを、`.claude/knowledge/aidlc-product-agent/` からナレッジを読みます。サポートエージェント（design、developer、quality）はインラインでは読みません。モブステージなので、生成中に独立した協働者として派遣します。

2. **Validate User Stories Are Needed** -- このプロジェクトでユーザーストーリーが価値を足すかを評価します:
   - **Execute if**: ユーザー向け機能、複数ユーザーペルソナ、複雑なビジネスロジック、チーム横断の調整が要る
   - **Skip if**: 純粋なリファクタ、孤立したバグ修正、インフラのみ、開発者向けツール

   `<record>/inception/user-stories/user-stories-assessment.md` を作り、次を残します: 判断（Execute または Skip）、根拠、考慮した要因、走るなら主な価値領域、飛ばすなら代替のカバレッジ。

   飛ばすなら `aidlc-orchestrate.ts report --stage user-stories --result skipped --reason "<reason from the assessment>"` を呼びます。エンジンは成果物やアンサンブル証拠の検査の前に `[S]` を記録し、回します。

3. **Load Prior Context** -- `<record>/inception/requirements-analysis/requirements.md` を読みます。brownfield なら、関連する RE 成果物を `aidlc/spaces/<active-space>/codekb/<repo>/` から読みます。

**PART 1: Planning**

4. **Create Story Plan with Questions** -- `<record>/inception/user-stories/user-stories-questions.md` を作り、次を含めます:
   - ペルソナ開発の進め方（ユーザーは誰か、目標は何か）
   - INVEST 基準（Independent、Negotiable、Valuable、Estimable、Small、Testable）を使うストーリー形式
   - MoSCoW 優先度（Must Have / Should Have / Could Have / Won't Have）によるストーリー優先。MVP 境界は Delivery Planning で正式に決まり、ストーリー優先度はその判断の材料です
   - 分解の進め方の選択肢（機能、ペルソナ、ワークフロー、ドメイン領域、またはエピック）
   - ペルソナとストーリー粒度への利用者入力向け、`[Answer]:` タグ形式の埋め込み質問

5. **Collect Answers** -- stage-protocol.md 第 3 節の質問フローに従い答えを集めます（対話モードの選択を出し、答えを集め、ファイルへ書き戻す）。

6. **Analyze Answers** -- MANDATORY なあいまいさ分析: 全応答を曖昧な言い回し（"mix of"、"not sure"、"depends"、"probably"）でスキャンします。矛盾を見ます。欠けた詳細を特定します。あいまいさが 1 つでもあればフォローアップ質問を作ります。

7. **Present Plan and Generate** -- ストーリー計画の要約（ペルソナ数、ストーリー数、分解の進め方）をインラインで出します。すぐ PART 2 へ進みます。利用者は完了ゲートで結合出力（計画 + 生成したストーリー）をレビューし承認します。

   生成が終わる前に利用者がフィードバックを挟んだら、改訂要求として扱い、生成を続ける前に計画を更新します。

**PART 2: Generation**

8. **Execute Plan -- Generate Stories and Personas via the Mob**:

   **Lead draft.** aidlc-product-agent が先に `<record>/inception/user-stories/personas.md` を下書きします:
   - ユーザーペルソナ定義（名前、役割、目標、痛み、文脈）
   - ペルソナ関係と優先順位

   および `<record>/inception/user-stories/stories.md`:
   - 標準形式のユーザーストーリー: "As a [persona], I want [goal], so that [benefit]"
   - 各ストーリーの受け入れ基準
   - ストーリー優先度（Must Have / Should Have / Could Have / Won't Have）
   - ストーリーの依存と関係
   - INVEST 適合の注記

   **Mutually blind support contributions.** aidlc-design-agent、aidlc-developer-agent、aidlc-quality-agent を、リード下書きに対する 1 回の並行ラウンドで派遣します。各ブリーフには下書き、Q&A、要件パスは入りますが、兄弟の寄与は入りません。各サポートエージェントは身元付きファイルを `<record>/inception/user-stories/contributions/<agent-slug>.md` へ書きます。

   **Lead integration.** aidlc-product-agent が寄与 3 つを、完了ゲートの前に `personas.md` と `stories.md` へ統合します。判断はステージ途中で人へ、知識の争いは有界の異議ラウンド 1 回です。残した異論はゲートで引用します。

9. **Prepare Completion** -- モブ成果物と協働者寄与ファイル 3 つを検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

10. **Present Completion & Request Approval** -- :books: 絵文字、作ったペルソナとストーリーの要約、レビューパス付きで完了メッセージを出します。標準の 2 択承認ゲート: Approve（次のステージへ） / Request Changes。

### Outputs

成果物はすべて `<record>/inception/user-stories/` へ書きます:

| File                           | Contents                                                     |
|--------------------------------|--------------------------------------------------------------|
| `stories.md`                   | 受け入れ基準、優先度、依存、INVEST 注記付きのユーザーストーリー |
| `personas.md`                  | ユーザーペルソナ定義、関係、優先順位    |
| `user-stories-assessment.md`   | Execute / skip の判断と根拠、考慮した要因   |
| `user-stories-questions.md`    | `[Answer]:` タグ付きの確認質問を含むストーリー計画（入力成果物） |
| `contributions/aidlc-{design,developer,quality}-agent.md` | ゲート前にリードが統合する、互いに見えないサポート寄与 |

### Approval Gate

標準の 2 択ゲート: **Approve**（次のステージへ） / **Request Changes**。

### Notes

- スキップ条件: 純粋なリファクタ、孤立したバグ修正、インフラのみ、開発者向けツール。
- 二部構成（計画してから生成）により、ストーリーを書く前に分解の進め方へ利用者が口を出せます。
- ユーザーストーリーの優先度（MoSCoW）は MVP 境界を知らせますが、決めません。正式な MVP 境界は Delivery Planning（ステージ 2.9）で置きます。
- `user-stories-assessment.md` はステージを飛ばすときでもいつも作り、根拠を残します。
- 身元付き寄与ファイル 3 つは必須のアンサンブル証拠です。リードが 3 つを統合するまで承認は拒否されます。
- ここで出るストーリーは、Refined Mockups（2.5）、Domain Design（2.6）、Units Generation（2.7）、Delivery Planning（2.9）が消費します。
- aidlc-design-agent のサポートは、UX に通じた開発のための意図した追加で、SKILL.md の Deliberate Deviations 節に書いてあります。

---

## Stage 2.5: Refined Mockups & UX Design

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.5                                                                    |
| Condition        | CONDITIONAL -- skip for non-UI, API-only, or infrastructure-only initiatives |
| Lead Agent       | aidlc-design-agent                                                           |
| Support Agents   | aidlc-product-agent (validates against stories)                              |
| Mode             | inline                                                                 |
| Completion Emoji | :art:                                                                  |

### Purpose

Refined Mockups は、Ideation ステージ 1.6 の粗いコンセプトワイヤーフレームを、正式な要件とユーザーストーリーに裏打ちされた中〜高忠実度のモックへ育てます。詳しいインタラクション仕様、デザインシステム対応、レスポンシブ振る舞いの定義、アクセシビリティ適合チェックリストを出します。

非 UI の取り組み（API のみ、バックエンド）では、インタラクション図を API 開発者体験の仕様へ洗練します。

ステージ 1.6（Rough Mockups）も飛ばしていれば、このステージも通常飛ばします。

### Inputs

- ステージ 1.6 のラフモック（`<record>/ideation/rough-mockups/`）、あれば
- ステージ 2.4 のユーザーストーリー（`<record>/inception/user-stories/`）
- ステージ 2.3 の要件（`<record>/inception/requirements-analysis/`）

### Steps

1. **Load Prior Context** -- `<record>/ideation/rough-mockups/` からラフモックを読みます（あれば）。`<record>/inception/user-stories/` からユーザーストーリーを、`<record>/inception/requirements-analysis/` から要件を読みます。

2. **Generate Clarifying Questions** -- `<record>/inception/refined-mockups/refined-mockups-questions.md` を作り、次を覆う質問を入れます:
   - 各ユーザーストーリーを UI でどう表すか
   - 必要なインタラクションパターン（モーダル、インライン編集、ウィザード、段階的開示）
   - 各画面が扱う状態（loading、empty、error、success、partial）
   - 既存のデザインシステム／コンポーネントライブラリとの整合
   - アクセシビリティ要件（WCAG レベル）
   - 必要なレスポンシブブレークポイント
   - API 向け: 開発者体験の要件

   stage-protocol.md の質問フローに従います。

3. **Collect and Analyze Answers** -- 設計判断をユーザーストーリーと要件に照らして一貫性を検証します。

4. **Generate Artifacts** -- 中〜高忠実度のモック（ユーザーストーリー／画面ごと）、インタラクション仕様、デザインシステム対応、レスポンシブ振る舞い仕様、アクセシビリティ適合チェックリストを作ります。非 UI の取り組みでは API 開発者体験仕様を作ります。

5. **Prepare Completion** -- 洗練モックの成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

6. **Present Completion & Request Approval** -- :art: 絵文字付きで完了メッセージを出します。標準の承認ゲート（Approve / Request Changes）。

### Outputs

成果物はすべて `<record>/inception/refined-mockups/` へ書きます:

| File                            | Contents                                                    |
|---------------------------------|-------------------------------------------------------------|
| `mockups.md`                    | ユーザーストーリー／画面ごとの中〜高忠実度モック          |
| `interaction-spec.md`           | インタラクションパターン、状態管理、遷移          |
| `design-system-mapping.md`      | デザインシステム／コンポーネントライブラリへのコンポーネント対応       |
| `accessibility-checklist.md`    | WCAG 適合チェックリストと要件                   |
| `refined-mockups-questions.md`  | `[Answer]:` タグ付きの確認質問（入力成果物）  |

### Approval Gate

標準の 2 択ゲート: **Approve** / **Request Changes**。

### Notes

- スキップ条件: 非 UI、API のみ、インフラのみの取り組み。ステージ 1.6（Rough Mockups）を飛ばしていれば、通常こちらも飛ばします。
- mvp スコープでは、プロジェクトに UI があるときだけ走ります。
- ここで出るモックは Domain Design（2.6）へ入り、最終的に Construction の Code Generation（3.5）の UI コンポーネントへ入ります。
- アクセシビリティチェックリストは、Build and Test（3.6）へ入るテスト可能な基準を与えます。

---

## Stage 2.6: Domain Design

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.6                                                                    |
| Condition        | CONDITIONAL -- execute when new components or services are needed; skip for modifications to existing components only |
| Lead Agent       | aidlc-architect-agent                                                        |
| Support Agents   | aidlc-aws-platform-agent, aidlc-design-agent                                |
| Mode             | inline                                                                 |
| Completion Emoji | :building_construction:                                                |

### Purpose

Domain Design は、システムの **論理的な組み立てブロック** — コードを書く対象のコンポーネント — を特定します。コンポーネントは、独自のビジネスロジック、エンティティ、ライフサイクルを持つ有界のソフトウェア片です（書くコードであり、デプロイするインフラではありません）。このステージは各コンポーネントの振る舞い、依存と被依存、所有するエンティティ、各境界の根拠を捉えます。デプロイトポロジ（それは Units Generation）や技術スタック／NFR パターン（後段）は決めません。

aidlc-aws-platform-agent はマネージドサービス依存の補助視点を出し、aidlc-design-agent は UI コンポーネント構造を寄与します。

### Inputs

- `<record>/inception/requirements-analysis/requirements.md`
- `<record>/inception/user-stories/stories.md`（出ていれば）
- ステージ 2.1 の RE 成果物（とくに `architecture.md`、`component-inventory.md`、`dependencies.md`）、brownfield のとき

### Steps

1. **Load Prior Context** -- 要件、ユーザーストーリー（出ていれば）、RE 成果物（brownfield なら、とくに architecture.md、component-inventory.md、dependencies.md）を読みます。スコープ文脈は `<record>/aidlc-state.md` から来ます。

2. **Create Design Plan with Questions** -- `<record>/inception/domain-design/domain-design-questions.md` を `[Answer]:` タグ形式の文脈に合う質問で作り、次を覆います:
   - コンポーネント境界の判断
   - アーキテクチャスタイルの好み（まだ決まっていなければ）
   - サービス間通信のパターン（同期 vs 非同期、REST vs gRPC vs イベント）
   - データ所有と保存戦略
   - 既存コンポーネントとの統合の進め方（brownfield）
   - UI コンポーネント構造（ユーザー向けなら、UX デザイナの視点で）

3. **Collect and Analyze Answers** -- stage-protocol.md 第 3 節の質問フローに従い答えを集めます。MANDATORY なあいまいさ分析: 曖昧な言い回し、矛盾、欠けた詳細をスキャンします。あいまいさが 1 つでもあればフォローアップ質問を作ります。進む前にあいまいさをすべて解消します。

4. **Generate the Component Catalogue** -- 統合した 1 つの `components.md` を作ります（下の Outputs）: 囲み `yaml` カタログ（正本）と、派生した人向けビュー（mermaid 図 + 要約／所有／根拠の表）。

5. **Prepare Completion** -- 設計成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

6. **Present Completion & Request Approval** -- :building_construction: 絵文字、設計成果物の要約、主要なアーキテクチャ判断の強調、レビューパス付きで完了メッセージを出します。3 択承認ゲート: Approve / Request Changes / Add Units Generation（実行計画で飛ばしていれば）。Add Units Generation を選ぶと `bun {{HARNESS_DIR}}/tools/aidlc-utility.ts recompose --add units-generation` を走らせます。状態のチェックボックスは直接編集しません。

### Outputs

`<record>/inception/domain-design/` へ書く成果物:

| File                              | Contents                                                  |
|-----------------------------------|-----------------------------------------------------------|
| `components.md`                   | 囲み `yaml` コンポーネントカタログ（正本）: 各コンポーネントの `behaviour`、`responsibilities`、`depends_on` / `dependents`、`external_dependencies`、所有する `entities`（`identifier`、属性、コンポーネント横断の `references`）。続けて派生した人向けビュー: mermaid Component Diagram、Component Summary、Entity Ownership、External Dependencies、Rationale 表 |
| `decisions.md`                    | ADR ログ — 主要な設計判断とその根拠を残すアーキテクチャ決定記録 |
| `traceability.json`               | 上流の各 `USx.y`（なければ `FR`）を、実現する `components.md` のコンポーネントまたはエンティティへ対応づけるカバレッジ表。`traceability` センサーが検証 |

加えて、入力として質問ファイルを作ります:

| File                                      | Contents                                        |
|-------------------------------------------|-------------------------------------------------|
| `domain-design-questions.md`         | `[Answer]:` タグ付きの設計質問          |

### Approval Gate

特別な 3 択ゲート:

- **Approve** -- 次のステージへ進む
- **Request Changes** -- 改訂フィードバックを出す
- **Add Units Generation** -- いま飛ばしている Units Generation ステージを入れる（実行計画で飛ばしていれば）`aidlc-utility.ts recompose --add units-generation` 経由

### Notes

- スキップ条件: 変更が既存コンポーネントの修正だけで、新しいコンポーネントやサービスが要らない。
- 境界の根拠（と却下した代替）は `components.md` の Rationale 節に残し、アーキテクチャ判断は `decisions.md`（ADR ログ）に残します。
- ここで出る設計成果物は Units Generation（2.7）の主入力であり、Construction ステージ（Functional Design 3.1、Code Generation 3.5）へ直接効きます。
- brownfield プロジェクトでは、RE 成果物に書いた既存コンポーネントとの統合を設計に含めなければなりません。

---

## Stage 2.7: Units Generation

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.7                                                                    |
| Condition        | ALWAYS -- produces the dependency DAG that Stage 2.9 consumes for Bolt sequencing; travels with 2.9 in the compiled scope grid |
| Lead Agent       | aidlc-architect-agent                                                        |
| Support Agents   | aidlc-delivery-agent                                                         |
| Mode             | inline                                                                 |
| Completion Emoji | :wrench:                                                               |

### Purpose

Units Generation は、ドメイン設計を、Construction フェーズの段階的な構築の流れを駆動する離散した作業ユニットへ分解します。各ユニットは、独立して実装できるシステムの片（サービス、モジュール、デプロイ可能なコンポーネント）です。ステージは、Construction が何を作るかを決める `unit-of-work.md`、ステージ 2.9 がボルト並びのために消費する依存 DAG（`unit-of-work-dependency.md`）、すべてのユーザーストーリーがユニットへ割り当てられることを保証するストーリーマップを出します。

**ステージ 2.7 は依存 DAG（トポロジ）を出します。ステージ 2.9 はそのなかの経済的な道（ボルト並び）を選びます。** 2.7 は実装順を勧めてはいけませんし、クリティカルパスを特定してもいけません — それらは 2.9 の経済的並びの判断です。

これは Inception の設計作業と Construction の実装作業のあいだの要の橋です。ここで出るユニット定義、依存、ストーリー対応が、Construction フェーズの走り方を直接支配します。

ステージは二部構成です。PART 1 が確認質問付きの分解計画を作り計画承認を取り、PART 2 が実際のユニット成果物を生成します。

### Inputs

- ステージ 2.6 のコンポーネントカタログ（`<record>/inception/domain-design/components.md`）
- `<record>/inception/requirements-analysis/requirements.md`
- `<record>/inception/user-stories/stories.md`（出ていれば）

### Steps

**PART 1: Planning**

1. **Load Prior Context** -- `<record>/inception/domain-design/` の成果物すべてを読みます（統合した `components.md` コンポーネントカタログと `decisions.md` ADR ログ）。要件を読みます。ユーザーストーリーを読みます（出ていれば）。スコープ文脈は `<record>/aidlc-state.md` から来ます。

2. **Create Decomposition Plan with Questions** -- `<record>/inception/units-generation/units-generation-questions.md` を `[Answer]:` タグ形式の質問で作り、次を覆います:
   - ユニット境界の戦略（サービス、機能、ドメイン、デプロイ先）
   - ユニット粒度の好み（粗い vs 細かい）
   - 依存順の好み（厳密なトポロジのみ、または独立ユニット間の並行を許す）
   - ユニット間の統合点と契約（API、共有データ、イベント）
   - デプロイモデル（一括デプロイ、独立デプロイ、ハイブリッド）

   NOTE: 実装順の優先（value-first、risk-first、walking-skeleton-first）は聞かないでください。それらはステージ 2.9 Delivery Planning の経済的並びの判断です。

3. **Collect and Analyze Answers** -- stage-protocol.md 第 3 節の質問フローに従い答えを集めます。MANDATORY なあいまいさ分析: 曖昧な言い回し、矛盾、欠けた詳細をスキャンします。あいまいさが 1 つでもあればフォローアップ質問を作ります。進む前にあいまいさをすべて解消します。

4. **Get Plan Approval** -- 分解計画を AskUserQuestion で利用者へ出します。進め方を要約します（ユニット境界戦略、見込みユニット数、依存構造）。選択肢: Approve Plan / Revise Plan。

**PART 2: Generation**

5. **Execute Plan -- Generate Unit Artifacts** -- 承認した計画に基づき、出力成果物 4 つを生成します（下の Outputs）。

6. **Prepare Completion** -- ユニット成果物を検証し、Construction 向けにユニット一覧を残します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

7. **Present Completion & Request Approval** -- :wrench: 絵文字、定義したユニットの要約、対応づけた依存、割り当てたストーリー、レビューパス付きで完了メッセージを出します。標準の 2 択承認ゲート: Approve（Construction フェーズへ） / Request Changes。

### Outputs

成果物 4 つはすべて `<record>/inception/units-generation/` へ書きます:

| File                            | Contents                                                    |
|---------------------------------|-------------------------------------------------------------|
| `unit-of-work.md`               | ユニット定義（名前、説明、境界）、責任、ユニットごとのデプロイモデル（standalone / shared / embedded）、相対複雑さの見積もり（S/M/L/XL）、ユニット kind（`service` / `spec` / `ui` / `packaging` / `library`。どの Construction 設計成果物が効くかを駆動）、実装注記と制約 |
| `unit-of-work-dependency.md`    | ユニット間の依存 DAG（有向辺、循環なし）、統合点（API／共有データ／イベント）、並行開発の機会（互いの依存が無いユニット集合）。トポロジのみ。経済的な道の選択（推奨順、クリティカルパス）は 2.9 の仕事。囲み `yaml` 辺ブロックは DAG を鏡写しし、各ユニットに任意の `kind:` を付けられます（[Runtime graph](../13-runtime-graph.md) の `bolt_dag.units[].kind`） |
| `unit-of-work-story-map.md`     | 各ユーザーストーリーを実装ユニットへ対応づけ、複数ユニットにまたがる横断ストーリー、各ユニット内のストーリー実装順、カバレッジ検証（すべてのストーリーが割り当て済み、すべてのユニットにストーリーがある） |
| `traceability.json`             | 生成したユニット成果物からユニット集合を導き、すべてのストーリーが宣言した対象ユニットへ対応づくことを検証するカバレッジ表。`traceability` センサーが検証 |

加えて、入力として質問ファイルを作ります:

| File                                  | Contents                                          |
|---------------------------------------|---------------------------------------------------|
| `units-generation-questions.md`       | `[Answer]:` タグ付きの分解質問     |

### Approval Gate

標準の 2 択ゲート: **Approve**（Construction フェーズへ） / **Request Changes**。

### Notes

- **このステージの出力が Construction を駆動します。** `unit-of-work.md` がユニットを定義し、`unit-of-work-dependency.md` が Construction エンジンが歩く DAG です。既定ウォークは stage-major: 対象の Construction ステージを全ユニットに走らせてから、次のステージへ。任意の `Construction Iteration: unit-major` は、あるユニットのユニットごとステージをすべて終えてから次のユニットへ進むウォークです。
- **スコープに入っていれば 2.7 は ALWAYS です。** コンパイル済みスコープグリッドでは、2.7 と 2.9 は一緒に動きます（スコープごとに両方 EXECUTE または両方 SKIP）。このステージに単一ユニットのスキップ条件はありません — 単一ユニットの流れでも自明な DAG を出します。
- 二部構成（計画してから生成）により、ユニットを定義する前に分解戦略を利用者が承認できます。Step 4 には最終完了ゲートとは別の中間承認ゲート（Approve Plan / Revise Plan）があります。
- 依存 DAG は 2.9 の経済的なボルト並びに入ります。2.9 はリスク、価値、学習で重みづけした DAG のなかの道を選びます。
- ストーリーマップはトレーサビリティを与えます。すべてのユーザーストーリーは少なくとも 1 ユニットへ割り当てられ、すべてのユニットは少なくとも 1 ストーリーを持たなければなりません。
- aidlc-delivery-agent は実現性の検証と優先の入力を出し、分解がデリバリーの視点で実用的であることを確保します。

---

## Stage 2.8: Contract Design

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.8                                                                    |
| Condition        | CONDITIONAL -- execute whenever there is a contract to pin: an inter-unit boundary or a public/external API; skip only a single self-contained unit with neither |
| Lead Agent       | aidlc-architect-agent                                                        |
| Support Agents   | aidlc-aws-platform-agent                                                    |
| Mode             | inline                                                                 |
| Completion Emoji | :building_construction:                                                |

### Purpose

Contract Design は、システムの **正式な契約** を固め、ユニットが安定した合意済み境界に対して並行に作れるようにします。Units Generation（2.7）がユニットと依存 DAG を定義したあとに走り、2 種の契約をピンします。ユニット間境界（ユニットが統合する同期／非同期／共有ストアの仕組み）と、システムが晒す公開または外部 API。単一の `contract-summary.md` を出し、下流の設計と Construction ステージが権威ある境界参照として読みます。

### Inputs

- `<record>/inception/units-generation/unit-of-work.md` と `unit-of-work-dependency.md`
- `<record>/inception/domain-design/components.md`
- `<record>/inception/requirements-analysis/requirements.md`

### Outputs

- `contract-summary.md` -- ピンしたユニット間および外部契約。

### Notes

- Contract Design を飛ばすのは、ユニット間境界も公開／外部 API も無い、単一の自己完結ユニットのときだけです。公開 API を晒す単一ユニットでも走ります。
- `contract-summary` は下流の Delivery Planning、Functional Design、NFR Requirements、NFR Design、Infrastructure Design、Code Generation が、任意の共有契約入力として消費します。
- ほかの Inception 設計ステージと違い、Contract Design は `traceability.json` を出しません。要件カバレッジではなく正式な契約を持つので、2.9 のフェーズ境トレーサビリティ検査には寄与しません。

---

## Stage 2.9: Delivery Planning

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Inception                                                              |
| Stage #          | 2.9                                                                    |
| Condition        | ALWAYS -- capstone Inception stage                                     |
| Lead Agent       | aidlc-delivery-agent                                                         |
| Support Agents   | aidlc-architect-agent (validates build order against architecture dependencies) |
| Mode             | inline                                                                 |
| Completion Emoji | :calendar:                                                             |

### Purpose

Delivery Planning は Inception フェーズの締めです。ボルト並び — ステージ 2.7 が出した作業ユニットを、経済的にどの順で出荷するか — を計画します。ステージ 2.7 が分析的（Construction エンジンが実際に歩く依存 DAG）であるのに対し、ステージ 2.9 は経済的です。リスク、価値、チーム容量、学習で重みづけした DAG のなかの道を選びます。エンジンはユニットのまとめや実行時順のために `bolt-plan.md` を消費しません。

`stage-protocol.md` の正本 Glossary どおり、**ボルト** はこのステージ（2.9）が出す計画上の Construction デリバリーのまとまりです。ユニット 1 つ以上、Definition of Done、確信度の仮説、オーナーシップ。（ステージ 3.6 build-and-test と 3.7 ci-pipeline はボルトごとではなく、全ユニットに対して最後に一度走ります。）

経済的価値は DAG から導けません。AI エージェントはトポロジカルソートはできますが、どのボルトが市場仮説をいちばん速く検証するか、どのボルトがコミットが積み上がる前にいちばん怖い未知を表に出すかは決められません。それはこのステージが捉える、人の価値判断です。

このステージはまた、Construction へ移る前に Inception 成果物すべての整合を見る、フェーズ境の検証も走ります。

**大事な切れ目:** このステージはボルト並びを計画します。どの AI-DLC ステージを、どの深度で走らせるかは決めません — それは `/aidlc` スキルのスコープ選択です。

### Inputs

Inception フェーズの成果物すべて:

- ステージ 2.3 の要件（`<record>/inception/requirements-analysis/`）
- ステージ 2.4 のユーザーストーリー（`<record>/inception/user-stories/`）
- ステージ 2.6 のドメイン設計（`<record>/inception/domain-design/`）
- ステージ 2.7 のユニット（`<record>/inception/units-generation/`）
- ステージ 2.8 の契約要約、出ていれば（`<record>/inception/contract-design/contract-summary.md`）
- ステージ 1.5 のチーム編成、あれば（`<record>/ideation/team-formation/`）

### Steps

1. **Load Prior Context** -- Inception フェーズの成果物すべてを読みます。要件、ユーザーストーリー、ドメイン設計、ユニット、契約要約（出ていれば）、チーム編成（あれば）。

2. **Generate Clarifying Questions** -- `<record>/inception/delivery-planning/delivery-planning-questions.md` を作り、次を覆う質問を入れます:
   - 並びのヒューリスティック: risk-first、value-first、walking-skeleton-first、またはハイブリッド
   - 使うなら WSJF（Weighted Shortest Job First）の採点モデルと重み
   - 最初のボルト: ウォーキングスケルトン（Cockburn）または、拡大する前に進め方を証明する確信度づくりのまとまり
   - 作業ユニットのボルトへの束ね方
   - 各ボルトの Definition of Done
   - ボルトごとの確信度の仮説 — 出荷すると何が証明されるか
   - モブからボルトへの割り当て（あれば 1.5 のチームを参照。走っていなければ AI のみ）
   - 特定ボルトを封鎖する外部依存（API、データ、承認）
   - いちばん早く扱うべき主なリスク項目

   stage-protocol.md の質問フローに従います。

3. **Collect and Analyze Answers** -- 選んだボルト並びが 2.7 の依存 DAG を尊重することを検証します（aidlc-architect-agent の入力付き）。トポロジ順からの逸脱があれば、根拠成果物で正当化できるように印を付けます。

4. **Generate Artifacts** -- `<record>/inception/delivery-planning/` に成果物 4 つを作ります:
   - `bolt-plan.md` — ボルトの順序付き並び。ボルトごとの作業ユニット、ウォーキングスケルトン印、Definition of Done、確信度の仮説、見込みデモ。
   - `team-allocation.md` — ボルトからモブへの割り当て。チーム数が 1 より大きいときの Program Board 相当。
   - `risk-and-sequencing-rationale.md` — ボルト順のなぜ。WSJF スコア、risk-first の論、walking-skeleton-first の論、または value-first の論。
   - `external-dependency-map.md` — 封鎖項目を消費するボルトへ対応づけ（完全に AI 内で閉じるときは軽量または空）。

5. **Phase Boundary Verification** -- Inception → Construction の検証を走らせます:
   - Requirements → Stories → Architecture の整合
   - すべてのストーリーが要件へ辿れる
   - アーキテクチャがすべてのストーリーを覆う
   - 結果を `<record>/verification/phase-check-inception.md` へ書く

6. **Prepare Completion** -- デリバリーとフェーズ境検証の成果物を検証します。フェーズやステージの状態は書きません。承認 report が原子的な Inception → Construction 遷移を持ちます。承認したボルト計画の Construction イテレーションを分類します。ユニット先行の計画は `set-construction-iteration unit-major` を記録できます。そのあと、1 セッションか複数チームがユニットを持つかを聞きます。チーム所有は `set-unit-ownership team` を記録し（unit-major 必須）、承認がステージごと（`set-unit-gate-rhythm per-stage`、既定）か、ユニット連鎖のあと一度（`unit-end`）かを聞きます。利用者向けの質問は、フィールド／列挙名を出さずにその選択を説明します。

7. **Present Completion & Request Approval** -- :calendar: 絵文字付きで完了メッセージを出します。承認ゲート: Approve（Construction へ進む） / Request Changes。利用者はこのゲートでステージの所属／除外を上書きできます。

### Outputs

成果物はすべて `<record>/inception/delivery-planning/` へ書きます:

| File                                  | Contents                                                    |
|---------------------------------------|-------------------------------------------------------------|
| `bolt-plan.md`                        | 順序付きボルト並び。ボルトごとの作業ユニット、ウォーキングスケルトン印、Definition of Done、確信度の仮説、見込みデモ |
| `team-allocation.md`                  | ボルトからモブへの割り当て。チーム数が 1 より大きいときの Program Board 相当。1.5 が走っていなければ AI のみの割り当て |
| `risk-and-sequencing-rationale.md`    | ボルト順の WSJF / risk-first / walking-skeleton-first / value-first の正当化 |
| `external-dependency-map.md`          | 封鎖項目（外部 API、データの可用性、承認リードタイム、外部チームへの引き渡し）を消費するボルトへ対応づけ |
| `delivery-planning-questions.md`      | `[Answer]:` タグ付きの確認質問（入力成果物） |

フェーズ境検証の出力:

| File                                            | Contents                                    |
|-------------------------------------------------|---------------------------------------------|
| `<record>/verification/phase-check-inception.md` | Inception → Construction のトレーサビリティ検査結果 |

### Approval Gate

標準の 2 択ゲート: **Approve**（Construction へ進む） / **Request Changes**。利用者はこのゲートでステージの所属／除外を上書きできます。

### Notes

- **フェーズ境のステージ。** フェーズ境ステージ 3 つの 2 番目です（1.7 のあと、3.7 の前）。検証は Requirements → Stories → Architecture の整合を見ます。
- **経済的並び vs トポロジ並び。** ステージ 2.7 は依存 DAG を出します（トポロジ順は記述的な幾何として落ちてくる）。ステージ 2.9 は、人の価値判断で重みづけしたその DAG のなかの道を選びます。ボルト順は、risk-first または walking-skeleton-first の論が正当化するとき、トポロジ順から逸脱できます — 逸脱は `risk-and-sequencing-rationale.md` に残します。
- **ボルト ≠ スプリント ≠ MMF。** 正本 Glossary どおり、ボルトは 2.9 が出す計画上の Construction デリバリーのまとまりです。ユニット 1 つ以上、Definition of Done、確信度の仮説、オーナーシップ。ステージ 3.6（Build and Test）と 3.7（CI Pipeline）は全ボルトのあと一度走ります。並びのヒューリスティック（ウォーキングスケルトン、WSJF）はボルト順に効き、ボルトが何であるかを再定義しません。
- **上流からの意図した逸脱。** 上流参照はこのステージを "Workflow Planning" と呼び、純粋なステージ選択器として扱います。この実装（"Delivery Planning" へ改名）はボルト並び、チーム割り当て、リスク根拠を足します。
- ボルト計画は確信度づくりの並びを定義します。各ボルトは定義した作業ユニット、Definition of Done、確信度の仮説を持ちます。
- aidlc-architect-agent は、提案したボルト並びがコンポーネントカタログ（`components.md`）と unit-of-work-dependency 成果物の依存を尊重することを検証します。
- チーム割り当ては、チーム編成成果物（ステージ 1.5）があればそこから引きます。1.5 が SKIP のとき（mvp、classic、workshop）は、全ボルトを aidlc-developer-agent（AI）が実行します。

---

## Phase Summary

### Key Outputs

Inception フェーズは、Construction と Operation へ持ち越す次の主な出力を出します:

1. **Reverse Engineering Artifacts**（2.1） -- リポジトリごとに 9 成果物、`aidlc/spaces/<active-space>/codekb/<repo>/`。既存コードベースを文書化します。ビジネス概要、アーキテクチャ、コード構造、API 文書、コンポーネント一覧、技術スタック、依存、コード品質評価、タイムスタンプ。（brownfield プロジェクトのみ。）
2. **Requirements Document**（2.3） -- 正式な要件: 機能、非機能、制約、仮定、スコープ外、未決の問い。
3. **User Stories and Personas**（2.4） -- 受け入れ基準、優先度、依存付きのユーザーストーリー。ユーザーペルソナ定義。（該当するとき。）
4. **Refined Mockups**（2.5） -- 中〜高忠実度モック、インタラクション仕様、デザインシステム対応、アクセシビリティチェックリスト。（該当するとき。）
5. **Domain Design**（2.6） -- 統合した `components.md` カタログ（各コンポーネントの振る舞い、責任、依存、外部依存、所有エンティティ）と `decisions.md` ADR ログ。（該当するとき。）
6. **Units of Work**（2.7） -- 境界と複雑さ見積もり付きのユニット定義、ビルド順付きのユニット依存行列、ストーリーからユニットへの対応。（該当するとき。）`unit-of-work-dependency.md` は、Construction エンジンがユニットのまとめと実行時バッチ順のために読む成果物です。
7. **Contract Summary**（2.8） -- ピンしたユニット間および公開／外部 API 契約（`contract-summary.md`）。（ピンする契約があるとき。）
8. **Delivery Plan**（2.9） -- ボルト計画、ビルド順、依存行列、チーム割り当て。承認した計画の中身（経済的な並び、複数ユニットのまとめ、DoD、確信度の仮説、オーナーシップ）であり、実行時ウォークの正本ではありません。
9. **Phase Boundary Verification**（2.9） -- Inception → Construction のトレーサビリティ検査。`<record>/verification/phase-check-inception.md` へ書きます。

### Handoff to Construction

ステージ 2.9 で承認すると、フレームワークは Construction フェーズへ移ります。`bolt-plan.md` は承認した計画成果物のままです — 経済的な並び、複数ユニットのボルトまとめ、Definition of Done、確信度の仮説、オーナーシップ。エンジンはユニットのまとめやウォーク順のために **消費しません**。実行時バッチは `unit-of-work-dependency.md`（2.7）から計算します。

出荷の既定ウォークは **stage-major** です。対象の Construction ステージを全ユニットに走らせてから、次のステージへ。Code Generation が最後です。ウォーキングスケルトンのゲートは、対象になる最初の Construction EXECUTE ステージです。そのゲートのあと、ラダープロンプトが `Construction Autonomy Mode` を記録します。任意の `Construction Iteration: unit-major` は、あるユニットをユニットごとステージすべてへ通してから次のユニットへ進みます。スウォームを抑え、ステージごとのゲート連鎖を残します。

1. **3.1 Functional Design**（スコープ／実行計画で条件付き） — 全ユニット
2. **3.2 NFR Requirements**（条件付き） — 全ユニット
3. **3.3 NFR Design**（条件付き） — 全ユニット
4. **3.4 Infrastructure Design**（条件付き） — 全ユニット
5. **3.5 Code Generation**（いつも） — 全ユニット。自律スウォームでは、最後の DAG バッチのあとステージゲート 1 回
6. **3.6 Build and Test**（いつも） — 最後に一度
7. **3.7 CI Pipeline**（条件付き） — 最後に一度

いまの Construction ウォークは `docs/guide/04-phases-and-stages.md` を見てください。

### Cross-References

- **Orchestrator**: `dist/claude/.claude/skills/aidlc/SKILL.md` -- 振り分けロジック、スコープからステージへの対応、ステージグラフ、Construction フローの定義
- **Stage Protocol**: `dist/claude/.claude/aidlc-common/protocols/stage-protocol.md` -- 承認ゲート、質問形式、完了メッセージ、§13 Learnings Ritual。フェーズ境検証は `stage-protocol-governance.md` §13
- **Ideation Phase**: `docs/reference/04-stages/ideation.md` -- 前フェーズの文書
- **Construction Phase**: `docs/reference/04-stages/construction.md` — 既定ウォークは stage-major。`bolt-plan.md` は計画であり、ウォークの正本ではない
- **Deliberate Deviations**: SKILL.md は上流参照からの意図した差を書きます。RE のスコープ／フィンガープリント再実行ガード、aidlc-design-agent サポートの追加、ADR 成果物、Delivery Planning の拡張
