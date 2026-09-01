# Ideation Phase -- Stage Reference (1.1-1.7)

## Phase Overview

Ideation は AI-DLC ライフサイクル 5 フェーズの 2 番目です。取り組み全体の土台を据えます。インテントを捉え、実現性を確かめ、スコープを決め、技術作業に入る前に承認を取ります。ステージ 1.1 から 1.7 を走らせ、go/no-go ゲートで Inception への入口を制御して終わります。

7 ステージはすべてインライン実行です（サブエージェントへの委譲は無い）。承認ゲート、質問形式、完了メッセージは標準の stage-protocol.md に従います。オーケストレータは順に回し、いまのスコープに当たらない CONDITIONAL ステージは飛ばします。

**Ideation フェーズの要点:**

- どのステージもインライン実行（利用者との直接の会話）。
- 成果物はインテントのレコードディレクトリ `<record>/ideation/<stage-name>/` の下。`<record>` は `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（`audit/` シャードディレクトリ、ステージごとの `memory.md`、検証レポートも同じレコードディレクトリ）。
- ステージ 1.1 以外は、先行ステージの出力に依存する。
- ステージ 1.7 は Inception へ渡す前にフェーズ境界検証を走る。
- フェーズの両端は ALWAYS ステージ 2 つ（1.1 Intent Capture と 1.7 Approval & Handoff）。真ん中 5 つは CONDITIONAL で、スコープによって飛ばすことがある。

**スコープごとのステージ所属:**

| Scope            | Stages Included                             |
|------------------|---------------------------------------------|
| enterprise       | All 1.1-1.7                                |
| feature          | All 1.1-1.7                                |
| mvp              | 1.1, 1.3 (light), 1.4, 1.6                  |
| poc              | 1.1 (minimal)                               |
| bugfix           | None (Ideation skipped entirely)            |
| refactor         | None (Ideation skipped entirely)            |
| infra            | None (Ideation skipped entirely)            |
| security-patch   | None (Ideation skipped entirely)            |
| classic          | None (Ideation skipped entirely)            |
| workshop         | None (Ideation skipped entirely)            |
| express          | None (Ideation skipped entirely)            |

---

## Stage Summary Table

| Stage | Name                        | Condition   | Lead Agent      | Support Agents                              | Mode   |
|-------|-----------------------------|-------------|-----------------|---------------------------------------------|--------|
| 1.1   | Intent Capture & Framing    | ALWAYS      | aidlc-product-agent   | aidlc-architect-agent                             | inline |
| 1.2   | Market Research             | CONDITIONAL | aidlc-product-agent   | --                                          | inline |
| 1.3   | Feasibility & Constraints   | CONDITIONAL | aidlc-architect-agent | aidlc-aws-platform-agent, aidlc-compliance-agent        | inline |
| 1.4   | Scope Definition            | ALWAYS      | aidlc-product-agent   | aidlc-delivery-agent                              | inline |
| 1.5   | Team Formation              | CONDITIONAL | aidlc-delivery-agent  | --                                          | inline |
| 1.6   | Rough Mockups               | CONDITIONAL | aidlc-design-agent    | aidlc-product-agent                               | inline |
| 1.7   | Approval & Handoff          | ALWAYS      | aidlc-delivery-agent  | aidlc-product-agent                               | inline |

---

## Stage 1.1: Intent Capture & Framing

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.1                                                                    |
| Condition        | ALWAYS -- first stage of every workflow; establishes the initiative's foundation |
| Lead Agent       | aidlc-product-agent                                                          |
| Support Agents   | aidlc-architect-agent (technical context)                                    |
| Reviewer         | aidlc-product-lead-agent (source-grounding and product-quality review)       |
| Mode             | inline                                                                 |
| Completion Emoji | :bulb:                                                                 |

### Purpose

Intent Capture はどの AI-DLC ワークフローでも入口です。事業上の問題を捉え、ステークホルダーを特定し、成功指標を据え、プロジェクト種別（greenfield、brownfield、migration）を分類します。できたインテント声明とステークホルダーマップが、下流ステージすべての土台になります。

利用者が `$ARGUMENTS` で自由文のインテントを渡していれば、その文を種の文脈として渡します。「何を作りたいか」を聞き直さないためです。

### Inputs

- `$ARGUMENTS` のプロジェクト説明、またはインテントの `audit/` シャード
- 先行セッションがあれば、既存の `<record>/` 成果物
- `aidlc/spaces/<active-space>/memory/` のガードレール

### Steps

1. **Load Prior Context** -- 利用者のプロジェクト説明を読む。既存成果物を確認する。ガードレールを載せる。
2. **Generate Clarifying Questions** -- `<record>/ideation/intent-capture/intent-capture-questions.md` を作り、最初の説明、ワークフローで選んだスコープ、使ったアクティブメモリのルールを載せる `## Sources` レジスタを置く。事業上の問題、顧客、成功指標、取り組みのきっかけ、ステークホルダー、意思決定権限、コミュニケーションの要否、ワークフローで選んだスコープが意図した製品境界と合うかを聞く。`[Answer]:` タグ形式で A–E 選択肢と X（Other）。三モードの質問フローを出す。
3. **Collect and Analyze Answers** -- タグが全部埋まっていることを確認する。曖昧さ／矛盾の分析を走る。
4. **Generate Grounded Artifacts** -- インテント声明とステークホルダーマップを出す。実質のある段落、リスト項目、表のデータ行には、インラインの `[desc]`、`[scope]`、`[Q<n>]`、`[memory:<id>]`、または `[assumption]` タグを付ける。両方のファイルに `## Assumptions & Open Questions` を置く。
5. **Resolve Assumptions** -- どちらかの成果物に前提が残っていれば、受け入れるかフォローアップ質問に変えるかを聞く。受け入れても前提ラベルは残る。事実へ昇格しない。
6. **Prepare Completion** -- Product Lead レビューを走らせ、両方の成果物を検証し、ゲート結果を `aidlc-orchestrate.ts` 経由で報告する。
7. **Present Completion & Request Approval** -- 標準の 2 選択肢ゲート。

### Outputs

| File                          | Contents                                                      |
|-------------------------------|---------------------------------------------------------------|
| `intent-statement.md`         | ソースタグ付きの問題文、対象顧客、成功指標、取り組みのきっかけ、ワークフロー選択 vs 利用者が確認した初期スコープ合図。前提セクションは必須 |
| `stakeholder-map.md`          | ソースタグ付きのステークホルダーと利害、意思決定者 vs 影響者、コミュニケーション要件。前提セクションは必須 |
| `intent-capture-questions.md` | 許可ソースのレジスタ、`[Answer]:` タグ付きの確認質問、必要なときの前提確認 |

### Notes

- どのワークフローでも最初のステージ。先行成果物は利用者入力以外に無い。
- `$ARGUMENTS` の自由文インテントは種の文脈として使う。
- 選ばなかった選択肢は、除外でも要件でもない。裏付けの無い内容は落とすか、フォローアップで聞くか、明示の前提としてだけ残す。
- インテント声明は後続の Ideation ステージすべてに流れ、Inception へも持ち越す。

---

## Stage 1.2: Market Research & Competitive Analysis

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.2                                                                    |
| Condition        | CONDITIONAL -- skip for internal tools, bug fixes, refactors           |
| Lead Agent       | aidlc-product-agent                                                          |
| Support Agents   | (none)                                                                 |
| Mode             | inline                                                                 |
| Completion Emoji | :bar_chart:                                                            |

### Purpose

外部の競合環境に対して取り組みを検証します。競合分析、市場動向、build-vs-buy 評価、差別化戦略を出します。

### Inputs

- ステージ 1.1 のインテント声明

### Outputs

| File                            | Contents                                                    |
|---------------------------------|-------------------------------------------------------------|
| `competitive-analysis.md`       | 競合環境、競合プロファイル、強み／弱み |
| `market-trends.md`              | 業界動向、規制の変化、市場規模             |
| `build-vs-buy.md`               | build-vs-buy-vs-partner 評価                          |
| `market-research-questions.md`  | `[Answer]:` タグ付きの確認質問                  |

### Notes

- 飛ばす条件: 社内ツール、バグ修正、リファクタ、インフラのみ、セキュリティパッチ、poc スコープ。
- 走ればステージ 1.3 Feasibility と、ステージ 1.4 Scope Definition の入力になる。

---

## Stage 1.3: Feasibility & Constraint Analysis

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.3                                                                    |
| Condition        | CONDITIONAL -- skip for trivial changes; execute for technical risk or compliance needs |
| Lead Agent       | aidlc-architect-agent (technical feasibility)                                |
| Support Agents   | aidlc-aws-platform-agent (AWS landscape), aidlc-compliance-agent (regulatory scanning) |
| Mode             | inline                                                                  |
| Completion Emoji | :test_tube:                                                            |

### Purpose

技術的な実現性を評価し、制約を特定し、RAID ログ（Risks、Assumptions、Issues、Dependencies）を据えます。複数エージェントのステージです。アーキテクトがリードし、続けて aws-platform と compliance が入力します。

### Inputs

- ステージ 1.1 のインテント声明
- 走っていればステージ 1.2 の市場調査

### Outputs

| File                         | Contents                                                       |
|------------------------------|----------------------------------------------------------------|
| `feasibility-assessment.md`  | 技術的実現性、リスク分析                             |
| `constraint-register.md`     | 技術、組織、規制の制約          |
| `raid-log.md`                | Risks、Assumptions、Issues、Dependencies                       |
| `feasibility-questions.md`   | `[Answer]:` タグ付きの確認質問                     |

### Notes

- mvp スコープでは "light" 深度で走る。
- 複数エージェントの形: オーケストレータは先にリードを走らせ、その出力を文脈にしてサポートエージェントを走らせる。

---

## Stage 1.4: Scope Definition & Prioritization

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.4                                                                    |
| Condition        | ALWAYS -- depth adapts to scope                                        |
| Lead Agent       | aidlc-product-agent                                                          |
| Support Agents   | aidlc-delivery-agent (capacity reality-check)                                |
| Mode             | inline                                                                 |
| Completion Emoji | :dart:                                                                 |

### Purpose

スコープ境界を据えます。MoSCoW、WSJF、または RICE で優先したインテントバックログ（作業の原型単位）と、バリューストリームマップを出します。

### Inputs

- ステージ 1.1 のインテント声明
- あればステージ 1.3 の実現性評価

### Outputs

| File                              | Contents                                                  |
|-----------------------------------|-----------------------------------------------------------|
| `scope-document.md`               | スコープ内／外の境界定義                          |
| `intent-backlog.md`               | 優先した原型単位のバックログ（MoSCoW / WSJF / RICE）    |
| `scope-definition-questions.md`   | `[Answer]:` タグ付きの確認質問                |

### Notes

- いつも走る。深度はスコープに合わせる。
- スコープ文書はプロジェクト全体の権威ある境界になる。

---

## Stage 1.5: Team Formation & Mob Planning

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.5                                                                    |
| Condition        | CONDITIONAL -- skip for solo developer or small team projects          |
| Lead Agent       | aidlc-delivery-agent                                                         |
| Mode             | inline                                                                 |
| Completion Emoji | :people_holding_hands:                                                 |

### Purpose

チームの空きを評価し、スキルを写し、ギャップを特定し、モブ編成計画を出します。

### Inputs

- ステージ 1.4 のスコープ定義
- あればステージ 1.3 の実現性評価

### Outputs

| File                            | Contents                                                    |
|---------------------------------|-------------------------------------------------------------|
| `team-assessment.md`            | チームの空き、RACI マトリクス、キャパシティ配分         |
| `skill-matrix.md`               | 必要なスキル vs あるスキル、ギャップ分析                 |
| `mob-composition.md`            | モブ編成計画、チームトポロジ                         |
| `team-formation-questions.md`   | `[Answer]:` タグ付きの確認質問                  |

### Notes

- 飛ばす条件: 一人開発、少人数チーム、poc、bugfix、refactor スコープ。
- ステージ 2.9 Delivery Planning の入力になる。

---

## Stage 1.6: Rough Mockups & Concept Visualization

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.6                                                                    |
| Condition        | CONDITIONAL -- skip for non-UI, API-only, or infrastructure-only       |
| Lead Agent       | aidlc-design-agent                                                           |
| Support Agents   | aidlc-product-agent (validates against intent)                               |
| Mode             | inline                                                                 |
| Completion Emoji | :pencil2:                                                              |

### Purpose

早いコンセプト可視化を出します。UI ならローファイのワイヤーフレームとユーザーフロー図。非 UI ならシステムコンテキスト図と相互作用フローのスケッチ。図はすべて stage-protocol.md の ASCII 規約に従います。

### Inputs

- ステージ 1.1 のインテント声明
- ステージ 1.4 のスコープ定義

### Outputs

| File                          | Contents                                                       |
|-------------------------------|----------------------------------------------------------------|
| `wireframes.md`               | ローファイワイヤーフレーム（UI）またはシステムコンテキスト図（非 UI） |
| `user-flow.md`                | 中核ユーザーフロー図（UI）または相互作用フローのスケッチ（非 UI） |
| `rough-mockups-questions.md`  | `[Answer]:` タグ付きの確認質問                     |

### Notes

- 飛ばす条件: 非 UI、API のみ、インフラのみの取り組み。
- 走れば Inception のステージ 2.5 Refined Mockups の入力になる（そちらも走るとき）。

---

## Stage 1.7: Initiative Approval & Handoff

### Metadata

| Field            | Value                                                                  |
|------------------|------------------------------------------------------------------------|
| Phase            | Ideation                                                               |
| Stage #          | 1.7                                                                    |
| Condition        | ALWAYS -- final Ideation gate before Inception                         |
| Lead Agent       | aidlc-delivery-agent                                                         |
| Support Agents   | aidlc-product-agent (validates completeness)                                 |
| Mode             | inline                                                                 |
| Completion Emoji | :white_check_mark:                                                     |

### Purpose

Ideation の成果物を 1 枚のイニシアチブブリーフにまとめ、意思決定を記録し、フェーズ境界検証を走り、go/no-go ゲートを出します。

### Inputs

ステージ 1.1–1.6 の Ideation 成果物すべて。

### Steps

1. aidlc-delivery-agent のペルソナとナレッジを載せる。
2. Ideation フェーズの成果物を全部読む。
3. 承認質問を作る。
4. イニシアチブブリーフをまとめる（全出力を 1 枚にしたもの）。
5. フェーズ境界検証（Intent → Scope → Intent Backlog の一貫性）。
6. ハンドオフとフェーズ境界の成果物を検証する。ライフサイクル状態は直接編集しない。
7. 3 選択肢の承認ゲートを出す。承認されたら結果を報告し、エンジンがステージ完了と Inception への遷移を原子的に行う。

### Outputs

| File                              | Contents                                                  |
|-----------------------------------|-----------------------------------------------------------|
| `initiative-brief.md`             | Ideation の出力をまとめた 1 ページ要約           |
| `decision-log.md`                 | Ideation 中の意思決定の記録              |
| `approval-handoff-questions.md`   | `[Answer]:` タグ付きの承認質問                  |

フェーズ境界検証:

| File                                          | Contents                                    |
|-----------------------------------------------|---------------------------------------------|
| `<record>/verification/phase-check-ideation.md` | Ideation → Inception のトレーサビリティ検査 |

### Approval Gate

特別な 3 選択肢ゲート:

- **Approve** -- Inception フェーズへ進む
- **Request Changes** -- 直しのフィードバックを出す
- **Reject Initiative** -- ワークフローをここで終える

### Notes

- フェーズ境界ステージ — stage-protocol のガバナンスに従って検証を走る。
- イニシアチブブリーフは Ideation フェーズ全体のエグゼクティブ要約になる。

---

## Phase Summary

### Key Outputs

1. **Intent Statement**（1.1） -- 問題文、対象顧客、成功指標、プロジェクト分類。
2. **Stakeholder Map**（1.1） -- 主要ステークホルダー、意思決定者、コミュニケーション要件。
3. **Competitive Analysis**（1.2） -- 市場ポジション、build-vs-buy（該当するとき）。
4. **Feasibility Assessment and RAID Log**（1.3） -- 技術的実現性、リスクレジスタ、制約（該当するとき）。
5. **Scope Document and Intent Backlog**（1.4） -- 権威あるスコープ境界、優先した原型単位の一覧。
6. **Team Plan**（1.5） -- スキルマトリクス、モブ編成、キャパシティ配分（該当するとき）。
7. **Concept Mockups**（1.6） -- ワイヤーフレーム／ユーザーフロー、またはシステムコンテキスト図（該当するとき）。
8. **Initiative Brief**（1.7） -- Ideation の出力を合成したエグゼクティブ 1 枚。
9. **Phase Boundary Verification**（1.7） -- トレーサビリティ検査の結果。

### Handoff to Inception

ステージ 1.7 で承認されると、フレームワークは Inception フェーズへ移ります。Inception は、brownfield ならステージ 2.1 Reverse Engineering、greenfield ならステージ 2.3 Requirements Analysis から始まります。

## Cross-References

- [Orchestrator](../03-orchestrator.md) -- ルーティング論理、スコープからステージへの写像
- [Stage Protocol](../04-stage-protocol.md) -- 承認ゲート、質問形式、フェーズ境界検証
- [Inception Stages](inception.md) -- 次のフェーズ
- [Initialization Stages](initialization.md) -- 前のフェーズ
