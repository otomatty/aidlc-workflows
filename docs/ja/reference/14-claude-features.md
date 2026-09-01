# ハーネスプリミティブの対応

AI-DLC の方法論概念はハーネス非依存です。各 CLI ハーネスは、自分のネイティブプリミティブでそれを表します。この章は AI-DLC の概念を、各ハーネスが使うプリミティブへ対応づけ、それから **Claude Code** の表し方を詳しく書きます（いちばん文書が揃っているハーネスです。Kiro CLI、Kiro IDE、Codex、opencode、GitHub Copilot、Cursor は同じ概念をそれぞれの同等物で表し、章ごとに [Running on other harnesses](../guide/harnesses/README.md) に要約があります。ハーネス追加のソース契約は [Porting to a New Harness](../harness-engineering/09-porting-to-a-new-harness.md) です）。

フックは [Hooks and Tools](06-hooks-and-tools.md)。ナレッジは [Knowledge System](10-knowledge-system.md)。

---

## 概念からプリミティブへの対応（ハーネスごと）

AI-DLC の概念は定数、それを運ぶプリミティブがハーネスのパラメータです。新しいハーネスへ移植するとき列を足してください。

| AI-DLC Concept | Claude Code | Kiro CLI | Kiro IDE | Codex CLI | opencode | GitHub Copilot | Cursor |
|----------------|-------------|----------|----------|-----------|----------|----------------|--------|
| **Orchestrator entry** (`/aidlc` + runners) | Skills (`/aidlc`) | Skills (`/aidlc`) | Skills (`/aidlc`) | Skills (`$aidlc`) | Command → skill (`/aidlc`; skills from `.aidlc/skills` via `skills.paths`) | Skills (`/aidlc`; `.github/skills/`) | Native skills (`/aidlc` plus `/aidlc-status`, `/aidlc-jump`, `/aidlc-scope`; `.cursor/skills/`) |
| **Agent personas** (14 total) | `.claude/agents/*.md` | `.kiro/agents/*.json` + persona `.md` | Conductor `agents/aidlc.md` + 14 persona `.md` files with IDE `tools:`/`permissions.rules` | `.codex/agents/` TOMLs | `.opencode/agents/*.md` (subagents) + persona `.md` | `.github/agents/*.md` (custom agents) + persona `.md` | `.cursor/agents/*.md` (native subagents) |
| **Automation** (audit, state, tracking) | Hooks via `settings.json` | Hooks via `agents/aidlc.json` | `.kiro/hooks/aidlc-*.json` (v2, IDE >= 1.0) + `.kiro/hooks/aidlc-*.kiro.hook` (legacy, pre-1.0) | Hooks via `.codex/hooks.json` (one adapter) | Adapter plugin (`.opencode/plugin/`) | Hooks via `.github/hooks/aidlc.json` (one adapter) | Hooks via `.cursor/hooks.json` (one adapter) |
| **Standing rules** (the layer chain) | `aidlc/spaces/<active-space>/memory/` (via `.claude/rules/aidlc.md` @-import stub) | `aidlc/spaces/<active-space>/memory/` (via agent resources) | `aidlc/spaces/<active-space>/memory/` (via always-included steering live references) | `aidlc/spaces/<active-space>/memory/` (via `AIDLC_RULES_DIR`) | `aidlc/spaces/<active-space>/memory/` (via `instructions` glob) | `aidlc/spaces/<active-space>/memory/` (via `AGENTS.md` @-imports) | `aidlc/spaces/<active-space>/memory/` (always-applied `rules/aidlc.mdc` standing pointer + four agent-decided phase pointers) |
| **Project onboarding doc** | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` | `AGENTS.md` |
| **Permissions / config** | `.claude/settings.json` | `.kiro/settings/cli.json` + agent config | Agent `.md` `tools:` + `permissions.rules` frontmatter | `.codex/config.toml` (+ Starlark `rules/`) | `opencode.json` (project root) | `trustedFolders` (`~/.copilot/config.json`) + `--allow-tool` flags | `.cursor/cli.json` (permissions) + `.cursor/hooks.json` |

下にある決定論エンジン、状態機械、監査ログ、ステージグラフ、スウォーム審判は、どのハーネスでもバイト一致です。違うのはそれを運ぶプリミティブだけです。この章の残りは、各プリミティブの **Claude Code** での表し方を詳しく書きます。Kiro CLI、Kiro IDE、Codex、opencode、Copilot、Cursor の同等物は、それぞれの案内章を見てください。

---

## Claude 固有

続く節は、Claude Code が各プリミティブをどう表すかです。スキル frontmatter、エージェント読み込みモード、`settings.json` ブロック、`.mcp.json` 模型。ほかのハーネスは上の表のプリミティブで同じ概念を運びます。Claude 専用の仕組み（`companyAnnouncements` 歓迎メッセージ、statusline コマンド、`AskUserQuestion` ゲートウィジェット）は、そのように明示します。

---

## Skills

### SKILL.md as Entry Point

オーケストレータは `.claude/skills/aidlc/SKILL.md` にあります。利用者は `/aidlc` コマンドで呼びます。ファイルは YAML frontmatter でメタデータを宣言します。

```yaml
---
name: aidlc
description: >
  AI-DLC workflow orchestrator. Start, resume, or manage an AI-driven
  development lifecycle.
argument-hint: "[description | --status | --stage <slug|#> | --phase <name|#> | --help]"
user-invocable: true
---
```

オーケストレータの frontmatter に `hooks:` ブロックはありません。v0.6.0 から、どのフレームワークフックも `settings.json` にプロジェクト単位で登録します（hooks-move、Fork 2→B）。オーケストレータと、パッケージ済みまたは手書きのどのランナーも、ランナーごとの `hooks:` ブロックを複製せずに決定論の背骨を継ぎます。

| Field | Purpose |
|-------|---------|
| `name` | Claude Code のコマンド系にスキルを `/aidlc` として登録する |
| `description` | スキル発見とヘルプ文に出る |
| `argument-hint` | `/aidlc` のあとに出すプレースホルダ。受け付ける引数を示す |
| `user-invocable` | `true` にして、利用者が直接起動できるようにする |

SKILL.md の本文は薄い転送ループ — コンダクターです。オーケストレーションエンジン（`aidlc-orchestrate next`）を呼び、返った型付きディレクティブに従い（ステージを走らせる、質問する、スウォームを展開する）、結果を報告（`report`）し、繰り返します。ステージ間の判断 — セッション検出、スコープからステージへの対応、ステージグラフ、ルーティング、ステージ進行 — はこのファイルではなく、エンジンとそれが読むコンパイル済みデータ（`tools/data/stage-graph.json`、`scope-grid.json`）にあります。[Engine and Skill System](17-skill-system.md) を見てください。

### Project-Wide Hooks

どのフレームワークフックも `settings.json` にプロジェクト単位で登録します（ワークフロー背骨のフックが、セッション寿命と statusline のフックにそこへ加わります）。各フックは **自己ゲート** します。ワークフローが無ければ早期終了するので、AI-DLC 以外の普通の Claude Code 利用では no-op です。詳細は [Hooks and Tools](06-hooks-and-tools.md)。

### Companion Files

SKILL.md は共有プロトコル族とステージファイルを参照します。

- **`aidlc-common/protocols/stage-protocol.md`** -- ステージ 33 すべての必須静的プロトコル。
- **条件付きプロトコルモジュール** -- レビュアー、編成、Construction、スウォーム、復旧、ガバナンス。引き金が発火したときだけ載る。
- **ステージファイル** `stages/initialization/`、`stages/ideation/`、`stages/inception/`、`stages/construction/`、`stages/operation/` -- 個別のステージ定義 33。

---

## Agents

### Agent File Format

この実装は AI-DLC のエージェント役割を、`.claude/agents/` の平らな `.md` ファイルとして描きます。14 ファイル: 領域の専門家ペルソナ 11、レビュー専用 2（product-lead、architecture-reviewer）、適応型ワークフローのコンポーザー。それぞれ YAML frontmatter のあとに markdown 本文です。frontmatter はエージェント起動時の Claude Code の振る舞いを制御し、本文はペルソナ、責任、協働の型、読むメモリの焦点、主な原則を与えます。パッケージャは、投影したファイルへ、コンパクトな必須の委譲ナレッジ preflight を注入します。

エージェント系の全体は [Agent System](05-agent-system.md)。

### Inline vs Subagent Loading

コンダクターは、四つのステージトポロジをまたいで、エージェント起動の二モード — ペルソナ採用と Task ディスパッチ — を使います。

**インライン実行（33 中 29 ステージ）:**
コンダクターはエージェントの `.md` ファイルを読み、メイン会話の中でペルソナを直接載せます。利用者はエージェントとリアルタイムでやりとりします。

**ディスパッチ実行（4 ステージ: 2.1 pipeline、2.2 subagent、2.4 mob、3.5 subagent）:**
コンダクターは Claude Code の Task ツール経由で、別の Claude インスタンスへ委ねます。ディスパッチされた各エージェントは隔離して走り、プロンプト経由で文脈を受け、構造化した要約を返します。編成の協力者は、リードが統合する寄与ファイルも書きます。

| Stage | Claude Code Subagent Type | Agent | Reason |
|-------|---------------------------|-------|--------|
| 2.1 Reverse Engineering | `aidlc-developer-agent` then `aidlc-architect-agent` (pipeline, 2-link chain) | aidlc-developer-agent + aidlc-architect-agent | Deep code analysis produces large intermediate output |
| 2.2 Practices Discovery | lead, three parallel support spokes, lead integration (subagent hub-and-spoke) | pipeline-deploy + quality + developer + devsecops | Independent practice evidence, human interview, then controlled integration |
| 2.4 User Stories | product lead plus parallel design/developer/quality mob | 4 participants | Bounded collaborative story elaboration with human judgment |
| 3.5 Code Generation | `aidlc-developer-agent` | aidlc-developer-agent | Code writing benefits from clean context focused on the unit specification |

Workspace detection（0.2）はかつてはサブエージェントでした。いまは `aidlc-utility intent-create` の中で決定論的に走ります。

### Agent Tiers (projected model + effort)

どのエージェントの書いたダイヤルも `tier:` です。パッケージャはそれを、Claude Code が読む `model:` / `effort:` frontmatter キーへ投影します。以前の振る舞い（v2.2.15 から v2.2.19。その前はキーは効かない `modelOverride:`）は、判断形の 9 エージェントに `model: opus` をピンし、より大きなモデルで走っているセッションを強制的に下げていました。

| Tier | Agents | Claude Code projection | Rationale |
|------|--------|------------------------|-----------|
| `judgment` | architect, product, design, developer, quality, devsecops, compliance, aws-platform, composer (9) | `model: inherit`, no `effort:` line - the session's model and effort win | Multi-constraint reasoning whose decisions cascade downstream - architectural boundaries, intent interpretation, UX trade-offs, code synthesis, threat prioritisation, regulatory edge-cases, cloud architecture |
| `balanced` | architecture-reviewer, product-lead (2) | `model: sonnet`, `effort: medium` | Review against an explicit checklist; the criteria encode the method, so a mid-size model at reduced effort suffices |
| `templated` | delivery, pipeline-deploy, operations (3) | `model: sonnet`, `effort: medium` | Output is dominantly templated planning tables, CI/CD YAML, or observability/runbook scaffolding; methodology is encoded in the agent's knowledge files |

省いた `effort:` キーはセッション effort を継ぎ、ピンしたキーは両方向でセッションを上書きします（ピンは上限であり下限ではない）。無いことは `judgment` では意図的で、このキーを省く唯一の tier です。ハーネスごとの投影表全体（Kiro ではどの tier もセッションの model と effort を継ぐ）と `tier_cap` 上書きは [Agent System](05-agent-system.md) にあります。

---

## Rules

### The layered rule files

この実装は、アクティブスペースのメモリ層 `aidlc/spaces/<active-space>/memory/` から振る舞いルールを読み、`.claude/rules/aidlc.md` の @-import スタブ経由で Claude のコンテキストへ引きます。継承鎖の層につきファイル 1 本です。

```
aidlc/spaces/<active-space>/memory/
├── org.md                        # framework defaults (shipped)
├── team.md                       # this team's affirmed practices
├── project.md                    # this project's specialization
└── phases/                       # rules scoped to a phase
    ├── ideation.md
    ├── inception.md
    ├── construction.md
    └── operation.md
```

各ファイルは話題の `##` 見出しを持ちます（Way of Working、Testing Posture、Deployment、Code Style、Forbidden、Mandated など）。ワークフロー開始時、コンパイルリゾルバは鎖 **org → team → project → phase → stage** を歩き、解決したルール集合を各ステージのグラフノードへ焼き込みます。模型は **厳格加算** です。当たるルールはどの層からもエージェントのコンテキストに同時に出ます。狭い層が広い層を黙って上書きすることはありません。残す学びでは、受け入れプロトコルが、決定論的な書き手が走る前に、提案文を広い方針と LLM 検査で比べるようオーケストレータに頼みます。その検査は監査の助けであり、書き手が強制する境界ではありません。実行時は衝突を和解しません。正の配置、スコープ導出、衝突の意味は [Rule System](08-rule-system.md) です。

**なぜ org / team ファイルを薄く保つか:** Claude Code はスペースメモリファイル（`.claude/rules/aidlc.md` の @-import スタブ経由）を、AI-DLC 以外も含む各会話へ載せます。出荷層を簡潔な話題構造に抑えると、普通の開発セッションを汚しません。上流仕様がルールに置く詳しい方法論は、代わりに `.claude/knowledge/aidlc-shared/` か SKILL.md と stage-protocol.md にあり、`/aidlc` がアクティブなときだけ載ります。

### The Learning Loop

ルールファイルは静的ではありません。v0.5.0 のラーニングループが、ワークフロー中の訂正を、次のための残るルールにします。役割分担は意図的です。LLM はステージが走っているあいだ観察をステージの `memory.md` 日記へ書き（Interpretations / Deviations / Tradeoffs / Open questions）、オーケストレータがあとで受け入れ比較を行います。候補抽出と永続化は決定論ツール、選択と衝突処分は人の判断です。

1. **日記（LLM）。** ステージ中、観察はインテントのレコードディレクトリ `<record>/<phase>/<stage>/memory.md` に溜まります（`<record>/` = `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）。
2. **表に出す（ツール）。** 承認ゲートで `aidlc-learnings.ts surface` が日記を読み、構造化した候補を出します。LLM は再解析も分類もしません。
3. **確認（人）。** コンダクターが候補を描き、残すものを選び、自由文の追加では行き先を導く見出しを一つ選びます。
4. **受け入れ検査（オーケストレータ LLM）。** オーケストレータは残した各学びを `org.md` の一致する節と比べます。矛盾は、直す、飛ばす、上げる、として表に出します。
5. **永続化（ツール）。** `aidlc-learnings.ts persist` は結果の選択を、`org.md` を読まずに受け付け、確認した各学びを日付付きエントリとして `aidlc/spaces/<active-space>/memory/{project,team}.md` のプラクティスへ書き、センサー結びの学びではマニフェストとステージ `sensors:` import を一つのロックしたトランザクションで入れます。`RULE_LEARNED` / `SENSOR_PROPOSED` を出します。

利用者向けの通し（作業例付き）は [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md)。ハーネスエンジニアの書き方は [Rules and the Learning Loop](../harness-engineering/05-rules-and-the-loop.md)。

---

## CLAUDE.md

### Project-Level Instructions

`.claude/CLAUDE.md` は、どの会話にも載るプロジェクト単位の指示です。AI-DLC ではブートストラップ文書です。

**主な節:**

| Section | Contents |
|---------|----------|
| Prerequisites | `bun`（唯一のランタイム依存）。`mkdir` ベースのロック |
| AI-DLC Structure | スキル、エージェント、ルール、ナレッジ、フックの場所 |
| Conventions | 成果物はインテントのレコードディレクトリ `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`。アプリケーションコードはワークスペースルート |
| Session Resumption | 起動時に `aidlc-state.md` を調べ、再開選択肢を出す |
| Git Integration | コミット方針（下参照） |

### Git Integration

```
Commit: aidlc/ workspace (memory layer, intents registry, per-intent
        aidlc-state.md, audit/ shards, and stage artifacts)
Gitignore:
  - aidlc/active-space, aidlc/spaces/*/intents/active-intent  (per-user cursors)
  - aidlc/.aidlc-clone-id, aidlc/.aidlc-sessions/             (machine-local)
  - aidlc/spaces/*/intents/*/runtime-graph.json              (re-derivable)
  - aidlc/spaces/*/intents/*/.aidlc-*                          (incl. .aidlc-recovery.md)
```

監査証跡は **クローンごとのシャード**（`audit/<host>-<clone>.md`）としてコミットします。各クローンは自分のシャードへ追記するので、並行追記が git 衝突しません。利用者ごとのセッションカーソルと機械ローカルの導出状態は無視します。

---

## Settings {#settings}

### Permissions Configuration

`.claude/settings.json` は Claude Code ツールを事前承認するので、呼び出しごとの許可プロンプト無しでワークフローが走ります。

```json
{
  "permissions": {
    "allow": [
      "Read", "Edit", "Write", "Bash",
      "Glob", "Grep", "Task", "WebSearch"
    ]
  }
}
```

これが無いと、Claude Code は最初の使用のたびに「Allow this tool?」と聞き、ワークフローを壊します。とくに、利用者が直接やりとりしていないサブエージェント委譲のあいだです。

### Status Line Configuration

```json
"statusLine": {
  "type": "command",
  "command": "bun \"$CLAUDE_PROJECT_DIR/.claude/hooks/aidlc-statusline.ts\""
}
```

定期的に走ります（ツール使用時だけではない）。端末の状態をいまのままに保つためです。

### SessionStart and SessionEnd Hook Configuration

```json
"hooks": {
  "SessionStart": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "bun \"$CLAUDE_PROJECT_DIR/.claude/hooks/aidlc-session-start.ts\""
    }]
  }],
  "SessionEnd": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "bun \"$CLAUDE_PROJECT_DIR/.claude/hooks/aidlc-session-end.ts\""
    }]
  }]
}
```

`settings.json` に登録（プロジェクト単位）— v0.6.0 の hooks-move 以降、どのフレームワークフックもそうです。セッション寿命イベントはどちらにせよプロジェクト単位でなければなりません。`/aidlc` が起動する前と、終わったあとに発火するからです。`session-start.ts` は再開文脈を注入し、`session-end.ts` は監査の完結のために `SESSION_ENDED` を出します。

### Personal Settings Override

`.claude/settings.local.json`（gitignore）は、リポジトリを変えずに共有設定を上書きします。

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

---

## MCP Servers {#mcp-servers}

### .mcp.json as the Server Registry

この実装は Model Context Protocol（MCP）サーバを、プロジェクトルートの `.mcp.json` で宣言します。`.claude/` の中ではなく隣です。ファイルはサーバ名を、輸送と起動設定へ対応づけます。

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    },
    "aws-mcp": {
      "command": "uvx",
      "args": [
        "mcp-proxy-for-aws@latest",
        "https://aws-mcp.us-east-1.api.aws/mcp",
        "--metadata",
        "AWS_REGION=us-east-1"
      ]
    },
    "aws-pricing": { "command": "uvx", "args": ["awslabs.aws-pricing-mcp-server@latest"] },
    "aws-iac": { "command": "uvx", "args": ["awslabs.aws-iac-mcp-server@latest"] },
    "aws-serverless": { "command": "uvx", "args": ["awslabs.aws-serverless-mcp-server@latest"] }
  }
}
```

出荷する 5 サーバが、フレームワークのエージェントが手を伸ばす統合を覆います。

| Server | Transport | Auth | Purpose |
|--------|-----------|------|---------|
| `context7` | HTTP | `${CONTEXT7_API_KEY}` env passthrough | Library/SDK documentation lookups |
| `aws-mcp` | `uvx` (`mcp-proxy-for-aws@latest`, `AWS_REGION=us-east-1`) | Standard AWS credential chain | AWS API access |
| `aws-pricing` | `uvx` (`awslabs.aws-pricing-mcp-server@latest`) | AWS credential chain | AWS pricing |
| `aws-iac` | `uvx` (`awslabs.aws-iac-mcp-server@latest`) | AWS credential chain | Infrastructure-as-code tooling |
| `aws-serverless` | `uvx` (`awslabs.aws-serverless-mcp-server@latest`) | AWS credential chain | Serverless tooling |

レジストリが運ぶのは環境変数プレースホルダだけです。コミットした秘密はありません。資格情報はシェルを通ります。`context7` は環境から `CONTEXT7_API_KEY` を読み、`uvx` 起動の AWS サーバ 4 つは標準 AWS 資格情報鎖に対して認証します（`uv` / `uvx` の導入は `curl -fsSL https://astral.sh/uv/install.sh | sh`）。資格情報の無いサーバはセッションで使えないだけで、ワークフローを止めません。

`.mcp.json` がプロジェクトルートにあるのは、Claude Code がプロジェクト範囲 MCP サーバを読むパスだからです。この実装はいま Claude Code プラグインではなく `.claude/` ディレクトリコピーとして出荷しますが、プロジェクトルートの `.mcp.json` 配置は正規のプラグイン位置でもあるので、レジストリは変更無しでプラグイン移植できます。

### Provisioning and Inheritance

アクセス模型はプロビジョニングのあとに継承です。あいだに付与ステップはありません。

1. **一度宣言。** サーバはプロジェクトルートの `.mcp.json` に並びます。
2. **セッションへプロビジョン。** Claude Code が宣言したサーバを起動し、ツールをセッションへ `mcp__<server>__<tool>` id として出します。
3. **どこでも継承。** サブエージェントは既定ですべてのセッション MCP ツールを継ぎます。どの AI-DLC エージェントも — インラインでも委譲サブエージェント（ディスパッチステージ 2.1、2.2、2.4、3.5 とその協力者）でも — 宣言したどのサーバにも届きます。

エージェントごとの付与ステップは無く、要りません。継承が既定で、全エージェントへ加算です。新しいエージェントファイルは、frontmatter にサーバを並べず、存在するだけで MCP アクセスを得ます。

### Why There Is No Per-Agent Grant

これが支える教訓です。再論争しないよう、はっきり書きます。**MCP アクセスはエージェントへ足して付与できません。継承され、レバーは制限だけです。** Claude Code 2.1.159 に対する経験的スパイクが境界を固めました。

- エージェントは frontmatter でサーバを*指名*しても何も得ません。加算の付与フィールドはありません。継承がすでにセッション MCP ツールをすべて与えています。
- エージェントにサーバを*使わせない*には、`tools:` 許可リスト（本物の Claude Code frontmatter フィールド）を、呼んでよい完全修飾 `mcp__<server>__<tool>` id まで狭めます。埋めた `tools:` 一覧からツールを省くことが拒否です。
- 裸の `mcp__<server>` トークンは**効きません**。サーバ単位のワイルドカードはありません。完全修飾 `mcp__<server>__<tool>` id だけが一致します。
- `disallowedTools` は拒否側の、本物で動くフィールドです。この実装はネストしたサブエージェント生成を塞ぐために `disallowedTools: Task` を使います。その拒否は MCP サーバアクセスに影響しません。

スパイクは別の frontmatter 落とし穴も表に出しました。`allowedTools` は認識される Claude Code サブエージェントフィールドでは**なく**、黙って無視されます。`allowedTools: Read` を宣言したエージェントは MCP ツールにまだ届き、全部継承と同じ振る舞いでした。同じエージェントに `tools: Read` があると正しく拒否しました。解決（v0.5.4）: 黙って無視される `allowedTools` フィールドは、出荷するどのエージェントファイル（`.claude/agents/*.md`）からも外しました。エージェントはいま、組み込みツールも MCP ツールも、セッションツール一式を意図的に継ぎます。宣言した制限は `disallowedTools: Task` だけです。文書化したオプトインの狭めは本物の `tools:` 許可リストで、完全修飾 `mcp__<server>__<tool>` id も並べなければ継承した MCP を落とします。だから全部継承はいま、無視されたフィールドの事故ではなく、意図した文書化模型です。どのエージェントも、きょう宣言したどのサーバにも届きます。

### Relationship to settings.json Permissions

二つの設定ファイルは違う問いに答え、重なりません。

- `.claude/settings.json` の `permissions.allow` は *Claude Code 組み込みツール*（Read、Edit、Write、Bash、Glob、Grep、Task、WebSearch）を事前承認し、セッションが初回使用で聞かないようにします（上の [Settings](#settings)）。MCP サーバについては何も言いません。
- `.mcp.json` は *どの MCP サーバが存在するか* と起動の仕方を宣言します。プロビジョニングと継承は Claude Code の MCP 層が支配し、`settings.json` ではありません。

セッションに MCP サーバが出るのは `.mcp.json` と使える資格情報の関数であり、`settings.json` の許可リスト項目ではありません。エージェントごとの狭めを配線するときは、エージェントの `tools:` frontmatter にあります。`settings.json` でも `.mcp.json` でもありません。

---

## Feature Interaction Map

| Feature | File(s) | When It Loads | Role |
|---------|---------|---------------|------|
| CLAUDE.md | `.claude/CLAUDE.md` | Every conversation | Bootstrap: structure, prerequisites, conventions |
| Settings | `.claude/settings.json` | Every conversation | Pre-approve Claude Code tools |
| Rules | `aidlc/spaces/<active-space>/memory/*.md` (via `.claude/rules/aidlc.md` @-stub) | Every conversation | Minimal guardrails; self-learning corrections |
| Skill | `.claude/skills/aidlc/SKILL.md` | On `/aidlc` invocation | Orchestrator: session, scope, stage graph, delegation |
| Workflow-spine hooks | `.claude/settings.json` | Always on; self-gate when no workflow | PostToolUse, PreCompact, SubagentStop, Stop |
| Agents (inline) | `.claude/agents/*.md` | Persona activation | 29 of 33 stages: conductor adopts agent persona |
| Agents (dispatched) | `.claude/agents/*.md` | Task tool delegation | 4 stages (2.1 pipeline, 2.2 subagent, 2.4 mob, 3.5 subagent): isolated execution |
| Knowledge (Tier 1) | `.claude/knowledge/` | Persona activation (steps 2-3) | 56 methodology reference files |
| Knowledge (Tier 2) | space-level `aidlc/knowledge/` (sibling of `intents/`) | Persona activation (steps 4-5) | Team-managed customization |
| Stage protocol | `stage-protocol.md` + conditional modules | Static core every stage; modules on trigger | Mandatory behavioral contract |
| Stage files | `stages/**/*.md` | Engine routing | 33 individual stage definitions |
| State file | `aidlc-state.md` | Session start + throughout | Persistent workflow state |
| Audit file | `audit.md` | Throughout execution | Append-only audit trail |

### Loading Sequence

利用者が `/aidlc feature` を走らせると:

```
1.  CLAUDE.md loads              (every conversation)
1a. statusLine command starts    (settings.json -- runs continuously)
2.  settings.json loads          (every conversation; all hooks register here, project-wide)
2a. SessionStart hook fires      (settings.json -- if session resume)
3.  memory/ rules load            (every conversation)
4.  SKILL.md activates           (skill invocation -- the conductor)
5.  Conductor calls the engine   (`aidlc-orchestrate next $ARGUMENTS`)
6.  Engine reads state + graph   (decides the move, emits a typed directive)
7.  Conductor acts on directive  (run-stage: load agent .md + knowledge, run the body)
8.  Stage executes               (stage work)
9.  Hooks fire as needed         (Claude Code tool calls, compaction, subagent stop)
10. Conductor reports the outcome (`aidlc-orchestrate report` -- commits state)
11. Loop back to step 5          (next directive) until the engine emits `done`
```

ステップ 1–2a は、AI-DLC 以外も含むどの会話でも起きます。どのフックも `settings.json` にプロジェクト単位で登録されている（スキル起動ではない）ので、決定論の背骨は `/aidlc` が呼ばれる前から場所にあります。各フックはワークフローが無ければ no-op へ自己ゲートします。ステップ 3 がルール層を載せます。ステップ 4 以降は、利用者が `/aidlc` を呼んだときだけワークフローを用意し駆動します。ステップ 5–11 はディレクティブにつき一度繰り返します。各反復が何をするかを決めるのは SKILL.md ではなくエンジンです。

---

## Cross-References

- [Architecture](01-architecture.md) -- すべての機能層を含む 5 層モデル
- [Orchestrator](03-orchestrator.md) -- SKILL.md の深掘り
- [Agent System](05-agent-system.md) -- エージェント frontmatter、ツール制限、エージェント tier
- [Hooks and Tools](06-hooks-and-tools.md) -- フック系、監査分類、CLI ツール
- [Knowledge System](10-knowledge-system.md) -- 二層ナレッジ、読み込み順
- [Porting to a New Harness](../harness-engineering/09-porting-to-a-new-harness.md) -- 上の対応表へ列を足す方法。マニフェスト、フックアダプタ、`emit.ts` 契約
- [Running on other harnesses](../guide/harnesses/README.md) -- これらのプリミティブの Kiro CLI、Kiro IDE、Codex、Cursor、opencode、Copilot での表し方
