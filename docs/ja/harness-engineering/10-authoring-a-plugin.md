# プラグインを書く

> [ハーネスエンジニアガイド](00-overview.md) の一部。前提: [ステージの構造](01-anatomy-of-a-stage.md)。設計参照（仕組み、導入時の理屈、ハイブリッド配布模型、現状）: [Plugin Mechanism](../reference/18-plugin-mechanism.md)。

**AIDLC プラグイン**（**プラグイン**）は、再利用できる任意の AIDLC 寄与の集合です。新しいステージ、エージェント、スコープ、方法 / ルール（メモリ層）、センサー、方法論ナレッジ、既存コアステージへの加算変更。自分のディレクトリに包み、自分のリポジトリから公開し、利用者が選んだプラグイン集合の上でインストールへ **合成** します。プラグインは `core/` を決して直しません。どのプラグインも無効なら、インストールは裸のコアとバイト一致です。

ファーストパーティプラグイン（AIDLC チームが出荷）とサードパーティプラグイン（ほかの誰でも）は **機械的に同一** です。同じ構造、同じ継ぎ目、同じ composer、同じ保証。違うのは出自だけです。プラグインが住むリポジトリは誰か、誰がレビューしたか。

新しいリポジトリは `aidlc-plugin-create.ts` で始めます。この章はそのあと、より豊かな `test-pro` 参照プラグインを端から端まで歩きます。

## プラグインを書くとき対、平らなステージ / ルール

- **ステージ / エージェント / ルール**（[章 2–6](00-overview.md)）は、みんなが得るフレームワークの永続部分です。
- **プラグイン**は *任意で所有がある* — 自分のリポジトリで出荷し、オプトインスコープ（および / または `when:` 述語）の下でのみ起動し、消費者がインストールへ合成することを選びます。どのプロジェクトも欲しくない領域パック（オペレーションフェーズ全体、コンプライアンスプラグイン、テストプラグイン）に使います。

## 1. ディレクトリ + マニフェスト

プラグインは、宣言マニフェストとコア形の部分木を持つディレクトリ（かつ git リポジトリ）です。

```text
test-pro/
  .aidlc-plugin/plugin.json                          # the manifest
  stages/construction/test-pro-integration.md        # NEW stages
  stages/operation/test-pro-full-suite.md
  contributions/construction/nfr-requirements.md      # MODIFY existing core stages (§3)
  contributions/construction/nfr-design.md
  contributions/construction/build-and-test.md
  contributions/operation/performance-validation.md
  sensors/aidlc-coverage-threshold.md                 # NEW sensor manifests
  sensors/aidlc-requirement-coverage.md
  tools/aidlc-sensor-coverage-threshold.ts            # the sensor scripts
  tools/aidlc-sensor-requirement-coverage.ts
  tools/test-pro-doctor.ts                             # optional /aidlc --doctor checks
  scopes/test-pro-validation.md                       # NEW plugin scope
  agents/test-pro-metrics-agent.md                    # NEW support persona
  knowledge/test-pro-metrics-agent/methodology.md     # plugin methodology knowledge
  tests/plugin.test.ts                                # plugin content and compose tests
```

`.aidlc-plugin/plugin.json` は **宣言** マニフェストです。トップレベルはよくあるプラグインマニフェストの形を映します（マーケットプレイスやホストツールが列挙 / 版付け / 信頼できるように）。AIDLC 固有の設定は入れ子の `aidlc` ブロックに住みます。

```jsonc
{
  "name": "test-pro",                 // == dir name; "core", "aidlc", and "aidlc-*" are reserved
  "version": "0.1.0",                 // semver; checked by dependents
  "description": "Full-featured testing plugin — unit/branch coverage, functional, integration, regression, edge, and API positive+negative.",
  "author": { "name": "AWS AIDLC" },
  "dependencies": ["core"],           // other plugins, e.g. ["compliance@^1.2.0"]
  "aidlc": {
    "contributes": {                  // which subtrees this plugin ships
      "stages": "stages/",            // NEW stage files
      "overlays": "contributions/",   // CONTRIBUTION files (§3 — modify existing)
      "agents": "agents/",            // NEW personas
      "scopes": "scopes/",            // NEW scope identities
      "knowledge": "knowledge/",      // methodology knowledge for agents
      "sensors": "sensors/",          // sensor manifests
      "tools": "tools/"               // runnable sensor + doctor scripts
    }
  }
}
```

`contributes` は慣習のプラグイン部分木を宣言します。設定可能なルーティングはまだ実装されていないので、ある値は上に示した正確な正準パスを使わなければなりません。VALIDATE、BUILD、TEST は、その中身を黙って省略するのではなく、`"stages": "custom-stages/"` のような代替を落とします。
`tools` は CLI スクリプトをハーネスの `tools/` ディレクトリへ着地させるので、プラグインは **走れるセンサー**（マニフェストは `sensors/`、スクリプトは `tools/`）と任意の doctor 検査を出荷できます。
テストとフィクスチャはプラグインのトップレベル `tests/` ディレクトリに置き、`tools/` の中には決して置かないでください。Compose は `tools/tests/`、`tools/__tests__/`、または `tools/fixtures/` の下のファイル、および同じ場所の `*.test.ts` と `*.spec.ts` ファイルを落とし、`/aidlc --doctor` が面に出す advisory ドロップを記録します。入れたツール木も、古い compose 版が残したペイロードを走査します。それらのレガシーファイルは出自を持たないので、その移行 advisory は、いま合成しているプラグインに帰属せず、入れたパスを指名します。
`overlays` は特別です。正準ディレクトリは `contributions/` で、ファイルは原語の部分木としてコピーされるのではなく、マージが消費します。

`memory` 投影はまだ延期です。`contributes.memory` はまだ宣言しないでください。既定スペースの方法種マージが出荷されるまで、執筆ツールが落とします。

プラグインが使うキーだけを出荷します。`test-pro` は支援エージェント、プラグインスコープ、エージェントごとの方法論ナレッジを出荷します。リードはそれでも `aidlc-quality-agent` を再利用します。

> **番号範囲は無し。** ステージ番号は表示専用なので、プラグインはマニフェストで番号範囲を **主張しません**。§2 を見てください。

## 2. 新しいステージを足す

プラグインステージは普通のステージファイルです（[ステージの構造](01-anatomy-of-a-stage.md)）。追加規則は 2 つです。

- `plugin:` フィールドがあなたのプラグインを指名します。
- `produces:` する成果物はどれも `<plugin>-` 接頭辞でなければなりません（例: `test-pro-integration-test-results`）。

同じ論理プラグイン名が、所有するどのステージ、スコープ、エージェント、寄与にも現れなければなりません。Compose はその身元を出したホストマニフェストから導きます（ホスト層では `aidlc-<name>`、AIDLC frontmatter では `<name>`）。中身はパッケージを改名したりなりすましたりできません。不一致は飛ばされ、`/aidlc --doctor` 向けに記録されます。

`bundle:` は改名前の所有キーで、直しを指名するエラーで落とされます。`plugin:` を書いてください。この語は、将来のプラグイン集合の概念向けに予約されています。

ステージの **身元は slug** です。大事なところ（辺、ジャンプ、解決）ではどこでも。`number:` は **表示のヒント** だけです。ステージのグラフ位置は slug ベースの `requires_stage` 辺から来ます。コンパイル済みの番号値はエンジンが付け、あなたは決して付けません。最初のコンパイルで、プラグインの新しいステージは自分の `requires_stage` 辺で並べられ、独立したステージ同士のタイブレークにだけ書いた `number:` 値を使い、フェーズ内の次の空き索引を与えられます。だから辺と一致して意味よく読める番号を書いてください（`test-pro-integration` は `3.85`、`build-and-test` の `3.6` のあと）。運ぶのは **相対** 順です。絶対値はグラフに決して着地せず、ステージを挿入してもコアを再番号付けせず、範囲は主張しません（だから調整していない 2 プラグインが番号で衝突することはありません）。

`scopes:` でステージをスコープへゲートします（ほかでは SKIP）。任意で `when:` 述語を宣言できます。`test-pro-full-suite` は、上流プロデューサーが計画上にあるときだけ走る *意図* です。

```yaml
scopes:
  - enterprise
when:
  producer-in-plan: test-pro-regression-suite
```

> **`when:` はパースされますが、まだ評価されません。** スキーマは述語を検証し、パーサは読みますが、きょうエンジンの消費者は動きません。`when:` を運ぶステージは、宣言した `scopes:` の下で無条件に EXECUTE です。前方互換のために書いてください。いまの本物の振る舞いは `scopes:` でゲートします。

スコープ所属と `when:` 述語は [スコープ](04-scopes.md) です。

## 3. 既存コアステージを変える（寄与）

これが寄与の継ぎ目です。コアステージを **直さずに** 加算で変えます。寄与は `<plugin>/contributions/<phase>/<slug>.md` に住みます。`test-pro` の `nfr-requirements` への寄与です。

```markdown
---
target: nfr-requirements      # the existing core stage you're enriching
plugin: test-pro
adds:                         # STRUCTURAL — set-unioned into the stage node
  produces:
    - test-pro-testability-requirements   # <plugin>- prefixed
  required_sections:
    - "Testability Requirements"          # machine-enforced
    - "Coverage Targets"
fragments:                    # PROSE — spliced into the stage body
  - anchor: after-step:6
    order: 100
---

## fragment: after-step:6

### Step 6b (test-pro): Capture testability NFRs

…prose the agent will see, appended after the target stage's Step 6…
```

足せるもの（全部加算 — 設計上 **上書きも削除も無し**）。「Status」は、compose フックがきょうマージするもの対、設計済みだが延期（文書 18 §5 / §8 を映す — 実装するか格下げするか。黙った no-op は決してしない）:

- `adds.produces` / `adds.consumes` / `adds.sensors` — ✅ 対象ステージのソース frontmatter へ集合和。
- `adds.required_sections` — ✅ ステージの `required_sections` へマージ。注意: **きょう機械強制ではありません**。フィールドは書かれ検証されますが、コンパイル済みグラフノードへは届かず、同梱の `required-sections` センサーはテンプレートから期待を導くので、欠けた見出しでステージを落とすものはまだありません。いまは宣言の意図として扱ってください。
- `adds.scopes` — ✅ 対象ステージの `scopes:` 一覧へ集合和。ガードレールは 2 つ（各違反はドロップ付きログ、決してマージしない）: スコープの身元ファイルがインストールされていなければならない（`scopes/<name>.md` が同じプラグインで出荷）、そのファイルの `plugin:` frontmatter があなたのプラグインを正確に指名しなければならない — コアステージをコアまたは他プラグインのスコープの下には置けず、所有は名前接頭辞から推論せず、入れたファイルの宣言所有者から読みます。既存コアステージをプラグインのスコープの下へ経路するために使います。例: スコープが自分の発見ステージとコア Inception 以降を運ぶ方法論プラグイン。
- `adds.requires_stage` — ⏳ **延期**: 寄与は宣言できますが、compose はマージせずドロップログへ記録します（まだ DAG 辺ではありません）。振る舞いにゲートするにはまだ頼らないでください。
- `fragments` — ✅ ステージ本文へ継ぎ込む散文ブロック。各フラグメントの散文は、寄与ファイル内の `## fragment: <anchor>` ブロックです。

### フラグメントのアンカー

| アンカー            | フラグメントを入れる場所                                              | Status |
| ------------------ | ------------------------------------------------------------------ | ------ |
| `after-step:<n>`   | `### Step <n>` の直後（次の `###` / `##` の前）            | ✅ |
| `before-step:<n>`  | `### Step <n>` の直前                                  | ✅ |
| `end-of-steps`     | `## Steps` ブロックの末尾                                 | ✅ |
| `in:<Compartment>` | 指名した `## <Compartment>` ブロックの末尾（例: `in:Sensors`） | ✅ |
| `after-questions`  | 質問を生成する手順のあと                                | ⏳ 未実装 — `locateAnchor` にケースが無い。ドロップは "unknown anchor"。`after-step:<n>` を使う |

フラグメントは `(order, plugin)` で決定論的に並びます。同じ `(plugin, anchor, order)` 衝突 — 1 ファイル内でも、この実行の 2 寄与ファイル横断でも — は **ドロップ付きログ** です（last-writer-wins ではない）。*違う* 2 プラグインが同じステージへ寄与するとき、構造追加は集合和し、フラグメントはこの同じ並びでインターリーブします。本当にマージされます。

継いだ各フラグメントは、内容ハッシュを運ぶ番兵コメントで包まれます（`<!-- plugin:<plugin>:<anchor>:<order>:<hash> --> … <!-- /plugin:… -->`）。再合成が冪等で、上げたフラグメントが以前のブロックを置き換える仕方です。Compose は成功して適用した各フラグメントのアンカー、order、ハッシュをプラグイン寄与サイドカーにも記録します。その出自は散文のみのプラグインにもあり、エンジン再導入のあと欠けたマーカーや変わったフラグメント本文を doctor が検出できます。そこから執筆規則が 2 つ続きます。

- **フラグメント散文に番兵そっくりの行を書かない。** 散文内の `<!-- /plugin:… -->` に一致する行はブロック終端と誤認され、アップグレード時の継ぎを壊します。
- **プレリリースビルドからのアップグレード:** このブランチの *レビュービルド*（ハッシュが番兵に足される前）から合成したインストールは、古いハッシュ無しマーカーを運びます。アップグレードはそれを認識せず、二通目を継ぎます。影響するのは PR ブランチのインストールだけです。きれいなベースから再合成するか、古いブロックを一度手で消してください。

### エンジンアップグレードのライフサイクル

エンジン再導入は、在庫の `dist/<harness>/` グラフとコアステージソースを、実効インストールの上へコピーします。プラグイン名前空間のファイルと寄与サイドカーはその重ねを生き延びられますが、グラフ項目と構造または散文寄与のマージは消えます。著者は再合成をアップグレード案内の一部にしてください。エンジン再導入またはアップグレードのあと `/aidlc plugin sync` を走らせる（またはプラグイン compose フックがあるホストで新しいセッションを始める）。合成は冪等なので、変わっていない寄与を複製せず同じ実効面を戻します。`/aidlc --doctor` は壊れた状態を **Composed plugin surface** として報告します。有効プラグインのサイドカーが読めないまたは壊れている、記録した対象ステージがもう無い、記録した構造または散文寄与が無いまたは変わっているとき、検査は fail-close します。消費記録は `artifact`、`required`、任意の `conditional_on` を保ち検証します。古いサイドカーの成果物のみ記録は互換のままです。無効なサイドカーは、すでに合成したステージから安全に再構築できません。在庫エンジンをリフレッシュし、そのサイドカーを外し、それから `plugin sync` を走らせます。

## 4. ほかの原語を包む

`test-pro` はステージ、寄与、センサー、支援エージェント、スコープ、方法論ナレッジを出荷します。より豊かなプラグインはあとで方法 / ルールも足せます。メモリ投影はまだ延期です（文書 18 §9 Status）。

- **エージェント。** `agents/<plugin>-<role>-agent.md` を置き、`plugin:` をセットします。プラグイン接頭辞がコアの `aidlc-` ファイル名接頭辞を置き換え、ファイル名ステムは frontmatter の `name` と一致しなければなりません（例: `agents/test-pro-metrics-agent.md` は `name: test-pro-metrics-agent`）。合成のあと自動で発見され、プラグインのステージは `lead_agent` / `support_agents` として指名できます。違う中身の同じパス衝突は上書きされません。compose はドロップログを記録します。OpenCode 合成はネイティブ `.opencode/agents/` のサブエージェント双子も作り、入れ子の `task` 委譲を拒みます。[エージェントを足す](03-adding-an-agent.md) です。
- **センサー。** マニフェスト `sensors/aidlc-<id>.md` **と** そのスクリプトを `tools/` の下に出荷します（両方 — マニフェストだけは発見できますが、走るにはスクリプトが `tools/` に住まなければなりません）。`sensors/` 先頭の `aidlc-<id>.md` 名は慣習ではなく硬い要求です。センサー発見は `sensors/` を平らに走査し、`aidlc-<id>.md` に一致するベース名だけを索引するので、ほかの名前（またはサブディレクトリに入れ子）のマニフェストは合成されても決して発火しません。Compose はいま、そのようなマニフェストを劣化したドロップ（`--doctor` が面に出す）で落とし、ファイルと要求形を指名します。死んだまま着地させません。センサーを自分のステージへは `sensors:` 経由で、コアステージへは寄与の `adds.sensors` 経由で結んでください。[センサー](06-sensors.md) です。
- **方法 / ルール。** *（⏳ 延期。）* 将来の `contributes.memory` 面は、`memory/phases/<phase>.md` と `memory/{org,team,project}.md` を既定スペースの方法種（`aidlc/spaces/default/memory/`）へマージします。パッケージャと compose フックはその部分木をまだ投影せず、執筆ツールは宣言を落とすので、ビルドが省略しながら成功を報告できません。`rules/` ディレクトリは **出荷しないでください**。そのパスはもう読まれません（ルール層はスペースごとのメモリへ動きました）。[ルールとループ](05-rules-and-the-loop.md) です。
- **ナレッジ。** エージェントごとの **方法論** ナレッジを `knowledge/<agent-slug>/` の下に出荷します。フレームワーク同梱の `<harness>/knowledge/` 木へ投影され、そのエージェントがステージをリードまたは支援するとき載ります。注: **領域 / チームナレッジ**（`aidlc/spaces/<space>/knowledge/`）はブートストラップ時空の利用者実行時状態です。プラグインは出荷しません。[チームナレッジ](07-team-knowledge.md) です。
- **スコープ。** スコープの **身元** は `scopes/<plugin>-<name>.md` の下に出荷するファイル 1 つです。プラグイン接頭辞がコアの `aidlc-` ファイル名接頭辞を置き換え、ファイル名ステムは frontmatter の `name` と一致しなければなりません（例: `scopes/test-pro-validation.md` は `name: test-pro-validation`）。コアの `classic` 既定が無効なときのフォールバックとしてプラグインスコープを指名するには `freeform_default: true` をセットします。選んだコア / プラグイン集合を横断して請求してよい有効スコープは最大 1 つで、グラフコンパイルは曖昧な集合を落とします。プラグインが書いたステージの所属は `scopes:` frontmatter 一覧です。寄与の `adds.scopes`（§3）は既存コアステージへあなたのスコープを足します。[スコープ](04-scopes.md) です。

### doctor 検査を出荷する

プラグインにインストール前提や、`/aidlc --doctor` が検証すべき合成ファイルがあるとき、`tools/<plugin>-doctor.ts` を足します。スクリプトは任意で、プラグインが有効なあいだだけ走ります。`AIDLC_PROJECT_DIR`、`AIDLC_HARNESS_DIR`、`AIDLC_PLUGIN_NAME` を受け取り、ほかの stdout 無しで JSON 契約を印字しなければなりません。

Doctor 発見は、所有するステージとスコープのメタデータから入れたプラグイン身元を導きます。だから doctor スクリプトが発見できるには、プラグインがステージまたはスコープを少なくとも 1 つ所有しなければなりません。ツール、センサー、ナレッジのみのプラグインだけでは足りません。

```typescript
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(
  process.env.AIDLC_PROJECT_DIR ?? process.cwd(),
  process.env.AIDLC_HARNESS_DIR ?? ".claude",
);

console.log(JSON.stringify({
  checks: [{
    pass: existsSync(join(root, "tools", "my-plugin-helper.ts")),
    label: "my-plugin helper installed",
    fix: "Run `bun <harness-dir>/tools/aidlc-utility.ts plugin-sync` or re-run hooks/compose.ts.",
    severity: "error",
  }],
}));
```

既定の `error` 振る舞いには `severity` を省略します。doctor を落としてはいけない見える所見には `advisory` を使います。スクリプトは読み取り専用、依存無しに保ってください。doctor は実行時 / 出力を有界にし、スクリプト失敗を診断行に変えます。

## 5. 配布 + 導入

同梱のビルダーは、プラグインをハーネスごとに **本物のホストプラグイン** として出します。`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`、Copilot の `.plugin/plugin.json`、Kiro のフォルダ投影を含みます。

```bash
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> <harness> [outDir]
```

既定出力は `<plugin-root>/dist/<harness>/` です。公開するハーネスごとに一度走らせます。リポジトリパッケージャは同じエミッタを使い、ファーストパーティの `dist/plugins/<name>/<harness>/` 木をビルドするので、バイト一致ガードは外部ビルドも守ります。semver タグと `marketplace.json` 付きの git リポジトリへ出力を公開します。チームはそのあとホストのネイティブコマンドで入れます。

### Claude / Codex（ホストストア）

```bash
# teams run these in their host CLI:
/plugin marketplace add <your-org>/<your-plugin-repo>    # Claude
/plugin install test-pro@<marketplace>                   # Claude

codex plugin marketplace add <your-org>/<your-plugin-repo>   # Codex
codex plugin add test-pro@<marketplace>                      # Codex
```

**SessionStart フック**（出したプラグインに同梱）は、注入した現行ルート向けに `aidlc engine plugin sync` と同じトランザクション同期実装を呼びます。プラグインの部分木と寄与をマージし、結果を検証し、ステージグラフ + スコープグリッドをコンパイルし、版 / ソースハッシュの合成スタンプを書きます。オーケストレータは全部そのコンパイル済みグラフから経路するので、プラグインステージは合成された瞬間に走ります。直す散文もスキルファイルも無し。

Sync は合成中に生きているプロジェクトを決して直しません。関係するハーネス、`.agents`、`aidlc` 面をステージングへコピーし、そこで合成と再生成をし、`plugin-compose-<key>.json` とハッシュ証明の `plugin-owned-<key>.json` を書き、共有トランザクションエンジン経由でステージした差分をコミットします。障害はファイル、モード、スタンプ、所有記録を全部戻します。`--prune-missing` は意図してより厳しいです。証明済みのホスト目録全体、明示確認（自動化では `--yes`）、変わっていない所有ハッシュを要求します。ローカルまたは所有していないバイトは拒みます。

### プロジェクト選択

合成はプラグインのバイトを入れます。選択は、入れたどのステージ、スコープ、ランナー、寄与がアクティブかを制御します。

```bash
aidlc engine plugin select aidlc,test-pro
aidlc engine plugin list
aidlc engine plugin sync
```

`plugin select` は無効寄与の除去、グラフ / グリッドコンパイル、ランナー、生成表をステージしてから、プロジェクトトランザクション 1 つでコミットします。再有効にした寄与は次の SessionStart sync で戻ります。アクティブなワークフローが要るプラグインの無効化は拒みます。`PLUGIN_SELECTION_CHANGED` 監査追記はコミット済み検証の一部なので、監査失敗は選択全体を巻き戻します。`plugin list` は違います。ホスト目録を合成 / 所有スタンプと比べ、選択は変えません。

### Kiro（ストア無し — フォルダドロップ、それから composer を明示して走らせる）

```bash
# From the AIDLC source root, materialize the ignored local plugin projections:
bun scripts/package.ts
# Then copy the Kiro projection into the project:
cp -r dist/plugins/<name>/kiro/. <project>/
# preferred when aidlc is on PATH:
AIDLC_PLUGIN_ROOT="<plugin-root>" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro aidlc engine plugin sync

# fallback: run the composer explicitly:
AIDLC_PLUGIN_ROOT="<plugin-root>" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro bun "<plugin-root>/hooks/compose.ts"
# open in Kiro IDE or kiro-cli chat → /aidlc
```

> **Kiro の注。** Kiro IDE >= 1.0 には `kiro-ide` 投影を使ってください。フォルダドロップは、ワークスペースルートからクロスプラットフォームの `hooks/aidlc-plugin-compose.ts` Bun ランチャを走る v2 `.kiro/hooks/aidlc-<plugin>-compose.json` SessionStart 登録を含みます。Kiro CLI 向けの `kiro` 投影はフック登録を出さないので、上の明示 composer コマンドの一つを走らせます。どちらの投影も引退した `.kiro.hook` プラグイン登録は出しません。

### 信頼

信頼は **ホストネイティブ** です。何も作りません。
- Claude: 組織管理者が `strictKnownMarketplaces` をセット（管理、上書き不可）。
- Codex: プラグインごとの一度きりの信頼プロンプト、内容ハッシュピン。
- Kiro: 該当なし（フォルダドロップ、ホストゲート無し）。

> **具体例** — `plugin.json`、`marketplace.json`、`managed-settings.json`（組織の信頼設定）、`aidlc.lock.json` — は [`examples/test-pro/`](../reference/examples/test-pro/) です。プラットフォームチームの通し例全体は [Plugin Mechanism §9](../reference/18-plugin-mechanism.md) も見てください。

## プラグインの執筆とテスト

同梱の足場から始め、いちばん安価なものからいちばん現実的なものまで、テスト層を 3 つ使います。

### プラグインを作る

決定論的な最小プラグインリポジトリを作ります。

```bash
bun <tools-dir>/aidlc-plugin-create.ts <name> [targetDir]
bun <tools-dir>/aidlc-plugin-create.ts <name> [targetDir] --json
```

名前は小文字の kebab-case で、対象ディレクトリ名と一致し、`core`、`aidlc`、または予約の `aidlc-` 接頭辞であってはいけません。`targetDir` 無しでは出力は `./<name>/` に着地します。CREATE は空でない対象を拒み、既存ファイルを決して上書きしません。

足場はスキーマ妥当なマニフェスト、名前空間付きの例ステージ、スコープ、エージェント、執筆の流れ全体のルート README、`tests/` README を含みます。意図して `hooks/compose.ts` を省略します。検証は文書化した不在警告を報告し、BUILD は同梱の現行フックを注入します。

### プラグインを検証する

ビルドまたは合成の前に、同梱のバリデータをプラグインリポジトリルートに対して走らせます。

```bash
bun <tools-dir>/aidlc-plugin-validate.ts <plugin-root>
bun <tools-dir>/aidlc-plugin-validate.ts <plugin-root> --json
```

ツールはオフラインでスタンドアロンです。`<plugin-root>` は `.aidlc-plugin/plugin.json` を含むディレクトリです。AIDLC プロジェクトもフレームワークのチェックアウトも要りません。終了 `0` は妥当、`1` は執筆所見、`2` は無効なコマンド用法です。JSON 出力は `{valid, errors, warnings}` で、安定したファイル範囲の所見です。

検証が検査すること:

- マニフェストが存在し、文書化した身元、SemVer、`aidlc.contributes` 形を持つこと
- どのステージもパースし、同梱のステージスキーマを通り、slug、ファイル名、プラグイン所有が一致すること
- スコープが `<plugin>-<name>.md` を使い、frontmatter 身元と一致し、対応する深度を宣言し、宣言キーワードを空でないブロックまたはフロー一覧としてパースすること
- エージェントが `<plugin>-<role>-agent.md` を使い、frontmatter 身元と一致すること
- 2 つのプラグインステージが、誰も消費しなくても、`produces` と `optional_produces` を横断して同じ成果物を出さないこと
- 出した成果物がプラグイン名接頭辞を使い、ステージ本文が空でなく、ステージエージェント参照が同梱コア + プラグイン名簿に対して解決し、寄与対象が同梱コアステージ slug へ解決すること
- 書いたプラグイン中身が普通のファイルとディレクトリを使うこと。ステージ、スコープ、エージェント、寄与、センサー、ナレッジ、ツール、フックの下のシンボリックリンクは、黙って省略または追跡されず落とされます
- `tools/` に、合成がインストールへコピーする入れ子の `tests/`、`fixtures/`、`*.test.ts` ペイロードが無いこと
- 同梱の `hooks/compose.ts` があるとき、バリデータに同梱のテンプレートとバイト一致であること。不在は妥当です。プラグインビルドが現行テンプレートを注入するからです。

利用者が見る `aidlc plugin validate` と `aidlc plugin build` 動詞は、これらの同じ同梱ツールへ委譲します。`aidlc plugin create` と `aidlc plugin test` は [RFC #723 §2e](https://github.com/awslabs/aidlc-workflows/issues/723) へ延期のままです。同梱の Bun ツールを直接起動してください。

リポジトリのテストヘルパーの `validatePluginContent()` はこれらの共有規則を同じツールへ委譲し、チェックアウトを意識したフィクスチャ統合を残します。

### プラグインをビルドする

検証したプラグイン 1 つを、ホストネイティブプラグイン 1 つへ投影します。

```bash
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> claude
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> codex ./release/codex
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> cursor --json
```

ビルダーは何かを書く前に検証をプロセス内で走ります。エラーは終了 `1` でビルドを拒みます。警告は進みます。無効なコマンド用法と未知のハーネス名は終了 `2` です。`outDir` 無しでは出力は `<plugin-root>/dist/<harness>/` に着地します。BUILD は、出力パス、既存出力部分木の中、信頼したビルド境界と出力のあいだのシンボリックリンクも落とします。既定出力ではその境界はプラグインルートなので、リンクした `<plugin-root>/dist` は拒まれます。境界より上の環境エイリアスは、ほかは所有する出力を無効にしません。

執筆の流れは:

1. **Create** — `aidlc-plugin-create.ts` で決定論的な足場。
2. **Author** — プラグイン所有のステージ、スコープ、エージェント、ほかの寄与を書く。
3. **Validate** — 書いたルートをオフライン検証。
4. **Build** — 支える各ハーネス投影。
5. **Test** — 本物のインストールの使い捨てのコピーに対して合成をテスト。
6. **Publish** — それらの生成ディレクトリとマーケットプレイスメタデータを自分のリポジトリから公開。

4 ツールともコピーした AIDLC ツール束から走り、AIDLC プロジェクトもフレームワークのチェックアウトも要りません。

### 合成をテストする

そのインストールを変えずに、「このプラグインは自分のインストールへきれいに合成するか？」に答えます。

```bash
bun <tools-dir>/aidlc-plugin-test.ts <plugin-root> \
  --install <project-root> [--harness <name>] [--json]
```

ツールは先に検証とビルドをし、選んだインストール面を一時候補へコピーし、本物の出した `hooks/compose.ts` を走らせ、候補グラフを再コンパイルし、プラグインステージとスコープがあることを検証し、冪等を証明するために compose を二度目走らせます。compose ドロップ、グラフ失敗、欠けたプラグインノード、二通目のファイル変更はどれも終了 `1` です。生きているインストールは前後でハッシュされ、compose 対象には決してなりません。

インストールが曖昧なとき `--harness` を渡します。`.kiro`（Kiro CLI 対 Kiro IDE）と `.aidlc`（Copilot 対 OpenCode）を含みます。`--dist <version>` は RFC #722 マイルストーン 2 がリリース実行時束チャネルを定義するまで予約です。

1. **中身検証** はいつもオンの基準です。書いたプラグインルートに対して `aidlc-plugin-validate.ts` を走らせます。速く、正確な執筆所見を出しますが、パッケージまたは合成が成功することは証明しません。
2. **Compose 統合** は既定の CI 検査です。本物のインストールに対して `aidlc-plugin-test.ts` を走らせます。このリポジトリ内では、`composePluginFixture()` はフックサブプロセス / ドロップリーダーを同じ同梱実装へ委譲し、テスト専用フィクスチャ API を残します。この層は決定論的で、実際のビルダーと composer を行使しますが、モデル付きハーネスは起動しません。
3. **生きたハーネス e2e** は任意の互換証拠です。`liveGateFor()` が返すゲートの後ろでのみ `invokeHarness()` を呼びます。生きたゲートは `AIDLC_CLAUDE_SDK_LIVE`、`AIDLC_KIRO_ACP_LIVE`、`AIDLC_CODEX_EXEC_LIVE`、`AIDLC_COPILOT_EXEC_LIVE`、`AIDLC_OPENCODE_RUN_LIVE`、`AIDLC_CURSOR_RUN_LIVE` です。生きた実行はホストが合成したプラグインを発見し起動できることを証明しますが、入れた CLI、資格情報、より多くの時間が要ります。未セットのゲートは飛ばした結果を返すので、緑のテスト実行は生きた検査が走らなかったことを意味できます。

`plugins/<name>/tests/*.test.ts` の下のプラグインテストは自動で発見され、統合層に加わります。1 プラグインのテストを走らせるには:

```bash
bash tests/run-tests.sh --integration --filter "plugin-<name>"
```

このリポジトリ内では、この中身テストがコピーできる最小の形です。ヘルパーは共有規則を同梱ツールへ委譲します。

```ts
import { expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePluginContent } from "../../../tests/harness/plugin-kit.ts";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

test("plugin content is valid", () => {
  expect(validatePluginContent(pluginRoot)).toEqual([]);
});
```

プラグインがステージ、寄与、エージェント、スコープ、センサー、またはツールを出荷するとき、決定論的な compose テストを足します。

```ts
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { composePluginFixture } from "../../../tests/harness/plugin-kit.ts";

test("plugin composes into a Claude install", () => {
  const fixture = composePluginFixture({
    plugin: "your-plugin",
    harness: "claude",
  });
  const graph = JSON.parse(
    readFileSync(
      join(fixture.projectDir, ".claude", "tools", "data", "stage-graph.json"),
      "utf-8",
    ),
  ) as Array<{ slug?: string }>;
  expect(graph.some((stage) => stage.slug === "your-plugin-stage")).toBe(true);
});
```

## 道の規則

- **番号は表示専用。** 意味のよい `number:` を書く。範囲は主張しない。ステージを挿入してもコアを再番号付けしない。
- **成果物の名前空間。** 出す成果物はどれも `<plugin>-` 接頭辞。コア成果物やほかのプラグインと衝突してはいけない。
- **原語名は一意。** スコープ / エージェント / センサーはコアやほかのプラグインと衝突してはいけない。衝突は帰属付きの compose エラー。（方法ファイルはファイル単位でメモリ種へ加算マージします。）
- **依存** *（⏳ 延期。）* `dependencies` は `name@^x.y.z` 制約を依存の `version` に対して解決し、サイクルを落とすよう設計されていますが、**まだフィールドを読むものはありません**。宣言してもきょう効果はありません（文書 18 §9 Status）。
- **加算のみ。** 寄与は足します。コアステージのフィールド、エージェント、散文を上書きまたは削除できません。（上流の振る舞いを本当に *変える* 必要があるのは、プラグインの関心ではなくフレームワークの設計判断です。）

## 関連

- [Plugin Mechanism](../reference/18-plugin-mechanism.md) — 規範の設計: マニフェスト、合成模型、寄与の継ぎ目、導入時の理屈、ハイブリッド配布模型、マルチテナントのガード、現状（全部この一章に集約）。
- [ステージの構造](01-anatomy-of-a-stage.md)、[スコープ](04-scopes.md)、[センサー](06-sensors.md) — プラグインが合成する構成要素。
