# 成果物の語彙

この章は、AI-DLC 成果物名の書いた規則です — 各ステージの `produces:` と `consumes[].artifact:` YAML frontmatter に出る正規文字列。命名の形、衝突解決の方針、ファイルシステムパスの約束、コマンドラインから生きたレジストリを見る方法です。

レジストリ自体は **派生** であり、手では書きません。「どの正規名があるか」の正本は、すべてのステージファイルの `produces[]` フィールドで、各ステージの `optional_produces[]`（ステージが Unit ごとに条件付きで書いてよい成果物。フィールド参照は `15-stage-definition.md`）との和集合です。条件付きで出す名前も登録され、プロデューサーへ解決できます。`dist/claude/.claude/tools/aidlc-graph.ts` のヘルパがコンパイル済みステージグラフを読み、和集合を集合として返します — スコープ（`aidlc-lib.ts:772` の `validScopes()`）とエージェント（`aidlc-lib.ts:794` の `loadAgents()`）と同じ型です。レジストリをこの章に置かないことで、手で並走する一覧が招くドリフトを止めます。

---

## What an artifact is here {#what-an-artifact-is-here}

成果物は、出すステージが YAML frontmatter で宣言する **正規識別子** です。ほかのステージは同じ識別子を `consumes[]` で参照し、読みの依存を宣言します。消費される識別子にはプロデューサーがちょうど 1 つあります。消費されない名前は、各ステージが自分のレコードディレクトリの下へ独立ファイルを書くとき、共有してよいです。識別子は短い kebab-case 文字列です — 拡張子なし、フォルダ接頭辞なし、スラッシュなし。

具体例はマイルストーン 4 の通し例、`dist/claude/.claude/aidlc-common/protocols/stage-definition.md` からです:

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

## The derivation rule {#the-derivation-rule}

1. **ステージファイルが正本です。** 各ステージの `produces:` 一覧が、そのステージが出すすべての正規名を宣言します。`consumes:` は、ステージが依存する正規文字列を指名します。
2. **レジストリは計算され、手では書きません。** `bun dist/claude/.claude/tools/aidlc-graph.ts artifacts` を走らせると、生きたレジストリが出ます — 1 行に 1 名、アルファベット順。道具はコンパイル済み `stage-graph.json` から、すべてのステージの `produces[]` と `optional_produces[]` を和集合します。
3. **この章に並走する一覧はありません。** 列挙が欲しければ道具を走らせます。この章は正規名をレジストリ表としては列挙しません。
4. **所属は doctor が検証します。** `/aidlc --doctor` は "Graph references" 検査（`aidlc-utility.ts`）を走ります — すべての `consumes[].artifact` エントリと `requires_stage[]` slug が、派生レジストリに対して解決しなければなりません。孤立した消費者は壊れた参照として報告されます。

ステージファイル 33 すべてが `produces:` を宣言するので、導出はレジストリ全体を返します。道具は空データでも定義されています — `produces:` の無いステージは何も寄与しません — ただし同梱フレームワークではどのステージも埋まっています。

---

## Naming rules {#naming-rules}

どの正規名も `/^[a-z][a-z0-9-]*$/` を満たさなければなりません — `dist/claude/.claude/tools/aidlc-stage-schema.ts` の `SLUG_RE` が強制する形です。つまり:

- **小文字だけ。** `scope-document`。`ScopeDocument` や `SCOPE_DOCUMENT` ではない。
- **拡張子なし。** `scope-document`。`scope-document.md` ではない。
- **フォルダ接頭辞なし、スラッシュなし。** `scope-document`。`ideation/scope-definition/scope-document` ではない。
- **文字で始まる。** `s1` は合法。`1-thing` は違法。
- **内側はハイフン、数字、小文字だけ。** アンダースコアなし、空白なし、Unicode 文字なし。

質問成果物は、慣例で `<stage-slug>-questions` です — 利用者入力を集めるステージは、主な成果物の隣に兄弟の `<slug>-questions` 正規名を宣言します。慣例であり、パーサの規則ではありません。

形は **平らな名前空間** です — `<phase>/<stage>/<artifact>` のような階層接頭辞はありません。AI-DLC のほかの識別子と同じです。エージェント slug、スコープ名、ステージ slug、フェーズ名はすべて平らな kebab です。

---

## Collision policy {#collision-policy}

2 つのステージは、その名前をどのステージも消費するとき、`produces[]` と `optional_produces[]` をまたいで同じ正規名を宣言してはなりません。`aidlc-graph compile` は曖昧さを拒みます。実行時の consume 解決には所有するプロデューサーが 1 つ要るからです。エラーは、出すファイル全部と、消費するステージ 1 つを指名します。同じ消費される概念を 2 ステージが出すときは、切り分ける別の名前を選んでください。

共有名は、どのステージも消費しないとき合法です。同梱の `traceability` 成果物がこの型です。8 ステージがそれぞれ自分のレコードディレクトリの下へ自分の `traceability.json` を書き、下流ステージは `producersOf()` 経由で `traceability` を解決しません。

いまの一例: `build-and-test`（Construction）と `performance-validation`（Operation）の両方が `test-results.md` というファイルを書きます。正規名は分けて、線上で衝突しないようにします:

- `build-test-results` — `build-and-test` が出す。そのステージの兄弟名と対: `build-instructions`、`integration-test-instructions`、`performance-test-instructions`、`security-test-instructions`、`build-and-test-summary`。
- `unit-test-instructions` は `code-generation` が Unit ごとに出し、`build-and-test` が消費する。
- `source-manifest.json` は、`code-generation` の宣言済み成果物に対する、エンジン必須の Unit ごとの相棒です。意図して `produces[]` には **入れません**。その集合を変えると、進行中の成果物指紋が遡って無効になるからです。厳格な JSON マニフェストは、作った・直した・消したアプリケーションソースパスを属性します。終端レビューのスタンプに要り、バイト / 内容の主張は `Unit Source Fingerprint` で結ばれます。
- `load-test-results` — `performance-validation` が出す。同じステージがすでに出す `load-test-plan` と対。

両方の名前は、いまそれぞれのステージの `produces:` 一覧に同梱されています。

**ディスク上のファイル名は一致しなくてもよいです。** 両ステージはそれぞれのフォルダで `test-results.md` へ書き続けてよいです。正規名はワイヤ識別子であり、ファイル名ではありません。

---

## Filesystem mapping {#filesystem-mapping}

成果物はディスク上、`(正規名) + (出すステージ) + (Unit ごとフラグ)` から導けるパスに置きます。既定の拡張子は Markdown です。正規の `traceability` 成果物は構造化データの例外で、`traceability.json` へ解決します。置き場所の形は 2 つです:

- **Unit ごとでないステージ（30 のうち 25）:**
  `<record>/<phase>/<stage>/<artifact-filename>`
  例: `feasibility-assessment`（Ideation の `feasibility` ステージが出す）は
  `<record>/ideation/feasibility/feasibility-assessment.md`。

- **Unit ごとの Construction ステージ（30 のうち 5）:** `nfr-requirements`、
  `nfr-design`、`functional-design`、`infrastructure-design`、
  `code-generation`。これらは Construction 中、作業ユニットごとに各成果物のコピーを 1 つ出します:
  `<record>/construction/{unit-name}/<stage>/<artifact-filename>`
  例: `functional-spec`（`functional-design` が出す）は
  `<record>/construction/{unit-name}/functional-design/functional-spec.md`。

Unit ごとであることは、ステージの `for_each: unit-of-work` frontmatter フィールドが宣言します — Unit ごとに一度走る Construction ステージ 5 つが持ち、残りは省きます。将来のヘルパが、ステージグラフ + 正規名からパスを機械的に計算できます。

`aidlc-lib.ts` の `artifactFilename()` は、ディレクティブ、Unit ごとのカバレッジ、完了ガード、レビュー指紋が共有する拡張子リゾルバです。`traceability` 以外の成果物はすべて `<canonical-name>.md` へ解決し、`traceability` は `traceability.json` へ解決します。

**codekb はスペース単位の例外です。** Reverse Engineering の成果物 9 つ（`business-overview`、`architecture`、`code-structure`、`api-documentation`、`component-inventory`、`technology-stack`、`dependencies`、`code-quality-assessment`、`reverse-engineering-timestamp`）は、インテントごとのレコードディレクトリの下へ **解決しません**。残る、リポジトリごとのコード知識ベース `aidlc/spaces/<space>/codekb/<repo>/` に着地します — そのスペースの全インテントで共有する店で、鍵はインテントではなくリポジトリです。パスは `resolveArtifactPath`（`dist/claude/.claude/tools/aidlc-orchestrate.ts`）の `isCodekb` 枝で、レコード相対の規則の外で解決されます。同じディレクトリは、読み取り専用の直接ユーティリティ呼び出し `bun <harness-dir>/tools/aidlc-utility.ts codekb-path` が出します。

**衝突では正規名 ≠ ファイル名です。** 衝突を分けたところ（上を参照）では、ディスク上のファイル名は分割前の形（`test-results.md`）を残し、正規名は切り分けた版です。正本はステージの `produces:` 一覧と `bun aidlc-graph.ts artifacts` であり、ファイルシステムではありません。

---

## How to view the live registry {#how-to-view-the-live-registry}

```bash
bun dist/claude/.claude/tools/aidlc-graph.ts artifacts
```

正規名を 1 行に 1 つ、アルファベット順で出します。

PR-8 より前の出力は空です — ステージがまだ YAML へ移っておらず、`produces:` が埋まっていません。PR-8 のあと、initialization 以外のステージ 30 をまたいでおよそ 119 名まで増えます。

件数は `wc -l`、フィルタは `grep`、期待ベースラインとのドリフト検査は `diff` へパイプします。

---

## Adding or renaming an artifact {#adding-or-renaming-an-artifact}

この章の編集は要りません — レジストリは派生です。

**新しい成果物を足す:**

1. 出すステージの `.md` を直し、正規名を `produces:` 一覧へ足す。
2. `bun aidlc-graph.ts artifacts` を走らせ、出ることを確かめる。
3. `/aidlc --doctor` を走らせ、どの消費者も、もう存在しない名前を参照していないことを確かめる（"Graph references" 検査）。

**成果物を改名する:**

1. 出すステージの `produces:` エントリで改名する。
2. 消費するすべてのステージの `consumes[].artifact` エントリで改名する。
3. `/aidlc --doctor`（PR-11 以降）が、直し忘れた消費者を捕まえる — 古い名前はプロデューサー欠落エラーになる。

ステージグラフの CI ドリフト検出（`aidlc-graph compile --check`）は、YAML ソースから `stage-graph.json` を作り直すのを忘れた改名を捕まえます。

---

## Stability {#stability}

v1.0 出荷時の生きたレジストリが、フレームワークの成果物面の安定ベースラインです。成果物名の安定方針は:

- **改名** と **削除** は major 版の変更 — v1.x → v2.0。
- **追加** は minor 版で出荷 — v1.0 → v1.1 など。
- **v1.0 までは進行中**: いまの v0.3.0 Foundation 集合が出発点。あとの v0.4.0–v0.11.0 リリースは、方法論が進化するにつれ名前を足し、改名し、落としてよい。

方針は生きたデータに対して強制できます。タグ時点のレジストリと HEAD のレジストリのドリフトは、1 行の `diff` です。

---

## Cross-references {#cross-references}

- `dist/claude/.claude/aidlc-common/protocols/stage-definition.md` —
  権威あるステージ形式仕様。`produces[]` / `consumes[]` を構造化フィールドとして定義する。
- [Stage Definition](15-stage-definition.md) — 仕様の物語章。
- [State Machine](12-state-machine.md) — 監査イベントの並走する導出型。正規 enum は文書ではなく `aidlc-audit.ts` にある。
- [User Guide — Artifacts Reference](../guide/14-artifacts-reference.md)
  — 利用者向けの成果物ライフサイクルとディレクトリ配置。
- `dist/claude/.claude/tools/aidlc-graph.ts` — 導出道具
  （`artifactsRegistry()` + `artifacts` CLI サブコマンド）。
