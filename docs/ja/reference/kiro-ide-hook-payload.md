# Kiro IDE hook payload — 実測リファレンス

Kiro IDE がコマンドフックへコンテキストを渡す仕方です。0.12-main（stdin、argv、環境全体を出したプローブ `.kiro.hook` ファイル）、1.0.165（プローブ v2 フック JSON。上流 #543/#555）、1.0.242（Windows 上の UserPromptSubmit と PreToolUse プローブ）で生きたまま捉えたものです。これが `harness/kiro-ide/` アダプタの根拠です。CLI ハーネス（`harness/kiro/`）は別の、kiro-cli 形の stdin 機構を使います。

墨消ししたネイティブ Windows の before/after キャプチャは [`research/kiro-windows-output-encoding/`](research/kiro-windows-output-encoding/) に残してあります。

## The channel changed across IDE generations {#the-channel-changed-across-ide-generations}

| | Kiro IDE 0.12 | Kiro IDE 1.x (≥1.0.1xx) |
|---|---|---|
| Hook registration | `.kiro/hooks/*.kiro.hook`（`{"version":"1.0.0","when":{...},"then":{...}}`） | `.kiro/hooks/*.json` v2 スキーマ（`{"version":"v1","hooks":[{name,trigger,matcher,action}]}`、PascalCase トリガ）。古い `.kiro.hook` ファイルは **黙って無効** — 決して実行されない。 |
| Context channel | `USER_PROMPT` 環境変数（JSON 文字列） | **stdin**（JSON。書いて閉じる）。`USER_PROMPT` は空で届く。 |
| stdin behavior | 開くが、決して書かれず閉じられない — 裸の read はハングする | 書いて閉じる — read はすぐ終わる |
| Field naming | camelCase: `{ toolName, toolArgs, toolResult, toolSuccess }` | snake_case: `{ session_id, hook_event_name, cwd, tool_name, tool_input, tool_response }` — **成功フラグは無い** |

生きた 1.0.165 PostToolUse キャプチャ。フィールドはそのまま:

```json
{"session_id":"sess_…","hook_event_name":"PostToolUse","cwd":"/path/to/project","tool_name":"execute_bash","tool_input":{},"tool_response":"Output:\n…\nExit Code: 0"}
```

アダプタは、空でない `USER_PROMPT` をすぐ使います（0.12 チャネル。stdin は閉じない）。その変数が空なら、壊れたチャネルのタイムアウトと競って 1.x チャネル用に stdin を読みます。本番の既定は 2s。正の `AIDLC_IDE_STDIN_TIMEOUT_MS` 値が、診断と決定論的な遅延テスト向けに上限をミリ秒で上書きします。両方のフィールド綴りを受け付けます。取得はペイロード依存のターゲットにゲートします。`plan-approval-guard`、端末コマンドのターゲット 2 つ、加えて現代の `session_id` 向けの `session-start` と `continue-workflow`、正確な承認応答向けの `record-human-turn`。ほかのターゲット（ツール呼び出しごとの承認下限を含む）はどちらのチャネルも触らず、ゼロ遅延の経路を保ちます。

古い環境変数名は、生の利用者文を意味しません。測った 0.12 契約は camelCase JSON です。したがって `prompt` フィールドの無い promptSubmit ペイロードは、古いターン時計だけ進めます。端末ユーティリティは、対応する preToolUse イベントの `toolArgs.command` からあとで認識されます。生の `/aidlc ...` 文は、それを直接出す新しい Kiro 世代では受け付けますが、0.12 互換の主張ではありません。

`VSCODE_IPC_HOOK` / `VSCODE_PID` も IDE にあります（CLI には無い）。古い Plan Approval は、測ったホストインスタンス値を実行時セッション同一性へハッシュするので、1 ワークスペースの 2 つの IDE ウィンドウが challenge/response ファイルを共有しません。ほかのアダプタルーティングは、上のペイロードチャネルを鍵にします。

## Per-event captures {#per-event-captures}

結果の散文は両チャネルで同じです（0.12 では `toolResult`、1.x では `tool_response`）:

| Event | tool name | tool inputs | result prose | recoverable? |
|-------|-----------|-------------|--------------|--------------|
| UserPromptSubmit (1.0.242) | n/a | `{prompt:""}` | n/a | prompt: いいえ; session id: はい |
| PreToolUse (shell, 1.0.242) | `execute_pwsh` | `{command,cwd,run_in_background,timeout}` | n/a | command: はい |
| PostToolUse (write) — create | `fs_write` | `{}`（空） | `Created the <PATH> file.` | path: 結果の散文からだけ |
| PostToolUse (write) — edit | `str_replace` | `{}`（空） | `Replaced text in <PATH>` | path: 結果の散文からだけ |
| PostToolUse (write) — append | `fs_append` | `{}`（空） | `Appended the text to the <PATH> file.` | path: 結果の散文からだけ |
| PostToolUse (shell) | `execute_bash` | `{}`（空） | `Output:\n<stdout>\n\nExit Code: 0` | command: **回収できない**（stdout だけ） |

### Critical limitations {#critical-limitations}

1. **PostToolUse の write/shell キャプチャは、両チャネルでツール入力が空です。** したがって書いたパスは結果の散文からパースしなければならず、シェルコマンドは欠けます（あるのは stdout + 終了コードだけ）。これは IDE 全体の規則ではなく、世代をまたいだ配送も一様ではありません。あとの 1.x ビルドは、一部の PreToolUse と委譲の入力を埋めます（#543）。Issue #763 は、Kiro IDE 1.0.309 が PreToolUse のサブエージェントディスパッチに `prompt` と `explanation` を、shell/write マッチャに `command`、`cwd`、`run_in_background`、`timeout` を、PostToolUse 入力も埋めたと報告します。その 1.0.309 の観察は報告であり、このリポジトリでは測っていません。測った基盤は、上の 0.12、1.0.165、1.0.242 キャプチャです。
2. **1.x は成功フラグを持ちません。** 整形式の書き込みを監査から落とすのは、0.12 チャネルの明示ブール `toolSuccess: false` だけです（#417）。フィールドが無い 1.x ペイロードはパス検査へ落ちます。そのチャネルは失敗を構造として報告できないので、1.x の失敗した書き込みはエラー散文としてだけ届きます — したがってアダプタはログの前に分類します。失敗として RECOGNISED された散文は `hookDebug` へ送られます（フックデバッグが有効なときだけ書く）。監査する成果物は無いので、転送しないのは正しく、減衰ではありません。認識できない言い回しは、見える hook-drop を残します。それが本当の劣化を合図するケースです。古い 0.12 チャネルでは、明示の `toolSuccess: true` が権威のままで、失敗散文の推定をバイパスします。実行時の型が違う、存在する非 null のペイロードフィールドは壊れているとして扱います。advisory フックは成功終了し、見える drop を記録し、監査もサブエージェントイベントも転送しません。`null` は使えないフィールドと同じで、チャネルの既存の欠落値契約に合わせます。
3. **結果散文のパスはワークスペース相対** ですが、コアフックは絶対レコードルートと較べます — したがってアダプタは転送前に絶対へ解決します。

## Consequences for each hook {#consequences-for-each-hook}

- **write-audit-log / run-sensors** — 回収できる: 結果の散文からファイルパスを削り、絶対へ解決し、コアフックへ Claude 形の `{tool_input:{file_path}}` を渡す。パスが取れないとき、アダプタは両方をログせず 2 ケースに分けます。**失敗した** 書き込みとして認識した散文は `hookDebug` へ送り（フックデバッグが有効なときだけ書く）、成果物が無いので転送しません。この推定は、ペイロードに構造化した成功フラグが無いときだけ走ります。明示の `toolSuccess: true` と、ほかの一致しない言い回しは、見える hook-drop を残します（静かな no-op にはしない） — それが drop ログが表に出す、見えない減衰のケースです。両者を混ぜると、健全なワークスペースで `--doctor` が劣化を報告しました。
- **rebuild-stage-graph** — シェルコマンドは回収できないので、IDE 経路はコマンドフィルタを落とし、監査末尾だけでゲートします（mtime のべき等ガード付き。残った遷移 — 例: `WORKFLOW_COMPLETED` のあと — が、その後のシェルコマンドごとに再コンパイルしないようにする）。シェル結果とセッション同一性はまだ転送します。現代イベントは正確な `session_id` を使い、古いチャネルは SessionStart が残したホスト由来の同一性を使います。結果が成功した `intent-create` を指名すると、共有フックがそのセッションを作ったレコードへ結びます。
- **sync-workflow-state** — IDE はタスクペイロードを出さないので、監査末尾の最新 `STAGE_STARTED` からいまのステージを導きます。これは **前方専用** の鏡です。`Current Stage` を完了またはスキップしたステージへ巻き戻さず、ワークフローが `Running` でないときは発火しません（終わったワークフローを蘇らせない）。`execute_bash` に合わせています — IDE は sync がパースできるタスクイベントを出しません。
- **log-subagent** — ペイロード依存。IDE 0.12 は `invoke_sub_agent` を送り、1.x（1.0.89–1.0.138）は代わりに `subagent_<agent>` を送り、それぞれ空の `subagent_response` シェル（`"Response recorded."`）が先行します。したがって登録マッチャは広く（`^(subagent_.+|invoke_sub_agent)$`）、どの委譲名もアダプタに届き、アダプタは `subagent_response` を落とします — そのシェルは散文を持ち同一性を持たないので、転送すると `Agent Type: unknown` の `SUBAGENT_COMPLETED` 行を捏造します。同一性は構造化した 1.x の `subagent_<agent>` ツール名（#543）を優先します — プラットフォームが出すので、エージェントが書いた結果散文が監査行を誤帰属できません — フォールバックは #459 の `**Reviewer:**` / `**Agent:**` 結果マーカーで、0.12 の `invoke_sub_agent` 形ではそれが唯一の同一性信号です。
- **plan-approval-guard** — 埋まった PreToolUse 引数は、共有のターゲット認識ガードへ転送します。Kiro IDE 0.12 はツールを識別しますが空の引数オブジェクトを渡すので、アダプタは仲介したソース下限プロトコルを使います。計画中に残るのは測った `fs_write` と `str_replace` だけです。shell、append、delete、patch、エイリアス、カスタム変更ツールは承認前に止まります。正規の計画書き込みのあと、アダプタはいまの Testing Contract を注入します。正規の questions 書き込みのあと、ターゲット結びの指紋を置き換え、予約した decision または answer ツール自身を呼びます。Kiro は PostToolUse stdout を捨てるので、その書き込みフックは沈黙のままです。呼び出す `next` または最後の操舵 `continue` は、Code Generation ディレクティブに `legacy_plan_approval_choices` 能力を 1 つ載せます。実行時が保存するのはハッシュだけです。平文ラベルはそのチャットのツール結果に残ります。人のあとの `promptSubmit` は正確なラベル 1 つを持たなければなりません。無関係なプロンプトは能力を受け取りません。所有は届くセッション経由の参照ではなく、アクティブインテント / revision に対してグローバルです。復旧は人がゲートします。所有ウィンドウが先に型付き復旧 ask を受け、あとの `next` が offer や challenge を回す前に、正確な `Recover Plan Approval` 応答を記録しなければなりません。別の生きたウィンドウは拒まれます。置き換えウィンドウが同じ人の復旧を要求できるのは、記録したオーナー PID が消えたあと、または IPC だけのオーナーのエンドポイントが消えたあとです。引き継ぎは保留中の challenge を回し、以前の応答を消します。共有の questions ファイルは正規のままで、監査は選択を墨消しします。欠けた、または壊れた offer/challenge ファイルで権限は消えません。書き込み前ウィンドウ自身が、PostToolUse が来なければ orphan-recovery ラッチであり、PostToolUse が走っても一致する書き込み違反がそのラッチを続けます。正確な人の復旧応答があるまで、新しい公開は止まったままです。アダプタは復旧 ask を残し、成功のあと置き換え offer を消すのではなく、violation/write ウィンドウだけを消します。各書き込みの前にラッチを作ります。権威ある `toolSuccess: false` と認識した失敗散文は、変更が起きていないのでそれを消し、未知の結果は残して復旧を要求します。
  引数無しの計画書き込みでは、アダプタはいまのターゲット / revision を保護した書き込みウィンドウに保存します。書き込みが状態、アクティブマーカー、またはほかの権限ファイルを消すか壊すと、PostToolUse は保存した revision を毒し、生きた権限がもうパースできなくても、あとの変更呼び出しは止まったままです。アダプタ所有の `next` 復旧は、エンジンが有効な非エラーディレクティブを返したあとだけ、その毒を消します。生の監査追記に権限はありません。新しいディレクティブは実行時状態を退役させ、生成のあとソース下限を回します。
- **session-start** — 現代の `session_id` を読み、gitignore された実行時セッションディレクトリの下へ残します。古いチャネルは `VSCODE_IPC_HOOK` / `VSCODE_PID` から、ホストインスタンスごとの安定 ID を導きます。
- **terminal commands** — 送信された `/aidlc ...` プロンプトを出す新しいビルドは、UserPromptSubmit で決定論的ユーティリティを走ります。IDE 1.0.242 は空のプロンプトを出すので、フォールバックは PreToolUse で正確な `execute_pwsh` の `aidlc-orchestrate.ts next` 呼び出しを認識し、分類したユーティリティを一度走り、重複するシェル呼び出しを拒みます。両経路は UTF-8 を明示的にデコードし、端末プロトコル / 制御バイトは平文リレーからのみ除きます。構造化したフック JSON と無関係な拒否経路は書き直しません。現代のターン / ラッチ状態は `session_id` のハッシュを鍵にするので、並行チャットが互いの出力を使い回せません。セッション同一性の無いペイロードは、明示の古いバケット 1 つを使います。0.12 の camelCase フォールバックは `toolArgs.command` からコマンドを読みます。
- **stop** — 現代 Stop イベントの `session_id` を読み、ワークスペース全体の SessionStart マーカーより優先するので、並行チャットは自分の作成後ハンドオフレシートだけを消費します。古い agentStop と壊れた現代チャネルは、残した同一性へフォールバックします。
- **record-human-turn** — 現代の `session_id` と答えペイロード、または古い `USER_PROMPT` を読みます。ディレクティブが出した正確な選択は送れますが、別チャットの保護した能力を見せたり回したり移したりはしません。
- **session-end / block** — ペイロードは要らず、stdin を決して読みません。session-end は SessionStart が残した同一性を再利用し、古いライフサイクルのフォールバックは、承認権限が関わらないところだけ残します。

## toolResult path-extraction patterns {#toolresult-path-extraction-patterns}

| toolName | wording | canonical tool |
|----------|---------|----------------|
| `fs_write` | `Created the <PATH> file.` | Write |
| `str_replace` | `Replaced text in <PATH>`（末尾に ` (N occurrences)` が付くことがある） | Edit |
| `fs_append` | `Appended the text to the <PATH> file.` | Edit |

抽出器は照合前に末尾の空白 / 改行を切り、`str_replace` 形から末尾の括弧を除きます。`fs_write` は `Write` へ対応し、`str_replace` / `fs_append` は `Edit` へ対応します（どちらも既存ファイルを対象にする → コアの write-audit-log は `ARTIFACT_UPDATED` を記録する）。
