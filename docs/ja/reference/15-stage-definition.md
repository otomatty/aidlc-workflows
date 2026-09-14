# ステージ定義

この章は、AI-DLC ステージ定義の **ファイル形式** — YAML frontmatter 契約、本文の三区画模型、それらのソースを `stage-graph.json` にするコンパイルパイプライン — を書きます。実行時の振る舞い契約（承認ゲート、質問の流れ、状態追跡）は [Stage Protocol](04-stage-protocol.md) です。この章はステージファイルが*含むもの*、Stage Protocol の章はステージが*すること*です。

貢献者は形式を理解するために読みます。ステージファイルを書く・直すときは、正の契約 `core/aidlc-common/protocols/stage-definition.md` を見てください。あのファイルが規範仕様です。この章は物語と「いつ使うか」を足します。

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
Edit stage YAML
      |
      v
bun scripts/package.ts
      |
      +--> ignored dist/<harness>/tools/data/stage-graph.json
      |
      +--> ignored dist-release/<harness>/tools/data/stage-graph.json
                    |
                    v
             loadStageGraph()
```

YAML が正本です。JSON は生成したビルド成果物です。リポジトリのパッケージングはソースから再生成します。入れた実行時は、プラグイン合成のあとそれを再コンパイルすることもあります。

`aidlc engine graph compile` と `compile --check` は実行時と診断のサブコマンドのままですが、リポジトリ貢献者はコンパイル済み JSON コピーをソース管理に残しません。YAML を直して `bun scripts/package.ts` を走らせます。パッケージングが新鮮な無視される投影を作り、`bun scripts/package.ts --check` は生成器の決定論を検査するために一時ルートで二度ビルドします。

---

## フィールド参照 — いつ使うか

正の仕様には、型と拘束付きの完全なフィールド表があります。この節は、判断が要るフィールドの物語を足します。

### `requires_stage`

依存辺を符号化します。役割は 2 つ:

1. **意味のデータ依存。** 「成果物 X を消費する。ステージ Y が出す」→ `Y` を `requires_stage` へ足す。
2. **提示順の辺。** 同じフェーズの 2 ステージに意味の依存は無いが、固定の順序がある（例: Ideation で `market-research` の前に `feasibility`）。弱い辺を足すと、計算した `display_order` が安定して着地します。

コンパイルステップの slug アルファベット順タイブレークは安全網です。特定の順に着地しなければならないステージでは、アルファベットの偶然に頼らず、辺を明示して書いてください。

### `for_each`

インスタンスが反復を駆動する成果物を指名します。ステージはインスタンスごとに一度走ります。

きょうの用例: Construction ステージ 5 つ（`functional-design`、`nfr-requirements`、`nfr-design`、`infrastructure-design`、`code-generation`）は Unit ごとに一度走ります — それぞれ `for_each: unit-of-work`（`units-generation` が出す成果物）を宣言します。

明日の用例: 環境ごと、テナントごと、リージョンごと、コンプライアンス管轄ごとに走るステージ。プリミティブはワークフローエンジン汎用です。Construction がたまたま最初に行使します。

**集約は宣言ではなく推論です。** `for_each` ステージが出す成果物を消費し、自分の `for_each` を宣言しないステージは、定義上集約ステップです。`build-and-test` が正準例です — Construction の `for_each` ステージ 5 つがすべて Unit 横断で反復したあと一度走り、それらの集約出力を消費します。明示の `fan_in` や集約フィールドはありません — グラフ走査が分かります。

### `summary_confirmation`

ステージの質問流れ向けの、決定論的な生成前チェックポイントを制御する任意 enum:

- `required` は、どの実行も質問ファイルを作り、成果物生成の前に統合した **Looks correct** 確認を得なければなりません。
- `if-present` は、条件付き質問流れが質問ファイルを作ったときだけ、同じ強制を適用します。

レシートは markdown だけからは推論しません。`aidlc-log.ts` は、一致するプロンプト記録と後の人のターンのあと、予約 `SUMMARY_CONFIRMATION_RECORDED` イベントを残し、質問ファイルのダイジェストとその記録した `Hash Scope` へ結びます（`confirmed-content-v1` は正規化した正準質問中身。ファイル順の見える Q<n> とフィードバック節すべてを含む。要約後の `Assumption Confirmation` 節 1 つは除外。スコープ無しレガシーレシートはファイル全体の SHA-256）。`Looks correct` レシートは `Summary Authorization Id` も運びます（試行、ステージ、Unit、ワークフロー、質問パス、確めた中身、選択のダイジェスト）。それがスコープのアクティブ認可になり、書き込み監査フックはその id を、ステージ出力の後のすべての `ARTIFACT_CREATED` / `ARTIFACT_UPDATED` 行に刻印します。完了は、欠けたまたは古いレシート、変わった確めた節または禁じた見出し、いまのレシート id を運ばない宣言成果物の最新ネイティブ書き（出力がいまの確認から降りていない）を拒否します。同一の再確認は同じ id を発行するので、繰り返した `Looks correct` は取り消さず再確めます。変わった答えは新しい id を発行するので、出力はその下でもう一度保存しなければなりません。レシートと書きが着地した順は何も決めません。id の無いレガシーレシートは、レシート後のネイティブ書きをまだ要求し、飛行中のレガシーレシートは、その許可した追記が受け入れられる前に、スコープ付きレシートを作るため再確認しなければなりません。ユニットごとステージは、適用する Unit ごとに 1 つのユニットスコープレシートが要ります。隔離実行は、`single-stage:<slug>` ワークフロー身元で同じ検査を使います。

### `workspace_requires`

真偽。既定は `false`。インテントごとのレコードディレクトリ下の計画文書だけではなく、**ワークスペースルートへソースコードを書かなければならない** ステージに `true` をセットします。

存在する理由: ステージの `produces[]` 成果物は通常レコードディレクトリの下へ解決します。Reverse Engineering のリポジトリごとの codekb のようなスペース単位ストアは例外です。だから「produces は存在するか」検査は、`code-generation` ステージが `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md` を書いたが、実際のコードの 1 行も出さなかったときに満たされます（issue #366）。`workspace_requires: true` がその隙間を閉じます: ステージ完了の成果物ガード（`aidlc-state.ts` の approve/advance/finalize/complete-workflow）は、ステージが完了してよい前に、`aidlc/` ワークスペース木とハーネスディレクトリの外に本物のソース仕事の証拠を加えて要求します。

codekb ステージでは、同じガードがアクティブインテントの記録したリポジトリ集合に従います。記録したどのリポジトリも、正準 `aidlc/spaces/<space>/codekb/<repo>/` ディレクトリに宣言成果物が少なくとも 1 つ要ります。誤名または未記録のディレクトリは数えません。記録したリポジトリが無いインテントは、レガシーの任意リポジトリディレクトリフォールバックを保ちます。

「ソース仕事」の検出はワークスペースに依存します:
- **Git ワークスペース** — ガードは git に聞くので、このセッションのコードをブラウンフィールドリポジトリの既存 `src/` から区別できます。コミットしていないまたは追跡していない非ドキュメント変更がある（`git status --porcelain`）、または最後のコミットが非ドキュメントパスに触れた（`git diff --name-only HEAD~1 HEAD`）とき通ります。第二節は、コミットしてから承認する（きれいな作業木、コードは最後のコミット）もまだ通るので、#366 Update 3 のきれいな木の偽ブロックを閉じます。
- **非 git ワークスペース**（またはどの git エラー） — ガードはシェル無しのファイルシステム存在検査へ落ちます: `aidlc/` ワークスペース木とハーネスディレクトリの外にファイルが少なくとも 1 つ存在しなければなりません。

きょう宣言するのは `code-generation` だけです。そのユニットごとのレビューは加えて `<record>/construction/<unit>/code-generation/source-manifest.json` を要求します: 作った、直した、消したアプリケーションソースパスすべての厳密帰属インデックス。エンジンはマニフェストバイトと主張した中身をユニットレシートへ結び、新鮮な各ユニットを内容アドレスのステージ入場ベースラインと比べ、新鮮な主張和集合の外の変わったパスを拒否します。ディレクトリ主張は後の追加を覆います。メインの複数リポジトリワークスペースでは、どのエントリも記録したリポジトリを指名し、ボルトのマニフェストはその選んだ 1 リポジトリ相対です。欠けたアップグレード前フィールドは、文書化した移行証拠としてだけ fail-open します。存在するが結べない、または壊れた現代証拠は fail-closed です。自分のコードまたは設定を出すステージ（契約生成器、IaC 実行器）を足すチームは、ワークスペースガードが効くよう `workspace_requires: true` をセットすべきです。CI では `AIDLC_SKIP_ARTIFACT_GUARD=1` で迂回します。そのスイッチはレビュー時の必須出力存在検査も迂回します。ソース結びと帰属は別に `AIDLC_SKIP_SOURCE_FRESHNESS=1` で迂回します。

### `produces_kinds`

`for_each: unit-of-work` ステージ上の任意マップ: 各キーはステージの `produces` または `optional_produces` 成果物名の 1 つ、各値はその成果物が適用する Unit **kind** の一覧です。kind は units-generation の辺ブロックで Unit ごとに宣言します（[Runtime graph](13-runtime-graph.md) の `bolt_dag.units[].kind`）。`service | spec | ui | packaging | library` のどれかです。

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

存在する理由: Construction 設計ステージ 4 つは、どの Unit にも同じ produces 一覧を同じに適用して走ったので、spec Unit はスケーラビリティ文書を、packaging Unit はビジネスロジック模型を負いました — 人が書かなければならない N/A スタブです。`produces_kinds` はエンジンがマトリクスを Unit ごとに刈れるようにします: Unit が `kind` を運ぶとき、エンジンはその kind 一覧にその kind を含む produces エントリだけを残します。マップに **載っていない** 成果物はすべての kind に適用します（kind 固有のものだけ注釈する）。**kind が無い** Unit、または `produces_kinds` マップが無いステージは、マトリクス全体を保ちます — だから既存のどのワークフローにも惰性です。

刈り込みは対称です: run-stage ディレクティブの `produces` パス（コンダクターが書くもの）と、ユニットごとのカバレッジ検査（承認経路ガードが要求するもの）の両方をフィルタします。`optional_produces` と合成します: ディレクティブのパスは両方の一覧の kind フィルタした和集合で、カバレッジは必須 `produces` だけを鍵にします（任意成果物は適用しない kind ではディレクティブから刈られ、どちらにせよカバレッジ免除のまま）。必須集合が **空** へ刈られる Unit は定義上カバーされています — ステージはそれに適用しない — そして *どの* Unit も空へ刈られるユニットごとステージは、成果物ガードでデッドロックするのではなく no-op として承認します。4 ステージの既定 kind マトリクスはステージ frontmatter データで、エントリごとにレビュー可能で戻せる。誤ったエントリを外すとその成果物のマトリクス全体が戻ります。

出荷 NFR ステージは `observability-requirements` と `observability-design` の両方を service ユニットへ写します。

信頼の注記 1 つ: `kind:` 値は units-generation ゲートで enum 検査されます（`required-sections` センサーが誤字で大きく失敗します）。が、コンパイル済みランタイムグラフはあとで信じます — エンジンは `bolt_dag.units[].kind` を読むとき kind の形だけを検査します（コンパイル済みバッチを信じるのと同じ）。コンパイル済みグラフで手編集したユニットが妥当だが誤った kind になると、黙ってその誤った kind の集合へ刈られます。

### `consumes[].required`

消費エントリごとの真偽。意味上は **アクティブな計画にスコープ** され、成果物がどこかにいつも存在するという大域主張ではありません:

> `required: true` は *「出すステージがアクティブな計画で走るなら、この消費は満たされなければならない」* です。「プロデューサーがいつも走る」では **ありません**。スコープがプロデューサーを除外するとき（例: `bugfix` が `units-generation` を飛ばす）、そのプロデューサーの成果物のどの `required: true` 消費も無効になります — 要求するものがありません。

**スコープした読みの理由。** すべてのステージを実行するのは `enterprise` と `feature` だけです。ほかのスコープは意図して上流ステージを飛ばします。平らな大域 `required: true` はそれらのスコープを構造的に無効にし、それは誤りです — 正当な運用モードです。本当の契約は条件付きです: 「上流が走るなら、下流へ食わせる」。ステージ本文はすでに不在ケースを優雅に扱います（「あれば」や文脈からのフォールバックのような散文指示）。

**doctor lint への意味。** lint は各アクティブスコープを歩き、「ステージ X の成果物 Y の `required: true` 消費は、このスコープで Y のプロデューサーが SKIP なので無効」と報告します。助言であり、ブロックではありません — 利用者はスコープを選ぶことで切り詰めへすでにオプトインしています。

**v0.10.0 が足すもの。** 予約 `when:` プリミティブ（下の "Reserved" 節）が、著者がより豊かな述語を表せるようにします — `when: producer-in-plan`、`when: mode == brownfield`、`when: scope != poc`。きょうの `required: true` + `conditional_on: brownfield|greenfield` 対が v0.3.0 が要る 2 次元を覆い、`when:` がそれを一般化します。

### `consumes[].conditional_on`

brownfield / greenfield 分割を捉えます。例: `reverse-engineering` は brownfield モードだけで成果物を出します。それらの成果物を消費するステージは、消費に `conditional_on: brownfield` を付け、スコープリゾルバへ「この消費は brownfield のときだけ必須」と伝えます。

無条件の消費では、**フィールドを完全に省略** します。`always` 値はありません — 無条件の消費は単に `conditional_on` キーがありません。

### `optional_produces`

`produces:` と並ぶ、平らな kebab-case 文字列一覧です。ステージがユニットごとに書いて **よい** が、書くことが **必須ではない** 成果物を指名します。無いことは無し。それを要するのは 1 ステージだけ（`functional-design`、`frontend-components` 向け）なので、コンパイル済み `stage-graph.json` は最小のままです。

存在する理由: ユニットごと Construction ステージ（`for_each: unit-of-work`）は、そのユニットのレコードディレクトリの下にすべての `produces[]` 成果物がディスク上に存在するときだけ、そのユニットに対して COVERED です（`aidlc-orchestrate.ts` のユニットごとカバレッジ検査）。一部の成果物は本当にユニットに条件付きです — `functional-design` はユニットに UI があるときだけ `frontend-components` を書きます。それを `produces:` の下に載せると、バックエンドだけのユニットがカバレッジを満たすためだけに N/A スタブを書かされ、書くまでステージゲートに到達できませんでした。`optional_produces:` へ動かすと免除します:

- **カバレッジ免除。** `optional_produces` エントリはユニットごとカバレッジループが無視します。ユニットは **必須** `produces[]` 成果物が存在すればカバーされます。任意のものは `next` の進行も `approve` のコミットも決してブロックしません。
- **コンダクター向けにはまだ解決する。** run-stage ディレクティブの `produces` パスは `produces` + `optional_produces` の和集合なので、ユニットが条件付き成果物を書くとき、コンダクターはまだ着地場所を知ります。ステージが `produces_kinds` も宣言しているとき、その和集合は解決前に kind フィルタされます（上の `produces_kinds`）。だから任意成果物が適用しない kind はそのパスを決して見ません。
- **まだ語彙にある。** `artifactsRegistry()` と `producersOf()` は両方の一覧を和集合するので、成果物名とそのプロデューサーステージは登録されたままです。

**対の約束。** どの `optional_produces` エントリも、ステージ本文散文（と `outputs:` 文字列）に `(CONDITIONAL - ...)` 印が要ります。エージェントへいつ書くかを伝えます。frontmatter キーはエンジンのカバレッジ視界、散文はエージェントの指示です。同期を保ってください。

**警告。** `optional_produces` と印した成果物はユニットごとカバレッジ台帳に見えません — エンジンはユニットが出したことを証明できません。ユニットに正当に条件付きの成果物だけに使い、ステージがユニットごとにいつも書くべき成果物のカバレッジを黙って緩めるためには決して使わないでください。

### `mode`

ステージの **通信トポロジ** — 本文が走っているあいだ誰が誰と話すか。値は 5、アクティブは 4:

- `inline` — コンダクターが自分の文脈でステージを走る。サポートエージェントは採用する視点（声）。派遣ゼロ。短いステージ、実行が速い、文脈圧無し。
- `subagent` — ハブ＆スポーク。リードは新鮮なサブエージェント文脈へ派遣されます（コンダクターの文脈を膨らませる長いステージ、例: Construction コード生成）。ステージが `support_agents` も宣言しているとき、それぞれがリードの返した下書きに対する本物のスポークとして派遣され（成果物をパスで運び、蓄積した操舵束を運ぶ、互いに見えないブリーフ）、リードは統合のためにもう一度派遣されます。
- `pipeline` — 鎖。リードが下書きし、各サポートエージェントが宣言順で豊かにし、どのリンクも下書きと先行寄与すべてを見ます。順序が要点です。空でない `support_agents` が要り、リードとサポート鎖横断のどのエージェントも一意でなければなりません。
- `mob` — メッシュ。有界ラウンドとして走る: すべてのサポートエージェントがリードの下書きに対して並行して寄与し（互いに見えない）、リードが統合し、未解決の異議者はほかの参加者の立場付きで確める / 維持するラウンドを 1 つ得ます。維持した異議はゲートでそのまま引用されます。空でない `support_agents` が要ります。出荷の見本は `user-stories`（Product Manager リード。Design、Developer、Quality 協働者。Product Lead レビュアー — モブ精緻化儀式）。
- `agent-team` — **予約。** メッシュ協働向けの将来のネイティブバス輸送: Anthropic の実験 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` プリミティブが安定したら、生きたピアメッセージ部屋が、コンダクターが運ぶラウンド無しで `mob` の意味を運べます。`mob` が移植可能なモードです。どのステージも `agent-team` を宣言しません。

どのトポロジでもコンダクターがバスです。エージェントは互いを決して呼ばず — 委譲するのはコンダクターだけです。執筆模型は本物の作業セッションを映します: 誰もが自分の仕事を書き、所有者が照合して編集します。各派遣サポートエージェントは寄与ファイル（`contributions/<agent-slug>.md`、`stage-protocol-ensemble.md` §11 形。身元印が最初の行）を書きます。リードだけがステージの `produces[]` 成果物を編集します。パイプラインリンクは代わりに成果物を直接進めます。モブとサポート付きサブエージェントステージでは、寄与ファイルが完了証拠です — 1 つでも欠けるとエンジンは承認を拒否します。レビューループはモードではありません: `reviewer` + `reviewer_max_iterations` がどのモードの上にも二者批判トポロジを届け、NOT-READY はリードだけを再呼びします。

**消費者契約。** `mode` フィールドを読むオーケストレータコードは `agent-team` を明示して扱わなければなりません — 最低でも "mode agent-team not yet implemented" を投げます。既定実行経路へ落ちないでください。enum 拡張での沈黙フォールスルーは既知の足銃です。

**スウォーム引き金結合。** 自律 Construction スウォームは `for_each: unit-of-work` + `mode: subagent` で発火します。ユニットごとビルドステージを再モードすると、黙ってスウォーム経路から外れます。`aidlc engine graph compile` はその形を見ると stderr 助言を出します。

### `lead_agent` と `support_agents`

リードエージェントがステージを所有します。リードのペルソナ（スキル、ナレッジ、ツール許可リスト）はステージ開始時に読みます。サポートエージェントは視点を足します — ステージは要件仕事で `aidlc-product-agent` をリードにしつつ、容量の現実検査で `aidlc-delivery-agent` をサポートとして読むことがあります。

両方のフィールドは `.claude/agents/*.md` に対して `loadAgents()`（マイルストーン 3 で導入）経由で動的に検証します — `aidlc engine graph compile` が発見したエージェント slug を `validateStageFrontmatter` へ渡すので、一致するファイルが無いエージェントを指名する `lead_agent` または `support_agents` 値は、実行時に未登録サブエージェント `Task` エラーとして面に出るのではなく、コンパイルで大きく失敗します（`lead_agent "<name>" has no matching .claude/agents/*.md`）。唯一の免除は予約 `orchestrator` 疑似エージェント（コンダクター自身。ブートストラップ初期化ステージで `lead_agent` として指名）。設計上エージェントファイルはありません。スキーマにハードコード enum はありません — エージェントを足すことは、必須 frontmatter 付きの `.md` を `.claude/agents/` に置くことです。[Contributing: Adding an Agent](11-contributing.md#adding-an-agent)。パイプラインステージは加えて、鎖のほかのどこかで繰り返したサポートエージェントを拒否します。リードをサポートとして繰り返すことも含みます。リンクレシートは一意のエージェントで宣言した位置 1 つを識別するからです。

### `reviewer`、`review_artifact`、`reviewer_max_iterations`、`review_class`

任意。`reviewer` は、ステージ本文が成果物を出したあと、承認ゲートの前に呼ぶ品質ゲートエージェントを指名します（[Stage Protocol](04-stage-protocol.md)）。きょう出荷するレビュアーは 2 つ — `aidlc-product-lead-agent` と `aidlc-architecture-reviewer-agent` — で、コンパイルは `lead_agent` と同じく発見したエージェント名簿に対して値を検証します。

レビュアーを運ぶどのステージも `review_artifact` も宣言しなければなりません。`produces[]` の必須 Markdown エントリ 1 つを指名します: レビューが何についての成果物か。レビューレコードはそれに鍵付けされ、ゲートがそれを指名し、`--reject-finding <artifact>#R-NN` がその所見を指します。レビュアーはそれに決して書きません。一覧順とプラグインが足した出力はそれを変えられません。ユニットごとステージでは、必須出力が適用するどの Unit kind でも対象が適用可能なままでなければ、グラフコンパイルが失敗します。`traceability.json` のような構造化出力はレビュー対象になれません。

`reviewer_max_iterations` は、未解決所見付きでワークフローがゲートへ進む前のレビュー / 改訂ループを上限します。`reviewer` が宣言されて上限が無いとき **既定は 2** です。コンパイラは欠けたまたは非正の値を 2 へ強制します。`reviewer` を宣言しないステージではフィールドを省略します: コンパイラは `reviewer` 無しで宣言した `reviewer_max_iterations` を拒否します（スキーマエラー `reviewer_max_iterations requires a reviewer` がグラフコンパイルを失敗させる）。だから黙って無視されることはありません。

`review_class` はレビュー契約を選びます: `adversarial`（上の反駁と修理ループ — クラス無しで `reviewer` が宣言されたときの既定）または `advisory`（所見を人の承認ゲートでそのまま引用する、修理ループ無しの通常流れパス 1 つ。実効反復予算は 1）。終端レシートを無効にする後の書きは、次の序数で有界復旧リクエストを 1 つ許します。出荷の分割: 人がゲートする ideation / inception 散文ステージ 7 は `advisory` を宣言し、Construction 設計 / ビルドステージ 5 は既定 `adversarial`。`none` は意図してステージ値ではありません — レビュー無しのステージは `reviewer:` 行を消します。`none` はスコープ `review_cap` と実行ごとの `--review` 上書きに存在し、ステージを直さずに宣言したレビュアーを沈黙できます。実行時の実効クラスは、ステージ宣言、アクティブスコープの `review_cap`（出荷の `bugfix`、`poc`、`classic`、`workshop` スコープは `advisory` へ上限、`express` は `none` へ上限）、実行ごとの上書きの **いちばん低い** ものです — 上限または上書きはクラスを下げられますが、決して上げません。自律スウォームレビューは上限と上書きから免除されます: Bolt 内ではレビュアーがマージ前の唯一の検証なので、宣言したクラスがいつもそこで適用します。上限と同じく、`review_class` は `reviewer` が要ります（スキーマエラー `review_class requires a reviewer`）。

---

## エージェント frontmatter との関係

ステージとエージェントは同じ YAML 先行の規律に従います。エージェント frontmatter（[Agent System](05-agent-system.md#frontmatter-contract)）は *誰* を宣言します — エージェントの名前、許可ツール、ティア。ステージ frontmatter は *何* を宣言します — ステージが出す・消費する成果物、委譲するエージェント、実行の仕方。

両方の形式:

- その領域の正本（並走するハードコードマップ無し）。
- 型付き構造を返す `loadX()` ヘルパと同梱。
- ハードコード enum ではなくファイルシステムに対して動的に検証。

新しいステージを足す形は、新しいエージェントを足すのと同じです: `.md` を置き、必須 frontmatter を足し、ヘルパが実行時に拾います。

---

## 通し例

正準例は `scope-definition` です。規範 YAML ブロックは `core/aidlc-common/protocols/stage-definition.md` にあります — ここで複製せずそちらを見てください。

例は、きょうの散文が記述することを構造形で符号化します:

- `requires_stage: [intent-capture]` は、散文指示「インテントの `ideation/intent-capture/`（そのレコードディレクトリの下）からインテント声明を読む」を符号化します。パーサは散文を気にせず、グラフ辺だけを見ます。が、人の読み手は同期を保つべきです。
- `consumes: [{artifact: intent-statement, required: true}]` は、`intent-statement` が存在するまでこのステージはブロックされると言います。スコープのリゾルバが `intent-statement` のプロデューサーを見つけられなければ、doctor の欠けたプロデューサー検査が失敗します。
- `produces: [scope-document, intent-backlog, scope-definition-questions]` は前向きの辺です — 「誰が `scope-document` を出すか」を探すほかのステージは、`aidlc engine graph` の `producersOf()` 経由でこれを見つけます。
- `for_each` フィールド無し — `scope-definition` はワークフローごとに一度走ります。

---

## 本文の三区画模型

ステージファイルの本文には三区画があり、この順で宣言します。v0.3.0 で埋まっているのは `## Steps` だけです。

| Compartment | v0.3.0 | v0.5.0 | What goes here |
|-------------|--------|--------|----------------|
| `## Steps` | 必須、埋まっている | 変わらず | エージェントが従う命令散文 |
| `## Sensors` | 予約、無い | 埋まっている | コンパクトな出力場所、取り込んだセンサー、上流対象の要約。ステージ固有の例外は局所のまま |
| `## Learn` | 予約、無い | 埋まっている | 共有 §13 ラーニングループ契約とブートストラップ例外へのコンパクトなポインタ |

v0.3.0 で三区画を事前宣言したので、v0.5.0 の追加は本文再構造ではなく差し込み変更でした。`## Sensors` の結び意味と引き取り込み模型は [Sensor System](07-sensor-system.md)。共有センサー振る舞いは `stage-protocol.md` §14 に一度定義し、学びの儀式全体は §13 に定義します。

**マイルストーン 8 移行規則:** 既存本文を `## Steps` の下へ包むだけ、ほかは何もしない。ほとんどのステージファイルはすでに最初の本文見出しとして `## Steps` を使っています。

---

## YAML 移行 — 出荷済み

マイルストーン 7 は `lib.ts` に `parseStageFrontmatter` と `emitStageFrontmatter` を出荷しました — YAML だけ、散文の後方互換経路無し。マイルストーン 8 はステージファイル 31 すべてを、1 つの原子的変更で YAML frontmatter へ移行しました。マイルストーン 9 は YAML を `stage-graph.json` へコンパイルするようグラフツールを広げました。リポジトリはいま、そのファイルを無視される投影の中だけで生成します。ソース木のゲートは、コミットしたコンパイルファイルのドリフト検査ではなく、パッケージ決定論です。

---

## v0.3.0 の既知の限界

- **`for_each` は新しい。** `**Per-Unit**: Yes` の Construction ステージ 5 つは `for_each: unit-of-work` へ移行します。ほかの 26 ステージはフィールドを完全に省略します。
- **Sensors / Learn 区画は宣言したが空。** パーサは不在を許します。v0.5.0 が埋めました（[Sensor System](07-sensor-system.md)）。
- **ドリフト検査を超える実行時検証は無い。** パーサは妥当な `StageEntry` を出すどの YAML も受け入れます。doctor の後の拡張が、助言のルール / センサー検査を上に足します。

---

## 将来の拡張 — 予約名前空間

仕様は、後のリリースで AI-DLC が足しそうなプリミティブの名前を予約します。スキーマは未知キーを拒否します — ここで名前を予約すると、将来の寄与が場当たり追加と衝突するのを止めます。

| Key | Likely release | What it will do |
|-----|----------------|-----------------|
| `when` | v0.10.0 fitness compiler | 構造化した条件。`condition` 散文を機械強制論理へコンパイルする。`consumes[].conditional_on` を置き換え、きょうのスコープ意識 `consumes[].required` をより豊かな述語（`producer-in-plan`、`mode == brownfield`、`scope != poc`）で一般化する |
| `on_failure` | v0.8.0 Ralph loop | 宣言的なエラー復旧 — 「このステージが失敗したら X へジャンプ」または「調整した入力で再試行」。改訂意味を `stage-protocol-recovery.md` 散文から出す |
| `blocks_on` | v0.4.0 Construction（面に出れば） | データ読み無しの完了依存 — きょう過負荷の `requires_stage`（「あなたの出力を消費する」と「あなたのあとで走る」を混同する）を割る |
| `timeout` | v0.5.0 sensor binding | 実行予算（締切）。ステージ frontmatter ではなくセンサー結びに住む |
| `retry` | v0.8.0 Ralph loop | 失敗時の再試行方針。ステージ frontmatter ではなくループ設定に住む |

設計の根拠: Claude Code 自身のタスクプリミティブ（TaskCreate 族 + `/loop` と cron）は依存、ブロック、再試行、タイムアウトを省略します — 複数ステップのオーケストレーションはすべてクライアント側コードへ押し出されます。この実装はその選択を映し、実行振る舞い（再試行、タイムアウト、失敗扱い）をステージ仕様ではなくループとセンサーサブシステムに置きます。上のフィールドは消費者が出れば控えめな構造拡張であり、新しいパラダイムではありません。

予約名前空間の型は監査分類（[State Machine](12-state-machine.md)）に先例があります。イベント名を Emitter セル `Reserved (v0.x PR N)` で事前登録します — 名前はレジストリにありますが、消費者 PR が出荷するまでコードは出しません。その時点で同じコミットが `Reserved` 印を本物の出力者パスへ置き換えます。

---

## Cross-references

- `core/aidlc-common/protocols/stage-definition.md` — この章が物語る正の仕様。
- [Stage Protocol](04-stage-protocol.md) — 実行時の実行振る舞い。
- [Agent System](05-agent-system.md) — エージェントファイルの並走 YAML 先行契約。
- [State Machine](12-state-machine.md) — ステージ実行が監査イベントを出す場所。
