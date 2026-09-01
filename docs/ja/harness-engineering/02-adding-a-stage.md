# ステージを足す

ステージはワークフローグラフのノードです。消費・生成する成果物、リードするエージェント、走り方を宣言する作業の単位です。足すのは、ハーネスエンジニアがする変更のなかでいちばん構造的です。方法論そのものに新しいステップを入れることです。この章は端から端までのレシピです。フェーズを選び、ファイルを書き、依存の辺を結び、グラフをコンパイルし、新しいステージが想定どおりに着地するのを確認します。

先に [ステージの構造](01-anatomy-of-a-stage.md) を読んでください。ファイル形式（frontmatter の契約と 3 区画の本文）を、このレシピは前提にしています。ここは *ワークフロー* です。判断と確認の手順であり、フィールドごとのスキーマではありません。網羅的な契約は、各ステップで [Stage Definition](../reference/15-stage-definition.md) へ下ろします。

規律は、Developer Reference の [Adding a Scope](../reference/11-contributing.md#adding-a-scope) と [Adding an Agent](../reference/11-contributing.md#adding-an-agent) と同じです。番号付きの手順のあと、*自動で検証されるもの* と *自分で見るもの* をはっきり分けます。

---

## 始める前: 新しいステージが正しい手か

新しいステージが席を得るのは、既存のどのステージも出していない成果物を出すとき、または既存のどのステージもカバーしていない消費の仕方をするときです。*既存ステージがすること* を変えたいだけなら（手順の言い換え、リードエージェントの付け替え、センサーの取り付け）、そのステージファイルをその場で直します。新しいノードは要りません。その場編集は [ステージの構造](01-anatomy-of-a-stage.md) です。

ステージを足すのは **データ仕事** です。YAML frontmatter 付き Markdown を書き、JSON 成果物を再コンパイルします。TypeScript は変えません。頭に置く境界が 1 つあります。グラフ *コンパイラそのもの* に新しい振る舞いが要るなら（まだ理解していない frontmatter キー、新しい走査規則）、それは Developer Reference の関心であり、ハーネス仕事ではありません。仕様がすでに知っている予約キー（`when`、`on_failure`、`blocks_on` など）は [Stage Definition](../reference/15-stage-definition.md) にあります。まだ実装されていないキーに手を出すと、コード側に出ています。

---

## 手順

### 1. ステージが属するフェーズを決める

ステージファイルは `core/aidlc-common/stages/<phase>/<slug>.md` にあります。フェーズがディレクトリです。5 つです。

```
core/aidlc-common/stages/
├── initialization/
├── ideation/
├── inception/
├── construction/
└── operation/
```

ステージが座るフェーズは見た目ではありません。コンパイル時にどの `phases/<phase>.md` ルール層が付くかを決めます。construction フェーズのステージは construction のフェーズルールを継ぎ、inception のステージは inception のルールを継ぎます。（Initialization にはフェーズルールファイルがありません。）ライフサイクルで実際に仕事が起きる場所に置きます。ファイルしやすい場所ではありません。

### 2. 必須 frontmatter 付きでステージファイルを作る

選んだフェーズディレクトリに新しい `<slug>.md` を置きます。slug はファイル名ステムであり、ほかのどこでもステージの身元です。`requires_stage` の辺、スコープ対応、監査ログ。慎重に選んでください。あとからの改名は波及します。

frontmatter がグラフの辺と実行契約を宣言します。構造の重みを持つフィールドです。

| フィールド | すること |
|------------|----------|
| `requires_stage` | 依存の辺。どのステージが先行しなければならないか |
| `consumes` | このステージが読む成果物。それぞれ `required` 真偽 |
| `produces` | このステージが書く成果物（前向きの辺） |
| `lead_agent` | ステージを所有するペルソナ |
| `support_agents` | 任意。リードのあとコンダクターが載せる視点。パイプラインの鎖はエージェントが一意であること |
| `mode` | `inline`、`subagent`、`pipeline`、`mob`、または予約の `agent-team` |
| `for_each` | 任意。インスタンスが反復を駆動する成果物を指名 |
| `summary_confirmation` | 任意。ファイルに残る答えをいつも集めるステージは `required`、条件付きの質問流れは `if-present` |
| `reviewer` / `review_artifact` | 任意の対。レビューエージェントと、`## Review` 追記を排他所有する必須 Markdown の `produces` 項目 |

本文は `## Steps` で開きます。リードエージェントが従う命令の散文です。続く `## Sensors` 区画は、出力の場所、正確な frontmatter 取り込み、上流ターゲットをまとめます。ステージ固有のセンサー例外は残してください。最後の `## Learn` 区画は `stage-protocol.md` §13 を指し、該当すればブートストラップのゲートなし例外を書きます。フィールド表、型、制約の全体は [Field reference — when to use](../reference/15-stage-definition.md#field-reference-when-to-use) です。

### 3. グラフが置けるように依存の辺を結ぶ

新しいステージがワークフローに収まるのはここです。配線は 3 フィールドで、互いに一致しなければなりません。

- **`requires_stage`** が辺を載せます。辺の種類は 2 つです。*意味のあるデータ依存*（「成果物 X を消費する。ステージ Y が作る」→ `Y` を足す）と、*表示順の辺*（同じフェーズの 2 ステージにデータ依存は無いが、走る順は決まっている）。順序の辺は明示して書いてください。コンパイラのアルファベットタイブレークは、明示配置の下にある安全網に過ぎません。
- **`consumes`** はステージが読む成果物の一覧です。各項目は `required` 真偽を持ち、範囲は *アクティブな計画* です。`required: true` は「このスコープでプロデューサーのステージが走るなら、消費は満たされなければならない」です。「プロデューサーはいつも走る」ではありません。brownfield のときだけ要る消費は `conditional_on: brownfield` です。無条件の消費はフィールドごと省略します（`always` という値はありません）。
- **`produces`** は前向きの辺の一覧です。下流が「成果物 Z を誰が作るか」と聞くと、グラフは `producersOf()` で答えます。`produces: [Z]` を宣言したステージが、その上流に結ばれます。消費される成果物は、`produces` と `optional_produces` を横断してプロデューサーがちょうど 1 つに解決されなければなりません。`aidlc-graph compile` は重複を落とし、両方のプロデューサーファイルを指名します。成果物名の再利用が有効なのは、どのステージも消費していないときだけです。

この 3 つが揃えば、コンパイラがステージを自動で置きます。位置のために `stage-graph.json` を手で直すことはありません。`requires_stage`、`consumes[].required`、`consumes[].conditional_on`、`for_each`（集約は *宣言せず推論* されること含む）の機微は [Field reference — when to use](../reference/15-stage-definition.md#field-reference-when-to-use) です。

<a id="4-regenerate-the-harnesses-so-stage-graphjson-recompiles"></a>

### 4. ハーネスを再生成し、`stage-graph.json` を再コンパイルする

いま `core/` に書いた YAML が権威のソースです。パッケージャを走らせ、`core/` からすべての `dist/<harness>/` を再生成します。新しいステージファイルがコピーされ、グラフが再コンパイルされます。

```bash
bun scripts/package.ts            # regenerate every harness from core/ + harness/
bun scripts/package.ts --check    # the CI drift guard — run before committing
```

ランタイムが読むのはコンパイル済み成果物 `<harness-dir>/tools/data/stage-graph.json` です（インストール済み Claude の木なら `.claude/tools/data/stage-graph.json`）。パッケージャが呼ぶグラフコンパイラが YAML から作ります。すでにインストール済みの木で反復しているなら、その木のグラフを直接再コンパイルできます。

```bash
bun .claude/tools/aidlc-graph.ts compile
```

どちらでも、書く流れは一方向のパイプラインです。`core/` の YAML を直し、パッケージャ（またはインストール済みの木に対する `compile`）を走らせ、JSON が更新され、ランタイムローダー（`loadStageGraph()`）が新しいノードをそのまま拾います。`stage-graph.json` を手で直さないでください。ビルド成果物です。次のコンパイルで上書きされます。パイプライン図と CI のドリフトガードは [Authoring flow](../reference/15-stage-definition.md#authoring-flow) です。

### 5. 現れたことを確認する — どのスコープで、も

新しいノードがコンパイルに入り、どこで走るかを見ます。

```bash
# Topological order of the full graph — your slug should appear
bun .claude/tools/aidlc-graph.ts topo

# Who produces / consumes your stage's artifacts
bun .claude/tools/aidlc-graph.ts producers <artifact>
bun .claude/tools/aidlc-graph.ts consumers <artifact>

# The stages on a given scope's path — does your stage run for this scope?
bun .claude/tools/aidlc-graph.ts scope <scope-name>

# Dependency sanity for a scope
bun .claude/tools/aidlc-graph.ts validate-scope <scope-name>
```

まったく新しいステージは、どのスコープでも **自動では走りません**。スコープ所属はいまステージ自身にあります。frontmatter の `scopes:` 一覧が、走るスコープを全部指名します。スコープを 1 つも指名しないステージは、どこでも `SKIP` です。ステージを足したあと、走らせたいスコープを決め、各スコープ名をそのステージの `scopes:` に足します。再コンパイルすると転置が `scope-grid.json` を更新します。[スコープ](04-scopes.md) を見てください。意図した継ぎ目です。ステージ本文を書くと *存在する* ようになり、`scopes:` タグが *走らせます*。

---

## ステージを足すとは、ステージファイルを書くこと — ランナーは任意の糖衣

この章の見出しは、拡張契約でもあります。**ステージを足すには、ステージファイルを書く。** 構造上、ほかに必須はありません。ステージがグラフにコンパイルされたら（上の手順 2–4）、スキルも登録も要らず、その場で単独実行できます。

```bash
bun .claude/tools/aidlc-orchestrate.ts next --stage <your-slug> --single
```

エンジンの `--single` モードは、その 1 ステージを隔離して走らせます。ステージ向けの `run-stage` ディレクティブを 1 本出します（リードエージェント、解決済みの consumes / produces パス、ルール、センサー付き）。コンダクターが実行し、合成 ID のライフサイクルが監査ログに残ります。`next --single` はディスパッチ前に `STAGE_STARTED` を記録し、`report --single` はその境界を要求してから `STAGE_COMPLETED` を記録します。
ディレクティブは `single: true` を載せるので、コンダクターは設定された本文、位相、レビュアー、完了検査を走らせ、`report --single --stage <slug> --result completed` で一度報告し、`done` で止まります。ワークフローの学びは走らせず、ワークフローの承認ゲートも開きません。
`--single` 実行は意図して隔離されています。メインワークフローの **`Current Stage` には決して触れません**。ツールは単発実行からメインワークフローを進めさせないので、1 ステージを単独で走らせても進行中のワークフローを脱線させません。

### ランナースキルは任意の包装

配布されている実行可能なステージには、薄いランナースキル `skills/aidlc-<slug>/SKILL.md` も付きます。`/aidlc-<slug>` と打てます（例: `/aidlc-domain-design`）。これは **`--single` フラグの上の任意の糖衣** です。`next --stage <slug> --single` を駆動する約 6 行のシェルです。手書きではありません。ジェネレータが、コンパイル済みの実行可能ステージ slug ごとに 1 本出します。ランナー集合がステージ集合から手でずれることはありません。（初期化のブートストラップ 3 ステージには、ステージ単位のランナーはありません。単独の `--single` 意味が無いからです。init フェーズ全体が `/aidlc-init` コマンドで、エンジンの intent-create を包みます。）ステージを足した（または消した）あと、ランナーを再生成します。

```bash
# Regenerate every runner dir from the compiled stage list
bun .claude/tools/aidlc-runner-gen.ts write

# CI drift guard: exits 1 if the runner set != the compiled stage set
bun .claude/tools/aidlc-runner-gen.ts check
```

ランナーは **`hooks:` ブロックを持ちません**。決定論的な背骨（監査、センサー、ランタイムグラフのコンパイル、状態検証）は `settings.json` にプロジェクト単位で登録されているので、どのランナーも無料で継ぎます。ランナーごとに複製するものはありません。ランナーはコンダクターのペルソナも手では載せません。エンジンが届け、最初の `run-stage` ディレクティブに焼き込みます。ランナー本文は、何をするかと、駆動するコマンド 1 本だけです。

ランナースキルを全部消しても、どのステージも `/aidlc --stage <slug> --single` で走ります。ランナーは、すでに走れるステージを包むだけです。定義はステージファイルです。書く道は、そしてこれからも、「ステージファイルを書く」です。

これらのランナーの背後の規範契約（エンジン、コンダクター、`run-stage` ディレクティブが、コンパイル済みステージを打てる `/aidlc-<slug>` スキルにする仕方）は、Developer Reference の [Skill System §4 (skills and runners)](../reference/17-skill-system.md) です。

---

## 自動で検証されるものと、自分で見るもの

### 自動で検証されるもの

- **グラフ配置。** `compile` した時点で、ステージの辺（`requires_stage`、`consumes`、`produces`）はグラフへ解決されます。トポロジカル順、プロデューサー / コンシューマ照会、循環検出は、追加編集なしで新しいノードを勘定します。
- **コンパイル時のフィールド検証。** コンパイラはグラフを組むときに frontmatter を検証します。執筆エラーは実行時に黙ってではなく、`compile` で大きく失敗します。`lead_agent` や `support_agents` の値は、実際の `.claude/agents/*.md` ファイルに対し `loadAgents()` で検査します。更新すべきハードコードされたエージェント列挙はありません。一致するファイルが無いエージェントを指名したステージはコンパイルに失敗します（`lead_agent "<name>" has no matching .claude/agents/*.md`）。誤字が、実行時に 404 するグラフを出荷することはありません。予約の `orchestrator` slug（コンダクター自身。初期化のブートストラップステージが使う）は例外です。エージェントファイルがありません。パイプラインステージは、`lead_agent` と `support_agents` を横断した鎖の身元重複も落とします。
- **CI のドリフトガード。** `bun .claude/tools/aidlc-graph.ts compile --check` はきれいな木で `0`、ステージ YAML を直して JSON を再コンパイルしていないと `1` で終わります。CI がこれを走るので、`compile` 忘れは分かりやすいメッセージでマージを止め、古いグラフは出荷されません。
- **フェーズルールの取り付け。** ステージがディレクトリでフェーズを宣言するので、対応する `phases/<phase>.md` ルール層はコンパイル時に付きます。その辺は自分で結びません。

### 自分で見なければならないもの

- **スコープ参加。** コンパイラはステージをグラフに置きます。どのスコープで走るかは **決めません**。各スコープ名をステージ自身の `scopes:` frontmatter 一覧に足し（転置が `scope-grid.json` を更新するよう再コンパイルし）するまで、新しいステージはグラフに存在しますが、どこでも走りません。気にするスコープごとに `aidlc-graph.ts scope <scope-name>` で確認してください。
- **本文の散文。** パースされるのは frontmatter だけです。`## Steps` 本文は、ステージが起動したときリードエージェントが読みます。ほかのステージファイルの構造に合わせて書いてください。パーサは、曖昧な指示や欠けた指示を捕まえません。
- **散文と辺の一致。** `requires_stage` と `## Steps` の散文はずれられます。パーサが見るのは辺だけで、散文ではありません。手順が「intent statement を読め」と言うなら、対応するプロデューサーステージが実際に `requires_stage` に入っていなければなりません。手で同期してください。
- **自分のスコープでの `required` の意味。** `required: true` の消費は、プロデューサーを飛ばすスコープでは無効になります。正当であり、バグではありません。ただし、プロデューサーが無い場合をステージ本文が穏やかに扱うこと（「if available」のフォールバック）は、あなたの確認です。
- **ドキュメント。** 新しいステージが、文書が手で列挙している件数や表（ステージ数、フェーズ一覧）を変えるなら、同じ変更で更新します。ドキュメント方針どおりです。

---

## 境界のケース: データ仕事対コード仕事

ステージファイルを書いてグラフを再コンパイルするのは、まるごとハーネスエンジニアのデータ仕事です。Markdown、YAML、JSON、`.ts` なし。黙って越えてはいけない線: ステージを動かすのにグラフ *コンパイラ* の振る舞いを変える必要があるなら（認識しない frontmatter キー、新しい辺の種類、新しい走査規則）、それはデータを読むコードの変更であり、[Developer Reference](../reference/15-stage-definition.md) です。ここではありません。仕様の予約キー名前空間は、将来の構造拡張が場当たりではなく予測どおり着地するためのものです。そのキーの消費者が出荷されるまで、スキーマは拒否します。コンパイラがまだ実装していないキーが欲しくなったら、止まってください。フレームワークの変更です。検証の規律は [Adding an Agent](../reference/11-contributing.md#adding-an-agent) とその兄弟の貢献レシピに従いますが、実装はコード側です。

---

## 次

[エージェントを足す](03-adding-an-agent.md) — 新しいステージが `lead_agent` に指名するペルソナを書き、リードまたは支援するステージに結ぶ。
