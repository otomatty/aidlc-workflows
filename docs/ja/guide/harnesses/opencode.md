# opencode で AI-DLC を動かす

opencode ランタイムは、フレームワークのハーネス配布の一つで、オープンソースの **opencode** ハーネス（opencode.ai）向けです。決定論的なコアは一つ、ハーネスは複数。エンジン、状態機械、監査ログ、グラフ、スウォームの審判、ラーニングゲートは、どの配布でもバイト一致です。違うのはシェルだけです。ソース／開発用の木は `core/` + `harness/opencode/` から `bun scripts/package.ts opencode` で、無視されるローカル `dist/opencode/` へ **生成** されます。手で編集しないでください。

## 配置: ドットディレクトリは意図して 2 つ

opencode は `.opencode/tools/` と `.opencode/tool/` の下のすべての `*.ts` をカスタムツール定義として自動 import します。CLI 型のエンジンスクリプト（トップレベルの配送、`process.exit`）を import するとセッションが落ちます（opencode 1.17.18 で実機再現済み）。なのでこの配布は分割します。

- **`.aidlc/`** — AIDLC のエンジントリー（ツール、フック、スキル、エージェント、ナレッジ、スコープ、センサー、aidlc-common）。opencode はここを走査しません。出荷の `opencode.json` が `skills.paths: [".aidlc/skills"]` を登録するので、オーケストレータスキルと生成ランナーはそこで見つかります。
- **`.opencode/`** — ネイティブに消費される面だけ。ペルソナサブエージェント 14 体（`agents/*.md`、`mode: subagent`）、`/aidlc` コマンド（`command/aidlc.md`）、フックアダプタプラグイン（`plugin/aidlc-opencode-adapter.ts`。opencode が自動発見）。

## 前提条件

- **opencode ≥ 1.17** — この導入が頼るプラグインフック面（`tool.execute.before`、`tool.execute.after`、`chat.message`、`session.idle`、`experimental.session.compacting`）と、プロジェクトローカルのスキル／エージェント発見。確認は `opencode --version`。
- **bun** は、ソース／開発用の `dist/` 投影を生成または走らせるときだけです。ネイティブ導入と版付きリリースランタイムは、入れた `aidlc` 実行ファイル経由で配送します。
- **モデルプロバイダ** — 出荷のプロジェクト `opencode.json` はセッションモデルをピンしません。グローバルの opencode 設定が供給します。ティア付きペルソナは `amazon-bedrock/global.anthropic.claude-sonnet-4-6` をピンします。プロバイダが違うときは、プロジェクトの `opencode.json` でエージェントごとに上書きしてください。

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
opencode
```

インストーラは、リリースのメタデータ、実行ファイル、全ハーネスのランタイムアーカイブを、公開された SHA-256 チェックサムに対して検証します。入れたランタイムに Bun、Node.js、Git は不要です。ハーネスの選択は `aidlc config` で行います。

Windows では `install.ps1` をダウンロードし、`& $installer` で走らせます。対話実行ではフラグを省略できます。リダイレクトした入力、`pwsh -NonInteractive`、`--yes`、`--json`、`--quiet` ではフラグが要ります。エアギャップのパッケージでは、Unix は `install.sh --from <release-directory> --offline`、Windows は `& $installer -From <release-directory> -Offline` です。

`aidlc config` は `.aidlc/`、`.opencode/`、ワークスペースシェル、`AGENTS.md`、管理対象の `.gitignore` ブロック、`opencode.json` を投影します。生成した設定はスキルと方法論ファイルを発見し、直接の `aidlc engine *` コマンドを許可します。ほかのシェルコマンドは聞いたままです。プロジェクトで opencode を始め、`/aidlc --doctor` を走らせ、続けて `/aidlc` と作りたいものを。

### 版付きの手動コピー（代替）

特定リリースの `aidlc-runtime-X.Y.Z.tar.gz` を、[Install and Lifecycle: コピー経路](../18-install-and-lifecycle.md#コピー経路) のとおりダウンロードして展開し、`RUNTIME_ROOT` を展開した `runtime/` ディレクトリにします。

1. 配布をプロジェクトへコピーします:

   ```bash
   cp -r "$RUNTIME_ROOT/opencode/.aidlc/"    your-project/.aidlc/
   cp -r "$RUNTIME_ROOT/opencode/.opencode/" your-project/.opencode/
   cp -r "$RUNTIME_ROOT/opencode/aidlc/"     your-project/aidlc/      # the workspace shell — a sibling of .aidlc/, not inside it
   cp "$RUNTIME_ROOT/opencode/opencode.json" your-project/opencode.json  # or merge into yours
   cp "$RUNTIME_ROOT/opencode/AGENTS.md"     your-project/AGENTS.md      # or merge into yours
   ```

   `opencode.json` は欠かせないブロックを 3 つ持ちます。`skills.paths`（`.aidlc/skills` からのスキル発見）、`instructions`（方法論ツリーの include — `/aidlc space <name>` が差し替える）、AIDLC の bash エントリポイントと `.aidlc/tools/`・`.aidlc/hooks/` 下の編集に対する権限規則。既存の `opencode.json` や `opencode.jsonc` へマージするときは、3 つとも残してください。アダプタが権限境界を強制します。対象はパッケージした木から埋め込んだエントリポイントで、連鎖・リダイレクト・展開・コマンド置換の無い直接コマンド 1 つとして起動する必要があります。エンジンコードの編集は承認を聞きます。

2. ワークフローを始める前に、出荷の `AGENTS.md` の 「Git Integration」節から `.gitignore` エントリを入れてください（クローンごとの監査シャードは意図してコミットします。カーソルとマシンローカルのランタイムは無視したままです）。

3. プロジェクトで opencode を始め、`/aidlc --doctor` を走らせ、続けて `/aidlc` と作りたいものを。

opencode には、セッション開始フックが注入する文脈の経路が無いので、素の `/aidlc` 起動ではスキルが読み取り専用の status 探査を一度します。既存のワークフローには標準の Resume / Redo / Jump / Start Fresh メニューが出ます。`/aidlc --resume` は探査もメニューも飛ばして直接続けます。

版付きランタイムはネイティブの `aidlc` コマンドを使います。Bun 形の投影が要るフレームワーク開発者は、リポジトリを clone し、`bun install --frozen-lockfile` と `bun scripts/package.ts` を走らせ、無視されるローカル `dist/opencode/` 出力を使えます。

## 更新と版のずれ

`aidlc update` はマシンのランタイムを更新し、プロジェクトは書き換えません。`aidlc doctor` は、選んだエンジンと違うプロジェクトスタンプを出します。ワークフローのあいだに、刷新をプレビューして適用します:

```bash
aidlc config --dry-run
aidlc config
```

config は管理対象のルートブロックとユーザー所有ファイルを残し、ローカルのフレームワーク編集を衝突として出します。`opencode.json` はファイル全体の統合なので、ローカル編集は上書きせず衝突として残します。いずれかのワークフローがアクティブなあいだは刷新を拒否します。先にワークフローを完了してください。アップグレードとロールバックは、プロジェクトを触らないので、ワークフロー中でも安全です。

## このハーネスで違うところ

- **質問は番号付きの散文選択肢で出ます**（構造化質問ウィジェットはありません）。正本は `[Answer]:` タグ付きの questions ファイルです。
- **フックはアダプタプラグインに乗ります。** opencode に hooks.json／settings のフック登録はありません。`.opencode/plugin/aidlc-opencode-adapter.ts` が opencode のプラグインフック瞬間を `.aidlc/hooks/` のコアフック本体（bun サブプロセスとして走る）へ写します。ツール実行前のレビュアー読み取り範囲と AIDLC bash 境界、write／edit／apply_patch の監査 + センサー、bash での rebuild-stage-graph、todowrite でのステータスライン同期、task でのサブエージェント記録、人のターンごとの存在 mint、コンパクション前の状態検証。
- **転送ループの強制は advisory です。** Stop の継ぎ目は `session.idle` イベントです。反応であり、ブロックではありません。コアフックが `block` と答えると、プラグインは nudge プロンプトを注入してループを再開します（センチネル付きなので人の存在は発行しません）。会話中、または一時停止している人は、フックの対話上限で解放されます。
- **ペルソナはネイティブサブエージェントです**（`mode: subagent`）。コンダクターはほとんどのステージでインラインにまとい、サブエージェントステージ 2 つ（2.1 reverse-engineering、3.5 code-generation）では `task` ツールで委譲します。ネイティブの権限マップが `task` を拒否するので、委譲されたエージェントは再委譲できません。プラグイン合成は、プラグインペルソナにも同じ `.opencode/agents/` の双子を出します。
- **スペース切り替えは JSONC を残します。** `/aidlc space <name>` は `opencode.json` でも `opencode.jsonc` でも方法論グロブを更新し、コメントも末尾カンマも剥がしません。明示のペルソナメモリパスも揃えたままです。
- **Construction スウォームは task ツールの fan-out だけです**（`AIDLC_USE_SWARM=1` は目立つ no-op — Workflow ツールはありません）。
- **セッション終了の瞬間はありません** — `SESSION_ENDED` 監査イベントは出ません。コンパクション前の検証は発火します（`experimental.session.compacting`）。
- **ステータスライン／ウェルカムメッセージはありません** — `/aidlc --status` と、ゲートの進捗行を使ってください。
- **MCP サーバー**: 同梱はありません。必要なら `opencode.json` の `mcp:` の下に自分で設定してください。

## 導入の確認

```bash
aidlc doctor                               # native install
bun .aidlc/tools/aidlc-utility.ts doctor   # source/development copy
opencode run --command aidlc -- "--status"  # /aidlc --status through the harness
```

doctor の opencode 固有検査: `.opencode/plugin/` にアダプタプラグインがあること、プロジェクトルートに `opencode.json` か `opencode.jsonc` があること、`.opencode/command/aidlc.md` があること。
