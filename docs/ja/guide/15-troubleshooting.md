# トラブルシュート

よくある不具合と対処を、症状ごとにまとめます。

> **ハーネスについての注。** 下の症状と直し方は **Claude Code** 向けです（フックのファイル名、`settings.json` ブロック、コンパクションの動き）。決定論的なコア（状態、監査、エンジン）はどのハーネスでも同じですが、シェル側の面は違います。ほかのハーネスはフックと設定をそれぞれ配線します（[他ハーネスで動かす](harnesses/README.md)）。直し方が `.claude/` のパスや Claude の仕組みを指しているときは、使っているハーネスの設定ディレクトリに同等があります。

---

## まず試すこと

| 症状 | まず試すこと |
|------|----------------|
| 監査エントリが出ない | `aidlc doctor` を走らせる。コピー導入なら、フックの PATH に `bun` があるかも見る |
| Claude のフックがポリシーで制限されている | Claude Code の管理者に、管理された `allowManagedHooksOnly` を外してもらう。プロジェクト設定では上書きできない |
| 状態ファイルが壊れている | `/aidlc --doctor` を走らせ、状態テンプレートと見比べる |
| 承認ゲートで止まる | 応答を打つ。飛ばすなら `/aidlc --stage <target>` |
| セッション途中でコンテキストがコンパクトされた | `/aidlc` でチェックポイントから再開 |
| 監査ログが大きすぎる | `audit-YYYY-MM.md` にリネームする。新しいファイルは自動で作られる |
| フックがハングしたように見える | システムの一時ディレクトリから古いロックディレクトリを消す（後述） |
| ステータスラインが "ready" | `aidlc-state.md` に `**Lifecycle Phase**` フィールドがあるか確認 |
| ステータスラインが出ない | `aidlc doctor` を走らせる。コピー導入なら PATH に `bun` があるか確認 |
| サブエージェントがタイムアウトした | `/aidlc` で再試行するか、ステージをインラインで回す |
| ワークフローが止まる / おかしい。助けが要る | `/aidlc --doctor --export` を走らせ、できた `.tar.gz` を共有する（マスキング済み。成果物は入らない） |

---

## ネイティブ導入チャネル

| 症状またはエラー | 対処 |
|------------------|------|
| `Checksum mismatch for <asset>.` または `<asset>: checksum mismatch` | 止める。ダウンロードしたディレクトリは使いまわさない。同じリリースから、成果物一式と `checksums.txt` を取り直す。 |
| `install.sh` のあと `command not found: aidlc` | インストーラが出した bin ディレクトリを PATH に足す（だいたい `export PATH="$HOME/.local/bin:$PATH"`）。新しいシェルを開き、`aidlc doctor` を走らせる。 |
| `--offline requires --from <release-directory>` | オフラインモードはネットワークのリリースへ落ちない。成果物一式を運び、そのディレクトリを `--from` / `-From` で渡す。インストーラが検証する。 |
| `aidlc.cmd` が終了コード 4、または Windows のアクティブポインタが無効 | `%LOCALAPPDATA%\aidlc\active-executable` は手で触らない。検証済みの同じインストーラを再実行するか、動いている保持実行ファイルから `aidlc use <version>` する。 |
| `pending Windows uninstall`、または Windows アンインストール復旧の失敗 | 動いている AI-DLC コマンドを閉じ、`aidlc doctor` を走らせる。妥当な続きは次のコマンドで再開する。一時ジャーナル、掃除スクリプト、マシンフェンスを単独で消さない。 |
| Alpine が `libstdc++.so.6` または `libgcc_s.so.1` が無いと出す | Bun と Node.js の musl ビルドが要るのと同じランタイム依存を `apk add libgcc libstdc++` で入れ、インストーラまたはコマンドを再実行する。完全静的な Bun musl コンパイル対象はいま無い。インストーラはこの直し方を出すが、パッケージは入れない。 |
| `refusing to refresh while ... workflow(s) are active` | パーク済みも含め、指名されたワークフローを全部終えてから `aidlc config` を再実行する。`--force`、`--yes`、plan token ではこのガードを越えられない。`update` や `use` はプロジェクトを書き換えないので進めることがある。 |
| `config plan changed after approval` | `aidlc config --dry-run --json` を再実行し、`data.actions` を見て、新しい `data.planToken` を、同じソースと振る舞いオプションのまま適用する。 |
| `aidlc config` の `locally modified` または `managed block was locally modified` | `aidlc config --dry-run --json` を走らせ、`data.actions` を見る。`--force` は基準が所有するフレームワークバイトまたは managed block の置き換えにだけ使う。無関係なルートの中身の認可にはならない。 |
| `aidlc config` の `unowned whole file` | config の前に、既存ファイルを手で移すかマージする。OpenCode の `opencode.json` のようなファイル全体の統合は、`--force` では請求できない。 |
| `legacy root integration ambiguous; move or delete the unmarked AI-DLC content` | 指名したルートファイルの、印の無い古い AI-DLC ブロックを移すか消す。ほかのプロジェクト所有テキストは残し、`aidlc config` を再実行する。このリリースは所有の推測を意図して拒む。 |
| `managed markers are missing, duplicated, or malformed` | 指名したルートファイルを直し、一致する `BEGIN AI-DLC` / `END AI-DLC` の対をちょうど 1 組にする。または壊れた AI-DLC ブロックを外して `aidlc config` を再実行する。 |
| `project runtime <version> is incompatible with selected engine <version>` | `aidlc use <version>` で互換版を入れて選ぶか、`aidlc config` でプロジェクトを意図的にリフレッシュする。 |
| `this project requires <version>, which is not installed completely` | 正確な strict-semver ピンを `aidlc config --pin <version>` で入れる、または入れ直す。ディスパッチャはアクティブなマシン版へ落ちず、閉じて失敗する。`aidlc config --unpin` は、チームがプロジェクトのピンを止めるときだけ。 |
| 更新が途中で切れ、`aidlc version` が前のリリースのまま | 安全に戻した状態。古いコマンドがアクティブのまま。`aidlc doctor` を走らせ、同じ `aidlc update --version <version>` を再実行する。 |
| `another AI-DLC mutation holds .../.aidlc-transaction.lock` | 動いている init / ライフサイクルコマンドが終わるのを待つ。プロセスがもう無ければコマンドを再実行する。所有者私有の古い staging は、ロックを安全に取り戻したあとだけ掃く。 |
| `existing aidlc is managed by Homebrew` / `Nix`、または行き先コマンドが `not owned by the AI-DLC installer` | 報告された所有者経由で上げる。別のネイティブ導入を残すなら、空の利用者所有ディレクトリへ `AIDLC_BIN_DIR` を明示する。このリリース自身は Homebrew も Nix も出荷せず、所有が混ざったコマンドは置き換えない。 |
| `update cache is invalid`、またはマシン設定が拒否される | `aidlc system config global list` を走らせる。直す、または消すのは指名された `%LOCALAPPDATA%\aidlc\aidlc.settings.json`（Windows）か `${XDG_DATA_HOME:-$HOME/.local/share}/aidlc/aidlc.settings.json`（macOS/Linux）だけ。未知キーと保存した認証情報は拒否する。 |
| `HTTPS_PROXY must use HTTP or HTTPS`、またはリリース URL が拒否される | 認証・クエリ・フラグメント無しの HTTP(S) プロキシ URL と HTTPS リリースミラーを使う。ネイティブクライアントが読むのは `HTTPS_PROXY` と `NO_PROXY` で、`HTTP_PROXY` ではない。エラーでは秘密らしい URL 部分を落とす。 |
| 企業 CA の向こうでダウンロードが失敗する | `--ca-bundle <absolute-path>` を渡すか `AIDLC_CA_BUNDLE` をセットする。独自 CA を渡すとき、Windows のブートストラップは `curl.exe` が要る。 |
| プラグインコマンドの `host inventory unavailable` | いまのプラグインルートを注入するホストセッションから sync するか、Claude / Codex のホストレジストリを戻す。欠けた、または壊れた在庫は、中身を刈ってよい証拠には決してしない。 |
| `cannot prune <plugin>: owned path changed since composition` | ローカル編集を残して見る。再試行の前にプラグインソースと突き合わせる。`--yes` は所有ハッシュを上書きしない。 |
| `aidlc system versions prune`、`uninstall`、またはプラグイン prune が `--yes` を要求する | 対話 stdin 無しで走っている。列挙された削除を見て、`--yes` 付きで再実行する。完全性の拒否は迂回できない。 |
| `aidlc setup` が未知、または npm 導入が無い | それらのチャネルは計画中で、出荷していない。リリースインストーラと `aidlc config` を使う。提案のトランスクリプトを、使えるコマンドと思わない。 |

ネイティブの `aidlc doctor` はさらに、アクティブコマンドポインタ、ロールバック可否、保持ピンの完全性、古いピン登録、捨てられたトランザクション staging、プロジェクト版のずれ、バイナリチャネルのホストフックと permission / trust エントリがネイティブコマンドを一貫して選んでいるかも見る。

---

## フックが動かない

**症状**: ファイル書き込みのあとインテントの `audit/` シャードに行が増えない、またはサブエージェント完了のログが無い。

### ネイティブランタイムと、ソースから生成した Bun 投影

ソース / 開発の `dist/` 投影は、TypeScript フック 17 本を `bun` 経由で走らせます。ネイティブ導入と版付きリリースランタイムは、同じフックを `aidlc` 経由で回します。ソース生成の導入が非対話 PATH で Bun を見つけられないと、フックは走りません。

```bash
# macOS / Linux
curl -fsSL https://bun.sh/install | bash

# Windows
npm install -g bun
# or: powershell -c "irm bun.sh/install.ps1 | iex"

# Verify
bun --version
```

ソース生成の `dist/` 導入では、ホストが継ぐ PATH に `bun` を入れてください。zsh なら `~/.zshenv`、bash と Git Bash なら `~/.bashrc`。対話シェル用のファイルだけは足りません。ネイティブ Windows の PowerShell では、`npm install -g bun` が入れるシステム PATH で足ります。

### Claude の管理ポリシーがプロジェクトフックを止めている

`/hooks` がポリシーでフック制限と出し、設定済みフックがゼロなら `/aidlc --doctor` を走らせます。Claude Code では doctor が、macOS は `/Library/Application Support/ClaudeCode/managed-settings.json`、Linux/WSL は `/etc/claude-code/managed-settings.json`、Windows は `%ProgramFiles%\ClaudeCode\managed-settings.json` のあとレガシーの `%PROGRAMDATA%\ClaudeCode\` を読みます。各候補の兄弟 `managed-settings.d/` にあるアルファベット順の JSON 断片も入ります。実効のトップレベル `allowManagedHooksOnly: true` は、`.claude/settings.json` が宣言するプロジェクトフックを全部止めます。管理ファイルが別の場所なら `AIDLC_MANAGED_SETTINGS_PATH` をセットします。その兄弟の断片ディレクトリは自動で入ります。

この管理設定を外せるのは Claude Code の管理者だけです。フックが承認されたら CLI セッションを完全に再起動してください。ポリシーが変わるまでは、人が付いている復旧セッションで、CLI を起動する環境に `AIDLC_SKIP_HUMAN_PRESENCE_GUARD=1` と `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` を置けます。止まったフックが発行できないレシートの、一時的な迂回です。

### レビュアーのツール呼び出しが拒否される（"This review cannot open ..."）

ユニットごとの Construction レビュー中、reviewer-scope フックは、兄弟ユニットの `construction/` に届くディスパッチ済みレビュアーのツール呼び出しを拒否します（stage-protocol-reviewer.md §12a の読み取り範囲）。拒否メッセージは今のユニットを名前で示し、渡したファイルとそのユニット自身のパスへ誘導します。拒否のたびに `REVIEWER_SCOPE_BLOCKED` 監査行が残ります。自分のソースツリーに AI-DLC ユニットと無関係な `construction/` があり、正当なレビュアー読みまで拒否されるなら、`AIDLC_DISABLE_REVIEWER_SCOPE_HOOK=1` で強制を止めます。散文の範囲は残ります。レビューが走っていないのに拒否されるなら、古いディスパッチ記録です。`/aidlc --doctor` のフックドロップカウンタ（`reviewer-scope.drops`）を見て、あれば `<record>/.aidlc-reviewer-dispatch.json` を消します（6 時間より古い記録は無視され、自動で掃除されます）。

普通のフィルタ（`grep latency construction/U03-scoring/nfr.md | grep endpoint` など）は許されます。2 本目の `grep` がパイプのテキストを探すからです。パイプがあっても、ファイルを歩くコマンドは免れません。再帰 `grep`、`rg --files`、`rg -f -` は、範囲内の検索ルートが要ります。`rg` なら今のユニットに縛ったグロブでもよい。`-f` で渡すパターンファイルも範囲内でなければなりません。パス無しコマンドが `.` に落ちて拒否されるときは、メッセージがそのルートを暗黙だと示します。

### ステータスラインに出したくないコスト区間が出る（または使用量追跡が気になる）

Claude Code では、ステージごとのトークン使用量とコスト追跡が既定でオンです。fold-usage フックがトランスクリプトの使用量を gitignore されたローカル台帳（`aidlc/.aidlc-sessions/usage-ledger.json`）に書き、ステータスラインが `↑<in> ↓<out> $<usd>` を足し、完了の監査イベントにコストの集計が載ります。どこにも送信しません（メトリクス送信は別途 `AIDLC_METRICS_ENDPOINT` のオプトイン）。ローカル追跡を全部止めるなら `AIDLC_DISABLE_USAGE_TRACKING=1`。台帳は更新を止め、ステータスラインの区間は消え、完了イベントに集計フィールドは付きません。既存の台帳はディスクに残ります。履歴も消したいなら手で削除します。フラグを外すと追跡が再開します。

### フックが設定されていない

フックはプロジェクト単位で、ハーネスのネイティブ設定に登録します。Claude では `.claude/settings.json` に想定どおりの `hooks` イベントと `statusLine` があることを確認してください。ネイティブプロジェクトでは、アクティブなワークフローを終えて `aidlc config` を走らせ、フレームワーク所有の配線を突き合わせます。手動コピーでは、同じ版の `runtime/<harness>/` アーカイブからハーネスルート全体を置き、プロジェクトルートの統合は残します。フックコマンドを 1 本だけ直さないでください。

### フックが全体で無効（`disableAllHooks`）

Claude Code はどの設定層でも `"disableAllHooks": true` を守ります。エンタープライズ管理設定、`.claude/settings.local.json`、`.claude/settings.json`、`~/.claude/settings.json`。セットされていると、ファイルは正しく配線されていても **すべての** フックが黙ってスキップされます。ワークフローは最初のステージで止まります（監査なし、状態同期なし、センサーなし、ステージグラフ再構築なし）。規制環境で IT ポリシーが管理設定からフックを止めるときに多いです。`/aidlc --doctor` はこれを検出し、問題の層を名前で出す **Hooks enabled** 行で失敗します。Claude Code の層の優先順位に従うので、優先度の高い `false` は下位の `true` を抑えます。

- 問題の層が **プロジェクトまたは利用者ファイル** なら、`"disableAllHooks": true` を消す（または `.claude/settings.local.json` など優先度の高い層で `false` にする）してセッションを再起動します。
- **エンタープライズ管理設定**（最優先層）なら、プロジェクトや利用者ファイルでは上書きできません。IT ポリシー側の変更が要ります。ポリシーがフック無効を必須にするなら、AI-DLC v2 はその環境と両立しません。エンジンはフック駆動です。

検査が読むのはディスク上の管理設定 **ファイル**（Linux は `/etc/claude-code/managed-settings.json`、macOS は `/Library/Application Support/ClaudeCode/managed-settings.json`、いまの Windows は `%ProgramFiles%\ClaudeCode\managed-settings.json` — `%PROGRAMDATA%\ClaudeCode\` はレガシーの副次）と、兄弟 `managed-settings.d/` のアルファベット順 JSON です。Claude Code が支えるほかの管理チャネル（MDM、Windows レジストリ、リモート / サーバ管理ソース）は **見ません**。合格は、検査が読めた設定ファイルのどこにも実効値が `true` ではない、という意味で、それらのチャネルがきれいだという保証ではありません。管理ファイルが標準以外のパスなら `AIDLC_MANAGED_SETTINGS_PATH=/path/to/managed-settings.json` で検査を向けます。その隣の断片も入ります。

---

## 状態ファイルの問題

**症状**: オーケストレータが状態壊れを出す、またはワークフローの動きがおかしい。

### 状態ファイルが無い

状態ファイルは Initialization 中、または `/aidlc` にスコープを渡したときに作られます。

- `/aidlc --status` で、アクティブなワークフローが無いことを確認する
- `/aidlc` または `/aidlc <scope>` で新しいワークフローを始める

### 状態ファイルが壊れている

`validate-state.ts` フックは、コンパクションのたびに必須セクション 2 つを見ます。`## Stage Progress` と `## Current Status`。直し方:

1. `/aidlc --doctor` を走らせ、報告された状態・グラフ・フックの問題を片付ける
2. 生成された Stage Progress 行が古ければ、状態再同期を持つエンジン経路を回す。`/aidlc` で開始または再開するか、`/aidlc --scope <scope>` でスコープを変え、コンパイル済みグラフとスコープ格子を載せ直す
3. `.claude/knowledge/aidlc-shared/state-template.md` はセクションとフィールドの契約としてだけ使う。テンプレートからステージ行を手で復元しない
4. レコードが直せなければ `/aidlc intent archive <name>` で引退させる（`aidlc/spaces/<space>/intents/` 下のレコードディレクトリは残る）。`/aidlc` で新しく始める

---

## ディスパッチステージのタイムアウト

**症状**: ディスパッチするステージ（Reverse Engineering、Practices Discovery、User Stories、Code Generation）がエラーや途中切れの出力を返す。

### 何が起きるか

フレームワークは組み込みの再試行プロトコルに従います。

1. **自動再試行**（コンテキストを減らしたプロンプト）
2. **再試行も失敗したら**、選択肢は 2 つ:
   - **インラインで回す** — メイン会話でステージを直接実行する（サブエージェント境界なし）
   - **飛ばして後で戻る** — ステージを未完了にしておく

### 手動復旧

`/aidlc` を再実行します。`[-]`（進行中）を検出し、再開するかステージをやり直すかを出します。何が失敗したかは `audit/` シャードのエラー行を見てください。

---

## 承認ゲートで止まる

**症状**: 承認ゲートで応答待ちになっている。

### 進め方

プロンプトが出たら応答を打ちます。選択肢は次です。

- **Approve** — 次のステージへ
- **Request Changes** — 直しのフィードバックを出す

### 直しループの抜け道

同じステージで直しを 3 周すると、3 つ目の選択肢が出ます。**Accept as-is**。いまの版をアーカイブして先へ進みます。

### ステージを飛ばす

`/aidlc --stage <target>` で別のステージへ飛びます。間のステージは状態ファイルで `[S]`（スキップ）になります。

### レビュー済み文書をまた直したい

最終レビューがその文書を覆っていると、直接編集は止まります。レビューが別の中身を黙って認証しないためです。

- ステージがアクティブ、または承認待ちのあいだは、変更を説明して **Request Changes** を選ぶ。ゲートが開く前でも判断は記録できる。
- ステージが `[R]` のあいだは `/aidlc --stage <slug>` でやり直す。
- ステージが `[x]` になったあとは、レビュー済みソース状態を戻すか、`/aidlc --stage <slug>` で戻ってやり直す。

ワークスペースソースだけが変わり、復旧レビューがまだ 1 回残っているときは、古い Review セクションを置き換える前にその復旧リクエストを始めてください。未解決のあいだ、保留中のリクエストは書き込みをそのステージまたはユニットにだけ一時的に許します。レビュー済みワークスペースソースを戻す、判定を記録する、別セッションを開始 / 再開すると、凍結は再武装されます。出力文書のバイトを戻しても、監査に残った成果物の古さは消えません。セッション再起動のあとは、Review セクションを置き換える前に同じ保留リクエストを再試行してください。対応する判定が記録されるまでゲートは閉じたままです。

### 同じ計画で Plan Approval が二度出る

**症状**: すでに承認した計画に対して、Code Generation が Plan Approval をまた出す。

Plan Approval は計画、ユニットテスト指示、Testing Contract の中身、対象、いまのステージ試行に結びます。`/aidlc` の再実行、セッション再起動やコンテキストのコンパクション、Stop フックの探り、`/aidlc --status` では開き直しません。計画のチェックボックスを付けても開き直しません。レビューの記録も計画には触れません。

もう一度聞かれたなら、次のどれかが動いています。

- 計画の中身（タスクマーカのチェック以外、またはレビュー記録が無かったころにレビューが残した終端 `## Review` 節）
- ユニットテスト指示の中身。1 バイトでも。指示は開発者へ全文渡すのでバイト一致で結ぶ。承認後に節を足すと開き直す
- Testing Posture、スコープ、テスト戦略、またはプロジェクト種別
- アクティブな Unit またはステージ対象
- ステージ試行: 後ろへのジャンプ、Request Changes、ゲート却下、ワークフロー再開
- ワークスペースソース。計画の指紋のあとに変わっていれば

拒否メッセージがどれかを指名します。ワークスペースソースが変わったときの直しはいつも同じです。指紋コマンドを再実行し、出たタグを両方記録し、計画を出し直す。古い版の道具が書いた指紋は "was written under an earlier format" と読め、同じ再実行が要ります。

### Plan Approval が記録できず、直しも効かない

**症状**: "Approve Plan" を選んだのにレシートコマンドが拒み続ける。例: ワークスペースソースを結べない（"unbindable"）、再実行の判断で応答が孤立した。

拒否はどれも直しを順に列挙します。まず修理の直しを試す。メッセージが指名したソース境界を直す（問題のパスを縮めるか除外する、除外ディレクトリの下の本物のソースを `.aidlc-source-paths.json` で宣言する、壊れたシンボリックリンクを外す）。指紋コマンドを再実行し、計画を出し直す。`/aidlc --doctor` の "Workspace source boundary binds" 検査が、失敗したパスを指名します。

最後の直しは非常口で、開けるのは人だけです。チャットに正確に `Override Plan Approval: <your reason>` と打つ（選んだ選択肢は数えない）。コンダクターは同じレシートコマンドを `--override "<your reason>"` 付きで走らせます。エンジンは、同じ理由のその句がこのセッションにあることを確かめ、上書きした検査と一緒に `PLAN_APPROVAL_OVERRIDDEN` を記録し、計画の中身とステージ試行だけに結んだレシートを書きます。打った句は一度きりです。コンダクターはこれを提案も開始もしません。句を打っていなければ、コマンドは "Plan Approval override is human-only" で拒みます。

---

## コンテキストのコンパクション

**症状**: Claude Code がそれまでの会話コンテキストを要約した。最近の議論を「忘れた」ように感じることがある。

### 残るもの

レコードディレクトリの成果物、`aidlc-state.md`、`audit/` シャード、`.aidlc-recovery.md` はディスクに残ります。失うのはメモリ上の会話コンテキストと、まだファイルに書いていない途中作業だけです。

### 復旧の仕方

コンパクションのあと `/aidlc` を走らせます。フレームワークは次をします。

1. `aidlc-state.md` を読んでワークフロー位置を載せる
2. `.aidlc-recovery.md` と状態ファイルを比べ、食い違えば警告する
3. 再開の選択肢を 4 つ出す

復旧パンくずが不一致を警告したら、**Redo current stage** を選んで、コンパクション中に進行していたステージを安全にやり直してください。

---

## 監査ログが大きくなりすぎる

**症状**: 長い案件で、このクローンの監査シャードが数千行になっている。

### アーカイブの仕方

```bash
# from the intent's record dir; <host>-<clone>.md is this clone's shard
mv audit/<host>-<clone>.md audit-archive/<host>-<clone>-2026-02.md
```

次の `/aidlc`（またはフック起点の書き込み）が新しいシャードを作ります。監査の中身は全部アーカイブして構いません。エンジンはルーティング判断に `audit/` シャードを読みません。

### git について

`audit/` シャードはコミット対象です（gitignore されない）。[コミットするものと Gitignore](14-artifacts-reference.md#what-to-commit-vs-gitignore) を見てください。クローンごとに `<host>-<clone>.md` シャードを書くので、並行追記でマージコンフリクトは起きません。差分を抑えるなら、コミット前に上のアーカイブを検討してください。

---

## ロックファイルが残る

**症状**: フックが少しハングしてからスキップする。そのあとの監査エントリが書かれない。

監査フックは並行書き込みを防ぐため、`lib.ts` 経由の `mkdir` ベースのロックを使います。フックが中断されると、ロックディレクトリが残ることがあります。ロックはシステムの一時ディレクトリ（`os.tmpdir()` — だいたい macOS/Linux は `/tmp/`、Windows は `%TEMP%`）に作られます。

### 古いロックの探し方

```bash
# macOS / Linux
ls -la /tmp/.aidlc-*

# Windows (PowerShell)
Get-ChildItem $env:TEMP -Filter ".aidlc-*"
```

ロックディレクトリ名は `.aidlc-audit-<hash>.lock` と `.aidlc-subagent-<hash>.lock` で、システムの一時ディレクトリ内です。

### 古いロックの消し方

まず `/aidlc --doctor` を走らせます。消すのは、明らかに死んでいる世代、生成世代がもう一致しない再利用 PID、所有者スタンプが本当に無い古いロックだけです。一致 / 不明の生存世代、壊れたスタンプ、読めないスタンプは報告しますが消しません。

```bash
# macOS / Linux
rm -rf /tmp/.aidlc-audit-*.lock /tmp/.aidlc-subagent-*.lock

# Windows (PowerShell)
Remove-Item "$env:TEMP\.aidlc-audit-*.lock", "$env:TEMP\.aidlc-subagent-*.lock" -Recurse -Force
```

手で消してよいのは、AI-DLC のプロセスを全部止め、プロジェクトが静止していることを確認したあとだけです。ロックと、所有者スタンプ付きの `.reap` 復旧ゲートは一時的で、必要なら作り直されます。`.gate-mutex` は永続の advisory-lock アンカーで、一時ディレクトリに空のまま残ることがあります。

---

## ステータスラインの問題

### ワークフローが動いているのに "ready"

ステータスラインは `aidlc-state.md` の `**Lifecycle Phase**` を読みます。そのフィールドが無いか空なら `[AIDLC] ready` に落ちます。

**直し方:** `/aidlc --doctor` で状態ファイルの健全性を見る。`## Current Status` に `**Lifecycle Phase**` があることを確認する。

### 古いデータが出る

想定どおりです。ステータスラインが更新されるのは次に状態ファイルが書かれたときで、だいたいステージ遷移のときです。

### そもそも出ない

1. `aidlc doctor` を走らせ、報告されたネイティブコマンドまたはホスト配線を直す。
2. コピー導入では、ホストプロセスの PATH に Bun があるか確認する。
3. Claude では `.claude/settings.json` の `statusLine` エントリがあるか確認する。
4. 状態ファイルが無ければ、`[AIDLC] ready` が出るのは正しい。

---

## `--doctor` の使い方

`--doctor` はセットアップを検証するユーティリティコマンドです。おかしいと思ったら走らせてください。

```
/aidlc --doctor
```

見るものは次です。前提（`bun`）、フックの有無（`settings.json` が配線するフック全部 — フレームワークフック 17 本 — が `.claude/hooks/` に無ければ、配線済みで欠けるフックは大きな失敗）、フックが全体無効でないこと（Claude Code のどの設定層でも解決された `disableAllHooks: true` は大きな失敗）、管理されたプロジェクトフックポリシー（`allowManagedHooksOnly: true`）、プロジェクト構造（`settings.json`）、ワークスペースシェルの用意（`.claude/` + `aidlc/spaces/default/memory/`）、状態 / 監査の一貫性、フックのハートビート、グラフ健全性（閉路なし、グラフの各エントリにファイルがある）、**Composed plugin surface**（有効なプラグインステージがコンパイルされている、寄与サイドカーとターゲットが妥当、記録された構造追加と散文断片が残っていて変わっていない）、選択を意識したプラグイン作者の検査、11 スコープ全部のスコープ検証、ステージスキーマ + グラフ参照、スコープ間のキーワード重複。合格する advisory 行には、グラフ読み込み順で生産者が曖昧な消費成果物の **Duplicate producers**、**Rule drift**（ライフサイクルとして古い重複は stale-suppressed として別報告）、**Paired sensor coverage**、`HUMAN_TURN` の無いステージ / ゲート台帳、24 時間超人待ちの承認ゲート、プラグインの advisory 検査、未コミットのワークスペース記録、新しい進行中 compose / バックグラウンドサブエージェント状態、`repos.json` があるときの宣言リポジトリと管理 `.gitignore` のドリフトが含まれます。compose マーカが 24 時間より古い、またはバックグラウンドサブエージェントエントリが 2 時間より古いと、正確な `rm aidlc/.aidlc-*` の直し方で失敗します。doctor はどちらの面も消しません。**Hook drops** は条件付きです。フックが黙って劣化した（寄与を適用できなかったプラグイン compose、失敗した再コンパイルなど）と、重大度タグ付きの行を `<hooks-health>/<hook>.drops` に残します。`[degraded]` ドロップは doctor を **失敗** させます（半適用のプラグインを CI ゲートが拾う）。`[advisory]` ドロップ（想定内 / 無害）は合格行です。プラグイン compose フックは実行のたびに drops ファイルを書き直すので、原因を直して再 compose すれば自分で消えます。きれいな報告と警告だけの報告は終了コード 0、どれか失敗で 1。健全な行はセクションごとに畳みます（`--verbose` が無いとき）。警告と失敗はどれも残ります。報告はどちらでも stdout に出ます。コア検査は **読み取り専用** です。インテントがまだ無い新しいシェルでは何も作らないので、最初のインテントの前に走らせて構いません。プラグイン検査は、規約上読み取り専用であるインストール済みプラグインコードを実行しますが、ランタイムはその性質を強制できません。インテントがあると doctor は `HEALTH_CHECKED`（と `GUARDRAIL_LOADED`）監査行を残します。

Claude Code では doctor がマシン管理の `managed-settings.json` とアルファベット順の `managed-settings.d/` 断片も読みます。実効の `allowManagedHooksOnly` が `true` なら、組織ポリシーがプロジェクトの `.claude/settings.json` が宣言するフックを全部止めます。外せるのは Claude Code の管理者だけです。ワークフローが進んでもハートビートが無いなら `/hooks` で承認とポリシーを見て、フック承認後に CLI セッションを完全再起動してください。

管理者が管理ポリシーを変えるまでは、人が付いている復旧セッションで、CLI を `AIDLC_SKIP_HUMAN_PRESENCE_GUARD=1` と `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` の両方付きで起動できます。一時的な迂回です。止まったフックが発行できないレシート無しで、人の在席と統合サマリのチェックポイントを進めます。人がセッションを監督しているあいだだけ使ってください。
ワークフローに問題があると、`--doctor` は **Workflow diagnosis** セクションも出し、構造化した所見（未解決ゲート、古いか無いランタイムグラフ、冷えたフックなど、「進まない」原因）を列挙します。`--doctor --export` が報告に書く分析と同じです。

各検査が何を見て、失敗をどう直すかの全体は [CLI コマンド](12-cli-commands.md#aidlc-doctor-health-check) です。

---

## 診断レポートを共有する

ワークフローが止まる、おかしい（開かないゲート、進まないステージ、承認した報告が何度も拒否される）ときにメンテナに見てほしいなら、次を走らせます。

```
/aidlc --doctor --export
```

新しい `--doctor` を回したあと、小さく **マスキングした** 診断報告を `aidlc/diagnostics/` に書きます（`--output <dir>` で上書き）。システムの `tar` があれば時刻付き `.tar.gz` にまとめ、無ければ報告ディレクトリを残して自分で圧縮するよう案内します。共有するのはそのアーカイブ（またはディレクトリ）です。診断とマスキング済みの証拠は入り、**成果物は入りません**。ワークスペースソース、生の状態 / 監査 / ランタイムグラフ、成果物 / 寄与 / 質問 / memory の本文は含めません。パスは正規化し、インテント ID はハッシュし、秘密らしい値は落とします。

報告は監査証跡からワークフローの時系列を再構成し、決定論的な条件→対処ルールを回します。拾いやすい原因は次の 2 つです。

- **未解決の承認ゲート** — ゲートが一度も解決していないステージが、「進まない」のいちばん多い原因です。
- **古いか無いランタイムグラフ / 冷えたフック** — ランタイムグラフが作者入力より古い（または無い）、あるいは長く発火していないフックは、再コンパイルが走っていないことを指します。

報告内の `report.md` が所見ごとに対処を列挙します。復旧迂回（`AIDLC_DISABLE_*` 環境変数など）を名指しする対処は、自動化してはいけないと印が付きます。報告の中身と安全モデルは [CLI コマンド](12-cli-commands.md#aidlc-doctor-export-write-a-diagnostic-report) です。

---

## 次の章

- [状態と監査](10-state-and-audit.md) — 状態ファイルの構造
- [セッション管理](11-session-management.md) — コンパクション後の再開
- [CLI コマンド](12-cli-commands.md) — `--doctor`、`--status`、`--stage` の使い方
- [用語集](glossary.md) — コンパクション、復旧パンくず、フック
