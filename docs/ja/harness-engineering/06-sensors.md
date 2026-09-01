# センサー

センサーは決定論的な検査です。一致する書き込み、またはステージの承認ゲートで自動発火します。ルールがエージェントの読む散文であるのに対し（[ルールとラーニングループ](05-rules-and-the-loop.md)）、センサーは走るコードです。ルールのフィードフォワードに対する、制御ループのフィードバック側です。ルールは「ユーザーストーリーは Given/When/Then に従う」と言い、センサーはエージェントがいま書いたファイルに、必須見出しがバイト単位で存在するかを検証します。

この章は、ハーネスエンジニアがセンサーで実際にすることを語ります。同梱の 6 つを理解する、新しいマニフェストを書く、走らせたいステージに結ぶ。フィールドごとの契約全体は Developer Reference の [Sensor System](../reference/07-sensor-system.md) です。この章はスキーマ判断のたびにそちらへ下ろし、再述しません。

---

## センサーとは

センサーマニフェストは YAML frontmatter 付き Markdown で、`core/sensors/` の下に置きます。frontmatter は純粋な **能力記述子** です。検査が何か、どう起動するかを言います。どのステージが使うかは言いません。その結びはステージ側にあります。この章の中心であり、マニフェストとステージが緩く結ばれる理由です。

実行時の振る舞いを定義する性質は 3 つです。何かを書く前に内面化する価値があります。

- **`fire_on: write` は執筆中に走ります。** `PostToolUse` フックが、Write または Edit のあと、一致する各センサーを走らせます。`fire_on` を省略したときの既定です。
- **`fire_on: gate` は成果物ごとに一度走ります。** `gate-start` が状態トランザクションを開く直前、状態ツールがゲート結びの各センサーを、存在する宣言済み成果物パスごとに一度発火します。センサーディスパッチャが監査ロックを取るので、ディスパッチはトランザクションの外にあります。
- **重大度がゲートの強制を制御します。** `advisory` の結果は記録され、ゲートはそれでも開きます。`blocking` の結びは検証済みの合格を要求します。所見、使えないツール、スクリプト / ディスパッチャのエラー、壊れた判定、タイムアウトはゲート入場を止めます。オーバーライドは裸のフラグではなく、ログに残る別の人の判断で、自律モードでは禁じられます。成功したオーバーライドは、id、任意の詳細パス、理由を `STAGE_AWAITING_APPROVAL` に記録します。blocking の強制は、このリリースでは `fire_on: gate` にだけ効きます。write 発火のセンサーは `blocking` を宣言できますが、結果は advisory のままです。

各発火はインテントの `audit/` シャードに 1 行残します。イベント名はログを grep するとき大小が効きます。開始は **`SENSOR_FIRED`**、通過は **`SENSOR_PASSED`**、欠けを見つけたときは **`SENSOR_FAILED`** です。失敗行は `<record>/.aidlc-sensors/<stage-slug>/`（インテントのレコードディレクトリ内）の詳細ファイルへリンクし、具体的な欠けを指名します。欠けた見出し、参照されていない上流成果物、lint エラー。実行中の見え方の利用者向け案内は、User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md) です。

---

## 同梱のセンサー 6 つ

マニフェスト 6 つが `.claude/sensors/` の下に同梱され、どれも `aidlc-` 接頭辞です。

| マニフェスト | ディスパッチ | 検査すること |
|--------------|--------------|--------------|
| `aidlc-claim-sources.md` | Gate | Intent Capture のどの主張も解決できるソースタグを持つ。登録された description、scope、memory の値が権威の入力と一致。残した仮定が人の明示確認と正確に一致 |
| `aidlc-required-sections.md` | Gate | 出力が必須 H2 見出しを持つ。汎用の中身の形検査 |
| `aidlc-upstream-coverage.md` | Gate | ステージの成果物（集合として評価）が、ステージが消費すると宣言した各上流成果物を、slug、wikilink、またはプロデューサーステージのディレクトリパスで参照する |
| `aidlc-traceability.md` | Write: `**/traceability.json` | 安定した上流 ID、状態、決定論的ターゲット、導出したビジネスルールの孤立を検証 |
| `aidlc-linter.md` | Write: `.ts` / `.js` | 設定したリンタを包む（既定は ESLint） |
| `aidlc-type-check.md` | Write: `.ts` / `.tsx` | 設定した型検査を包む（既定は `tsc`） |

6 つとも `matches:` glob でゲートされます（後述）。出自検査と 2 つの文書形検査は成果物の木に範囲します（配布マニフェストは `**/{aidlc-docs,intents}/**` を持ちます。インテントごとのレコード木で、移行前プロジェクト向けに古い `aidlc-docs/` 腕も残しています）。トレーサビリティは `**/traceability.json`、2 つのコード品質検査は言語 glob（`**/*.{ts,js}`、`**/*.{ts,tsx}`）です。
自分のを書く前に `aidlc-required-sections.md` を端から端まで読んでください。6 つのなかでいちばん小さく、frontmatter と散文本文の形全体が見えます。

---

## 結びの仕方: 引きの執筆

マニフェストは **ステージ指定のフィールドを持ちません。** `applies_to:` はありません。フレームワークが意図して外しました。ステージは、自分の出力で何が発火するかを、自分の frontmatter でセンサーを指名して決めます。

```yaml
# core/aidlc-common/stages/construction/code-generation.md
---
slug: code-generation
phase: construction
sensors:
  - linter
  - type-check
  - traceability
---
```

これが **引きの執筆** で、ハーネス模型のほかの結びと同じ向きです。消費者（ステージ）が能力（センサー）を指名し、逆はありません。`sensors:` 一覧は裸の id です。`aidlc-linter` ではなく `linter`。id がマニフェスト frontmatter の `id:` フィールドと一致し、それは `aidlc-` 接頭辞を外したファイル名ステムだからです。

見返りは参照の局所性です。ステージファイルを開くと、そのステージが走るときどの検査が発火するかが正確に見えます。このステージを対象にすると主張するマニフェストを全部探す必要はありません。同じ `sensors:` 区画をステージ側から書いたのが [ステージの構造](01-anatomy-of-a-stage.md) です。ここではセンサー側から見ています。

ワークフロー開始時、コンパイルリゾルバは `.claude/sensors/` を歩き、マニフェストを id で索引し、各ステージの宣言済み取り込みを照会します。id にマニフェストが無いとコンパイル時に大きく投げ、ステージ実行時に黙って失敗しません。解決済みのステージごとの見え方はステージグラフノードに焼き込まれ、フックは発火時にそこから読みます。頭に置く帰結が 1 つあります。ワークフロー途中でマニフェストを直しても、進行中の実行で発火するものは **変わりません**。コンパイルのスナップショットは、次のワークフロー開始まで持ちます。リゾルバの仕組み全体は [How stages import sensors](../reference/07-sensor-system.md#how-stages-import-sensors) です。

---

## 新しいセンサーを書く

センサーを足すのは 2 書き込みです。マニフェスト、それから結び。

**1. `core/sensors/aidlc-<id>.md` にマニフェストを置く。** ファイル名ステム（`aidlc-` 接頭辞を除く）は frontmatter の `id:` と一致しなければなりません。frontmatter は短いです。必須 5 フィールドと、任意がいくつかです。

| フィールド | 必須 | 何か |
|------------|------|------|
| `id` | はい | kebab-case。`aidlc-` を除いたファイル名ステムと一致 |
| `kind` | はい | いま受け付ける値は `deterministic` だけ |
| `command` | はい | ディスパッチャが走らせる正規の起動接頭辞 |
| `default_severity` | はい | `advisory` または `blocking`。blocking が強制されるのはゲートディスパッチだけ |
| `description` | はい | 人向けの一行説明 |
| `category` | いいえ | 自由形式のラベル（配布マニフェストは `document-shape`、`code-quality`） |
| `fire_on` | いいえ | `write` または `gate`。既定は `write` |
| `matches` | いいえ | write パスのフィルタ。ゲートディスパッチで glob を省略すると、宣言済み成果物を全部受け入れる |

`command:` は **接頭辞** であり、argv 全体ではありません。ディスパッチャが発火時にランタイム文脈を追記します。いつも `--stage <slug>`、それからセンサーの入力形に合うファイルフラグ。文書センサーは `--output-path <path>`、コードセンサー（`linter`、`type-check`）は `--file-path <path>`。だからマニフェストは純粋な能力記述子のままで、発火ごとのフラグは載せません。ディスパッチャが組む正確な起動は [`command:` invocation contract](../reference/07-sensor-system.md#command-invocation-contract) です。スキーマ全体（`input_schema`、`output_schema`、`timeout_seconds`、未知キーの前方互換方針）は [Sensor Manifest Schema](../reference/07-sensor-system.md#sensor-manifest-schema) です。

**2. ステージの `sensors:` 一覧に id を足して結ぶ。** ディレクトリに座っているマニフェストは、ステージが取り込むまで何もしません。検査を発火させたいステージを開き、frontmatter の `sensors:` 一覧に裸の id を足すと、次のコンパイルで結びが効きます。複数ステージで走らせるには、それぞれに id を足します。厳格加算で、考える上書き層はありません。あるステージでの発火を止めるには、そのステージから id を外します。マニフェストは変わりません。取り込み一覧だけです。

`aidlc-` ファイル名接頭辞は、カスタムを含むどのセンサーでも必須です。コンパイルリゾルバ（`aidlc-graph.ts` の `loadSensors`）は `SENSOR_FILE_REGEX = /^aidlc-([a-z][a-z0-9-]*)\.md$/` でマニフェストを発見し、接頭辞が無いファイルは黙って飛ばします。発見されず、どのステージにも結びません。センサー名は `core/sensors/aidlc-<id>.md`、`id: <id>` です。ファイル名と id の規則は、接頭辞のあとのステムに効きます。

---

## 判断: `fire_on`、`matches`、`default_severity`

マニフェストの大半は機械的です。本当の執筆判断を持つフィールドは 2 つです。

**`fire_on` — 役に立つ検査境界はいつか。** 繰り返し検査が役立つ、速い増分フィードバックには `write`。最終ステージ出力に対して一度走るべき、成果物全体またはファイル横断の検査には `gate`。省略は `write` です。

**`matches` — どの形のファイルを解析するか。** `fire_on: write` では、この glob が発火フィルタで、実質必須です。フックは書かれたパスが一致するときだけ発火し、`matches` が無い項目は発火しません。`fire_on: gate` では、状態ツールが同じ能力検査を存在する各宣言済み成果物に適用し、一致するファイルだけディスパッチします。`matches` を省略すると全部受け入れます。
コード品質センサーはコード glob にします（`aidlc-linter.md` は `**/*.{ts,js}`、`aidlc-type-check.md` は `**/*.{ts,tsx}`）。コードの書き込みだけで発火し、散文では静かです。文書形センサーは成果物の木に範囲し、ステージが書くどの markdown 成果物でも発火します。
検査が意味を持つファイル形を決め、それをカバーするいちばん狭い glob を書いてください。空の `matches: ""` はパース時に拒否されます。write 発火のセンサーは形を指名しなければなりません。gate 発火のセンサーはフィールドを省略して、宣言済み成果物を全部受け入れられます。振る舞い全体は [`matches` filter](../reference/07-sensor-system.md#matches-filter) です。

**`default_severity` — 信号か強制か。** `advisory` は結果を記録し、続けます。`blocking` は、ディスパッチャが検証済み合格を返すまで、gate 発火のセンサーを止めます。所見、評価不能、壊れた出力、タイムアウトはすべて拒否します。運用者は問題を直すか、ログに残る二択プロンプトから `Override blocking sensors` を明示選択し、フラグと正確な `--user-input` で再試行できます。自律モードはオーバーライドできません。write 発火センサー上の blocking はスキーマが受け付けますが、このリリースでは advisory のままです。方針は [`default_severity`](../reference/07-sensor-system.md#default_severity) です。

---

## ラーニングループがセンサーを入れてくれるとき

センサーをいつも手で書くわけではありません。§13 のラーニングゲートは、ワークフロー中にセンサー提案を確認すると 1 つ入れられます。ステージの出力に決定論的な検査を発火させると決め、ゲートで印を付け、フレームワークが手作業と同じ 2 書き込みインストールをします。**project 層** のマニフェストをプロジェクトの `.claude/sensors/aidlc-<id>.md` に足場し（配布のフレームワーク配布には決して書かない）、発生元ステージの `sensors:` 取り込み一覧に新しい id を原子的に追記します。そのゲート確認の道は **`SENSOR_PROPOSED`** 監査行を出すので、結びが黙って入ることはありません。ループと `SENSOR_PROPOSED` 行は [ルールとラーニングループ](05-rules-and-the-loop.md) です。利用者向けの通しは User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md) です。

この章の手書きの道と、ループが入れる道は、同じ成果物を出します。マニフェストと取り込み一覧の項目。違いは誰が始めるかです。ファイルを直接直すあなたか、ワークフロー途中の訂正を捉えるゲートか。

---

## 次

[チームナレッジ](07-team-knowledge.md) — エージェントが仕事の前に読む領域の文脈を渡す。ハーネスエンジニアが形を作る最後のデータ面。
