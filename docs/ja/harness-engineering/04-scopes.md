# スコープ

スコープはダイヤルです。ある種類の仕事で、フレームワークの 33 ステージのうち *どれが* 走り、どれが外に座るか。バグ修正に市場調査や環境プロビジョニングは要りませんが、デプロイパイプラインと実行ステージは走ります。規制のあるエンタープライズ機能はライフサイクル全体が要ります。毎回ステージを手で選ばせるのではなく、AI-DLC は名前付きスコープを 11 同梱します。それぞれが全ステージ集合に対する厳選した EXECUTE / SKIP 判定で、深度、テスト戦略、任意のレビュー上限といったワークフロー既定と対になります。スコープを選べば、残りは流れます。

ハーネスエンジニアにとってスコープは純粋なデータです。ほかの原語と同じく、ファイルとして書きます。半分は 2 つです。`core/scopes/aidlc-<name>.md` ファイル 1 本（身元、ルーティング用メタデータ、ワークフロー既定）と、ステージごとの所属タグ（各ステージの frontmatter `scopes:` 一覧が、走るスコープを指名）です。スコープの追加や調整に TypeScript は要りません。この章はワークフローです。スコープの材料、チームスコープの足し方、既存の調整、ツールが見てくれるものと残すものです。

ユースケースと利用者が読むルーティング表付きの 11 スコープ目録は、User Guide の [Scopes, Depth, and Test Strategy](../guide/05-scopes-and-depth.md) です。この章は、同じデータの書く側です。

---

## スコープの材料

スコープは 2 か所に書きます。切れ目が考え方そのものです。スコープの *身元* は自分のファイルにあり、*所属*（どのステージがその下で走るか）はステージ側へ転置されます。

**1. スコープファイル — `core/scopes/aidlc-<name>.md`。** スコープごとに 1 ファイル。`core/sensors/` と同じ形です。`feature` スコープの frontmatter は次です。

```yaml
---
name: feature
depth: Standard
keywords: []
description: Full lifecycle for new features, practical depth
skeleton: on
---

# feature scope

Prose intent: why these stages, why skip those.
```

スコープ frontmatter のフィールドです。

| フィールド | 必須 | すること |
|------------|------|----------|
| `name` | はい | スコープ名。コアファイルは `aidlc-<name>.md`。プラグインのスコープファイルはステムが `name` と一致 |
| `depth` | はい | 既定の詳しさ。`Minimal`、`Standard`、`Comprehensive` |
| `testStrategy` | いいえ | 深度と独立したテスト量の上書き。既定は `depth` に合わせる |
| `review_cap` | いいえ | このスコープでのレビュークラス上限。`adversarial`、`advisory`、`none`。無いときはスコープ層での引き下げなし。cap は下げられても、ステージの `review_class` を上げることはない。自律スウォームのレビューはステージが宣言したクラスを保つ |
| `keywords` | いいえ | `/aidlc <freeform text>` 自動判定の自然言語トリガー。平たい文字列一覧はブロック（`- item`）でもフロー（`[item, item]`）でもよい。空一覧はオプトアウト |
| `description` | いいえ | `/aidlc --help` に描く一行。（SKILL.md のコンパイル済みスコープ表は Scope / Depth / TestStrategy / EXECUTE / Total だけ出し、description は出さない） |
| `skeleton` | いいえ | `on` は、プラクティスが scope-dependent のとき walking-skeleton の儀式に入れる。`off` または無いときは外す |
| `runner` | いいえ | `true` は、既定で生成するスコープランナー集合に入れる |
| `freeform_default` | いいえ | `true` は、好みのコア既定（`classic`）が有効でないとき、選択を意識したフォールバックとしてこのスコープを指名する |

ローダーはファイル横断のスコープ `name` 重複を拒否し、エラーで両方のファイルを指名します。

### 自由文の既定

`freeform_default: true` は、プラグイン選択のあと内部の `classic` 既定が使えないとき、インストールが使うスコープを指名できます。指名は「有効なプラグインが 1 つだけ」のフォールバックより先に見られるので、スコープが複数あるプラグインは、アルファベット先頭のスコープを飲む代わりに、自分の細い既定を選べます。

`freeform_default: true` を宣言してよい **有効** スコープは高々 1 つです。選ばれたコア / プラグイン集合に複数あると、グラフコンパイルは失敗し、すべての主張者を指名します。無効なプラグイン上の主張は、それらが同時に有効になるまで衝突しません。このフィールドは明示の誤字を直しません。未知の `AWS_AIDLC_DEFAULT_SCOPE` 値は、いまでも検証に失敗します。

### walking-skeleton の既定

任意の `skeleton:` フィールドは、スコープ依存の walking-skeleton 姿勢を制御します。`skeleton: on` は、チームの `## Walking Skeleton` プラクティスが `scope-dependent` に解決するとき、このスコープでは Construction が walking-skeleton の儀式で開く、という意味です。`skeleton: off` は、最初のボルトが普通のボルトとして走る、という意味です。無いときの既定は off なので、compose / 実行時承認のスコープやプラグインスコープは、明示オプトインしない限りスケルトンボルトを召喚しません。

**2. 所属タグ — 各ステージの `scopes:` frontmatter。** ステージは、自分が走るスコープを自分の frontmatter で指名します。場所は `core/aidlc-common/stages/<phase>/<slug>.md` です。

```yaml
scopes:
  - enterprise
  - feature
  - mvp
```

スコープを指名したステージはその下で `EXECUTE`、無いときは `SKIP` です。ビルド手順 `bun .claude/tools/aidlc-graph.ts compile` が、全ステージの `scopes:` 一覧を `.claude/tools/data/scope-grid.json` のコンパイル済み EXECUTE / SKIP 格子へ *転置* します。純粋な転置で、`compile --check` が `stage-graph.json` と同じくドリフト検査します。ランタイムが読むのは格子です。手で直しません。初期化の 3 ステージは全スコープを指名します（いつも走ります）。

理解しておく判断が 1 つあります。`depth` と `testStrategy` の関係です。深度は各ステージの成果物がどれだけ詳しくなるか、テスト戦略は生成するテスト数です。独立なのは意図です。配布スコープのほとんどは `testStrategy` を外し、`depth` から継ぎます。`classic` は Standard / Standard、`express` は Minimal / Minimal。`workshop` は Standard 深度と Minimal テストの明示分割を示します。分割したいスコープは両方宣言してください。各レベルの意味は User Guide の [The 3 Depth Levels](../guide/05-scopes-and-depth.md#the-3-depth-levels) と [The 3 Test Strategy Levels](../guide/05-scopes-and-depth.md#the-3-test-strategy-levels) です。

フィールドごとの網羅契約（`keywords` の単語境界マッチ、曖昧な自由文起動を解くアルファベットスコープのタイブレーク含む）は、Developer Reference の [Contributing § Adding a Scope](../reference/11-contributing.md#adding-a-scope) です。この章は判断の要約、あちらが規範の仕様です。

---

## スコープとステージの関係

スコープとステージは反対側から互いを指します。両方の向きを持っておくと助かります。

**ステージ**は自分の身元を宣言します。フェーズ、リードエージェント、消費・生成する成果物、そして走るスコープ（`scopes:` 一覧）。**スコープ**は身元、ルーティング用メタデータ、ワークフロー既定を自分の `.md` で宣言し、中にステージごとの所属はありません。所属はステージ側です。両者の結びはスコープ名です。新しいステージを足すとき（[ステージを足す](02-adding-a-stage.md)）、スコープ所属は *そのステージに* 置きます。`scopes:` 一覧が、走らせたいスコープを全部指名します。スコープを 1 つも指名しないステージは、どこでも `SKIP` です。コンパイル時の転置が、それらのステージごとの一覧を格子にします。所属は一度、ステージ側に書き、11 個のスコープブロックで再宣言しません。

この分離は、このガイドのほかが乗るデータ対コードの線と同じです（[ハーネスエンジニアガイド](00-overview.md)）。スコープファイルは *身元* のデータ、ステージの `scopes:` 一覧は *所属* のデータ、コンパイル済み格子は両者の転置です。

---

## チームスコープを足す

チームが `hotfix` スコープを欲しいとします。`bugfix` より細く、緊急の本番パッチ向け。回帰テストとデプロイだけ、ほかは要らない。変更は新しいスコープファイル、走らせたい各ステージへの `scopes:` タグ、再コンパイルです。下の規律に合わせてください。確認手順とコマンド行の全体は [Contributing § Adding a Scope](../reference/11-contributing.md#adding-a-scope) です。

### 手順

1. **`core/scopes/aidlc-hotfix.md` を置く。** いちばん近い既存スコープ `aidlc-bugfix.md` をコピーし、frontmatter を直します。`name: hotfix`、`depth` を選び、自由文の自動判定が要るなら `keywords`（`[hotfix, urgent]`）、ヘルプ文向けの `description`、スコープ依存 Construction 儀式の既定としての `skeleton: on|off`、このインストールで一意のフォールバック指名ならだけ `freeform_default: true`、`depth` からずらすときだけ `testStrategy`、ステージレビューを下げたいときだけ `review_cap`。意図を説明する短い散文本文を書きます。

2. **`hotfix` の下で走らせたいステージにタグを付ける。** `EXECUTE` にしたい各ステージ（`core/aidlc-common/stages/<phase>/` の下）の frontmatter `scopes:` 一覧に `hotfix` を足します。タグしないステージはそのスコープで `SKIP` です。初期化の 3 ステージには必ず入れてください（いつも走ります）。

3. **再コンパイル。** `bun .claude/tools/aidlc-graph.ts compile` でタグを `scope-grid.json` へ転置し、`bun .claude/tools/aidlc-utility.ts scope-table` で SKILL.md のコンパイル済みスコープ表を更新します。`bun .claude/tools/aidlc-graph.ts compile --check` と `bun .claude/tools/aidlc-utility.ts scope-table --check` でドリフトなしを確認します（終了 0）。

4. **スコープが解決され、受理されることを確認する。** `/aidlc --doctor` を走らせます。新しいスコープでの init が、正しい `Scope:` 行の状態ファイルを出すこと、env 既定としてもワークフロー途中の `--scope` 変更としても受理されることを確認します。

5. **キーワード推論を確認する**（`keywords` を埋めたときだけ）。トリガーの 1 つを含む自由文が、`feature` へ落ちずに新しいスコープを検出することを確認します。

6. **スコープを意識する文書を更新し、ルーティングテストを足す。** スコープを手で列挙している文書がいくつかあります。User Guide のスコープ参照とルーティング表、カスタマイズ章の有効値一覧、オーケストレータ参照のスコープ→ステージ対応。同じ変更で更新します。既存スコープが使っていないパターンでステージを飛ばすなら、既存のスコープごとのテストを型にしたワークフローテストを足します。

7. **（任意）打てるランナーを生成する。** スコープはファイルが着いた瞬間から `/aidlc --scope <name>` で完全に使えます。ランナーは要りません。一語コマンド（`/aidlc-hotfix`）が欲しいなら、スコープ frontmatter に `runner: true` を足し、`bun .claude/tools/aidlc-runner-gen.ts scopes` を走らせます。`bun .claude/tools/aidlc-runner-gen.ts scopes --all` は、そのフラグに関係なく全スコープファイルに対し `skills/aidlc-<scope>/SKILL.md` を出します。各ランナーは薄いシェルで、スコープを焼き込んだ `aidlc-orchestrate next --scope <name>` を `done` まで駆動し、「Starting unrelated new work?」節に、`/aidlc` オーケストレータと同じ認識、提案（`AskUserQuestion`、自動作成はしない）、`next --new-intent --scope <name>` の案内を載せます。ランナーはすでに走れるスコープを包み、定義はスコープファイルです。`hooks:` ブロックは持ちません。決定論的な背骨（監査、センサー、rebuild-stage-graph、状態検証）は `settings.json` にプロジェクト単位で登録されているので、どのランナーも無料で継ぎます。スコープファイルを足した・改名したときは、ジェネレータ（または `scopes --check`）を再実行します。

### 自動で検証されるもの

この実装は、実行時に `.claude/scopes/*.md` の存在から `validScopes()` で有効スコープ一覧を導くので、ファイルが着いた瞬間に多くが収まります。

- スコープは一度にどこでも有効です。`init`、`--scope` 変更、env 既定の解決、`doctor` は同じヘルパを見るので、どれもコード編集は要りません。
- エラーメッセージは、変更なしであなたのスコープをアルファベット順に並べます。
- `keywords` を付けたら、frontmatter 一覧が埋まった瞬間から自由文 `/aidlc <text>` が自動判定します。SKILL.md の散文編集は要らず、表の再生成だけです。
- 転置のドリフトガード（`compile --check`）は、ステージの `scopes:` タグを直して格子を再コンパイルしていないとビルドを落とします。

### 自動では検証されないもの

- **誤字のスコープ名を持つ `scopes:` タグでもパースします。** `hotfix` の代わりに `hotfx` を指名したステージ frontmatter はきれいにコンパイルします。誰も聞かない格子の列ができるだけです。捕捉は、`validScopes()` が `.md` ファイルから導くので、ファイルが無いスコープは起動時に拒否されること。ただしステージ上の誤字タグは、本物のスコープからそのステージを黙って落とします。ガードレールは `/aidlc --doctor` とスコープごとのテストです。
- **コンパイル済みスコープ表はずれられます。** ステージの `scopes:` を直して手順 3 の再コンパイル + 表再生成を飛ばすと、エンジンは古い格子を読み続けます。`--check` フラグ（テスト一式が走る）が捕まえますが、走らせたときだけです。
- **スコープごとのフェーズ列のカバレッジ。** 配布のフェーズ列テストは、既知スコープ名のハードコード一覧を回します。新しいスコープは、その一覧を伸ばすまで演習されません。同じ変更でスコープを足してください。
- **手メンテの文書。** 文書を grep してくれるものはありません。スコープ参照、ルーティング表、カスタマイズの有効値一覧は散文です。スコープファイルと自分で揃えてください。

---

## 既存スコープの調整

調整は小さい編集ですが、着地はスコープではなくステージです。よく出る変更は 2 つです。

- **ステージを入れる・出す。** ステージの `scopes:` 一覧にスコープ名を足すか外します。たとえば、最初の切り出しでも監視をいつも結ぶチームなら、`observability-setup` の `scopes:` に `mvp` を足す、という手です。タグ 1 つ、再コンパイル（`compile` + スコープ表）、`--doctor`。
- **既定の深度、テスト戦略、レビュー上限を変える。** スコープの `core/scopes/aidlc-<name>.md` frontmatter で `depth` を調整し、`testStrategy` を足す・外す、`review_cap` を足す・外す。最初の 2 つは成果物とテスト量を再較正し、`review_cap` はステージのレビュークラスを `adversarial`、`advisory`、`none` へ下げます。上げることはありません。スコープが自分の既定を持つので、そのスコープを選ぶどのワークフローにも効きます。実行ごとの `--depth`、`--test-strategy`、`--review` は、対応する振る舞いをさらに下げられます。

どちらでも、上の手順 3 の再コンパイルと doctor の対が効きます。編集は小さく、確認は同じです。

層についての注記です。配布スコープの調整は、フレームワーク同梱ファイルを直接直します。ステージの `scopes:` タグ、または配布の `core/scopes/aidlc-*.md`。フォークが既定を変えたいなら正当ですが、`aidlc-` 系譜を持つファイルを変えているので、フレームワークのアップグレードが突き合わせを求めることがあります。チーム固有の振る舞いが欲しく、ほかが頼る既定には触りたくないときは、配布 11 の横に正味新しいスコープファイルを足すほうがきれいです。

---

## 次

[ルールとラーニングループ](05-rules-and-the-loop.md) — どのワークフローにも乗る立ち振る舞いを書き、ループが一度の訂正を残るルールへ昇格させる。

スコープ形とランナーの規範契約（`.claude/scopes/` ファイルがワークフローの訪れるステージを駆動する仕方、ジェネレータがそれを打てる `/aidlc-<scope>` スキルにする仕方）は、Developer Reference の [Skill System §5 (scope shape) and §4 (runners)](../reference/17-skill-system.md) です。
