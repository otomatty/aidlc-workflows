# Codex CLI で AI-DLC を動かす

`dist/codex/` は、フレームワークのハーネス配布の一つで、OpenAI **Codex CLI** ハーネス向けです。決定論的なコアは一つ、ハーネスは複数。エンジン、状態機械、監査ログ、グラフ、スウォームの審判、ラーニングゲートは、どの配布でもバイト一致です。違うのはシェルだけです。この木は `core/` + `harness/codex/` から `bun scripts/package.ts codex` で **生成** されます。手で編集しないでください（ドリフト検査が CI で落ちます）。

<a id="prerequisites"></a>

## 前提条件

- **Codex CLI ≥ 0.145.0** — それより前のリリースは、ターン途中の自動コンパクションのあと compact 由来の `SessionStart` を遅らせるので、復元したワークフローの使命無しでモデルの継続が 1 回走ることがあります。0.139.0 より前は、サブエージェントの役割帰属とハイフン付きエージェント TOML の解決も信頼できません。`/aidlc --doctor` がピンを強制します。確認は `codex --version`。
- **bun** — Claude ハーネスと同じです。ツールとフックはすべて bun で走ります。
- **モデルプロバイダ** — 出荷の `config.toml` の既定は **Amazon Bedrock**（`openai.gpt-5.5`。エージェントは `openai.gpt-5.6-terra`）です。AWS のプロファイル／リージョンは `[model_providers.amazon-bedrock.aws]` に設定します。OpenAI 認証なら、プロバイダ行をコメントアウトしてください。注意: Bedrock では `web_search` は使えません。市場調査ステージは静かに劣化します。

## インストール

下のコピーは、[aidlc-workflows](https://github.com/awslabs/aidlc-workflows) リポジトリを `main` ブランチで clone した場所から実行します:

```bash
git clone --branch main https://github.com/awslabs/aidlc-workflows.git
cd aidlc-workflows
```

1. 配布をプロジェクトへコピーします（プロジェクトは **git リポジトリ** である必要があります。Codex がプロジェクトの `.codex/hooks.json` を見つけるのはその中だけです）:

   ```bash
   cp -r dist/codex/.codex/  your-project/.codex/
   cp -r dist/codex/.agents/ your-project/.agents/
   cp -r dist/codex/aidlc/   your-project/aidlc/      # the workspace shell (spaces/default/memory) — a sibling of .codex/, not inside it
   cp dist/codex/AGENTS.md   your-project/AGENTS.md   # or merge into yours
   ```

   `aidlc/` ディレクトリはワークスペースシェルです。エンジンが読む、あらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリーを出荷します。`.codex/` の **兄弟** なので、別途コピーします（または `dist/codex/` 一式をまとめてコピーします）。無いと `$aidlc --doctor` の "workspace shell ready" 検査が落ちます。

2. ワークフローを始める **前に**、出荷の `AGENTS.md` の 「Git Integration」節から `.gitignore` エントリを入れてください。各インテントの `audit/` の下のクローンごとの監査シャードは意図してコミットします（クローンごとに自分の `<host>-<clone>.md` を書くので、並行追記が git 衝突しません）。ユーザーごとのカーソルとマシンローカルのランタイム状態は無視したままです。

3. プロジェクトを信頼し、フック信頼を事前シードします。Codex は未信頼のフックを走りません（`--dangerously-bypass-hook-trust` フラグでも走りません）。対話 TUI を一度走らせ、フックダイアログで "Trust all and continue" を選ぶか、AI-DLC のソースチェックアウトから決定論的に事前シードします。ピンした開発依存を一度入れ、エントリを生成します:

   ```bash
   bun install --frozen-lockfile
   bun scripts/package.ts codex trust --project "/abs/path/to/your project"
   ```

   コマンドは `$CODEX_HOME/config.toml` へ貼れる `[hooks.state]` エントリを出します（ハッシュがカバーするのはフックの身元であり、パスではありません。出荷の `hooks.json` に対してエントリは正確です）。コマンドは出力全体を TOML として直列化するので、引用パス、空白、Windows のバックスラッシュは残ります。フックマニフェストが `<project>/.codex/hooks.json` に無いときは、正確なパスを明示してください:

   ```bash
   bun scripts/package.ts codex trust \
     --project "/abs/path/to/your project" \
     --hooks-json "/abs/custom path/hooks.json"
   ```

   両方の引数をシェルで引用してください。`--hooks-json` は Codex の信頼身元としてそのまま使います。エントリを生成したあと正規化したり置き換えたりしないでください。コマンドの stdout 全体をユーザー設定へ貼ります。同じ `hooks.json` パスのエントリが既にあるときは、その集合をまるごと置き換えてください。二通目を足さないでください。重複する TOML テーブルは設定全体を無効にします。

   AI-DLC のアップグレードが `.codex/hooks.json` を変えたとき（新しいマッチャーを足すアップグレードも含む）は、この trust コマンドを再実行してください。新しい Codex セッションを開く前に古いテーブルを置き換えます。そうしないと Codex は新しいフックを静かに飛ばします。

4. `your-project/` に戻ります（手順 3 は AI-DLC のソースチェックアウトから走りました）。出荷の `.codex/config.toml` を `~/.codex/config.toml` へマージします（プロジェクト単位のままでも構いません。信頼したプロジェクトはそれを読みます）。確認は次です:

   ```bash
   cd your-project
   bun .codex/tools/aidlc-utility.ts doctor
   ```

## 使い方

オーケストレータの起動は `$aidlc`（または `/skills` → aidlc）のあとにスコープか説明です。コマンドは Claude ハーネスと同じです（`$aidlc --status`、`$aidlc --help`、…）。ステージランナーは明示だけです: `$aidlc-domain-design`、`$aidlc-bugfix` など（暗黙のスキル照合から外してあるので、ランナー説明 37 件が索引を汚しません）。

## Claude Code とのハーネス差分

- **ゲート** は、出荷設定のフラグが有効なら `request_user_input` ツールで出します。それ以外は番号付き散文へ落ちます（番号か自由文で答える）。ゲートの意味はどちらでもエンジン側にあります。
- **カスタムステータスラインはありません** — ワークフローの位置は `update_plan` ツール（`task-progress` ステータスライン項目）と `$aidlc --status` に乗ります。
- **サンドボックス下の git**: `workspace-write` は設計上、サンドボックス内の `.git` を読み取り専用にします。対話セッションは自動で昇格し、出荷の `.codex/rules/default.rules` は `git worktree`／`commit`／`add` を事前許可します。ヘッドレス実行（CI、exec ワーカー）は `writable_roots = ["<main repo>/.git"]` が要ります。テンプレートは出荷の `config.toml` にあります（リンクした worktree は `<main>/.git/worktrees/*` へ解決するので、メインリポジトリの `.git` である必要があります）。
- **スウォームフロア = `codex exec` ワーカー** — 出した Construction Unit ごとに、その Unit の Bolt の隔離 worktree でヘッドレスワーカーが 1 体（常に `< /dev/null`）。審判は同じ決定論的なものです。ここには Workflow ツールが無いので `AIDLC_USE_SWARM=1` は目立つ劣化です（`SWARM_DEGRADED` が監査されます）。
- **セッション寿命**: Codex に SessionEnd イベントはありません。閉じていないセッションは、次のセッション開始で推定した `SESSION_ENDED` 監査行として突き合わせます。コンパクションのあと、Codex は `source=compact` の SessionStart を出します。この対応イベントが、コンパクション後の最初の継続の前にワークフローの使命を再注入します。この即時ドレインが、AI-DLC が Codex >= 0.145.0 を求める理由です。
- **成果物監査の忠実度**: ヘッドレスの `codex exec` では、モデルがシェル heredoc でファイルを書くことが多く、`apply_patch` フックマッチャーを迂回します。`ARTIFACT_*` 行は疎になりえます。対話 TUI セッション（システムプロンプトが `apply_patch` を義務付ける）が高忠実度の監査モードです。
- **AIDLC のルール層** はワークスペースルートの `aidlc/spaces/<active-space>/memory/` にあります（手で直せる正本は一つ、どのハーネスでも同じ）。`config.toml` の `AIDLC_RULES_DIR` 環境継ぎ目が解決先をそこへ向け、オーケストレータは `@aidlc/spaces/<active-space>/memory/...` のプロンプト言及を注入します。Codex ネイティブの `.codex/rules/` は Starlark の権限ルールで、AIDLC 方法論とは別物です。
- **ウェルカムメッセージはありません**: Claude ハーネスはセッション開始時に `settings.json` の `companyAnnouncements` からフェーズ／ステージ／スコープのオンボーディングバナーを描きます。Codex に同等はありません。セッション開始の経路はワークフロー文脈だけを注入します。
- **MCP サーバー**: Codex は `config.toml`（プロジェクトの `.codex/config.toml` または `~/.codex/config.toml`）の `[mcp_servers.<name>]` テーブルから MCP 定義を読みます。必要なサーバーはそこに足してください。出荷設定は **無し** です（Claude ハーネスは `.mcp.json` で 5 つ出荷。Codex の既定はゼロ）。

## 再生成

```bash
bun scripts/package.ts codex          # regenerate dist/codex from core/ + harness/codex/
bun scripts/package.ts --check        # CI drift guard (every harness)
```

コアの `.ts` ファイルは `core/tools/` と `core/hooks/` のソースとバイト一致です（`tests/unit/t150-codex-packaging.test.ts` がピンします）。散文はパッケージャが `.codex` に置換する `{{HARNESS_DIR}}` トークンを持ちます（加えて `rules/` → `aidlc-rules/` の名前付け替え）。許された変換クラスはこれだけです。実機の通しは `tests/e2e/t-exec-codex-status.serial.test.ts` です（ゲート: `AIDLC_CODEX_EXEC_LIVE=1`）。

## 次のステップ

入れて信頼できましたか。方法論はどのハーネスでも同じです。ハーネス非依存の章へ進んでください。

- [最初のワークフロー](../02-your-first-workflow.md) — 注釈付きの通し実行。
- [フェーズとステージ](../04-phases-and-stages.md) — 5 フェーズと 33 ステージ。
- [スコープ・深度・テスト戦略](../05-scopes-and-depth.md) — 実行の大きさの合わせ方。
- [用語集](../glossary.md) — 用語の定義。

ほかのハーネス: [Kiro IDE で AI-DLC を動かす](kiro-ide.md) · [Cursor で AI-DLC を動かす](cursor.md) · [ハーネス一覧](README.md)。
