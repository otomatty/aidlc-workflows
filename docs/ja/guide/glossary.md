# 用語集

User Guide と Developer Reference で揃えている定義です。

---

| 用語 | 定義 |
| ---- | ---- |
| **エージェント (Agent)** | 配布されているペルソナ 14 体。領域の専門家 11、レビュー専用 2、適応型ワークフローのコンポーザー 1。コンダクターが、担当ステージ・レビュー・編成の役で起動する。 |
| **承認ゲート (Approval gate)** | 各ステージ末尾の確認点。承認する、直させる、（3 回直したあと）このまま進める、を選ぶ。Initialization のステージにはゲートが無い。 |
| **自律モード (Autonomy mode)** | walking-skeleton のラダープロンプトのあと、`aidlc-state.md` の `Construction Autonomy Mode` に残る設定。`autonomous` か `gated`。初期値は `unset`。既定の stage-major では、`gated` はステージごとの人のゲートを残し、`autonomous` は残りの Construction ゲートを飛ばす（Code Generation 失敗時の halt-and-ask と Build-and-Test のループバック 4 段目は除く）。スウォーム対象も有効になる。任意の `Construction Iteration: unit-major` では自律スウォームは抑え、ステージごとのゲート連鎖は残る。ステージ × Unit の格子が落ち着いたあと、ステージにつき人の承認が 1 回。 |
| **ボルト (Bolt)** | 依存でつながったユニット群に対する、スプリントに近い Construction の反復。ユニット定義そのもの、その worktree、それを組むスウォームとは別物。Delivery Planning (2.9) がまとまり、Definition of Done、確信度の仮説、オーナーを書く。既定の stage-major 実行はこれらの反復を織り交ぜ、`bolt-plan.md` をまとまりや順序の境界としては使わない。3.6（Build and Test）と 3.7（CI Pipeline）は全ボルトのあと一度だけ走る。関連: [parallel batch]、[walking skeleton]、[ladder prompt]。 |
| **成果物 (Artifact)** | ステージが作り、インテントのレコードディレクトリ（`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）に置く版管理された Markdown。例: `requirements.md`、`code-summary.md`、`initiative-brief.md`。 |
| **監査証跡 (Audit trail)** | レコードディレクトリの `audit/` にある追記専用ログ。クローンごとのシャード（`<host>-<clone>.md`）を、読む側がグロブして時刻順にマージする。イベント種別は 91。ISO 時刻付きで、意図から本番まで追える。 |
| **CLI ツール (CLI tool)** | この実装が必要とする外部コマンド。ランタイム前提は `bun` だけ。Claude Code のツールとは別。 |
| **Claude Code ツール (Claude Code tool)** | Read、Write、Edit、Bash、Glob、Grep、Task、AskUserQuestion など、Claude Code 本体の能力。エージェントは既定でセッションのツール一式を継ぐ。任意の `tools:` 許可リストで狭められる。配布で禁じているのは `disallowedTools: Task` だけ。 |
| **Codex** | OpenAI Codex CLI ハーネス。`core/` + `harness/codex/` から `dist/codex/` を生成する。起動は `$aidlc`。[AI-DLC on Codex CLI](harnesses/codex-cli.md) を参照。 |
| **コマンド (Command)** | 人が打つ AI-DLC の起動。`/aidlc` のあとにスコープ、フラグ、自由文を付ける。内部では Claude Code のスキルに対応する。 |
| **コンパクション (Compaction)** | コンテキストが埋まったとき、Claude Code が古い会話を要約する処理。状態は `aidlc-state.md` と `.aidlc-recovery.md` で越える。 |
| **コンダクター (Conductor)** | `/aidlc` セッションそのもの（`SKILL.md`）。薄い転送ループで、**エンジン**に次を聞き、実行し（ステージ、質問、スウォームの展開）、結果を報告して繰り返す。実行の質は持つ。ルーティングは持たない。[Engine and Skill System](../reference/17-skill-system.md) を参照。 |
| **制御ループ (Control loop)** | **ルール**（作業前に効く立ち振る舞い）と **センサー**（出力に対する決定論的検査）の対。ステージをSteer し、検証する。（**ハーネス**＝CLI 配布の意味とは別。昔はどちらも harness と呼んでいた。） |
| **コア (Core)** | 手で書く、ハーネス非依存の正本 `core/`。エンジン、ステージ、エージェント、ルール、スコープ、センサー、ナレッジ、フック、セッションスキル。各ハーネス配布はここから生成する。直すのはここ。`dist/` は触らない。 |
| **Cursor** | Cursor（cursor.com）ハーネス。`core/` + `harness/cursor/` から `dist/cursor/`。IDE と CLI（`agent`）が同じ木を読む。14 ペルソナは `.cursor/agents/` のネイティブサブエージェント。オーケストレータ、ランナー、ユーティリティは `.cursor/skills/`。Cursor は `@`-import を展開しないので、`.cursor/rules/aidlc.mdc` が常設の方法論層を指し、`aidlc-phase-*.mdc` がフェーズ層を指す。起動は `/aidlc`。ショートカットは `/aidlc-status`、`/aidlc-jump`、`/aidlc-scope`。[AI-DLC on Cursor](harnesses/cursor.md) を参照。 |
| **深度 (Depth)** | 成果物の詳しさ。Minimal / Standard / Comprehensive の 3 段。スコープに既定があり、どの承認ゲートでも上書きできる。[スコープ・深度・テスト戦略](05-scopes-and-depth.md) を参照。 |
| **ディレクティブ (Directive)** | エンジンが各 `next` で出す型付き指示（`run-stage`、`ask`、`print`、`done`、`invoke-swarm` など）。コンダクターが次にすることを決める。[Engine and Skill System](../reference/17-skill-system.md) を参照。 |
| **配布 (Distribution)** | 生成され、コミットされ、ドリフト検査される `dist/<harness>/`（`dist/claude/`、`dist/codex/`、`dist/copilot/`、`dist/cursor/`、`dist/kiro/`、`dist/kiro-ide/`、`dist/opencode/`）。利用者はプロジェクトへコピーする。メンテナは手で編集しない。**コア**を **パッケージャ** が焼く。 |
| **エンジン (Engine)** | 決定論的なオーケストレーションツール（`aidlc-orchestrate.ts`。サブコマンドはちょうど 5 つ: `next`、`continue`、`report`、`park`、`team-board`。`continue` は内部の操舵、`team-board` は Team Construction の読み取り専用照会）。ステージ間のルーティング（スコープ解決、順序、ジャンプ、再開、ゲート状態）を持ち、コンダクターが実行する型付き **ディレクティブ** を出す。[Engine and Skill System](../reference/17-skill-system.md) を参照。 |
| **外部ツール (External tool)** | ステージが使う第三者の道具（AWS CLI、Maven、npm など）。Claude Code のツールとは区別する。 |
| **ガードレール (Guardrail)** | ルールファイル内の規定セクション（`## Forbidden`、`## Mandated`、フェーズルールの見出し）。振る舞いの拘束を書く。入れ物はルール。「ガードレール」はその中身の名前。**ルール** を参照。 |
| **ハーネス (Harness)** | AI-DLC コアの CLI 配布。ハーネス非依存の **コア** を載せる、一つの有能なコマンドラインエージェント。集合は開いている（いまは Claude Code、Kiro CLI、Kiro IDE、Codex CLI、Cursor、opencode、GitHub Copilot）。*注: このリポジトリでは「harness」に 4 義がある。* (1) **この CLI 配布の意味（正）**。(2) ルール＋センサーの **制御ループ**（古い呼び方。**制御ループ** を参照）。(3) `harness/<name>/` のソース面。(4) `tests/harness/` のテストヘルパ。利用者向け文書で「ハーネス」と言えば (1) だけ。 |
| **フック (Hook)** | イベントに応じて自動で走る TypeScript。この実装は 17 本。すべて `settings.json` にプロジェクト単位で登録する。ワークフローの背骨（監査、センサー、ランタイムグラフ、ステータスライン、トークン使用量の畳み込み、コンパクション時の状態検証、サブエージェント追跡、ターン終了時のループ強制）に加え、セッション寿命、人のターン発行、ディスパッチルールの正確な配送、状態遷移・レビュアー範囲・レビュー凍結・計画承認のガード、ステータスラインコマンド。それぞれ自己ゲートし、ワークフローが無ければ何もしない。 |
| **インライン実行 (Inline execution)** | 既定の実行。オーケストレータがエージェントのペルソナを載せ、会話の中でステージを進める。人とのやりとりがそのままできる。 |
| **インテント (Intent)** | スペースの `intents.json` に 1 行で載る作業（`{uuid, slug, dirName, scope, repos, status}`）。専用の [レコードディレクトリ] は `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`。`<YYMMDD>` は UTC の短い日付（例: `260624` = 2026-06-24）なので並びが時系列になる。`<label>` は依頼の短い kebab-case。同日同ラベルが被ったら `-2`、`-3`…。衝突しない正式 ID はレジストリ行の時系列 UUIDv7 で、ディレクトリ末尾ではない。最初の `/aidlc` でエンジンが最初のインテントを作る。明示セレクタかセッション紐づけが、共有の `active-intent` カーソルより先に効く。**スペース**、**レコードディレクトリ** を参照。 |
| **Kiro** | Kiro ハーネス。`core/` から `dist/kiro/`（CLI）と `dist/kiro-ide/`（IDE）。方法論は `aidlc/spaces/<active-space>/memory/` を、CLI の agent resources か IDE の steering から読む。起動は `/aidlc`。[Kiro IDE](harnesses/kiro-ide.md)、[Kiro CLI](harnesses/kiro-cli.md) を参照。 |
| **ナレッジ (Knowledge)** | ステージ開始時にエージェントが読む参照。二層。方法論ナレッジはフレームワーク同梱（`.claude/knowledge/`）。チームナレッジは利用者が管理し、スペース単位（`aidlc/spaces/<space>/knowledge/`）。自由形式。初期は空。そのスペースの全インテントで共有する。 |
| **ラダープロンプト (Ladder prompt)** | walking-skeleton ゲートのあと一度だけ出る質問。「このまま自律で進める」か「ボルトごとにゲートする」か。答えが自律モードになり、残りの Construction を支配する。 |
| **ラーニングループ (Learning loop)** | v0.5.0 からある仕組み。ステージ中の訂正を、残るプラクティスとセンサーにする。ステージ中はオーケストレータが `memory.md` に観察を書き、承認ゲートで見せ、残すものを人が確認する。確認した学びは `aidlc/spaces/<active-space>/memory/project.md` のプラクティスになる（ワンクリックで `team.md` へ昇格）。または新しいセンサーの下書きになる。次のワークフローから効く。[ルールとラーニングループ](09-rules-and-the-learning-loop.md) を参照。 |
| **ライフサイクル (Lifecycle)** | AI-DLC 方法論全体。その 1 回の実行がワークフロー。 |
| **マニフェスト (Manifest)** | ハーネスの `harness/<name>/manifest.ts`。**パッケージャ** に、**コア** をそのハーネスの **配布** へどう投影するかを宣言する（ディレクトリ対応、ルール名の付け替え、手書きファイル、任意の `emit` プラグイン）。ハーネス追加の大半はマニフェスト 1 本。 |
| **MCP サーバー (MCP server)** | プロジェクトルートの `.mcp.json`（`.claude/` の隣）で宣言し、Claude Code セッションに載せる外部ツールサーバ。配布は 5 つ。`context7` と AWS 系 4 つ（`aws-mcp`、`aws-pricing`、`aws-iac`、`aws-serverless`）。エージェントはセッションの MCP を全部継ぐ。エージェント単位の許可は無い。使わせないときは `tools:` を `mcp__<server>__<tool>` まで狭める。認証が無いサーバは単に使えない。ワークフローは止まらない。[Harness Primitives Mapping — MCP Servers](../reference/14-claude-features.md#mcp-servers)、[導入](01-getting-started.md#mcp-servers-optional) を参照。 |
| **memory.md** | ステージごとの観察日記。`<record>/<phase>/<stage>/memory.md`。エンジンが run-stage ディレクティブを出すときに作り、オーケストレータが維持する（手編集しない）。Interpretations、Deviations、Tradeoffs、Open questions を書く。ラーニングループが承認ゲートで読む入力。 |
| **モブ実行 (Mob execution)** | 委譲メッシュ（`mode: mob`）。回数に上限がある。リードが下書きし、互いに見えない協力者が並行で寄与ファイルを書き、リードが統合し、判断が残れば人に出す。配布のモブは User Stories (2.4)。 |
| **複数リポジトリインテント (Multi-repo intent)** | 兄弟のコードリポジトリをまたぐ作業。作成時にリポジトリ集合を取る。`--repos a,b` か、ワークスペース直下の `.git` を持つ子の自動発見。`intents.json` の `repos` に残る。Construction の git 操作は `--repo <name>` で錨を打つ。`repos` が無いインテントは昔の単一リポジトリ（プロジェクトディレクトリで git する）。[成果物リファレンス](14-artifacts-reference.md) を参照。 |
| **opencode** | opencode（opencode.ai）ハーネス。`core/` + `harness/opencode/` から `dist/opencode/`。エンジンは `.aidlc/`。opencode は `.opencode/tools/*.ts` をカスタムツールとして読むので、エンジンは置けない。`.opencode/` はネイティブシェル（サブエージェント、`/aidlc`、フックアダプタ）だけ。方法論はプロジェクトルート `opencode.json` の `instructions` グロブ。起動は `/aidlc`。[AI-DLC on opencode](harnesses/opencode.md) を参照。 |
| **GitHub Copilot** | GitHub Copilot ハーネス。`core/` + `harness/copilot/` から `dist/copilot/`。1 回の導入で CLI と VS Code agent mode の両方（読むプロジェクトファイルは同じ）。エンジンは `.aidlc/`。`.github/` には aidlc 名のネイティブ出力だけ（`hooks/aidlc.json`、ペルソナ、スキルツリー）。既存の `.github/` にマージし、置き換えない。方法論はルート `AGENTS.md` の `@`-import。起動は `/aidlc`。[AI-DLC on GitHub Copilot](harnesses/copilot.md) を参照。 |
| **オーケストレータ (Orchestrator)** | ワークフローの回し方の総称。次を決める決定論的 **エンジン** と、実行する **コンダクター**（`SKILL.md`）。起動は `/aidlc`。[Engine and Skill System](../reference/17-skill-system.md) を参照。 |
| **パッケージャ (Packager)** | `scripts/package.ts`。**コア** + 各 **マニフェスト** からすべての `dist/<harness>/` を再生成する。`bun scripts/package.ts` が全部。`--check` が CI のバイト一致ドリフト検査。 |
| **並行バッチ (Parallel batch)** | `unit-of-work-dependency.md`（2.7）から、互いに依存せず同時に走れるユニットの実行時グループ。ボルト計画のまとまりではない。自律スウォームではエンジンが各 DAG バッチを収束させ、Code Generation のステージゲートは 1 回（中間バッチごとではない）。`SWARM_COMPLETED` が実行時バッチを閉じる。 |
| **パイプライン実行 (Pipeline execution)** | 委譲チェーン（`mode: pipeline`）。宣言順にリンクが走り、上流の成果を全部見る。戻るたびに今の試行のレシートを残し、最後のリンクが成果物を揃える。配布のパイプラインは Reverse Engineering (2.1)。登録リポジトリごとにレシート鎖が 1 本完走する必要がある。 |
| **フェーズ (Phase)** | ライフサイクルの大きな区切り 5 つ。Initialization (0)、Ideation (1)、Inception (2)、Construction (3)、Operation (4)。ステージ数は Initialization 3、Ideation 7、Inception 9、Construction 7、Operation 7。 |
| **フェーズ境界検証 (Phase boundary verification)** | フェーズをまたぐときの自動トレーサビリティ検査。欠けたリンク、孤立した成果物、不整合を、下流が積み上げる前に拾う。 |
| **プレーン (Plane)** | フレームワークが分ける 3 つの関心。ネットワーク構成から借りた言い方。**コントロールプレーン**（ステージ定義、ルール、センサー。何が走るべきかのスキーマ。コンパイル時に解決）、**データプレーン**（実際のステージ実行、ボルト、監査テレメトリ）、**マネジメントプレーン**（`/aidlc --doctor`、監査照会、`CLAUDE.md`）。利用者向けの向きは [ルールとラーニングループ](09-rules-and-the-learning-loop.md)。全体像は `docs/reference/02-plane-architecture.md`。 |
| **レコードディレクトリ (Record dir)** | 1 インテントの成果物、ステージごとの `memory.md`、`aidlc-state.md`、`audit/` シャードを持つ場所。`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（文中では `<record>/`）。インテントごとに 1 つ。明示セレクタかセッション紐づけが、共有の `active-intent` より先に勝つ。**スペース**、**インテント** を参照。 |
| **復旧パンくず (Recovery breadcrumb)** | PreCompact フックが書く隠しファイル `.aidlc-recovery.md`。最後に検証したステージと時刻。コンパクション後の状態壊れを見つける。 |
| **レビュアー (Reviewer)** | 品質ゲートのエージェント。`aidlc-product-lead-agent`（要件・ストーリー・モック）か `aidlc-architecture-reviewer-agent`（技術設計）。ステージ本体が成果物を出したあと、ステージが `reviewer:` と必須の Markdown `review_artifact:` を宣言しているときに、別サブエージェントとして走る。所有する `## Review` 判定（READY / NOT-READY）をその成果物にだけ追記する。依頼時の成果物／ソース指紋、Verdict / Reviewer / Iteration の厳格フィールド、安定した完了スナップショットで、変わった仕事が認証されないようにする。adversarial な NOT-READY ではビルダーが再実行し、`reviewer_max_iterations`（既定 2）まで回して、残件を人の承認ゲートに出す。レビュアーにはターン上限がある（Claude Code は `maxTurns: 60`、opencode は `steps: 60`、ほかは散文）。未完了レビューは一度再試行し、だめなら終端 NOT-READY。ブロックはしない。決めるのは常に人。[エージェント](06-agents.md) を参照。 |
| **ルール (Rule)** | 残る振る舞い。アクティブスペースのメモリ層（`aidlc/spaces/<active-space>/memory/`）に一度書き、各ハーネスのネイティブ include（Claude の `@`-import、Kiro CLI resources / IDE steering、Codex の `AIDLC_RULES_DIR`、opencode の `instructions` グロブ、Copilot の `AGENTS.md` `@`-import）で毎回の対象ステージに載る。解決は厳格加算の 5 層（org → team → project → phase → stage）。当たるルールは全部コンテキストに出る。広い層を上書きはせず、足すだけ。**制御ループ** のフィードフォワード側。センサーと組んで決定論的検証もできる。[ルールとラーニングループ](09-rules-and-the-learning-loop.md) を参照。 |
| **ランタイムグラフ (Runtime graph)** | インテントの `runtime-graph.json`。構造ステージグラフのデータプレーン鏡。承認ゲートのたびに監査ログから実体化する。どのステージが走ったか、どのボルトが分岐したか、どのセンサーが発火したか、`memory.md` の件数。doctor とラーニングループが読む実行ビュー。 |
| **スコープ (Scope)** | 名前付き設定 11 種（enterprise、feature、mvp、poc、bugfix、refactor、infra、security-patch、classic、workshop、express）。どのステージをどの深度で走らせるかを決める。自由文の意図から自動判定もできる。 |
| **センサー (Sensor)** | `.claude/sensors/` のマニフェストで定義する決定論的検査（例: `aidlc-linter.md`、`aidlc-type-check.md`）。一致する Write/Edit、または承認ゲートで既存成果物に一度走り、`SENSOR_*` 監査行を残す。ゲート発火の結びは advisory か blocking。blocking は直すか、監査付きの明示オーバーライドが要る。ステージは frontmatter の `sensors:` で何が発火するかを宣言する。**制御ループ** のフィードバック側。フィードフォワード側はルール。[ルールとラーニングループ](09-rules-and-the-learning-loop.md) を参照。 |
| **テスト戦略 (Test strategy)** | テスト量の 3 段（Minimal / Standard / Comprehensive）。生成するテスト数と種類。深度とは独立。スコープが上書きを宣言しなければ、アクティブな深度に従う。[スコープ・深度・テスト戦略](05-scopes-and-depth.md#the-3-test-strategy-levels) を参照。 |
| **セッション (Session)** | `/aidlc` を走らせる 1 回の会話。再開機構で、ワークフローは複数セッションにまたがれる。 |
| **スキル (Skill)** | Claude Code のプリミティブ。YAML frontmatter 付き Markdown がスラッシュコマンドになる。AI-DLC のオーケストレータは `/aidlc` スキル。利用者向け文書では「スキル」より「コマンド」を使う。 |
| **スペース (Space)** | チームごとの作業場所 `aidlc/spaces/<space>/`。独自の `memory/`、`knowledge/`、インテント記録（`intents/`）を持つ。明示セレクタかセッション紐づけが、gitignore された `aidlc/active-space`（既定 `default`）より先に勝つ。一人チームは `spaces/default/` しか見ない。**インテント**、**ナレッジ** を参照。 |
| **ステージ (Stage)** | ライフサイクルの discrete な 33 ステップ。リードエージェント、入出力、ステージプロトコルを持つ。番号はフェーズ付き（1.1、2.4、3.5）。 |
| **状態ファイル (State file)** | インテントごとの永続状態。`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/aidlc-state.md`。ステージ進捗、スコープ、ワークスペース文脈、再開情報。チェックボックスは 6 状態（`[ ]` / `[-]` / `[?]` / `[R]` / `[x]` / `[S]`）。 |
| **サブエージェント実行 (Subagent execution)** | 委譲ハブ（`mode: subagent`）。コンダクターがハーネスのディスパッチツールで別エージェント文脈を呼ぶ。Code Generation (3.5) は 1 エージェントの集中実行。Practices Discovery (2.2) はハブ＆スポーク。リード下書き、互いに見えない 3 つの寄与、人へのインタビュー、リード統合。 |
| **作業ユニット (Unit of work)** | WHAT。独立して実装できる塊。2.7（Units Generation）で分解し、`unit-of-work-dependency.md` に載る。依存でつながったユニットが 1 ボルトの範囲になる。 |
| **ウォーク順 (Walk order)** | ボルト計画とは別。既定は stage-major（あるステージを全ユニットに走らせてから次のステージ）。任意は `Construction Iteration: unit-major`（1 ユニットを per-unit ステージ全部に通してから次のユニット）。実行時バッチは `unit-of-work-dependency.md`（2.7）。`bolt-plan.md` は計画成果物。walking-skeleton の姿勢は `org.md` → `team.md` → `project.md`（空でない最も具体的な文が勝つ）。 |
| **ウォーキングスケルトン (Walking skeleton)** | 計画上の最初のボルト。すべての結合点を通す、いちばん薄い end-to-end。常にゲート付きで対話。既定の stage-major では、対象になる最初の Construction EXECUTE ステージが配布のゲート。承認の直後にラダープロンプトが出る。 |
| **ユーティリティコマンド (Utility command)** | ワークフロー全体を走らせない `/aidlc` フラグ。`--status`、`--doctor`、`--version`、`--stage`、`--phase`、`--scope` など。 |
| **ワークツリー (Worktree)** | 自律スウォームでボルトを走らせるときの git 隔離。ワークツリーと `bolt-<slug>` ブランチがそのボルトの実行場所。ボルトそのものでもスウォームバッチでもない。 |
| **ワークフロー (Workflow)** | AI-DLC ライフサイクルの 1 回の通し。`/aidlc` からステージ完了まで。特定の作業（機能、バグ修正など）にスコープされる。 |
| **ワークフロープロファイル (Workflow profile)** | 利用者向けの、スコープの呼び名。Classic、Express、Feature、Bugfix など、作業の種類に合わせたライフサイクル。選んだプロファイルがステージ経路と既定値になり、`aidlc-state.md` の `Scope` に残る。[ワークフロープロファイル](workflow-profiles.md) を参照。 |
