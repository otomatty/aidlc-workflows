# スキルとランナーコマンド

**AI-DLC はコマンドの一式です。** `/aidlc` オーケストレータのほかに、打つだけの 1 語ランナーがあります。スコープごと、ステージごと、セットアップ用です。オーケストレータがすでに出している切り口への近道なので、全部 `/aidlc` から届きますし、フラグを省略して欲しい入り口を打つこともできます。

> **ハーネスについての注。** この章の面は Claude Code です。スキルは `.claude/skills/` にあり、ピッカーから先頭 `/` で打ちます。Kiro は同じランナー一式を `.kiro/skills/`（こちらも `/`）に出します。Codex は `.agents/skills/` で、打ち方は `$`（`$aidlc-bugfix`）です。ランナーの *集合* と各コマンドの中身はハーネスを問わず同じで、違うのはディレクトリと接頭辞だけです。[他ハーネスで動かす](harnesses/README.md)。

---

## スキルは多く、エンジンは一つ

この実装が出荷するコマンドは、すべて `.claude/skills/` のスキルです。駆動する決定論的エンジンは同じで、違うのは起動前に何を焼き込むかだけです。

- **`/aidlc`** — フルのオーケストレータ。フラグは焼き込まない。スコープを判定する（またはやりたいことを書く）と、そのスコープの全ステージを完了まで回す。いちばんよく使う入り口。
- **スコープランナー** — `/aidlc-bugfix`、`/aidlc-feature`、`/aidlc-mvp`、`/aidlc-security-patch`。同じフルワークフローで、スコープは固定、判定は飛ばす。
- **ステージランナー** — `/aidlc-domain-design`、`/aidlc-code-generation`、ほか 27。1 ステージだけを隔離実行し、メインのワークフローは触らない。プラグイン所有のステージは、プラグイン接頭辞付きの裸のコマンド名（例: `/test-pro-integration`）。
- **`/aidlc-init`** — 最初のインテントを作る（Initialization フェーズ全体を 1 ステップで）。エンジンの自動作成の上に載る、任意の包装。
- **セッションスキル** — `/aidlc-session-cost`、`/aidlc-replay`、`/aidlc-outcomes-pack`。ワークフローの読み取り専用ビュー。[セッション管理](11-session-management.md)。
- **`/aidlc-knowledge`** — DocumentKB。チーム自身の文書（PDF、Word、Markdown、プレーンテキスト）を、エージェントが引用できるスペース単位カタログに載せる。セッションスキルと同じくスタンドアロンだが読み書きあり。カタログを変え、文書監査イベントを出す（ワークフロー状態は触らない）。面は `/aidlc knowledge <verb>` と同じ。動詞は [CLI コマンド](12-cli-commands.md)。

ランナーがすることは、すべて `/aidlc` にフラグを付けて届きます。ランナーは包装です。`/aidlc-bugfix` と打ち、`/` メニューに見えるのは使い勝手だけで、それ以上ではありません。ランナーを全部消してもショートカットが無くなるだけで、能力は `/aidlc` のフラグから残ります。

---

## スコープランナー — 問題の種類ごとの名前付き入り口

スコープランナーは、スコープを 1 つ固定したフルワークフローです。作業の種類が分かっていて、スコープ判定を飛ばしたいときに使います。

```
/aidlc-bugfix          Fix a specific bug — minimal depth, streamlined path
/aidlc-feature         Build a new feature — standard depth, all stages
/aidlc-mvp             Ship the core — skips late operations stages
/aidlc-security-patch  CVE / vulnerability response
```

それぞれ、オーケストレータに `--scope` を渡すのと同じです。

```
/aidlc-bugfix          ==  /aidlc --scope bugfix
/aidlc-express         ==  /aidlc --scope express
/aidlc-feature         ==  /aidlc --scope feature
```

説明文とフラグはそのまま通せます。`/aidlc` に渡すのと同じです。

```
/aidlc-bugfix The profile API returns 500 when display_name is null
/aidlc-feature --status
```

**ランナーが出荷されるコアスコープは 5 つ** — スコープファイルで `runner: true` の、よく使うものです。フレームワークのスコープは全部で 11（[スコープ・深度・テスト戦略](05-scopes-and-depth.md)）。残り — `enterprise`、`poc`、`infra`、`refactor`、`classic`、`workshop` — はいつもオーケストレータから届きます。プラグイン所有のスコープも `runner: true` にでき、ランナーはプラグイン接頭辞付きの裸のスコープ名です（例: `/test-pro-validation`）。

```
/aidlc --scope enterprise
/aidlc --scope poc
```

ワークフローが始まったらスコープは `aidlc-state.md` に固定されるので、同じランナーを再実行すると再開になり、最初からではありません。別スコープで回すなら `/aidlc --scope <name>` です。

---

## ステージランナー — 1 ステージだけ回し、ワークフローは触らない

ステージランナーは **1 ステージを隔離実行** します。そのステージの設定済みエージェントとレビュアーを使い、合成の完了を記録し、ワークフローの学びも承認ゲートも無しで止まります。メインワークフローの `Current Stage` は進めません。隔離はツール自身が強制します。

```
/aidlc-domain-design
/aidlc-code-generation
/aidlc-requirements-analysis
/aidlc-reverse-engineering
```

それぞれ `/aidlc --stage <slug> --single` の包装です。

```
/aidlc-code-generation    ==  /aidlc --stage code-generation --single
```

### 使うとき

- **ワークフローにコミットせず、方法論の一部だけ使う。** 問題の requirements analysis は欲しいが、ライフサイクル全体を回す準備は無い。`/aidlc-requirements-analysis` を走らせ、成果物を得て止まる。
- **自分がオーケストレータ。** 順序は人手で決め、フレームワークには目の前の 1 ステージだけ回してほしい。人が運転し、フレームワークは方法論を 1 ステージ分出す。
- **メインワークフローが別の位置で止まっているあいだに、1 ステージだけ隔離再実行する。** 単一ステージ実行はそれを乱せない。

### 安全な理由

`--single` の不変条件はツールが強制します。`next --single` は作業の前に隔離開始を記録し、`report --single` が閉じられるのは同じ合成試行だけで、開始無しの直接完了は拒否します。どちらもメインワークフローの `Current Stage` は書きません。ランナーがメインのポインタを進めようとしたら、エンジンはエラーを返します。

ブートストラップの **initialization** ステージ 3 つにステージランナーはありません。インテントの半分を作っても単体では意味が無いからです。Initialization フェーズ全体を 1 コマンドにまとめてあります。

```
/aidlc-init [--scope <name>] [description]   create the first intent (== running /aidlc on a fresh workspace)
```

---

## ランナー系統の一覧

| 系統 | 例 | すること | オーケストレータでの同等 |
|------|----|----------|--------------------------|
| オーケストレータ | `/aidlc` | フルワークフロー、スコープ判定あり | — |
| スコープランナー | `/aidlc-bugfix`、`/aidlc-express`、`/aidlc-feature`、`/aidlc-mvp`、`/aidlc-security-patch` | フルワークフロー、スコープ固定、判定なし | `/aidlc --scope <name>` |
| ステージランナー | `/aidlc-domain-design`、`/aidlc-code-generation`、…（全 29） | 1 ステージ隔離。ワークフローは進めない | `/aidlc --stage <slug> --single` |
| Init ラッパ | `/aidlc-init` | 最初のインテントを作る（Initialization を回す） | 新しいワークスペースでの `/aidlc` |
| セッションビュー | `/aidlc-session-cost`、`/aidlc-replay`、`/aidlc-outcomes-pack` | 読み取り専用のワークフロー報告 | [セッション管理](11-session-management.md) |
| 文書ナレッジ | `/aidlc-knowledge` | チーム自身の文書を索引し読む（スペース単位 DocumentKB） | `/aidlc knowledge <verb>` |

ライフサイクルで走らせられるステージには、ステージランナーが 1 つずつあります。一式を見るならスキルディレクトリを列挙します。

```bash
ls .claude/skills/
```

---

## 自作ランナー — ステージファイルを書く

フレームワークをカスタマイズするときに大事なのはこれです。**ランナーは手で書きません。** コンパイル済みステージグラフとスコープファイルから生成されます。

ステージランナーを足すには、ステージを足します。ステージファイルを書き、グラフを再コンパイルし、再生成します。

```bash
bun .claude/tools/aidlc-runner-gen.ts write
```

ジェネレータはコンパイル済みステージ一覧（正本）を読み、走らせられるステージごとにランナーシェルを出します。新しいステージの `/aidlc-<your-stage>` は自動で現れます。ランナーファイルを手で書く必要も、ボイラープレートをコピーする必要もありません。スコープランナーも同じで、frontmatter が `runner: true` のスコープが対象です。`scopes --all` はスコープファイル全部のランナーを出します。

```bash
bun .claude/tools/aidlc-runner-gen.ts scopes      # generate scope-runners
```

ランナー一式は手保守ではなく導出なので、覆うステージとスコープからずれません。ディスク上の集合が正本から外れた瞬間に、CI が 2 つの検査で失敗します。

```bash
bun .claude/tools/aidlc-runner-gen.ts check            # stage-runner drift
bun .claude/tools/aidlc-runner-gen.ts scopes --check   # scope-runner drift
```

グラフにステージを足してランナーを再生成していない、または消えたステージの孤児ランナーが残っていると、差分付きで大きく失敗します。作者の仕事はステージファイルを足して再生成することだけです。ランナーは結果として付き、ジェネレータが維持します。

ステージファイルの書き方は [カスタマイズ](13-customization.md) と [フェーズとステージ](04-phases-and-stages.md)。エンジン、ディレクティブ契約、ランナーシェルが裏で `next` / `report` をどう回すかは、リファレンスの [Skill System](../reference/17-skill-system.md) です。

---

## 早見

```
# Full workflow
/aidlc                              detect scope, run everything
/aidlc --scope enterprise           any of the 11 scopes

# Scope-runners (the 5 high-traffic doors)
/aidlc-bugfix · /aidlc-express · /aidlc-feature · /aidlc-mvp · /aidlc-security-patch

# One stage, isolated (never advances your workflow)
/aidlc-code-generation              == /aidlc --stage code-generation --single

# Create the first intent (Initialization phase)
/aidlc-init [--scope <name>]        == /aidlc on a fresh workspace

# Add your own: write a stage/scope file, then
bun .claude/tools/aidlc-runner-gen.ts write
bun .claude/tools/aidlc-runner-gen.ts scopes
```

あわせて: [CLI コマンド](12-cli-commands.md) · [スコープ・深度・テスト戦略](05-scopes-and-depth.md) · [カスタマイズ](13-customization.md)
