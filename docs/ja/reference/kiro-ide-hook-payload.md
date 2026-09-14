# Kiro IDE フックペイロード — 実測リファレンス

Kiro IDE がコマンドフックへ文脈をどう届けるか。0.12-main で生きて捉えたもの（stdin、argv、環境全体をダンプしたプローブ `.kiro.hook` ファイル）、1.0.165（プローブ v2 フック JSON ファイル。上流 #543 / #555）、1.0.242（Windows 上の UserPromptSubmit と PreToolUse プローブ）。これが `harness/kiro-ide/` アダプタの証拠基盤です。CLI ハーネス（`harness/kiro/`）は違う、kiro-cli 形の stdin 仕組みを使います。

伏せたネイティブ Windows の前後キャプチャは [`research/kiro-windows-output-encoding/`](research/kiro-windows-output-encoding/) に残しています。

## チャネルは IDE 世代をまたいで変わった

| | Kiro IDE 0.12 | Kiro IDE 1.x（≥1.0.1xx） |
|---|---|---|
| フック登録 | `.kiro/hooks/*.kiro.hook`（`{"version":"1.0.0","when":{...},"then":{...}}`） | `.kiro/hooks/*.json` v2 スキーマ（`{"version":"v1","hooks":[{name,trigger,matcher,action}]}`、PascalCase トリガー）。レガシー `.kiro.hook` ファイルは **黙って惰性** — 決して実行されない |
| 文脈チャネル | `USER_PROMPT` 環境変数（JSON 文字列） | **stdin**（JSON、書いて閉じる）。`USER_PROMPT` は空で届く |
| stdin の振る舞い | 開くが決して書いて閉じない — 裸の読みはハング | 書いて閉じる — 読みはすぐ解決 |
| フィールド名 | camelCase: `{ toolName, toolArgs, toolResult, toolSuccess }` | snake_case: `{ session_id, hook_event_name, cwd, tool_name, tool_input, tool_response }` — **成功フラグ無し** |

生きた 1.0.165 PostToolUse キャプチャ、フィールドそのまま:

```json
{"session_id":"sess_…","hook_event_name":"PostToolUse","cwd":"/path/to/project","tool_name":"execute_bash","tool_input":{},"tool_response":"Output:\n…\nExit Code: 0"}
```

アダプタは空でない `USER_PROMPT` をすぐ使います（0.12 チャネル。stdin は決して閉じない）。その変数が空のときは、壊れたチャネルのタイムアウトと競争して 1.x チャネル向けに stdin を読みます。本番既定は 2s。正の `AIDLC_IDE_STDIN_TIMEOUT_MS` 値は診断と決定論的な遅延テスト向けに天井をミリ秒で上書きします。両方のフィールド綴りを受け入れます。取得はペイロード依存のターゲットにゲートします。`plan-approval-guard`、終端コマンドターゲット 2 つ、現代の `session_id` 向けの `session-start` と `continue-workflow`、正確な承認応答向けの `record-human-turn` を含みます。ほかのどのターゲット（ツール呼び出しごとの承認床を含む）もどちらのチャネルにも触れず、ゼロ遅延の経路を保ちます。

レガシー環境変数名は生の利用者テキストを意味しません。測定した 0.12 契約は camelCase JSON です。だから `prompt` フィールドが無い promptSubmit ペイロードはレガシーのターン時計だけを進めます。終端ユーティリティは、一致する preToolUse イベントの `toolArgs.command` からあとで認識されます。生の `/aidlc ...` テキストは、それを直接出す新しい Kiro 世代向けに受け入れられたままですが、0.12 互換の主張ではありません。

`VSCODE_IPC_HOOK` / `VSCODE_PID` も IDE にあります（CLI には無い）。レガシー Plan Approval はそれらの測定したホストインスタンス値を実行時セッション身元へハッシュするので、1 ワークスペースの 2 つの IDE ウィンドウが challenge / response ファイルを共有しません。ほかのアダプタルーティングはそれでも上のペイロードチャネルをキーにします。

## イベントごとのキャプチャ

結果散文は両チャネルで同一です（0.12 では `toolResult`、1.x では `tool_response`）:

| イベント | ツール名 | ツール入力 | 結果散文 | 復元できるか |
|-------|-----------|-------------|--------------|--------------|
| UserPromptSubmit（1.0.242） | n/a | `{prompt:""}` | n/a | prompt: 不可。セッション id: 可 |
| PreToolUse（shell、1.0.242） | `execute_pwsh` | `{command,cwd,run_in_background,timeout}` | n/a | command: 可 |
| PostToolUse（write）— create | `fs_write` | `{}`（空） | `Created the <PATH> file.` | path: 結果散文からのみ |
| PostToolUse（write）— edit | `str_replace` | `{}`（空） | `Replaced text in <PATH>` | path: 結果散文からのみ |
| PostToolUse（write）— append | `fs_append` | `{}`（空） | `Appended the text to the <PATH> file.` | path: 結果散文からのみ |
| PostToolUse（shell） | `execute_bash` | `{}`（空） | `Output:\n<stdout>\n\nExit Code: 0` | command: **復元できない**（stdout のみ） |

### 致命的な制限

1. **PostToolUse の write / shell キャプチャは両チャネルでツール入力が空です。** だから書いたパスは結果散文からパースしなければならず、シェルコマンドは不在です（stdout + 終了コードだけがある）。これは普遍の IDE 規則ではなく、届けは世代横断で一様ではありません。あとの 1.x ビルドは一部の PreToolUse と委譲入力を埋めます（#543）。Issue #763 は、Kiro IDE 1.0.309 が PreToolUse サブエージェント派遣を `prompt` と `explanation` で埋め、shell / write マッチャを `command`、`cwd`、`run_in_background`、`timeout` で埋め、PostToolUse 入力も埋めたと報告します。その 1.0.309 観察は報告であり、このリポジトリでは測定していません。測定した基盤は上に書いた 0.12、1.0.165、1.0.242 キャプチャです。
2. **1.x は成功フラグを運びません。** 整形式の write を監査から落とすのは 0.12 チャネルの明示真偽 `toolSuccess: false` だけです（#417）。フィールドが無い 1.x ペイロードはパス検査へ落ちます。そのチャネルは失敗を構造として報告できないので、1.x の失敗した write はエラー散文としてだけ届きます — だからアダプタはログする前に分類します。失敗として **認識した** 散文は `hookDebug` へ送ります（フックデバッグが有効なときだけ書く）。監査する成果物が無いので、転送しないのは正しいのであり、劣化ではありません。認識しない言い回しはそれでも見えるフックドロップを記録します。それが本物の劣化を知らせる場合です。レガシー 0.12 チャネルでは、明示の `toolSuccess: true` が正本のまま、失敗散文の推論をバイパスします。実行時型が違う、存在する非 null ペイロードフィールドは壊れたものとして扱われます。advisory フックは成功で終わり、見えるドロップを記録し、監査もサブエージェントイベントも転送しません。`null` は使えないフィールドのように扱い、チャネルの既存の不在値契約に合わせます。
3. **結果散文のパスはワークスペース相対** ですが、コアフックは絶対レコードルートと比べます — だからアダプタは転送前に絶対へ解決します。

## 各フックへの帰結

- **write-audit-log / run-sensors** — 復元可能: 結果散文からファイルパスを掻き取り、絶対へ解決し、コアフックへ Claude 形の `{tool_input:{file_path}}` を渡す。パスを取り出せないとき、アダプタは両方をログするのではなく二つの場合に分けます。**失敗した** write として認識した散文は `hookDebug` へ送ります（フックデバッグが有効なときだけ書く）。成果物が無いので転送しません。この推論は、ペイロードに構造の成功フラグが無いときだけ走ります。明示の `toolSuccess: true` とほかの一致しない言い回しは見えるフックドロップを記録します（黙った no-op は決してしない）— それがドロップログが面に出す見えない劣化の場合です。それらを混ぜると、`--doctor` が健全なワークスペースで劣化を報告しました。
- **rebuild-stage-graph** — シェルコマンドは復元できないので、IDE 経路はコマンドフィルタを落とし、純粋に監査末尾でゲートします（mtime 冪等ガード付き。残った遷移 — 例: `WORKFLOW_COMPLETED` のあと — が続くどのシェルコマンドでも再コンパイルしないように）。シェル結果とセッション身元はそれでも転送します。現代イベントは正確な `session_id` を使い、レガシーチャネルは SessionStart が残したホスト由来の身元を使います。結果が成功した `intent-create` を指名するとき、共有フックはそのセッションを作ったレコードへ結びます。
- **sync-workflow-state** — IDE はタスクペイロードを出さないので、監査末尾の最新 `STAGE_STARTED` から現行ステージを導きます。これは **前方のみ** の鏡です。`Current Stage` を完了または飛ばしたステージへ巻き戻さず、ワークフローが `Running` でないときは決して発火しません（終わったワークフローの復活を防ぐ）。両方の監査末尾フックは `execute_bash`、Windows の `execute_pwsh`、`shell` 別名に一致します。IDE は sync がパースできるタスクイベントを出しません。
- **log-subagent** — ペイロード依存。IDE 0.12 は `invoke_sub_agent` を送りました。1.x（1.0.89–1.0.138）は代わりに `subagent_<agent>` を送り、それぞれ空の `subagent_response` シェル（`"Response recorded."`）が先行します。だから登録マッチャは広く（`^(subagent_.+|invoke_sub_agent)$`）、どの委譲名もアダプタへ届き、アダプタは `subagent_response` を落とします。そのシェルは散文を運びますが身元が無いので、転送すると `Agent Type: unknown` の `SUBAGENT_COMPLETED` 行を捏造します。身元は構造化した 1.x `subagent_<agent>` ツール名（#543）を好みます。プラットフォームが提供するので、エージェントが書いた結果散文が監査行を誤帰属できません。フォールバックは #459 の `**Reviewer:**` / `**Agent:**` 結果マーカーです。0.12 `invoke_sub_agent` 形で唯一の身元信号です。
- **plan-approval-guard** — 埋まった PreToolUse 引数は、共有の対象を意識したガードへ転送されます。Kiro IDE 0.12 はツールを識別しますが空の引数オブジェクトを供給するので、アダプタは仲介した計画ソースプロトコルを使います。計画中に使えるのは測定した `fs_write` と `str_replace` ツールだけです。shell、append、delete、patch、別名、カスタム変更ツールは承認の前に止まります。正準の計画書き込みのあと、アダプタは現行の Testing Contract を注入します。正準の質問書き込みのあと、対象に結んだ `[Approval Fingerprint]` を置き換え、生きているワークスペースソースを `[Planned Source]` として記録します（レガシーチャネルはフィンガープリントコマンドを走れないので、アダプタが両方のタグを所有します。ワークスペースにソースフィンガープリントが無いときは `unbindable`）。予約の decision または answer ツール自身を起動します。Kiro は PostToolUse stdout を捨てるので、成功した write フックは黙ったままです。decision または answer 手順が拒まれたとき、フックは終了 2 で拒否を stderr に出し、ドロップしません。書き込み窓は人が回復するまでラッチしたままです。ワークスペースソースは記録した `[Planned Source]` に対して、answer 経路が検査するのと正確に同じように検査されます。計画ソースが記録される前は比べるものが無く、一度記録されるとドリフトは不透明ツールを「計画を再提示せよ」の手当てで止めます。その手当てを実行できるように正準の計画書き込みは開いたままです。
  起動する `next` または最後の操舵 `continue` は、Code Generation ディレクティブに `legacy_plan_approval_choices` 能力を 1 つ運びます。実行時はハッシュだけを保存し、平文ラベルはそのチャットのツール結果に残ります。人のあとの `promptSubmit` は正確なラベル 1 つを運ばなければなりません。関係ないプロンプトは能力を受けません。所有は入ってくるセッション経由の参照ではなく、アクティブなインテント / リビジョンについてグローバルです。
  回復は人がゲートします。所有ウィンドウが先に型付きの回復依頼を受け、あとの `next` が提案または challenge を回す前に、正確な `Recover Plan Approval` 応答を記録しなければなりません。ほかの生きているウィンドウは拒まれます。置き換えウィンドウは、記録した所有者 PID が無くなったあと、または IPC のみの所有者のエンドポイントが消えたあとだけ、同じ人の回復を依頼できます。引き継ぎは保留中の challenge を回し、以前の応答を消します。共有の質問ファイルは正準のまま、監査は選択肢を伏せます。欠けたまたは壊れた offer / challenge ファイルで権威は消えません。pre-write 窓自体が、PostToolUse が決して届かないときの孤児回復ラッチであり、PostToolUse が走るとき一致する書き込み違反がそのラッチを続けます。正確な人の回復応答まで、新しい公開は止まったままです。アダプタは回復依頼を保ち、成功のあと、置き換え提案を消すのではなく違反 / 書き込み窓だけを消します。各書き込みの前にラッチが作られます。権威のある `toolSuccess: false` と認識した失敗散文は変更が起きなかったのでそれを消し、未知の結果はそれを残し回復を要求します。
  引数無しの計画書き込みでは、アダプタは現行の対象 / リビジョンを保護した書き込み窓に保存します。書き込みが状態、アクティブマーカー、またはほかの権威ファイルを消すまたは壊すと、PostToolUse は保存したリビジョンを毒し、生きている権威がもうパースできなくてもあとの変更呼び出しは止まったままです。アダプタ所有の `next` 回復は、エンジンが妥当な非エラーディレクティブを返したあとだけその毒を消します。生の監査追記に権威はありません。
  ネイティブインストールでは、アダプタ所有の回復と decision / answer 仲介は `AIDLC_COMPILED_EXECUTABLE` と `engine orchestrate next` / `continue` および `engine log decision` / `answer` を使います。Bun ソースモードは直接の `aidlc-orchestrate.ts` と `aidlc-log.ts` 起動を残します。両モードとも既存のプロジェクト / セッション引数、作業ディレクトリ、継いだ環境を保ちます。
  新しいステージ試行は承認を引退させます。同じ対象と試行の新しいディレクティブは開き直しません。生成開始は計画が結ばれたソースを再基準化し、ワークスペースソースが先に動いていたら消すのではなく拒みます。
- **session-start** — 現代の `session_id` を読み、gitignore した実行時セッションディレクトリの下に残します。レガシーチャネルは `VSCODE_IPC_HOOK` / `VSCODE_PID` から安定したホストインスタンスごとの ID を導きます。
- **終端コマンド** — 提出した `/aidlc ...` プロンプトを出す新しいビルドは、UserPromptSubmit で決定論ユーティリティを走ります。IDE 1.0.242 は空のプロンプトを出すので、フォールバックは PreToolUse で正確な `execute_pwsh` `aidlc-orchestrate.ts next` 呼び出しを認識し、分類したユーティリティを一度走らせ、重複するシェル呼び出しを拒みます。両経路は UTF-8 を明示してデコードし、プレーンテキスト中継からのみ終端プロトコル / 制御バイトを外します。構造化したフック JSON と関係ない拒否経路は書き換えません。現代のターン / ラッチ状態は `session_id` のハッシュで鍵付けするので、並行チャットは互いの出力を再利用できません。セッション身元が無いペイロードは明示のレガシーバケツ 1 つを使います。0.12 camelCase フォールバックは `toolArgs.command` からコマンドを読みます。
- **stop** — 現代 Stop イベントの `session_id` を読み、ワークスペース全体の SessionStart マーカーよりそれを好みます。並行チャットが自分の作成後ハンドオフレシートだけを消費するように。レガシー agentStop と壊れた現代チャネルは残した身元へフォールバックします。
- **record-human-turn** — 現代の `session_id` と回答ペイロード、またはレガシー `USER_PROMPT` を読みます。ディレクティブが出した正確な選択は提出できますが、ほかのチャットの保護した能力を決して明かさず、回さず、渡しません。
- **session-end / block** — ペイロードを要らず、stdin を決して読みません。Session-end は SessionStart が残した身元を再利用します。承認権威が関わらないところだけ、レガシーライフサイクルフォールバックを残します。

## toolResult パス抽出の型

| toolName | 言い回し | 正準ツール |
|----------|---------|----------------|
| `fs_write` | `Created the <PATH> file.` | Write |
| `str_replace` | `Replaced text in <PATH>`（末尾に ` (N occurrences)` が付くことがある） | Edit |
| `fs_append` | `Appended the text to the <PATH> file.` | Edit |

抽出器は一致前に末尾の空白 / 改行を切り、`str_replace` 形から末尾の括弧を外します。`fs_write` は `Write` へ写ります。`str_replace` / `fs_append` は `Edit` へ写ります（どちらも既存ファイルを対象 → コア write-audit-log は `ARTIFACT_UPDATED` を記録）。
