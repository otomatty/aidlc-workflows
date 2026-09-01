# Scopes, Depth, and Test Strategy

スコープは **どのステージが走るか** を決めます。深度は各ステージが **どこまで詳しく書くか** を決めます。テスト戦略は **テストを何本出すか** を決めます。三つ揃って、ライフサイクルを仕事に合わせます。包括的なエンタープライズ機能から、速いバグ修正まで。

この章はルーティングの詳細です。どんなワークフローを走らせるかを選ぶなら、先に [Workflow Profiles](workflow-profiles.md) を見てください。同じスコープを、利用者向けの言い方で説明しています。

---

## The 11 Core Scopes

コアは名前付きスコープを 11 個配っています。それぞれがステージ集合と、既定の深度を持ちます。プラグイン導入はスコープを足せます。導入側は `bun .claude/tools/aidlc-utility.ts select-plugins <names>` で、見えるプラグインスコープを狭められます。`plugins` 選択でコアを切る（`aidlc` を省く）と、コアのスコープファイルは導入されたまま残りますが、コアを再び有効にするまで実行時スコープとしては使えません。Initialization のステージは、有効なスコープならどれでも走ります。

### enterprise

**使うとき:** 規制のあるエンタープライズ機能。監査証跡、コンプライアンスレビュー、本番級の運用が要るとき。

- **Stages:** 33 全部
- **Default depth:** Comprehensive
- **含む:** コンプライアンス、セキュリティ、運用のステージ全部

### feature

**使うとき:** 大きさに関わらず、新しい機能を 33 ステージのライフサイクルで作るとき。明示は `--scope feature` か `/aidlc-feature`。

- **Stages:** 33 全部
- **Default depth:** Standard
- **含む:** 全ステージ。成果物の詳しさは Standard

### mvp

**使うとき:** greenfield の最小実用製品。後半の運用は飛ばすが、設計と Construction は残す。

- **Stages:** 33 のうち 23
- **Default depth:** Standard
- **飛ばす:** Operation の 7 ステージ全部（デプロイパイプライン、環境の用意、デプロイ実行、可観測性、インシデント対応、性能検証、フィードバック）に加え、Ideation の Market Research、Team Formation、Approval Handoff（飛ばす 10、走る 23）

### poc

**使うとき:** 実現性を早く確かめる。Ideation と Inception の大半を飛ばし、コードまで急ぐ。

- **Stages:** 33 のうち 8
- **Default depth:** Minimal
- **飛ばす:** Market Research、Feasibility、Team Formation、Mockups、User Stories、Operation の大半

### bugfix

**使うとき:** 特定のバグを直す。インテント捕捉からコード生成とテストまで、細い道。

- **Stages:** 33 のうち 9
- **Default depth:** Minimal
- **含む:** Deployment Pipeline と Deployment Execution。検証した直しを出荷するため
- **飛ばす:** Market Research、Feasibility、Team Formation、Mockups、設計とアーキテクチャの大半、環境の用意、広い運用準備

### refactor

**使うとき:** 振る舞いを変えずに、既存コードを整理または組み替える。

- **Stages:** 33 のうち 10
- **Default depth:** Minimal
- **含む:** Functional Design に加え、Deployment Pipeline と Deployment Execution
- **飛ばす:** bugfix に近い — コード分析、設計、実装、既存経路でのデプロイに絞る

### infra

**使うとき:** インフラの変更（新しい環境、CDK / CloudFormation の更新、コスト最適化）。

- **Stages:** 33 のうち 13
- **Default depth:** Standard
- **飛ばす:** ユーザー向けステージ（ストーリー、モック、ユーザーフロー）— アーキテクチャ、インフラ、デプロイに集中

### security-patch

**使うとき:** CVE や脆弱性への対応。セキュリティに効くステージを急ぐ。

- **Stages:** 33 のうち 10
- **Default depth:** Minimal
- **飛ばす:** Market Research、Team Formation、Mockups、セキュリティ以外の設計ステージ

### classic

**使うとき:** Ideation の儀式なしで、v1 型のライフサイクルを明示したいとき。残りのステージは実行時にプロジェクトへ合わせる。

- **Stages:** 33 のうち 26
- **Default depth:** Standard
- **Default test strategy:** Standard
- **飛ばす:** Ideation のステージ全部（1.1-1.7）
- **Keywords:** なし。明示で選ぶ

### workshop

**使うとき:** 進行付きのワークショップやトレーニングラボ。確立した Inception から Operation までのライフサイクルと、教え向けの軽いテスト下限。

- **Stages:** 33 のうち 26
- **Default depth:** Standard
- **Default test strategy:** Minimal
- **飛ばす:** Ideation のステージ全部（1.1-1.7）
- **Keywords:** `workshop`、`lab`、`training`

### express

**使うとき:** 要件からコードとテスト、条件付きのデプロイ末尾まで、いちばん軽い道。設計パスもレビュアー派遣も無し。

- **Stages:** 33 のうち 10
- **Default depth:** Minimal
- **Review cap:** なし
- **含む:** Initialization、条件付き Reverse Engineering、Requirements Analysis、Code Generation、Build and Test、条件付きの Deployment Pipeline、Deployment Execution、Observability Setup
- **飛ばす:** Ideation、設計、Units Generation、Delivery Planning、CI Pipeline、環境の用意、後半の運用ステージ

---

## Scope Routing Table

正本は `.claude/scopes/aidlc-<name>.md`（スコープの身元）、プラグインのスコープファイル、各ステージの `scopes:` frontmatter（所属）です。コンパイル先は `.claude/tools/data/scope-grid.json`。コンパイル済みグリッドには、いまのプラグイン選択で有効なスコープだけが入ります。生きた表は `bun .claude/tools/aidlc-utility.ts scope-table`（利用者向けの一行説明は `bun .claude/tools/aidlc-utility.ts help`）。

| Scope | EXECUTE / Total | Depth | Test Strategy | Use Case |
|-------|-----------------|-------|---------------|----------|
| `enterprise` | 33 / 33 | Comprehensive | Comprehensive | 規制のあるエンタープライズ機能。監査証跡まで |
| `feature` | 33 / 33 | Standard | Standard | 新機能のフルライフサイクル |
| `mvp` | 23 / 33 | Standard | Standard | greenfield。後半の運用は飛ばす |
| `poc` | 8 / 33 | Minimal | Minimal | 実現性を早く確かめる |
| `bugfix` | 9 / 33 | Minimal | Minimal | 特定のバグを直してデプロイ |
| `refactor` | 10 / 33 | Minimal | Minimal | 既存コードを整理してデプロイ |
| `infra` | 13 / 33 | Standard | Standard | インフラ変更 |
| `security-patch` | 10 / 33 | Minimal | Minimal | CVE 対応 |
| `classic` | 26 / 33 | Standard | Standard | Ideation 無しの v1 型ライフサイクル。暗黙の既定 |
| `workshop` | 26 / 33 | Standard | Minimal | 進行付きライフサイクル。教え向けのテスト |
| `express` | 10 / 33 | Minimal | Minimal | 要件から条件付きデプロイ。設計もレビュアーも無し |
| （自動判定） | 変動 | 変動 | 変動 | 自由文のインテントから AI が決める |

スコープの儀式は桁が違います。`poc` は狭い一回通し、`feature` は 33 ステージ全部、ゲート 29、Construction では設計 5 ステージが作業ユニットごとに広がります。スコープ確認の一行は、効く数字 — ステージ数、承認ゲート数、ユニットごとの広がり — を名前で出します。コンパイル済みグリッドとワークスペーススキャンから計算し、見積もりではありません。greenfield では Reverse Engineering が外れます。`units-generation` を飛ばすスコープは、ユニット DAG が無いのでユニットごとの条項を出しません。ワークフローが始まる前に、何に同意するかが分かります。

> **プロジェクト単位の既定スコープ:** チームは `.claude/settings.json` の `AWS_AIDLC_DEFAULT_SCOPE` で、プロジェクトの既定スコープを先に置けます。[Customization § Per-Project Default Scope](13-customization.md#per-project-default-scope) を見てください。

---

## Stage-by-Scope Matrix

上のルーティング表は件数です。この行列は、配布スコープごとに **どの** ステージが走るかです。ワークフローを始める前に、通る道が見えます。✓ はそのスコープでステージが EXECUTE。空欄は SKIP。番号と名前は [Phases and Stages](04-phases-and-stages.md) と揃えています。

<!-- BEGIN scope-stage-matrix: derived from each stage's `scopes:` frontmatter via the compiled scope-grid.json — kept in sync by tests/unit/t244-scope-matrix-doc-sync.test.ts; do not hand-edit cells without re-checking that test -->
| # | Stage | `enterprise` | `feature` | `mvp` | `poc` | `bugfix` | `refactor` | `infra` | `security-patch` | `classic` | `workshop` | `express` |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 0.1–0.3 | Initialization (all 3 stages) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 1.1 | Intent Capture & Framing | ✓ | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |
| 1.2 | Market Research | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| 1.3 | Feasibility & Constraints | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| 1.4 | Scope Definition | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| 1.5 | Team Formation | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| 1.6 | Rough Mockups | ✓ | ✓ | ✓ |  |  |  |  |  |  |  |  |
| 1.7 | Approval & Handoff | ✓ | ✓ |  |  |  |  |  |  |  |  |  |
| 2.1 | Reverse Engineering | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ |
| 2.2 | Practices Discovery | ✓ | ✓ | ✓ |  |  |  | ✓ |  | ✓ | ✓ |  |
| 2.3 | Requirements Analysis | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2.4 | User Stories | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 2.5 | Refined Mockups | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 2.6 | Domain Design | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 2.7 | Units Generation | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 2.8 | Contract Design | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 2.9 | Delivery Planning | ✓ | ✓ | ✓ |  |  |  |  |  | ✓ | ✓ |  |
| 3.1 | Functional Design | ✓ | ✓ | ✓ |  |  | ✓ |  |  | ✓ | ✓ |  |
| 3.2 | NFR Requirements | ✓ | ✓ | ✓ |  |  |  | ✓ | ✓ | ✓ | ✓ |  |
| 3.3 | NFR Design | ✓ | ✓ | ✓ |  |  |  | ✓ |  | ✓ | ✓ |  |
| 3.4 | Infrastructure Design | ✓ | ✓ | ✓ |  |  |  | ✓ |  | ✓ | ✓ |  |
| 3.5 | Code Generation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ |
| 3.6 | Build and Test | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |  | ✓ | ✓ | ✓ | ✓ |
| 3.7 | CI Pipeline | ✓ | ✓ | ✓ |  |  |  | ✓ |  | ✓ | ✓ |  |
| 4.1 | Deployment Pipeline | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.2 | Environment Provisioning | ✓ | ✓ |  |  |  |  | ✓ |  | ✓ | ✓ |  |
| 4.3 | Deployment Execution | ✓ | ✓ |  |  | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 4.4 | Observability Setup | ✓ | ✓ |  |  |  |  | ✓ |  | ✓ | ✓ | ✓ |
| 4.5 | Incident Response | ✓ | ✓ |  |  |  |  |  |  | ✓ | ✓ |  |
| 4.6 | Performance Validation | ✓ | ✓ |  |  |  |  |  |  | ✓ | ✓ |  |
| 4.7 | Feedback & Optimization | ✓ | ✓ |  |  |  |  |  |  | ✓ | ✓ |  |
| | **Total stages** | **33** | **33** | **23** | **8** | **9** | **10** | **13** | **10** | **26** | **26** | **10** |
<!-- END scope-stage-matrix -->

✓ は静的な所属です。スコープの計画に入っている、という意味で、無条件に走る、ではありません。CONDITIONAL のステージは、条件が満たなければ実行時に飛ばせます（例: Reverse Engineering は brownfield だけ）。未着手のステージは、承認したコンポーザー提案で形を変えられます（[the composer](#the-adaptive-composer)）。compose した（独自の）スコープはこの表に出ません。グリッドは配布スコープと並んで `scope-grid.json` にあります。

---

## Auto-Detection from Freeform Intent

スコープを明示しなくても構いません。やりたいことを書けば、オーケストレータがキーワードから適切なスコープを拾います。

```
/aidlc Build a REST API for inventory management
```

エンジンはインテントをキーワードパターンに当てます。

| Keywords | Detected Scope |
|----------|---------------|
| "fix"、"bug"、"broken" | `bugfix` |
| "refactor"、"clean up"、"simplify" | `refactor` |
| "infrastructure"、"deploy"、"infra" | `infra` |
| "security"、"CVE"、"vulnerability"、"patch" | `security-patch` |
| "proof of concept"、"prototype"、"poc"、"spike" | `poc` |
| "mvp"、"minimum viable" | `mvp` |
| "workshop"、"lab"、"training" | `workshop` |
| "express"、"lightweight" | `express` |
| 明示の低コンテキストフォールバック | コアが有効なら `feature`。そうでなければ、一意なら有効な唯一のプラグインの先頭スコープ |

**曖昧さの解消:** 入力にスコープキーワードと、それより長い案件説明（5 語超）が両方あると、一致はたまたま扱いになり、下の compose 提案が出ます。「Fix the infrastructure monitoring dashboard」が `infra` に落ちるのを防ぎます。合わせた計画の方が適切なことが多いためです。

キーワードがはっきり当たると、MATCHED スコープと、それが持つ儀式を一行で確認します。数字はコンパイル済みグリッドからです。

```
Starting a "bugfix" workflow for: "fix login bug" - 8 of 33 stages, 5 approval gates. Confirm to proceed,
name a different scope, or say "compose" for a tailored plan.
```

進めてよければ確認してください。別スコープ（または `compose`）を返せば、ワークフロー開始前に進路を直せます。

---

## The Adaptive Composer

下のリゾルバがキーワード無しのとき使う既定は `classic` です（`AWS_AIDLC_DEFAULT_SCOPE` で上書き可）。明示フォールバックと、低コンテキストのユーティリティ呼び出しが使います。利用者が見るコールドスタートでは、豊かな散文、キーワード無し、長い説明に埋もれたキーワードは、ワークフローを作る前に compose 提案へ入ります。Feature を黙って始めません。強制もできます。

```
/aidlc compose "harden the deployment pipeline and add observability"
/aidlc-compose "same thing, as a typeable shortcut"
/aidlc compose --report sonar.json     # compose from a scan report
/aidlc --new-scope "..."               # force a custom scope even on a stock match
```

コンポーザーエージェントは仕事を読み、実装エントロピーの 5 成分 — インテントの曖昧さ、コードベース構造の不確かさ、検証エントロピー、リスク、未解消の前提 — を見積もり、最小で足りるワークフローを組ます。成果に必要な成果物は全部出る、いちばん薄い EXECUTE / SKIP グリッドです。構造の見積もりは、CodeKB MCP が設定され索引済みなら、そのコールグラフとコンポーネント分析に拠ります（任意の外部ツール。AI-DLC 同梱ではない）。無ければ、範囲付きワークスペーススキャン（brownfield / greenfield、言語）に落ちます。ゲートで見る提案には、スコア内訳（成分ごとに LOW / MED / HIGH 帯と根拠）、助言の合成値、ステージごとの決定表（EXECUTE / SKIP すべてに理由）が付きます。承認、編集、却下。明示の承認まで、何も書かず、ワークフローも始まりません。承認すると:

- 提案が配布スコープに MATCHED なら、AI-DLC はそのスコープでワークフローを直接作ります（コード水準の所見が多いスキャンレポートは、だいたいこの道で `bugfix` か `security-patch` に落ちます）。
- CUSTOM グリッドなら、コンポーザーが本物のスコープ（`scopes/aidlc-<name>.md` と `scope-grid.json` の 1 行）を書き、同じターンで AI-DLC がそのスコープのワークフローを作ります。compose したスコープは、そのあと配布スコープと同じ解決です（`/aidlc --scope <name>`）。グラフ再コンパイルも生き延びます。`aidlc-graph.ts compile` は、ステージ frontmatter だけからグリッドを作り直すのではなく、compose したグリッド行を再生成した `scope-grid.json` に折り込みます。
- 画面／レポートの提案には、空でない `creationDescription` が付きます。compose 依頼に仕事の文があれば、その文そのもの。レポートだけ、または仕事文が無い提案は、承認した所見／計画から導きます。同じターンの作成は、リテラル `--` 区切りのあと、シェル安全な argv 値 1 つとして渡します（シェルに出すときは POSIX の単引用符）。状態の Project 欄とインテントレコードの slug は、シェルメタ文字を含む説明や、フラグで始まる説明も保ちます。compose 承認は、スコープだけで説明無しでは進めません。

**CodeKB への接地（任意）:** CodeKB は外部 MCP サーバです。コードベースの事前計算した構造分析（コールグラフ、コンポーネント一覧、パッケージ間結合）を出します。AI-DLC は同梱も必須もしません。無ければコンポーザーは、範囲付きワークスペーススキャンから構造を採点します。それが普通の道です。つなぐと、コンポーザーはそれを構造根拠の唯一の源にし、提案で引用します（`method: codekb`）。つなぎ方はハーネス次第です。Claude Code ではプロジェクトの `.mcp.json` にサーバを足す（サブエージェントはセッションの MCP を継ぐ）。Codex では `config.toml` に `mcp_servers` を足す。opencode では opencode 設定へ。Copilot CLI では `~/.copilot/mcp-config.json`、VS Code では `.vscode/mcp.json`。Kiro CLI の配布コンポーザー設定は `includeMcpJson: true` なので、CodeKB をつなぐとは `.kiro/settings/mcp.json` に足して `"disabled": true` を付けず、コンポーザーエージェントの `tools` に `@<server>` 許可を足すことです。Kiro IDE はフォールバック専用のままです。CodeKB と、フレームワーク自身の "codekb" ディレクトリ（`aidlc/spaces/<space>/codekb/`）を混同しないでください。後者は Reverse Engineering ステージが書くローカル成果物ストアで、MCP サーバとは無関係です。CodeKB 根拠があると、コンポーザーは Reverse Engineering のスキップを提案することがあります。そのとき提案は、下流がそのローカルストア無しで走ること開示しなければならず、決めるのはゲートの人です。

**キーワードを汚さない:** compose したスコープは `keywords: []` で出荷するので、一回限りの計画はキーワード自動判定に入りません。将来のプロンプトから推定できるようにするかは、ゲートでの明示の問いであり、副作用ではありません。

**途中の再 compose:** ワークフローの途中で `/aidlc compose` は、走っているワークフローの PENDING ステージの形を変える提案を出します。もう要らないものは飛ばし、要ると分かった未着手ステージを戻す。コンポーザーは、完了したステージが実際に解消したことからエントロピー成分を再見積もりするので、提案する反転はどれも、スコアを動かした根拠を名前で出します（「実現性が結合の問いを片付けた — リスクは MED に再採点」）。反転が効くのは未着手で、カーソルより先のステージだけです（完了と進行中は凍結）。厳格検証するので、残るステージが必須入力を失いません。監査ロックの下、決定論的な `recompose` 動詞で着地し、`RECOMPOSED` 監査イベントが残ります。Construction の最初の EXECUTE ステージ（walking-skeleton ゲートの錨）は反転できません。

動詞そのものは要りません。途中の普通の会話「市場調査は飛ばせる？この市場はもう分かっている」は、形を変える依頼として認識され、同じゲート、同じ `recompose` 動詞へ流れます。ステージを自分で名前したとき（「market-research と team-formation を落とす」）は、コンダクターがコンポーザーエージェントを出さず、ゲートを直接出すことがあります。承認ゲートと検証はどちらでも同じです。Claude 以外のハーネスでは、リテラル `/aidlc compose "<request>"` が文書上の確実な道です。

---

## The 3 Depth Levels

深度は、各ステージが出す成果物の詳しさです。スコープが既定を置きますが、上書きできます。

| Depth | Artifact Detail | When to Use |
|-------|----------------|-------------|
| **Minimal** | 核だけ。短い文書、主要な判断、補助分析は最小。 | 速い直し、パッチ、概念実証 |
| **Standard** | バランス。要件は揃え、アーキテクチャ判断には根拠、テスト計画は一通り。 | 大半の機能と MVP |
| **Comprehensive** | エンタープライズまで。要件は網羅、コンプライアンスマトリクス、詳しい NFR 仕様、監査文書一式。 | 規制のある機能、エンタープライズ配備 |

### How depth affects stages

各ステージで、エージェントはいまの深度に合わせて出力を変えます。

- **Minimal:** 成果物 1〜2 ページ。主要な判断だけ。任意セクションは飛ばす
- **Standard:** 成果物は揃える。必須セクション全部。根拠は簡潔
- **Comprehensive:** 成果物を広げる。任意セクションも含む。根拠は詳しく、コンプライアンス相互参照

### Overriding depth

深度は 3 か所で変えられます。

1. **`--depth` CLI フラグ** — 起動時に上書き:
   ```
   /aidlc --depth comprehensive
   /aidlc --scope bugfix --depth standard
   /aidlc --stage code-generation --depth minimal
   ```
2. **スコープ確認のとき** — オーケストレータが判定スコープを確認したら、確認だけでなく `--depth <level>` で返す
3. **どの承認ゲートでも** — フィードバックの一部として、別の深度を求める

各セッションの最初の完了メッセージが思い出させます。

```
**Project depth**: Standard — depth adapts artifact detail.
**Test strategy**: Standard — test strategy controls test volume.
You can request different depth or test strategy at any approval gate.
```

---

## Specifying Scope Directly

### Explicit scope

```
/aidlc feature
/aidlc bugfix
/aidlc enterprise
```

### Scope with description

```
/aidlc bugfix Fix the login timeout issue
/aidlc poc Build a quick prototype for the search feature
```

### Override scope with utility command

```
/aidlc --scope bugfix
/aidlc --scope enterprise --stage code-generation
```

`--scope` フラグは `--stage`、`--phase`、`--depth` と組み合わせてジャンプできます。

### Override depth

```
/aidlc --depth minimal
/aidlc --scope bugfix --depth comprehensive
/aidlc --scope enterprise --depth standard --stage code-generation
```

`--depth` フラグは、スコープの既定深度を上書きします。有効な値: `minimal`、`standard`、`comprehensive`（大文字小文字は問わない）。

### Override test strategy

```
/aidlc --test-strategy minimal
/aidlc --depth standard --test-strategy minimal
```

`--test-strategy` フラグは、深度とは独立にテスト戦略を上書きします。詳しくは下の [The 3 Test Strategy Levels](#the-3-test-strategy-levels)。

---

## The 3 Test Strategy Levels

テスト戦略は **テストを何本出すか** と **どの種類を入れるか** を決めます。深度とは独立です。深度は成果物の詳しさ（文書、図、質問）、テスト戦略はテスト量だけです。分かれているので、速さの方がカバレッジより大事なとき、Standard 深度のフルワークフローに Minimal テストを載せられます。

### Minimal — Nyquist model

信号処理の Nyquist レートから借りています。信号を復元するのに必要な最小サンプリング周波数。Minimal テスト戦略は、要件をすべて検証するのに必要な最小のテストを出します。足りもせず、余らせもしません。

- **識別した要件につきテスト 1 本**（要件駆動。コンポーネント駆動ではない）
- **ハッピーパス下限:** 要件が対応していなくても、コンポーネントごとにハッピーパスのユニットテストを少なくとも 1 本
- **既定はユニットテスト。** bugfix / security-patch の狙い撃ち回帰は、欠陥を再現するいちばん狭い段が統合や E2E ならそれを使います。関係ないテスト量は Minimal のまま
- 典型的な案件で **合計およそ 5〜15 本**
- 柔らかい目安 — 安全が重要な文脈では、エージェントは超えてよい

**向く仕事:** ワークショップ、トレーニング、概念実証、速いバグ修正 — 正しさは確かめたいが、テスト一式には投資しないとき。

### Standard — per-component model

コンポーネント間の境界を検証する、バランスの取れたカバレッジ。

- **コンポーネントあたり 5〜8 本**
- **ユニット + 統合テスト**（コンポーネント間の主要な境界）
- E2E、性能、セキュリティは、NFR が明示で求めたときだけ
- **テストピラミッド比:** ユニットおよそ 75% / 統合およそ 20% / E2E およそ 5%
- 柔らかい目安

**向く仕事:** 大半の機能と MVP — 過投資せず、十分なカバレッジ。

### Comprehensive — full coverage model

テスト種類を横断した、厚いカバレッジ。

- **コンポーネントあたり 10〜15 本**
- **全種類:** ユニット + 統合 + E2E + 性能（NFR があれば）+ セキュリティ（NFR があれば）
- **テストピラミッド比** は種類をまたいで効く
- 柔らかい目安

**向く仕事:** エンタープライズ機能、規制のあるシステム、テストカバレッジの監査証跡が要るとき。

### How test strategy defaults work

コアの大半のスコープは、テスト戦略を深度から継ぎます。したがって `classic` は本番の Standard テスト下限、`express` は要件駆動の Minimal 下限です。`workshop` は教えのセッション向けに、Standard 深度でも明示の Minimal 上書きを残します。いつでも `--test-strategy` で上書きできます。

### Overriding test strategy

テスト戦略は 3 か所で変えられます。

1. **`--test-strategy` CLI フラグ** — 起動時に上書き:
   ```
   /aidlc --test-strategy minimal
   /aidlc --depth standard --test-strategy minimal
   /aidlc --scope bugfix --test-strategy comprehensive
   ```
2. **ワークフローの途中** — 走っているワークフローのテスト戦略を変える:
   ```
   /aidlc --test-strategy comprehensive
   ```
3. **どの承認ゲートでも** — フィードバックの一部として、別のテスト戦略を求める

### Common depth + test strategy combinations

| Depth | Test Strategy | Effect | When to use |
|-------|--------------|--------|-------------|
| Standard | Standard | 成果物はフル、テストはバランス | Feature、classic、そのほか本番スコープ |
| Standard | Minimal | 成果物はフル、Nyquist テスト | ワークショップ、時間を切ったセッション |
| Minimal | Minimal | 成果物は薄く、要件駆動テスト | Express、速いバグ修正、パッチ |
| Comprehensive | Comprehensive | 全部フル | 規制のあるエンタープライズ機能 |
| Comprehensive | Standard | 成果物はフル、テストはバランス | エンタープライズで、テストは現実的に |
| Minimal | Comprehensive | 成果物は薄く、テストは厚い | 確信度が要る重要なバグ修正 |

---

## Choosing the Right Scope

| Situation | Recommended Scope |
|-----------|------------------|
| 本番アプリの新機能 | `feature` |
| ゼロからの greenfield 製品 | `mvp` または `feature` |
| 方針の速い検証 | `poc` |
| 直すべき既知のバグ | `bugfix` |
| 振る舞いを変えないコード整理 | `refactor` |
| 新しい AWS 環境や CDK の変更 | `infra` |
| CVE や脆弱性への対応 | `security-patch` |
| コンプライアンスが要る規制機能 | `enterprise` |
| Ideation 無しの明示ライフサイクル | `classic` |
| 要件からデプロイまでの軽い通し | `express` |
| AI-DLC のワークショップやトレーニングラボ | `workshop` |

迷ったら、後方互換のフルライフサイクルなら `feature`。Ideation を飛ばしたいときは `classic` を明示してください。

---

## Next Steps

- [Phases and Stages](04-phases-and-stages.md) — 各ステージの中身
- [Agents](06-agents.md) — どのエージェントがどのスコープに入るか
- [Skills and Runner Commands](17-skills.md) — bugfix、express、feature、mvp、security-patch 向けの一語 `/aidlc-<scope>` ランナー
- [CLI Commands](12-cli-commands.md) — コマンド一覧
- [Glossary](glossary.md) — 用語
