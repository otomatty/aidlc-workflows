# プラグインを書く

> [Harness Engineer Guide](00-overview.md) の一部。前提: [ステージの構造](01-anatomy-of-a-stage.md)。設計参照（仕組み、インストール時の根拠、ハイブリッド配布模型、as-built の状態）: [Plugin Mechanism](../reference/18-plugin-mechanism.md)。

**AIDLC プラグイン**（**プラグイン**）は、再利用できる任意の AIDLC 寄与の集合です。新しいステージ、エージェント、スコープ、方法 / ルール（メモリ層）、センサー、方法論ナレッジ、既存コアステージへの加算変更。自分のディレクトリに包み、自分のリポジトリから公開し、利用者が選んだプラグイン集合の上へ **compose** します。プラグインは `core/` を決して直しません。どのプラグインも無効なら、インストールは裸のコアとバイト一致です。

ファーストパーティプラグイン（AIDLC チームが出荷）とサードパーティプラグイン（ほかの誰でも）は **機械的に同一** です。同じ構造、同じ継ぎ目、同じ composer、同じ保証。違うのは出自だけです。プラグインが住むリポジトリは誰か、誰がレビューしたか。

新しいリポジトリは `aidlc-plugin-create.ts` で始めます。この章はそのあと、より豊かな参照プラグイン `test-pro` を端から端まで歩きます。

## プラグインを書くときと、素のステージ / ルールを書くとき

- **ステージ / エージェント / ルール**（[2–6 章](00-overview.md)）は、誰もが得るフレームワークの永続部分です。
- **プラグイン** は _任意で、所有がある_ ものです。自分のリポジトリで出荷し、オプトインのスコープ（および / または `when:` 述語）の下でのみ起動し、消費者がインストールへ compose することを選びます。どのプロジェクトも欲しいわけではない領域パック（運用フェーズ全体、コンプライアンスプラグイン、テストプラグイン）に使います。

## 1. ディレクトリとマニフェスト

プラグインはディレクトリ（かつ git リポジトリ）で、宣言マニフェストとコア形の部分木を持ちます。

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

`.aidlc-plugin/plugin.json` は **宣言** マニフェストです。トップレベルはよくあるプラグインマニフェストの形を映します（マーケットプレイスやホスト道具が一覧 / 版付け / 信頼できるように）。AIDLC 固有の設定は入れ子の `aidlc` ブロックにあります。

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

`contributes` は約束どおりのプラグイン部分木を宣言します。設定可能なルーティングはまだ実装されていないので、存在する値は上に示した正規パスそのものでなければなりません。VALIDATE、BUILD、TEST は `"stages": "custom-stages/"` のような代替を、中身を黙って省くのではなく拒否します。
`tools` は CLI スクリプトをハーネスの `tools/` ディレクトリに着地させます。プラグインが **走れるセンサー**（マニフェストは `sensors/`、スクリプトは `tools/`）と任意の doctor 検査を出荷できるようにです。
テストとフィクスチャはプラグインのトップレベル `tests/` に置いてください。`tools/` の中には決して置きません。compose は `tools/tests/`、`tools/__tests__/`、`tools/fixtures/` の下のファイル、同じ場所の `*.test.ts` と `*.spec.ts` を落とし、`/aidlc --doctor` が出す advisory drop を記録します。インストール済みツール木も、古い compose 版が残したペイロードを走査します。それらのレガシーファイルは出自を持たないので、その移行 advisory はいま compose しているプラグインに帰属させず、インストール済みパスを指名します。
`overlays` は特別です。正規ディレクトリは `contributions/` で、ファイルは原語の部分木としてコピーされず、マージが消費します。

`memory` 投影はまだ先送りです。`contributes.memory` はまだ宣言しないでください。既定スペースの方法種まきマージが出荷されるまで、執筆ツールが拒否します。

プラグインが使うキーだけ出荷してください。`test-pro` は支援エージェント、プラグインスコープ、エージェントごとの方法論ナレッジを出荷します。リードはいまも `aidlc-quality-agent` を再利用します。

> **番号範囲はありません。** ステージ番号は表示専用なので、プラグインはマニフェストで番号範囲を **主張しません**。§2 を見てください。

## 2. 新しいステージを足す

プラグインのステージは普通のステージファイルです（[ステージの構造](01-anatomy-of-a-stage.md)）。追加規則は 2 つです。

- `plugin:` フィールドがあなたのプラグインを指名します。
- `produces:` するどの成果物も `<plugin>-` 接頭辞が要ります（例: `test-pro-integration-test-results`）。

同じ論理プラグイン名が、所有するどのステージ、スコープ、エージェント、寄与にも現れなければなりません。compose はその身元を、出したホストマニフェストから導きます（ホスト層では `aidlc-<name>`、AIDLC frontmatter では `<name>`）。中身はパッケージを改名したり成りすましたりできません。不一致は飛ばされ、`/aidlc --doctor` 向けに記録されます。

`bundle:` は改名前の所有キーで、直し方を指名するエラーで拒否されます。`plugin:` を書いてください。この語は、将来のプラグイン集合の概念用に予約されています。

ステージの **身元は slug** です。効くところ全部（辺、ジャンプ、解決）。`number:` は **表示のヒント** だけです。ステージのグラフ位置は slug ベースの `requires_stage` 辺から来ます。コンパイル済みの番号値は *あなたではなく* エンジンが割り当てます。最初のコンパイルで、プラグインの新しいステージは自分の `requires_stage` 辺で並び、独立ステージ同士のタイブレークにだけ書いた `number:` を使い、フェーズ内の次の空き番号を与えられます。だから、辺と一致して読みやすい番号を書いてください（`test-pro-integration` は `3.85`、`build-and-test` の `3.6` のあと）。運ぶのは *相対* 順です。絶対値はグラフに着地せず、ステージを挿入してもコアは再番号せず、範囲も主張しません（調整していない 2 プラグインが番号で衝突できない理由です）。

ステージをスコープに載せるのは `scopes:` です（ほかでは SKIP）。任意で `when:` 述語も宣言できます。`test-pro-full-suite` は、上流プロデューサーが計画に乗っているときだけ走る *意図* です。

```yaml
scopes:
  - enterprise
when:
  producer-in-plan: test-pro-regression-suite
```

> **`when:` はパースされますが、まだ評価されません。** スキーマは述語を検証し、パーサは読みますが、いまエンジンの消費者は動きません。`when:` を持つステージは、宣言した `scopes:` の下で無条件に EXECUTE です。前方互換のために書いてください。いまの本物の振る舞いは `scopes:` でゲートしてください。

スコープ所属と `when:` 述語は [スコープ](04-scopes.md) です。

## 3. 既存コアステージを変える（寄与）

これが寄与の継ぎ目です。コアステージを **直さずに** 加算で変えます。寄与は `<plugin>/contributions/<phase>/<slug>.md` にあります。`test-pro` の `nfr-requirements` への寄与です。

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

足せるもの（全部加算 — **上書きも削除もなし**、設計どおり）。「Status」は、compose フックがいまマージするもの対、設計済みだが先送り（文書 18 §5 / §8 を映す。実装するか格下げするか。黙った no-op はしない）です。

- `adds.produces` / `adds.consumes` / `adds.sensors` — ✅ 対象ステージのソース frontmatter へ集合和。
- `adds.required_sections` — ✅ ステージの `required_sections` へマージ。注意: **いま機械強制ではありません**。フィールドは書かれ検証されますが、コンパイル済みグラフノードには届かず、配布の `required-sections` センサーは期待をテンプレートから導くので、欠けた見出しでステージが落ちるものはまだありません。いまは宣言の意図として扱ってください。
- `adds.scopes` — ✅ 対象ステージの `scopes:` 一覧へ集合和。ガードレールは 2 つ（違反はそれぞれ drop-with-log、マージしない）: スコープの身元ファイルがインストールされていなければならない（同じプラグインが `scopes/<name>.md` を出荷）、そのファイルの `plugin:` frontmatter が *あなたの* プラグインを正確に指名していなければならない。コアや他プラグインのスコープの下にコアステージを置けません。所有は名前接頭辞から推論せず、インストール済みファイルの宣言所有者から読みます。既存コアステージを自分のプラグインスコープの下へルーティングするのに使います。例: 発見ステージを自分で持ち、コアの Inception 以降も運ぶ方法論プラグイン。
- `adds.requires_stage` — ⏳ **先送り**: 寄与は宣言できますが、compose は DAG 辺としてマージせず drops ログへ記録します。振る舞いにゲートする頼みにはまだしないでください。
- `fragments` — ✅ ステージ本文へ継ぎ込む散文ブロック。各フラグメントの散文は、寄与ファイル内の `## fragment: <anchor>` ブロックです。

### フラグメントのアンカー

| アンカー           | フラグメントの挿入位置                                          | Status |
| ------------------ | --------------------------------------------------------------- | ------ |
| `after-step:<n>`   | `### Step <n>` の直後（次の `###` / `##` の前）                 | ✅ |
| `before-step:<n>`  | `### Step <n>` の直前                                           | ✅ |
| `end-of-steps`     | `## Steps` ブロックの末尾                                       | ✅ |
| `in:<Compartment>` | 指名した `## <Compartment>` ブロックの末尾（例: `in:Sensors`） | ✅ |
| `after-questions`  | 質問を生成する手順のあと                                        | ⏳ 未実装 — `locateAnchor` にケースが無い。drops "unknown anchor"。`after-step:<n>` を使う |

フラグメントは `(order, plugin)` で決定論的に並びます。同じ `(plugin, anchor, order)` の衝突（1 ファイル内でも、この実行の 2 寄与ファイル横断でも）は **drop-with-log** です（last-writer-wins ではない）。*違う* 2 プラグインが同じステージへ寄与するとき、構造の追加は集合和、フラグメントはこの同じ並びでインターリーブします。本当にマージされます。

継ぎ込んだ各フラグメントは、内容ハッシュを運ぶ番兵コメントで包まれます（`<!-- plugin:<plugin>:<anchor>:<order>:<hash> --> … <!-- /plugin:… -->`）。再 compose が冪等になり、アップグレードしたフラグメントが以前のブロックを置き換える仕方です。compose は成功して適用した各フラグメントのアンカー、order、ハッシュもプラグイン寄与のサイドカーに記録します。その出自は散文だけのプラグインにもあり、エンジン再インストールのあと欠けたマーカーや変わったフラグメント本文を doctor が検出できます。そこから執筆規則が 2 つあります。

- **フラグメント散文に番兵に見える行を書かない。** 散文中の `<!-- /plugin:… -->` に一致する行はブロック終端と誤認され、アップグレード時の継ぎ込みを壊します。
- **プレリリースビルドからのアップグレード:** このブランチの *レビュービルド*（ハッシュが番兵に足される前）から compose したインストールは、古いハッシュ無しマーカーを持ちます。アップグレードは認識せず、2 つ目のコピーを継ぎ込みます。影響するのは PR ブランチのインストールだけです。きれいな基線から再 compose するか、古いブロックを一度手で消してください。

### エンジンアップグレードのライフサイクル

エンジン再インストールは、在庫の `dist/<harness>/` グラフとコアステージソースを、実効インストールの上へコピーします。プラグイン名前空間のファイルと寄与サイドカーはその重ねを生き延びられますが、グラフ項目と構造 / 散文寄与のマージは消えます。著者は再 compose をアップグレード手順の一部にしてください。エンジン再インストールまたはアップグレードのあと `/aidlc plugin sync` を走らせる（またはプラグイン compose フック付きホストで新しいセッションを始める）。compose は冪等なので、変わっていない寄与を複製せず、同じ実効面を復元します。`/aidlc --doctor` は壊れた状態を **Composed plugin surface** として報告します。有効プラグインのサイドカーが読めない・壊れている、記録された対象ステージがもう無い、記録された構造または散文寄与が無い・変わっているとき、検査は fail-close します。consume 記録は `artifact`、`required`、任意の `conditional_on` を保ち検証します。古いサイドカーの成果物だけの記録は互換のままです。無効なサイドカーは、すでに compose されたステージから安全に再構成できません。在庫エンジンを刷新し、そのサイドカーを外し、それから `plugin sync` を走らせてください。

## 4. ほかの原語をパッケージする

`test-pro` はステージ、寄与、センサー、支援エージェント、スコープ、方法論ナレッジを出荷します。より豊かなプラグインは、あとから方法 / ルールも足せます。memory 投影はまだ先送りです（文書 18 §8 Status）。

- **エージェント。** `agents/<plugin>-<role>-agent.md` を置き、`plugin:` をセットします。プラグイン接頭辞がコアの `aidlc-` ファイル名接頭辞の代わりで、ファイル名ステムは frontmatter の `name` と一致しなければなりません（例: `agents/test-pro-metrics-agent.md` は `name: test-pro-metrics-agent`）。compose のあと自動発見され、プラグインのステージは `lead_agent` / `support_agents` に指名できます。同じパスで中身が違う衝突は上書きされません。compose は drop ログを記録します。OpenCode の compose はネイティブの `.opencode/agents/` サブエージェント双子も作り、入れ子の `task` 委譲を拒否します。[エージェントを足す](03-adding-an-agent.md) を見てください。
- **センサー。** マニフェスト `sensors/aidlc-<id>.md` **と** そのスクリプトを `tools/` の下に出荷します（両方。マニフェストだけでも発見できますが、走るにはスクリプトが `tools/` になければなりません）。`sensors/` 直下の `aidlc-<id>.md` 名は約束ではなく硬い必須です。センサー発見は `sensors/` を平坦に走査し、`aidlc-<id>.md` に一致するベース名だけ索引します。ほかの名前（またはサブディレクトリに入れ子）のマニフェストは compose されても発火しません。compose はいま、そのようなマニフェストを劣化した drop で拒否します（`--doctor` が出す）。ファイルと必須の形を指名し、死んだまま着地させません。センサーを自分のステージへ結ぶのは `sensors:`、コアステージへは寄与の `adds.sensors` です。[センサー](06-sensors.md) を見てください。
- **方法 / ルール。** *（⏳ 先送り。）* 将来の `contributes.memory` 面が、`memory/phases/<phase>.md` と `memory/{org,team,project}.md` を既定スペースの方法種まき（`aidlc/spaces/default/memory/`）へマージします。パッケージャと compose フックはその部分木をまだ投影せず、執筆ツールは宣言を拒否するので、省略しながらビルド成功と報告できません。`rules/` ディレクトリは **出荷しないでください**。そのパスはもう読まれません（ルール層はスペースごとのメモリへ移りました）。[ルールとラーニングループ](05-rules-and-the-loop.md) を見てください。
- **ナレッジ。** エージェントごとの **方法論** ナレッジを `knowledge/<agent-slug>/` の下に出荷します。フレームワーク同梱の `<harness>/knowledge/` 木へ投影され、そのエージェントがステージをリードまたは支援するときに載ります。注: **領域 / チームナレッジ**（`aidlc/spaces/<space>/knowledge/`）はブートストラップ時に空の利用者ランタイム状態です。プラグインは出荷しません。[チームナレッジ](07-team-knowledge.md) を見てください。
- **スコープ。** スコープの **身元** は、`scopes/<plugin>-<name>.md` の下に出荷するファイル 1 本です。プラグイン接頭辞がコアの `aidlc-` ファイル名接頭辞の代わりで、ファイル名ステムは frontmatter の `name` と一致しなければなりません（例: `scopes/test-pro-validation.md` は `name: test-pro-validation`）。コアの `classic` 既定が無効なときのフォールバックとしてプラグインスコープを指名するには `freeform_default: true` をセットします。選ばれたコア / プラグイン集合を横断して主張してよい有効スコープは高々 1 つで、曖昧な集合はグラフコンパイルが拒否します。プラグインが書いたステージの所属は `scopes:` frontmatter 一覧です。寄与の `adds.scopes`（§3）が *あなたの* スコープを既存コアステージに足します。[スコープ](04-scopes.md) を見てください。

### doctor 検査を出荷する

プラグインにインストール前提や、`/aidlc --doctor` が検証すべき compose 済みファイルがあるとき、`tools/<plugin>-doctor.ts` を足します。スクリプトは任意で、プラグインが有効なあいだだけ走ります。`AIDLC_PROJECT_DIR`、`AIDLC_HARNESS_DIR`、`AIDLC_PLUGIN_NAME` を受け取り、ほかの stdout なしで JSON 契約を印刷しなければなりません。

doctor 発見は、所有するステージとスコープのメタデータからインストール済みプラグイン身元を導きます。だから doctor スクリプトが発見されるには、プラグインがステージまたはスコープを少なくとも 1 つ所有していなければなりません。tools、センサー、ナレッジだけのプラグインでは足りません。

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

既定の `error` 振る舞いなら `severity` は省略します。doctor を失敗させてはいけない見える所見には `advisory` です。スクリプトは読み取り専用、依存なしに保ってください。doctor は実行時間 / 出力を上限し、スクリプト失敗を診断行にします。

## 5. 配布とインストール

同梱のビルダは、プラグインをハーネスごとに **本物のホストプラグイン** として出します。`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json`、Copilot の `.plugin/plugin.json`、Kiro のフォルダ投影を含みます。

```bash
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> <harness> [outDir]
```

既定の出力は `<plugin-root>/dist/<harness>/` です。公開するハーネスごとに一度走らせます。リポジトリのパッケージャは同じエミッタを使い、ファーストパーティの `dist/plugins/<name>/<harness>/` 木をビルドするので、そのバイト一致ガードは外部ビルドも守ります。出力を semver タグと `marketplace.json` 付きの git リポジトリへ公開します。チームはホストのネイティブコマンドでインストールします。

### Claude / Codex（ホストストア）

```bash
# teams run these in their host CLI:
/plugin marketplace add <your-org>/<your-plugin-repo>    # Claude
/plugin install test-pro@<marketplace>                   # Claude

codex plugin marketplace add <your-org>/<your-plugin-repo>   # Codex
codex plugin add test-pro@<marketplace>                      # Codex
```

**SessionStart フック**（出したプラグインに同梱）が自動 compose します。選んだ全プラグインの部分木と寄与をマージし、マージ集合を検証し、ステージグラフ + スコープ格子をコンパイルし、結果を投影します。オーケストレータは完全にそのコンパイル済みグラフからルーティングするので、プラグインステージは compose された瞬間に走ります。直す散文もスキルファイルもありません。

### Kiro（ストアなし — フォルダドロップ、それから composer を明示実行）

```bash
# git pull your plugin repo, copy the Kiro projection into the project:
cp -r dist/plugins/<name>/kiro/. <project>/
# preferred when aidlc is on PATH:
AIDLC_PLUGIN_ROOT="<plugin-root>" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro aidlc plugin sync

# fallback: run the composer explicitly:
AIDLC_PLUGIN_ROOT="<plugin-root>" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro bun "<plugin-root>/hooks/compose.ts"
# open in Kiro IDE or kiro-cli chat → /aidlc
```

> **Kiro の注記。** Kiro IDE >= 1.0 には `kiro-ide` 投影を使います。フォルダドロップに、ワークスペースルートからクロスプラットフォームの `hooks/aidlc-plugin-compose.ts` Bun ランチャを走らせる v2 `.kiro/hooks/aidlc-<plugin>-compose.json` SessionStart 登録が含まれます。Kiro CLI 向けの `kiro` 投影はフック登録を出さないので、上の明示 composer コマンドのどれかを走らせます。どちらの投影も、引退した `.kiro.hook` プラグイン登録は出しません。

### 信頼

信頼は **ホストネイティブ** です。何もビルドしません。
- Claude: org 管理者が `strictKnownMarketplaces` をセット（管理され、上書き不可）。
- Codex: プラグインごとに一度の信頼プロンプト、内容ハッシュでピン。
- Kiro: 該当なし（フォルダドロップ、ホストの門なし）。

> **具体例** — `plugin.json`、`marketplace.json`、`managed-settings.json`（org 信頼設定）、`aidlc.lock.json` — は [`examples/test-pro/`](../reference/examples/test-pro/) にあります。プラットフォームチームの通し実例の全体は [Plugin Mechanism §8](../reference/18-plugin-mechanism.md) も見てください。

## プラグインの執筆とテスト

同梱の足場から始め、いちばん安価からいちばん現実に近い 3 層のテストを使います。

### プラグインを作る

決定論的な最小プラグインリポジトリを作ります。

```bash
bun <tools-dir>/aidlc-plugin-create.ts <name> [targetDir]
bun <tools-dir>/aidlc-plugin-create.ts <name> [targetDir] --json
```

名前は小文字 kebab-case で、対象ディレクトリ名と一致し、`core`、`aidlc`、予約の `aidlc-` 接頭辞は使えません。`targetDir` が無いと、出力は `./<name>/` に着地します。CREATE は空でない対象を拒否し、既存ファイルを上書きしません。

足場には、スキーマ妥当なマニフェスト、名前空間付きの例ステージ・スコープ・エージェント、執筆流れ全体のルート README、`tests/` README が含まれます。意図して `hooks/compose.ts` は省きます。検証は文書化された不在警告を報告し、BUILD が同梱の現行フックを注入します。

### プラグインを検証する

ビルドや compose の前に、同梱の検証器をプラグインリポジトリルートに対して走らせます。

```bash
bun <tools-dir>/aidlc-plugin-validate.ts <plugin-root>
bun <tools-dir>/aidlc-plugin-validate.ts <plugin-root> --json
```

ツールはオフラインで独立です。`<plugin-root>` は `.aidlc-plugin/plugin.json` を含むディレクトリです。AIDLC プロジェクトもフレームワークのチェックアウトも要りません。終了 `0` は妥当、`1` は執筆所見、`2` は無効なコマンド用法です。JSON 出力は `{valid, errors, warnings}` で、安定したファイル範囲の所見です。

検証が見ること:

- マニフェストが存在し、文書化された身元、SemVer、`aidlc.contributes` の形を持つ
- どのステージもパースし、同梱のステージスキーマを通り、slug、ファイル名、プラグイン所有が一致する
- スコープは `<plugin>-<name>.md` を使い、frontmatter の身元と一致し、支える depth を宣言し、宣言した keywords を空でないブロックまたはフロー一覧としてパースする
- エージェントは `<plugin>-<role>-agent.md` を使い、frontmatter の身元と一致する
- 2 つのプラグインステージが、消費するステージが無くても、`produces` と `optional_produces` を横断して同じ成果物を出さない
- 出した成果物はプラグイン名接頭辞を使い、ステージ本文は空でなく、ステージのエージェント参照は同梱コア + プラグイン名簿に対して解決し、寄与の対象は同梱コアのステージ slug に解決する
- 書いたプラグイン中身は普通のファイルとディレクトリを使う。ステージ、スコープ、エージェント、寄与、センサー、ナレッジ、ツール、フックの下のシンボリックリンクは、黙って省かれたり辿られたりせず拒否される
- `tools/` に、compose がインストールへコピーする入れ子の `tests/`、`fixtures/`、`*.test.ts` ペイロードが無い
- vendored の `hooks/compose.ts` があるとき、検証器に同梱のテンプレートとバイト一致。不在は妥当です。プラグインビルドが現行テンプレートを注入するからです

利用者向けの `aidlc plugin validate` と `aidlc plugin build` 動詞は、同じ同梱ツールへ委譲します。`aidlc plugin create` と `aidlc plugin test` は [RFC #723 §2e](https://github.com/awslabs/aidlc-workflows/issues/723) まで先送りです。同梱の Bun ツールを直接呼んでください。

リポジトリのテストヘルパの `validatePluginContent()` は、これらの共有規則を同じツールへ委譲し、チェックアウトを意識したフィクスチャ統合は残します。

### プラグインをビルドする

検証済みプラグイン 1 つを、ホストネイティブプラグイン 1 つへ投影します。

```bash
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> claude
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> codex ./release/codex
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> cursor --json
```

ビルダは何かを書く前に、プロセス内で検証を走らせます。エラーは終了 `1` でビルドを拒否します。警告は進みます。無効なコマンド用法と未知のハーネス名は終了 `2` です。`outDir` が無いと、出力は `<plugin-root>/dist/<harness>/` に着地します。BUILD は出力パス、既存出力部分木の中、信頼するビルド境界と出力のあいだのシンボリックリンクも拒否します。既定出力ではその境界はプラグインルートなので、リンクされた `<plugin-root>/dist` は拒否されます。境界より上の環境エイリアスは、ほかは所有している出力を無効にしません。

執筆の流れです。

1. **Create** — `aidlc-plugin-create.ts` で決定論的な足場を作る。
2. **Author** — プラグイン所有のステージ、スコープ、エージェント、ほかの寄与を書く。
3. **Validate** — 書いたルートをオフライン検証する。
4. **Build** — 支える各ハーネス投影をビルドする。
5. **Test** — 本物のインストールの使い捨てコピーに対して compose をテストする。
6. **Publish** — それらの生成ディレクトリとマーケットプレイスメタデータを、自分のリポジトリから公開する。

4 ツールとも、コピーした AIDLC ツール束から走り、AIDLC プロジェクトもフレームワークのチェックアウトも要りません。

### compose をテストする

「このプラグインは自分のインストールへきれいに compose するか？」に、そのインストールを変えずに答えます。

```bash
bun <tools-dir>/aidlc-plugin-test.ts <plugin-root> \
  --install <project-root> [--harness <name>] [--json]
```

ツールはまず検証とビルドをし、選んだインストール面を一時候補へコピーし、出した本物の `hooks/compose.ts` を走らせ、候補グラフを再コンパイルし、プラグインのステージとスコープがあることを検証し、冪等を証明するため compose をもう一度走らせます。compose drop、グラフ失敗、プラグインノードの欠け、2 回目のファイル変更はどれも終了 `1` です。ライブインストールは前後でハッシュされ、compose 対象にはなりません。

インストールが曖昧なときは `--harness` を渡します。`.kiro`（Kiro CLI 対 Kiro IDE）と `.aidlc`（Copilot 対 OpenCode）を含みます。`--dist <version>` は、RFC #722 マイルストーン 2 がリリース済みランタイム束チャネルを定義するまで予約です。

1. **中身の検証** はいつもオンの基線です。書いたプラグインルートに対し `aidlc-plugin-validate.ts` を走らせます。速く、正確な執筆所見を出しますが、パッケージや compose の成功は証明しません。
2. **compose 統合** は既定の CI 検査です。本物のインストールに対し `aidlc-plugin-test.ts` を走らせます。このリポジトリ内では、`composePluginFixture()` がフックのサブプロセス / drop 読みを同じ同梱実装へ委譲しつつ、テスト専用のフィクスチャ API は残します。この層は決定論的で、実際のビルダと composer を演習しますが、モデル付きハーネスは起動しません。
3. **ライブハーネス e2e** は任意の互換証拠です。`invokeHarness()` は `liveGateFor()` が返す門の後ろだけで呼んでください。ライブゲートは `AIDLC_CLAUDE_SDK_LIVE`、`AIDLC_KIRO_ACP_LIVE`、`AIDLC_CODEX_EXEC_LIVE`、`AIDLC_COPILOT_EXEC_LIVE`、`AIDLC_OPENCODE_RUN_LIVE`、`AIDLC_CURSOR_RUN_LIVE` です。ライブ実行は、ホストが compose 済みプラグインを発見して呼べることを証明しますが、インストール済み CLI、認証、より長い時間が要ります。未設定のゲートはスキップ結果を返すので、緑のテスト実行は、ライブ検査が走らなかった、という意味にもなります。

`plugins/<name>/tests/*.test.ts` の下のプラグインテストは自動発見され、統合層に加わります。1 プラグインのテストを走らせるには:

```bash
bash tests/run-tests.sh --integration --filter "plugin-<name>"
```

このリポジトリ内では、この中身テストがいちばん小さいコピー可能な形です。ヘルパは共有規則を同梱ツールへ委譲します。

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

プラグインがステージ、寄与、エージェント、スコープ、センサー、ツールを出荷するときは、決定論的な compose テストを足します。

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

## 路上の規則

- **番号は表示専用。** 読みやすい `number:` を書く。範囲は主張しない。ステージを挿入してもコアは再番号しない。
- **成果物の名前空間。** 出すどの成果物も `<plugin>-` 接頭辞。コア成果物や他プラグインと衝突してはならない。
- **原語の名前は一意。** スコープ / エージェント / センサーはコアや他プラグインと衝突してはならない。衝突は帰属付きの compose エラー。（方法ファイルはファイル単位でメモリ種まきへ加算マージ。）
- **依存** *（⏳ 先送り。）* `dependencies` は、依存の `version` に対する `name@^x.y.z` 制約を解決し、循環を拒否するよう設計されていますが、**フィールドを読むものはまだありません**。宣言してもいま効果はありません（文書 18 §8 Status）。
- **加算のみ。** 寄与は足す。コアステージのフィールド、エージェント、散文を上書きも削除もできない。（上流の振る舞いを _変える_ 本物の必要は、プラグインの関心ではなくフレームワークの設計判断。）

## 関連

- [Plugin Mechanism](../reference/18-plugin-mechanism.md) — 規範の設計。マニフェスト、compose 模型、寄与の継ぎ目、インストール時の根拠、ハイブリッド配布模型、マルチテナントのガード、as-built の状態（全部この 1 章にまとまっている）。
- [ステージの構造](01-anatomy-of-a-stage.md)、[スコープ](04-scopes.md)、[センサー](06-sensors.md) — プラグインが compose する構成要素。
