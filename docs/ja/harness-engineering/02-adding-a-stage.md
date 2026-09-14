# ステージを足す

ステージはワークフローグラフのノードです。消費する成果物と出す成果物、リードするエージェント、走り方を宣言する作業の単位です。足すことは、ハーネスエンジニアがするいちばん構造的な変更です。方法論そのものに新しいステップを入れることです。この章は端から端までのレシピです。フェーズを選ぶ、ファイルを書く、依存の辺を結ぶ、グラフをコンパイルし、新しいステージが期待どおりに着地することを確める。

先に [ステージの構造](01-anatomy-of-a-stage.md) を読んでください。その章はファイル形式 — frontmatter 契約と本文の三区画 — をカバーし、このレシピはそれを理解している前提です。ここでは *ワークフロー* に焦点を置きます。判断と検証の手順であり、フィールドごとのスキーマではありません。網羅的な契約は、各ステップで [Stage Definition](../reference/15-stage-definition.md) へ下ろします。

規律は Developer Reference の [Adding a Scope](../reference/11-contributing.md#adding-a-scope) と [Adding an Agent](../reference/11-contributing.md#adding-an-agent) のレシピと同じです。番号付きの手順のあと、*自動で検証されるもの* と *自分で見るもの* をはっきり分けます。

---

## 始める前: 新しいステージが正しい手か

新しいステージが席を得るのは、既存のどのステージも出さない成果物を出すとき、または既存のどのステージもカバーしない仕方で消費するときです。既存ステージが *何をするか* だけを変えたい — 手順の言い直し、リードエージェントの付け替え、センサーの結び — なら、そのステージファイルをその場で直します。新しいノードは要りません。その場の編集は [ステージの構造](01-anatomy-of-a-stage.md) です。

ステージを足すのは **データの仕事** です。YAML frontmatter 付き Markdown を書き、JSON 成果物を再コンパイルします。TypeScript は変えません。頭に置く境界が一つあります。グラフの *コンパイラ自身* に新しい振る舞いが要るなら（まだ理解していない新しい frontmatter キー、新しい走査規則）、それは Developer Reference の関心であり、ハーネスの仕事ではありません。仕様がすでに知っている予約キー（`when`、`on_failure`、`blocks_on`、ほか）は [Stage Definition](../reference/15-stage-definition.md) にあります。まだ実装されていないものへ手を伸ばすと、コード側へ越えています。

---

## 手順

### 1. ステージが属するフェーズを決める

ステージファイルは `core/aidlc-common/stages/<phase>/<slug>.md` の下にあります。フェーズはディレクトリです。五つあります。

```
core/aidlc-common/stages/
├── initialization/
├── ideation/
├── inception/
├── construction/
└── operation/
```

ステージが座るフェーズは見た目ではありません。コンパイル時にどの `phases/<phase>.md` ルール層がステージに付くかを決めます。construction フェーズのステージは construction のフェーズルールを継ぎ、inception ステージは inception のルールを継ぎます。（Initialization にフェーズルールファイルはありません。）便利な置き場ではなく、ライフサイクルで仕事が実際に起きる場所に置いてください。

### 2. 必須 frontmatter でステージファイルを作る

選んだフェーズディレクトリに新しい `<slug>.md` を置きます。slug はファイル名ステムであり、ほかのどこでもステージの身元です。`requires_stage` の辺、スコープの写像、監査ログ。慎重に選んでください。あとで改名すると波及します。

frontmatter はグラフの辺と実行契約を宣言します。構造の重みを運ぶフィールド:

| フィールド | すること |
|------------|----------|
| `requires_stage` | 依存の辺 — どのステージがこれより先でなければならないか |
| `consumes` | このステージが読む成果物。それぞれ `required` 真偽 |
| `produces` | このステージが書く成果物（前方の辺） |
| `lead_agent` | ステージを所有するペルソナ |
| `support_agents` | 任意。コンダクターがリードのあと載せる視点。パイプラインの鎖は一意のエージェントを要求 |
| `mode` | `inline`、`subagent`、`pipeline`、`mob`、または予約の `agent-team` |
| `for_each` | 任意。インスタンスが反復を駆動する成果物を指名 |
| `summary_confirmation` | 任意。ファイルに残る答えをいつも集めるステージは `required`、条件付きの質問の流れは `if-present` |
| `reviewer` / `review_artifact` | 任意の対。レビューエージェントと、レビューの対象である必須 Markdown の `produces` 項目（レビュー記録はその成果物に鍵付けされる） |

本文は `## Steps` で開きます。リードエージェントが従う命令の散文です。`## Sensors` 区画は出力の置き場、正確な frontmatter の取り込み、上流ターゲットを要約します。ステージ固有のセンサー例外は残してください。最後の `## Learn` 区画は `stage-protocol.md` §13 を指し、該当するならブートストラップのゲート無し例外を付けます。完全なフィールド表、型、制約は [Field reference — when to use](../reference/15-stage-definition.md#field-reference-when-to-use) です。

### 3. グラフが置くように依存の辺を結ぶ

新しいステージが実際にワークフローへ収まる場所です。配線は 3 フィールドで、互いに一致しなければなりません。

- **`requires_stage`** は辺を符号化します。辺の種類は二つです。*意味のあるデータ依存*（「成果物 X を消費する。ステージ Y が出す」→ `Y` を足す）と、*提示順の辺*（同じフェーズの 2 ステージにデータ依存は無いが、走る順は固定）。コンパイラのアルファベットタイブレークに頼らず、順序の辺を明示して書いてください。タイブレークは明示配置の下の安全網にすぎません。
- **`consumes`** はステージが読む成果物を列挙します。各項目は `required` 真偽を持ち、*アクティブな計画に範囲*します。`required: true` は「このスコープでプロデューサーのステージが走るなら、消費は満たされなければならない」という意味です。「プロデューサーはいつも走る」ではありません。ブラウンフィールドモードでだけ要る消費は `conditional_on: brownfield` を取ります。無条件の消費はフィールドごと省略します（`always` という値はありません）。
- **`produces`** は前方の辺を列挙します。下流ステージが「誰が成果物 Z を出すか？」と聞くと、グラフは `producersOf()` で答えます。だから `produces: [Z]` を宣言するステージが、その上流に結ばれます。消費される成果物は、`produces` と `optional_produces` を横断してプロデューサーがちょうど 1 つに解決しなければなりません。`aidlc engine graph compile` は重複を落とし、プロデューサーファイルの両方を指名します。成果物名の再利用は、どのステージも消費しないときだけ有効です。

この三つを一貫させると、コンパイラがステージを自動で置きます。位置のために `stage-graph.json` を手で直すことはありません。`requires_stage`、`consumes[].required`、`consumes[].conditional_on`、`for_each` のニュアンス（集約が宣言ではなく *推論* されること含む）は [Field reference — when to use](../reference/15-stage-definition.md#field-reference-when-to-use) です。

### 4. ハーネスを再生成し、`stage-graph.json` を再コンパイルする

いま `core/` の下に書いた YAML が正本です。パッケージャを走らせ、無視されるローカルの `dist/<harness>/`（Bun コピー）と `dist-release/<harness>/`（ネイティブ）を `core/` から実体化します。新しいステージファイルが両チャネルへコピーされ、各グラフが再コンパイルされます。

```bash
bun scripts/package.ts            # materialize both channels for every harness
bun scripts/package.ts --check    # build twice and byte-compare
```

実行時はコンパイル済み成果物 `<harness-dir>/tools/data/stage-graph.json` を読みます（入れた Claude 木では例: `.claude/tools/data/stage-graph.json`）。パッケージャが起動するグラフコンパイラが YAML から作ります。すでに入れた木を反復しているなら、その木のグラフを直接再コンパイルできます。

```bash
aidlc engine graph compile
```

どちらでも執筆の流れは一方向のパイプラインです。`core/` の YAML を直す、パッケージャ（または入れた木に対する `compile`）を走らせる、JSON が更新され、実行時ローダー（`loadStageGraph()`）が新しいノードをそのまま拾う。`stage-graph.json` を手で直さないでください。ビルド成果物です。手編集は次のコンパイルで上書きされます。パイプライン図の全体と CI のドリフトガードは [Authoring flow](../reference/15-stage-definition.md#authoring-flow) です。

### 5. 現れたこと — と、どのスコープで — を確める

新しいノードがコンパイルに入り、どこで走るかを見ます。

```bash
# Topological order of the full graph — your slug should appear
aidlc engine graph topo

# Who produces / consumes your stage's artifacts
aidlc engine graph producers <artifact>
aidlc engine graph consumers <artifact>

# The stages on a given scope's path — does your stage run for this scope?
aidlc engine graph scope <scope-name>

# Dependency sanity for a scope
aidlc engine graph validate-scope <scope-name>
```

まったく新しいステージは、どのスコープでも **自動では走りません**。スコープ所属はいまステージ自身にあります。frontmatter の `scopes:` 一覧が、走るスコープを全部指名します。スコープを指名しないステージはどこでも `SKIP` です。だからステージを足したあと、走らせたいスコープを決め、各スコープ名をステージの `scopes:` 一覧に足します。それから再コンパイルして転置が `scope-grid.json` を更新するようにします。詳しくは [スコープ](04-scopes.md)。これが意図した継ぎ目です。ステージ本文を書くと *存在する*。`scopes:` タグが *走らせる*。

---

## ステージを足すにはステージファイルを書く — ランナーは任意の糖

この章の見出しは、拡張性の契約でもあります。**ステージを足すには、ステージファイルを書く。** 構造上ほかに必須はありません。ステージがグラフへコンパイルされたら（上の手順 2–4）、スキルも登録も無しで、すぐ単体で走れます。

```bash
aidlc engine orchestrate next --stage <your-slug> --single
```

エンジンの `--single` モードは、その 1 ステージを隔離して走ります。ステージ向けの `run-stage` ディレクティブを 1 本出します（リードエージェント、解決した consumes / produces パス、ルール、センサー付き）。コンダクターがそれを走り、合成 id のライフサイクルが監査ログにコミットされます。`next --single` は派遣の前に `STAGE_STARTED` を記録し、`report --single` はその境界を要求してから `STAGE_COMPLETED` を記録します。
ディレクティブは `single: true` を運ぶので、コンダクターは設定した本文、トポロジ、レビュアー、完了検査を走り、`report --single --stage <slug> --result completed` で一度報告し、`done` で止まります。ワークフローの学びは走らず、ワークフローの承認ゲートも開きません。
`--single` の実行は意図して隔離されています。メインワークフローの **`Current Stage` には決して触れません** — ツールは単発実行からメインワークフローを進めようとしません。1 ステージを単体で走らせても、飛行中のワークフローを脱線させられません。

### ランナースキルは任意の包装

同梱の走れるステージはどれも、薄いランナースキルを `skills/aidlc-<slug>/SKILL.md` に持ち、`/aidlc-<slug>` として打てます（例: `/aidlc-domain-design`）。これは **`--single` フラグの上の任意の糖** です。`next --stage <slug> --single` を駆動する約 6 行のシェルです。手では書きません。生成器がコンパイル済みの走れるステージ slug ごとに 1 つ出すので、ランナーの集合がステージの集合から手でずれられません。（ブートストラップの初期化ステージ 3 つにはステージごとのランナーはありません。単体の `--single` 意味が無いからです。初期化フェーズ全体が `/aidlc-init` コマンドで、エンジンの intent-create の動きを包みます。）ステージを足した（または外した）あと、ランナーを再生成します。

```bash
# Regenerate every runner dir from the compiled stage list
aidlc engine gen runners

# CI drift guard: exits 1 if the runner set != the compiled stage set
aidlc engine gen runners --check
```

ランナーは **`hooks:` ブロックを持ちません**。決定論の背骨（監査、センサー、runtime-graph のコンパイル、状態検証）は `settings.json` でプロジェクト全体に登録されているので、どのランナーも無料で継ぎます。ランナーごとに複製するものはありません。そしてランナーはコンダクターのペルソナを手では載せません。エンジンが届け、最初の `run-stage` ディレクティブに焼き込みます。ランナー本文は、何をするかと駆動するコマンド 1 本だけを述べます。

ランナースキルを全部消しても、どのステージも `/aidlc --stage <slug> --single` で走ります。ランナーはすでに走れるステージを包装します。定義はステージファイルです。執筆の道は、そしてこれからも、「ステージファイルを書く」です。

これらのランナーの背後にある規範契約 — エンジン、コンダクター、`run-stage` ディレクティブが、コンパイル済みステージを打てる `/aidlc-<slug>` スキルへどう変えるか — は Developer Reference の [Skill System §4 (skills and runners)](../reference/17-skill-system.md) です。

---

## 自動で検証されるもの対、自分で見るもの

### 自動で検証されるもの

- **グラフの配置。** `compile` すると、ステージの辺（`requires_stage`、`consumes`、`produces`）がグラフへ解決されます。トポロジ順、プロデューサー / コンシューマの参照、サイクル検出は、それ以上の編集無しで新しいノードを勘定します。
- **コンパイル時のフィールド検証。** コンパイラはグラフを組み立てながら frontmatter を検証します。執筆エラーは実行時に黙ってではなく、`compile` で大きく失敗します。`lead_agent` または `support_agents` の値は、実際の `.claude/agents/*.md` ファイルに対して `loadAgents()` 経由で検査されます。更新するハードコードのエージェント列挙はありません。一致するファイルが無いエージェントを指名するステージはコンパイルを落とします（`lead_agent "<name>" has no matching .claude/agents/*.md`）。タイポが実行時に 404 するグラフを出荷できません。予約の `orchestrator` slug（コンダクター自身。ブートストラップの初期化ステージで使う）は例外です。エージェントファイルがありません。パイプラインステージは、`lead_agent` と `support_agents` を横断する重複した鎖の身元も落とします。
- **CI のドリフトガード。** `aidlc engine graph compile --check` はきれいな木で `0`、ステージ YAML を直して JSON を再コンパイルしていないと `1` で終わります。CI がこれを走るので、忘れられた `compile` はマージを止め、古いグラフを出荷せず、はっきりしたメッセージを出します。
- **フェーズルールの結び。** ステージがディレクトリでフェーズを宣言するので、一致する `phases/<phase>.md` ルール層がコンパイル時に付きます。その辺は自分で結びません。

### 自分で見るもの

- **スコープ参加。** コンパイラはステージをグラフに置きます。どのスコープがそれを走らせるかは **決めません**。各スコープ名をステージ自身の `scopes:` frontmatter 一覧に足し（転置が `scope-grid.json` を更新するよう再コンパイルし）するまで、新しいステージはグラフに存在しますが、どこでも走りません。気にするスコープごとに `aidlc engine graph scope <scope-name>` で確めてください。
- **本文の散文。** パースされるのは frontmatter だけです。`## Steps` 本文はステージが起動したときリードエージェントが読みます。ほかのステージファイルの構造に合わせて書いてください。パーサは曖昧または欠けた指示を捕まえません。
- **散文と辺の一貫。** `requires_stage` と `## Steps` の散文はずれられます。パーサは辺だけを見、散文は見ません。手順が「intent statement を読め」と言うなら、一致するプロデューサーステージが実際に `requires_stage` に入っていなければなりません。手で同期を保ってください。
- **自分のスコープ下の `required` 意味。** `required: true` の消費は、プロデューサーを飛ばすスコープでは空になります。それは正当であり、バグではありませんが、ステージ本文がプロデューサーの不在を丁寧に扱うこと（「if available」のフォールバック型）を確めるのはあなたです。
- **ドキュメント。** 新しいステージが、文書が手で列挙する数や表（ステージ数、フェーズ一覧）を変えるなら、同じ変更でそれらを更新します。ドキュメント方針どおりです。

---

## 境界の場合: データの仕事対コードの仕事

ステージファイルを書いてグラフを再コンパイルすることは、全部ハーネスエンジニアのデータの仕事です。Markdown、YAML、JSON、`.ts` は無し。黙って越えてはいけない線: ステージを動かすためにグラフの *コンパイラ* が違う振る舞いを要する場合 — まだ認識しない frontmatter キー、新しい辺の型、新しい走査規則 — それはデータを読むコードの変更であり、ここではなく [Developer Reference](../reference/15-stage-definition.md) に属します。仕様の予約キー名前空間は、将来の構造拡張が場当たりではなく予測どおり着地するためです。それらのキーに消費者が出荷されるまで、スキーマはそれを落とします。コンパイラがまだ実装していないキーが欲しくなったら、止めてください。それはフレームワークの変更です。検証の規律は [Adding an Agent](../reference/11-contributing.md#adding-an-agent) とその兄弟の貢献レシピに従いますが、実装はコードにあります。

---

## 次

[エージェントを足す](03-adding-an-agent.md) — 新しいステージが `lead_agent` として指名するペルソナを書き、リードまたは支援するステージに結ぶ。
