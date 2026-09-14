# ナレッジシステム

この章は二層のナレッジアーキテクチャです。方法論ナレッジがフレームワークにどう同梱されるか、チームナレッジがプロジェクトごとにどう管理されるか、6 段の読み込み順、テンプレート、ナレッジの足し方です。

---

## Two-Tier Architecture

AI-DLC は、フレームワークの方法論とチームの寄せを分ける二層のナレッジシステムです:

**Tier 1: 方法論ナレッジ**（`.claude/knowledge/`） — フレームワーク同梱。共有原則とエージェントごとの方法論参照。フレームワークのアップグレードで更新。ワークフロー実行中は読み取り専用。

**Tier 2: チームナレッジ**（アクティブスペース — `aidlc/knowledge/`。`aidlc/spaces/<space>/knowledge/` の略） — 利用者が管理。会社固有の標準、方針、約束。スペースの `memory/`、`codekb/`、`intents/` の兄弟なので、そのスペースの全インテントで積み上がる。自由形式。ブートストラップ時は空。エンジンは最初の `/aidlc` で空の `aidlc/knowledge/` ディレクトリを作り、中身は種をまきません。固定のファイル集合はありません。

### Tier 1 Structure

```
.claude/knowledge/
+-- aidlc-shared/
|   +-- ai-dlc-principles.md       # Core methodology principles
|   +-- verification.md            # Phase boundary verification rules
|   +-- brownfield.md              # Brownfield safeguards
|   +-- audit-format.md            # 98-event audit taxonomy
|   +-- knowledge-readme-template.md  # Optional README template a team can copy into Tier 2
|   +-- state-template.md          # State file contract
+-- aidlc-product-agent/
|   +-- requirements-guide.md
|   +-- product-guide.md
|   +-- functional-design-guide.md
|   +-- requirements-elicitation.md
|   +-- prioritization-frameworks.md
|   +-- user-story-patterns.md
|   +-- market-research-methods.md
+-- aidlc-architect-agent/
|   +-- architecture-guide.md
|   +-- nfr-design-guide.md
|   +-- ddd-patterns.md
|   +-- architecture-patterns.md
|   +-- nfr-design-patterns.md
|   +-- adr-template.md
+-- aidlc-developer-agent/
|   +-- code-analysis-guide.md
|   +-- code-generation-guide.md
|   +-- code-generation-patterns.md
|   +-- api-design-guide.md
|   +-- data-modelling-patterns.md
|   +-- re-artifacts.md
+-- [... 8 more agent knowledge dirs]
```

### Tier 2 Structure

ブートストラップ時は空です。エンジンは裸の `aidlc/knowledge/` ディレクトリを作り、中身は何も作りません — README も、エージェントごとのサブディレクトリもありません。下の `aidlc-shared/` とエージェントごとのディレクトリは、エージェントペルソナが探す約束です。チームは中身があるものだけ作ります。

```
aidlc/knowledge/                    # empty at bootstrap; team-created subdirs
+-- aidlc-shared/                   # optional — loaded by every agent if present
|   +-- (user-added files)
+-- aidlc-product-agent/            # optional — loaded when that agent is active
|   +-- (user-added files)
+-- [... a directory per agent the team chooses to populate]
```

## DocumentKB Derived Catalog

DocumentKB は、Tier 2 ナレッジルートの下にある、スペース単位の派生カタログです:

```
aidlc/spaces/<space>/knowledge/
+-- documents/       # user-owned originals
+-- documentkb/      # tool-owned derived catalog
    +-- index.json
    +-- <document-id>/
        +-- metadata.json
        +-- content.md
        +-- summary.md    # present only once `knowledge summarize` has run
```

`aidlc-knowledge.ts` はカタログ変更を `documentkb/.journal/<transaction-id>/` の下にステージし、ワークスペース監査ロックを持ったままコミットします。`documents/` の下の原本は、フレームワークが決して動かしたり消したりしません。抽出した中身 **と** 要約はリビジョン結びで、信頼できないデータとして扱います: `summarize <id> --text-file <path> --source-revision <sha256>` は、ツール自身が決して生成しない LLM 執筆の要約テキストを永続します。行のダイジェストともう一致しない `source_revision` を持つ要約は、抽出とまったく同じに `invalidated` と報告され、差し止められます。`list` または `show` が出すタグは、顧客コンテンツから LLM が書いた可能性もあるので、インラインの信頼できないデータの注記を運びます。

各文書の `metadata.json` は、失った `index.json` を再建するのに要る行の身元とソース事実を複製します。それが復旧境界です。残ったメタデータレコードは ID と墓石を戻します。`documentkb/` 木全体を消すと再建源が無くなり、復旧できません。

文書の出自は、それが記述するカタログ書きのあと、監査最後にスペース単位シャード `aidlc/spaces/<space>/intents/audit/` へ出ます。DocumentKB 復旧と `--doctor --export` はそのシャードを明示して読みます。通常のワークフロー権威の読み手は、アクティブインテントの監査シャードにスコープされたままです。順序の例外と復旧意味は [State Machine](12-state-machine.md#audit-last-for-derived-catalogs-document_indexed-document_updated-document_removed) です。

スキーマと検証契約は `core/tools/aidlc-documentkb-schema.ts` が持ち、コマンドとトランザクション論理は `core/tools/aidlc-knowledge.ts` が持ちます。

---

## 6-Step Knowledge Loading Order

各ステージはナレッジを厳密な 6 段で読みます。解決したルール集合が先、それから共有方法論、エージェント固有の方法論、チームの寄せ、最後に先行ステージの成果物です。

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant G as Rules
    participant SM as Shared Methodology
    participant AM as Agent Methodology
    participant TK as Team Knowledge
    participant TAK as Team Agent Knowledge
    participant PA as Prior Artifacts

    O->>G: Step 1: Load aidlc/spaces/<active-space>/memory/
    Note over G: org.md + team.md + project.md + phases/<phase>.md
    G-->>O: Rules loaded (strict-additive — all layers present)

    O->>SM: Step 2: Load .claude/knowledge/aidlc-shared/
    Note over SM: Shared methodology principles
    SM-->>O: Shared knowledge loaded

    O->>AM: Step 3: Load .claude/knowledge/[agent-name]/
    Note over AM: Agent-specific methodology
    AM-->>O: Agent methodology loaded

    O->>TK: Step 4: Load aidlc/knowledge/aidlc-shared/
    Note over TK: Team shared knowledge (if exists)
    TK-->>O: Team knowledge loaded

    O->>TAK: Step 5: Load aidlc/knowledge/[agent-name]/
    Note over TAK: Team agent-specific knowledge (if exists)
    TAK-->>O: Team agent knowledge loaded

    O->>PA: Step 6: Load prior stage artifacts
    Note over PA: As required by current stage inputs
    PA-->>O: Prior artifacts loaded

    Note over O: Stage execution begins with full context
```

| Step | Source | Tier | Managed By | Loaded |
|------|--------|------|-----------|--------|
| 1 | `aidlc/spaces/<active-space>/memory/` | -- | Framework + self-learning | First |
| 2 | `.claude/knowledge/aidlc-shared/` | 1 | Framework | Early |
| 3 | `.claude/knowledge/[agent]/` | 1 | Framework | Early |
| 4 | `aidlc/knowledge/aidlc-shared/` | 2 | Team | Mid |
| 5 | `aidlc/knowledge/[agent]/` | 2 | Team | Mid |
| 6 | Prior stage artifacts | -- | Dynamic | Last |

> **Note:** ステップ 1–5 は `stage-protocol.md` セクション 5 が定義するエージェントナレッジ読み込みです。ステップ 6（先行ステージ成果物）は、オーケストレータが実行時に足す文脈であり、ファイル読み込みステップではありません。

### What Each Layer Contributes

- ルール（ステップ 1）が先に読み、厳格加算の 5 層チェーン（org → team → project → phase → stage）で解決します — 適用するルールはすべて文脈にあります。より広い層は上書きされず、足されるだけです。[Rule System](08-rule-system.md)。
- フレームワーク方法論（ステップ 2–3）がベースラインの振る舞いを与えます。
- チームナレッジ（ステップ 4–5）が組織固有の文脈を足します。
- 先行成果物（ステップ 6）がワークフロー固有の文脈を与えます。

---

## Template System

### Knowledge README Template

`.claude/knowledge/aidlc-shared/knowledge-readme-template.md` は、チームが Tier 2 ディレクトリへコピーして文書化できる任意の README テンプレートを出荷します。エンジンは足場にも種まきもしません — スペース単位の `aidlc/knowledge/` ディレクトリは空で作られ、チームが欲しいものを足します。テンプレートが説明すること:

- そのエージェント向けに足すファイルの種類
- よくある寄せファイルの例
- ファイルの読み込み方（エージェントが起動すると自動）
- 特別な命名規則は要らない — どの `.md` も読まれる

### State Template

エンジンは `.claude/knowledge/aidlc-shared/state-template.md` の契約に従って `aidlc-state.md` を生成します。テンプレートは必須の節とフィールドを定義します。具体的な Stage Progress 行は、コンパイル済みステージグラフとスコープグリッドから出され、テンプレートで手列挙しません。

---

## Adding Team Knowledge

会社固有のファイルをチームナレッジディレクトリへ足します:

```bash
# Team-wide standards (loaded by all agents)
aidlc/knowledge/aidlc-shared/company-coding-standards.md
aidlc/knowledge/aidlc-shared/company-architecture-principles.md

# Agent-specific standards (loaded only when that agent is active)
aidlc/knowledge/aidlc-architect-agent/company-architecture-patterns.md
aidlc/knowledge/aidlc-devsecops-agent/company-security-policy.md
aidlc/knowledge/aidlc-developer-agent/company-coding-conventions.md
aidlc/knowledge/aidlc-quality-agent/company-testing-standards.md
```

ファイルはエージェントが起動すると自動で読みます（読み込み順のステップ 4–5）。設定変更は不要です。ディレクトリに置いたどの `.md` も読まれます。

### Knowledge by Agent

> この表はスナップショットです。各エージェントの権威ある `display_name` + `examples` は、エージェントの frontmatter `core/agents/<slug>-agent.md` にあり、`core/tools/aidlc-lib.ts` の `loadAgents()` 経由でプログラムから面に出ます。新しいエージェントは先にそこに足し、同じ PR でこの表を更新します。

| Directory | Purpose | Example Files |
|-----------|---------|---------------|
| `aidlc-shared/` | チーム全体の標準 | `coding-standards.md`、`api-conventions.md` |
| `aidlc-product-agent/` | プロダクト文脈 | `roadmap.md`、`personas.md` |
| `aidlc-design-agent/` | UX/UI 指針 | `design-system.md`、`accessibility.md` |
| `aidlc-delivery-agent/` | PM の約束 | `sprint-cadence.md`、`definition-of-done.md` |
| `aidlc-architect-agent/` | アーキテクチャ判断 | `tech-stack.md`、`infrastructure-preferences.md` |
| `aidlc-developer-agent/` | コーディングパターン | `db-conventions.md`、`error-handling.md` |
| `aidlc-quality-agent/` | テスト標準 | `test-strategy.md`、`coverage-requirements.md` |
| `aidlc-devsecops-agent/` | セキュリティ方針 | `security-baseline.md`、`compliance-rules.md` |
| `aidlc-aws-platform-agent/` | クラウド文脈 | `account-structure.md`、`service-limits.md` |
| `aidlc-compliance-agent/` | コンプライアンスルール | `data-governance.md`、`audit-requirements.md` |
| `aidlc-pipeline-deploy-agent/` | CI/CD 標準 | `pipeline-standards.md`、`deployment-gates.md` |
| `aidlc-operations-agent/` | Ops ランブック | `monitoring.md`、`incident-response.md` |

---

## Cross-References

- [Architecture](01-architecture.md) — 5 層モデルのナレッジ層
- [Agent System](05-agent-system.md) — エージェント frontmatter と設定
- [Stage Protocol](04-stage-protocol.md) — エージェントペルソナ読み込みの節
- [Hooks and Tools](06-hooks-and-tools.md) — audit-format.md の分類（共有ナレッジに同梱）
