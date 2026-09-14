# 他ハーネスで動かす

AI-DLC は、ハーネスに依存しない一つのコアを、いま使っている CLI へ焼き付けたものです。方法論 — [フェーズとステージ](../04-phases-and-stages.md)、[エージェント](../06-agents.md)、[スコープ](../05-scopes-and-depth.md)、[承認ゲート](../07-interaction-modes.md) — はどのハーネスでも同じです。違うのは *シェル* です。ゲートの出方、サブエージェントの出し方、どのセッションイベントが発火するか、設定の置き場所。各章は、そのハーネスの入れ方、前提、方法論から外れる振る舞いだけを扱います。

## まず入れる

どのハーネスでも、推奨の初回経路はチェックサム検証付きのネイティブインストーラのあと `aidlc config` です:

```bash
tmp="$(mktemp -d)"
curl -fsSL \
  https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh \
  -o "$tmp/install.sh"
sh "$tmp/install.sh"
rm -rf "$tmp"
cd your-project
aidlc config
```

インストーラは常に、全ハーネスのランタイムを入れます。プロジェクトの面を選ぶのは `aidlc config --harness <name>` です。ホスト側の前提はそのままです。Codex は、プロジェクトのフック発見のために対象プロジェクトが Git リポジトリである必要があります。

Windows では `install.ps1` をダウンロードし、`& $installer` で起動します。

使うハーネスを選んでください:

| ハーネス | 起動 | 章 |
|---------|--------|---------|
| **Claude Code** | `/aidlc` | [User Guide](../00-introduction.md) 全体で扱います（例は Claude Code）。入れ方は [導入](../01-getting-started.md)。 |
| **Kiro IDE** | `/aidlc` | [Kiro IDE で AI-DLC を動かす](kiro-ide.md) — 前提（Opus 4.8）、導入、フック、Kiro で違うところ。 |
| **Kiro CLI** (≥ 2.6) | `/aidlc` | [Kiro CLI で AI-DLC を動かす](kiro-cli.md) — 前提、導入、Kiro で違うところ。 |
| **Codex CLI** (≥ 0.145.0) | `$aidlc` | [Codex CLI で AI-DLC を動かす](codex-cli.md) — 前提、信頼の事前シード、Bedrock 設定、git リポジトリ必須。 |
| **Cursor** | `/aidlc` | [Cursor で AI-DLC を動かす](cursor.md) — Cursor IDE と CLI で同じ木、ネイティブのサブエージェントとスキル、hooks.json アダプタ、Cursor で違うところ。 |
| **opencode** (≥ 1.17) | `/aidlc` | [opencode で AI-DLC を動かす](opencode.md) — `.aidlc/` と `.opencode/` の分割、アダプタプラグイン、opencode で違うところ。 |
| **GitHub Copilot** (CLI ≥ 1.0.74 / VS Code ≥ 1.130) | `/aidlc` | [GitHub Copilot で AI-DLC を動かす](copilot.md) — 両面で 1 回の導入、`.github/` へのマージ、フォルダ信頼、Copilot で違うところ。 |

Kiro（IDE でも CLI でも）では **Claude Opus 4.8** がいちばん安定します。**有料の Kiro プラン** が必要です。

手でコピーする場合は、特定リリースの `aidlc-runtime-X.Y.Z.tar.gz` をダウンロードして展開し、`runtime/<harness>/` からコピーします。リポジトリのチェックアウトから生成済みの木はコピーしないでください。フレームワーク開発者は、代わりにソースチェックアウトで `bun scripts/package.ts` を走らせ、無視されるローカルの `dist/` と `dist-release/` 出力を実体化できます。各ハーネス章は、手動コピーの手順を、見出し付きの代替として残しています。

`aidlc update` のあと、`aidlc doctor` でプロジェクト／ランタイムの版のずれを見て、ワークフローのあいだに各プロジェクトを `aidlc config` で刷新してください。config はアクティブなワークフローの刷新を拒否し、走っている仕事を、変わったステージ定義やグラフ定義から守ります。

この一覧は開いています。新しいハーネスは同じ型で章が足されます。ハーネスそのものを *作る* とき（ソース契約 — マニフェスト、フックアダプタ、`emit.ts`）は、Harness Engineer Guide の [Porting to a New Harness](../../harness-engineering/09-porting-to-a-new-harness.md) です。

どのハーネスでも方法論は同じです。まず [最初のワークフロー](../02-your-first-workflow.md) と [フェーズとステージ](../04-phases-and-stages.md) の案内から入ってください。
