# Kiro IDE で AI-DLC を動かす

フレームワークのハーネスの一つです。`dist/kiro-ide/` は、同じ AI-DLC 方法論を [Kiro IDE](https://kiro.dev/) の中で走らせます。決定論的なコア — ツール、ステージファイル 33、プロトコル、ナレッジ、センサー、スコープ、ルール — はどのハーネスでもバイト共有です。違うのはシェル（スキル、エージェントの面、フック配線、起動）だけです。

> [!IMPORTANT]
> **Kiro IDE では Claude Opus 4.8 で AI-DLC を動かしてください。** コンダクターはステージごとに、質問、成果物の生成、レビュアーの通過、ラーニングの儀式、承認ゲート、という複数段の儀式を回します。Opus 4.8 はこの儀式を最後まで追い、どのゲートでも正しく止まります。弱いモデルは任意の段（レビュアーの通過とラーニングの儀式）を飛ばし、ゲートを急ぐことがあります。ワークフローを始める前に、チャットモデルを **Claude Opus 4.8** にしてください。

<a id="prerequisites"></a>

## 前提条件

- **Kiro IDE**、サインイン済み
- チャットモデルに **Claude Opus 4.8** を選ぶ（上の注を見てください）
- PATH に **bun**（`curl -fsSL https://bun.sh/install | bash`）

> [!TIP]
> bun は *非対話* シェルが見る PATH に無いといけません。IDE がフックやツールを走らせるのはそちらです。それらのシェルが読むのは `~/.zshenv`（zsh）か `~/.bashrc`（bash）であり、`~/.zshrc` ではありません。bun のインストーラは `~/.zshrc` に書きます。ターミナルでは `which bun` が通るのにフックが bun を見つけられないときは、`BUN_INSTALL`／`PATH` の export を `~/.zshenv`（または `~/.bashrc`）へコピーしてください。

## インストール

下のコピーは、[aidlc-workflows](https://github.com/awslabs/aidlc-workflows) リポジトリを `main` ブランチで clone した場所から実行します:

```bash
git clone --branch main https://github.com/awslabs/aidlc-workflows.git
cd aidlc-workflows
```

```bash
mkdir -p your-project/.kiro your-project/aidlc
# Safe on fresh installs; required when upgrading from v2.5.56 or earlier.
for retired_hook in \
  audit-logger block mint runtime-compile stop sync-statusline
do
  rm -f \
    "your-project/.kiro/hooks/aidlc-${retired_hook}.json" \
    "your-project/.kiro/hooks/aidlc-${retired_hook}.kiro.hook"
done
rm -f \
  your-project/.kiro/agents/aidlc.json \
  your-project/.kiro/agents/aidlc-*-agent.json \
  your-project/.kiro/settings/cli.json
cp -R dist/kiro-ide/.kiro/. your-project/.kiro/
cp -R dist/kiro-ide/aidlc/. your-project/aidlc/     # the workspace shell (spaces/default/memory) — a sibling of .kiro/, not inside it
cp dist/kiro-ide/AGENTS.md your-project/AGENTS.md   # merge if you already have one
# Existing .gitignore: preserve it and merge only the section beginning "# AI-DLC".
if [ ! -e your-project/.gitignore ]; then
  cp dist/kiro-ide/.gitignore your-project/.gitignore
fi
```

最初の削除ループは v2.5.57 のフック名移行です。二番目は、古い IDE 配布が出荷していた Kiro CLI 形式のエージェント JSON と設定ファイルを消します。上書きコピーでは引退したファイルは消えません。どちらも新規導入では no-op です。掃除のあと、`cp -R <src>/. <dst>/` の形は、`your-project/.kiro` が既にあっても木の **中身** をコピーします。素の `cp -r dist/kiro-ide/.kiro your-project/.kiro` は、既存の `.kiro/` の中にもう一つ `.kiro` を入れ子にし、IDE は新しいファイルを見ません。

`aidlc/` ディレクトリはワークスペースシェルです。エンジンが読む、あらかじめ組んである `aidlc/spaces/default/memory/` の方法論ツリーを出荷します。`.kiro/` の **兄弟** なので、別途コピーします（または `dist/kiro-ide/` 一式をまとめてコピーします）。無いと `/aidlc --doctor` の "workspace shell ready" 検査が落ちます。

出荷の `.gitignore` は、ワークスペースのコミット／無視の分け方を持ちます。ユーザーごとのカーソル（`aidlc/active-space`、`aidlc/spaces/*/intents/active-intent`）とマシンローカルのランタイム（`aidlc/.aidlc-clone-id`、`runtime-graph.json`、センサーキャッシュ、`spaces/*/knowledge/.sources.local.json`）は未追跡のまま、共有の記録 — 方法論メモリ、状態、監査シャード、成果物 — は git に乗ります。ガード付きのコマンドは、プロジェクトに `.gitignore` が無いときだけスターター一式をコピーします。既にある場合は、プロジェクト側の規則はすべて残し、出荷ファイルの `# AI-DLC` から末尾までだけをマージします。汎用のスターター規則はコピーしないでください。入れた `AGENTS.md` の `## Git Integration` は、最初のワークフローの前に AI-DLC 規則が入っている前提です。

`your-project/` を Kiro IDE で開きます。導入が出荷するものは次です。

- `.kiro/skills/aidlc/SKILL.md` — `/aidlc` を打ったときに載るコンダクター。
- `.kiro/agents/aidlc.md` — 同じコンダクターを、IDE のワークスペースエージェント選択に出す。
- `.kiro/agents/aidlc-*-agent.md` — 委譲ペルソナ 14 体すべて。IDE ネイティブの `tools:` 付与と `permissions.rules` を持ちます。IDE 配布に agent-v1 JSON や `settings/cli.json` は入りません。
- `.kiro/steering/aidlc-active-memory.md` — 常に載る IDE steering。生きているファイル参照で、コンダクターと委譲エージェントの両方へアクティブスペースのメモリファイルを先読みします。
- `.kiro/hooks/aidlc-*.json` — IDE ネイティブの v2 フック形式で登録したフレームワークフック。IDE の Agent Hooks パネルに出ます。（Kiro IDE 1.x は、以前のハーネスが出していたレガシー `.kiro.hook` 形式を実行しません。それらのビルドではレガシーフックは静かに惰性です。）

チャットパネルで `/aidlc --doctor` を走らせてセットアップを確認し、`/aidlc <description>` でワークフローを始めてください。

## 使い方

Claude Code ハーネスと同じです。`/aidlc <description>` でワークフローを始め、`/aidlc --status` が位置を出し、`--doctor`、`--stage`、`--phase`、`--depth`、`--test-strategy` もすべて動きます。ステージごと（`/aidlc-domain-design`）とスコープごと（`/aidlc-feature`）のランナースキルも入っています。init コマンドはありません。出荷のシェルがワークスペースの足場を組み、最初の `/aidlc` で AI-DLC が最初のインテントを自動作成します。

## Kiro IDE でのフックの動き

Kiro IDE は v2 フック JSON（`{"version":"v1","hooks":[{name,trigger,matcher,action}]}`、PascalCase のトリガー）を `.kiro/hooks/` の下で登録します。Kiro CLI とは別の仕組みです。CLI はエージェント JSON の中の `hooks` ブロックを読みます。各フックはコマンドを走らせ、共有の `aidlc-kiro-adapter.ts` シムを通り、IDE のフックイベントを、バイト共有のコアフックが期待する形へ正規化します。

Kiro IDE 1.x はフック文脈を **stdin の JSON** で渡します（snake_case: `{ session_id, tool_name, tool_input, tool_response }`。古い 0.12 ビルドは代わりに `USER_PROMPT` 環境変数へ camelCase 相当を載せます。アダプタは両方受けます）。捕捉した PostToolUse の write／shell イベントは、どちらの経路でもツール入力が空です。書いたパスは結果テキストから復元し、監査末尾のフック（`rebuild-stage-graph`、`sync-workflow-state`）は監査証跡から走ります。グラフ再構築の経路はシェル結果とセッション身元も残すので、成功した `intent-create` が呼び出したセッションに結び付きます。新しいイベントは正確な `session_id` を持ち、レガシー経路は計測した `VSCODE_IPC_HOOK`／`VSCODE_PID` 環境から安定したホストインスタンス身元を導き、SessionStart で保持します。新しい Stop もイベントローカルの `session_id` を優先するので、並行する別チャットが、作った直後の引き渡しを消費しません。レガシーの agentStop は保持した身元へ落ちます。後の 1.x ビルドは一部の PreToolUse と委譲入力を埋めます。アダプタはその欄を残します。Windows では、決定論的ユーティリティがこれらの継ぎ目を使い、IDE のシェル結果輸送を避けます。送信プロンプトを出すビルドは UserPromptSubmit でユーティリティを走らせ、1.0.242 のようにプロンプト欄が空のビルドは、正確な `execute_pwsh` PreToolUse コマンドへ落ちます。ユーティリティはターンにつき一度走り、UTF-8 テキストは端末プロトコル／制御バイト無しで中継し、重複するシェル呼び出しは拒否します。新しいチャットはターンと出力状態を `session_id` ごとに持ちます。セッション身元の無い文脈は、レガシー互換のバケツを 1 つ使います。1.0 より前の camelCase ペイロードは、同じフォールバックを `toolArgs.command` 経由で取ります。生のプロンプト本文は、より新しい世代の互換形だけです。

ペイロード取得は **ペイロード依存の対象にゲート** します（`audit-and-sensors`、`log-subagent`、`plan-approval-guard`、`rebuild-stage-graph`）、端末コマンドの継ぎ目、それに新しい `session_id` のための `session-start` と `continue-workflow`、正確な承認応答のための `record-human-turn`。空でない `USER_PROMPT` は 0.12 ビルドで直ちに消費します（stdin を開いて一度も書かないため）。それ以外はアダプタが 1.x の stdin 経路を、壊れた経路の上限 2 秒で読みます。ほかの対象 — すべての `PreToolUse` で発火する承認フロアも含む — はどちらの経路にも触れず、ゼロ遅延の道を保ちます。

| フック | トリガー（マッチャー） | 目的 |
|------|-------------------|---------|
| `aidlc-session-start` | `SessionStart` | セッションごとに一度、ワークフロー再開の文脈を注入する（レガシーの 1.0 より前のファイルはプロンプトごとの `promptSubmit` に配線したまま — その世代にセッション開始トリガーは無い） |
| `aidlc-mint` | `UserPromptSubmit` | プロンプトごとに人のターンを記録する（人の存在ゲート） |
| `aidlc-terminal-command` | `UserPromptSubmit` | プロンプト本文があるとき、status、doctor、help、ナビゲーションなどの端末ユーティリティをモデルより先に走らせる |
| `aidlc-terminal-command-guard` | `PreToolUse` (`execute_bash\|execute_pwsh\|shell`) | プロンプトが空の IDE 版向けフォールバック。分類したユーティリティを一度走らせ、重複する Windows シェル呼び出しを拒否する |
| `aidlc-continue-workflow` | `Stop` | 転送ループの監査（advisory のみ。IDE の Stop トリガーはブロックできない — 強制はコンダクター自身の Stop プロトコルに頼る） |
| `aidlc-block` | `PreToolUse` | 承認ゲートが開いていて、そのあと人が動いていないあいだ、ツール呼び出しを硬く止める（人の存在フロア） |
| `aidlc-write-audit-log` | `PostToolUse` (`fs_write\|str_replace\|fs_append`) | 成果物の作成／更新を記録し、当たるセンサーを発火する（パスはツール結果から） |
| `aidlc-plan-approval-guard` | `PreToolUse` | 引数があるときは、対象を正確に分類して Code Generation Plan Approval を強制する。引数の無いレガシーペイロードでは、計測した `fs_write`/`str_replace` の計画質問書き込みだけを許す。PostToolUse は黙る。0.12 がその出力を捨てるから。呼び出した Code Generation の `next`／最後の `continue` ディレクティブが、保護された選択能力を 1 つ持つ。復旧は、まず人の正確な `Recover Plan Approval` 応答が要る。別の生きている窓は開始できない。所有者 PID が落ちたあと、または IPC だけのエンドポイントが消えたあとは、代わりの窓が復旧できる。引き継ぎは、チャレンジを回す前に古い応答証拠を消す。書き込み前に途切れた窓は、PostToolUse が走らなくても復旧ラッチのまま。確定の `toolSuccess:false` か、認識できる失敗の散文なら、変異が無いのでラッチを外す。不明な結果はラッチしたまま。アダプタが持つ復旧は、人への質問は残し、再発行が成功したあとに違反／窓の状態だけを消す。`UserPromptSubmit` は正確な復旧／承認ラベルを出せるが、開示も譲渡もしない。未知の変更者はフェイルクローズ。共有ファイルと監査に平文の秘密は残らない。 |
| `aidlc-log-subagent` | `PostToolUse` (`^(subagent_.+\|invoke_sub_agent)$`) | デリゲートの身元付きで `SUBAGENT_COMPLETED` を記録する。マッチャーは広く、どのデリゲート名もアダプタに届く。アダプタは補助の `subagent_response` シェルを落とす |
| `aidlc-rebuild-stage-graph` | `PostToolUse` (`execute_bash`) | ランタイムグラフを再コンパイルする（監査末尾でゲート） |
| `aidlc-sync-workflow-state` | `PostToolUse` (`execute_bash`) | 監査の最新 `STAGE_STARTED` から `Current Stage` を前方だけの同期する（IDE はパースする task ペイロードを出さない） |

`aidlc-session-end` に **v2 登録はありません**。IDE の `Stop` トリガーは会話の閉じではなく、アシスタントターンの終わりごとに発火するので、登録すると同じセッションのプロンプト間に偽の `SESSION_ENDED` が付きます。本物のセッション終了イベントが出るまでレガシー専用（`agentStop`、1.0 より前のビルド）のままです。IDE 1.x では `SESSION_ENDED` は記録されません。

発火のたびに、チャットに "Run Command Hook" の行が出ます。

### フックのデバッグ

フックの動きが想定と違うときは、デバッグログを付けてください。各フックが判断経路（どのゲートを通ったか、解決したパス、なぜ抜けたか）を `<record>/.aidlc-hooks-health/hook-debug.log` に追記します。**既定はオフ** です。通常の実行ではログは書かれず、オーバーヘッドもありません。付け方は 2 つ。どちらでも動きます。

- **ファイルシステムのマーカー（Kiro IDE ではいちばん簡単）:** プロジェクトで `touch aidlc/.aidlc-hook-debug`。次のフック発火から効きます。IDE の再起動は不要です。`rm aidlc/.aidlc-hook-debug` でオフに戻ります。
- **環境変数:** `export AIDLC_HOOK_DEBUG=1`。IDE はフックを非対話シェルで走らせるので、それらのシェルが読む場所に書いてください。`~/.zshenv`（zsh）か `~/.bashrc`（bash）に export を足し、IDE を再起動します。

## Kiro IDE で違うところ

| 領域 | Claude Code | Kiro IDE |
|------|-------------|----------|
| フック登録 | `settings.json` の `hooks` ブロック | `.kiro/hooks/aidlc-*.json` の v2 フックファイル（IDE >= 1.0）+ `.kiro/hooks/aidlc-*.kiro.hook` のレガシーファイル（1.0 より前）。両方出荷。二重発火はしない |
| ゲートと質問 | `AskUserQuestion` ウィジェット | 番号付きの散文選択肢（番号で返す）。正本は `[Answer]:` タグ付きの questions ファイル |
| ステータスライン | 今のステージ + モデル + コンテキスト % | 無い — `/aidlc --status` と、各ゲートの進捗行を使う |
| ディスパッチステージ（2.1 パイプライン、2.2 サブエージェント、2.4 モブ、3.5 サブエージェント） | `Task` ツール | Kiro の `subagent` ツール → Markdown ペルソナ 14 体すべて。IDE は各エージェントの frontmatter から `tools:` と `permissions.rules` を読む |
| Construction スウォーム | 並行 `Task` フロア、任意の ultracode Workflow | サブエージェントの fan-out だけ。`AIDLC_USE_SWARM=1` は no-op と告知する |
| セッション監査イベント | `SESSION_STARTED/RESUMED/ENDED`、`SESSION_COMPACTED` | IDE 1.x では `SESSION_STARTED` だけ（本物のセッション終了トリガーが無い — `SESSION_ENDED` は 1.0 より前のビルドのレガシーフックだけが記録する。コンパクション前イベントは無い） |
| MCP サーバー | 5 つ出荷（`.mcp.json`: `context7` + AWS 系 4 つ） | 同梱なし |

それ以外 — 状態機械、監査証跡、インテントごとのレコードディレクトリ（`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）の下の成果物、ラーニングの儀式、センサー、スコープ、深度／テスト戦略 — は同じ動きです。同じだからです。同じツールが `.kiro/tools/` から走ります。

プロジェクトの `aidlc/` ワークスペースはハーネス非依存です。ハーネス間の移動（または両方を並べて走らせること）は、対応はしていますが未テストです。アクティブなワークフローがある状態で衝突するハーネス導入を見つけると、`/aidlc --doctor` が警告します。

## フレームワーク開発者向け

`dist/kiro-ide` は `core/` + `harness/kiro-ide/` から `bun scripts/package.ts kiro-ide` で **生成** されます（コアのコピーで `{{HARNESS_DIR}}` トークンを `.kiro` に置換し、`rules/` → `steering/` へ名前を付け替えます）。`bun scripts/package.ts --check` がドリフト検査で、CI で走ります。手で書く Kiro IDE の面は `harness/kiro-ide/` にあります。オーケストレータスキル（`skills/aidlc/`）、常に載るアクティブメモリの steering（`steering/`）、コンダクター Markdown（`agents/aidlc.md`）、フックアダプタと v2 フック JSON（`hooks/`）、オンボーディングの fills — 直すのはそれら（または `core/`）であり、生成された `dist/kiro-ide` ではありません。

IDE ハーネスが CLI ハーネス（`harness/kiro/`）と違うのは次です。コンダクターの面は `/aidlc` スキルと `agents/aidlc.md` であり、`settings/cli.json` で選ぶエージェントではありません。出荷するのは v2 フック JSON です（CLI はエージェント JSON の `hooks` ブロックに頼ります）。常設ルールは、CLI のエージェント resources ではなく、常に載る steering で先読みします。共有の Kiro 投影はコアペルソナの Claude 専用 `disallowedTools` キーを外します。IDE マニフェストはネイティブの `tools:` と `permissions.rules` frontmatter を足します。Kiro IDE は CLI の agent-v1 JSON も `settings/cli.json` も読みませんし、出荷もしません。
[Porting to a New Harness](../../harness-engineering/09-porting-to-a-new-harness.md) を見てください。

## 次のステップ

入れて起動できましたか。方法論はどのハーネスでも同じです。ハーネス非依存の章へ進んでください。

- [最初のワークフロー](../02-your-first-workflow.md) — 注釈付きの通し実行。
- [フェーズとステージ](../04-phases-and-stages.md) — 5 フェーズと 33 ステージ。
- [スコープ・深度・テスト戦略](../05-scopes-and-depth.md) — 実行の大きさの合わせ方。
- [用語集](../glossary.md) — 用語の定義。

ほかのハーネス: [Codex CLI で AI-DLC を動かす](codex-cli.md) · [Cursor で AI-DLC を動かす](cursor.md) · [ハーネス一覧](README.md)。
