# 成果物の語彙

この章は、AI-DLC 成果物名の書いた規則です — 各ステージの `produces:` と `consumes[].artifact:` YAML frontmatter に出る正規文字列。命名の形、衝突解決の方針、ファイルシステムパスの約束、コマンドラインから生きたレジストリを見る方法です。

レジストリ自体は **派生** であり、手では書きません。「どの正規名があるか」の正本は、すべてのステージファイルの `produces[]` フィールドで、各ステージの `optional_produces[]`（ステージが Unit ごとに条件付きで書いてよい成果物。フィールド参照は `15-stage-definition.md`）との和集合です。条件付きで出す名前も登録され、プロデューサーへ解決できます。`core/tools/aidlc-graph.ts` のヘルパがコンパイル済みステージグラフを読み、和集合を集合として返します — スコープ（`aidlc-lib.ts:772` の `validScopes()`）とエージェント（`aidlc-lib.ts:794` の `loadAgents()`）と同じ型です。レジストリをこの章に置かないことで、手で並走する一覧が招くドリフトを止めます。

---

## What an artifact is here

成果物は、出すステージが YAML frontmatter で宣言する **正規識別子** です。ほかのステージは同じ識別子を `consumes[]` で参照し、読みの依存を宣言します。消費される識別子にはプロデューサーがちょうど 1 つあります。消費されない名前は、各ステージが自分のレコードディレクトリの下へ独立ファイルを書くとき、共有してよいです。識別子は短い kebab-case 文字列です — 拡張子なし、フォルダ接頭辞なし、スラッシュなし。

具体例はマイルストーン 4 の通し例、`core/aidlc-common/protocols/stage-definition.md` からです:

```yaml
slug: scope-definition
# ...
produces:
  - scope-document
  - intent-backlog
  - scope-definition-questions
consumes:
  - artifact: intent-statement
    required: true
  - artifact: feasibility-assessment
    required: false
```

ここで `scope-document`、`intent-backlog`、`scope-definition-questions` は scope-definition ステージが出す成果物、`intent-statement` と `feasibility-assessment` は消費する成果物です（ほかのステージが出す — それぞれ `intent-capture` と `feasibility`）。

このレジストリで成果物 **ではない** もの:

- **ファイルパス。** `<record>/ideation/scope-definition/scope-document.md`（`<record>/` はインテントのレコードディレクトリ、`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`）はファイルシステムの場所です。正規名は `scope-document`。下の "Filesystem mapping"。
- **ファイル名。** ディスク上の `.md` ファイルと正規名は一致しなくてもよいです（衝突時以外はだいたい一致します）。
- **状態の配管。** `aidlc-state.md`、`audit.md`、`.aidlc-recovery.md` は道具（`aidlc-state.ts`、フックスクリプト）が管理し、ステージが `produces[]` 経由では管理しません。レジストリには出ません。
- **実行時の値。** 「利用者の散文の答え」や「ワークスペース分類（greenfield/brownfield）」のような文字列は動的データであり、残るステージ間成果物ではありません。

---

## The derivation rule

1. **ステージファイルが正本。** 各ステージの `produces:` 一覧が、ステージが出すすべての正規名を宣言します。`consumes:` はステージが依存する正規文字列を指名します。
2. **レジストリは計算され、手では書きません。** `aidlc engine graph artifacts` を走らせると、生きたレジストリが出ます — 1 行に 1 名、アルファベット順。道具はコンパイル済み `stage-graph.json` から、すべてのステージの `produces[]` と `optional_produces[]` を和集合します。
3. **この章に並走一覧は無い。** 読者が列挙が欲しければ道具を走ります。この章は正規名をレジストリ表としては決して列挙しません。
4. **所属は doctor が検証する。** `/aidlc --doctor` は「Graph references」検査（`aidlc-utility.ts`）を走ります — どの `consumes[].artifact` エントリと `requires_stage[]` slug も、派生レジストリに対して解決しなければなりません。孤立した消費者は壊れた参照として報告されます。

ステージファイル 33 すべてが `produces:` を宣言するので、導出はレジストリ全体を返します。道具は空データでも定義されています — `produces:` が無いステージは何も寄与しないだけです — が、出荷フレームワークではどのステージも埋まっています。

---

## Naming rules

どの正規名も `/^[a-z][a-z0-9-]*$/` を満たさなければなりません — `core/tools/aidlc-stage-schema.ts` の `SLUG_RE` が強制する形です。つまり:

- **小文字だけ。** `scope-document`。`ScopeDocument` や `SCOPE_DOCUMENT` ではない。
- **拡張子無し。** `scope-document`。`scope-document.md` ではない。
- **フォルダ接頭辞無し、スラッシュ無し。** `scope-document`。`ideation/scope-definition/scope-document` ではない。
- **文字で始まる。** `s1` は合法。`1-thing` は違法。
- **内側はハイフン、数字、小文字だけ。** アンダースコア無し、空白無し、Unicode 文字無し。

質問成果物は伝統で `<stage-slug>-questions` 約束に従います — 利用者入力を集めるステージは、主な成果物の隣に兄弟 `<slug>-questions` 正規名を宣言します。伝統であり、パーサ規則ではありません。

形は **平らな名前空間** です — `<phase>/<stage>/<artifact>` のような階層接頭辞は無し。ほかの AI-DLC 識別子すべてと同じです: エージェント slug、スコープ名、ステージ slug、フェーズ名はすべて平らな kebab です。

---

## Collision policy

2 ステージが、どれかのステージがその名前を消費するとき、`produces[]` と `optional_produces[]` 横断で同じ正規名を **宣言してはいけません**。`aidlc engine graph compile` は曖昧さを拒否します。実行時の消費解決は所有プロデューサーが 1 つ要るからです。エラーは出すファイルすべてと、消費するステージ 1 つを指名します。同じ消費概念を 2 ステージが出すときは、曖昧さを取る相異なる名前を選びます。

どのステージも消費しないとき、共有名は妥当です。出荷の `traceability` 成果物がこの型です: 8 ステージがそれぞれ自分のレコードディレクトリの下へ自分の `traceability.json` を書き、下流ステージは `producersOf()` 経由で `traceability` を解決しません。

きょうの一例: `build-and-test`（Construction）と `performance-validation`（Operation）の両方が `test-results.md` というファイルを書きます。正規名は分割するので、ワイヤ上で 2 つは決して衝突しません:

- `build-test-results` — `build-and-test` が出す。そのステージの兄弟名と対: `build-instructions`、`integration-test-instructions`、`performance-test-instructions`、`security-test-instructions`、`build-and-test-summary`。
- `unit-test-instructions` は `code-generation` がユニットごとに出し、`build-and-test` が消費します。
- `source-manifest.json` は、`code-generation` の宣言成果物へのエンジン必須のユニットごと連れです。意図して **`produces[]` にありません**: その集合を変えると、飛行中の成果物フィンガープリントを遡及して無効にします。厳密 JSON マニフェストは、作った、直した、消したアプリケーションソースパスを帰属します。終端レビュー刻印がそれを要求し、そのバイト / 中身主張は `Unit Source Fingerprint` が結びます。
- `load-test-results` — `performance-validation` が出す。同じステージがすでに出す `load-test-plan` と対。

両方の名前はきょう、それぞれのステージの `produces:` 一覧に出荷しています。

**ディスク上のファイル名は一致しなくてもよいです。** 両方のステージはそれぞれのフォルダで `test-results.md` へ書き続けてよいです。正規名はファイル名ではなくワイヤ識別子です。

---

## Filesystem mapping

成果物は、`(正規名) + (出すステージ) + (ユニットごとフラグ)` から導けるパスにディスク上に住みます。既定の拡張子は Markdown です。正規 `traceability` 成果物は構造化データの例外で、`traceability.json` へ解決します。配置の形は 2 つ:

- **非ユニットごとステージ（30 のうち 25）:**
  `<record>/<phase>/<stage>/<artifact-filename>`
  例: `feasibility-assessment`（Ideation の `feasibility` ステージが出す）は
  `<record>/ideation/feasibility/feasibility-assessment.md` に住む。

- **ユニットごと Construction ステージ（30 のうち 5）:** `nfr-requirements`、`nfr-design`、`functional-design`、`infrastructure-design`、`code-generation`。これらは Construction 中に作業ユニットごとに各成果物のコピーを 1 つ出します:
  `<record>/construction/{unit-name}/<stage>/<artifact-filename>`
  例: `functional-spec`（`functional-design` が出す）は
  `<record>/construction/{unit-name}/functional-design/functional-spec.md` に住む。

ユニットごとの状態は、ステージの `for_each: unit-of-work` frontmatter フィールドが宣言します — Unit ごとに一度走る Construction ステージ 5 つがそれを運び、残りは省略します。将来のヘルパは、ステージグラフ + 正規名からパスを機械的に計算できます。

`aidlc-lib.ts` の `artifactFilename()` は、ディレクティブ、ユニットごとカバレッジ、完了ガード、レビューフィンガープリントが使う共有拡張子リゾルバです。`traceability` 以外のどの成果物も `<canonical-name>.md` へ解決し、`traceability` は `traceability.json` へ解決します。

**レビューレコードは成果物ではありません。** レビュアーを運ぶステージのレビュー結果（判定、所見、レビュアー、リクエスト id、それが結ぶフィンガープリント、レビュー本文）は、フレームワーク所有のレコードに住みます。ステージスコープは `<record>/.aidlc-reviews/<stage>/stage/<attempt>/<iteration>.json`、Unit は `<record>/.aidlc-reviews/<stage>/units/<unit>/<attempt>/<iteration>.json`。`aidlc-log.ts review --verdict` だけが書き、`REVIEW_COMPLETED` 行がそのダイジェストと一緒に指名します。ステージの `review_artifact` は、レビューが何についての成果物かを指名します（ゲートの `**Review:**` パスと `--reject-finding <artifact>#R-NN` セレクタ鍵）。レビュアーはそれに決して書きません。成果物内の終端 `## Review` 節は、レビューレコードが存在する前に記録したレビューです: 移行向けに読めますが、新たに書くことはありません。

**要約認可も成果物ではありません。** ステージ（と Unit）のアクティブな要約確認は、ステージスコープでは `<record>/.aidlc-summary-authorization/<stage>/stage.json`、Unit では `<record>/.aidlc-summary-authorization/<stage>/units/<unit>.json` に住みます。`Looks correct` で `aidlc-log.ts answer --checkpoint summary-confirmation` が書き、`Request changes` で消します。レシート行が運ぶ `Summary Authorization Id` を持ちます。書き込み監査フックはそれを読んでステージの `ARTIFACT_CREATED` / `ARTIFACT_UPDATED` 行に刻印し、完了はそれらの刻印をいまのレシートと比べます。出力ではなく、決してレビューされず、`produces[]` に載りません。

**codekb はスペース単位の例外です。** Reverse Engineering の成果物 9 つ（`business-overview`、`architecture`、`code-structure`、`api-documentation`、`component-inventory`、`technology-stack`、`dependencies`、`code-quality-assessment`、`reverse-engineering-timestamp`）は、インテントごとのレコードディレクトリの下へ **解決しません**。残る、リポジトリごとのコード知識ベース `aidlc/spaces/<space>/codekb/<repo>/` に着地します — そのスペースの全インテントで共有する店で、鍵はインテントではなくリポジトリです。パスは `resolveArtifactPath`（`core/tools/aidlc-orchestrate.ts`）の `isCodekb` 枝で、レコード相対の規則の外で解決されます。同じディレクトリは、読み取り専用のネイティブ経路 `aidlc engine workspace codekb` が出します。

**衝突では正規名 ≠ ファイル名。** 衝突が分割されるところ（上参照）では、ディスク上のファイル名は分割前の形（`test-results.md`）を保ち、正規名は曖昧さを取った版です。正本はファイルシステムではなく、ステージの `produces:` 一覧と `aidlc engine graph artifacts` です。

---

## How to view the live registry

```bash
aidlc engine graph artifacts
```

正規名を 1 行に 1 つ、アルファベット順で印字します。

PR-8 前の出力は空です — ステージがまだ YAML へ移行しておらず、`produces:` が埋まっていません。PR-8 後、初期化以外のステージ 30 にわたって約 119 名へ伸びます。

件数は `wc -l`、フィルタは `grep`、期待ベースラインとのドリフト検査は `diff` へパイプします。

---

## Adding or renaming an artifact

この章の編集は不要です — レジストリは派生です。

**新しい成果物を足す:**

1. 出すステージの `.md` を直し、正規名をその `produces:` 一覧へ足す。
2. `aidlc engine graph artifacts` を走らせ、出ることを確認する。
3. `/aidlc --doctor` を走らせ、もう存在しない名前を消費者が参照していないことを確認する（「Graph references」検査）。

**成果物を改名する:**

1. 出すステージの `produces:` エントリで改名する。
2. 消費するすべてのステージの `consumes[].artifact` エントリで改名する。
3. `/aidlc --doctor`（PR-11 後）が、更新し忘れた消費者を捕まえる — 古い名前は欠けたプロデューサーエラーになる。

ステージグラフの CI ドリフト検出（`aidlc engine graph compile --check`）は、YAML ソースから `stage-graph.json` を再生成し忘れた改名を捕まえます。

---

## Stability

v1.0 出荷時の生きたレジストリが、フレームワークの成果物面の安定ベースラインです。成果物名の安定方針:

- **改名**と**削除**は major 版変更 — v1.x → v2.0。
- **追加**は minor 版で出荷 — v1.0 → v1.1 など。
- **v1.0 まで飛行中**: いまの v0.3.0 Foundation 集合が出発点。後の v0.4.0–v0.11.0 リリースは、方法論が進化するにつれ名前を足す、改名する、落とすことがある。

方針は生きたデータに対して強制できます: タグ時のレジストリと HEAD のレジストリのドリフトは 1 行の `diff` です。

---

## Cross-references

- `core/aidlc-common/protocols/stage-definition.md` — この章が物語る正のステージ形式仕様。`produces[]` / `consumes[]` を構造フィールドとして定義する。
- [Stage Definition](15-stage-definition.md) — 仕様の物語章。
- [State Machine](12-state-machine.md) — 監査イベントの並走導出型: 正準 enum は doc ではなく `aidlc-audit.ts` に住む。
- [User Guide — Artifacts Reference](../guide/14-artifacts-reference.md) — 利用者が見る成果物ライフサイクルとディレクトリ配置。
- `core/tools/aidlc-graph.ts` — 導出道具（`artifactsRegistry()` + `artifacts` CLI サブコマンド）。
