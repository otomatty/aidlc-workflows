# GitHub Copilot で AI-DLC を動かす（CLI + VS Code）

`dist/copilot/` は、フレームワークのハーネス配布の一つで、対象は **GitHub Copilot** です。1 回の導入で Copilot の面が両方使えます。単体の Copilot CLI（`copilot`）と、VS Code の agent mode です。GitHub は両者のプロジェクト発見パスを揃えました（`.github/skills/`、`.github/agents/`、`.github/hooks/`、ルートの `AGENTS.md`）。なのでフレームワークも、両方が読む木を 1 本だけ出荷します。決定論的なコアは一つ、ハーネスは複数。エンジン、状態機械、監査ログ、グラフ、スウォームの審判、ラーニングゲートは、どの配布でもバイト一致です。違うのはシェルだけです。この木は `core/` + `harness/copilot/` から `bun scripts/package.ts copilot` で **生成** されます。手で編集しないでください（ドリフト検査が CI で落ちます）。

## 配置: エンジンディレクトリと .github シェル

- **`.aidlc/`** — AIDLC のエンジントリー（ツール、フック + Copilot アダプタ、エージェント、ナレッジ、スコープ、センサー、aidlc-common）。Copilot のどちらの面もここは走査しません。人が見るものはすべて `.github/` に乗ります。
- **`.github/`** — ネイティブに消費される、`aidlc` 名の出力だけ。フック配線（`hooks/aidlc.json`）、ペルソナのカスタムエージェント 14 体（`agents/aidlc-*-agent.md`）、スキルツリー一式（`skills/aidlc*/` — オーケストレータ、ステージごとのランナー、スコープランナー、セッションスキル）。リポジトリ自身の `.github/`（workflows、templates）は触りません。導入はこれらのファイルを **マージ** します。接頭辞で衝突しません。

<a id="prerequisites"></a>

## 前提条件

- **Copilot CLI ≥ 1.0.74 かつ／または VS Code ≥ 1.130** — 確認済みの下限です。PascalCase のフック登録（両面が同じ snake_case ペイロードを渡す）、ブロックする PreToolUse の deny 経路、ブロックする Stop フック、`.github` のスキル／エージェント発見。確認は `copilot --version` / `code --version`。（VS Code の agent hooks は Preview 機能です。doctor が下限を固定します。）
- **bun** — どのハーネスでも同じです。ツールとフックはすべて bun で走ります。Copilot が起動するシェルの PATH に bun が必要です。
- **フォルダ信頼** — リポジトリフックが走るのは、プロジェクトの絶対パスが `~/.copilot/config.json` の `trustedFolders` にあるときだけです（CLI は初回の対話で聞きます）。ヘッドレスの `copilot -p` では、さらに `GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=1` が必要です。**未信頼だと、どのフックも警告なしで静かに no-op します** — 両方を見る面は `/aidlc --doctor` です。
- **モデルプロバイダ** — この導入はモデルをピンしません。サインイン済みの Copilot はそのまま動きます。BYOK は GitHub 認証なしでも動きます（例: Amazon Bedrock の Anthropic 互換エンドポイント: `COPILOT_PROVIDER_BASE_URL=https://bedrock-runtime.<region>.amazonaws.com/anthropic`、`COPILOT_PROVIDER_TYPE=anthropic`、bearer トークン、そして `COPILOT_MODEL=<catalog name>` + `COPILOT_PROVIDER_WIRE_MODEL=<Bedrock model id>` — `copilot help providers` が集合を書いています）。VS Code ではモデルピッカーか Custom Endpoint プロバイダを使います。

## インストール

下のコピーは、[aidlc-workflows](https://github.com/awslabs/aidlc-workflows) リポジトリを `main` ブランチで clone した場所から実行します:

```bash
git clone --branch main https://github.com/awslabs/aidlc-workflows.git
cd aidlc-workflows
```

1. 配布をプロジェクトへコピーします:

   ```bash
   mkdir -p your-project/.aidlc your-project/aidlc your-project/.github
   cp -R dist/copilot/.aidlc/.  your-project/.aidlc/
   cp -R dist/copilot/aidlc/.   your-project/aidlc/    # the workspace shell — a sibling of .aidlc/, not inside it
   cp -R dist/copilot/.github/. your-project/.github/  # MERGE — everything is aidlc-prefixed, nothing of yours is overwritten
   cp dist/copilot/AGENTS.md    your-project/AGENTS.md # or merge into yours — keep the @-import block (the method include)
   ```

2. ワークフローを始める前に、出荷の `AGENTS.md` の 「Git Integration」節から `.gitignore` エントリを入れてください（クローンごとの監査シャードは意図してコミットします。カーソルとマシンローカルのランタイムは無視したままです）。

3. フォルダを信頼します。プロジェクトで `copilot` を一度対話起動し、信頼プロンプトを受け入れる（または `~/.copilot/config.json` の `trustedFolders` にプロジェクトの絶対パスを足す）。

4. `/aidlc --doctor` を走らせ、続けて `/aidlc` と作りたいものを。どちらの面でも同じです。

## このハーネスで違うところ

- **1 回の導入で面は 2 つ。** スキル、ペルソナ、指示、フックは CLI と VS Code agent mode で同じ動きです。下の差分は明示しています。
- **質問は番号付きの散文選択肢で出ます。** 両面ともネイティブのピッカーツールはありますが、ピッカーの答えはツール結果として返り、人の存在ガードが求める信頼できる `UserPromptSubmit` イベントを発火しません。セッションで選んだワークフローが有効な `Status: Running` のあいだ、マッチャー無しの PreToolUse ガードはそれらのピッカー呼び出しを拒否し、モデルに番号付き散文を出してターンを終えさせます。走っているワークフローが無いとき（完了や使えない状態も含む）は、ネイティブピッカーはそのままです。人が次に打つチャットメッセージが存在になります。正本は `[Answer]:` タグ付きの questions ファイルです。
- **フックはネイティブに強制します。** アダプタ（`.aidlc/hooks/aidlc-copilot-adapter.ts`、配線は `.github/hooks/aidlc.json`）は、コアのガードによるブロックを Copilot の `permissionDecision: deny` に変換します。レビュアーの読み取り範囲と状態遷移ガードは、実際にツール呼び出しを拒否します。SessionStart と Stop の応答は、CLI のトップレベルフィールドと、VS Code が求める `hookSpecificOutput` 封筒の両方を持ちます。
  CLI では実機確認済みです。VS Code agent mode では同じ deny／block 経路が文書化されており、アダプタは `runTerminalCommand`、`createFile`、`editFiles`、`readFile` などの文書上の名前を正規化しますが、IDE 側はまだ実機確認していません。IDE の強制は、確認が終わるまでベストエフォートと考えてください。
- **コマンド追跡は正確で、かつベストエフォートです。** AI-DLC が追うのは、単純で直接のオーケストレータ、ソースディスパッチャ、実コンパイル済みの `next`、`continue`、`report`、`park` です。末尾の `2>&1` は 1 つまで対応します。検査コマンドは `aidlc` 部分文字列からは分類しません。曖昧なラッパや、引数に生きたシェル展開（`$VAR`、グロブ、ブレース展開、先頭の `~`）を含むコマンドは、そのまま未追跡で走ります。フックはシェルが最終的に作る argv をハッシュできないからです。直接に見える複合コマンドは拒否します。明示の `--project-dir` が今の物理プロジェクトの外なら、今のプロジェクトの調整を書く前に拒否します。
- **継続のリプレイは、どのハーネスでもエンジンが持ちます。** Copilot も Claude、Codex、Cursor、Kiro、Kiro IDE、opencode と同じ、レコードローカルでアトミックな単回カーソルです。ネイティブのトークン検証が先に走り、エンジンがトークン全体の SHA-256 を比べ、アクティブディレクティブのロックの下で、正確な後続を stdout の前に公開します。Copilot のセッション所有と配送証拠はそのマーカーを豊かにしますが、リプレイの所有者ではありません。欠落、破損、v1、事前共有のマーカーは、同じトランザクション内で一度復旧します。新しい `next` がカーソルをリセットします。クラッシュ、移行、ロールバック、ファイルシステムの上限は、Developer Reference の共有カーソル契約を見てください。
- **Stop は、いま配送済みの Copilot ディレクティブを保ちます。** ホストの正確な `tool_use_id`、または書き換えられたエンジン入力を通して運ばれ PostToolUse が返すアダプタ ID があれば、セッション範囲の Stop と Resume の配送を確定できます。正確な相関が取れなければ、実行は未追跡で通し、Post は推測しません。単純な新しい `next` が追跡配送を戻します。相関の喪失が恒久的な deny にはなりません。クレームを一度試みたあと、プロジェクト、状態、セッション所有の拒否は明示の deny です。別セッションが、所有者の今のトークンを未追跡の仕事として実行することはできません。
- **レガシーの Resume と会話待ちはセッション範囲です。** Stop は、本物の会話応答がきれいに終わるのを許します。2.6.19 より前の導入が書いた Resume マーカーは所有者範囲のままです。明示の `next --resume` がそれを上書きし、直接続けます。プロンプト本文とルール内容は、調整マーカーには残りません。
- **ホスト証拠の範囲は意図して限っています。** 書き換えと運ばれた ID のエコーは、macOS の Copilot CLI 1.0.79、非対話モードで実機確認しています。VS Code の `tool_use_id`、`updatedInput`、`tool_response` 経路は、文書化された Preview 契約からカバーしていますが、ここでは実機確認していません。Copilot cloud agent は、このリリースの対応 AI-DLC 面の外です。
- **フック配線は設計上マッチャー無しです。** VS Code はフックマッチャーをパースしますが **無視** します。なのでアダプタの各対象は `tool_name` で自己フィルタします。マッチャーを付けると、IDE では静かに対象が広がります。
- **レビュアーの身元は配送ではなく相関です。** PreToolUse ペイロードに呼び出しごとのエージェント欄はありません。アダプタは SubagentStart/SubagentStop（VS Code の `agent_type`/`agent_id` も含む）で委譲を括り、サブエージェントがちょうど 1 体だけ生きているときに身元を転送します。重なりが曖昧なら、その呼び出しはフェイルオープンです（レビュアーモジュールの散文境界は効いたままです）。
- **ペルソナに `model:` ピンはありません。** 二つの面でモデル値の構文が違います（CLI は frontmatter 文字列を BYOK プロバイダへそのまま転送し、IDE の表示名はそこで 400 になります）。エージェントはセッションモデルを継ぎます。このハーネスのティア投影は、型としてモデル省略です。
- **ワーカーペルソナは明示の組み込み `tools:` 許可リストを使います。** Copilot の `agent` 委譲ツールを外し、ネストした委譲を止めます。Copilot には agent 以外全部、という形が無いので、委譲されたワーカーは任意の MCP ツールを継ぎません。
- **AIDLC プラグインは Copilot ネイティブの面を使います。** 合成したプラグインペルソナと、生成したステージ／スコープランナーは `.github/{agents,skills}` に落ちます。プラグイン選択はそれらのパスを再生成し、`.aidlc/skills` や `.opencode/agents` は作りません。
- **セッション終了:** VS Code は SessionEnd を文書化していないので、共有フックマニフェストは両ホストでそれを出しません。アダプタは次の SessionStart で直前セッションを、推定した出自付きで突き合わせます（codex と同じ型です）。
- **方法論の include は AGENTS.md の `@`-import に乗ります**（CLI では実機確認済み。VS Code は `@`-import 展開を文書化していますが、そちらではまだ実機確認していません）。`/aidlc space <name>` はブロックをその場で差し替えます。`.github/agents/` のペルソナ双子も含みます。
- **ステータスラインはありません。** `/aidlc --status` と、ゲートの進捗行を使ってください。
- **Construction スウォームはサブエージェントの fan-out だけです**（`AIDLC_USE_SWARM=1` は目立つ no-op です）。
- **MCP:** 同梱はありません。サーバーを足すなら、面がここで分かれます。CLI は `~/.copilot/mcp-config.json`、VS Code は `.vscode/mcp.json` を読みます。コンダクターは使えますが、委譲されたワーカーペルソナは使えません。

## 確認

```bash
cd your-project
copilot -p "/aidlc --doctor" -s --allow-all-tools   # or run /aidlc --doctor in VS Code chat
```

doctor はエンジントリー、アダプタの依存すべて、ルートの `AGENTS.md`、`.github` の配線ファイル、CLI のバージョン下限、フォルダ信頼を見ます。ヘッドレス用の環境変数も思い出させます。このハーネスの決定論的エンジンテストは `tests/unit/t248-copilot-packaging.test.ts`、`t249-copilot-adapter.test.ts`、`t250-copilot-adapter-security.test.ts` です。実機の通しは `tests/e2e/t-exec-copilot-status.serial.test.ts` で、`AIDLC_COPILOT_EXEC_LIVE=1` でゲートします。
