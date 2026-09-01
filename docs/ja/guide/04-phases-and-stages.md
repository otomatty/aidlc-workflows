# Phases and Stages

AI-DLC のライフサイクルは 5 フェーズ、33 ステージです。この章ではフェーズごとに中身を並べ、つながりを示します。

> **Harness note.** 方法論 — フェーズ、ステージ、エージェント、ゲート — はどのハーネスでも同じです。ゲートの出方、サブエージェントの出し方、設定の置き場所など、ハーネスで違うところは、そのハーネスの章に表でまとめています: [Running on other harnesses](harnesses/README.md)。例は注記がなければ Claude Code です。

---

## Lifecycle Overview

```mermaid
graph LR
    subgraph INITIALIZATION["INITIALIZATION (0.1-0.3)"]
        Z1["Workspace Scaffold"]
        Z4["State Init"]
        Z1 -.->|"3 stages"| Z4
    end

    subgraph IDEATION["IDEATION (1.1-1.7)"]
        I1["Intent Capture"]
        I7["Approval & Handoff"]
        I1 -.->|"7 stages"| I7
    end

    subgraph INCEPTION["INCEPTION (2.1-2.9)"]
        N1["Reverse Engineering"]
        N7["Delivery Planning"]
        N1 -.->|"9 stages"| N7
    end

    subgraph CONSTRUCTION["CONSTRUCTION (3.1-3.7)"]
        C1["Functional Design"]
        C7["CI Pipeline"]
        C1 -.->|"3.1–3.5 stage-major per Unit; 3.6–3.7 once after all Units"| C7
    end

    subgraph OPERATION["OPERATION (4.1-4.7)"]
        O1["Deployment Pipeline"]
        O7["Feedback & Optimization"]
        O1 -.->|"7 stages"| O7
    end

    Z4 -->|"auto-proceed"| I1
    I7 -->|"Verification Gate 1"| N1
    N7 -->|"Verification Gate 2"| C1
    C7 -->|"Verification Gate 3"| O1
    O7 -.->|"Feedback Loop"| I1

    style INITIALIZATION fill:#f3e5f5,stroke:#9c27b0,color:#000
    style IDEATION fill:#e8f5e9,stroke:#4caf50,color:#000
    style INCEPTION fill:#e3f2fd,stroke:#2196f3,color:#000
    style CONSTRUCTION fill:#fff3e0,stroke:#ff9800,color:#000
    style OPERATION fill:#fce4ec,stroke:#e91e63,color:#000
```

<!-- Text fallback: 線形の流れ。INITIALIZATION (0.1-0.3) は自動で IDEATION (1.1-1.7) へ進む。Ideation は Verification Gate 1 を通って INCEPTION (2.1-2.9) へ、Verification Gate 2 を通って CONSTRUCTION (3.1-3.7) へ、Verification Gate 3 を通って OPERATION (4.1-4.7) へ。4.7 から 1.1 へ戻るフィードバックループがある。 -->

フェーズは順に進みます。フェーズの境（Initialization → Ideation を除く）では **検証ゲート** が自動でトレーサビリティを見ます。欠けたリンク、孤立した成果物、不整合を、下流が積み上げる前に拾います。

---

## Phase 0: Initialization

**目的:** ワークスペースを立ち上げる — docs ディレクトリを足場にし、ワークスペースを検出し、状態を初期化する。ウェルカムメッセージはステージではなく、セッション開始時に `settings.json` の `companyAnnouncements` で出します。

Initialization のステージは承認ゲートなしで **自動** に走ります。3 つとも、1 秒もかからない決定論的なツール呼び出し（`aidlc-utility intent-create`）の中で完了します。

| # | Stage | Lead | Key Artifacts | Condition |
|---|-------|------|---------------|-----------|
| 0.1 | Workspace Scaffold | orchestrator | 最初のインテントのレコードディレクトリ（`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`） | ALWAYS |
| 0.2 | Workspace Detection | orchestrator | `aidlc-state.md`（ワークスペース状態） | ALWAYS |
| 0.3 | State Initialization | orchestrator | `aidlc-state.md`、`audit/` シャード | ALWAYS |

**実行の補足:**
- 3 ステージとも `aidlc-utility intent-create` の中でインラインに走る。LLM サブエージェントへの委譲も、ステージごとのプロンプトも無い
- ワークスペース検出はルールベースのスキャナ（拡張子、既知の設定ファイル名、パッケージマニフェスト）
- このフェーズでは人の操作は要らない

---

## Phase 1: Ideation

**目的:** 取り組みを確かめる — インテントを捉え、実現性を見、スコープを決め、チームを組み、進めてよいか承認を取る。

```mermaid
flowchart TD
    S11["1.1 Intent Capture & Framing\n(aidlc-product-agent)"]
    S12["1.2 Market Research\n(aidlc-product-agent)"]
    S13["1.3 Feasibility & Constraints\n(aidlc-architect-agent)"]
    S14["1.4 Scope Definition\n(aidlc-product-agent)"]
    S15["1.5 Team Formation\n(aidlc-delivery-agent)"]
    S16["1.6 Rough Mockups\n(aidlc-design-agent)"]
    S17["1.7 Approval & Handoff\n(aidlc-delivery-agent)"]
    VG1{{"Verification Gate:\nIdeation → Inception"}}

    S11 ==>|ALWAYS| S12
    S11 -.->|"skip: bugfix, refactor,\ninfra, security-patch"| S14
    S12 -.->|CONDITIONAL| S13
    S12 -.->|"skip if no\nfeasibility needed"| S14
    S13 -.->|CONDITIONAL| S14
    S14 ==>|ALWAYS| S15
    S14 -.->|"skip: poc,\nbugfix, refactor"| S17
    S15 -.->|CONDITIONAL| S16
    S15 -.->|"skip if no UI"| S17
    S16 -.->|CONDITIONAL| S17
    S17 ==>|ALWAYS| VG1

    style S11 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S14 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S17 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S12 fill:#fff9c4,stroke:#f9a825,color:#000
    style S13 fill:#fff9c4,stroke:#f9a825,color:#000
    style S15 fill:#fff9c4,stroke:#f9a825,color:#000
    style S16 fill:#fff9c4,stroke:#f9a825,color:#000
    style VG1 fill:#ef9a9a,stroke:#c62828,color:#000
```

<!-- Text fallback: 1.1 Intent Capture（ALWAYS）は 1.2 Market Research（CONDITIONAL）へ、または直接 1.4 へ。1.2 は 1.3 Feasibility（CONDITIONAL）へ、または 1.4 へ。1.3 は 1.4 Scope Definition（ALWAYS）へ。1.4 は 1.5 Team Formation（CONDITIONAL）へ、または 1.7 へ。1.5 は 1.6 Rough Mockups（CONDITIONAL、UI が無ければ飛ばす）へ、または 1.7 へ。1.6 は 1.7 Approval & Handoff（ALWAYS）へ、そのあと Verification Gate 1。 -->

| # | Stage | Lead | Supporting | Key Artifacts | Condition |
|---|-------|------|-----------|---------------|-----------|
| 1.1 | Intent Capture & Framing | aidlc-product-agent | aidlc-architect-agent | インテント声明、ステークホルダーマップ | ALWAYS |
| 1.2 | Market Research | aidlc-product-agent | — | 競合分析、build-vs-buy | CONDITIONAL |
| 1.3 | Feasibility & Constraints | aidlc-architect-agent | aidlc-aws-platform-agent、aidlc-compliance-agent | 実現性評価、制約レジスタ、RAID ログ | CONDITIONAL |
| 1.4 | Scope Definition | aidlc-product-agent | aidlc-delivery-agent | スコープ定義、インテントバックログ | ALWAYS |
| 1.5 | Team Formation | aidlc-delivery-agent | — | チーム評価、モブ編成計画 | CONDITIONAL |
| 1.6 | Rough Mockups | aidlc-design-agent | aidlc-product-agent | ワイヤーフレーム、ユーザーフロー、コンセプトデッキ | CONDITIONAL |
| 1.7 | Approval & Handoff | aidlc-delivery-agent | aidlc-product-agent | イニシアチブブリーフ、意思決定ログ | ALWAYS |

**ステージの色:** 緑 = ALWAYS（選んだスコープに入っていれば走る）。黄 = CONDITIONAL（スコープ、プロジェクト種別、計画によって飛ばすことがある）。スコープごとの所属は [Stage-by-Scope Matrix](05-scopes-and-depth.md#stage-by-scope-matrix) を見てください。

Intent Capture は最初の説明、ワークフローで選んだスコープ、使ったメモリルールを questions ファイルに残します。インテント声明とステークホルダーマップの主張にはインラインのソースタグが付き、どちらも前提と未決の問いを表に出します。残す前提は、Product Lead のレビューと承認ゲートの前に、明示の確認が要ります。

---

## Phase 2: Inception

**目的:** 要件を膨らませる — コードベースを読み、要件を引き出し、アーキテクチャを設計し、作業ユニットに分解し、デリバリーを計画する。

```mermaid
flowchart TD
    S21{{"`**2.1 Reverse Engineering**
    (aidlc-developer-agent + aidlc-architect-agent)
    pipeline: 2-link`"}}
    S2P["2.2 Practices Discovery\n(aidlc-pipeline-deploy-agent)"]
    S22["2.3 Requirements Analysis\n(aidlc-product-agent)"]
    S23["2.4 User Stories\n(aidlc-product-agent)"]
    S24["2.5 Refined Mockups\n(aidlc-design-agent)"]
    S25["2.6 Domain Design\n(aidlc-architect-agent)"]
    S26["2.7 Units Generation\n(aidlc-architect-agent)"]
    S2C["2.8 Contract Design\n(aidlc-architect-agent)"]
    S27["2.9 Delivery Planning\n(aidlc-delivery-agent)"]
    VG2{{"Verification Gate:\nInception → Construction"}}

    BF_CHECK{"Brownfield?\n(from Initialization 0.3)"}
    BF_CHECK -->|Yes| S21
    BF_CHECK -->|No| S2P
    S21 -.->|CONDITIONAL| S2P
    S2P -.->|CONDITIONAL| S22

    subgraph RE_DETAIL["Two-Link RE Pipeline"]
        direction LR
        DEV_SCAN["Step 1: Developer\nCode Scan"]
        ARCH_SYNTH["Step 2: Architect\nSynthesis"]
        DEV_SCAN --> ARCH_SYNTH
    end

    S21 -.-> RE_DETAIL

    S22 ==>|ALWAYS| S23
    S22 -.->|"skip if no user-facing\nfeatures"| S25
    S23 -.->|CONDITIONAL| S24
    S23 -.->|"skip if no UI\nor mockups skipped"| S25
    S24 -.->|CONDITIONAL| S25
    S25 -.->|"if in scope"| S26
    S22 -.->|"if 2.6 skipped"| S26
    S26 -.->|CONDITIONAL| S2C
    S26 -.->|"if 2.8 skipped"| S27
    S2C ==>|ALWAYS| S27
    S27 ==>|ALWAYS| VG2

    style S21 fill:#bbdefb,stroke:#1565c0,color:#000
    style S2P fill:#fff9c4,stroke:#f9a825,color:#000
    style S22 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S26 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S27 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S23 fill:#fff9c4,stroke:#f9a825,color:#000
    style S24 fill:#fff9c4,stroke:#f9a825,color:#000
    style S25 fill:#fff9c4,stroke:#f9a825,color:#000
    style S2C fill:#fff9c4,stroke:#f9a825,color:#000
    style VG2 fill:#ef9a9a,stroke:#c62828,color:#000
    style RE_DETAIL fill:#e8eaf6,stroke:#3f51b5,color:#000
```

<!-- Text fallback: brownfield 判定（ステージ 0.3 から）。Yes なら 2.1 Reverse Engineering が 2 段パイプラインで走る（開発のコードスキャン、そのあとアーキテクトの合成と書き出し）。続けて 2.2 Practices Discovery が、入っているスコープすべてでハブ＆スポークとして走る（リード下書き、互いに見えない quality / developer / devsecops のスポーク、人へのインタビュー、リード統合）。確認した仕事はアクティブスペースのメモリへ昇格する。次は 2.3 Requirements Analysis（ALWAYS）、任意の 2.4 User Stories モブ、任意の 2.5 Refined Mockups、任意の 2.6 Domain Design、2.7 Units Generation（ALWAYS）、任意の 2.8 Contract Design、2.9 Delivery Planning（ALWAYS）。そのあと Verification Gate 2。 -->

| # | Stage | Lead | Supporting | Key Artifacts | Condition |
|---|-------|------|-----------|---------------|-----------|
| 2.1 | Reverse Engineering | aidlc-developer-agent | aidlc-architect-agent | RE 成果物 9 点 | brownfield プロジェクト |
| 2.2 | Practices Discovery | aidlc-pipeline-deploy-agent | aidlc-quality-agent、aidlc-developer-agent、aidlc-devsecops-agent | `team-practices.md`、`discovered-rules.md`、`evidence.md`（確認後に `aidlc/spaces/<active-space>/memory/team.md` / `project.md` へ昇格） | CONDITIONAL |
| 2.3 | Requirements Analysis | aidlc-product-agent | — | `requirements.md` | ALWAYS |
| 2.4 | User Stories | aidlc-product-agent | aidlc-design-agent、aidlc-developer-agent、aidlc-quality-agent | `stories.md`、`personas.md` | ユーザー向け機能があるとき |
| 2.5 | Refined Mockups | aidlc-design-agent | aidlc-product-agent | ハイファイモック、インタラクション仕様 | UI プロジェクト |
| 2.6 | Domain Design | aidlc-architect-agent | aidlc-aws-platform-agent、aidlc-design-agent | `components.md`、`decisions.md`（ADR） | 実行計画に従う |
| 2.7 | Units Generation | aidlc-architect-agent | aidlc-delivery-agent | `unit-of-work.md`、`unit-of-work-dependency.md`（DAG）、`unit-of-work-story-map.md` | ALWAYS |
| 2.8 | Contract Design | aidlc-architect-agent | aidlc-aws-platform-agent | `contract-summary.md` | CONDITIONAL |
| 2.9 | Delivery Planning | aidlc-delivery-agent | aidlc-architect-agent | `bolt-plan.md`、`team-allocation.md`、`risk-and-sequencing-rationale.md`、`external-dependency-map.md` | ALWAYS |

**動きの要点:** ステージ 2.1 は **パイプライン**（2 段チェーン）です。先に aidlc-developer-agent がコードをスキャンし、続けて aidlc-architect-agent が合成して成果物を書きます。戻るたびに順序付きの永続レシートが残り、複数リポジトリでは承認の前にリポジトリごとに鎖が 1 本完走する必要があります。走るのは brownfield だけです。ステージ 2.2 は greenfield / brownfield とも **サブエージェントのハブ＆スポーク** です。リードが下書きし、quality / developer / devsecops が互いに見えないまま点検し、人へのインタビューで穴を埋め、リードが統合します。ステージ 2.4 は **モブ** です。リードが下書きし、design / developer / quality が寄与ファイルで並行に足します。

---

## Phase 3: Construction

**目的:** 解を作る — 設計、実装、テストを、レビューできる薄さで進める。

### Why Construction works the way it does

Construction は以前、[作業ユニット](glossary.md) ごとにステージを順に回し、ステージのたびに承認ゲートを置いていました。ユニット 3 つの案件なら、テスト済みのコードが 1 行も出る前にゲートが 15 回です。利用者はお守りだ、と言いました。

最初の直しは、質問も設計成果物もコード生成も全ユニットまとめて、最後に一度レビューする形でした。今度は逆に振り切れます。ユニット 15 の実行では、Build and Test のゲートに 15,000 行が一度に落ちる。一度のレビューでは見切れません。

いまの形はその中間です。Construction の **既定ウォークは stage-major** — あるステージを全ユニットに走らせてから、次のステージへ。[ボルト](glossary.md) は 2.9 で計画する Construction のデリバリーのまとまりです（ユニット 1 つ以上、DoD、確信度の仮説、オーナー）。`bolt-plan.md` は計画の中身であり、エンジンはユニットのまとまりやウォーク順には使いません。実行時バッチは `unit-of-work-dependency.md`（2.7）から出ます。`Construction Iteration: unit-major` は任意のウォークで、昔の文書が既定として書いていたものです。**ウォーキングスケルトン** は計画上の最初のボルトです。既定ウォークでは、対象になる最初の Construction EXECUTE ステージがそのゲートです。そのゲートが承認されたあと、**ラダープロンプト** がちょうど一度出ます。答えは状態に残り、残りの Construction *ステージ* ゲートを支配します。ステージ 3.6（Build and Test）と 3.7（CI Pipeline）は最後に、全体に対して一度だけ走ります。

この形は、早い確信度の点検と、自律するかどうかの意図した選択をくれます。レビューできるまとまりは、いまでも 2.9 でボルトとして計画します。配布のウォークは、まだそのまとまりを実行時の境界としては使いません。

### Construction flow

```mermaid
flowchart TD
    START(["Begin Construction"])
    READ[/"Read unit-of-work-dependency.md (2.7)\nbolt-plan.md is planning, not the walk source"/]

    STAGE1["First in-scope Construction EXECUTE stage\nfor every Unit (often 3.1)"]
    GATE1{{"Walking-skeleton gate\nfirst Construction EXECUTE stage"}}

    LADDER{"Ladder prompt\n(fires once)"}
    MODE_AUTO["Continue autonomously\nskips remaining stage gates\n(swarm settle auto-approved)"]
    MODE_GATED["Gate every remaining stage"]

    NEXT["Next Construction stage\nfor every Unit"]
    GATE_N{{"Per-stage gate\n(skipped if autonomous)"}}
    MORE{"More per-unit stages?"}

    S36["3.6 Build and Test\n(aidlc-quality-agent)\nALWAYS — once"]
    S37["3.7 CI Pipeline\n(aidlc-pipeline-deploy-agent)\nCONDITIONAL — once"]
    VG3{{"Verification Gate:\nConstruction → Operation"}}

    START --> READ --> STAGE1 --> GATE1 --> LADDER
    LADDER --> MODE_AUTO
    LADDER --> MODE_GATED
    MODE_AUTO --> NEXT
    MODE_GATED --> NEXT
    NEXT --> GATE_N
    GATE_N --> MORE
    MORE -->|"Yes"| NEXT
    MORE -->|"No"| S36
    S36 ==> S37
    S36 -.->|"skip CI if\nnot in scope"| VG3
    S37 -.-> VG3

    style STAGE1 fill:#bbdefb,stroke:#1565c0,color:#000
    style GATE1 fill:#ffcc80,stroke:#e65100,color:#000
    style LADDER fill:#fff59d,stroke:#f57f17,color:#000
    style MODE_AUTO fill:#c8e6c9,stroke:#388e3c,color:#000
    style MODE_GATED fill:#f8bbd0,stroke:#c2185b,color:#000
    style NEXT fill:#bbdefb,stroke:#1565c0,color:#000
    style S36 fill:#c8e6c9,stroke:#388e3c,color:#000
    style S37 fill:#fff9c4,stroke:#f9a825,color:#000
    style VG3 fill:#ef9a9a,stroke:#c62828,color:#000
```

<!-- Text fallback: Construction 開始 → ユニット DAG のために unit-of-work-dependency.md を読む（bolt-plan.md は計画） → 対象の最初の Construction EXECUTE ステージを全ユニットに走らせる → walking-skeleton ゲート → ラダープロンプト（自律なら残りのステージゲートを飛ばす、gated なら残す） → 残りは stage-major、Code Generation が最後 → 3.6 Build and Test、任意で 3.7 CI Pipeline → Verification Gate 3。 -->

### Parallel Unit batches

2 つのユニットが同じ依存前提を共有し（例: ユニット B と C がどちらも A にだけ依存する）、互いに依存していなければ **バッチ** になります。設計ステージはそのバッチに `directive.wave` を出せます。Code Generation は兄弟ユニットを同時に出せます。自律スウォームでは、エンジンが DAG バッチをすべて収束させてから、Code Generation のステージゲートを **1 回** 出します。中間バッチごとではありません。

```mermaid
flowchart LR
    S1["First Construction EXECUTE stage\nfor every eligible Unit"]
    GA{{"One walking-skeleton gate"}}
    L{"Ladder prompt"}
    LATER["Remaining design stages\nstage-major"]

    subgraph CG["3.5 Code Generation"]
        A["Unit A"]
        B["Unit B"]
        C["Unit C"]
    end

    GBC{{"One Code Generation stage gate\nafter the final DAG batch (swarm)"}}

    S1 --> GA --> L --> LATER --> A
    A --> B
    A --> C
    B --> GBC
    C --> GBC

    style S1 fill:#bbdefb,stroke:#1565c0,color:#000
    style GA fill:#ffcc80,stroke:#e65100,color:#000
    style L fill:#fff59d,stroke:#f57f17,color:#000
    style A fill:#bbdefb,stroke:#1565c0,color:#000
    style B fill:#bbdefb,stroke:#1565c0,color:#000
    style C fill:#bbdefb,stroke:#1565c0,color:#000
    style CG fill:#fff3e0,stroke:#e65100,color:#000
    style GBC fill:#ffcc80,stroke:#e65100,color:#000
```

<!-- Text fallback: 対象になる全ユニットに最初の Construction EXECUTE ステージを走らせ、walking-skeleton ゲート 1 回とラダープロンプト。残りの設計ステージは stage-major のまま。Code Generation ではユニット A が B と C の封鎖を解けば、その 2 つは並行バッチになり得る。自律スウォームでは、最後の DAG バッチが収束したあと、Code Generation のステージゲートが 1 回、そのステージを覆う。 -->

コンダクター（生きている `/aidlc` セッション）は、1 ターンで複数の `Task` を出して、並行の Code Generation ユニットを派遣します。設計ステージはエンジン駆動のユニットごと（または wave）の経路に残ります。`BOLT_STARTED` / `BOLT_COMPLETED` はスウォーム経路でユニット／worktree ごとに発火し、`SWARM_COMPLETED` がバッチを閉じます。既定の gated 実行では、これらの `BOLT_*` 行は残りません。

### Halt-and-ask on failure

失敗は、自律モードでも Construction を止めます。自律で止まるもう一つの場合は、Build-and-Test ループバックの 4 段目です。

- 単独ユニットの Code Generation が失敗したら、Construction はすぐ止まり、**retry**（そのユニットだけ再実行）、**skip**（`[S]` を付けて続ける — 依存側も失敗しやすい）、**abort** を出します。
- 並行バッチの 1 ユニットが失敗し、ほかが成功したら、コンダクターはバッチ全体の完了を待ち、成功したユニットの成果物はディスクに残し、失敗したユニットだけに同じ retry / skip / abort を出します。

### Stage reference

| # | Stage | Lead | Supporting | Key Artifacts | Runs |
|---|-------|------|-----------|---------------|------|
| 3.1 | Functional Design | aidlc-architect-agent | aidlc-developer-agent | `entities.md`、`rules.md`、`functional-spec.md` | ユニットごと（実行計画で CONDITIONAL） |
| 3.2 | NFR Requirements | aidlc-architect-agent | aidlc-devsecops-agent、aidlc-compliance-agent、aidlc-quality-agent | 性能、セキュリティ、スケーラビリティ、信頼性、可観測性の NFR | ユニットごと（CONDITIONAL） |
| 3.3 | NFR Design | aidlc-architect-agent | aidlc-aws-platform-agent | NFR 設計仕様 | ユニットごと（CONDITIONAL） |
| 3.4 | Infrastructure Design | aidlc-aws-platform-agent | aidlc-devsecops-agent、aidlc-compliance-agent | インフラ仕様、IaC 設計 | ユニットごと（CONDITIONAL） |
| 3.5 | Code Generation | aidlc-developer-agent | — | アプリケーションコード + コード文書 | ユニットごと（ALWAYS） |
| 3.6 | Build and Test | aidlc-quality-agent | aidlc-devsecops-agent | テスト結果、品質レポート | ALWAYS、最後に一度 |
| 3.7 | CI Pipeline | aidlc-pipeline-deploy-agent | — | CI 設定、品質ゲート | CONDITIONAL、最後に一度 |

**動きの要点:**

- 既定ウォークは stage-major。あるステージの質問と成果物を全ユニットに走らせてから、次のステージへ。配布のウォークにボルト単位の answers ゲートは無い
- `stages/construction/code-generation.md` の中のユニット完了ゲートは、通常の Construction では **コンダクターが抑える**。最後のユニットが落ち着いたあとに、ステージ単位のゲート 1 回が代わりになる。スウォームでは、そのゲートは最後の DAG バッチを待つ
- ラダープロンプトはワークフローにつきちょうど一度 — 最初の Construction EXECUTE ステージゲートのあと。答えは `aidlc-state.md` の `Construction Autonomy Mode` に残り、セッション再開でも守られる。既定ウォークでは、`autonomous` は残りのステージゲートを飛ばす（halt-and-ask、Build-and-Test ループバックの 4 段目、スウォーム settle 再入場は除く。自律では settle 再入場は自動承認）。unit-major はスウォームを抑えるが、ステージごとのゲート連鎖は **残す**
- 並行の Code Generation バッチには、`Task` を複数出せるサブエージェント枠が要る。同時実行の制約は [Agents](06-agents.md)

---

## Phase 4: Operation

**目的:** デプロイして回す — デプロイパイプライン、環境の用意、可観測性、フィードバックループを置く。

```mermaid
flowchart TD
    S41["4.1 Deployment Pipeline\n(aidlc-pipeline-deploy-agent)"]
    S42["4.2 Environment Provisioning\n(aidlc-aws-platform-agent)"]
    S43["4.3 Deployment Execution\n(aidlc-pipeline-deploy-agent)"]
    S44["4.4 Observability Setup\n(aidlc-operations-agent)"]
    S45["4.5 Incident Response\n(aidlc-operations-agent)"]
    S46["4.6 Performance Validation\n(aidlc-quality-agent)"]
    S47["4.7 Feedback & Optimization\n(aidlc-operations-agent)"]

    S41 -.->|CONDITIONAL| S42
    S42 -.->|CONDITIONAL| S43
    S43 -.->|CONDITIONAL| S44
    S44 -.->|CONDITIONAL| S45
    S45 -.->|CONDITIONAL| S46
    S46 -.->|CONDITIONAL| S47

    S47 -->|"Approve"| DONE(["Workflow Complete"])
    S47 -->|"Start New Cycle"| IDEATION(["Return to Ideation 1.1"])

    style S41 fill:#fce4ec,stroke:#c62828,color:#000
    style S42 fill:#fce4ec,stroke:#c62828,color:#000
    style S43 fill:#fce4ec,stroke:#c62828,color:#000
    style S44 fill:#fce4ec,stroke:#c62828,color:#000
    style S45 fill:#fce4ec,stroke:#c62828,color:#000
    style S46 fill:#fce4ec,stroke:#c62828,color:#000
    style S47 fill:#fce4ec,stroke:#c62828,color:#000
    style DONE fill:#a5d6a7,stroke:#2e7d32,color:#000
    style IDEATION fill:#e8f5e9,stroke:#4caf50,color:#000
```

<!-- Text fallback: Operation のステージはすべて CONDITIONAL。4.1 から 4.7 は順に進む。ステージ 4.7 はワークフローを完了するか、Ideation 1.1 から新しいサイクルを始める。 -->

| # | Stage | Lead | Supporting | Key Artifacts | Condition |
|---|-------|------|-----------|---------------|-----------|
| 4.1 | Deployment Pipeline | aidlc-pipeline-deploy-agent | — | CD 設定、デプロイ戦略、ロールバックランブック | CONDITIONAL |
| 4.2 | Environment Provisioning | aidlc-aws-platform-agent | aidlc-devsecops-agent、aidlc-compliance-agent | 環境インベントリ、検証レポート | CONDITIONAL |
| 4.3 | Deployment Execution | aidlc-pipeline-deploy-agent | aidlc-developer-agent | デプロイログ、スモークテスト、ヘルスチェック | CONDITIONAL |
| 4.4 | Observability Setup | aidlc-operations-agent | — | ダッシュボード、アラーム、SLO 設定 | CONDITIONAL |
| 4.5 | Incident Response | aidlc-operations-agent | — | SSM ランブック、インシデント計画、エスカレーションマトリクス | CONDITIONAL |
| 4.6 | Performance Validation | aidlc-quality-agent | — | 負荷試験結果、NFR 検証マトリクス | CONDITIONAL |
| 4.7 | Feedback & Optimization | aidlc-operations-agent | aidlc-aws-platform-agent | SLO レポート、コスト分析、フィードバックループ文書 | CONDITIONAL |

**動きの要点:**
- 7 ステージすべて **conditional** — `mvp` と `poc` スコープではフェーズごと飛ばせる
- ステージ 4.7 は **終端ステージ** — 承認でワークフロー完了
- 4.7 から 1.1 へ戻る **フィードバックループ** で、開発サイクルを繰り返せる

---

## Phase Transitions and Verification Gates

フェーズの境（Ideation → Inception、Inception → Construction、Construction → Operation）では、フレームワークが **フェーズ境界検証** を走らせます。自動検査の対象は次です。

- 終わるフェーズの必須成果物が揃っている
- 成果物間のトレーサビリティリンクが切れていない（例: 要件がストーリーに対応している）
- 孤立した成果物や欠けた参照が無い
- 関連する成果物同士が矛盾していない

検証が落ちたら、コンダクターは問題を報告し、進めるか戻って直すかを聞きます。

---

## Stage Execution Modes Reference

| Mode | Stages | User Interaction | Description |
|------|--------|-----------------|-------------|
| Inline（自動進行） | 0.1、0.2、0.3 | なし | `aidlc-utility intent-create` の中で決定論的に走る。承認ゲート無し |
| Inline | 29 ステージ | 全部 | エージェントが会話の中で進み、末尾に承認ゲート |
| Subagent | 2.2、3.5 | 2.2 はプラクティスインタビュー + 最終ゲート。3.5 は承認ゲート | ハブ＆スポークの Practices Discovery。集中した Code Generation |
| Pipeline（2 段） | 2.1 | 承認ゲートだけ | 開発のスキャン、そのあとアーキテクトの合成と書き出し |
| Mob | 2.4 | ステージ途中の判断質問 + 承認ゲート | リードが下書き。design / developer / quality が寄与ファイルで並行に協働 |

33 ステージ全体のトポロジは **インライン 29 / サブエージェント 2 / パイプライン 1 / モブ 1** です。

---

## Next Steps

- [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) — どのステージが走るかはスコープが決める。全表は [Stage-by-Scope Matrix](05-scopes-and-depth.md#stage-by-scope-matrix)
- [Agents](06-agents.md) — エージェント 14 体の編成。領域、レビュー、コンポーズの役
- [Your First Workflow](02-your-first-workflow.md) — 注釈付きの通し
- [Glossary](glossary.md) — 用語
