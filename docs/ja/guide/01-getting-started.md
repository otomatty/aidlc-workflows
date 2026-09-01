# 導入

この章は、この実装の入れ方、環境の確認、最初のワークフローに入るところまでです。

> **注**: ここでの手順は **Claude Code** です。AI-DLC は Kiro CLI、Kiro IDE、Codex CLI、opencode でも動きます。方法論はどのハーネスでも同じですが、前提、設定、一部の見た目（ウェルカムバナー、ステータスライン）は違います。各ハーネスのコピーコマンドは下の [インストール](#installation) の手順 1 にあります。それ以外の差分は [他ハーネスで動かす](harnesses/README.md) の各章です。

---

## 前提条件

この実装が必要とするツールは次の 2 つです。

| 前提 | 用途 | インストール |
|-------------|---------|---------|
| **Claude Code** | この実装は Claude Code のコマンドとして動きます。オーケストレータ、エージェント、フックはすべて Claude Code の中で走ります。 | ネイティブインストール（推奨、自動更新）: macOS/Linux/WSL は `curl -fsSL https://claude.ai/install.sh \| bash`。Windows PowerShell は `irm https://claude.ai/install.ps1 \| iex`。または `brew install --cask claude-code`。（[ドキュメント](https://code.claude.com/docs/en/quickstart)） |
| **bun** | すべての CLI ツールと 17 本のフックに必要です（状態管理、監査ログ、センサー配送、ランタイムグラフのコンパイル、ループ強制、ディスパッチルールの正確な配送、状態遷移、レビュアー範囲、レビュー凍結、計画承認の強制、ステータスライン、人のターン発行、トークン使用量の畳み込み）。中身はすべて TypeScript で、bun から実行します（起動は約 20ms）。追加依存は無く、macOS、Linux、Windows ネイティブの PowerShell で同じように動きます。 | `curl -fsSL https://bun.sh/install \| bash`（[ドキュメント](https://bun.sh)）。Windows は `npm install -g bun`、または `powershell -c "irm bun.sh/install.ps1 \| iex"` |

> **重要**: 非対話シェルの `PATH` に `bun` が無いといけません。Claude Code はシェルを非対話で起動するので、読むのは `~/.zshenv`（zsh）か `~/.bashrc`（bash）であり、`~/.zshrc` ではありません。Windows の Git Bash では `~/.bashrc` が正しいファイルです。Claude Code の中で `which bun` が失敗するなら、該当ファイルに bun の PATH を書いてください。

前提の確認:

```bash
command -v claude >/dev/null && echo "✓ Claude Code installed" || echo "✗ Install Claude Code first"
command -v bun    >/dev/null && echo "✓ bun installed"          || echo "✗ Install bun first"
```

<a id="aws-bedrock-setup"></a>

## AWS Bedrock の設定

Claude Code 配布は **AWS Bedrock** 向けに出荷されています。同梱の `.claude/settings.json` が次を設定します。

### Claude Code 配布が Bedrock を既定にする理由

この理由は Claude Code 配布に固有です。プロバイダの用意はハーネスごとに違います。[Codex も Bedrock が既定](harnesses/codex-cli.md#prerequisites) です。[opencode のセッションモデルはグローバル設定から取りますが、ティア付きペルソナは Bedrock モデルにピンします](harnesses/opencode.md#prerequisites)。

Claude Code 配布は、オーケストレータと、ティアでピンしたサブエージェントのあいだで、実行時の基準を揃える必要があります。Bedrock ならグローバル推論プロファイル ID をそのまま固定できます。Claude Code は `[1m]` のようなコンテキスト指定を別に解釈し、Bedrock にモデル ID を渡す前に取り除きます。このピンの組み合わせで、マシンごとに別名のモデルや別のコンテキスト窓が静かに選ばれるのを防ぎます。Bedrock は標準の AWS SDK 認証チェーンと IAM でアクセスを管理できるので、プロバイダのキーをプロジェクトに置かなくて済みます。このリポジトリの Claude 向けの実テスト環境も、同じプロバイダとモデル／コンテキスト基準を使っています。

これは配布の既定であり、AI-DLC 方法論の要件ではありません。AI-DLC が Bedrock API を直接呼ぶことはありません。Anthropic API 直結や、Claude Code が対応する別プロバイダを使う場合:

1. 入れた `.claude/settings.json` から、次を削除するか置き換えます。
   `env.CLAUDE_CODE_USE_BEDROCK`、`env.AWS_REGION`、
   `env.ANTHROPIC_DEFAULT_FABLE_MODEL`、
   `env.ANTHROPIC_DEFAULT_OPUS_MODEL`、
   `env.ANTHROPIC_DEFAULT_SONNET_MODEL`、
   `env.ANTHROPIC_DEFAULT_HAIKU_MODEL`、およびトップレベルの `model`。
2. `.claude/settings.local.json` も確認し、対応する上書きがあれば削除か置き換えます。ローカル設定は共有の `.claude/settings.json` より優先されます。
3. `claude` を起動し、ログイン画面で対象プロバイダを選びます。すでに Claude Code に入っているなら、先に `/login` を実行します。プロバイダ側の認証は [Claude Code authentication guide](https://code.claude.com/docs/en/authentication) のとおりに完了します。

AI-DLC のステージプロトコルはプロバイダに依存しません。ただしこのリポジトリが出荷し、テストしているのは、下に書く Bedrock のモデル／コンテキスト基準です。別モデルを使う場合も、オーケストレータと委譲先エージェントに足りるコンテキストは必要です。

| 変数 | 値 | 用途 |
|----------|-------|---------|
| `CLAUDE_CODE_USE_BEDROCK` | `1` | Claude Code を Bedrock 経由にする |
| `AWS_REGION` | `us-east-1` | Bedrock のリージョン — **必須**。Claude Code は `~/.aws` からは読みません。リージョンごとに上書きします（後述）。 |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | `global.anthropic.claude-fable-5[1m]` | `fable` / `fable[1m]` を選んだ人向けの Fable エイリアス |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `global.anthropic.claude-opus-4-8[1m]` | オーケストレータのモデル（`opus[1m]`、1M コンテキスト版） |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `global.anthropic.claude-sonnet-4-6[1m]` | サブエージェントのモデル |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `global.anthropic.claude-haiku-4-5-20251001-v1:0` | バックグラウンド／速い作業（`[1m]` は付けない。Haiku 4.5 は 200K モデルで、1M 版が無い） |

これらのモデルピンは、グローバルな Bedrock 推論プロファイル ID（`global.` 接頭辞）です。Fable、Opus、Sonnet の `[1m]` 接尾辞は 1M コンテキスト版を選びます。ティアでピンしたサブエージェントも、`opus[1m]` のオーケストレータだけに限らず 1M 窓を得ます。Claude Code は、モデル ID が Bedrock に届く前にこの接尾辞を取り除きます。AWS アカウント側の準備は、一度だけ必要です。

### 一度きりの AWS アカウント準備（手作業）

1. **Anthropic モデルへのアクセスを有効にする。** [Amazon Bedrock console](https://console.aws.amazon.com/bedrock/) で **Model catalog** を開き、使う Anthropic モデル（Fable、Opus、Sonnet、Haiku）をそれぞれ選び、利用目的のフォームを出します。アクセスはすぐ付きます。どのモデルも呼ぶ前に、AWS アカウントにつき一度必要です。（AWS Organizations なら管理アカウントから一度出せば、子アカウントにも承認が届きます。）

2. **IAM 権限を付ける。** ロール／ユーザーがモデルを呼び、推論プロファイルを解決できるようにします。

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "AllowModelAndInferenceProfileAccess",
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel",
           "bedrock:InvokeModelWithResponseStream",
           "bedrock:ListInferenceProfiles",
           "bedrock:GetInferenceProfile"
         ],
         "Resource": [
           "arn:aws:bedrock:*:*:inference-profile/*",
           "arn:aws:bedrock:*:*:application-inference-profile/*",
           "arn:aws:bedrock:*:*:foundation-model/*"
         ]
       }
     ]
   }
   ```

3. **AWS の認証情報を渡す。** Claude Code は AWS SDK の既定の認証チェーンを使います。次のどれか一つで足ります。

   ```bash
   aws configure                         # static access key / secret
   # — or — an SSO profile:
   aws sso login --profile <your-profile>
   export AWS_PROFILE=<your-profile>
   # — or — credentials already exported in your environment (AWS_ACCESS_KEY_ID, etc.)
   ```

   秘密は共有の `settings.json` に置かないでください。`AWS_PROFILE`（や、漏らしたくない他の環境変数）は `.claude/settings.local.json`（gitignore 済み）へ。

4. **リージョンが `us-east-1` でなければ設定する。** 出荷時の既定は `us-east-1` です。共有設定を触らずに上書きします。

   ```bash
   cp .claude/settings.local.json.example .claude/settings.local.json
   # then add  "AWS_REGION": "<your-region>"  to the env block
   ```

   `settings.local.json` は `settings.json` より優先されます。そのリージョンでモデルが使えるかは `aws bedrock list-inference-profiles --region <your-region>` で確認します。

> **簡単なやり方:** 上の手作業の代わりに `claude` を起動し、ログイン画面で **3rd-party platform → Amazon Bedrock** を選びます。ウィザードが認証情報、リージョン、使えるモデルを検出して、ユーザー設定に書き込みます。変えたいときは `/setup-bedrock` を再実行します。コンソールでの手順 1（モデルアクセス）は、どちらにせよ一度必要です。

常に新しい正本の手順 — IAM の詳細、SSO の再取得、推論プロファイル、トラブルシュート — は AWS のガイド **[Claude Code on Amazon Bedrock: Quick Setup Guide](https://community.aws/content/2tXkZKrZzlrlu0KfH8gST5Dkppq/claude-code-on-amazon-bedrock-quick-setup-guide)** と [Amazon Bedrock documentation](https://docs.aws.amazon.com/bedrock/) です。

<a id="mcp-servers-optional"></a>

## MCP サーバー（任意）

この実装は MCP サーバーを、プロジェクトルートの `.mcp.json`（`.claude/` の隣）で宣言します。Claude Code がそれらをセッションに載せ、AI-DLC のエージェントはすべてそれを継ぎます。どのエージェントも、宣言したサーバーにエージェント単位の許可なしで届きます。出荷の `.mcp.json` が宣言している MCP サーバーは 5 つです。

| サーバー | 提供するもの | トランスポート | 認証 |
|--------|----------|-----------|-------------|
| `context7` | ライブラリ／SDK のドキュメント参照 | HTTP | 環境の `CONTEXT7_API_KEY` |
| `aws-mcp` | AWS API アクセス | `uvx`（`mcp-proxy-for-aws@latest`、`AWS_REGION=us-east-1`） | 標準の AWS 認証チェーン |
| `aws-pricing` | AWS 料金の照会 | `uvx`（`awslabs.aws-pricing-mcp-server@latest`） | AWS 認証チェーン |
| `aws-iac` | Infrastructure-as-code の道具 | `uvx`（`awslabs.aws-iac-mcp-server@latest`） | AWS 認証チェーン |
| `aws-serverless` | サーバーレスの道具 | `uvx`（`awslabs.aws-serverless-mcp-server@latest`） | AWS 認証チェーン |

### 前提条件

AWS 側の 4 サーバーは `uvx` 経由で起動します。`uv` / `uvx` は一度入れます。

```bash
curl -fsSL https://astral.sh/uv/install.sh | sh
```

`context7` は HTTP サーバーなので、ローカルへのインストールは不要です。使うときは API キーを export します。

```bash
export CONTEXT7_API_KEY=<your-key>
```

`CONTEXT7_API_KEY`（や他の秘密の環境変数）は、共有の `settings.json` ではなく `.claude/settings.local.json`（gitignore 済み）へ置きます。`.mcp.json` 本体が持つのは環境変数のプレースホルダだけで、秘密はコミットされません。

### 何が使えるようになるか

AWS 側の 4 サーバーは、Claude Code が Bedrock ですでに使っているのと同じ、AWS SDK の既定の認証チェーンで認証します（[AWS Bedrock の設定](#aws-bedrock-setup)）。`uvx` が入っていて AWS の認証が解決すれば、それらのサーバーは自動で起きます。`context7` は `CONTEXT7_API_KEY` を置いた時点で起きます。サーバーはセッション単位で継がれるので、どのエージェントも宣言したサーバー全部に届きます。エージェント単位の許可作業はありません。

> **エージェントを制限する（応用）:** 継承は足す方向です。サーバーを宣言すると全エージェントが使え、サーバーをエージェント単位で許可することはできません。特定のエージェントにサーバーを*使わせない*には、そのエージェントの `tools:` 許可リストを、呼んでよい完全修飾の `mcp__<server>__<tool>` ID までに絞ります（裸の `mcp__<server>` トークンは効きません）。エージェントのツールアクセスは [エージェント](06-agents.md) です。

### 使わない場合

認証が無くてもブロックはしません。AWS チェーンも `CONTEXT7_API_KEY` も無いサーバーは、単に使えません。ワークフローはそれ無しで走り、待ちで止まることはありません。サーバー自体を外すなら、`.mcp.json` からそのエントリを削除します。

---

<a id="installation"></a>

## インストール

AI-DLC の入れ方は、使うハーネスの配布をプロジェクトへコピーすることです。
下の手順 1 に各ハーネスのコピーコマンドがあります。この章の残りは **Claude Code**（`dist/claude/` の木。出荷形は `.claude/` ディレクトリ）で進めます。別ハーネスなら、コピーのあとそちらの章で導入を終えてください。[Kiro CLI で動かす](harnesses/kiro-cli.md)、
[Kiro IDE で動かす](harnesses/kiro-ide.md)、
[Codex CLI で動かす](harnesses/codex-cli.md)、
[Cursor で動かす](harnesses/cursor.md)、
[opencode で動かす](harnesses/opencode.md)、
[GitHub Copilot で動かす](harnesses/copilot.md)。それぞれ、前提とコピー後に違う手順を書いてあります。

下の `cp` は、このリポジトリを `main` ブランチで clone した場所から実行します。

```bash
git clone --branch main https://github.com/awslabs/aidlc-workflows.git
cd aidlc-workflows
```

### 手順 1: 実装をコピーする

使っているハーネスを開きます。

<details open markdown="1">
<summary><strong>Claude Code</strong></summary>

```bash
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/aidlc/   your-project/aidlc/     # the workspace shell — a sibling of .claude/, not inside it
# Existing .gitignore: preserve it and merge only the section beginning "# AI-DLC".
if [ ! -e your-project/.gitignore ]; then
  cp dist/claude/.gitignore your-project/.gitignore
fi
```

1 行目はエンジンです。オーケストレータ、ステージファイル、エージェントのペルソナ、フック、ナレッジ、既定の設定をコピーします。2 行目は **ワークスペースシェル** です。エンジンが読む、あらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリーです。これは `.claude/` の **兄弟**（中ではない）として出荷されるので、別途コピーします。あるいは `dist/claude/` 一式をまとめてコピーしても構いません。`aidlc/spaces/default/memory/` が無いと、`/aidlc --doctor` の "workspace shell ready" 検査が落ちます。

ガード付きのブロックは、プロジェクトに `.gitignore` がまだ無いときだけ、スターター一式をコピーします。既にある場合は、プロジェクト側の規則はすべて残し、出荷ファイルの `# AI-DLC` から末尾までだけをマージします。汎用のスターター規則はコピーしないでください。AI-DLC 節が無いと、最初のコミットにユーザーごとのカーソル（`aidlc/active-space`、`aidlc/spaces/*/intents/active-intent`）と、マシンローカルのランタイム（`aidlc/.aidlc-clone-id`、`runtime-graph.json`、センサーキャッシュ、`spaces/*/knowledge/.sources.local.json`）が乗ってしまいます。入れた `.claude/CLAUDE.md` の `## Git Integration` は、これらを既に除外すると書いてあります。

プロジェクトルートから Claude Code を起動（または完全再起動）し、求められたとき、または `/hooks` から、プロジェクトフックを承認します。承認を効かせるには Claude Code をもう一度完全再起動します。`/clear` では足りません。管理フリートで `/hooks` がポリシーによりフック制限と出す場合は、[Claude の管理ポリシーがプロジェクトフックを止める](15-troubleshooting.md#claude-managed-policy-blocks-project-hooks) に従ってください。

</details>

<details markdown="1">
<summary><strong>Kiro CLI</strong></summary>

```bash
mkdir -p your-project/.kiro your-project/aidlc
cp -R dist/kiro/.kiro/. your-project/.kiro/
cp -R dist/kiro/aidlc/. your-project/aidlc/    # the workspace shell (spaces/default/memory) — a sibling of .kiro/, not inside it
cp dist/kiro/AGENTS.md your-project/AGENTS.md  # merge if you already have one
# Existing .gitignore: preserve it and merge only the section beginning "# AI-DLC".
if [ ! -e your-project/.gitignore ]; then
  cp dist/kiro/.gitignore your-project/.gitignore
fi
```

ガード付きのブロックは、プロジェクトに `.gitignore` がまだ無いときだけ、スターター一式をコピーします。既にある場合は、プロジェクト側の規則はすべて残し、出荷ファイルの `# AI-DLC` から末尾までだけをマージします。汎用のスターター規則はコピーしないでください。

続きは [Kiro CLI で AI-DLC を動かす](harnesses/kiro-cli.md) です。前提（Kiro CLI ≥ 2.6、Opus 4.8 用の有料プラン）と、出荷の default-agent 設定。

</details>

<details markdown="1">
<summary><strong>Kiro IDE</strong></summary>

```bash
mkdir -p your-project/.kiro your-project/aidlc
cp -R dist/kiro-ide/.kiro/. your-project/.kiro/
cp -R dist/kiro-ide/aidlc/. your-project/aidlc/     # the workspace shell (spaces/default/memory) — a sibling of .kiro/, not inside it
cp dist/kiro-ide/AGENTS.md your-project/AGENTS.md   # merge if you already have one
```

続きは [Kiro IDE で AI-DLC を動かす](harnesses/kiro-ide.md) です。前提（チャットモデルに Opus 4.8）、v2 のフックファイル、非対話シェルでの bun の PATH の注意。

</details>

<details markdown="1">
<summary><strong>Codex CLI</strong></summary>

```bash
cp -r dist/codex/.codex/  your-project/.codex/
cp -r dist/codex/.agents/ your-project/.agents/
cp -r dist/codex/aidlc/   your-project/aidlc/      # the workspace shell (spaces/default/memory) — a sibling of .codex/, not inside it
cp dist/codex/AGENTS.md   your-project/AGENTS.md   # or merge into yours
```

続きは [Codex CLI で AI-DLC を動かす](harnesses/codex-cli.md) です。プロジェクトは **git リポジトリ** である必要があり、その章の `.gitignore` エントリとフック信頼の事前シードを入れて、導入は完了します。

</details>

<details markdown="1">
<summary><strong>Cursor</strong></summary>

```bash
bun dist/cursor/install.ts your-project
```

続きは [Cursor で AI-DLC を動かす](harnesses/cursor.md) です。IDE と CLI の使い方、フックの動き、権限、インストーラの再実行ルール。

</details>

<details markdown="1">
<summary><strong>opencode</strong></summary>

```bash
cp -r dist/opencode/.aidlc/    your-project/.aidlc/
cp -r dist/opencode/.opencode/ your-project/.opencode/
cp -r dist/opencode/aidlc/     your-project/aidlc/      # the workspace shell — a sibling of .aidlc/, not inside it
cp dist/opencode/opencode.json your-project/opencode.json  # or merge into yours
cp dist/opencode/AGENTS.md     your-project/AGENTS.md      # or merge into yours
```

続きは [opencode で AI-DLC を動かす](harnesses/opencode.md) です。`.aidlc/` と `.opencode/` の分割、マージ時に残すべき `opencode.json` の欠かせないブロック、`.gitignore` エントリ。

</details>

> **プラグイン入りの導入を上げるとき:** 既存プロジェクトへ新しい `dist/<harness>/` エンジンをコピーすると、出荷のステージグラフとコアのステージソースに戻ります。合成済みのプラグイングラフエントリと寄与のマージは消えます。エンジンの再インストールやアップグレードのたびに `/aidlc plugin sync` を実行してください。Claude、Codex、Cursor、Kiro IDE は、次のセッション開始時にプラグインの compose フックで自己修復することもあります。Kiro CLI は明示的な sync が必要です。

### 手順 2: プロジェクトへ移動する

```bash
cd your-project
```

`/aidlc` コマンドはすべて、プロジェクトルート基準で走ります。

---

## ワークスペースシェル

足場を組むステップはありません。コピーした配布に、すでにワークスペースシェルが入っています。`.claude/` のエンジンと、あらかじめ組んである `aidlc/spaces/default/` です。メモリ層は `aidlc/spaces/default/memory/` にあり、チームが確認したプラクティスと学びがここに残ります。init コマンドは実行しません。

最初に `/aidlc` を走らせる（または作りたいものを書く）と、エンジンはアクティブスペースへ最初のインテントを **自動作成** します。インテントごとにレコードディレクトリ `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` が付き、次を持ちます。

- `aidlc-state.md` — インテント単位のワークフロー状態
- `audit/` — 監査証跡。クローンごとのシャード（`<host>-<clone>.md`）として書く
- `<phase>/<stage>/...` — ステージの成果物（例: `inception/requirements-analysis/requirements.md`）

チームナレッジは一段上、スペース単位の `aidlc/spaces/<space>/knowledge/`（`intents/` の兄弟）にあります。そのスペースの全インテントで溜まります。エンジンは空で作り、あとは任意の `aidlc-shared/` とエージェントごとのサブディレクトリへ、自由形式のファイルを足します。

最初の実行より前に [チームナレッジ](08-knowledge.md) やチームのプラクティスを足すなら、出荷の `aidlc/spaces/default/memory/` を編集します。スペース単位の `aidlc/knowledge/` ディレクトリは、最初の `/aidlc` が走ったときに（空で）作られます。

ワークスペースの全体像 — 同時に複数インテントをどう持つか、スペースの役割、あいだを移るコマンド — は [スペースとインテント](03-spaces-and-intents.md) です。

---

## セットアップの確認

ヘルスチェックで、揃っているかを確かめます。

```
/aidlc --doctor
```

`--doctor` は、検査が全部通れば exit 0、どれか落ちれば exit 1 です。どちらの場合も、報告の全文は stdout に出ます。

### `--doctor` が見るもの

| 検査 | 検証すること |
|-------|-------------------|
| 前提 | `bun` が入っており `$PATH` にある |
| フックの存在 | `settings.json` が配線するフック（`hooks` ブロックと `statusLine` コマンド — フレームワークフック 17 本すべて）が `.claude/hooks/` にある。配線されているのにファイルが無いフックは、大きく失敗する。期待する一覧を `settings.json` から取るので、そこにフックを足せば自動で検査対象になる |
| フックが有効（Claude Code） | 検査したどの設定ファイルも、フックを全体無効にしていない。`"disableAllHooks": true` が、エンタープライズ管理設定（プラットフォームファイルと、アルファベット順の `managed-settings.d/` 断片）、`.claude/settings.local.json`、`.claude/settings.json`、`~/.claude/settings.json` のどれかから解決されると、大きく失敗する。Claude Code のレイヤー優先順位に従うので、優先度の高い `false` は下位の `true` を抑える |
| プロジェクト構造 | 期待する設定の `.claude/settings.json` がある |
| ワークスペースシェル | `.claude/` と `aidlc/spaces/default/memory/` がある（出荷のシェル） |
| 状態ファイル | アクティブインテントの `aidlc-state.md` が監査証跡と一致している（ドリフト無し） |
| フックのハートビート | `.aidlc-hooks-health/` にフック実行のタイムスタンプがある。ワークフローが進んだあとにハートビート 0 件なら失敗。最新のステージ／ゲートイベントより 5 分以上古いハートビートは stopped として失敗する |
| Claude の管理フックポリシー | Claude Code では、実効の管理設定 `allowManagedHooksOnly: true` を報告する。これが `.claude/settings.json` のプロジェクトフックをすべて止めるため。全体無効の検査と同じプラットフォームパス、断片の順序、`AIDLC_MANAGED_SETTINGS_PATH` 上書きを使う |
| グラフの健全性 | `stage-graph.json` に閉路が無い。各 slug に対応するステージファイルがある |
| スコープ検証 | 11 スコープすべてがグラフに対して問題なく辿れる（スコープ短縮のギャップに対する advisory は想定どおり） |
| スキーマと参照 | 各ステージの YAML frontmatter が妥当で、consumes / requires_stage の参照がすべて解決する |
| 重複プロデューサー | 複数のプロデューサーを持つ消費成果物と、関係するステージ slug を報告する（advisory — 失敗にはしない） |
| キーワードの重複 | `.claude/scopes/*.md` をまたいで、同じキーワードを複数スコープが名乗っていない |
| プラグイン検査 | 有効なプラグインの任意の `tools/<plugin>-doctor.ts`。error は doctor を失敗させ、advisory は exit code を変えずに見える |
| pending-compose マーカー | 存在する `aidlc/.aidlc-compose-pending`（進行中の compose ゲートのマーカー）とその経過時間を報告する。新しい（24 時間未満。compose ゲートが開いているときの通常）は advisory で通過。古い（落ちた compose ゲートが取り残したもの）は失敗。無ければ何も出さない。対処: 待ちの compose ゲートが無ければ削除する。あるならゲートを解消する |
| バックグラウンドサブエージェントの台帳 | `aidlc/.aidlc-subagent-inflight` の新しい件数と古い件数を報告する。受理したバックグラウンドディスパッチがセッション単位のエントリを 1 件足し、完了が一致する 1 件を消す。新しいエントリ（2 時間未満）は advisory で通過。古い、または壊れたエントリは失敗。無ければ何も出さない。対処: バックグラウンドのサブエージェントが走っていなければ削除する |

### 出力例

```
✓ bun installed (required for CLI tools and hooks)
✓ aidlc-write-audit-log.ts present
✓ aidlc-sync-workflow-state.ts present
✓ aidlc-validate-state.ts present
✓ aidlc-log-subagent.ts present
✓ aidlc-session-start.ts present
✓ aidlc-session-end.ts present
✓ aidlc-statusline.ts present
✓ Hooks enabled (resolved disableAllHooks is not true)
✓ settings.json present
✓ AWS_AIDLC_DEFAULT_SCOPE (unset — no project default)
✓ workspace shell ready (.claude/ + aidlc/spaces/default/memory/)
✓ Hook heartbeats: not yet fired (first workflow stage will populate)
✓ State matches last audit event (no drift)
✓ Cycle detection: 0 cycles
✓ Orphan stage files: 33 graph entries all have files
✓ Scope validation: 11 scopes valid
✓ Schema validation: 33/33 stages valid
✓ Graph references: 122 artifacts + edges resolved
✓ Duplicate producers: every consumed artifact has a single producer
✓ Keyword overlap: no conflicts
```

### 失敗の直し方

| 失敗 | 直し方 |
|---------|-----|
| `bun` が入っていない | `curl -fsSL https://bun.sh/install \| bash` で入れる。Windows は `npm install -g bun`、または `powershell -c "irm bun.sh/install.ps1 \| iex"`。非対話シェルの PATH に載せる。 |
| フックが無い | 配布から `.claude/` ディレクトリを再コピーする |
| フックは登録されているが一度も実行されていない | doctor は、進んだステージ数を出す。`/hooks` で承認とポリシーの状態を見る。待ちのフックを承認し、CLI を完全再起動する。`/hooks` がポリシーによりフック制限と出すなら、管理の `allowManagedHooksOnly` を外せるのは Claude Code の管理者だけ。暫定として、下の対話セッション用バイパス変数 2 つだけを使う。 |
| `allowManagedHooksOnly=true` | Claude Code の管理者に、管理の `managed-settings.json` で設定を外してもらう。プロジェクト設定では上書きできない。人が付いている復旧に限り、`AIDLC_SKIP_HUMAN_PRESENCE_GUARD=1` と `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` を付けて CLI を起動する。 |
| `settings.json` が無い | 配布から再コピーする: `cp dist/claude/.claude/settings.json .claude/settings.json` |
| ワークスペースシェルが無い | `dist/claude/` からワークスペースシェルをプロジェクトルートへ再コピーする |
| 状態ファイルの問題 | アクティブインテントのレコードディレクトリを `aidlc/spaces/<space>/intents/` の下で退避し、`/aidlc` で新しく始める |
| グラフ／スコープ／スキーマ／キーワードの失敗 | 診断は、問題の成果物、slug、スコープ名を出す。これは `.claude/aidlc-common/stages/` か `.claude/scopes/` のオーサリングドリフトを示す。コンパイル済みグラフとスコープ格子を `bun .claude/tools/aidlc-graph.ts compile` で再生成するか、名前の付いたステージ／スコープを直接見る。 |

---

## 最初のワークフローを始める

`--doctor` が通ったら、実行できます。

```
/aidlc Build a REST API for inventory management
```

スコープを直接指定しても構いません。

```
/aidlc classic
/aidlc express
/aidlc feature
/aidlc bugfix Fix the login timeout issue
```

ライフサイクルの選び方は [ワークフロープロファイル](workflow-profiles.md)、そのあと何が起きるかの通しは [最初のワークフロー](02-your-first-workflow.md) です。

---

## 早見表

シェルで:

```bash
# Verify prerequisites
command -v claude >/dev/null && echo "✓ Claude Code" || echo "✗ Claude Code"
command -v bun    >/dev/null && echo "✓ bun"          || echo "✗ bun"

# From your aidlc-workflows clone (main branch) - see Installation above
# Install (engine + the workspace shell sibling)
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/aidlc/   your-project/aidlc/
# Existing .gitignore: preserve it and merge only the section beginning "# AI-DLC".
if [ ! -e your-project/.gitignore ]; then
  cp dist/claude/.gitignore your-project/.gitignore
fi

# Launch Claude Code in your project
cd your-project && claude
```

Claude Code セッションの中で:

```
# Verify (exits 1 on any check failure; read stdout for the full report)
/aidlc --doctor

# Start
/aidlc Build a task management API with user authentication
```

---

## ツールの権限

同梱の `.claude/settings.json` は、Claude Code のツール（Read、Edit、Write、Bash、Glob、Grep、Task、WebSearch）を事前承認しているので、呼び出しごとの許可プロンプト無しでワークフローが走ります。使う前にこのファイルを見直し、セキュリティ要件に合わせて調整してください。

ツール権限の変更は [カスタマイズ](13-customization.md) です。

---

## 次の章

- [最初のワークフロー](02-your-first-workflow.md) — 一通りの実行を注釈付きで
- [ワークフロープロファイル](workflow-profiles.md) — Classic、Express、そのほかの選び方
- [スコープ・深度・テスト戦略](05-scopes-and-depth.md) — 作業に合うスコープの選び方
- [トラブルシュート](15-troubleshooting.md) — よくある症状と直し方
- [用語集](glossary.md) — 用語の定義
