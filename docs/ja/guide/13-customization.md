# カスタマイズ

AI-DLC はチームのやり方に寄せられます。この章では設定の上書き、スコープ、ステージの調整、ステータスライン、ツール権限を扱います。

> **ハーネス固有の設定。** ハーネスを問わず効くカスタマイズは、スコープ、ステージ深度、ナレッジ、ルールです。一方、この章の仕組み側（`settings.json` / `settings.local.json`、ステータスラインコマンド、`$CLAUDE_PROJECT_DIR`、ツール権限ブロック）は **Claude Code 専用** です。Kiro CLI では `.kiro/settings/cli.json` とエージェント設定、Kiro IDE ではエージェント Markdown の `tools:` と `permissions.rules`。Codex は `.codex/config.toml` と Starlark ルール、Cursor は `.cursor/hooks.json` と `.cursor/cli.json`（権限のみ）、opencode はプロジェクトルートの `opencode.json`、Copilot は `.github/hooks/aidlc.json`（フック配線）と `~/.copilot/config.json`（フォルダ信頼）です。各ハーネスの面は次を見てください。
> [Running on Kiro CLI](harnesses/kiro-cli.md)、
> [Running on Kiro IDE](harnesses/kiro-ide.md)、
> [Running on Codex CLI](harnesses/codex-cli.md)、
> [AI-DLC on Cursor](harnesses/cursor.md)、
> [AI-DLC on opencode](harnesses/opencode.md)、
> [AI-DLC on GitHub Copilot](harnesses/copilot.md)。

---

## 設定の上書き（`settings.local.json`）

共有の `.claude/settings.json` はフレームワーク同梱で、バージョン管理に入ります。チームに影響させず、自分の環境だけ変えたいときは個人用の上書きファイルを作ります。

```bash
cp .claude/settings.local.json.example .claude/settings.local.json
```

このファイルは `.gitignore` にあるので、個人の変更はコミットされません。用途は次です。

- モデルの切り替え（別の Opus や Sonnet のモデル ID など）
- ローカル用の環境変数
- セキュリティ要件に合わせたツール権限

---

## エージェントのモデルと effort（ティア）

配布エージェントは `tier:`（`judgment` | `balanced` | `templated`）を持ち、ビルドが各ハーネスのネイティブな model / effort キーへ投影します。judgment はセッションのモデルと effort を継ぎ、balanced と templated は Claude Code・Codex・opencode で中規模モデルを `medium` effort に固定します。いまの投影結果は同じですが、ティアを分けてあるので、どちらかだけ後から変えられます。Kiro、Cursor、Copilot では全ティアがセッションモデルを継ぎます。投影表は [Agent System](../reference/05-agent-system.md) です。

インストール済みのコピーで **1 体だけ** 変えたいときは、投影先を直接編集します。例: Claude なら `.claude/agents/aidlc-*-agent.md` の frontmatter に `model: opus`。Kiro はハーネスで面が違います。Kiro CLI は `.kiro/agents/aidlc-*-agent.json` に `"model"`、Kiro IDE は `.kiro/agents/aidlc-*-agent.md` の frontmatter に `model:`（エージェント JSON は CLI 専用で、IDE は起動時に `.md` の frontmatter を読む）。どちらも、その環境で有効なモデル ID を使ってください。Kiro のエージェントはモデル固定なしで出荷するので、既定ではセッションモデルを継ぎます。編集は `dist/<harness>/` を再コピーするまで残ります。ソースから自分の配布を焼くときに **全エージェント** を抑えたいなら、`core/memory/org.md` / `project.md` の frontmatter に `tier_cap:` を書くか、パッケージャを `AIDLC_TIER_CAP=<tier>` で回します。どちらも `bun scripts/package.ts` のパック時ノブで、実行時の設定ではありません。

---

## プロジェクト既定スコープ

そのプロジェクトのワークフローをいつも同じスコープで始めたいときは、`.claude/settings.json` の `env` に `AWS_AIDLC_DEFAULT_SCOPE` を置きます。同梱ファイルはすでに `classic` で、フレームワークのハードコードされたフォールバックと同じです。ライフサイクル全体を既定にしたいなら `feature` にします。

```json
{
  "env": {
    "AWS_AIDLC_DEFAULT_SCOPE": "feature"
  }
}
```

> 同梱の `env` には Bedrock のモデル ID（`CLAUDE_CODE_USE_BEDROCK`、`ANTHROPIC_DEFAULT_OPUS_MODEL` など）もあります。上の例は分かりやすさのためスコープのキーだけ出しています。

これがあると、裸の `/aidlc` は既定スコープが `feature` になります。環境変数を読むのはワークフロー初期化のときだけです。インテントの `aidlc-state.md`（レコードディレクトリ内）ができたら状態ファイルが正本になり、進行中のワークフローに env の変更は効きません。

**優先順位（高い順）:**

1. 明示の CLI フラグ: `/aidlc feature` や `/aidlc --scope bugfix` が勝つ。
2. 自由文のキーワード判定: `/aidlc fix the login bug` は `bugfix` にマップする。判定結果は、既存の確認プロンプトで上書きできる。
3. `.claude/settings.json` の `AWS_AIDLC_DEFAULT_SCOPE`。
4. ハードコードされたフォールバック: `classic`。フレームワークの唯一の暗黙既定。マッチしない自由文、`/aidlc-init`、`--scope` なしの低レベル `intent-create` が使う。暗黙既定を決めるものはこれ以外にない。

**有効な値:** `enterprise`、`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`classic`、`workshop`、`express`。無効な値は起動時に分かりやすいエラーになります。追加スコープは `.claude/scopes/aidlc-<name>.md` を置き、所属ステージの `scopes:` にタグを付けます。手順は [Contributing: Adding a Scope](../reference/11-contributing.md#adding-a-scope)。エージェントの追加は `.claude/agents/`。[Contributing: Adding an Agent](../reference/11-contributing.md#adding-an-agent)。

**確認:** `/aidlc --doctor` で env がセットされ、値が有効かを見ます。

```
✓  AWS_AIDLC_DEFAULT_SCOPE=classic (valid)
```

**初期化時の通知:** env 既定が使われると、オーケストレータはワークフロー開始時に 1 行出します（`Using scope=<value> from AWS_AIDLC_DEFAULT_SCOPE (.claude/settings.json)`）。効いた瞬間に、スコープの出所が見えます。

なぜスコープだけで、深度やテスト戦略は env に無いのか。各スコープが深度を宣言し、テスト戦略はスコープが上書きしなければその深度に従います。だから `classic` は Standard/Standard、`workshop` は Standard/Minimal、`express` は Minimal/Minimal で始まります。どちらかを変えたいときは CLI で `--depth` か `--test-strategy` を渡してください。

**機微な値:** `.claude/settings.json` はバージョン管理に入ります。秘密情報、認証情報、個人の上書きはここに置かないでください。機微なものは gitignore された `.claude/settings.local.json` です。

---

## スコープの設定

スコープは、どのステージを、どの深度とテスト戦略で走らせるかを決めます。AI-DLC は名前付きスコープを 11 用意しています。表（EXECUTE/全ステージ数、既定深度、テスト戦略、用途）の正本は [スコープ・深度・テスト戦略 § The 11 Core Scopes](05-scopes-and-depth.md#the-11-core-scopes) です。ここは *設定と上書き* です。

### スコープの選び方

明示するか、オーケストレータに判定させます。

```
/aidlc enterprise       # Explicit scope
/aidlc Build a payments API  # No keyword: offers composition; resolver fallback is "classic"
/aidlc Fix the login bug     # Auto-detects "bugfix"
```

### 実行時の上書き

ワークフローの途中でもスコープは変えられます。

- **どの承認ゲートでも**: 別のスコープや深度を求める
- **ユーティリティコマンド**: `/aidlc --scope enterprise` でアクティブなスコープを変える
- **ステージの取り込み**: Ideation と Inception の承認ゲートで、一度飛ばしたステージをワークフローに戻せる

---

## ステージのカスタマイズ

各ステージは `.claude/aidlc-common/stages/[phase]/` の独立した `.md` です。ステージファイルが書くのは次です。

- **Metadata** — ステージ番号、フェーズ、実行モード、リード / サポートエージェント
- **Inputs** — 読む先行成果物
- **Steps** — 番号付きの実行手順
- **Outputs** — 出す成果物
- **Completion** — 承認ゲートの形

振る舞いを変えたいときはステージファイルを直接編集します。承認ゲート、質問の形、状態追跡など共通の型は、全ステージがステージプロトコルを参照します。

### 深度

各スコープに既定の深度があり、成果物の詳しさを決めます。

| 深度 | 内容 |
|------|------|
| **Minimal** | 短い成果物。狙いを絞った分析。任意の内容は書かない |
| **Standard** | バランス。主と副の関心を覆う |
| **Comprehensive** | 全部。厚い分析。任意の内容も含める |

どの承認ゲートでも、別のレベルを求めて上書きできます。

---

## ステータスライン（Claude Code のみ）

**Claude Code** では、ターミナルのステータスバーにワークフロー進捗が出ます。ほかのハーネスにステータスラインはありません。位置は `/aidlc --status`（Kiro、Cursor、opencode）と、`update_plan` のタスク進捗 + `$aidlc --status`（Codex）で見ます。

```
[AIDLC] IDEATION [▓▓▓▓▓░░░░░] 4/7 > Intent Capture -- Product Agent
```

順に、いまのフェーズ、フェーズ内進捗（バーと比率。どちらも今のフェーズ範囲）、ステージの表示名、リードエージェントです。右にコンテキスト使用量（例: `ctx:15%`）。残りが減ると色が変わります。Claude の usage ledger にデータがあれば、続けて `↑<in> ↓<out> $<usd>` が出ます。対象はアクティブなワークフローと今のトランスクリプト / セッションだけで、以前のワークフローやセッションは入りません。`AIDLC_DISABLE_USAGE_TRACKING=1` で使用量追跡を止め、この区間も消えます。

### 設定

ステータスラインは `.claude/settings.json` です。

```json
"statusLine": {
  "type": "command",
  "command": "bun \"$CLAUDE_PROJECT_DIR/.claude/hooks/aidlc-statusline.ts\""
}
```

### 表示のカスタマイズ

`.claude/hooks/aidlc-statusline.ts` を直接編集します。出力形式はファイル末尾近くの `main()` です。フックは `aidlc-state.md` からフェーズ、ステージ、エージェントを読み、ステージスラッグを表示名にマップし、同じフェーズ内チェックボックス解析から unicode の進捗バーと `n/m` 比率の両方を作ります。

### ステータスラインを消す

`settings.json` から `statusLine` ブロックを削除します。ターミナルのステータスバーは Claude Code の既定に戻ります。

---

## ツール権限

`.claude/settings.json` の `permissions.allow` は、Claude Code のツールを事前承認するので、呼び出しごとの許可プロンプトなしでワークフローが走ります。

```json
"permissions": {
  "allow": [
    "Read", "Edit", "Write",
    "Bash(bun \"$CLAUDE_PROJECT_DIR/.claude/tools/\"*)",
    "Bash", "Glob", "Grep", "Task", "WebSearch"
  ]
}
```

スコープ付きの `Bash(bun "$CLAUDE_PROJECT_DIR/.claude/tools/"*)` を裸の `Bash` より前に置いてあるので、フレームワーク自身のツール呼び出しは先に狭いルールに当たります。`$CLAUDE_PROJECT_DIR` は二重引用（`*` は引用の外）のままです。プロジェクトパスに空白があっても単語分割するシェルを越え、権限マッチャはグロブできます。

### 権限の動き

- **プロジェクト全体の天井**: `settings.json` の許可リストが使えるツールの上限
- **Claude Code のエージェントは既定でセッションのツール一式を継ぐ**。このハーネスでは `disallowedTools: Task` が入れ子のサブエージェント起動を止める
- **任意のエージェント単位の絞り込み**: frontmatter に `tools:` 許可リストを足すと狭まる。省略すれば全部を継ぐ。`tools:` を書くと継承していた MCP ツールは落ちる。残すなら完全修飾の `mcp__<server>__<tool>` も列挙する

### 権限を広げる

許可リストにツールを足すのは、追加能力が要るカスタムステージを書いたときだけにしてください。

### 権限を狭める

許可リストから外すと、使うたびに人手の承認が要ります。`Task` を外すと、委譲する 4 ステージ（2.1 Reverse Engineering パイプライン、2.2 Practices Discovery サブエージェント、2.4 User Stories モブ、3.5 Code Generation サブエージェント）が、委譲のたびに許可を聞きます。ワークスペース検出（0.2）は `aidlc-utility intent-create` の中で決定論的に走るので、`Task` は使いません。

---

## AI-DLC を広げる

ここまでの設定・スコープ・深度・ステージ編集は、回しているワークフローの日常チューニングです。フレームワークそのものをチーム向けに作り変えたい（ステージやエージェントを足す、スコープを定義する、立ちルールを教える、決定論的検査を配線する、ドメインナレッジを足す）のは別の仕事で、案内も別です。**[Harness Engineer Guide](../harness-engineering/00-overview.md)**。

境目はデータかコードかです。あのガイドにあるのは YAML frontmatter 付き Markdown か、フレームワークが読む JSON 設定だけで、TypeScript は触りません。拡張ごとの入り口:

| やりたいこと | 最初に見る場所 |
|--------------|----------------|
| ステージの中身を変える、またはステージを足す | [Anatomy of a Stage](../harness-engineering/01-anatomy-of-a-stage.md)、[Adding a Stage](../harness-engineering/02-adding-a-stage.md) |
| エージェントを足す、または直す | [Adding an Agent](../harness-engineering/03-adding-an-agent.md) |
| スコープを定義する、または調整する | [Scopes](../harness-engineering/04-scopes.md) |
| 立ちルールを教える、またはラーニングループを回す | [Rules and the Learning Loop](../harness-engineering/05-rules-and-the-loop.md) |
| 決定論的検査（センサー）をステージに配線する | [Sensors](../harness-engineering/06-sensors.md) |
| チームのドメインナレッジを足す | [Team Knowledge](../harness-engineering/07-team-knowledge.md) |

フレームワークの *コード*（オーケストレータ、フック、CLI ツール、コンパイルパイプライン）を触るなら [Developer Reference](../reference/00-overview.md) です。

---

## ナレッジとルール

二層のナレッジと、ルール / ラーニングループの詳細は次です。

- [ナレッジ](08-knowledge.md) — チームナレッジディレクトリと方法論の参照ファイル
- [ルールとラーニングループ](09-rules-and-the-learning-loop.md) — 振る舞いルールと自己学習の流れ

---

## 次の章

- [スコープ・深度・テスト戦略](05-scopes-and-depth.md) — スコープからステージへの対応
- [エージェント](06-agents.md) — エージェントの権限と能力
- [トラブルシュート](15-troubleshooting.md) — ステータスライン、フック設定
- [用語集](glossary.md) — スコープ、深度、ガードレール、ナレッジ
