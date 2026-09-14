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

オーケストレータは `.claude/skills/aidlc/SKILL.md` に住みます。利用者は `/aidlc` コマンドで呼びます。ファイルは YAML frontmatter でメタデータを宣言します:

```yaml
---
name: aidlc
description: >
  AI-DLC workflow orchestrator. Start, resume, or manage an AI-driven
  development lifecycle.
argument-hint: "[description | --status | --config [section] | --stage <slug|#> | --phase <name|#> | --help]"
user-invocable: true
---
```

オーケストレータの frontmatter は `hooks:` ブロックを持ちません。v0.6.0 から、どのフレームワークフックも `settings.json` にプロジェクト単位で登録します（hooks-move、Fork 2→B）。だからオーケストレータと、パッケージした / 手書きのどのランナーも、ランナーごとの `hooks:` ブロックをコピーせずに決定論的な背骨を継承します。

| Field | Purpose |
|-------|---------|
| `name` | スキルを Claude Code のコマンド系で `/aidlc` として登録する |
| `description` | スキル発見とヘルプテキストに出る |
| `argument-hint` | `/aidlc` のあとに出るプレースホルダ。受け入れる引数を示す |
| `user-invocable` | `true` にして、利用者が直接引き金を引けるようにする |

SKILL.md の本文は薄い転送ループ — コンダクターです。オーケストレーションエンジン（`aidlc-orchestrate next`）を呼び、返る型付きディレクティブに従い（ステージを走る、質問する、スウォームを展開する）、結果を `report` し、繰り返します。ステージ間の判断 — セッション検出、スコープからステージへの対応、ステージグラフ、ルーティング、ステージ進行 — はこのファイルではなく、エンジンとそれが読むコンパイル済みデータ（`tools/data/stage-graph.json`、`scope-grid.json`）にあります。[Engine and Skill System](17-skill-system.md)。

### Project-Wide Hooks

どのフレームワークフックも `settings.json` にプロジェクト単位で登録します（ワークフロー背骨のフックが、セッション寿命と statusline のフックにそこへ加わります）。各フックは **自己ゲート** します。ワークフローが無ければ早期終了するので、AI-DLC 以外の普通の Claude Code 利用では no-op です。詳細は [Hooks and Tools](06-hooks-and-tools.md)。

### Companion Files

SKILL.md は共有プロトコル族とステージファイルを参照します:

- **`aidlc-common/protocols/stage-protocol.md`** — ステージ 33 すべて向けの必須静的プロトコル。
- **条件付きプロトコルモジュール** — レビュアー、編成、Construction、スウォーム、復旧、ガバナンス。引き金が発火したときだけ読む。
- **ステージファイル** `stages/initialization/`、`stages/ideation/`、`stages/inception/`、`stages/construction/`、`stages/operation/` — 個々のステージ定義 33。

---

## Agents

### Agent File Format

この実装は AI-DLC のエージェント役割を `.claude/agents/` の平らな `.md` ファイルとして描きます — 14 ファイル: 領域専門家ペルソナ 11、レビュー専用エージェント 2（product-lead、architecture-reviewer）、適応ワークフローのコンポーザー。それぞれ YAML frontmatter のあと markdown 本文です。frontmatter はエージェント起動時の Claude Code 振る舞いを制御し、本文はペルソナ、責任、協働パターン、関連メモリの焦点、主要原則を与えます。パッケージャは、投影したファイルへコンパクトな必須の委譲ナレッジプリフライトを注入します。

エージェント系の全体は [Agent System](05-agent-system.md)。

### Inline vs Subagent Loading

コンダクターは、4 つのステージトポロジ横断で、エージェント起動の 2 モード — ペルソナ採用と Task 派遣 — を使います:

**インライン実行（ステージ 33 のうち 29）:**
コンダクターはエージェントの `.md` を読み、メイン会話の中でペルソナを直接採用します。利用者はエージェントとリアルタイムで対話します。

**派遣実行（ステージ 4: 2.1 パイプライン、2.2 サブエージェント、2.4 モブ、3.5 サブエージェント）:**
コンダクターは Claude Code Task ツール経由で別の Claude インスタンスへ委譲します。各派遣エージェントは隔離して走り、プロンプト経由で文脈を受け、構造化した要約を返します。編成の協働者は加えて、リードが統合する寄与ファイルを書きます。

| Stage | Claude Code Subagent Type | Agent | Reason |
|-------|---------------------------|-------|--------|
| 2.1 Reverse Engineering | `aidlc-developer-agent` then `aidlc-architect-agent`（パイプライン、2 リンク鎖） | aidlc-developer-agent + aidlc-architect-agent | 深いコード分析が大きな中間出力を出す |
| 2.2 Practices Discovery | リード、並行サポートスポーク 3、リード統合（サブエージェントのハブ＆スポーク） | pipeline-deploy + quality + developer + devsecops | 独立したプラクティス証拠、人へのインタビュー、それから制御した統合 |
| 2.4 User Stories | プロダクトリード + 並行 design/developer/quality モブ | 参加者 4 | 人の判断付きの有界協働ストーリー精緻化 |
| 3.5 Code Generation | `aidlc-developer-agent` | aidlc-developer-agent | コード執筆はユニット仕様に焦点したきれいな文脈が効く |

workspace detection（0.2）はかつてサブエージェントでした。いまは `aidlc-utility intent-create` の中で決定論的に走ります。

### Agent Tiers (projected model + effort)

どのエージェントの書いたダイヤルも `tier:` です。パッケージャはそれを、Claude Code が読む `model:` / `effort:` frontmatter キーへ投影します。以前の振る舞い（v2.2.15 から v2.2.19。それ以前キーは惰性の `modelOverride:`）は、判断形のエージェント 9 つに `model: opus` をピンし、より大きいモデルで走るセッションを強制的に下げました。

| Tier | Agents | Claude Code projection | Rationale |
|------|--------|------------------------|-----------|
| `judgment` | architect、product、design、developer、quality、devsecops、compliance、aws-platform、composer（9） | `model: inherit`、`effort:` 行無し — セッションのモデルと effort が勝つ | 下流へ連鎖する判断の多拘束推論 — アーキテクチャ境界、インテント解釈、UX トレードオフ、コード合成、脅威優先、規制の端、クラウドアーキテクチャ |
| `balanced` | architecture-reviewer、product-lead（2） | `model: sonnet`、`effort: medium` | 明示チェックリストに対するレビュー。測定したレビュアーベースラインが、開示して出荷した一段下げ |
| `templated` | delivery、pipeline-deploy、operations（3） | `model: inherit`、`effort:` 行無し | 出力は主にテンプレート化した計画表、CI/CD YAML、観測 / ランブック足場。ティアは Writing up ダイヤル群のまま、出荷ベースラインは継承 |

省略した `effort:` キーはセッション effort を継承し、ピンしたものは両方向でセッションを上書きします（ピンは上限であり、下限ではない）。judgment と templated は既定で継承、balanced は測定したレビュアーベースラインをピンします。インストールごとの Writing up ダウングレードを残すには `aidlc config models` です。ハーネスごとの投影表全体と `tier_cap` 上書きは [Agent System](05-agent-system.md)。

---

## Rules

### The layered rule files

この実装は、`.claude/rules/aidlc.md` の @-import スタブ経由で Claude の文脈へ引き込む、アクティブスペースメモリ層 `aidlc/spaces/<active-space>/memory/` から振る舞いルールを読みます。継承チェーンの層ごとに 1 ファイル:

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

各ファイルは話題の `##` 見出しを運びます（Way of Working、Testing Posture、Deployment、Code Style、Forbidden、Mandated など）。ワークフロー開始時、コンパイルリゾルバはチェーン **org → team → project → phase → stage** を歩き、解決したルール集合を各ステージのグラフノードへ焼き込みます。模型は **厳格加算** です。どの層の適用ルールもエージェントの文脈に同時に現れます — より狭い層がより広い層を黙って上書きすることはありません。残した学びでは、入場プロトコルが、決定論ライターが走る前に、提案テキストをより広い方針と LLM 検査で比べるようオーケストレータに求めます。その検査はライター強制の境界ではなく監査補助です。実行時は衝突を和解しません。権威ある配置、スコープ導出、衝突意味は [Rule System](08-rule-system.md)。

**org/team ファイルが細い理由:** Claude Code は（`.claude/rules/aidlc.md` の @-import スタブ経由で）スペースメモリファイルを、非 AI-DLC も含むどの会話へも読みます。出荷層を簡潔な話題構造に保つと、通常の開発セッションを汚しません。上流仕様がルールに置く詳しい方法論は、代わりに `.claude/knowledge/aidlc-shared/` か SKILL.md と stage-protocol.md に住み、`/aidlc` がアクティブなときだけ読みます。

### The Learning Loop

ルールファイルは静的ではありません — v0.5.0 のラーニングループは、ワークフロー内の訂正を次回の常設ルールへ変えます。労働の分割は意図的です。LLM はステージ実行中に観察をステージの `memory.md` 日記へ書き（Interpretations / Deviations / Tradeoffs / Open questions）、オーケストレータが後で入場比較をします。候補抽出と永続は決定論ツール、選択と衝突処置は人の判断です:

1. **日記（LLM）。** ステージ中、観察はインテントのレコードディレクトリ `<record>/<phase>/<stage>/memory.md`（`<record>/` = `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）に積み上がる。
2. **面出し（ツール）。** 承認ゲートで `aidlc engine learnings surface` が日記を読み、構造化した候補を出す — LLM は再パースも分類もしない。
3. **確め（人）。** コンダクターが候補を描く。残すものを選び、自由文追加では行き先を導く見出しを 1 つ選ぶ。
4. **入場検査（オーケストレータ LLM）。** オーケストレータは残した各学びを `org.md` の一致する節と比べる。矛盾は直す / 飛ばす / エスカレートするよう面に出る。
5. **永続（ツール）。** `aidlc engine learnings persist` は結果の選択を `org.md` を読まずに受け入れ、確めた各学びをプラクティスとして日付付きエントリで `aidlc/spaces/<active-space>/memory/{project,team}.md` へ書き、センサー結びの学びでは、マニフェストとステージ `sensors:` 取り込みを 1 つのロックしたトランザクション内で入れる。`RULE_LEARNED` / `SENSOR_PROPOSED` を出す。

利用者が見る通し（通し例付き）は [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md)。ハーネスエンジニアの執筆角は [Rules and the Learning Loop](../harness-engineering/05-rules-and-the-loop.md)。

---

## CLAUDE.md

### Project-Level Instructions

`.claude/CLAUDE.md` は、どの会話へも読むプロジェクト単位の指示を与えます。AI-DLC ではブートストラップ文書です。

**主な節:**

| Section | Contents |
|---------|----------|
| Prerequisites | 自己完結の `aidlc`。原子的なファイルシステムロック |
| AI-DLC Structure | スキル、エージェント、ルール、ナレッジ、フックの場所 |
| Conventions | 成果物はインテントのレコードディレクトリ `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` へ。アプリケーションコードはワークスペースルートへ |
| Session Resumption | 起動時に `aidlc-state.md` を検査し、再開選択肢を出す |
| Git Integration | コミット方針（後述） |

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

監査証跡は **クローンごとのシャード**（`audit/<host>-<clone>.md`）としてコミットします: 各クローンは自分のシャードへ追記するので、並行追記は git 衝突しません。利用者ごとのセッションカーソルと機械局所の派生状態は無視します。

---

## Settings

### Permissions Configuration

`.claude/settings.json` は Claude Code ツールを事前承認するので、呼び出しごとの権限プロンプト無しでワークフローが走ります:

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

これが無いと、Claude Code は初回利用のたびに「Allow this tool?」と聞き、ワークフローを乱します — 特に、利用者が直接対話していないサブエージェント委譲中。

### Status Line Configuration

```json
"statusLine": {
  "type": "command",
  "command": "aidlc engine statusline"
}
```

ツール利用時だけでなく定期的に走り、ターミナル状態をいまに保ちます。

### SessionStart and SessionEnd Hook Configuration

```json
"hooks": {
  "SessionStart": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "aidlc engine hook session-start"
    }]
  }],
  "SessionEnd": [{
    "matcher": "",
    "hooks": [{
      "type": "command",
      "command": "aidlc engine hook session-end"
    }]
  }]
}
```

`settings.json` に登録（プロジェクト単位） — v0.6.0 hooks-move 以降、どのフレームワークフックもそうです。セッション寿命イベントはどちらにせよプロジェクト単位でなければなりません。`/aidlc` が起動する前と出たあとに発火するからです: `session-start.ts` は再開文脈を注入し、`session-end.ts` は監査完備向けに `SESSION_ENDED` を出します。

### Personal Settings Override

`.claude/settings.local.json`（gitignore）は、リポジトリを変えずに共有設定を上書きします:

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

---

## MCP Servers

### .mcp.json as the Server Registry

この実装は Model Context Protocol（MCP）サーバを、プロジェクトルートの `.mcp.json` で宣言します。`.claude/` の中ではなく隣です。ファイルはサーバ名を輸送と起動設定へ写します:

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

出荷サーバ 5 つが、フレームワークのエージェントが手を伸ばす統合を覆います:

| Server | Transport | Auth | Purpose |
|--------|-----------|------|---------|
| `context7` | HTTP | `${CONTEXT7_API_KEY}` env 通し | ライブラリ / SDK ドキュメント照会 |
| `aws-mcp` | `uvx`（`mcp-proxy-for-aws@latest`、`AWS_REGION=us-east-1`） | 標準 AWS 資格情報チェーン | AWS API アクセス |
| `aws-pricing` | `uvx`（`awslabs.aws-pricing-mcp-server@latest`） | AWS 資格情報チェーン | AWS 価格 |
| `aws-iac` | `uvx`（`awslabs.aws-iac-mcp-server@latest`） | AWS 資格情報チェーン | Infrastructure-as-code 道具 |
| `aws-serverless` | `uvx`（`awslabs.aws-serverless-mcp-server@latest`） | AWS 資格情報チェーン | サーバレス道具 |

レジストリは環境変数プレースホルダだけを運びます — コミットした秘密は無し。資格情報はシェルを通ります: `context7` は環境から `CONTEXT7_API_KEY` を読み、`uvx` 起動の AWS サーバ 4 つは標準 AWS 資格情報チェーンに対して認証します（`uv` / `uvx` は `curl -fsSL https://astral.sh/uv/install.sh | sh` 経由で入れる）。資格情報が無いサーバはセッションに単に使えず、ワークフローを決してブロックしません。

`.mcp.json` がプロジェクトルートに住むのは、Claude Code がプロジェクトスコープの MCP サーバをそのパスで読むからです。この実装はいま Claude Code プラグインではなく `.claude/` ディレクトリコピーとして出荷しますが、プロジェクトルートの `.mcp.json` 配置は正準プラグイン場所でもあるので、レジストリは変更無しでプラグイン移植できます。

### Provisioning and Inheritance

アクセス模型はプロビジョニングのあと継承で、あいだに付与ステップはありません:

1. **一度宣言する。** サーバはプロジェクトルートの `.mcp.json` に載る。
2. **セッションへプロビジョンする。** Claude Code は宣言したサーバを開始し、ツールを `mcp__<server>__<tool>` id としてセッションへ出す。
3. **どこでも継承する。** サブエージェントは既定ですべてのセッション MCP ツールを継承する。どの AI-DLC エージェントも — インラインでも委譲サブエージェント（派遣ステージ 2.1、2.2、2.4、3.5 とその協働者）でも — 宣言したどのサーバにも届く。

エージェントごとの付与ステップは無く、要りません: 継承が既定で、すべてのエージェントへ加算です。新しいエージェントファイルは、frontmatter にサーバを列挙せず、存在するだけで MCP アクセスを得ます。

### Why There Is No Per-Agent Grant

これが荷重する教訓で、再訴訟されないようはっきり書く価値があります。**MCP アクセスは追加でエージェントへ付与できません — 継承され、唯一のレバーは制限です。** Claude Code 2.1.159 に対する経験スパイクが境界を立てました:

- エージェントは frontmatter でサーバを *指名* しても何も得ません。加算の付与フィールドはありません。継承がすでにどのセッション MCP ツールも与えています。
- エージェントがサーバを使うのを *止める* には、本物の Claude Code frontmatter フィールド `tools:` 許可リストを、呼んでよい完全修飾 `mcp__<server>__<tool>` id へ狭めます。埋めた `tools:` 一覧からツールを省くことが拒否です。
- 裸の `mcp__<server>` トークンは **尊重されません** — サーバ単位のワイルドカードはありません。完全修飾 `mcp__<server>__<tool>` id だけが一致します。
- `disallowedTools` は拒否側の本物の、動くフィールドです。この実装は入れ子サブエージェント spawn をブロックするために `disallowedTools: Task` を使います。その拒否は MCP サーバアクセスに影響しません。

スパイクは別の frontmatter 足銃も面に出しました: `allowedTools` は認識される Claude Code サブエージェントフィールドでは **なく**、黙って無視されます。`allowedTools: Read` を宣言するエージェントはまだ MCP ツールに届き、inherit-all と同一に振る舞い、同じエージェントが `tools: Read` だと正しく拒否しました。解決（v0.5.4）: 黙って無視される `allowedTools` フィールドは、出荷エージェントファイル（`.claude/agents/*.md`）すべてから外しました。エージェントはいま意図してセッションツールセット全体 — 組み込みツールも MCP ツールも — を継承し、宣言した唯一の制限は `disallowedTools: Task` です。文書化したオプトインの狭めは本物の `tools:` 許可リストで、完全修飾 `mcp__<server>__<tool>` id も載せていなければ継承した MCP を落とします。だから inherit-all はいま、無視されたフィールドの事故ではなく、意図した文書化模型です: きょうどのエージェントも宣言したどのサーバにも届きます。

### Relationship to settings.json Permissions

2 つの設定ファイルは違う問いに答え、重なりません:

- `.claude/settings.json` の `permissions.allow` は *組み込み Claude Code ツール*（Read、Edit、Write、Bash、Glob、Grep、Task、WebSearch）を事前承認するので、セッションは初回利用で聞きません（上の [Settings](#settings)）。MCP サーバについては何も言いません。
- `.mcp.json` は *どの MCP サーバが存在するか* と起動の仕方を宣言します。プロビジョニングと継承は Claude Code の MCP 層が支配し、`settings.json` ではありません。

セッションに MCP サーバが出るのは `.mcp.json` と使える資格情報の関数であり、どの `settings.json` 許可リストエントリでもありません。エージェントごとの狭めが配線されるときは、エージェントの `tools:` frontmatter に住みます — `settings.json` でも `.mcp.json` でもありません。

---

## Feature Interaction Map

| Feature | File(s) | When It Loads | Role |
|---------|---------|---------------|------|
| CLAUDE.md | `.claude/CLAUDE.md` | どの会話でも | ブートストラップ: 構造、前提、約束 |
| Settings | `.claude/settings.json` | どの会話でも | Claude Code ツールを事前承認 |
| Rules | `aidlc/spaces/<active-space>/memory/*.md`（`.claude/rules/aidlc.md` @-stub 経由） | どの会話でも | 最小のガードレール。自己学習の訂正 |
| Skill | `.claude/skills/aidlc/SKILL.md` | `/aidlc` 呼び出し時 | オーケストレータ: セッション、スコープ、ステージグラフ、委譲 |
| Workflow-spine hooks | `.claude/settings.json` | いつもオン。ワークフローが無ければ自己ゲート | PostToolUse、PreCompact、SubagentStop、Stop |
| Agents (inline) | `.claude/agents/*.md` | ペルソナ起動 | ステージ 33 のうち 29: コンダクターがエージェントペルソナを採用 |
| Agents (dispatched) | `.claude/agents/*.md` | Task ツール委譲 | ステージ 4（2.1 パイプライン、2.2 サブエージェント、2.4 モブ、3.5 サブエージェント）: 隔離実行 |
| Knowledge (Tier 1) | `.claude/knowledge/` | ペルソナ起動（ステップ 2–3） | 方法論参照ファイル 56 |
| Knowledge (Tier 2) | スペース単位 `aidlc/knowledge/`（`intents/` の兄弟） | ペルソナ起動（ステップ 4–5） | チーム管理の寄せ |
| Stage protocol | `stage-protocol.md` + 条件モジュール | 静的コアはどのステージでも。モジュールは引き金で | 必須の振る舞い契約 |
| Stage files | `stages/**/*.md` | エンジンルーティング | 個々のステージ定義 33 |
| State file | `aidlc-state.md` | セッション開始 + 全体 | 残るワークフロー状態 |
| Audit file | `audit.md` | 実行全体 | 追記専用監査証跡 |

### Loading Sequence

利用者が `/aidlc feature` を走るとき:

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

ステップ 1–2a は、非 AI-DLC も含むどの会話でも起きます — どのフックもスキル起動ではなく `settings.json` にプロジェクト単位で登録されているので、決定論的な背骨は `/aidlc` が呼ばれる前に場所にあり、各フックはワークフローが無いとき no-op へ自己ゲートします。ステップ 3 がルール層を読みます。ステップ 4 以降は、利用者が `/aidlc` を呼んだときだけワークフローを立て駆動します。ステップ 5–11 はディレクティブごとに一度繰り返します — 各反復が何をするかを決めるのは SKILL.md ではなくエンジンです。

---

## Cross-References

- [Architecture](01-architecture.md) — すべての機能層を含む 5 層モデル
- [Orchestrator](03-orchestrator.md) — SKILL.md の深掘り
- [Agent System](05-agent-system.md) — エージェント frontmatter、ツール制限、エージェントティア
- [Hooks and Tools](06-hooks-and-tools.md) — フック系、監査分類、CLI ツール
- [Knowledge System](10-knowledge-system.md) — 二層ナレッジ、読み込み順
- [Porting to a New Harness](../harness-engineering/09-porting-to-a-new-harness.md) — 上の対応表へ列を足す仕方: マニフェスト、フックアダプタ、`emit.ts` 契約
- [Running on other harnesses](../guide/harnesses/README.md) — これらのプリミティブの Kiro CLI、Kiro IDE、Codex、Cursor、opencode、Copilot での表し方
