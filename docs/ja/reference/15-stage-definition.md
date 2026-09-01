# ステージ定義

この章は、AI-DLC ステージ定義の **ファイル形式** — YAML frontmatter 契約、本文の三区画模型、それらのソースを `stage-graph.json` にするコンパイルパイプライン — を書きます。実行時の振る舞い契約（承認ゲート、質問の流れ、状態追跡）は [Stage Protocol](04-stage-protocol.md) です。この章はステージファイルが*含むもの*、Stage Protocol の章はステージが*すること*です。

貢献者は形式を理解するために読みます。ステージファイルを書く・直すときは、正の契約 `dist/claude/.claude/aidlc-common/protocols/stage-definition.md` を見てください。あのファイルが規範仕様です。この章は物語と「いつ使うか」を足します。

---

## 読者は二人、ファイルは一つ

どのステージ `.md` も、読者は二人です。

- **パーサ**（`lib.ts` の `parseStageFrontmatter`。マイルストーン 7 で出荷）。YAML frontmatter を読み、構造化した `StageEntry` を出します。本文には触れません。
- **ステージを実行する LLM エージェント。** 本文を読み、散文の指示に従い、成果物を出します。frontmatter には触れません。

両方を一つのファイルに置くと、貢献者はグラフの辺と実行ステップを並べて見られます。別ファイルに割る（グラフ用 YAML 1 本、エージェント用散文 1 本）と、ステージをレビューしやすくしているインラインの見通しが壊れます。

---

## なぜ Variant A3 か

形式の名前は "Variant A3" です。v0.3.0 計画で秤にかけた執筆変種 3 つのうち、三つ目です。

- **分割より 1 ファイル。** frontmatter と散文を 1 本の `.md` に置くと、グラフ構造と実行ステップが一緒です。ステージを読むレビュアーは両方見ます。
- **grep しやすい。** 平文。バイナリ形式も、執筆時の YAML 対 JSON 変換もありません。
- **diff しやすい。** フィールド追加、改名、本文編集が、コードレビューできれいに出ます。

却下した代替は、中央グラフファイル（手編集の `stage-graph.json`）と散文だけのステージです。散文を直しているときに、そのステージがどの成果物を出すかがインラインで見えません。

---

## 執筆の流れ

```
┌─────────┐         ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ Edit    │  ───→   │ Pre-commit hook  │  ───→   │ stage-graph.json │  ───→   │ loadStageGraph() │
│ stage   │         │ aidlc-graph      │         │ (build artifact, │         │ (runtime,        │
│ .md YAML│         │ compile          │         │  checked in)     │         │  unchanged)      │
└─────────┘         └──────────────────┘         └──────────────────┘         └──────────────────┘
     │                                                                                 ▲
     │                              ┌──────────────────┐                               │
     └────────────────────────────→ │ CI drift check   │ ──── blocks merge on drift ───┘
                                    │ compile --check  │
                                    └──────────────────┘
```

YAML が正本です。JSON はビルド成果物です。CI がその関係を強制します。

`aidlc-graph compile` と `compile --check` は CLI サブコマンドとして出荷します（マイルストーン 9）。ステージ YAML を直したあとは手動で compile を走らせ、CI が `compile --check` でドリフトを捕えます。これを自動化する pre-commit フックは後の PR へ先送りです。`stage-graph.json` はコンパイル済み成果物です。手で直さないでください。YAML を直して再コンパイルします。

---

## フィールド参照 — いつ使うか

正の仕様に、型と制約付きの完全なフィールド表があります。この節は、判断が要るフィールドの物語を足します。

### `requires_stage`

依存辺を符号化します。役割は二つです。

1. **意味のデータ依存。** 「成果物 X を消費する。ステージ Y が出す」→ `requires_stage` に `Y` を足す。
2. **提示順の辺。** 同じフェーズの 2 ステージに意味依存は無いが、固定の順序がある（例: Ideation で `market-research` のあとに `feasibility`）。弱い辺を足すと、計算した `display_order` が安定に着地します。

コンパイルステップの slug アルファベットタイブレークは安全網です。特定の順に着地しなければならないステージでは、アルファベットの事故に頼らず、辺を明示して書いてください。

### `for_each`

インスタンスが反復を駆動する成果物を指名します。ステージはインスタンスにつき一度走ります。

いまの用途: Construction の 5 ステージ（`functional-design`、`nfr-requirements`、`nfr-design`、`infrastructure-design`、`code-generation`）が Unit につき一度走る。それぞれ `for_each: unit-of-work`（`units-generation` が出す成果物）を宣言します。

明日の用途: 環境ごと、テナントごと、リージョンごと、コンプライアンス管轄ごとのステージ。プリミティブはワークフローエンジンとして汎用です。Construction がたまたま最初に使います。

**集約は宣言せず推論します。** `for_each` ステージが出した成果物を消費し、自分の `for_each` を宣言しないステージは、定義どおり集約ステップです。正準例は `build-and-test` — Construction の `for_each` 5 ステージが Unit を横断して反復したあと一度走り、集約した出力を消費します。明示の `fan_in` も集約フィールドもありません。グラフ走査が図ります。

### `summary_confirmation`

ステージの質問の流れ向けの、決定論的な生成前チェックポイントを制御する任意列挙です。

- `required` は、どの実行も質問ファイルを作り、成果物生成の前に統合 **Looks correct** 確認を取らなければなりません。
- `if-present` は、条件付き質問の流れが質問ファイルを作ったときにだけ、同じ強制を適用します。

レシートは markdown だけから推論しません。`aidlc-log.ts` は、一致するプロンプト記録と後の人のターンのあと、予約の `SUMMARY_CONFIRMATION_RECORDED` イベントを記録し、質問ファイルのダイジェストとその記録した `Hash Scope` に結びます（正規化した正規質問内容向けの `confirmed-content-v1`。ファイル順の見える Q\<n\> とフィードバック節をすべて含む。要約後の `Assumption Confirmation` 節は一つ除外。スコープ無しレガシーレシートはファイル全体 SHA-256）。完了は、欠けた / 古いレシート、変わった確認節または禁じた見出し、レシート後にネイティブ書きの無い宣言成果物を拒否します。飛行中のレガシーレシートは、その許可された追記を受け付ける前に、スコープ付きレシートを作る再確認が要ります。ユニットごとのステージは、当たる Unit ごとにユニット範囲レシート 1 本が要ります。隔離実行は `single-stage:<slug>` ワークフロー身元付きで同じ検査を使います。

### `workspace_requires`

真偽値、既定 `false`。インテントごとのレコードディレクトリ下の計画文書だけでなく、**ワークスペースルートへソースコードを書かなければならない**ステージに `true` をセットします。

存在する理由: ステージの `produces[]` 成果物は通常レコードディレクトリの下へ解決します。例外は Reverse Engineering のリポジトリごとの codekb のようなスペース単位ストアです。だから「produces は存在するか」検査は、`code-generation` ステージが `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md` を書いて実際のコードを一行も出さなくても通ります（issue #366）。`workspace_requires: true` がその隙間を閉じます。ステージ完了の成果物ガード（`aidlc-state.ts` の approve / advance / finalize / complete-workflow）は、ステージが完了してよい前に、`aidlc/` ワークスペース木とハーネスディレクトリの外に本物のソース作業の証拠を追加で要求します。

codekb ステージでは、同じガードがアクティブインテントの記録したリポジトリ集合に従います。記録したどのリポジトリも、正規 `aidlc/spaces/<space>/codekb/<repo>/` ディレクトリに宣言成果物が少なくとも一つ要ります。誤名または未記録のディレクトリは数えません。記録リポジトリの無いインテントは、レガシーの任意リポジトリディレクトリフォールバックを保ちます。

「ソース作業」の検出し方はワークスペースに依ります。

- **Git ワークスペース** — ガードは git に聞くので、このセッションのコードとブラウンフィールドリポジトリの既存 `src/` を区別できます。未コミットまたは未追跡の非ドキュメント変更（`git status --porcelain`）があるか、最後のコミットが非ドキュメントパスを触った（`git diff --name-only HEAD~1 HEAD`）ときに通ります。第二節は、コミットしてから承認（きれいな作業ツリー、コードは最後のコミット）でも通るので、#366 Update 3 のきれいなツリー誤ブロックを閉じます。
- **非 git ワークスペース**（またはどの git エラー） — ガードはシェル無しのファイルシステム存在検査へ落ちます。`aidlc/` ワークスペース木とハーネスディレクトリの外にファイルが少なくとも一つ要ります。

きょう宣言しているのは `code-generation` だけです。そのユニットごとのレビューはさらに `<record>/construction/<unit>/code-generation/source-manifest.json` を要求します。作成・変更・削除したアプリケーションソースパスすべての厳格な帰属索引です。エンジンはマニフェストバイトとクレームした内容をユニットレシートへ結び、新しい各ユニットを内容アドレスのステージ入場ベースラインと比べ、新しいクレームの和集合の外で変わったパスを拒否します。ディレクトリクレームはあとの追加を覆います。メインの複数リポジトリワークスペースでは各エントリが記録リポジトリを指名し、ボルトのマニフェストはその選んだリポジトリ 1 つに相対です。欠けたアップグレード前フィールドは、文書化した移行証拠としてだけ fail-open します。存在するが結び不能、または壊された現代の証拠は fail-close します。自分のコードまたは設定を出すステージ（契約生成器、IaC 実行器）を足すチームは、ワークスペースガードが効くよう `workspace_requires: true` をセットすべきです。CI 向けの迂回は `AIDLC_SKIP_ARTIFACT_GUARD=1`。そのスイッチはレビュー時の必須出力存在検査も迂回します。ソース結びと帰属は別に `AIDLC_SKIP_SOURCE_FRESHNESS=1` で迂回します。

### `produces_kinds`

`for_each: unit-of-work` ステージの任意マップです。各キーはステージの `produces` または `optional_produces` 成果物名の一つ、各値はその成果物が当たる Unit **kind** の一覧です。kind は units-generation の辺ブロックで Unit ごとに宣言します（[Runtime graph](13-runtime-graph.md) の `bolt_dag.units[].kind` 参照）。値は `service | spec | ui | packaging | library` の一つです。

```yaml
produces:
  - performance-requirements
  - security-requirements
  - scalability-requirements
  - observability-requirements
produces_kinds:
  performance-requirements: [service, ui]
  scalability-requirements: [service]
  observability-requirements: [service]
```

存在する理由: Construction 設計の 4 ステージは、どの Unit にも同じ固定 produces 一覧を当てていたので、spec Unit が scalability 文書を、packaging Unit がビジネスロジック模型を負い、人が N/A スタブを書くことになりました。`produces_kinds` はエンジンにマトリクスを Unit ごとに刈らせます。Unit が `kind` を持つとき、エンジンは kind 一覧にその kind を含む produces エントリだけを残します。マップに**載っていない**成果物は全 kind に当たります（kind 固有のものだけ注釈する）。**kind の無い** Unit、または `produces_kinds` マップ自体の無いステージはマトリクス全体を保ちます。既存のどのワークフローにも惰性です。

刈り込みは対称です。run-stage ディレクティブの `produces` パス（コンダクターが書くもの）と、ユニットごとのカバレッジ検査（承認経路ガードが要求するもの）の両方をフィルタします。`optional_produces` と合成します。ディレクティブのパスは両方の一覧の kind フィルタ和集合、カバレッジは必須 `produces` だけをキーにします（任意成果物は当たらない kind のディレクティブから刈られ、どちらにせよカバレッジ免除のまま）。必須集合が**空**に刈られた Unit は定義どおり覆われています。ステージがそれに当たらないからです。*どの* Unit も空に刈られるユニットごとステージは、成果物ガードでデッドロックせず no-op として承認します。4 ステージの既定 kind マトリクスはステージ frontmatter データで、エントリごとにレビューと巻き戻しができます。間違ったエントリを外すと、その成果物のマトリクス全体が戻ります。

在庫の NFR ステージは `observability-requirements` と `observability-design` の両方を service ユニットへ対応づけます。

信頼の注記が一つ: `kind:` 値は units-generation ゲートで列挙検査されます（`required-sections` センサーがタイプミスで大きく失敗する）が、コンパイル済みランタイムグラフはあとで信じます。エンジンは `bolt_dag.units[].kind` を読むとき kind の形だけを検査します（コンパイル済みバッチを信じるのと同じ）。コンパイル済みグラフで手編集したユニットが、妥当だが間違った kind になると、その間違った kind の集合へ黙って刈ります。

### `consumes[].required`

consume エントリごとの真偽値です。意味は **アクティブ計画に範囲付け** であり、成果物がどこかに常にあるというグローバル主張ではありません。

> `required: true` は *「生産ステージがアクティブ計画で走るなら、この consume は満たされなければならない」* です。**「生産者は常に走る」ではありません。** スコープが生産者を外すとき（例: `bugfix` が `units-generation` を飛ばす）、その生産者の成果物のどの `required: true` consume も無意味になります。要求するものがありません。

**なぜ範囲付きの読みか。** 全ステージを実行するのは `enterprise` と `feature` だけです。ほかのスコープは上流ステージを意図的に飛ばします。平らなグローバル `required: true` はそれらのスコープを構造的に無効にし、それは間違いです。正当な運用モードだからです。本当の契約は条件付きです。「上流が走るなら、下流へ送れ」。ステージ本文はすでに欠落をきれいに扱います（「あれば」のような散文指示、または文脈からのフォールバック）。

**doctor lint にとっての意味。** lint は各アクティブスコープを歩き、「このスコープでは Y の生産者が SKIP なので、ステージ X の成果物 Y 向け `required: true` consume は無意味」と報告します。advisory であり、止めません。利用者はスコープを選ぶことで、すでに切り詰めにオプトインしています。

**v0.10.0 が足すもの。** 予約の `when:` プリミティブ（下の「Reserved」節）が、より豊かな述語を著者に書かせます。`when: producer-in-plan`、`when: mode == brownfield`、`when: scope != poc`。きょうの `required: true` + `conditional_on: brownfield|greenfield` 対が、v0.3.0 が要る二軸を覆います。`when:` がそれを一般化します。

### `consumes[].conditional_on`

ブラウンフィールド / グリーンフィールドの分かれを取ります。例: `reverse-engineering` はブラウンフィールドモードでのみ成果物を出します。それらを消費するステージは consume に `conditional_on: brownfield` を付け、スコープリゾルバへ「この consume はブラウンフィールドのときだけ必須」と伝えます。

無条件 consume では、**フィールドをまるごと省きます。** `always` 値はありません。無条件 consume は単に `conditional_on` キーがありません。

### `optional_produces`

`produces:` と並ぶ、平らな kebab-case 文字列一覧です。ステージがユニットごとに書いて**よい**が、**必須ではない**成果物を指名します。無いことは無しです。要るステージは 1 つだけ（`functional-design`、`frontend-components` 向け）が宣言するので、コンパイル済み `stage-graph.json` は最小のままです。

存在する理由: ユニットごとの Construction ステージ（`for_each: unit-of-work`）がユニットについて COVERED になるのは、そのユニットのレコードディレクトリ下にすべての `produces[]` 成果物があるときです（`aidlc-orchestrate.ts` のユニットごとカバレッジ検査）。一部の成果物は本当にユニットに条件付きです。`functional-design` はユニットに UI があるときだけ `frontend-components` を書きます。それを `produces:` に置くと、バックエンドだけのユニットがカバレッジを満たすため N/A スタブを書かされ、書くまでステージゲートに届きません。`optional_produces:` へ移すと免除されます。

- **カバレッジ免除。** ユニットごとカバレッジループは `optional_produces` エントリを無視します。ユニットは **必須** `produces[]` 成果物がある時点で覆われます。任意のものは `next` の進行も `approve` のコミットも止めません。
- **コンダクター向けにはまだ解決する。** run-stage ディレクティブの `produces` パスは `produces` + `optional_produces` の和集合なので、ユニットが条件付き成果物を**書く**とき、コンダクターは着地点をまだ知っています。ステージが `produces_kinds` も宣言していれば、その和集合は解決前に kind フィルタされます（上の `produces_kinds`）。当たらない kind はパスを見ません。
- **語彙にはまだ入る。** `artifactsRegistry()` と `producersOf()` は両方の一覧を和集合するので、成果物名とその生産ステージは登録されたままです。

**対の慣例。** どの `optional_produces` エントリも、ステージ本文の散文（と `outputs:` 文字列）に `(CONDITIONAL - ...)` 印が**必須**です。エージェントにいつ書くかを伝えます。frontmatter キーはエンジンのカバレッジビュー、散文はエージェントの指示です。同期を保ってください。

**警告。** `optional_produces` 印の成果物はユニットごとカバレッジ台帳に見えません。エンジンはユニットが出したことを証明できません。本当にユニットに条件付きの成果物にだけ使い、ステージがユニットごとに常に書くべき成果物のカバレッジを静かに緩めるためには使わないでください。

### `mode`

ステージの **通信トポロジ** — 本文が走っているあいだ、誰が誰と話すか。値は 5、アクティブは 4 です。

- `inline` — コンダクターが自分の文脈でステージを走らせます。サポートエージェントは載せる視点（声）です。ディスパッチはゼロ。短いステージ、実行が速い、コンテキスト圧が無い。
- `subagent` — ハブ＆スポーク。リードを新しいサブエージェント文脈へディスパッチします（長いステージ、例: Construction のコード生成。コンダクターのコンテキストを膨らませる）。ステージが `support_agents` も宣言していれば、それぞれがリードの返した下書きに対する本物のスポークとしてディスパッチされます（互いに見えないブリーフ。成果物はパスで、蓄積した操舵束を運ぶ）。リードは統合のためにもう一度ディスパッチされます。
- `pipeline` — チェーン。リードが下書きし、各サポートエージェントが宣言順に豊かにし、どのリンクも下書きとより早い寄与をすべて見ます。順が要点です。空でない `support_agents` が要り、リードとサポート鎖を横断するどのエージェントも一意でなければなりません。
- `mob` — メッシュ。回数に上限があるラウンドとして走ります。全サポートエージェントがリードの下書きに対して並行で寄与（互いに見えない）、リードが統合、未解決の異議者はほかの参加者の立場付きで確認または維持のラウンドを 1 回得ます。維持した異議はゲートで原文引用します。空でない `support_agents` が要ります。出荷の見本は `user-stories`（Product Manager リード。Design、Developer、Quality 協力者。Product Lead レビュアー — モブ精緻化の儀式）。
- `agent-team` — **予約。** メッシュ協働の将来ネイティブバス輸送。Anthropic の実験的 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` プリミティブが安定したら、生きたピアメッセージ部屋が、コンダクターが運ぶラウンド無しで `mob` の意味を運べます。`mob` が移植可能なモードです。どのステージも `agent-team` を宣言しません。

どのトポロジでもコンダクターがバスです。エージェントは互いを呼びません。委譲するのはコンダクターだけです。書き模型は本物の作業セッションを映します。各自が自分の仕事を書き、所有者がまとめ編集します。ディスパッチされた各サポートエージェントは寄与ファイルを書きます（`contributions/<agent-slug>.md`、`stage-protocol-ensemble.md` §11 の形、先頭行の身元印）。リードだけがステージの `produces[]` 成果物を編集します。パイプラインリンクは代わりに成果物を直接進めます。mob とサポート付き subagent ステージでは、寄与ファイルが完了証拠です。1 本欠けているあいだエンジンは承認を拒否します。レビューループはモードではありません。`reviewer` + `reviewer_max_iterations` がどのモードの上にも二当事者の批評トポロジを届け、NOT-READY はリードだけを再呼び出します。

**消費者契約。** `mode` フィールドを読むオーケストレータコードは、`agent-team` を明示的に扱わなければなりません。最低でも "mode agent-team not yet implemented" を throw します。既定の実行経路へ落ちてはいけません。列挙拡張での黙ったフォールスルーは既知の落とし穴です。

**スウォーム引き金の結合。** 自律 Construction スウォームは `for_each: unit-of-work` + `mode: subagent` で発火します。ユニットごとのビルドステージのモードを変えると、黙ってスウォーム経路から外れます。`aidlc-graph compile` はその形を見ると stderr advisory を出します。

### `lead_agent` と `support_agents`

リードエージェントがステージを所有します。リードのペルソナ（スキル、ナレッジ、ツール許可リスト）はステージ開始で載ります。サポートエージェントは視点を足します。要件作業では `aidlc-product-agent` をリードにし、容量の現実確認では `aidlc-delivery-agent` をサポートとして載せる、などです。

両フィールドは `.claude/agents/*.md` に対して `loadAgents()` 経由で動的検証します（マイルストーン 3 で導入）。`aidlc-graph.ts compile` が発見したエージェント slug を `validateStageFrontmatter` へ渡すので、一致ファイルの無いエージェントを指名する `lead_agent` または `support_agents` 値は、実行時に未登録サブエージェントの `Task` エラーとして表に出るのではなく、コンパイルで大きく失敗します（`lead_agent "<name>" has no matching .claude/agents/*.md`）。唯一の免除は予約の `orchestrator` 疑似エージェント（コンダクター自身。ブートストラップ初期化ステージの `lead_agent` として指名）。設計どおりエージェントファイルはありません。スキーマにハードコード列挙はありません。エージェントを足すことは、必須 frontmatter 付き `.md` ファイルを `.claude/agents/` に置くことです。[Contributing: Adding an Agent](11-contributing.md#adding-an-agent) を見てください。パイプラインステージはさらに、鎖のほかの場所で繰り返されたサポートエージェント（リードをサポートとして繰り返すことを含む）を拒否します。リンクレシートが宣言位置を一意エージェントで識別するからです。

### `reviewer`、`review_artifact`、`reviewer_max_iterations`、`review_class`

任意です。`reviewer` は、ステージ本文が成果物を出したあと、承認ゲートの前に呼ぶ品質ゲートエージェントを指名します（[Stage Protocol](04-stage-protocol.md)）。きょう出荷するレビュアーは 2 — `aidlc-product-lead-agent` と `aidlc-architecture-reviewer-agent` — コンパイルは `lead_agent` と同じく、発見したエージェント名簿に対して値を検証します。

レビュアー付きステージはすべて `review_artifact` も宣言し、`produces[]` の必須 Markdown エントリ 1 つを指名しなければなりません。そのスカラーが追記 `## Review` 節の唯一の所有者です。一覧順とプラグインが足した出力は変えられません。ユニットごとのステージでは、必須出力が当たるどの Unit kind でも対象が当たったままでなければ、グラフコンパイルが失敗します。`traceability.json` のような構造化出力はレビュー対象にできません。

`reviewer_max_iterations` は、未解決所見のままゲートへ進む前のレビュー / 改訂ループの上限です。`reviewer` が宣言されて上限が無いときの**既定は 2** です。コンパイラは欠けた、または正でない値を 2 へ強制します。`reviewer` を宣言しないステージではフィールドを省きます。コンパイラは `reviewer` 無しの `reviewer_max_iterations` を拒否します（スキーマエラー `reviewer_max_iterations requires a reviewer` がグラフコンパイルを落とす）。だから黙って無視されることはありません。

`review_class` はレビュー契約を選びます。`adversarial`（上の反駁と修理ループ — `reviewer` がクラス無しで宣言されたときの既定）または `advisory`（所見を人の承認ゲートで原文引用する通常フロー 1 回。修理ループ無し。有効イテレーション予算は 1）。終端レシートを無効にするあとの書きは、次の序数で有界な復旧依頼を 1 回許可します。出荷の分かれ: 人ゲート付き ideation / inception 散文ステージ 7 は `advisory` を宣言。Construction 設計 / ビルドステージ 5 は既定 `adversarial`。`none` は意図的にステージ値ではありません。レビュー無しのステージは `reviewer:` 行を消します。`none` はスコープの `review_cap` と実行ごとの `--review` 上書きにあり、ステージを直さずに宣言したレビュアーを黙らせられます。実行時の有効クラスは、ステージ宣言、アクティブスコープの `review_cap`（出荷の `bugfix`、`poc`、`classic`、`workshop` スコープは `advisory` へ上限、`express` は `none` へ上限）、実行ごとの上書きの**いちばん低い**ものです。上限や上書きはクラスを下げられますが、上げられません。自律スウォームレビューは上限と上書きから免除です。ボルトの中ではレビュアーがマージ前の唯一の検証なので、宣言クラスが常にそこで効きます。上限と同じく、`review_class` は `reviewer` が要ります（スキーマエラー `review_class requires a reviewer`）。

---

## エージェント frontmatter との関係

ステージとエージェントは同じ YAML 先行の規律に従います。エージェント frontmatter（[Agent System](05-agent-system.md#frontmatter-contract)）は *誰* — エージェント名、許可ツール、tier — を宣言します。ステージ frontmatter は *何* — ステージが出す・消費する成果物、委譲するエージェント、実行の仕方 — を宣言します。

両方の形式:

- 自分の領域の正本である（並行のハードコードマップが無い）。
- 型付き構造を返す `loadX()` ヘルパと同梱する。
- ハードコード列挙ではなくファイルシステムに対して動的検証する。

新しいステージを足す形は、新しいエージェントを足すのと同じです。`.md` ファイルを置き、必須 frontmatter を足すと、ヘルパが実行時に拾います。

---

## 作業例

正準例は `scope-definition` です。規範 YAML ブロックは `dist/claude/.claude/aidlc-common/protocols/stage-definition.md` にあります。ここへ複製せず、そちらを見てください。

例は、いまの散文が述べることを構造化して符号化します。

- `requires_stage: [intent-capture]` は、散文指示「インテントの `ideation/intent-capture/`（レコードディレクトリの下）から intent statement を読め」を符号化します。パーサは散文を気にせず、グラフの辺だけを見ます。人の読み手は同期を保つべきです。
- `consumes: [{artifact: intent-statement, required: true}]` は、`intent-statement` があるまでこのステージは塞がると言います。スコープのリゾルバが `intent-statement` の生産者を見つけられなければ、doctor の欠けた生産者検査が落ちます。
- `produces: [scope-document, intent-backlog, scope-definition-questions]` は前方の辺です。「誰が `scope-document` を出すか」を探すほかのステージが、`aidlc-graph.ts producersOf()` 経由でこれを見つけます。
- `for_each` フィールドは無し — `scope-definition` はワークフローにつき一度走ります。

---

## 本文の三区画模型

ステージファイルの本文は三区画で、この順に宣言します。v0.3.0 で埋まっているのは `## Steps` だけです。

| Compartment | v0.3.0 | v0.5.0 | What goes here |
|-------------|--------|--------|----------------|
| `## Steps` | Required, populated | Unchanged | Imperative prose the agent follows |
| `## Sensors` | Reserved, absent | Populated | Compact output-location, imported-sensor, and upstream-target summary; stage-specific exceptions remain local |
| `## Learn` | Reserved, absent | Populated | Compact pointer to the shared §13 learning-loop contract and bootstrap exception |

v0.3.0 で三区画を先に宣言したので、v0.5.0 の追加は本文再構成ではなく差し込み変更でした。`## Sensors` の結び意味と pull-import 模型は [Sensor System](07-sensor-system.md)。共有センサー振る舞いは `stage-protocol.md` §14 に一度定義し、学習儀式の全体は §13 にあります。

**マイルストーン 8 移行規則:** 既存本文を `## Steps` の下へ包むだけです。ほかは何もしません。ほとんどのステージファイルはすでに最初の本文見出しとして `## Steps` を使っています。

---

## YAML 移行 — 出荷済み

マイルストーン 7 が `lib.ts` に `parseStageFrontmatter` と `emitStageFrontmatter` を出荷しました。YAML のみ、散文後方互換経路はありません。マイルストーン 8 がステージファイル 31 すべてを、一つの原子変更で YAML frontmatter へ移行しました。マイルストーン 9 が `aidlc-graph.ts` を YAML から `stage-graph.json` へコンパイルするよう広げ、CI ドリフトガードとして `compile --check` を足しました。きれいな木で `bun aidlc-graph.ts compile --check` を走らせると exit 0。どのステージ YAML も JSON を再コンパイルせずに直すと、はっきりしたメッセージで exit 1 です。

---

## v0.3.0 の既知の限界

- **`for_each` は新しい。** `**Per-Unit**: Yes` の Construction ステージ 5 が `for_each: unit-of-work` へ移行します。ほかの 26 ステージはフィールドをまるごと省きます。
- **Sensors / Learn 区画は宣言済みだが空。** パーサは欠落を許します。v0.5.0 が埋めました（[Sensor System](07-sensor-system.md)）。
- **ドリフト検査を超える実行時検証は無い。** パーサは妥当な `StageEntry` を出すどの YAML も受け付けます。doctor のあとの拡張が、その上に advisory のルール / センサー検査を足します。

---

## 将来の拡張 — 予約名前空間

仕様は、後のリリースで AI-DLC が足しそうなプリミティブの名前を予約します。スキーマは未知キーを拒否します。ここで名前を予約すると、将来の貢献が場当たり追加と衝突しません。

| Key | Likely release | What it will do |
|-----|----------------|-----------------|
| `when` | v0.10.0 fitness compiler | Structured condition. Compiles `condition` prose into machine-enforceable logic. Supersedes `consumes[].conditional_on` and generalises today's scope-aware `consumes[].required` with richer predicates (`producer-in-plan`, `mode == brownfield`, `scope != poc`) |
| `on_failure` | v0.8.0 Ralph loop | Declarative error recovery — "if this stage fails, jump back to X" or "retry with adjusted inputs". Moves revision semantics out of `stage-protocol-recovery.md` prose |
| `blocks_on` | v0.4.0 Construction (if surfaced) | Completion dependency without data read — splits today's overloaded `requires_stage` (which conflates "I consume your output" with "I run after you") |
| `timeout` | v0.5.0 sensor binding | Execution budget (deadline). Homed in sensor bindings, not stage frontmatter |
| `retry` | v0.8.0 Ralph loop | Retry policy on failure. Homed in loop config, not stage frontmatter |

設計の根拠: Claude Code 自身のタスクプリミティブ（TaskCreate 族に加え `/loop` と cron）は依存、blocks、retry、timeout を省きます。複数ステップのオーケストレーションはすべてクライアント側コードへ押し出します。この実装はその選択を映し、実行振る舞い（再試行、タイムアウト、失敗処理）をステージ仕様ではなくループとセンサーサブシステムに置きます。上のフィールドは、消費者が現れたときの控えめな構造拡張であり、新しいパラダイムではありません。

予約名前空間の型には、監査分類（[State Machine](12-state-machine.md)）の先例があります。イベント名を Emitter 欄 `Reserved (v0.x PR N)` で先行登録します。名前はレジストリにありますが、消費 PR が出荷するまでコードは発行せず、その時点で同じコミットが `Reserved` 印を本物の発行元パスに置き換えます。

---

## Cross-references

- `dist/claude/.claude/aidlc-common/protocols/stage-definition.md` — この章が物語る正の仕様。
- [Stage Protocol](04-stage-protocol.md) — 実行時の実行振る舞い。
- [Agent System](05-agent-system.md) — エージェントファイルの並行 YAML 先行契約。
- [State Machine](12-state-machine.md) — ステージ実行が監査イベントを出す場所。
