# ハーネスエンジニアガイド

> [AI-DLC ドキュメント](../README.md) の一部 · [User Guide](../guide/00-introduction.md) · **Harness Engineer Guide** · [Developer Reference](../reference/00-overview.md)

AI-DLC は方法論です。この実装は、いま使っているハーネスの上で、そのまま動く形で届きます。対象は Claude Code、Kiro CLI、Kiro IDE、Codex CLI、Cursor、opencode、GitHub Copilot。同梱はエージェント 14（領域の専門家 11、レビュアー 2、コンポーザー 1）、ステージ 33、スコープ 11、ルールとセンサーの一式です。このガイドは、その方法論を**形を変えて**使う人向けです。走るステージを変える、フレームワークがカバーしていない領域のエージェントを足す、スコープを締める、立ち振る舞いのルールを教える、ステージに決定論的な検査を結ぶ。

どれも **コードは書きません**。

---

## 読者は 3 人、ガイドも 3 冊

AI-DLC の文書は、話題ではなく「いま何をしたいか」で分かれます。

| ガイド | あなたは… | 変えるもの |
|--------|----------|------------|
| [User Guide](../guide/00-introduction.md) | AI-DLC でソフトウェアを**作る** | `.claude/` は触らない。`/aidlc` を走らせ、ゲートで答え、成果物を見る |
| **Harness Engineer Guide**（この冊） | チーム向けに AI-DLC の**振る舞い**を形作る | フレームワークが読む**データ**: ステージ、エージェント、スコープ、ルール、センサー、ナレッジ |
| [Developer Reference](../reference/00-overview.md) | AI-DLC **そのもの**を変える | そのデータを読む**コード**: オーケストレータ、フック、CLI ツール、コンパイルパイプライン、テスト一式 |

このガイドと Developer Reference の境は **データ対コード** です。ハーネスエンジニアが触るものは、YAML frontmatter 付き Markdown か JSON 設定です。実行時にフレームワークが載せる宣言データです。ステージを足す、エージェントを足す、スコープを定義する。フレームワーク自身の設計原則として、これらに TypeScript の編集は要りません。`.ts` を直す瞬間（オーケストレータ、フック、ツール）が、Developer Reference 側です。

---

## 頭の中の模型: ステージは *何を*、エージェントは *誰が*

フレームワークの大半は、この 2 つの原語で持ちます。この区別が仕事そのものです。

- **ステージ**は作業の単位です。*何が*起きるか。読む成果物と書く成果物、リードするエージェント、実行の仕方を宣言します。ワークフローグラフのノードです。
- **エージェント**はペルソナです。*誰が*やるか。領域の専門、ツールの許可リスト、モデルを持ちます。ステージの中に載ります。

ステージはリードエージェントを指名します。エージェントは自分のステージを指名しません。この非対称は意図的です。仕事の割り当てはステージを直せばよく、働き手を書き直さなくて済みます。働き手を足すときはエージェントファイルを置くだけです。ステージがそのエージェントを選ぶまで、ワークフローは動きません。

このステージを動かす機械は 2 つあります。ハーネスエンジニアが形を作るのは、両方が読む**データ**です。決定論的な **エンジン**（`core/tools/aidlc-orchestrate.ts`。サブコマンドはちょうど 5 つ: `next`、`continue`、`report`、`park`、`team-board`。`continue` は内部の操舵、`team-board` は Team Construction の読み取り専用照会）が `aidlc-state.md` とコンパイル済みの `stage-graph.json` を読み、次に走るものを決め、型付きディレクティブを 1 本出します。**コンダクター**（`skills/aidlc/SKILL.md`）は薄い転送ループで、そのディレクティブを実行します。ルーティングはエンジン側です。ステージファイル、スコープ、ルールが、その操舵の入力です。

ハーネスエンジニアが設定する残りは、この 2 つにぶら下がります。

- **スコープ**は、その種類の仕事で *どの* ステージが走るかです（バグ修正は 33 のうち 9、エンタープライズ機能は全部）。
- **ルール**は、どのワークフローにも乗る立ち振る舞いです。チームの「いつもこうする」。
- **センサー**は、ステージに結ぶ決定論的な検査です。一致する書き込み、または承認ゲートで走ります。結びは advisory か blocking です。
- **ナレッジ**は、エージェントが仕事の前に読む領域の文脈です。

---

## コードなしで変えられるもの

書く場所は全部 `core/` です。手で書く、ハーネス非依存の正本です。書いたあと、ハーネスごとの木を再生成します（後述の [ビルド模型](#the-build-model-author-in-core-regenerate-the-harnesses)）。

| 変えること | 書く場所 | 章 |
|------------|----------|----|
| ステージの仕事内容 | `core/aidlc-common/stages/<phase>/<slug>.md` | [ステージの構造](01-anatomy-of-a-stage.md) |
| まったく新しいステージ | 該当フェーズのディレクトリに新ファイル + グラフ配線 | [ステージを足す](02-adding-a-stage.md) |
| エージェントの追加・変更 | `core/agents/<name>-agent.md` | [エージェントを足す](03-adding-an-agent.md) |
| スコープの定義 | `core/scopes/aidlc-<name>.md` + ステージごとの `scopes:` タグ | [スコープ](04-scopes.md) |
| 立ち振る舞いのルール | `core/memory/{team,project}.md` | [ルールとラーニングループ](05-rules-and-the-loop.md) |
| 決定論的な検査を結ぶ | `core/sensors/` のセンサーマニフェスト + ステージの `sensors:` 取り込み | [センサー](06-sensors.md) |
| チームの領域ナレッジ | `aidlc/knowledge/<agent>-agent/`（スペース単位のナレッジ。実行時） | [チームナレッジ](07-team-knowledge.md) |
| Construction とスウォームの姿勢 | `core/memory/` + `units-generation` ステージ | [Construction とスウォーム](08-construction-and-swarm.md) |

各章は *やり方* を語り、網羅的なスキーマは [Developer Reference](../reference/00-overview.md) へ下ろします。リファレンスが規範の契約、このガイドが仕事の物語です。

例外が 1 行あります。**チームの領域ナレッジ**は、あなたが自分のプロジェクトのスペース層に足す文脈です（`aidlc/knowledge/`。スペースの `memory/`、`codekb/`、`intents/` の隣）。実行時のもので、`core/` には入りません。フレームワークは上書きしません。上表のほかは、`core/` に書くフレームワークのソースです。

## 命名規則と、どこで効くか

ステージのファイル名ステムは frontmatter の `slug` と一致しなければなりません。`aidlc-graph compile` は、ステムの不一致、ステージ slug の重複、消費される成果物に対する複数プロデューサーを、硬いエラーで落とします。重複プロデューサーのエラーは、プロデューサー側のステージファイルと、消費者 1 件を指名します。誰も消費しない成果物名の共有は有効です。センサーのファイル名 / id 検査もコンパイル時の硬いエラーです。スコープとエージェントの宣言名の重複はローダーエラーで、両方のファイルを指名します。スコープ / エージェントのファイル名と `name` のずれは、`/aidlc --doctor` が advisory で出します。ファイルを改名するか `name` を直してください。

---

<a id="the-build-model-author-in-core-regenerate-the-harnesses"></a>

## ビルド模型: `core/` に書き、ハーネスを再生成する

ハーネスエンジニアが書くものは全部 **`core/`** にあります。手で書く、ハーネス非依存の正本です（ステージは `core/aidlc-common/stages/`、エージェントは `core/agents/`、ほかスコープ、ルール、センサー、ナレッジ、ツール、フック）。ソース開発で使うハーネスごとの `dist/<harness>/` 木（`dist/claude/.claude/`、`dist/kiro/.kiro/`、`dist/kiro-ide/.kiro/`、`dist/codex/`、`dist/cursor/`、`dist/opencode/`、`dist/copilot/`）は、`core/` と薄い `harness/<name>/` の面から **生成** されます。無視されるローカル出力で、コミットも手編集もしません。ループはいつも次です。

```bash
# 1. edit the source in core/ (never dist/)
$EDITOR core/aidlc-common/stages/inception/my-stage.md

# 2. regenerate both channels for every harness from core/ + harness/
bun scripts/package.ts

# 3. prove deterministic generation (the CI guard)
bun scripts/package.ts --check
```

コミットするのは書いた `core/` または `harness/` の編集であり、生成されたルートではありません。`--check` はコピー、ネイティブ、プラグインの投影を、独立した一時ルートで二度ビルドし、バイト比較します。以降の章のレシピが `aidlc engine graph compile`（または別のツール）を走らせよと言うとき、入れたコマンドは、プロジェクトのアクティブなハーネス木に対してそのツールを解決します。生成されたコピーチャネルの散文は Bun ディスパッチャを使い、ネイティブの散文は `aidlc` を使います。著者はチャネル非依存の経路を使います。書く場所ではありません。**書くのは `core/`。ディスパッチャは入れた投影に対してツールを走らせます。** 書いたソースと生成された実行時のこの切れ目が、このガイドを通して揃えておく一点です。ビルド契約の全体は [新しいハーネスへ移植する](09-porting-to-a-new-harness.md) と、Developer Reference の [Architecture § Source vs distribution](../reference/01-architecture.md#source-vs-distribution-one-core-many-harnesses) です。

---

## Developer Reference へ越えるとき

変更がデータの話ではなく、フレームワークのコードであるときは [Developer Reference](../reference/00-overview.md) です。

- オーケストレータのルーティングや状態機械（[Orchestrator](../reference/03-orchestrator.md)、[State Machine](../reference/12-state-machine.md)）— エンジン / コンダクター / ディレクティブ / ランナー / スコープの形 / スウォームの規範契約は [The Skill System](../reference/17-skill-system.md)
- フックまたは CLI ツール（[Hooks and Tools](../reference/06-hooks-and-tools.md)）
- ステージグラフのコンパイルパイプライン、または監査イベントの分類
- テストスイート（[Testing](../reference/09-testing.md)）

ステージやエージェントを足すことはワークフローグラフに*触ります*が、それを読むコードは変えません。だからここです。グラフのコンパイルの仕方を変える、新しい監査イベントを足す、はコードの変更です。あちらです。

---

## このガイドの並び

初めて読むときは順に:

1. **[ステージの構造](01-anatomy-of-a-stage.md)** — ステージファイルの形式: frontmatter 契約、本文の三区画、グラフのコンパイル。何かを変える前に理解する、いちばん大事なこと。
2. **[ステージを足す](02-adding-a-stage.md)** — 端から端まで: ファイルを書く、依存の辺を結ぶ、コンパイル、スコープに現れるのを見る。
3. **[エージェントを足す](03-adding-an-agent.md)** — ペルソナを書き、リードまたは支援するステージに結ぶ。
4. **[スコープ](04-scopes.md)** — スコープとステージの写像を定義し、調える。
5. **[ルールとラーニングループ](05-rules-and-the-loop.md)** — 層チェーンにルールを書き、ループに訂正をルールへ昇格させる。
6. **[センサー](06-sensors.md)** — 決定論的な検査を書き、ステージに結ぶ。
7. **[チームナレッジ](07-team-knowledge.md)** — エージェントに領域の文脈を渡す。
8. **[Construction とスウォーム](08-construction-and-swarm.md)** — ルール層でチームの Construction 自律姿勢を決め、`units-generation` を通して自律スウォームの Unit ごとのボルトが並行できるものを形作る。
9. **[新しいハーネスへ移植する](09-porting-to-a-new-harness.md)** — `harness/<name>/` ディレクトリ 1 つとマニフェスト行 1 つで、別の CLI ハーネスを足す。`core/` は直さない。マニフェスト契約、フックアダプタ、`emit.ts`。
10. **[プラグインを書く](10-authoring-a-plugin.md)** — `plugins/<name>/` に再利用できる任意の **AIDLC プラグイン** を包む。新しいステージ / エージェント / スコープ / センサー / doctor 検査 + 既存コアステージへの加算寄与。ハーネスごとに本物のホストプラグインとして出す。設計は Developer Reference の一章（[18 の仕組み](../reference/18-plugin-mechanism.md)）。

## 次

[ステージの構造](01-anatomy-of-a-stage.md) から始めてください。ほかの変更が全部乗る形式です。
