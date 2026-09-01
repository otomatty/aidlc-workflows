# Construction Phase -- Stage Reference (3.1-3.7)

## Phase Overview

Construction フェーズは、Inception の設計成果物を、動いてテストされたソフトウェアへ落とします。機能設計、非機能要件と設計、インフラ設計、コード生成、ビルド／テスト検証、CI パイプライン設定にまたがる 7 ステージ（3.1 から 3.7）です。

Construction は AI-DLC 方法論の 5 フェーズのうち 4 番目です。コンパイル済みスコープグリッドが、どのステージが走り、どれを飛ばすかを決めます。実行時のユニットバッチは `unit-of-work-dependency.md`（ステージ 2.7）から出ます。Delivery Planning（ステージ 2.9）は承認済みのボルト計画を出します — 計画の中身であり、ウォークの正本ではありません。

ステージはすべて、承認ゲート、質問形式、完了メッセージ、状態追跡について `stage-protocol.md` に従います。

> **Path convention.** 各ワークフローの成果物は **インテントのレコードディレクトリ** の下に置きます — `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（`<space>` は非既定スペースを使っていなければ `default`。`<YYMMDD>-<label>` はインテントディレクトリで、`260624` のような短い UTC 日付接頭辞に短い kebab-case ラベルを足し、レコードが時系列に並ぶ）。以降、`<record>/` はそのディレクトリの略です。例:
> `<record>/construction/{unit-name}/functional-design/` は
> `aidlc/spaces/default/intents/<YYMMDD>-<label>/construction/{unit-name}/functional-design/` に展開します。
> ディレクトリ名は人が読むラベルで、正本の身元は `intents.json` のレジストリ行に残る UUIDv7 です。（インテントごとの配置より前に作ったプロジェクトは平らな木でした。エンジンは初回実行で移行します。）

---

## Construction walk

[ボルト](../../guide/glossary.md) は、Delivery Planning（2.9）が出す計画上の Construction デリバリーのまとまりです。ユニット 1 つ以上、Definition of Done、確信度の仮説、オーナーシップ。Construction の **既定ウォークは stage-major** です。あるステージを全ユニットに走らせてから次のステージへ。コード生成が最後です。そのウォークはまだ、2.9 の計画を実行時の境界としては扱いません。任意の `Construction Iteration: unit-major` ウォーク（あるユニットをユニットごとステージすべてへ通してから次のユニット）のほうが、ユニットごとのボルトに近いです。

`BOLT_STARTED` / `BOLT_COMPLETED` はスウォーム／worktree 経路で出ます。既定の gated 実行では記録しません。実行時バッチは `unit-of-work-dependency.md`（ステージ 2.7）から再計算します。ステージ 2.9 の `bolt-plan.md` は計画成果物です（並び、ボルトごとの DoD、ウォーキングスケルトン印）。ウォーキングスケルトンの姿勢は `org.md` → `team.md` → `project.md` で解決します（いちばん具体で空でない文が勝つ）。ボルト計画の印はその解決した姿勢に対して advisory です（`PRACTICES_OVERRIDE` / `bolt-plan-marker-conflict`）。既定ウォークでは、ウォーキングスケルトンのゲートは対象になる最初の Construction EXECUTE ステージです。
ステージ 3.6（Build and Test）と 3.7（CI Pipeline）は最後に、全ユニットに対して **一度** 走ります。

```
Default walk (stage-major):
  First in-scope Construction EXECUTE stage for every Unit
  → Walking-skeleton gate
  → Ladder prompt (fires once): "Continue autonomously" or "Gate every Bolt"
  Then the next stage for every Unit, code-generation last

Opt-in (`Construction Iteration: unit-major`):
  Each Unit through every per-unit stage, then the next Unit

After all Units:
  3.6 Build and Test (runs once across the full codebase)
  3.7 CI Pipeline    (runs once, conditional)
```

各設計ステージファイル（3.1–3.4）は QUESTION-ONLY と ARTIFACT-ONLY の実行モードをサポートします — 詳細は各ステージファイルです。Code Generation の Step 3 **Plan Approval は生成の前にいつもハードストップ** します。Construction 中も含みます。抑えるのは Step 7 のユニットごと完了承認ゲートだけで、**エンジンが** 通常の Construction では抑えます。最後のユニットが落ち着いたあと、ステージ単位の完了ゲート 1 つが代わります。自律スウォームでは、そのゲートは最後の DAG バッチが収束したあとだけ発火します（中間バッチはゲートなしでマージ）。ユニットごとの完了ゲートは直接呼び出し（例: `/aidlc --stage code-generation`）では残ります。

**Construction のイテレーション順（任意）。** 既定ではエンジンはユニットごとの Construction ステージを stage-major で回します。3.1 を全ユニットに走らせ、続けて 3.2 を全ユニットに、という順で、3.5 Code Generation が全ユニットの最後です。状態ファイルが `## Runtime State` の下に `Construction Iteration: unit-major` を記録しているとき（delivery-planning で `aidlc-state.ts set-construction-iteration unit-major` が置く、または人が置く）、エンジンは代わりに unit-major で歩きます。ボルトビルド順の各ユニットについて、そのユニットの設計文書 4 つ（3.1 から 3.4）を書いてからコード（3.5）を生成し、それから次のユニットが始まります — 最初の動くコードは、全ユニットの設計のあとではなく、1 ユニットの設計のあとに着地します。Code Generation のユニットごと Plan Approval（Step 3）は生成の前にまだハードストップし、このノブが立っているあいだ自律 Construction スウォームは発火しません（ウォークがビルドを持ち、ボルトビルド順で直列。自律スウォームモードの並行バッチは stage-major の領分です）。
ステージごとの承認ゲートは数も仕組みも変わりません。unit-major では遅く発火し、ステージ順で、ステージ × ユニットの格子全体 — Code Generation も含む — が覆われたあと、ステージごとに人の承認 1 回です。
有効にするのは正確な値 `unit-major` だけです。無い、または `stage-major` が既定です。

delivery planning がさらに `Unit Ownership: team` を記録すると、その遅いゲートはユニットゲートに置き換わります。既定の `per-stage` 拍子は、落ち着いた `(stage, Unit)` ごとに、そのユニットが進む前にゲートします。`unit-end` はそのユニットの、最後のアクティブでスキップしていないユニットごと Construction ステージのあと一度ゲートします。エンジンは毎回の `next` で派生した `## Unit Progress` 表を更新し、報告は `--unit` を含むので、承認／却下とレシートの床はそのユニットだけに効きます。`solo`、または所有フィールドが無ければ、古いディレクティブ、状態バイト、イベント、遅いカスケードはそのままです。

チームモードのクレームは `claim/<intent-id8>/<unit>` 参照と compare-and-swap 更新を使います。成功したクレームは gitignore したチェックアウトスタンプを書き、そのチェックアウトはスタンプしたユニットだけを回し、ライフサイクル、レビュー、ゲート、フォーク証拠にクレーム世代を運びます。スコープ無しの main は、クレームが生きているあいだ終端の fan-out 通知を出します。`aidlc-unit.ts release <unit>` は参照を消さず墓石を書き、古い試行を無効にしつつ履歴を残します。参加者クローンは `aidlc-unit.ts participate` で案内付きクレームピッカーへ一度オプトインします。ファシリテータの main はそのマーカを意図して省きます。スコープ付き振り分けとレシート書きはオフラインファーストです。クレーム時のスタンプが権威です。レジストリの生存確認はフォーク／リリースなどクレームに敏感な境界だけで再検査します。リモートが使えなければ警告してスタンプから進み、オンラインで古い、または解放済みの試行は拒否します。

完了したチームはコミットし、`aidlc unit publish <unit>` を走らせます。スコープ無しの main はそのクレーム参照の正確な OID をピンし、worktree を実体化せず成果物／レシート／ゲート／レビューと Plan Approval を検証し、人のマージゲートを 1 つ記録し、`aidlc unit land` で候補を着地させます。Git の中身が着地してからユニット行を折ります。main が持つ状態／ランタイムマーカは残し、チームの新しい監査シャードが試行キー付きレシートを運び、`UNIT_MERGED` が行を印します。ソース衝突は状態変異の前に中断します。最後のマージ済み行のあと、Build and Test と CI Pipeline は main 上で一度回ります。

**ユニットごとのバッチ波（任意、stage-major のみ）。** 既定の stage-major ウォークでは、エンジンはインライン設計ステージ 4 つ（3.1–3.4）のどれかへ `directive.wave` を出してよいです。波は癒した DAG スナップショット 1 つから来ます。コンダクターは `runtime-graph.json` を読まず、兄弟パスも導きません。
Code Generation（3.5、`workspace_requires: true`）は NEVER 波対象です。並行ビルダが共有ワークスペースへの書き込みで衝突するからです（スウォーム経路のユニットごと worktree はまさにこの隔離のためです）。Step 3 Plan Approval はどの実行モードでも必須のハードストップで、ビルダの戻りメッセージへ折り込めません。

各エントリは、kind 解決済みの consumes、明示の欠ける consumes、produces 全部、適用する必須部分集合、ユニット局所の日記パス、ビルド状態、対レビュー状態、その波の完了レシートがまだ要るかを運びます。ビルダは親ステージファイル、インライン文脈ロスター、警告、正確な蓄積ステアリング内容を受け取ります。封鎖されたビルダが差し控えるのは適用する必須パスであり、任意または kind 免除のパスではありません。ビルドとレビューのあと、`unit complete --wave` が生きているエントリを検証し、ユニット日記エントリを親日記へ冪等に広げ、`UNIT_COMPLETED` を出します。エンジンは適用する全ユニットがその証拠をすべて持つまでいまのバッチを保持し、そのあと依存バッチまたは単一のステージゲートを許します。波は `Construction Iteration: unit-major` では決して適用しません。並行派遣の原語が無いハーネスはエントリを直列に処理します。契約の全文は `stage-protocol-construction.md` § "Per-unit batch waves" です。

**並行バッチ。** 2 つ以上のユニットが依存充足を共有し、互いに依存していなければ、コンダクターは 1 つのアシスタントメッセージで N 個の `Task` を出し、それらの Code Generation ステージを同時に派遣します。自律スウォームでは、エンジンが DAG バッチをすべて収束させてから、Code Generation のステージゲートを **1 回** 出します — 中間バッチはゲートなしでマージします。監査イベント（`BOLT_STARTED`、`BOLT_COMPLETED`）はスウォーム経路でユニット／worktree ごと、`SWARM_COMPLETED` がバッチを閉じます。既定の gated 実行では `BOLT_*` は記録しません。

**失敗の扱い。** Code Generation の失敗は、自律モードにかかわらずいつも Construction を止めます。選択肢は retry（失敗したユニットだけ再実行）、skip（`[S]` を付けて続ける — 依存側も失敗し得る）、abort です。並行バッチの成功した兄弟は `[x]` 状態と成果物を残します。正本の仕様は `stage-protocol-construction.md` § "Construction Bolt gates" です。

---

## Stage Summary Table

| Stage | Name                  | Execution   | Condition                                                                                          | Lead Agent          | Support Agents    | Mode                       | Per-Unit |
|-------|-----------------------|-------------|----------------------------------------------------------------------------------------------------|---------------------|-------------------|-----------------------------|----------|
| 3.1   | Functional Design     | CONDITIONAL | 新しいデータモデル、複雑なビジネスロジック、またはビジネスルールの設計が要る                             | aidlc-architect-agent     | aidlc-developer-agent   | inline                      | Yes      |
| 3.2   | NFR Requirements      | CONDITIONAL | 性能、セキュリティ、スケーラビリティ、信頼性、可観測性の要件が要る、または技術スタック選択が要る | aidlc-architect-agent     | aidlc-devsecops-agent, aidlc-compliance-agent, aidlc-quality-agent   | inline                      | Yes      |
| 3.3   | NFR Design            | CONDITIONAL | NFR Requirements が走り、NFR パターンの設計が要る                                          | aidlc-architect-agent     | aidlc-aws-platform-agent| inline                      | Yes      |
| 3.4   | Infrastructure Design | CONDITIONAL | インフラサービスの対応づけ、デプロイアーキテクチャ、またはクラウドリソースが要る   | aidlc-aws-platform-agent  | aidlc-devsecops-agent, aidlc-compliance-agent   | inline                      | Yes      |
| 3.5   | Code Generation       | ALWAYS      | 実行計画の全ユニットでいつも走る                                               | aidlc-developer-agent     | (none)            | subagent (aidlc-developer-agent)  | Yes      |
| 3.6   | Build and Test        | ALWAYS      | ユニットごとステージがすべて終わったあと、いつも一度走る                                         | aidlc-quality-agent       | aidlc-devsecops-agent   | inline                      | No       |
| 3.7   | CI Pipeline           | CONDITIONAL | CI パイプラインの作成または大きな改修が要るとき                                | aidlc-pipeline-deploy-agent| (none)           | inline                      | No       |

---

## Stage 3.1: Functional Design

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.1                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (per execution plan)                                                                  |
| Condition         | 新しいデータモデル、複雑なビジネスロジック、またはビジネスルールの設計が要る。新しいビジネスロジックが無い単純なロジック変更なら飛ばす。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | aidlc-architect-agent                                                                                   |
| support_agents    | aidlc-developer-agent                                                                                   |
| mode              | inline                                                                                            |
| Inputs            | unit-of-work.md, unit-of-work-story-map.md, requirements.md, domain design artifacts         |
| Outputs           | `<record>/construction/{unit-name}/functional-design/` -- functional-spec.md, rules.md, entities.md, CONDITIONAL: frontend-components.md |

### Purpose

1 作業ユニットのビジネスロジック、ドメインモデル、ルールを設計します。aidlc-architect-agent がリードし、aidlc-developer-agent が技術的実現性の入力を出します。

### Inputs

- `<record>/inception/units-generation/unit-of-work.md` のユニット定義
- `<record>/inception/units-generation/unit-of-work-story-map.md` の割り当てストーリー
- `<record>/inception/requirements-analysis/requirements.md` の要件
- `<record>/inception/domain-design/` のドメイン設計成果物

### Steps

1. **Read Unit Context** -- ユニット定義、割り当てストーリー、要件、ドメイン設計成果物を読みます。

2. **Create Functional Design Plan** -- ユニットのスコープを分析し、`<record>/construction/{unit-name}/functional-design/functional-design-questions.md` に `[Answer]:` タグ付きの文脈に合う質問ファイルを作ります。焦点:
   - ビジネスロジックのワークフローとアルゴリズム
   - ドメインモデルとエンティティ関係
   - ビジネスルール、制約、検証ロジック
   - データフローと変換
   - ほかのユニットまたは外部システムとの統合点
   - エラー処理とエッジケース
   - フロントエンドコンポーネント（コンポーネント階層、props/state、インタラクションフロー、フォーム検証）
   - ビジネスシナリオ（エンドツーエンドのユーザージャーニー、ハッピー／アンハッピーパス、並行のエッジケース）

3. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従い答えを集めます（対話モードの選択を出し、答えを集め、ファイルへ書き戻す）。MANDATORY なあいまいさ分析:
   - 曖昧な答え（"mix of"、"not sure"、"depends"、"probably"）を特定
   - 答え同士の矛盾を検査
   - 成果物生成に要る欠けた詳細に印
   - あいまいさが 1 つでもあれば: フォローアップ質問を作り、進む前に解消

4. **Generate Artifacts** -- `<record>/construction/{unit-name}/functional-design/` に次を生成します:
   - **functional-spec.md**: ユニットのビジネスロジック向けの詳しいアルゴリズム、ワークフロー、データ変換、処理順、決定木
   - **rules.md**: 決定ルール、検証ロジック、制約、方針、条件付き振る舞い、ビジネス不変条件
   - **entities.md**: エンティティ、関係、データ構造、属性、ライフサイクル状態、エンティティ相互作用パターン
   - **frontend-components.md**（CONDITIONAL -- ユニットがフロントエンド／UI を含むときだけ）: コンポーネント階層、props/state 設計、インタラクションフロー、フォーム検証ルール、API 統合点

5. **Prepare Completion** -- ユニットの Functional Design 成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

6. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                 | Description                                                              |
|--------------------------|--------------------------------------------------------------------------|
| functional-spec.md  | アルゴリズム、ワークフロー、データ変換、処理順、決定木 |
| rules.md        | 決定ルール、検証ロジック、制約、方針、条件付き振る舞い |
| entities.md       | エンティティ、関係、データ構造、属性、ライフサイクル状態   |
| frontend-components.md   | （CONDITIONAL）コンポーネント階層、props/state、インタラクションフロー、フォーム検証、API 統合 |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes

- 質問ファイルはステージ成果物と同じ場所、`<record>/construction/{unit-name}/functional-design/functional-design-questions.md` です。
- frontend-components.md は、ユニットがフロントエンド／UI 作業を含むときだけ出ます。
- 質問はすべて三モード対話フロー（Guide me / I'll edit the file / Chat）を使います。

---

## Stage 3.2: NFR Requirements

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.2                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (per execution plan)                                                                  |
| Condition         | 性能、セキュリティ、スケーラビリティ、信頼性、可観測性の要件が要る、または技術スタック選択が要る。NFR 要件が無く技術スタックがすでに決まっていれば飛ばす。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | aidlc-architect-agent                                                                                   |
| support_agents    | aidlc-devsecops-agent, aidlc-compliance-agent, aidlc-quality-agent                                       |
| mode              | inline                                                                                            |
| Inputs            | functional design artifacts, requirements.md, RE artifacts                                        |
| Outputs           | `<record>/construction/{unit-name}/nfr-requirements/` -- performance-requirements.md, security-requirements.md, scalability-requirements.md, reliability-requirements.md, observability-requirements.md, tech-stack-decisions.md |

### Purpose

1 ユニットについて、性能、セキュリティ、スケーラビリティ、信頼性、可観測性、技術選択にまたがる非機能要件を定義します。aidlc-architect-agent がリードし、aidlc-devsecops-agent がセキュリティ入力、aidlc-compliance-agent が規制入力、aidlc-quality-agent がテスト容易性と測定可能性の入力を出します。

### Inputs

- `<record>/construction/{unit-name}/functional-design/` の機能設計成果物（あれば）
- `<record>/inception/requirements-analysis/requirements.md` の要件
- `aidlc/spaces/<active-space>/codekb/<repo>/` のリバースエンジニアリング成果物（あれば）

### Steps

1. **Read Prior Artifacts** -- 機能設計成果物（あれば）、要件、リバースエンジニアリング成果物を読みます。

2. **Assess NFR Categories** -- ユニットを NFR カテゴリで分析します:
   - **Performance**: 応答時間、スループット、レイテンシ目標、リソース使用
   - **Security**: 認証、認可、データ保護、コンプライアンス要件
   - **Scalability**: 負荷の扱い、成長見通し、スケール戦略
   - **Reliability**: 可用性目標、耐障害、災害復旧、データ耐久性
   - **Observability**: 監視、ログ、アラート、トレーシング要件

3. **Generate Questions** -- 不明な NFR 領域向けに、`<record>/construction/{unit-name}/nfr-requirements/nfr-requirements-questions.md` を `[Answer]:` タグで作ります。定量目標と具体的な制約に焦点を当てます。

4. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従い答えを集めます。MANDATORY なあいまいさ分析:
   - 曖昧な答え（"fast enough"、"highly available"、"secure"）を特定
   - NFR 目標同士の矛盾を検査
   - 欠けた定量目標に印
   - あいまいさが 1 つでもあれば: フォローアップ質問を作り、進む前に解消

5. **Generate Artifacts** -- `<record>/construction/{unit-name}/nfr-requirements/` に次を生成します:
   - **performance-requirements.md**: 応答時間目標、スループット要件、レイテンシ予算、リソース制約、ベンチマーク
   - **security-requirements.md**: 認証要件、認可モデル、データ保護、コンプライアンス、脅威の考慮
   - **scalability-requirements.md**: 負荷見通し、スケールトリガ、容量計画、データ成長、並行目標
   - **reliability-requirements.md**: 可用性目標（SLA/SLO）、耐障害要件、バックアップ／復旧、段階的劣化
   - **observability-requirements.md**: 監視要件、ログ標準、分散トレーシングの必要性、アラート閾値、ダッシュボード要件、SLI/SLO 定義
   - **tech-stack-decisions.md**: 技術選択と根拠 — 言語、フレームワーク、データベース、インフラツール、各選択の正当化

6. **Prepare Completion** -- ユニットの NFR Requirements 成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

7. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                     | Description                                                                |
|------------------------------|----------------------------------------------------------------------------|
| performance-requirements.md  | 応答時間、スループット、レイテンシ予算、リソース制約、ベンチマーク |
| security-requirements.md     | 認証、認可、データ保護、コンプライアンス、脅威        |
| scalability-requirements.md  | 負荷見通し、スケールトリガ、容量計画、並行         |
| reliability-requirements.md  | 可用性目標（SLA/SLO）、耐障害、バックアップ／復旧           |
| observability-requirements.md | 監視、ログ、トレーシング、アラート、ダッシュボード、SLI/SLO 定義    |
| tech-stack-decisions.md      | 各選択の根拠付き技術選定                       |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes -- NFR Granularity Expansion

このステージは **成果物ファイル 6 つ** を出します。上流参照の NFR Requirements が定義するのは 2 ファイルだけです。これは SKILL.md（"Deliberate Deviations from Reference"）に書いた意図した逸脱です。粒度を細かくするとトレーサビリティが良くなり、1 文書を過負荷にせず関心ごとのレビューができます。6 ファイルは性能、セキュリティ、スケーラビリティ、信頼性、可観測性を専用成果物へ分け、技術選択の根拠向けに tech-stack-decisions.md を足します。

---

## Stage 3.3: NFR Design

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.3                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (only if NFR Requirements was executed)                                               |
| Condition         | NFR Requirements が走り、NFR パターンの設計が要る。NFR Requirements を飛ばしていれば飛ばす。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | aidlc-architect-agent                                                                                   |
| support_agents    | aidlc-aws-platform-agent                                                                                |
| mode              | inline                                                                                            |
| Inputs            | NFR requirements artifacts, functional design artifacts                                           |
| Outputs           | `<record>/construction/{unit-name}/nfr-design/` -- performance-design.md, security-design.md, scalability-design.md, reliability-design.md, observability-design.md, logical-components.md |

### Purpose

NFR 要件を具体的な設計パターンとアーキテクチャ解へ訳します。aidlc-architect-agent がリードし、aidlc-aws-platform-agent がインフラとプラットフォームの入力を出します。

### Inputs

- `<record>/construction/{unit-name}/nfr-requirements/` の NFR 要件
- `<record>/construction/{unit-name}/functional-design/` の機能設計成果物（あれば）
- アーキテクチャ文脈向けの `<record>/inception/domain-design/` のドメイン設計

### Steps

1. **Read Prior Artifacts** -- NFR 要件、機能設計成果物（あれば）、アーキテクチャ文脈のためのドメイン設計を読みます。

2. **Generate Design Questions** -- `<record>/construction/{unit-name}/nfr-design/nfr-design-questions.md` を `[Answer]:` タグ付きの文脈に合う質問で作ります。焦点:
   - レジリエンスパターン（サーキットブレーカ、バルクヘッド、フォールバック戦略）
   - スケーラビリティパターン（水平 vs 垂直、データ分割、キャッシュ階層）
   - 性能最適化（レイテンシ予算、スループット目標、リソースプーリング）
   - セキュリティの進め方（多層防御、ゼロトラスト、暗号化標準）
   - 可観測性の進め方（メトリクスと SLI/SLO 目標、構造化ログ、トレーシング深度、アラートの哲学、ダッシュボードの必要性）
   - 論理コンポーネント境界（サービス隔離、障害ドメイン、ブラスト半径）

3. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従い答えを集めます。MANDATORY なあいまいさ分析:
   - 曖昧な答え（"mix of"、"not sure"、"depends"、"probably"）を特定
   - 答え同士の矛盾を検査
   - 成果物生成に要る欠けた詳細に印
   - あいまいさが 1 つでもあれば: フォローアップ質問を作り、進む前に解消

4. **Design NFR Solutions** -- 各 NFR カテゴリの具体解を設計します:
   - **Performance**: キャッシュ戦略、クエリ最適化、コネクションプーリング、非同期処理、CDN、遅延読み込み、ページネーション
   - **Security**: 認証フロー、認可モデル、暗号化（保管時と転送時）、入力検証、CSRF/XSS 保護、シークレット管理、監査ログ
   - **Scalability**: 水平／垂直スケールの進め方、負荷分散、データ分割／シャーディング、キューによる疎結合、ステートレス設計
   - **Reliability**: サーキットブレーカ、バックオフ付きリトライ方針、ヘルスチェック、段階的劣化、フェイルオーバー戦略、データ複製
   - **Observability**: メトリクス収集戦略、構造化ログ設計、分散トレーシングアーキテクチャ、アラートルール、ダッシュボード仕様、SLI/SLO 追跡、相関 ID 伝播

5. **Generate Artifacts** -- `<record>/construction/{unit-name}/nfr-design/` に次を生成します:
   - **performance-design.md**: キャッシュアーキテクチャ、最適化戦略、リソースプーリング、非同期パターン、性能予算
   - **security-design.md**: 認証／認可アーキテクチャ、暗号化設計、入力検証戦略、セキュリティヘッダ、コンプライアンスコントロール
   - **scalability-design.md**: スケールアーキテクチャ、負荷分散、データ分割戦略、容量閾値、オートスケールルール
   - **reliability-design.md**: レジリエンスパターン、サーキットブレーカ設定、リトライ方針、ヘルスチェック設計、フェイルオーバー手順、バックアップ戦略
   - **observability-design.md**: メトリクス収集アーキテクチャ、構造化ログ設計、分散トレーシング戦略、アラートルールとエスカレーション、ダッシュボード仕様、SLI/SLO 定義、相関 ID 伝播
   - **logical-components.md**: 論理インフラコンポーネント一覧 — サービス境界、障害ドメイン、ブラスト半径の対応、コンポーネント隔離戦略、共有リソースの特定。NFR 設計判断と Infrastructure Design を、NFR パターンがどこに効くかのコンポーネント視点で橋渡しします。

6. **Prepare Completion** -- ユニットの NFR Design 成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

7. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact               | Description                                                                     |
|------------------------|---------------------------------------------------------------------------------|
| performance-design.md  | キャッシュアーキテクチャ、最適化戦略、リソースプーリング、非同期パターン |
| security-design.md     | 認証アーキテクチャ、暗号化設計、入力検証、セキュリティヘッダ        |
| scalability-design.md  | スケールアーキテクチャ、負荷分散、データ分割、オートスケールルール  |
| reliability-design.md  | レジリエンスパターン、サーキットブレーカ、リトライ方針、フェイルオーバー手順      |
| observability-design.md | メトリクス、構造化ログ、トレーシング、アラート、ダッシュボード、SLI/SLO 定義      |
| logical-components.md  | コンポーネント一覧、サービス境界、障害ドメイン、ブラスト半径の対応  |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes -- NFR Design Granularity

このステージは **成果物ファイル 6 つ**（NFR 固有設計 5 つ + logical-components.md）を出します。上流参照の NFR Design が定義するのは 2 ファイルだけです。これは SKILL.md（"Deliberate Deviations from Reference"）に書いた意図した逸脱です。logical-components.md は NFR 設計と Infrastructure Design（ステージ 3.4）の橋で、NFR パターンがコンポーネントレベルでどこに効くかを対応づけます。

---

## Stage 3.4: Infrastructure Design

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.4                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (per execution plan)                                                                  |
| Condition         | インフラサービスの対応づけ、デプロイアーキテクチャ、またはクラウドリソースが要る。インフラ変更が無くインフラがすでに定義済みなら飛ばす。 |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | aidlc-aws-platform-agent                                                                                |
| support_agents    | aidlc-devsecops-agent, aidlc-compliance-agent                                                           |
| mode              | inline                                                                                            |
| Inputs            | NFR design artifacts, domain design, functional design                                       |
| Outputs           | `<record>/construction/{unit-name}/infrastructure-design/` -- infrastructure-specification.md (deployment + services + CONDITIONAL shared), monitoring-design.md, cicd-pipeline.md |

### Purpose

1 ユニットのインフラ、デプロイアーキテクチャ、監視、CI/CD パイプラインを設計します。aidlc-aws-platform-agent がリードし、aidlc-devsecops-agent がインフラセキュリティを確保し、aidlc-compliance-agent がデータ所在地と規制制約を点検します。

### Inputs

- `<record>/construction/{unit-name}/nfr-design/` の NFR 設計（あれば）
- `<record>/construction/{unit-name}/functional-design/` の機能設計（あれば）
- `<record>/inception/domain-design/` のドメイン設計
- `<record>/construction/{unit-name}/nfr-requirements/` の NFR 要件（あれば）

### Steps

1. **Read Prior Artifacts** -- 文脈のため先行設計成果物すべてを読みます: NFR 設計、機能設計、ドメイン設計、NFR 要件。

2. **Generate Infrastructure Questions** -- `<record>/construction/{unit-name}/infrastructure-design/infrastructure-design-questions.md` を `[Answer]:` タグ付きの文脈に合う質問で作ります。焦点:
   - デプロイ戦略（コンテナ、サーバレス、ハイブリッド、マルチリージョン）
   - コンピュート／ストレージ／ネットワーキング（サイジング、トポロジ、レイテンシ要件）
   - 監視の進め方（メトリクス、ログ、トレーシング、アラート閾値）
   - CI/CD パイプライン（ビルドステージ、デプロイ戦略、ロールバック手順）
   - シークレット管理（vault、環境変数、ローテーション方針）
   - スケール方針（オートスケールトリガ、容量上限、コスト制約）

3. **Collect and Analyze Answers** -- stage-protocol.md の質問フローに従い答えを集めます。MANDATORY なあいまいさ分析:
   - 曖昧な答え（"cloud-based"、"auto-scale"、"standard monitoring"）を特定
   - 答え同士の矛盾を検査
   - 成果物生成に要る欠けた詳細に印
   - あいまいさが 1 つでもあれば: フォローアップ質問を作り、進む前に解消

4. **Design Infrastructure** -- インフラを 4 領域で設計します:
   - **Deployment Architecture**: コンピュートモデル（コンテナ、サーバレス、VM）、ネットワーキングトポロジ、ストレージ戦略、環境配置（dev/staging/prod）
   - **Infrastructure Services**: データベース（種別、サイジング、複製）、キャッシュ（戦略、追い出し）、メッセージキュー、検索サービス、CDN、DNS、ロードバランサ
   - **Monitoring & Observability**: メトリクス収集、ログ集約、分散トレーシング、アラートルール、ダッシュボード、SLI/SLO 追跡
   - **CI/CD Pipeline**: ビルドステージ、テストステージ、デプロイステージ、環境昇格、ロールバック戦略、フィーチャーフラグ、成果物管理

5. **Generate Artifacts** -- `<record>/construction/{unit-name}/infrastructure-design/` に次を生成します。内容は **表形式** に保ちます（deployment、services、shared、monitoring は表）:
   - **infrastructure-specification.md**: 中核のインフラ設計 — **Deployment** 表（コンピュート、ネットワーキング、ストレージ、環境、IaC、サイジング）、**Infrastructure Services** 表（データベース、キャッシュ、メッセージング、統合、サービス発見）、CONDITIONAL の **Shared Infrastructure** 表（ユニット横断の共有リソース + 所有／アクセス境界）。すべて 1 文書
   - **monitoring-design.md**: NFR Design の observability-design 戦略を実装する監視。表形式 — メトリクス／KPI、アラート、SLI/SLO、加えてログ集約とトレーシング設定、ダッシュボード仕様
   - **cicd-pipeline.md**: パイプラインステージ、ビルド設定、テスト自動化の統合、デプロイ戦略（blue-green、canary、rolling）、ロールバック手順、環境昇格、CI/CD でのシークレット管理

6. **Prepare Completion** -- ユニットの Infrastructure Design 成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

7. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                       | Description                                                               |
|--------------------------------|---------------------------------------------------------------------------|
| infrastructure-specification.md | Deployment（コンピュート／ネットワーキング／ストレージ／環境／IaC）、インフラサービス、CONDITIONAL の共有リソース — 表形式 |
| monitoring-design.md           | メトリクス、アラート、SLI/SLO、ログ、トレーシング、ダッシュボード — 可能なところは表形式 |
| cicd-pipeline.md               | パイプラインステージ、ビルド設定、デプロイ戦略、ロールバック手順   |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes -- Infrastructure Design Consolidation

このステージは **成果物ファイル 3 つ** を出します。Deployment、インフラサービス、共有リソースは 1 つの表形式 `infrastructure-specification.md` へ統合しました（上流参照の単一インフラ文書に近い）。`monitoring-design.md` と `cicd-pipeline.md` は専用成果物のままです。下流の Operation ステージが独立に消費するからです（observability-setup が監視を読み、deployment-pipeline が CI/CD 設計を読む）。共有インフラは仕様の CONDITIONAL 節で、複数ユニットがリソースを共有するときだけあります。

---

## Stage 3.5: Code Generation

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.5                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | ALWAYS (per-unit)                                                                                 |
| Condition         | 実行計画の全ユニットでいつも走る。                                             |
| Per-Unit          | Yes                                                                                               |
| Lead Agent        | aidlc-developer-agent                                                                                   |
| support_agents    | (none -- focused implementation)                                                                  |
| mode              | subagent (Task tool subagent_type: aidlc-developer-agent)                                               |
| Inputs            | ALL prior design artifacts for this unit                                                          |
| Outputs           | アプリケーションコード（ワークスペースルート） + `<record>/construction/{unit-name}/code-generation/` -- code-generation-plan.md, code-generation-questions.md, unit-test-instructions.md, code-summary.md, traceability.json, plus engine-required companion source-manifest.json |

### Purpose

1 作業ユニットのアプリケーションコード、テスト、設定をすべて生成します。実行計画にかかわらず、全ユニットでいつも走る唯一のステージです。コードはワークスペースルートへ書き、`<record>/` へは書きません。

### Critical Rules

- アプリケーションコードはワークスペースルートへ。`<record>/` へは NEVER
- brownfield: ファイルをその場で直す。`ClassName_modified.java` のような複製は NEVER 作らない
- テスト自動化のため、対話 UI 要素に `data-testid` 属性を足す
- レビューの前に、エンジン必須の同伴 `source-manifest.json` を書き、このユニットが作った、直した、消したアプリケーションソースパスをすべて列挙する。シェルコマンド、足場、ジェネレータが書いたファイルも含む
- NFR Requirements、NFR Design、Testing Contract のカバレッジ下限からの測定可能な品質目標は入力であり、提案ではありません。ステップを通すために定義した目標を緩める、下げる、無効にするのは NEVER。テストやビルド設定の閾値も含みます。穴は表に出します

### Inputs

- `<record>/construction/{unit-name}/functional-design/` の機能設計（あれば）
- `<record>/construction/{unit-name}/nfr-requirements/` の NFR 要件（あれば）
- `<record>/construction/{unit-name}/nfr-design/` の NFR 設計（あれば）
- `<record>/construction/{unit-name}/infrastructure-design/` のインフラ設計（あれば）
- `<record>/inception/domain-design/` のドメイン設計
- `<record>/inception/units-generation/unit-of-work.md` のユニット定義
- `<record>/inception/units-generation/unit-of-work-story-map.md` のストーリーマップ

### Steps

このステージは **二部構成** です。計画のあと生成です。

#### PART 1 -- Planning (Steps 1-3)

1. **Read All Unit Artifacts** -- いまのユニットの設計成果物すべてを読みます（機能設計、NFR 要件、NFR 設計、インフラ設計、ドメイン設計、ユニット定義、ストーリーマップ）。

2. **Create Code Generation Plan** -- `<record>/construction/{unit-name}/code-generation/code-generation-plan.md` に詳しい計画を作り、各実装ステップにチェックボックスを付けます。ストーリーからコードステップへのトレーサビリティを含め、各計画ステップを実装するユーザーストーリーへ戻します。

   `aidlc-testing-posture.ts render` を走らせ、その完全な `## Testing Contract` JSON ブロックを計画へ貼ります。リゾルバは org/team/project の Testing Posture 節を加算で読みます。プロジェクトのカバレッジまたは統合の注記は効いたままで、チームの方法論は消しません。矛盾する狭い方法論は拒否します。

   契約は方法論固有の計画プロファイルを供給します:

   - **TDD** -- 適用するテスト可能層すべてに Red/Green/Refactor: データ、リポジトリ、ビジネスロジック、API、フロントエンド。
   - **BDD** -- 観察できる機能スライスの前に実行可能な振る舞いシナリオ、続けて層横断の実装、緑のシナリオ、リファクタ。層局所の TDD へ変換しません。
   - **ATDD** -- 層横断の機能実装一式の前に実行可能な受け入れテスト、続けて受け入れ緑とリファクタ。
   - **Custom/mixed** -- 確認した正確な順序を保ちます。シナリオ先行 BDD に、実装後の下位ユニットテストを組み合わせる、なども含みます。
   - **Test-after** -- 適用するテスト可能層すべてで、実装してからテスト。

   greenfield 計画は最初の Red／シナリオ／受け入れステップの前に、最小の実行可能なテストコマンドをブートストラップします。brownfield 計画は既存コマンドを先に検証します。選んだ Test Strategy が量／種別を供給し、スコープがその下限（カバレッジ／CI、狙い撃ち回帰、または追加下限なし）を足します。どちらの義務も他方を置き換えません。Minimal では、バグ／セキュリティの狙い撃ち回帰が、欠陥を再現するいちばん狭いレベルなら統合／E2E テストを 1 つ足すことがあります。

   **計画にテストファイルは MANDATORY です。** 計画は次のステップを MUST 含めます:
   - ユニットテストファイル（主要振る舞いカバレッジ付き、コンポーネント／モジュールごとに 1）
   - テスト設定（vitest.config、jest.config、または同等）

   計画がテストファイルのステップを省いていれば、利用者へ出す前に足さなければなりません。テストを Build and Test へ先送りしません — あのステージは検証と拡張であり、ゼロから作りません。

   各計画ステップに連番を付けます（Step 1、Step 2、など）。実行順とトレーサビリティをはっきりさせるためです。

   ディレクティブからコード生成のレコードディレクトリを 1 つ解決します。`directive.unit` があるときは `<record>/construction/<directive.unit>/code-generation/`、無ければゼロユニットのステージディレクトリ `<record>/construction/code-generation/`。Plan Approval の前に、そこへ `unit-test-instructions.md` も作ります。アクティブなテスト戦略に合わせます:
   - **Minimal**: 要件駆動のユニットテスト（要件ごとに 1 テスト、コンポーネントごとのハッピーパス下限）、おおよそ合計 5–15 テスト
   - **Standard**: コンポーネントごとに 5–8 テスト、主要振る舞いカバレッジ
   - **Comprehensive**: コンポーネントごとに 10–15 テスト、徹底したカバレッジ

   テストフレームワークのセットアップと設定、最初のテストファーストサイクルの前に使える正確な実行コマンド、見込みカバレッジ目標、モック／スタブの案内、テストデータ管理を含めます。実行コマンドはすべて、正確なテストファイルパスまたは正確なユニットフィルタでこのユニットへスコープしなければなりません。`npm test` のような裸のプロジェクト全体コマンドは不可です。Build and Test が全ユニットのコマンドを実行するからです。

   ユニットテスト指示の要約を、計画の要約と一緒に出します。

3. **Plan Approval** -- `code-generation-plan.md`、その Testing Contract、`unit-test-instructions.md` の承認を求めます。改訂では、先に以前の `[Answer]:` を空へ戻します。両方のファイルが最終になったあと、ユニットディレクティブなら `aidlc-testing-posture.ts fingerprint --unit <unit>`、ゼロユニットのステージ単位作業なら `aidlc-testing-posture.ts fingerprint` を走らせます。そのあと解決したレコードディレクトリに `code-generation-questions.md` を作る、またはリセットし、その `[Approval Fingerprint]`、**Plan Approval** 質問、空の `[Answer]:` を入れます。構造化した質問として描き、ターンを止めます:
   - "Approve Plan" -- コード生成へ進む
   - "Request Changes" -- 計画を改訂する

   タグは人が答えたあとだけ埋めます。変更要求は記録し、必要に応じて両方のファイルを改訂し、契約／フィンガープリントを再生成し、再プロンプトの前に Plan Approval タグをリセットします。承認後の計画／指示変更、または Testing Posture／スコープ／戦略／種別の変更はフィンガープリントを無効にし、承認を再開します。転送ループの継続は承認ではありません。

#### PART 2 -- Generation (Steps 4-7)

4. **Generate Code** -- 委譲の前に、利用者へ出します:
   "Generating code for [N] plan steps. This may take several minutes depending on project complexity. I'll show a summary when complete."

   Task ツールで aidlc-developer-agent サブエージェント（subagent_type="aidlc-developer-agent"）へ委譲します。

   **サブエージェントへ渡す文脈:**
   - プロンプトの先頭行として、正確な対象マーカ: ユニット作業なら `AIDLC-UNIT: <directive.unit>`、ゼロユニットディレクティブなら `AIDLC-STAGE: code-generation`。文脈依存は追加の対象マーカを受けません。
   - 2 行目として、承認した計画からの `AIDLC-TESTING-CONTRACT: <contract_sha256>`。派遣ガードは欠けた、違う、古いハッシュを拒否します。
   - `agents/aidlc-developer-agent.md` のリードエージェントペルソナと `.claude/knowledge/aidlc-developer-agent/` のナレッジ（サブエージェントは会話履歴に届かないのでプロンプトへ入れる）
   - いまのユニットだけの設計成果物（全ユニットではない）
   - Inception フェーズの各成果物の 1–2 行要約とファイルパス（要件要約、ストーリー要約、アプリ設計要約） — サブエージェントは全文が要れば特定ファイルを Read できます
   - 承認した code-generation-plan.md（全文）
   - 承認した unit-test-instructions.md（全文）
   - プロジェクトワークスペースの詳細（aidlc-state.md からの言語、フレームワーク、慣習）
   - 各計画ステップを順に実行し、完了したらチェックボックスを付ける指示
   - 承認した Testing Contract が権威です。サブエージェントはメモリを独自に再解決せず、承認した TDD、BDD、ATDD、test-after、または custom/mixed プロファイルを正確に実行します
   - NFR Requirements、NFR Design、Testing Contract のカバレッジ下限からの測定可能な品質目標は入力であり、提案ではありません。サブエージェントはステップを通すために定義した目標を NEVER 緩める、下げる、無効にしてはいけません。テストやビルド設定の閾値も含みます。穴は表に出します

   **文脈予算:** いまのユニットの設計成果物だけ渡し、全ユニットは渡しません。Inception 成果物は全文を埋め込まず、ファイルパス付きで要約します。サブエージェントはコード、テストファイル、設定成果物をすべてワークスペースへ生成します。

5. **Generate Code Summary and Source Manifest** -- サブエージェントが完了したあと、`<record>/construction/{unit-name}/code-generation/code-summary.md` を作り、次を残します:
   - 作った／直したファイル
   - 主な実装判断
   - テストカバレッジの要約
   - 計画からの逸脱

   また `<record>/construction/{unit-name}/code-generation/source-manifest.json` を作ります。これは厳密な version-1 JSON 同伴ファイルであり、宣言した `produces[]` 成果物ではありません。`stage: "code-generation"`、正確なユニット名、ユニットが作った、直した、消したアプリケーションソースパスをすべて含む `writes` 配列を記録します。シェル、足場、ジェネレータが書いたファイルも含みます。パスは POSIX 相対で、グロブも `..` も使いません。末尾 `/` は生成したディレクトリ木を主張します。メインワークスペースの複数リポジトリ実行では、各エントリが記録した `repo` を名前にします。ボルトをホストする worktree のなかでは、パスはその選んだリポジトリ相対で `repo` を省きます。

   エンジンはこのスキーマを検証し、それが無いと終端のユニットごとレビューを記録しません。そのバイトと主張は `Unit Source Fingerprint` に入ります。新しくレビューしたマニフェストの外で変わったステージソースパスは完了を封鎖します。

6. **Prepare Completion** -- ユニットのコードと要約成果物を検証します。状態は編集しません。ゲート結果は `aidlc-orchestrate.ts` で報告します。

7. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                  | Description                                                         |
|---------------------------|---------------------------------------------------------------------|
| code-generation-plan.md   | チェックボックス、ストーリートレーサビリティ、ステップ順付きの詳しい計画  |
| code-generation-questions.md | 残した Plan Approval 質問と明示の人の答え       |
| unit-test-instructions.md | ユニットごとのセットアップ、スコープ付き実行コマンド、カバレッジ、モック、テストデータ |
| code-summary.md           | 作った／直したファイル、判断、テストカバレッジ、計画からの逸脱   |
| traceability.json         | コード／テスト対象による割り当て上流 ID の構造化カバレッジ   |
| source-manifest.json      | エンジン必須の厳密な同伴帰属索引。意図して `produces[]` に入らない |
| (application code)        | ワークスペースルートへ書いたソース、テスト、設定すべて        |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes

- **二部構成**: 計画フェーズ（Steps 1-3）は人とのやりとりと計画承認付きでインラインに走ります。生成フェーズ（Steps 4-7）は Task ツール経由で aidlc-developer-agent サブエージェントへ委譲します。ほとんどインラインで走るほかの Construction ステージとは違います。
- **Developer-agent サブエージェント**: コード生成は `subagent_type="aidlc-developer-agent"`（Task ツール経由の委譲）であり、インライン実行ではありません。サブエージェントを使う唯一の Construction ステージです。サブエージェントはセッションのツールセット一式を継ぎます（aidlc-developer-agent は `tools:` 許可リストを宣言しない）ので、Read、Edit、Write、Glob、Grep、Bash、AskUserQuestion、継いだ MCP ツールへ届きます。
- **文脈予算**: サブエージェントへ渡すのはいまのユニットの設計成果物だけです。Inception フェーズの成果物は 1–2 行とファイルパスで要約し、サブエージェントが要るものを選んで Read できます。
- **必須のテストファイル所属**: テストファイルはコード生成計画の一部で MUST です。ステージ 3.6（Build and Test）はテストを検証し拡張しますが、ゼロからは作りません。
- **ソースマニフェストの強制**: `source-manifest.json` はエンジンが検証し、Markdown の `required-sections` 対象ではありません。厳密なスキーマと `Unit Source Fingerprint` が正確／ディレクトリのソース主張すべてを結びます。エンジンは欠ける、または不正なら終端レビューを拒否し、新しくレビューした主張の和集合の外で変わったソースについてはステージ完了を拒否します。
- **ユニットスコープの実行**: 各ユニットごとのテスト指示ファイルは正確なテストパスまたは正確なユニットフィルタを使い、ユニット横断の実行ステージがユニットごとにプロジェクト全体スイートを再実行しないようにします。
- **brownfield の意識**: brownfield プロジェクトでは、サブエージェントは複製を作らず、既存ファイルをその場で直します。

---

## Stage 3.6: Build and Test

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.6                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | ALWAYS (after ALL units complete)                                                                 |
| Condition         | ユニットごとステージがすべて終わったあと、いつも一度走る。                                      |
| Per-Unit          | No (runs once for all units)                                                                     |
| Lead Agent        | aidlc-quality-agent                                                                                     |
| support_agents    | aidlc-devsecops-agent                                                                                   |
| mode              | inline                                                                                            |
| Inputs            | ALL code generation outputs across all units                                                      |
| Outputs           | `<record>/construction/build-and-test/` -- build-instructions.md, integration-test-instructions.md, performance-test-instructions.md, security-test-instructions.md, build-and-test-summary.md, test-results.md, plus conditional test instruction files |

### Purpose

ユニット横断のテスト指示を生成し、ユニットごとのユニットテスト指示を消費し、Bash 経由でビルドとテストを実際に実行します。このステージは全ユニットにまたがって動きます — ユニットごとではありません。aidlc-quality-agent がリードし、aidlc-devsecops-agent がセキュリティテストの専門を出します。

### Inputs

- `<record>/construction/*/code-generation/code-summary.md` からの、全ユニットのコード生成出力
- `<record>/construction/*/code-generation/unit-test-instructions.md` からのユニットごとテスト指示
- 各ユニットの `nfr-requirements/` と `nfr-design/` ディレクトリ下の、適用する成果物すべて
- ステージ単位またはユニットごとの `code-generation-plan.md` にある、承認した `## Testing Contract` すべて

### Steps

1. **Analyze Testing Requirements** -- 全ユニットのコード生成要約とユニットごとテスト指示を読みます。NFR Requirements、NFR Design、承認した Testing Contract すべてから、測定可能な目標のソース完全な一覧を作ります。各目標について、安定した ID、ソースパス／節、期待値、実測値を出す検査、所有する後段の検証ステージを記録します。必要なテスト種別をすべてカタログします。

2. **Generate Build Instructions** -- `<record>/construction/build-and-test/build-instructions.md` を作ります:
   - 依存インストールの手順
   - 環境セットアップ（環境変数、設定ファイル、ローカルサービス）
   - ビルドコマンド（コンパイル、バンドル、トランスパイル）
   - ビルド検証の手順
   - よくあるビルド問題のトラブルシュート

3-7. **Generate Additional Test Instructions** -- アクティブなテスト戦略を見て、合うユニット横断の指示ファイルを生成します:
   - **Minimal**: 追加ファイルは生成しません。ユニットテストは Code Generation がユニットごとに覆います。
   - **Standard**: 主要な境界とユニット横断の相互作用向けに `integration-test-instructions.md` を生成します。
   - **Comprehensive**: 統合指示に加え、性能 NFR があれば `performance-test-instructions.md`、セキュリティ NFR があれば `security-test-instructions.md` を生成します。
   - どの戦略でも、プロジェクト文脈が要するときは、名前付きの contract、E2E、アクセシビリティ、その他の指示ファイルを足します。

   ファイルはすべて `<record>/construction/build-and-test/` へ。
   各ファイルはフレームワークセットアップ、実行コマンドとフィルタ、カバレッジ目標、テストデータまたは環境セットアップを含めます。

8. **Generate Build and Test Summary** -- `<record>/construction/build-and-test/build-and-test-summary.md` を作ります:
   - 全体のビルド状態と前提
   - テスト種別の一覧（どのテスト種別を生成したか）
   - ユニットごとのカバレッジ見込み
   - Target ID、Source、Expected、Actual、Evidence、Owning Stage、Verdict 付きの Target Verification Matrix
   - 適用する目標は `Pending` で始めます。`N/A` が有効なのは、ソース完全な一覧が適用する測定可能な目標を見つけなかったときだけです
   - 準備評価（build-ready、test-ready、deployment-ready）
   - 既知の制限または未完了項目

9. **Execute Build and Tests** -- 指示ファイルに書いたビルドとテストコマンドを **Bash 経由** で実行しようとします:

    a. **Build**: build-instructions.md のビルドコマンドを Bash で走らせます。出力を取ります。
    b. **Unit tests**: 各ユニットの `code-generation/unit-test-instructions.md` からコマンドを集め、同一コマンドを重複排除し、異なるコマンドを一度ずつ走らせます。コマンドはユニットスコープであるべきです。ファイルがプロジェクト全体コマンドを含むなら一度だけ走らせ、ユニットごとに一度は走らせません。二重カウントせずユニットごとの pass/fail を報告します。
    c. **Integration tests**（該当すれば）: 統合テストコマンドを走らせます。結果を取ります。
    d. **その他の適用検査**: 性能、セキュリティ、契約、E2E、アクセシビリティ、その他生成した指示ファイルからの適用コマンドをすべて走らせます。デプロイ済みまたは本番相当の環境が要り、いまの実行計画に名前付きの所有検証ステージがある検査だけ先送りします。そのステージと見込み証拠パスを記録します。目標は `Unverified` のままで、このステージを成功にはできません。予定した所有ステージが無ければ、単に `Unverified` です。
    e. **Finalize and report results**: どの出口経路でも `<record>/construction/build-and-test/test-results.md` と `build-and-test-summary.md` を作る、または更新します:
       - ビルド状態（成功／失敗 + 出力）
       - テスト結果（合計、passed、failed、skipped）
       - 失敗の詳細（テスト名、アサーション、スタックトレース）
       - カバレッジ報告（テストフレームワークがサポートすれば）
       - 確定した Target Verification Matrix。適用する目標すべてに実測値、証拠、所有ステージ、最終の `Met`、`Not Met`、または `Unverified` 判定があります。Step 9 のあと `Pending` 判定は残りません。
       - `## Loop-Back Log`（失敗ラダーの段 3 または 4 がループバックを発火したときだけ）: 試行ごとに `### Loop-back N -- <ISO timestamp>` エントリ 1 つ（Diagnosis / Root-cause stage / Planned fix / Estimated impact）。追記のみ。再実行を生き抜きます（ループバック再入場では Redo ではなく Modify）。

    **失敗エスカレーションラダー:** ビルドまたはテストコマンドが失敗する、または適用する目標が `Not Met` または `Unverified` のとき、ステージは失敗です。どの失敗種別でも同じラダーに入る前に、行列と要約を確定します。目標を下げる、緩める、無効にするのは、許容できる直しではありません。

    1. **In-stage fix (max 2 attempts)** -- このステージ自身の領分の根本原因（テスト設定、ビルドスクリプト、環境セットアップ、または実行可能な目標検査）向け: 証拠を読み、失敗した設定または足場を特定し、直しを適用し、失敗したステップを再実行し、目標行列を更新します。
    2. **Classify and estimate impact** -- ステージ内の試行が尽きた、または診断が上流を指すとき: 根本原因が生成したソースまたはテストコードにあるか — 欠陥の大きさにかかわらず — またはコード生成の進め方の選択（ライブラリ／版、コンテナイメージ、インスタンスタイプ、アルゴリズム、フラグ）かを決めます。差し替え可能な次元で直しを見つけ、その影響を見積もります（労力、金銭コスト、リスク）。影響未見積もりの労力仮定で、実行可能な道をスコープ外と宣言してはいけません。
    3. **Autonomous bounded loop-back** -- `Construction Autonomy Mode: autonomous` で、影響見積もり済みの直しがあり、`## Loop-Back Log` の下のエントリが 3 未満なら: 診断 + 影響見積もり済みの直しを記録し、エンジン経由で code-generation へ戻り、construction プロトコルモジュール（`aidlc-common/protocols/stage-protocol-construction.md`）の "Build-and-Test failure loop-back" どおり、収束を意識した経路で前方へ再生します。失敗した実行のゲートは出さず、学びの儀式は最終的に通る実行へ先送りします。
    4. **Halt-and-ask** -- gated／未設定モード、上限が尽きた、または特定できる直しが無い: 失敗をログし、construction プロトコルモジュール（`aidlc-common/protocols/stage-protocol-construction.md`）の halt-and-ask 質問を出します。候補の直しがあれば影響見積もり済みの 3 択変種（Retry with fix [estimated impact] / Accept failure / Abort）、段 2 が無しなら直し無しの 2 択変種（Accept failure / Abort）。

    **ループバック再生の振り分け:** Code Generation がユニットライフサイクルレシートを一度も使っていなければ、残した成果物はすべて覆った `gate: true` の速い道を取れます。そのゲートの前に、計画した直しと決定論的な Modify／Keep 判断を適用します。ライフサイクル行が 1 つでもあれば、レシートモードは粘り、ジャンプはユニットごとの作業を再発行します。`unit start` / `unit complete` を再発行し、対象ユニットへ Modify、残りへ Keep を適用し、宣言したレビュアーをユニットごとに走らせます。どちらの道も、settle／承認ゲートの前に、適用する全ユニットへいまの試行の新しい `REVIEW_COMPLETED` を MUST 記録します。`STAGE_JUMPED` が以前のレビューをすべて無効にするからです。unit-major では自律スウォームは発火せず、再生は直列のユニットごとウォークに従い、追加の人のターンはまだ要りません。

    再生はすでに承認した Code Generation 計画を直します。その Plan Approval `[Answer]:` を残し、差分を Loop-Back Log に記録し、gated の "Retry with fix" を、改訂した進め方への人の再承認として扱います。

    **スウォームの安い道:** ジャンプは新しい正確なステージ試行の `Run floor` 境界トークンを作るので、古い収束行は数えられません。古い worktree／ブランチを捨て、新しい `prepare` を走らせます。`finalize` がいまの prepare スタンプを要するので、新しい試行へ採用できません。先に `check` を走らせます。緑のユニットはビルダターンを飛ばせますが、`finalize --claimed` に入る前に、新しい worktree で終端のいまの試行のレビュアーレシートがまだ要ります。`finalize` はそのレシートのいまの成果物フィンガープリントと試行スタンプの両方を検証します。

    単一ステージ実行（`--single`）は段 2 で止まります — 動かすメインワークフロー位置が無いからです。影響見積もり済みの選択肢はログし、その実行の孤立実行要約に出します。

    **On success:** 成功した準備結果は、すべてのコマンドが通り、適用する目標がすべて `Met` であること、または目標が適用しないときの説明用 `N/A` 行 1 つです。

10. **Prepare Completion** -- ビルド／テスト証拠を検証します。ステージやフェーズの状態は編集しません。報告したゲート結果が遷移を持ちます。

11. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                          | Description                                                     | Condition          |
|-----------------------------------|-----------------------------------------------------------------|--------------------|
| build-instructions.md             | 依存インストール、環境セットアップ、ビルドコマンド、トラブルシュート  | Always             |
| integration-test-instructions.md  | 前提、ユニット横断テスト、外部依存、データセットアップ    | Standard/Comprehensive |
| performance-test-instructions.md  | 負荷テスト、NFR シナリオ、基線、ストレス／ソークテスト       | If NFR perf exists |
| security-test-instructions.md     | SAST/DAST、認証テスト、インジェクションテスト、コンプライアンス          | If NFR sec exists  |
| contract-test-instructions.md     | コンシューマ駆動契約、スキーマ検証、API 互換        | If microservices   |
| e2e-test-instructions.md          | ブラウザ自動化、ユーザージャーニー、クロスブラウザ                | If UI-driven       |
| accessibility-test-instructions.md| WCAG 適合、スクリーンリーダー、キーボード操作                    | If user-facing UI  |
| build-and-test-summary.md         | 全体状態、テスト一覧、カバレッジ、準備評価  | Always             |
| test-results.md                   | 実際のビルド／テスト実行結果、pass/fail、カバレッジ        | Always             |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes

- **実際の Bash 実行**: このステージはテスト指示を文書化するだけではありません — ビルドとテストコマンドを Bash 経由で実際に走らせ、本物の結果を取ります。コードベースに対して本物のコマンドを実行する数少ないステージの 1 つです。
- **品質目標の証拠**: ソース完全な行列は、どの出口経路でも確定します。デプロイ環境の検査は後段の所有ステージを名前にしてよいですが、`Unverified` のままです。`Not Met` と `Unverified` はどちらも失敗ラダーに入ります。
- **失敗エスカレーションラダー**: ステージ内の直しは 2 試行が上限です。根本原因が生成コードまたはコード生成の進め方の選択の上流にあるとき、ステージは直しの影響を分類し見積もり、有界の自律ループバックを code-generation へ走らせる（最大 3、test-results.md の追記のみ `## Loop-Back Log` で数える）か、影響見積もり済みの halt-and-ask 質問を出します。construction プロトコルモジュール（`aidlc-common/protocols/stage-protocol-construction.md`）の "Build-and-Test failure loop-back" を見てください。再入場は収束を意識し、承認した計画を残し、適用する Code Generation ユニットすべてが新しいいまの試行のレビューを持つまでゲートへ届きません。
- **条件付きテスト種別**: 性能テスト、セキュリティテスト、契約テスト、E2E テスト、アクセシビリティテストは、該当条件が満たされたときだけ生成します（NFR 要件がある、マイクロサービスアーキテクチャ、UI 駆動アプリケーション、ユーザー向けインタフェース）。
- **ユニット横断スコープ**: ステージ 3.1–3.5 がユニットごとであるのと違い、Build and Test は全ユニットが出したコード全体に対して一度走ります。個別ユニットではなく、統合したコードベースを検証します。
- **フェーズ完了**: このステージ（該当すれば 3.7 と一緒）が Construction フェーズの終わりです。最終の承認報告が、エンジンに Construction 完了を付けさせ、Operation へ原子的に回します。

---

## Stage 3.7: CI Pipeline

### Metadata

| Property          | Value                                                                                             |
|-------------------|---------------------------------------------------------------------------------------------------|
| Stage             | 3.7                                                                                               |
| Phase             | Construction                                                                                      |
| Execution         | CONDITIONAL (skip if CI already exists and is adequate)                                           |
| Condition         | CI パイプラインの作成または大きな改修が要るとき                               |
| Per-Unit          | No (runs once for all units)                                                                     |
| Lead Agent        | aidlc-pipeline-deploy-agent                                                                             |
| support_agents    | (none)                                                                                            |
| mode              | inline                                                                                            |
| Inputs            | Code generation output from Stage 3.5, build/test results from Stage 3.6                         |
| Outputs           | `<record>/construction/ci-pipeline/` -- ci-config.md, quality-gates.md, ci-pipeline-questions.md |

### Purpose

品質ゲート、成果物管理、ビルド／テスト自動化付きで CI（Continuous Integration）パイプラインを設定します。aidlc-pipeline-deploy-agent がリードし、サポートエージェントはいません。

### Inputs

- `<record>/construction/build-and-test/` のビルド／テスト結果
- `<record>/construction/infrastructure-design/` のインフラ設計（あれば）
- 既存 CI 設定向けのワークスペースプロファイル

### Steps

1. **Load Prior Context** -- ビルド／テスト結果、インフラ設計（あれば）、既存 CI 設定向けのワークスペースプロファイルを読みます。

2. **Generate Clarifying Questions** -- `<record>/construction/ci-pipeline/ci-pipeline-questions.md` を作り、次の質問を入れます:
   - 使っている CI ツールは何か（CodePipeline、CodeBuild、GitHub Actions、Jenkins）
   - ブランチ戦略は何か
   - マージ前に必要な品質ゲートは何か
   - 使う成果物リポジトリは何か（ECR、CodeArtifact、S3）

   stage-protocol.md の質問フローに従います。

3. **Collect and Analyze Answers** -- CI の選択を既存インフラとチーム能力に照らして検証します。

4. **Generate Artifacts** -- CI パイプライン設定（buildspec.yml、ワークフロー YAML、または同等）、品質ゲート定義、成果物リポジトリ設定を作ります。

5. **Phase Boundary Verification** -- Construction → Operation の検証を走らせます:
   - Architecture → code → tests の整合
   - すべてのコードが設計へ辿れる
   - 受け入れ基準に対するテストカバレッジ
   - 結果を `<record>/verification/phase-check-construction.md` へ書く

6. **Prepare Completion** -- CI と境成果物を検証します。ステージやフェーズの状態は編集しません。報告したゲート結果が遷移を持ちます。

7. **Completion** -- 完了メッセージと承認ゲートを出します。

### Outputs

| Artifact                  | Description                                              |
|---------------------------|----------------------------------------------------------|
| ci-config.md              | CI パイプライン設定（buildspec、ワークフロー YAML など） |
| quality-gates.md          | マージ／昇格の品質ゲート定義             |
| ci-pipeline-questions.md  | 答え付きの確認質問                        |

### Approval Gate

厳密に 2 択: Approve / Request Changes。

### Notes

- **フェーズ境検証**: これは Construction フェーズの最後のステージです。Construction → Operation のフェーズ境検証（stage-protocol-governance.md 第 13 節）を行い、アーキテクチャがコードへ、コードがテストへ辿れることを検証します。結果は `<record>/verification/phase-check-construction.md` へ書きます。
- **条件付き実行**: プロジェクトがすでに十分な CI パイプラインを持っていれば、このステージは飛ばします。走るかどうかは Delivery Planning の実行計画が決めます。
- **ユニット後の実行**: ステージ 3.6 と同じく、このステージはユニットごとの作業がすべて終わったあと一度走り、ユニットごとではありません。

---

## Phase Summary

Construction フェーズは、段階的な構築の流れで Inception の設計を動くソフトウェアへ落とします:

**ユニットごとステージ（3.1-3.5）:**
- 3.1 Functional Design -- ビジネスロジック、ドメインモデル、ルール（architect リード）
- 3.2 NFR Requirements -- 性能、セキュリティ、スケーラビリティ、信頼性、可観測性、技術スタック（architect リード）
- 3.3 NFR Design -- NFR カテゴリの具体パターン（architect リード）
- 3.4 Infrastructure Design -- デプロイ、サービス、監視、CI/CD（aws-platform リード）
- 3.5 Code Generation -- 計画 + サブエージェント経由の生成の二部（developer リード）

**ユニット後ステージ（3.6-3.7）:**
- 3.6 Build and Test -- 指示生成 + 失敗診断付きの実際の Bash 実行（quality リード）
- 3.7 CI Pipeline -- CI 設定 + フェーズ境検証（pipeline-deploy リード）

**要点:**
- ステージ 3.1–3.4 は CONDITIONAL。3.5–3.6 は ALWAYS。3.7 は CONDITIONAL
- 条件付きステージはすべて Delivery Planning の実行計画に従う
- 既定ウォークは stage-major（あるステージを全ユニットに走らせてから次のステージ）。任意の `unit-major` ウォークは、あるユニットをユニットごとステージすべてへ通してから次のユニットが始まる
- NFR 成果物は上流参照より粒度が広い（要件 6 ファイル、設計 6 ファイル）
- Infrastructure Design は監視と CI/CD の専用ファイル付きで 5 成果物へ拡張
- コード生成は文脈予算制御付きの aidlc-developer-agent サブエージェントを使う
- Build and Test は実際のコマンド実行と自動の失敗診断を行う
- CI Pipeline は Operation へ移る前にフェーズ境検証を含む

**上流参照からの意図した逸脱:**
- NFR Requirements: 6 ファイル（参照の 2 から拡張）
- NFR Design: logical-components.md を含む 6 ファイル（参照の 2 から拡張）
- Infrastructure Design: 3 ファイル — 統合した infrastructure-specification.md（deployment + services + shared）に加え、専用の monitoring-design.md と cicd-pipeline.md
- 計画／質問ファイルをステージ成果物と同じ場所に置く
