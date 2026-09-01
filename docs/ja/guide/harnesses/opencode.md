# opencode で AI-DLC を動かす

`dist/opencode/` は、フレームワークのハーネス配布の一つで、オープンソースの **opencode** ハーネス（opencode.ai）向けです。決定論的なコアは一つ、ハーネスは複数。エンジン、状態機械、監査ログ、グラフ、スウォームの審判、ラーニングゲートは、どの配布でもバイト一致です。違うのはシェルだけです。この木は `core/` + `harness/opencode/` から `bun scripts/package.ts opencode` で **生成** されます。手で編集しないでください（ドリフト検査が CI で落ちます）。

## 配置: ドットディレクトリは意図して 2 つ

opencode は `.opencode/tools/` と `.opencode/tool/` の下のすべての `*.ts` をカスタムツール定義として自動 import します。CLI 型のエンジンスクリプト（トップレベルの配送、`process.exit`）を import するとセッションが落ちます（opencode 1.17.18 で実機再現済み）。なのでこの配布は分割します。

- **`.aidlc/`** — AIDLC のエンジントリー（ツール、フック、スキル、エージェント、ナレッジ、スコープ、センサー、aidlc-common）。opencode はここを走査しません。出荷の `opencode.json` が `skills.paths: [".aidlc/skills"]` を登録するので、オーケストレータスキルと生成ランナーはそこで見つかります。
- **`.opencode/`** — ネイティブに消費される面だけ。ペルソナサブエージェント 14 体（`agents/*.md`、`mode: subagent`）、`/aidlc` コマンド（`command/aidlc.md`）、フックアダプタプラグイン（`plugin/aidlc-opencode-adapter.ts`。opencode が自動発見）。

<a id="prerequisites"></a>

## 前提条件

- **opencode ≥ 1.17** — この導入が頼るプラグインフック面（`tool.execute.before`、`tool.execute.after`、`chat.message`、`session.idle`、`experimental.session.compacting`）と、プロジェクトローカルのスキル／エージェント発見。確認は `opencode --version`。
- **bun** — どのハーネスでも同じです。ツールとフックはすべて bun で走ります。アダプタプラグインは bun を `PATH` から解決し、次に `~/.bun/bin/bun` です。
- **モデルプロバイダ** — 出荷のプロジェクト `opencode.json` はセッションモデルをピンしません。グローバルの opencode 設定が供給します。ティア付きペルソナは `amazon-bedrock/global.anthropic.claude-sonnet-4-6` をピンします。プロバイダが違うときは、プロジェクトの `opencode.json` でエージェントごとに上書きしてください。

## インストール

下のコピーは、[aidlc-workflows](https://github.com/awslabs/aidlc-workflows) リポジトリを `main` ブランチで clone した場所から実行します:

```bash
git clone --branch main https://github.com/awslabs/aidlc-workflows.git
cd aidlc-workflows
```

1. 配布をプロジェクトへコピーします:

   ```bash
   cp -r dist/opencode/.aidlc/    your-project/.aidlc/
   cp -r dist/opencode/.opencode/ your-project/.opencode/
   cp -r dist/opencode/aidlc/     your-project/aidlc/      # the workspace shell — a sibling of .aidlc/, not inside it
   cp dist/opencode/opencode.json your-project/opencode.json  # or merge into yours
   cp dist/opencode/AGENTS.md     your-project/AGENTS.md      # or merge into yours
   ```

   `opencode.json` は欠かせないブロックを 3 つ持ちます。`skills.paths`（`.aidlc/skills` からのスキル発見）、`instructions`（方法論ツリーの include — `/aidlc space <name>` が差し替える）、AIDLC の bash エントリポイントと `.aidlc/tools/`・`.aidlc/hooks/` 下の編集に対する権限規則。既存の `opencode.json` や `opencode.jsonc` へマージするときは、3 つとも残してください。アダプタが権限境界を強制します。対象はパッケージした木から埋め込んだエントリポイントで、連鎖・リダイレクト・展開・コマンド置換の無い直接コマンド 1 つとして起動する必要があります。エンジンコードの編集は承認を聞きます。

2. ワークフローを始める前に、出荷の `AGENTS.md` の 「Git Integration」節から `.gitignore` エントリを入れてください（クローンごとの監査シャードは意図してコミットします。カーソルとマシンローカルのランタイムは無視したままです）。

3. プロジェクトで opencode を始め、`/aidlc --doctor` を走らせ、続けて `/aidlc` と作りたいものを。

opencode には、セッション開始フックが注入する文脈の経路が無いので、素の `/aidlc` 起動ではスキルが読み取り専用の status 探査を一度します。既存のワークフローには標準の Resume / Redo / Jump / Start Fresh メニューが出ます。`/aidlc --resume` は探査もメニューも飛ばして直接続けます。

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
bun .aidlc/tools/aidlc-utility.ts doctor    # all checks pass on a fresh copy
opencode run --command aidlc -- "--status"  # /aidlc --status through the harness
```

doctor の opencode 固有検査: `.opencode/plugin/` にアダプタプラグインがあること、プロジェクトルートに `opencode.json` か `opencode.jsonc` があること、`.opencode/command/aidlc.md` があること。
