# エージェントシステム

この章はエージェントの構造です。どう構成され、設定され、フレームワークに載り、どう足す・直すか。

利用者が見るエージェントの説明は [User Guide — Agents](../guide/06-agents.md) です。

---

## エージェントの構造

書いた各エージェントは `core/agents/` の平らな `.md` ファイルです。YAML frontmatter のあとに Markdown 本文。パッケージャはそれらのペルソナを各ハーネスのエージェント面へ投影します。コンダクターは投影したファイルを読み、インラインの仕事または委譲実行を枠付けます。

### Frontmatter 契約

書いたコアエージェントファイルはどれも、この YAML frontmatter を含まなければなりません。

```yaml
---
name: aidlc-architect-agent               # Agent identifier (matches filename without .md)
description: >                      # Brief role summary (shown in Claude Code agent list)
  System architect responsible for domain design,
  NFR design, and component decomposition.
disallowedTools: Task               # Agents cannot spawn subagents
tier: judgment                      # judgment | balanced | templated (see Agent Tiers)
---
```

| フィールド | 必須 | 説明 |
|-------|----------|-------------|
| `name` | はい | エージェント識別子。ファイル名と一致しなければならない |
| `description` | はい | 役割の短い要約 |
| `tools` | いいえ | 任意の許可リスト。省略するとセッションのツール一式を継ぐ。列挙するとエージェントを狭め、`mcp__<server>__<tool>` id も列挙しない限り継いだ MCP ツールは落ちる |
| `disallowedTools` | 書いたコアでは必須 | `Task` を含まなければならない — 委譲するのはコンダクターだけ。ハーネスが違うネイティブツール方針面を使うとき、パッケージャはこの Claude 方言キーを外すか翻訳する |
| `tier` | はい | `judgment`、`balanced`、または `templated`。**書いた**ダイヤル。パッケージャが各ハーネスのネイティブモデル / effort キーへ投影する（後述の Agent Tiers）。生の `model:` / `effort:` は書いた frontmatter に決して現れない — 無視されるローカル `dist/<harness>/` 木と版付けされたリリース実行時の投影 **出力** |

Kiro IDE はこのコア契約を違って投影します。`disallowedTools` を外し、`tools: ["read", "write", "shell"]` を足し、能力範囲の `permissions.rules` を足します。`tools:` から `subagent` を省くことが、IDE のネイティブ語彙で同じネスト委譲無しの制約を運びます。

### Markdown 本文の区画

frontmatter の下、Markdown 本文は次を定義します。

| 区画 | 目的 |
|---------|---------|
| **Core Responsibilities** | エージェントがすること |
| **Collaboration** | 受け取る相手 / 一緒に働く相手 / 渡す相手 |
| **Memory Focus** | 関係するとき参照するエージェント固有のメモリ話題 |
| **Key Principles** | エージェントの振る舞い指針 |

---

## 共有設定

書いたエージェント 14 は共通の設定基準を共有します。Claude Code ではどれも `tools:` 許可リストを宣言しないので、どのエージェントも **セッションのツール一式** と供給された MCP ツールを継ぎ、同梱の拒否は `disallowedTools: Task` です。ほかのハーネスはその意図をネイティブ面へ投影します。Kiro エージェント Markdown は `disallowedTools` を省き、Kiro CLI 委譲 JSON は `tools` から `subagent` を省き、Kiro IDE 委譲の `tools:` 付与も委譲を外します。

### Claude Code セッションのツール一式

どの Claude Code エージェントも組み込みツールを継ぎます。含むもの:

| ツール | 目的 |
|------|---------|
| Read | ファイルシステムからファイルを読む |
| Edit | ファイル内の正確な文字列置換 |
| Write | ファイルシステムへファイルを書く |
| Glob | 速いファイルパターン一致 |
| Grep | ripgrep による内容検索 |
| AskUserQuestion | 対話の利用者プロンプト（メインスレッドのステージのみ） |

### 共通で禁じる Claude Code ツール

| ツール | 理由 |
|------|--------|
| Task | エージェントは委譲された働き手として動きます。Task 呼び出しをするのは SKILL.md コンダクターだけです。Claude は `disallowedTools: Task` を強制し、ほかのハーネスはネイティブの拒否 / 許可リスト相当を使います。 |

### 各ペルソナが行使すると期待されるツール

Claude Code ではどのエージェントも継承で Bash と WebSearch に *届きます*。表は方法論がステージ仕事でそれらを使うと **期待する** ペルソナを記録し、エージェントごとの付与ではありません。Claude ペルソナを本当に制限するには、任意の `tools:` 許可リストを足します（`mcp__<server>__<tool>` id も列挙しない限り継いだ MCP は落ちます）。

| ツール | 行使すると期待される対象 |
|------|---------------------|
| Bash | aidlc-aws-platform-agent、aidlc-devsecops-agent、aidlc-developer-agent、aidlc-quality-agent、aidlc-pipeline-deploy-agent、aidlc-operations-agent |
| WebSearch | aidlc-product-agent、aidlc-design-agent、aidlc-compliance-agent |

### エージェントティア

各エージェントの書いたダイヤルは `tier:` です。ペルソナがする仕事の **種類** を指名し、パッケージャ（`bun scripts/package.ts`）が各ハーネスのネイティブモデル / effort 形へ投影します。以前の振る舞い（v2.2.15 から v2.2.19。それ以前はキーが惰性の `modelOverride:`）はエージェントごとに生の `model: opus|sonnet` をピンし、より大きいモデルで走っているセッションを強制格下げしていました。ティア投影がそのピンを置き換えます。

| ティア | エージェント | 意味 |
|------|--------|---------|
| `judgment` | architect、aws-platform、compliance、composer、design、developer、devsecops、product、quality | 曖昧さの下の多制約推論。出力は下流へ波及。決して格下げしない: セッションのモデル *と* effort を継ぐ |
| `balanced` | architecture-reviewer、product-lead | レビュアー形の仕事 — 明示した基準に対する新しい入力。測定した基準は Claude Code、Codex、opencode で中サイズモデルを medium effort にピン |
| `templated` | delivery、operations、pipeline-deploy | 主にパターン追従の出力。方法論はすでにナレッジにある（デリバリー計画、CI/CD YAML、ランブック）。ティアは Writing up のモデルダイヤルグループのままだが、同梱基準はセッションのモデルと effort を継ぐ |

ハーネスごとの投影（`core/tools/aidlc-tiers.ts` が正本）:

| ティア | Claude Code（.md frontmatter） | Codex CLI（.toml） | Kiro CLI エージェント JSON / Kiro IDE `.md` | Kiro CLI cli.json `chat.modelDefaults` | opencode（.md frontmatter） | Copilot（.md frontmatter） | Cursor（.md frontmatter） |
|------|-------------------------------|-------------------|--------------------------------------|-------------------------------------|-----------------------------|-----------------------------|--------------------------|
| `judgment` | `model: inherit`、`effort:` 行無し | `model` / `model_reasoning_effort` キー無し（config.toml セッション既定が効く） | フィールド省略（スキーマフォールバック: 利用者の既定モデル） | ティア項目無し | `model:` / `variant:` キー無し（opencode.json セッション既定が効く） | 省略（セッションモデルを継ぐ） | `model:` 省略（セッションモデルを継ぐ） |
| `balanced` | `model: sonnet`、`effort: medium` | `model = "openai.gpt-5.6-terra"`、`model_reasoning_effort = "medium"` | フィールド省略（下記） | ティア項目無し | `model: amazon-bedrock/global.anthropic.claude-sonnet-4-6`、`variant: medium` | 省略（セッションモデルを継ぐ） | `model:` 省略（下記） |
| `templated` | `model: inherit`、`effort:` 行無し | `model` / `model_reasoning_effort` キー無し（config.toml セッション既定が効く） | フィールド省略（下記） | ティア項目無し | `model:` / `variant:` キー無し（opencode.json セッション既定が効く） | 省略（セッションモデルを継ぐ） | `model:` 省略（下記） |

表の背後の要点:

- **省略が継承の仕組みです。** Claude Code では `effort:` キーが無いエージェント .md はセッション effort を継ぎ、ピンした `effort:` は両方向でセッションを上書きします（ピンは上限であり床ではない）— だから不在が judgment と templated の契約です。Codex では `model` の無いロール TOML は、同梱 `.codex/config.toml` セッション既定で産みます（codex-cli 0.139.0 と 0.142.5 で生きて検証。現行の doctor 推奨最小は、すぐの compact セッション再読み込み向けに 0.145.0）。Kiro ではエージェント v1 スキーマが無い `"model"` フォールバックを文書化します。「指定しなければ既定モデルを使う」（`/model` の残った好み）。
- **Writing up はダイヤル可能であり、既定では格下げされません。** 以前の templated 格下げはいま `aidlc config models` 経由のインストールごとの選択です。書いた `templated` ティアは変わらないので、方針はデリバリー、パイプライン / デプロイ、オペレーションを一つのグループとして扱い続けます。
- **Kiro はモデルを決してピンしません。** 同梱の Kiro モデル ID は、そのモデルが利用者のインストールで有効なときだけ解決します。ほかのモデルで走るセッションはどの委譲産出も `Invalid model ID` で落とし、Kiro は Claude 方言のティア別名（`opus` / `sonnet`）を outright 落とします — だから普遍に安全なピン可能値はありません。どの Kiro ティアもだから `"model"`（と `.md` frontmatter の `model:` 行）を省きます。全エージェントがセッションモデルを継ぎます。`TIER_PROJECTIONS` の kiro スロットと `kiroModelDefaults()` 機械は残ります。休眠です。解決できるインストールごとのピン仕組みが現れたときのためです。
- **Kiro にエージェントごとの effort 面はありません。** kiro-cli はエージェント JSON のどの effort 風キーでも fail-close するので、モデルごとの effort 既定は `settings/cli.json` の `chat.modelDefaults[<modelId>].output_config.effort` にしか乗れません。ティアがモデルをピンしないので、書いた条件付き項目だけが出荷されます（`claude-opus-4.8` → `xhigh`。セッションが実際にそのモデルを走るときだけ適用）。そのファイルは CLI 専用です。Kiro IDE は cli.json を完全に無視し、拡張埋め込みのモデルごとの既定（または利用者の `/effort` セッション状態）を適用します。
- **Cursor もモデルを決してピンしません。** Cursor のモデル可用性はプラン依存です（Free アカウントは指名モデルを全部落とし、`Auto` しか走れない）。ピンしたエージェントモデルは下位プランのインストールを硬く失敗させます。どの Cursor ティアもだから `.md` frontmatter の `model:` 行を省きます（Cursor にエージェントごとの effort キーはありません。effort はモデル id 接尾辞に乗ります）。全エージェントがセッションモデルを継ぎます。`TIER_PROJECTIONS` の cursor スロットはモデルのみ、休眠です。プラン非依存のピン仕組みが現れたときのためです。

### ティア cap（投影の上書き）

プロジェクトは、どのエージェントファイルも直さずに、パック時に低いティア投影を選べます。これは分類の天井であり、templated 基準が継承するようになってからは保証されたコスト天井ではありません。

- **残るノブ:** スペースメモリ層ファイル（`core/memory/org.md` → `team.md` → `project.md`、最後の書き手が勝つ — プロジェクトは org 天井を下げても上げてもよい）の YAML frontmatter の `tier_cap:` キー。例: `tier_cap: balanced` はどのハーネスの投影でも `judgment` を測定したレビュアー基準へ写します。`templated` 天井は高いティアを継承する Writing up 投影へ写します。目標が明示の低コスト方針なら `aidlc config models` を使ってください。
- **起動ごとの上書き:** `AIDLC_TIER_CAP` 環境変数は、パッケージャ実行 1 回についてメモリ層に勝ちます（`AIDLC_TIER_CAP=templated bun scripts/package.ts`）。メモリ cap が効いているあいだ一度 UNCAPPED でビルドするには、最上ティアへセットします — `AIDLC_TIER_CAP=judgment` — メモリ層に勝ち、何も締めません（空値は未セットであり、uncapped ではありません）。

二つのノブは範囲が違います。メモリ cap はリポジトリと一緒に旅するので、write と `--check` の両方に効き、一時チェックビルド 2 つは同じリポジトリ定義の cap を使います。環境変数は一度きりの write ノブで、`--check` の下では無視されます。CI の迷った `AIDLC_TIER_CAP` が決定論の測定を変えてはいけません。パッケージャは無視したとき通知を印字し、cap 付きのどの write 実行でもアクティブな cap とソースを指名します。

代わりに **1 エージェント** を外すには、入れたハーネスディレクトリの投影値を直します（例: 1 つの Claude エージェント `.md` に `model: opus` をセット）。編集は、あとで `aidlc config` リフレッシュがローカル変更を報告したあと、そのフレームワーク所有ファイルを置き換えるまで残ります。

---

## エージェント比較マトリクス

次の 2 列の `Yes` は継いだツールの期待使用であり、アクセス付与ではありません。

| エージェント | Bash 期待使用 | WebSearch 期待使用 | ティア | リードステージ | 支援ステージ | 合計 |
|-------|-------------------|------------------------|------|-------------|----------------|-------|
| aidlc-product-agent | No | Yes | judgment | 5 | 3 | 8 |
| aidlc-design-agent | No | Yes | judgment | 2 | 2 | 4 |
| aidlc-delivery-agent | No | No | templated | 3 | 2 | 5 |
| aidlc-architect-agent | No | No | judgment | 7 | 3 | 10 |
| aidlc-aws-platform-agent | Yes | No | judgment | 2 | 5 | 7 |
| aidlc-compliance-agent | No | Yes | judgment | 0 | 4 | 4 |
| aidlc-devsecops-agent | Yes | No | judgment | 0 | 5 | 5 |
| aidlc-developer-agent | Yes | No | judgment | 2 | 4 | 6 |
| aidlc-quality-agent | Yes | No | judgment | 2 | 3 | 5 |
| aidlc-pipeline-deploy-agent | Yes | No | templated | 4 | 0 | 4 |
| aidlc-operations-agent | Yes | No | templated | 3 | 0 | 3 |

**観察:**
- aidlc-architect-agent がいちばん広いステージ関与です（3 フェーズ横断で 10 ステージ）。
- エージェント 14 全体では、9 が `judgment` ティア、3 が継ぐ `templated` ティア、`balanced` レビュアー 2 つだけが Claude Code、Codex、opencode で下がります。Kiro、Cursor、Copilot では全ティアがセッションのモデルと effort を継ぎます。上のマトリクスは領域の専門家 11 をカバーします。
- aidlc-compliance-agent は純粋に助言として動きます（支援 4、リードステージ無し）。
- 11 のうち 6 が CLI やりとりに Bash を使うと期待されます。
- 3 エージェントが調査タスクに WebSearch を使うと期待されます。

---

## フェーズ参加

| エージェント | Init (0) | Ideation (1) | Inception (2) | Construction (3) | Operation (4) |
|-------|----------|--------------|---------------|-------------------|---------------|
| aidlc-product-agent | -- | L（intent-capture、market-research、scope-definition）、S（rough-mockups、approval-handoff） | L（requirements-analysis、user-stories）、S（refined-mockups） | -- | -- |
| aidlc-design-agent | -- | L（rough-mockups） | L（refined-mockups）、S（user-stories、domain-design） | -- | -- |
| aidlc-delivery-agent | -- | L（team-formation、approval-handoff）、S（scope-definition） | L（delivery-planning）、S（units-generation） | -- | -- |
| aidlc-architect-agent | -- | L（feasibility）、S（intent-capture） | L（domain-design、units-generation、contract-design）、S（reverse-engineering、delivery-planning） | L（functional-design、nfr-requirements、nfr-design） | -- |
| aidlc-aws-platform-agent | -- | S（feasibility） | S（domain-design、contract-design） | L（infrastructure-design）、S（nfr-design） | L（environment-provisioning）、S（feedback-optimization） |
| aidlc-compliance-agent | -- | S（feasibility） | -- | S（nfr-requirements、infrastructure-design） | S（environment-provisioning） |
| aidlc-devsecops-agent | -- | -- | S（practices-discovery） | S（nfr-requirements、infrastructure-design、build-and-test） | S（environment-provisioning） |
| aidlc-developer-agent | -- | -- | L（reverse-engineering）、S（practices-discovery、user-stories） | L（code-generation）、S（functional-design） | S（deployment-execution） |
| aidlc-quality-agent | -- | -- | S（practices-discovery、user-stories） | L（build-and-test）、S（nfr-requirements） | L（performance-validation） |
| aidlc-pipeline-deploy-agent | -- | -- | L（practices-discovery） | L（ci-pipeline） | L（deployment-pipeline、deployment-execution） |
| aidlc-operations-agent | -- | -- | -- | -- | L（observability-setup、incident-response、feedback-optimization） |

L = Lead、S = Support

---

## エージェントの足し方

エージェントの表示名と例ナレッジファイルは、各エージェントの `.md` frontmatter の `display_name` と `examples` フィールドが正本です。TypeScript の編集は要りません。レシピ全体（必須 frontmatter フィールド、検証手順、自動対手で検証されるもの）は [Contributing: Adding an Agent](11-contributing.md#adding-an-agent) です。手順の短い要約:

1. 必須 frontmatter で `core/agents/{name}-agent.md` を作る: `name`、`display_name`、`examples`、`description`、`disallowedTools`（`Task` を含む）、`tier`。コア frontmatter に生の `model:` / `effort:` を書いてはいけない — それらは投影出力です（上の Agent Tiers）。任意の `tools:` 許可リストは継いだツール一式を狭めます。省略するとセッションのツール一式を継ぎます。`core/tools/aidlc-lib.ts` の `loadAgents()` は次の起動でファイルを発見します。
2. ナレッジファイルを `core/knowledge/{name}-agent/` に足す
3. 参加するステージファイル（`core/aidlc-common/stages/`）へエージェントを足す — 各ステージの frontmatter で `lead_agent` / `support_agents` をセット。コンパイル済み `tools/data/stage-graph.json` はその frontmatter から `bun scripts/package.ts` が **生成** します。生成出力を手で直さないでください。
4. `bun scripts/package.ts` で無視されるローカル配布を実体化し、`--check` を走らせて二度ビルドし決定論的出力を検証する
5. 手で保つナレッジ表へエージェント→例行を足す（スペース単位のチームナレッジディレクトリは `aidlc/knowledge/{name}-agent/`。チームが中身を持つときに作る — エンジンは足場を作らない）
6. テストを更新する: ファイル存在のスモークテスト、ステージ・エージェント相互参照の機能テスト
7. このファイルと [reference/agents/](agents/) の文書を更新する

## エージェントの直し方

- **ツールを変える**: frontmatter の `tools:` 許可リストを足すまたは直してエージェントを狭める。省略するとセッションのツール一式を継ぐ。`tools:` 一覧は、`mcp__<server>__<tool>` id も列挙しない限り継いだ MCP ツールを落とします。
- **ティアを変える**: `tier:` を `judgment`、`balanced`、または `templated` に直し、再生成（`bun scripts/package.ts`）。入れたプロジェクトの **1 エージェント** に特定モデルを強制するには、代わりにハーネスエージェントファイルの投影した `model:` を直します（Claude Code は別名、完全 id、`inherit` を受け入れます）。
- **振る舞いを変える**: Markdown 本文の区画（責任、原則）を直す。
- **ステージ割り当てを変える**: 関係するステージファイル（`core/aidlc-common/stages/`）の `lead_agent` / `support_agents` を直し、`bun scripts/package.ts` で再生成する — コンパイル済みステージグラフはステージ frontmatter から導かれ、手では直しません。

---

## 関連

- [Architecture](01-architecture.md) — エージェント層を含む 5 層モデル
- [Knowledge System](10-knowledge-system.md) — ナレッジの読み込み順
- [Agents Technical Reference](agents/) — エージェントごとの技術詳細
- [Stage Protocol](04-stage-protocol.md) — エージェントペルソナの読み込み規則
