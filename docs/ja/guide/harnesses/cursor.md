# Cursor で AI-DLC を動かす

`dist/cursor/` は、フレームワークのハーネス配布の一つで、対象は [Cursor](https://cursor.com) です。1 本の木が **Cursor IDE** と **Cursor CLI**（`agent`）の両方に効きます。読む `.cursor/` の発見は同じです。決定論的なコアは一つ、ハーネスは複数。エンジン、状態機械、監査ログ、グラフ、スウォームの審判、ラーニングゲートは、どの配布でもバイト一致です。違うのはシェルだけです。この木は `core/` + `harness/cursor/` から `bun scripts/package.ts cursor` で **生成** されます。手で編集しないでください（ドリフト検査が CI で落ちます）。

## 配置

Cursor はいまのところいちばん「ネイティブ」な移植です。標準のコア投影をそのまま消費します（`emit.ts` も、分割したドットディレクトリもありません）。配布は次です。

- **`.cursor/`** — フレームワークの木。Cursor がネイティブの意味で読むサブディレクトリは一部だけです。`rules/`（常設 1 とフェーズ方法論ポインタ 4）、`agents/`（ネイティブサブエージェントとしてのペルソナ 14 体）、`skills/`（オーケストレータ、ユーティリティショートカット、生成したステージランナー）、`hooks.json` + `hooks/`（フック配線とアダプタ）、`cli.json`（権限）、`mcp.json`（MCP サーバー。足した場合）。隣のエンジンディレクトリ（`tools/`、`aidlc-common/`、`knowledge/`、`sensors/`、`scopes/`）は Cursor にとっては惰性のデータで、同じディレクトリを安全に共有します。
- **`aidlc/`** — ワークスペースシェル（エンジンが読む、あらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリー）。`.cursor/` の兄弟です。
- **`AGENTS.md`** — プロジェクトルートの常設指示。Cursor が自動で読みます。

<a id="prerequisites"></a>

## 前提条件

- **Cursor** — IDE、または Cursor CLI（入れ方は `curl https://cursor.com/install -fsS | bash`。起動は `agent`）。どちらもこの導入の `.cursor/` 面を読みます。確認済みは cursor-agent 2026.07。フック（`.cursor/hooks.json`）とスキル（`.cursor/skills/`）は現行ラインの機能です。
- **bun** — どのハーネスでも同じです。ツールとフックはすべて bun で走ります。Cursor が起動するシェルが見える PATH に `bun` が必要です。
- **名前付きモデルには有料の Cursor プラン** — Free アカウントが使えるのは `Auto` だけです。ティア付きペルソナの面は **モデルピン無し** で出荷します（Cursor では全ティアが null へ投影します。モデルの可用性はプラン次第です）。どのエージェントもセッションモデルを継ぎます。ヘッドレス CLI で `--model` を渡す実行は、それを許すプランが要ります。Bedrock BYOK は IDE だけです。Pro は静的キー、Teams は IAM ロール（Cursor のモデル設定に対する文書確認であり、ここでは実機確認していません）。CLI はモデルを Cursor 自身のバックエンド経由で回します。

## インストール

1. 配布をプロジェクトへ入れます:

   ```bash
   bun dist/cursor/install.ts your-project
   ```

   インストーラはコピー全体を事前点検し、プロジェクト所有の衝突は拒否し、`.cursor/.gitignore` と既存の方法論メモリは残し、`.cursor/hooks.json` と `.cursor/cli.json` は構造マージし、既存の `AGENTS.md` と `.gitignore` には印付きの AI-DLC 節を足して置き換えません。フレームワーク所有は `.cursor/aidlc-install.json` に記録します。再実行は管理ファイルを上げつつ、`aidlc/active-space` と明示のプラグイン選択／合成状態を残し、そのスペースを変更可能なルールとペルソナポインタすべてへ再適用します。削除から戻したファイルも含みます。プラグイン合成のステージファイルが残るのは、寄与サイドカーか seam sentinel がそのステージを識別するときだけです。インストーラは残した管理パスをすべて出します。無関係なコアステージは、通常の receipt-hash 衝突／アップグレード処理へ進みます。
   `aidlc/` シェルは、エンジンが読むあらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリーを出荷します。無いと `/aidlc --doctor` の "workspace shell ready" 検査が落ちます。

2. プロジェクトを Cursor IDE で開く（またはその中で `agent` を始める）と、`/aidlc --doctor` を走らせ、続けて `/aidlc` と作りたいものを。ネイティブのユーティリティショートカットは `/aidlc-status`、`/aidlc-jump --stage <slug>`（または `--phase <name>`）、`/aidlc-scope <name>` です。

## このハーネスで違うところ

- **質問は番号付きの散文選択肢で出ます**（構造化質問ウィジェットはありません）。正本は `[Answer]:` タグ付きの questions ファイルです。
- **フックは `.cursor/hooks.json` に乗ります。** AIDLC アダプタ（`.cursor/hooks/aidlc-cursor-adapter.ts`）が Cursor の camelCase フックイベント（`sessionStart`、`sessionEnd`、`beforeSubmitPrompt`、`preToolUse`、`postToolUse`、`postToolUseFailure`、`preCompact`、`stop`）を、バイト共有のコアフック本体（bun サブプロセスとして走る）へ写します。人のターンごとの人のターン記録、ツール実行前の状態遷移・レビュアー読み取り範囲・レビュー凍結・計画承認ガード、write／edit の監査 + センサー、失敗した Task の帰属掃除、シェルでのステージグラフ再構築、コンパクション前の状態検証。**PreToolUse ガード** は Cursor の `{"permission":"allow"|"deny"}` stdout 経路で答えます（`deny` は `agent_message` を足せます）。登録は `failClosed: true` です。空の stdout は不正な JSON なので、IDE は呼び出しを止めます。壊れた入力、無いガード、クラッシュしたガードも操作を拒否します。Cursor はシェルツールを `Shell` と呼びます。アダプタはそれをコアフックの `Bash` へ写します。Cursor の第一級 `Delete` ツール（このハーネス固有 — ほかでは削除はシェル経由）は、レビュアー範囲ガードへ書き込みとして出します。ユニット範囲のレビュアーが兄弟ユニットの成果物を消せないようにするためです。シェルペイロードの入れ子 `cwd`／`working_directory` 欄は共有ガード契約へ昇格するので、相対の読み書きは Cursor が実行する場所で検査されます。
- **転送ループの強制は advisory です。** Cursor の `stop` フックは stop を拒否できないので、コアフックが `block` と答えたとき、アダプタはフォローアップの nudge を出します（opencode と同じ姿勢です）。ホストの `loop_limit` は Cursor 既定の 5 ではなく 10 で、コアの自律 no-progress 上限 8 をカバーします。本物の規律はコンダクタースキルの転送ループです。
- **本物のセッション終了の瞬間があります**（Codex と違う）: `sessionEnd` が発火するので、`SESSION_ENDED` 監査イベントが出ます。コンパクション前の検証も発火します（`preCompact`）。
- **ペルソナはネイティブサブエージェントです。** `.cursor/agents/` のペルソナ `.md` 14 ファイルは frontmatter の `name` で発見されます。コンダクターはほとんどのステージでインラインにまとい、サブエージェントステージ 2 つ（2.1 reverse-engineering、3.5 code-generation）では `task` ツールで委譲します。ワーカーエージェントに `task` ツールは付かないので、デリゲートは再委譲できません。
- **サブエージェントの身元は再構成します。** Cursor はフックペイロードにサブエージェントごとの身元を出しません（文書上の `subagentStart`／`subagentStop` イベントは、CLI では一度も発火しません）。なのでアダプタは、保護したプロジェクトローカルのランタイム台帳 `aidlc/.aidlc-cursor-subagents/` と、独立した `aidlc/.aidlc-cursor-subagent-*.json` のアクティブ委譲証人を持ちます。トップレベルの会話は `sessionStart`／`beforeSubmitPrompt` で自分を登録します（サブエージェントの会話にはどちらのイベントも来ません）。各 Task 起動がエージェントを記録し、レビュアー読み取り範囲の強制は、トップレベルセッションとして登録されていない会話からの呼び出しに帰属します。親の次の同期 Task ディスパッチが、直前の記録を引退させてログします（Cursor CLI は Task の `postToolUse` を出しません）。本物の親をまたぐ曖昧さは、レビュアーが生きているあいだ保守的なままです。レビュアー範囲の強制を殺せないようにするためです。委譲されたツールは台帳にもディスパッチ記録にも届きません。祖先削除や、引用していないシェルグロブ／文字クラスパス経由も含みます。主台帳が無い、または読めないときに委譲証人が生きていれば、委譲エージェントの帰属を失うよりフェイルクローズします。デリゲートは普通の Shell コマンドは使えますが、汎用インタプリタと動的なコマンド評価は拒否します。Cursor ネイティブの read／search ツールを使い、実行可能な探査は親の会話に任せてください。
- **生成したステージ／スコープランナーは明示だけです。** Cursor は生成ランナースキル（プラグインランナーも含む）に `disable-model-invocation: true` を付けるので、普通のコーディングプロンプトが状態を変えるワークフローショートカットを自動起動しません。
- **ユーティリティショートカットはネイティブスキルです。** `/aidlc-status`、`/aidlc-jump`、`/aidlc-scope` はスラッシュメニューの発見を良くし、エンジン経路を二つにしません。どれも `disable-model-invocation: true` を持ちます。Cursor が起動するのは、人が選んだときだけです。レガシーの `.cursor/commands/` 面は出荷しません。
- **方法論ルールは読み取り指示であり、import ではありません。** Cursor のルールは `@`-import 行を展開しません。`.cursor/rules/aidlc.mdc` は常に適用され、アクティブスペースの org／team／project ファイルを指します。`.cursor/rules/aidlc-phase-*.mdc` 4 本はエージェントが決めて、当たるときだけ対応するフェーズファイルを指します（cursor-agent で実機確認済み: フェーズを枠にしたプロンプトは一致するフェーズルールだけを載せ、無関係なプロンプトはどれも載せません）。`sessionStart` フックは別に、生きているワークフロー文脈を注入します。`/aidlc space <name>` はルールファイル 5 本をその場で差し替えます。
- **Construction スウォームは task ツールの fan-out だけです**（`AIDLC_USE_SWARM=1` は目立つ no-op — Workflow ツールはありません）。
- **ステータスライン／ウェルカムメッセージはありません** — `/aidlc-status`（または `/aidlc --status`）と、ゲートの進捗行を使ってください。
- **Tab 補完はこの導入では触りません** — 設定に関係なく Cursor 自身のモデルに乗ります。
- **権限**: `.cursor/cli.json` が事前承認するのは `Shell(bun)` だけです（プロジェクト単位の `cli.json` が運ぶのは権限だけ）。ほかのシェルコマンドは Cursor の承認設定に従います。
- **MCP サーバー**: 同梱はありません。必要なら `.cursor/mcp.json` の下に自分で設定してください。
- **ヘッドレスの `agent -p` 実行は承認ゲートを越えられません。** 人の存在 mint は `beforeSubmitPrompt` に乗ります。Cursor がこれを発火するのは対話の送信だけです（cursor-agent 2026.07 で確認済み）。なので print モードの実行は `HUMAN_TURN` を残さず、ゲート付きステージはその承認を設計どおり拒否します。無人のモデルが自分の仕事を承認しないためです。ヘッドレスは読み取り専用ユーティリティ（`--status`、`--doctor`、`--version`）と、自律 Construction（ゲートに人がいないので免除）に使ってください。ゲート付きワークフローは対話の Cursor セッションで走らせます。これはフレームワークの存在ゲートの性質であり、Cursor の制限ではありません。どのハーネスも人のプロンプトイベントから存在を発行します。

## 導入の確認

```bash
bun .cursor/tools/aidlc-utility.ts doctor        # all checks pass on a fresh copy
agent -p "/aidlc --status" --output-format text --trust   # /aidlc --status through the CLI
```

doctor の Cursor 固有検査: `.cursor/hooks.json` のフック配線、`.cursor/cli.json` の `Shell(bun)` 権限事前承認、`.cursor/rules/aidlc.mdc` の常設ルール、フェーズルールポインタ 4 本すべて。

> **スクリプティングの罠: Cursor CLI は常に exit 0 です。** ヘッドレスの `agent -p "<prompt>" --output-format text --trust` は、実行がエラーでも exit code 0 を返すので、CI 検査は exit status ではなく出したテキストを見なければいけません。名前付きモデル（`--model`）には有料プランが要ります。無ければ `Auto` を使ってください。

## 次のステップ

入れて確認できましたか。方法論はどのハーネスでも同じです。ハーネス非依存の章へ進んでください。

- [最初のワークフロー](../02-your-first-workflow.md) — 注釈付きの通し実行。
- [フェーズとステージ](../04-phases-and-stages.md) — 5 フェーズと 33 ステージ。
- [スコープ・深度・テスト戦略](../05-scopes-and-depth.md) — 実行の大きさの合わせ方。
- [用語集](../glossary.md) — 用語の定義。

ほかのハーネス: [opencode で AI-DLC を動かす](opencode.md) · [ハーネス一覧](README.md)。
