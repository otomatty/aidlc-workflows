# Kiro CLI で AI-DLC を動かす

> [!NOTE]
> Kiro CLI では **Claude Opus 4.8** がいちばん安定します。**有料の Kiro プラン** が必要です。弱いモデルでは、コンダクターが任意のステージ段（レビュアーの通過、ラーニングの儀式）を飛ばしたり、承認ゲートを急いだりすることがあります。IDE 向けの配布は [Kiro IDE で AI-DLC を動かす](kiro-ide.md) に別途あります。

フレームワークのハーネスの一つです。Kiro ランタイムは、同じ AI-DLC 方法論を [Kiro CLI](https://kiro.dev/docs/cli/) で走らせます。決定論的なコア — ツール、ステージファイル 33、プロトコル、ナレッジ、センサー、スコープ、ルール — はどのハーネスでもバイト共有です。違うのはシェル（スキル、エージェント設定、フック配線、起動）だけです。

## 前提条件

- **Kiro CLI ≥ 2.6**（`kiro-cli --version`）、ログイン済み（`kiro-cli login`）
- **bun** は、ソース／開発用の `dist/` 投影を生成または走らせるときだけです。ネイティブ導入と版付きリリースランタイムは自己完結です。

## インストール

### ネイティブチャネル（推奨）

```bash
tmp="$(mktemp -d)"
curl -fsSL \
  https://github.com/awslabs/aidlc-workflows/releases/latest/download/install.sh \
  -o "$tmp/install.sh"
sh "$tmp/install.sh"
rm -rf "$tmp"
cd your-project
aidlc config
aidlc doctor
```

インストーラは、リリースのメタデータ、実行ファイル、全ハーネスのランタイムアーカイブを、公開された SHA-256 チェックサムに対して検証します。入れたランタイムに Bun、Node.js、Git は不要です。ハーネスの選択は `aidlc config` で行います。

Windows では `install.ps1` をダウンロードし、`& $installer` で走らせます。エアギャップのパッケージでは、Unix は `install.sh --from <release-directory> --offline`、Windows は `& $installer -From <release-directory> -Offline` です。

`aidlc config` は、最初のチャットセッションの前に Kiro シェルを投影します。それからプロジェクトルートで Kiro を始めてください:

```bash
kiro-cli chat
```

ネイティブ投影は `aidlc engine *` のエンジンコマンドを許可します。`.kiro/settings/cli.json` に `chat.defaultAgent: "aidlc"` も出荷するので、エージェントフラグ無しで `/aidlc` が有効です。最初のワークフローの前に、チャットで `/aidlc --doctor` を走らせてください。

### 版付きの手動コピー（代替）

特定リリースの `aidlc-runtime-X.Y.Z.tar.gz` を、[Install and Lifecycle: コピー経路](../18-install-and-lifecycle.md#コピー経路) のとおりダウンロードして展開し、`RUNTIME_ROOT` を展開した `runtime/` ディレクトリにします。

```bash
mkdir -p your-project/.kiro your-project/aidlc
cp -R "$RUNTIME_ROOT/kiro/.kiro/." your-project/.kiro/
cp -R "$RUNTIME_ROOT/kiro/aidlc/." your-project/aidlc/    # the workspace shell (spaces/default/memory) — a sibling of .kiro/, not inside it
cp "$RUNTIME_ROOT/kiro/AGENTS.md" your-project/AGENTS.md  # merge if you already have one
# Existing .gitignore: preserve it and merge only the section beginning "# AI-DLC".
if [ ! -e your-project/.gitignore ]; then
  cp "$RUNTIME_ROOT/kiro/.gitignore" your-project/.gitignore
fi
```

`aidlc/` ディレクトリはワークスペースシェルです。エンジンが読む、あらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリーを出荷します。`.kiro/` の **兄弟** なので、別途コピーします（または `$RUNTIME_ROOT/kiro/` 一式をまとめてコピーします）。無いと `/aidlc --doctor` の "workspace shell ready" 検査が落ちます。

版付きランタイムはネイティブの `aidlc` コマンドを使います。Bun 形のソース投影が要るフレームワーク開発者は、リポジトリを clone し、`bun install --frozen-lockfile` と `bun scripts/package.ts` を走らせ、無視されるローカル `dist/kiro/` 出力を代わりに使えます。

出荷の `.gitignore` は、ワークスペースのコミット／無視の分け方を持ちます。ユーザーごとのカーソル（`aidlc/active-space`、`aidlc/spaces/*/intents/active-intent`）とマシンローカルのランタイム（`aidlc/.aidlc-clone-id`、`runtime-graph.json`、センサーキャッシュ、`spaces/*/knowledge/.sources.local.json`）は未追跡のまま、共有の記録 — 方法論メモリ、状態、監査シャード、成果物 — は git に乗ります。ガード付きのコマンドは、プロジェクトに `.gitignore` が無いときだけスターター一式をコピーします。既にある場合は、プロジェクト側の規則はすべて残し、出荷ファイルの `# AI-DLC` から末尾までだけをマージします。汎用のスターター規則はコピーしないでください。入れた `AGENTS.md` の `## Git Integration` は、最初のワークフローの前に AI-DLC 規則が入っている前提です。

そのあと、プロジェクトでセッションを始めます:

```bash
cd your-project && kiro-cli chat
```

導入は `.kiro/settings/cli.json` に `chat.defaultAgent: "aidlc"` を出荷するので、AI-DLC のコンダクターエージェントが既定で有効です。`/aidlc` はそのまま動きます。**このワークスペース設定は、グローバルに設定した既定エージェントより優先されます。** 自分の既定を残したいなら、その設定を外し、代わりに `kiro-cli chat --agent aidlc` を使ってください。

出荷のエージェントはモデルをピンしません。ピンした ID は、そのモデルが利用者の Kiro 導入で有効なときだけ解決するので、コンダクターとペルソナ 14 体はセッションモデル（`/model`）を継ぎます。同じ `cli.json` は `chat.modelDefaults` 経由で、モデルごとの条件付き reasoning-effort 既定を 1 つ出荷します。`claude-opus-4.8` 向けの `xhigh` で、セッションが実際にそのモデルを走らせているときだけ効きます（推奨の構成）。それ以外では惰性です。Kiro にエージェント単位の effort 面は無いので、effort はこの形でモデルに乗せるしかありません。このファイルを読むのは Kiro CLI だけです。Kiro IDE は `cli.json` を無視し、拡張のモデルごとの既定を使います。セッション単位の上書きはチャットの `/effort <level>`、または `kiro-cli chat --effort <level>`（low|medium|high|xhigh|max）です。セッションフラグとユーザー単位の `~/.kiro/settings/cli.json` は、どちらもワークスペース既定より優先されます。

## 更新と版のずれ

`aidlc update` はマシンのランタイムを更新し、プロジェクトファイルは変えません。`aidlc doctor` は、選んだエンジンと違うプロジェクトスタンプを出します。ワークフローのあいだに、刷新をプレビューして適用します:

```bash
aidlc config --dry-run
aidlc config
```

config はユーザー所有の内容を残し、ローカルのフレームワーク編集を衝突として出します。いずれかのワークフローがアクティブなあいだは刷新を拒否します。先にワークフローを完了してください。アップグレードとロールバックは、プロジェクトを触らないので、ワークフロー中でも安全です。

## 使い方

プロジェクトで `kiro-cli chat` を始め、`/aidlc <description>` でコンダクターを起動します。`/aidlc --status` が位置を出し、`/aidlc --config [section]` はセッション内でプロジェクト設定の変更を集めます。`/aidlc --doctor`、`--stage`、`--phase`、`--depth`、`--test-strategy` もすべて動きます。ワークスペースの移動は `/aidlc intent [name]`、`/aidlc space [name]`、`/aidlc space-create <name>` です。ステージごと（`/aidlc-domain-design`）とスコープごと（`/aidlc-feature`）のランナースキルも入っています。

status、doctor、help、version、ワークスペース移動のコマンドは、モデルがそれらをワークフローの仕事に変える前に Kiro フックが配送します。子の出力は UTF-8 としてデコードし、端末プロトコル／制御バイトは、そのプレーンテキスト中継の境界だけで取り除きます。普通の Unicode、パス、タブ、改行、エスケープに見えるリテラルはそのままです。

**セッションはプロジェクトルートから始めてください。** ネイティブ導入は、入れた `aidlc` コマンドを事前承認します。ソース／開発コピーが事前承認するのは、プロジェクト相対の `bun .kiro/tools/<tool>.ts` コマンドだけです。絶対パス、`KIRO_PROJECT_DIR` 展開、コマンド連鎖はゲートしたままです。

**承認者がいないセッションは、聞かずに止まります。** 事前承認の集合の外は、対話の答えが要ります。`kiro-cli chat --no-interactive` の下では聞く相手がいないので、Kiro は `non-interactive mode (no user to approve)` でコマンドをそのまま拒否します。ACP では、クライアントが `session/request_permission` に答える必要があります。その要求を無視するクライアントは、権限失敗と見分けが付きません。`--trust-all-tools` は許可リストも拒否リストも迂回します。再帰 `rm` と `git push` の拒否も含みます。包括的なシェルアクセスが許せる、使い捨てサンドボックスの中だけで使ってください。

## Kiro で違うところ

| 領域 | Claude Code | Kiro CLI |
|------|-------------|----------|
| ゲートと質問 | `AskUserQuestion` ウィジェット | 番号付きの散文選択肢（番号で返す）。正本は `[Answer]:` タグ付きの questions ファイル |
| ステータスライン | 今のステージ + モデル + コンテキスト % | 無い — `/aidlc --status` と、各ゲートの進捗行を使う |
| ディスパッチステージ（2.1 パイプライン、2.2 サブエージェント、2.4 モブ、3.5 サブエージェント） | `Task` ツール | Kiro の `subagent` ツール → エージェント設定（ペルソナ 14 体すべてが設定を出荷） |
| Construction スウォーム | 並行 `Task` フロア、任意の ultracode Workflow | サブエージェントの fan-out だけ。`AIDLC_USE_SWARM=1` は no-op と告知する |
| セッション監査イベント | `SESSION_STARTED/RESUMED/ENDED`、`SESSION_COMPACTED` | `SESSION_STARTED` だけ（Kiro にセッション終了／コンパクション前フックは無い） |
| 転送ループの強制（Stop フック） | 対話 + ヘッドレス | 対話セッションだけ — `--no-interactive` の実行は stop-hook のブロックを守らない |
| 権限 | `settings.json` の許可リスト | ソース生成の投影: プロジェクト相対のフレームワーク `bun .kiro/tools/<tool>.ts` 呼び出しと `date -u`。ネイティブと版付きリリースランタイム: `aidlc engine *`。ほかのシェルコマンドは聞く |
| ウェルカムメッセージ | セッション開始時に `settings.json` の `companyAnnouncements` から描画 | 無い — Kiro にウェルカム描画の同等は無い。セッション開始フックは再開文脈だけを注入する |
| MCP サーバー | 5 つ出荷（`.mcp.json`: `context7` + AWS 系 4 つ） | 同じ 5 つを `.kiro/settings/mcp.json` に出荷。既定はすべて無効。サーバーごとに `"disabled": false` を立てて有効にする。Kiro では Context7 にキーが要らない。Kiro は設定した HTTP ヘッダ値を、環境プレースホルダを展開せずそのまま送るから。委譲ペルソナ 14 体は `includeMcpJson: true` と `@<server>` ツール付与でオプトインする。コンダクターには付かない。 |

それ以外 — 状態機械、監査証跡、インテントのレコードディレクトリ（`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）の下の成果物、ラーニングの儀式、センサー、スコープ、深度／テスト戦略 — は同じ動きです。同じだからです。ネイティブ導入は `aidlc` 経由で配送し、ソースコピーは `.kiro/tools/` の対応ツールを走らせます。

プロジェクトの `aidlc/` ワークスペースはハーネス非依存です。ハーネス間の移動（または両方を並べて走らせること）は、対応はしていますが未テストです。アクティブなワークフローがある状態で衝突するハーネス導入を見つけると、`/aidlc --doctor` が警告します。

## フレームワーク開発者向け

`dist/kiro` は `core/` + `harness/kiro/` から `bun scripts/package.ts kiro` で **生成** されます（コアのコピーで `{{HARNESS_DIR}}` トークンを `.kiro` に置換し、`rules/` → `steering/` へ名前を付け替えます）。出力は無視され、ローカルです。`bun scripts/package.ts --check` は独立した一時ルートで二度ビルドし、結果をバイト比較して CI の決定論ガードとします。手で書く Kiro の面は `harness/kiro/` にあります。オーケストレータスキル（`skills/aidlc/`）、エージェント JSON（`agents/`）、フックアダプタ（`hooks/aidlc-kiro-adapter.ts`）、`settings/cli.json`、`settings/mcp.json`、`AGENTS.md` — 直すのはそれら（または `core/`）であり、生成された `dist/kiro` ではありません。[Porting to a New Harness](../../harness-engineering/09-porting-to-a-new-harness.md) を見てください。

Claude の双子と並んで、実機の TUI 通しテストがあります。`tests/e2e/t-tui-kiro-intent-capture.serial.test.ts` は出荷の木に対して `kiro-cli chat` をキー入力で駆動します（番号付き散文ゲートは推奨の "1" で答え、ディスク状態で終了します）。オプトインは `AIDLC_KIRO_TUI_LIVE=1` です。tmux、`kiro-cli`、ログイン済みの Kiro セッションが無いときは、理由付きでスキップします。

## 次のステップ

入れて起動できましたか。方法論はどのハーネスでも同じです。ハーネス非依存の章へ進んでください。

- [最初のワークフロー](../02-your-first-workflow.md) — 注釈付きの通し実行。
- [フェーズとステージ](../04-phases-and-stages.md) — 5 フェーズと 33 ステージ。
- [スコープ・深度・テスト戦略](../05-scopes-and-depth.md) — 実行の大きさの合わせ方。
- [用語集](../glossary.md) — 用語の定義。

ほかのハーネス: [Codex CLI で AI-DLC を動かす](codex-cli.md) · [Cursor で AI-DLC を動かす](cursor.md) · [ハーネス一覧](README.md)。
