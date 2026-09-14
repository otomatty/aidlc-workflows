# 導入

この章は、インストールから、最初のワークフローが通るところまでです。ネイティブインストーラは対応ハーネスのランタイムを全部入れ、Bun も Node.js も不要です。

## Quick Start

### 1. AI-DLC を入れる

macOS、Linux、WSL:

```bash
curl -fsSL https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.ps1 | iex
```

インストーラはネイティブの `aidlc` コマンドと、全ハーネスのランタイムを入れます。新しいシェルで `aidlc` が見つからないときは、インストーラが出した PATH の指示に従ってください。

プロジェクトファイルを手で置きたい場合は、同じ版のネイティブ `aidlc` を入れ、[リリース](https://github.com/awslabs/aidlc-workflows/releases/latest) から `aidlc-runtime-X.Y.Z.tar.gz` を取り、`runtime/<harness>/` をプロジェクトへコピーします。

### 2. プロジェクトを設定する

プロジェクトのルートから:

```bash
cd /path/to/your-project
aidlc config --harness claude
aidlc doctor
```

`claude` は、使うハーネスに置き換えます:

| ハーネス | config の値 | 開く | 起動 |
| --- | --- | --- | --- |
| Claude Code | `claude` | `claude` | `/aidlc` |
| Kiro CLI | `kiro` | `kiro-cli chat` | `/aidlc` |
| Kiro IDE | `kiro-ide` | プロジェクトを開く | `/aidlc` |
| Codex CLI | `codex` | `codex` | `$aidlc` |
| Cursor | `cursor` | Cursor を開くか `agent` | `/aidlc` |
| opencode | `opencode` | `opencode` | `/aidlc` |
| GitHub Copilot CLI >= 1.0.74 / VS Code >= 1.130 | `copilot` | Copilot CLI または VS Code | `/aidlc` |

引数なしの `aidlc config` は、端末が使えるとき対話セットアップを始めます。書く前に、入っているハーネス、プロバイダの状態、ランタイムの要否、信頼の操作を調べます。

### 3. 最初のワークフローを始める

設定したハーネスをプロジェクトで開き、仕事を書きます:

```text
/aidlc Build a REST API for inventory management
```

Codex CLI では:

```text
$aidlc Build a REST API for inventory management
```

AI-DLC は依頼からワークフロープロファイルを選びます。自分で選ぶこともできます:

```text
/aidlc express
/aidlc feature Add customer notifications
/aidlc bugfix Fix the login timeout
```

選べるワークフローは [ワークフロープロファイル](workflow-profiles.md)、注釈付きの通しは [最初のワークフロー](02-your-first-workflow.md) です。

## ハーネスの前提

ホストハーネスは、開く前に入れて認証します。ネイティブの AI-DLC ランタイム自体に Git、Bun、Node.js は不要ですが、ホスト側の要件はそのままです。

| ハーネス | 初回に大事なこと | 章 |
| --- | --- | --- |
| Claude Code | 対応プロバイダを設定する。出荷の既定は Amazon Bedrock | [下の Claude 設定](#aws-bedrock-setup) |
| Kiro CLI >= 2.6 | `kiro-cli login` でサインイン | [Kiro CLI](harnesses/kiro-cli.md) |
| Kiro IDE | サインインし、設定したプロジェクトを開く | [Kiro IDE](harnesses/kiro-ide.md) |
| Codex CLI >= 0.145.0 | Git リポジトリを使い、プロジェクトフックの信頼を承認する | [Codex CLI](harnesses/codex-cli.md) |
| Cursor | IDE か CLI にサインイン | [Cursor](harnesses/cursor.md) |
| opencode >= 1.17 | セッションプロバイダをグローバルに設定する | [opencode](harnesses/opencode.md) |
| GitHub Copilot | プロジェクトフォルダを信頼する。GitHub サインインか BYOK | [GitHub Copilot](harnesses/copilot.md) |

## AWS Bedrock の設定

Claude Code 配布は Amazon Bedrock 向けに出荷されています。Codex も Bedrock プロバイダが既定です。ほかのハーネスは、それぞれ独自のプロバイダ設定です。

### Bedrock が既定である理由

AI-DLC は、コンダクターとティアでピンしたサブエージェントのあいだで、実行時の基準を揃える必要があります。Bedrock ならグローバル推論プロファイルとコンテキスト版をそのまま固定でき、マシンごとに別名のモデルが静かに選ばれるのを防げます。標準の AWS SDK 認証チェーンと IAM でアクセスを管理できるので、プロバイダのキーをプロジェクトに置かなくて済みます。

これは配布の既定であり、方法論の要件ではありません。AI-DLC が Bedrock API を直接呼ぶことはなく、プロバイダに依存しません。

### Bedrock を設定する

Claude Code の初回の前に:

1. Amazon Bedrock のモデルカタログで、設定した Anthropic モデルへのアクセスを有効にする。
2. いつもの SDK 認証チェーンで AWS クレデンシャルを渡す。例: `aws configure`、または `aws sso login --profile <profile>`。
3. そのモデルがあるリージョンを使う。出荷の既定は `us-east-1`。
4. `claude` を起動し、プロバイダの画面で Amazon Bedrock を選ぶ。あとから `/setup-bedrock` でアカウントやリージョンを変えられます。

出荷の Claude 設定は、次のエイリアスを割り当てます:

| 設定 | 既定 |
| --- | --- |
| `CLAUDE_CODE_USE_BEDROCK` | `1` |
| `AWS_REGION` | `us-east-1` |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | `global.anthropic.claude-fable-5[1m]` |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `global.anthropic.claude-opus-4-8[1m]` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `global.anthropic.claude-sonnet-4-6[1m]` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `global.anthropic.claude-haiku-4-5-20251001-v1:0` |

クレデンシャルと個人の上書きは、共有の `.claude/settings.json` に置かないでください。`.claude/settings.local.json` か、いつもの AWS 認証ファイルへ。

Claude Code が対応する別プロバイダを使うときは、`.claude/settings.json` と、より優先される `.claude/settings.local.json` から Bedrock の環境マッピングを削除するか置き換え、そのプロバイダの Claude Code 認証を完了します。[Claude Code authentication guide](https://code.claude.com/docs/en/authentication) を見てください。

IAM、モデルアクセス、SSO、リージョンの切り分けは [Claude Code on Amazon Bedrock](https://community.aws/content/2tXkZKrZzlrlu0KfH8gST5Dkppq/claude-code-on-amazon-bedrock-quick-setup-guide) と [Amazon Bedrock documentation](https://docs.aws.amazon.com/bedrock/) です。

## MCP サーバー（任意）

Claude プロジェクトは、config のときに出荷の MCP 既定を入れられます:

```bash
aidlc config --harness claude --mcp defaults
```

入れないときは `--mcp none`。既定の集合は次です:

| サーバ | 提供 | 認証 |
| --- | --- | --- |
| `context7` | ライブラリ / SDK のドキュメント | `CONTEXT7_API_KEY` |
| `aws-mcp` | AWS API アクセス | AWS 認証チェーン |
| `aws-pricing` | AWS 料金の照会 | AWS 認証チェーン |
| `aws-iac` | Infrastructure-as-code ツール | AWS 認証チェーン |
| `aws-serverless` | サーバレス開発ツール | AWS 認証チェーン |

AWS の 4 サーバは `uvx` が要り、標準の AWS 認証チェーンを使います。

Claude セッションのエージェントは、使える MCP サーバを全部継ぎます。認証が無いサーバは使えないだけで、ワークフローは止まりません。秘密をコミットする `.mcp.json` に書かないでください。

## 設定と信頼

`aidlc config` はローカルだけで、トランザクションです。選んだハーネスのランタイムを書き、`aidlc/` ワークスペースを作り、管理対象のプロジェクト統合をマージし、あとから更新するための所有の基準を残します。

変更の下見:

```bash
aidlc config --dry-run
```

config のあと、出力が指名した操作を済ませます:

| ハーネス | よくある操作 |
| --- | --- |
| Claude Code | `/hooks` でプロジェクトフックを承認し、Claude Code を再起動する |
| Kiro CLI | `kiro-cli chat` を始める。プロジェクトが AI-DLC エージェントを選ぶ |
| Kiro IDE | 設定したプロジェクトを開く |
| Codex CLI | フック信頼のプロンプトを承認するか、生成された信頼シードを適用する |
| Cursor | 設定したプロジェクトを開くか `agent` を走らせる |
| opencode | プロジェクトで `opencode` を始める |
| GitHub Copilot | プロジェクトフォルダを信頼する |

操作のあと `aidlc doctor` を走らせます。ランタイム、プロジェクト、プロバイダ、フック、信頼、ワークフロー状態の問題を、直し方のコマンド付きで出します。

## 更新

`aidlc update` はマシンのランタイムを更新します。設定済みプロジェクトは書き換えません。ワークフローのあいだに、プロジェクトごとに更新します:

```bash
aidlc update
cd /path/to/your-project
aidlc doctor
aidlc config
```

config はプロジェクト所有の中身を残し、ワークフローが生きているあいだの更新は拒みます。プラグインを使っているプロジェクトは、エンジン更新のあと `/aidlc plugin sync` してください。

版の選択、プロジェクトのピン、オフライン導入、ミラー、独自 CA、リリース認証、自動化、アンインストールは [Install and Lifecycle](18-install-and-lifecycle.md) です。

## config が作るもの

設定したプロジェクトには、ハーネス統合と `aidlc/` ワークスペースが入ります。最初のワークフローは、次の下にインテントのレコードを作ります:

```text
aidlc/spaces/<space>/intents/<YYMMDD>-<label>/
```

そこにはワークフロー状態、監査シャード、質問、判断、ステージ成果物が入ります。チームナレッジと学んだルールはスペース単位なので、あとのインテントが再利用できます。

置き場所は [スペースとインテント](03-spaces-and-intents.md)、残る証拠は [状態と監査](10-state-and-audit.md) です。

## トラブルシュート

まず:

```bash
aidlc doctor
```

フック、プロバイダアクセス、承認ゲート、古い状態、診断は [トラブルシュート](15-troubleshooting.md) です。ハーネス固有の導入の不具合は、対応する [ハーネスの章](harnesses/README.md) です。

## 次に読むもの

- [ワークフロープロファイル](workflow-profiles.md) — 合うワークフローを選ぶ
- [最初のワークフロー](02-your-first-workflow.md) — 一通りの実行を追う
- [スペースとインテント](03-spaces-and-intents.md) — プロジェクトの状態を知る
- [やり取りのモード](07-interaction-modes.md) — 質問とゲートの扱い
- [Install and Lifecycle](18-install-and-lifecycle.md) — ネイティブランタイムの管理
