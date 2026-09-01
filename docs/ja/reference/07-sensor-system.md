# センサーシステム

> 読者: Tier 2/3（チームで入れる人、フレームワークの貢献者）。

この章は、AI-DLC センサーマニフェストの **スキーマリファレンス** です。ステージ出力への書き込みで発火する、決定論的な検査です。センサーは制御ループのフィードバック側、ルールはフィードフォワード側です（次章の [Rule System](08-rule-system.md)）。[Plane Architecture](02-plane-architecture.md) は両方をコントロールプレーンの入力として置き、コンパイルが各ステージノードへ解決します。

扱うのはマニフェストの *ファイル形式* です。マニフェストに何が入り、ステージがセンサーをどう取り込み、同梱の 6 マニフェストがどう設定されているか。ワークフロー中の発火の見え方は、User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md) です。

> **パスの約束。** 以下の `<record>/` は、アクティブインテントのレコードディレクトリです。`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（短い UTC 日付接頭辞と短い kebab-case ラベルなので、レコードディレクトリは時系列に並びます。正式 id は `intents.json` レジストリ行に載る UUIDv7）。同梱マニフェストのうち、文書形センサー 2 つの `matches` glob は、まだ古い成果物ツリーのパスを持っています（スキーマを書く箇所ではそのまま引用します）。

実行時の振る舞いは [Stage Protocol](04-stage-protocol.md) です。ステージ定義のファイル形式の対は [Stage Definition](15-stage-definition.md) です。

---

## Manifest location and filename

センサーマニフェストの置き場所:

```
dist/claude/.claude/sensors/aidlc-<id>.md
```

フレームワーク同梱のマニフェストは、どれもファイル名に `aidlc-` 接頭辞を付けます（フレームワークファイル全体の約束と同じ）。frontmatter の `id:` は、ファイル名ステムから `aidlc-` 接頭辞と `.md` 接尾辞を外したものと一致しなければなりません:

| Filename | Required `id:` |
|---|---|
| `aidlc-required-sections.md` | `required-sections` |
| `aidlc-linter.md` | `linter` |

ファイル名と id の対応は `tests/unit/t86-sensor-manifest-schema.sh` が強制します。`aidlc-` 接頭辞は **すべてのセンサーに必須で、利用者が足すカスタムも例外ではありません**。コンパイルのリゾルバは `SENSOR_FILE_REGEX = /^aidlc-([a-z][a-z0-9-]*)\.md$/`（`aidlc-graph.ts` の `loadSensors`）でマニフェストを見つけるので、接頭辞の無いファイルは黙って飛ばされ、ステージに結びません。カスタムセンサーは `aidlc-<id>.md` と名付け、`id: <id>` を書いてください。

---

## Sensor Manifest Schema

マニフェストは YAML frontmatter と本文を持つ Markdown です。frontmatter が構造化した契約 — 純粋な能力記述子 — で、本文は検査を説明する人向けの散文です。マニフェストが言うのは *センサーとは何か* であり、どのステージが使うかではありません。その関係はステージ側の frontmatter `sensors:` にあります（下の [How stages import sensors](#how-stages-import-sensors)）。

```yaml
---
id: required-sections                       # required
kind: deterministic                          # required
command: bun .claude/tools/aidlc-sensor-required-sections.ts   # required
default_severity: advisory                   # required
fire_on: gate                               # optional; write (default) | gate
description: Checks that stage output ...    # required
category: document-shape                     # optional
matches: "**/{aidlc-docs,intents}/**"                  # optional capability filter
input_schema:                                # optional
  output_path: string
  stage_slug: string
output_schema:                               # optional
  pass: boolean
  missing_headings: string[]
timeout_seconds: 5                           # optional
---

# required-sections sensor

<body — prose documenting default mode, override mode, failure mode>
```

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | ✓ | kebab-case string | ファイル名ステムから `aidlc-` を外したもの。ルールファイルの `pairing:` から相互参照される（[Rule System](08-rule-system.md)）。 |
| `kind` | ✓ | enum | いま受け付けるのは `deterministic` だけ。`llm` は v0.11.0 の LLM ディスパッチ章用に予約。下の [`kind` enum](#kind-enum)。 |
| `command` | ✓ | string | 正規の起動接頭辞。同梱センサーはそれぞれ専用スクリプトを指名する（例: `bun .claude/tools/aidlc-sensor-required-sections.ts`）。ディスパッチャ（`aidlc-sensor.ts`）が `--stage <slug>` と、入力形に合わせたファイルフラグを付ける。文書センサーは `--output-path <path>`、コードセンサー（`linter`、`type-check`）は `--file-path <path>`。 |
| `default_severity` | ✓ | enum | `advisory` または `blocking`。blocking の強制は `fire_on: gate` に効く。write 発火の blocking 宣言は、このリリースでは advisory のまま。 |
| `description` | ✓ | string | 一行の人向け説明。 |
| `category` | optional | string | 自由形式の説明ラベル（同梱マニフェストは `document-provenance`、`document-shape`、`code-quality`。閉じた enum ではない）。 |
| `fire_on` | optional | enum | `write` または `gate`。既定は `write`。 |
| `matches` | optional | glob string | ディスパッチ時に消費する能力フィルタ。下の [`matches` filter](#matches-filter)。 |
| `input_schema` | optional | object | いまは advisory。将来の LLM ディスパッチがテンプレート契約として使う。 |
| `output_schema` | optional | object | いまは advisory。将来の LLM ディスパッチがパース契約として使う。 |
| `timeout_seconds` | optional | int | 発火ごとの壁時計上限。 |

---

## `kind` enum {#kind-enum}

`kind` はディスパッチの仕組みを宣言します。スキーマがいま受け付ける値はちょうど 1 つです:

- `deterministic` — マニフェストの `command:` が自己完結のシェル起動。終了 0 が合格、非 0 が失敗。構造化した詳細を既知のパスへ書く。

`llm` は **LLM ディスパッチ章（v0.11.0+）用の予約** です。その章が来るまで、消費者はパース時に `kind: llm` を拒まなければなりません。予約は書き込み時に強制されます。いま `kind: llm` のマニフェストを出すのは著者の誤りで、パーサが拒みます。

`kind` の未知の値（`deterministic` 以外）はパース時に拒まれます。前方互換が効くのは *未知のキー* です（[Forward-compat policy](#forward-compat-policy)）。既知キーの未知の値には効きません。

---

## How stages import sensors {#how-stages-import-sensors}

引きの執筆です。各ステージの frontmatter が、使うセンサーを宣言します。コンパイルのリゾルバは宣言された id をマニフェストレジストリで引き、コンパイル済みグラフノードへ `sensors_applicable` 配列を焼き込みます。書く向きは参照の局所性です。ステージファイルを開くと、そのステージが走るときどの検査が発火するかが正確に見えます。

```yaml
# dist/claude/.claude/aidlc-common/stages/construction/code-generation.md
---
slug: code-generation
phase: construction
# ...
requires_stage: [...]
sensors:
  - linter
  - type-check
inputs: ...
outputs: ...
---
```

`sensors:` は裸の id の一覧です。id は各マニフェスト frontmatter の `id:` と一致し、ファイル名↔id 契約どおり `aidlc-` を外したファイル名ステムです。コンパイルのリゾルバは次をします:

1. `dist/claude/.claude/sensors/` を歩き、すべての `aidlc-<id>.md` マニフェストをパースする。
2. 解決時の O(1) 参照のため、マニフェストを id で索引する。
3. 各ステージについて、宣言された取り込み id を引く。未知なら投げる（発火時の沈黙ではなく、コンパイル時の大きな失敗）。
4. `fire_on`、`default_severity`、`category`、`matches` を、解決済みの `sensors_applicable[]` エントリへコピーする。
5. ステージごとの解決済み配列を正規の `data/stage-graph.json` へ出す（FIELD_ORDER 固定: `rules_in_context` の直後）。

実行時の PostToolUse フック、`gate-start`、`revise` はグラフノードの `sensors_applicable` を読みます。どれもマニフェストを開き直しません。ディスパッチフィールドはコンパイル時のスナップショットです。ワークフロー中のマニフェスト編集は、進行中のワークフローが発火するものを変えません（BGP 安定性 — [Plane Architecture](02-plane-architecture.md)）。

### Per-stage sensor matrix (33 framework stages) {#per-stage-sensor-matrix-33-framework-stages}

| Stages | `sensors:` |
|---|---|
| initialization 3 つ（workspace-scaffold、workspace-detection、state-init） | `[]`（決定論的なセットアップ。エージェントが書く Markdown は無い） |
| `intent-capture` | `[claim-sources, required-sections, upstream-coverage]`（`claim-sources` は、ステージ成果物全体で見えるインライン出自、権威のソース登録値、人が確認した仮定の正確な一致を見る） |
| ほかの ideation 6、ほかの inception 6、operation の Markdown ステージ 7 | `[required-sections, upstream-coverage]` |
| `user-stories`、`domain-design`、`units-generation` | `[required-sections, upstream-coverage, traceability]` |
| `build-and-test` | `[required-sections, upstream-coverage, type-check]`（linter は意図して外す — ビルドが正規の lint を走る） |
| `ci-pipeline` | `[required-sections, upstream-coverage, linter, type-check]` |
| Unit ごとの construction-design ステージ 4（`functional-design`、`infrastructure-design`、`nfr-design`、`nfr-requirements`） | `[required-sections, upstream-coverage, linter, type-check, traceability]` |
| `code-generation` | `[linter, type-check, traceability]` |

フォークがステージを寄せるときは、そのステージの `sensors:` 一覧を直接直します。結びは、寄せる対象の隣にあります。マニフェストは純粋な能力記述子で、ステージ指定のフィールドは持ちません（`applies_to:` は無い — 引きの執筆が外しました）。実行時は厳格加算です。フォークがあるステージにセンサーを載せたいなら取り込み、要らなければ省きます。考えるオーバーライド層はありません。

---

## `matches` filter {#matches-filter}

`matches` は、マニフェスト先頭の任意の能力記述子です。センサーが解析できるファイルの glob 形を宣言します — *「このセンサーは、この glob に一致するファイルを解析する」* — 消費するのはコンパイル時のリゾルバではなく、ディスパッチ時です。

| Manifest | `matches` |
|---|---|
| `aidlc-claim-sources.md` | `**/{aidlc-docs,intents}/**` |
| `aidlc-required-sections.md` | `**/{aidlc-docs,intents}/**` |
| `aidlc-upstream-coverage.md` | `**/{aidlc-docs,intents}/**` |
| `aidlc-traceability.md` | `**/traceability.json` |
| `aidlc-linter.md` | `**/*.{ts,js}` |
| `aidlc-type-check.md` | `**/*.{ts,tsx}` |

`fire_on: write` では、`matches` が発火フィルタです。フックは書かれているパスを glob と較べ、glob の無いエントリは発火しません。`fire_on: gate` では、`gate-start` と `revise` が存在する宣言済み成果物を列挙し、各センサーの `matches` 能力の外のパスを飛ばし、一致するパスだけをディスパッチします。glob を省くと、すべての成果物を受け付けます。同梱の 6 マニフェストはどれも glob を宣言します。コンパイルのリゾルバはそれを `sensors_applicable[]` へコピーします。

空文字（`matches: ""`）はパース時に拒まれます。write 発火のセンサーは glob を宣言すべきです。gate 発火のセンサーは、宣言済み成果物を全部解析するために省略してよいです。

### Cross-references between rules and sensors {#cross-references-between-rules-and-sensors}

ルールファイルは `pairing: aidlc-required-sections`（`aidlc-` 接頭辞付き）でセンサーへフィードフォワードします。センサーマニフェストの `id:` は `required-sections`（接頭辞なし）です。doctor のカバレッジ検査は、ルールの `pairing:` から `aidlc-` 接頭辞を外して正規化し、マニフェスト `id` と照合します。

---

## `default_severity` {#default_severity}

`advisory` の結果は監査行を残しますが、ステージゲートは止めません。`blocking` のゲート結びは、検証済みの合格があるときだけ進みます。報告された所見、ディスパッチャの終了 / spawn / タイムアウト失敗、壊れた・食い違った判定、`SENSOR_BUDGET_OVERRIDE`、`tool-unavailable` または `script-error` を載せた `SENSOR_PASSED` 行は、ゲートが開く前に `gate-start`、`revise`、または承認時に復旧した revision 再入場を止めます。

運用者は所見を直して再試行するか、別の明示オーバーライド判断をします。コンダクターは `DECISION_RECORDED` に `Fix findings,Override blocking sensors` を載せ、新しい人のターンを待ち、正確な `QUESTION_ANSWERED` を記録してから、`--override-blocking-sensors --user-input "Override blocking sensors"` でゲート報告を再試行します。裸のフラグ、出していない / 言い換えた選択、人の裏付けの無いレシート、自律モードは拒まれます。成功したオーバーライドは、センサー id、任意の詳細パス、評価理由を `STAGE_AWAITING_APPROVAL` に記録します。すでに開いているゲートの再検証は、`Revalidated: true` の新しい行を出し、認可レシートを消費して使い回しを止めます。このリリースでは、write 発火のセンサーは `blocking` を宣言できますが、PostToolUse ディスパッチは advisory のままです。

---

## `fire_on` {#fire_on}

`write` が既定で、増分の PostToolUse フィードバックを残します。`gate` は、存在する宣言済み成果物ごとに一度発火します。`gate-start` が最初のゲートを開く直前、`revise` が直しのあとゲートへ再入場する直前、承認時の revision バックストップが復旧再入場する直前です。ディスパッチは状態トランザクションの外です。`aidlc-sensor.ts fire` が `SENSOR_FIRED` と終端行の両方で監査ロックを取るからです。blocking ディスパッチは、評価前に一致する成果物すべての指紋を取り、各センサーのあとで指紋を確かめ、状態トランザクション内でもう一度確かめます。バイトが変わっていればゲート入場を拒み、再試行で評価し直します。

ディスパッチャは終端行のあと、コンパクトな JSON 判定を 1 つ出します。`fire_id`、`sensor_id`、`stage`、`output_path`、`result`、`detail_path`、任意の `note`。ゲート強制は判定の同一性を検証し、blocking 結びでは note 無しの `passed` 以外を不合格として扱います。明示の `--artifacts` パスと発見した成果物は正規に解決され、ステージの正規 produce ディレクトリ内に留まらなければなりません。絶対パス、トラバーサル、シンボリックリンクの逃げ道でセンサーを逸らせません。

---

## `command:` invocation contract {#command-invocation-contract}

マニフェストの `command:` は **正規の起動接頭辞** であり、完全な argv ではありません。同梱センサーはそれぞれ専用スクリプトを指名します。ディスパッチャ（`aidlc-sensor.ts`）が発火時に実行時コンテキストを付けます。いつも `--stage <stage-slug>`、そのあとセンサーの入力形に合わせたファイルフラグ — 文書センサーは `--output-path <file>`、コードセンサー（`linter`、`type-check`）は `--file-path <file>`:

```
<command> --stage <stage-slug> --output-path <file-being-written>   # document sensor
<command> --stage <stage-slug> --file-path   <file-being-written>   # code sensor
```

したがって、次のマニフェストが:

```yaml
command: bun .claude/tools/aidlc-sensor-required-sections.ts
```

`requirements-analysis` に対して、インテントのレコードディレクトリへ requirements 成果物を書いているときに発火すると、次のようにディスパッチされます:

```
bun .claude/tools/aidlc-sensor-required-sections.ts \
  --stage requirements-analysis \
  --output-path aidlc/spaces/default/intents/260624-inventory-api/inception/requirements-analysis/requirements.md
```

マニフェストは発火ごとのフラグを持ちません。付けるのはディスパッチャです。マニフェストは純粋な能力記述子のままです。

---

## Gate-ritual handoff (surface stdout / selections-file in) {#gate-ritual-handoff-surface-stdout--selections-file-in}

§13 のラーニングゲートは tool-as-actor です。決定論的な道具（`aidlc-learnings.ts`）とコンダクター（生きている `/aidlc` セッション）の往復は 2 脚で、あいだにナレッジの段と判断の段があります:

1. **`surface`（stdout）。** `bun .claude/tools/aidlc-learnings.ts surface --slug <stage-slug>` がステージの `memory.md` を読み、構造化した JSON を出します。`candidates[]`（空でない Interpretation / Deviation / Tradeoff 項目ごとに 1 つ。それぞれ `id`、`source_heading`、`ts`、`summary`、`context`、`default_scope: "project"`）と、読み取り専用の `parked_open_questions[]`。AskUserQuestion のフィールド名は出しません。純粋な領域データです。Open questions は候補になりません（調査項目です）。
2. **コンダクターが AskUserQuestion を描く（ナレッジ）。** 候補ごとに選択肢 1 つ（label = 候補の `summary` をそのまま。description = 導出した行き先、例: `→ memory/project.md (Deviation)` と、team へ昇格する手がかり）。`multiSelect` のあと、コンダクターは残した各 label を候補の `id` + `source_heading` へ戻します。それからいつも「次回に足すことは？」と聞き、自由文があれば見出し選びの AUQ を 1 つ出します（Interpretation / Deviation / Tradeoff / Open question）。見出し選びが利用者の唯一の分類で、行き先はそこから導きます。
3. **受理の衝突検査（ナレッジ → オーケストレータ LLM。persist に届く選択をゲートする）。** 残した学びごとに、コンダクターは提案する日付付き項目 1 つを、`org.md` の対応する `## <section>`（§5 受理ゲートの一行版）と較べます。矛盾があればコンダクターは衝突する org の文をインラインで出し、利用者は直す / 飛ばす / エスカレートします（判断 → 利用者。上書きの道は無い）。衝突が無い、または利用者がエスカレートした選択だけが進みます。センサーマニフェストには org 見出しの対が無いので、この検査を飛ばします。
4. **`persist`（selections-file in）。** コンダクターは残した選択を `<record>/.aidlc-learnings/<slug>-selections.json`（インテントのレコードディレクトリ内、gitignore）へ書き、`bun .claude/tools/aidlc-learnings.ts persist --slug <slug> --selections-json <path>` を呼びます。道具は決定論的な書き手です。衝突は判断しません。各学びをプラクティスとして `aidlc/spaces/<surface-time-space>/memory/{project,team}.md` へ振り、センサー選択なら 2 書き込みのインストール（マニフェスト + 発生元ステージの `sensors:` frontmatter）を 1 つの `withAuditLock` の中で行い、`RULE_LEARNED` / `SENSOR_PROPOSED` を出します。

selections-file は再生の成果物です。落ちた persist は、人に聞き直さず同じ JSON を再生します（書いた行ごとの `<!-- cid:<intent-slug>:<slug>:<content-hash> -->` マーカーによる内容存在のべき等。ハッシュは学び本文自身の完全な SHA-256 で、位置の候補 id ではありません）。selections-file は `space` / `intent` も持ち、候補を出したときに一度結びます。`persist` はそれを使い、生きている active-intent カーソルを自分では引き直しません。書く前に、このスペースと null でないインテントレコードがまだ存在すること、要求した slug が surface 時の `stage_slug` と一致することを確かめます。

---

## Defaults for scaffolded manifests {#defaults-for-scaffolded-manifests}

ゲートでセンサー提案が確認されると、ゲート儀式の道具は新しい **project 層** マニフェストを `<project>/.claude/sensors/aidlc-<id>.md` に足場します。同梱のフレームワーク配布には書きません（プロジェクト単位のラーニングループがフレームワークを変えてはいけない。フレームワーク配布パスは拒まれます）。フィールドの既定:

| Field | Default | Note |
|---|---|---|
| `id` | 利用者の自由文から導く（kebab-case にする） | |
| `kind` | `deterministic` | いま受け付ける唯一の値 |
| `command` | `bun .claude/tools/aidlc-sensor-<id>.ts` | センサーごとのプレースホルダスクリプト。検査を実装するスクリプトへ利用者が更新する |
| `default_severity` | `advisory` | 止めない既定 |
| `fire_on` | `write` | 増分の write ディスパッチ |
| `description` | 利用者の自由文から | |
| `category` | `""` | 望むなら利用者が埋める |
| `matches` | write パスの glob | 足場が、センサーが当たる glob 形を聞く（成果物ツリーの glob、または `**/*.ts` のようなコード glob）。`matches` の無い write 発火エントリは発火しない |
| `input_schema` | `{ output_path: string, stage_slug: string }` | ディスパッチャが付けるフラグと一致 |
| `output_schema` | `{ pass: boolean }` | ディスパッチャが頼る最小構造 |
| `timeout_seconds` | `30` | 保守的な既定。遅いディスパッチャ向けに調整する |

マニフェストを足場したあと、ゲート儀式の道具は — 同じ `withAuditLock` トランザクションの中で — 新しい id を発生元ステージの `sensors:` frontmatter 一覧へ追記します（引きの執筆の 2 書き込みインストール）。次のワークフローがコンパイルするとき、センサーは完全に結ばれます。これが許される唯一のステージ frontmatter 編集です。取り込み一覧を伸ばします（形は不変、中身は増える）。`## Steps` / `## Sensors` / `## Learn` 本文は触りません。

同梱の 6 マニフェストは、これらの既定がのちにどう分岐するかを示します。`aidlc-claim-sources.md`、`aidlc-required-sections.md`、`aidlc-upstream-coverage.md` は `timeout_seconds: 5` と成果物ツリーの `matches` glob（上の `matches` 表の値）。`aidlc-linter.md` は `30` と `matches: "**/*.{ts,js}"`。`aidlc-type-check.md` は `60` と `matches: "**/*.{ts,tsx}"`。

---

## Forward-compat policy {#forward-compat-policy}

センサーマニフェストの消費者（コンパイル、ディスパッチャ、ゲート儀式の足場、doctor）は **未知のマニフェストキーを許容しなければなりません**。将来のリリースが任意の `cool_new_field:` を足しても、古い消費者はマニフェストをパースし、そのフィールドを無視して進みます。フォークやアップグレード前のワークスペースを壊さず、スキーマを加算で進化させられます。

前方互換は、既知キーの未知の値には効きません。上の [`kind` enum](#kind-enum) のとおり、`kind` の未知の値はパース時に拒まれます。同じ原則が、ほかの enum 形フィールド（`default_severity`、`fire_on`）にも当たります。

---

## Reserved for future releases {#reserved-for-future-releases}

センサーの能力のうちいくつかは、スキーマに予約されていますが、まだ動きません。載るときにフィールド形が安定しているようにするためです:

- **`kind: llm` ディスパッチ** — LLM が評価するセンサー（v0.11.0）。スキーマはいま `kind` を受け付けるが、パース時に `deterministic` 以外は拒む。
- **書き込み時の blocking** — write 発火マニフェストで `blocking` は受け付けるが、このリリースで強制されるのは gate 発火の失敗だけ。

どちらも書き込み時に強制されます。いまそれらを使うマニフェストを出すのは著者の誤りで、パーサが拒みます。

## Next Steps {#next-steps}

- **Rules** — 制御ループのフィードフォワード側は、`pairing:` フィールドでこれらのセンサーと対になります。[Rule System](08-rule-system.md)。
- **利用者向けのラーニングループ** — センサー提案がゲートで出され確認される流れと、確認した提案が新しいマニフェストを足場する流れ。User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md)。
- **コンパイル境界** — `sensors_applicable` がワークフロー開始時に一度解決され、発火時にグラフノードから読まれる流れ。[Plane Architecture](02-plane-architecture.md)。

上のスキーマと、`dist/claude/.claude/sensors/` の同梱マニフェスト 5 つが、動いている例です。
