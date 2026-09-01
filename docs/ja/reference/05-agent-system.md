# エージェントシステム

この章はエージェントのアーキテクチャです。構造、設定、フレームワークによる読み込み、追加と変更の仕方です。

利用者向けの説明は [User Guide — エージェント](../guide/06-agents.md) です。

---

## エージェントの構造

手で書くエージェントは、`core/agents/` の平らな `.md` です。YAML frontmatter のあとに Markdown 本文が続きます。パッケージャはそれらのペルソナを各ハーネスのエージェント面へ投影します。コンダクターは投影されたファイルを読み、インライン作業や委譲実行の枠にします。

### Frontmatter 契約

コアに書くエージェントファイルは、すべて次の YAML frontmatter を持ちます。

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
| `name` | はい | エージェント識別子。ファイル名と一致すること |
| `description` | はい | 役割の短い要約 |
| `tools` | いいえ | 任意の許可リスト。省略するとセッションのツール一式を継ぐ。書くとエージェントを狭め、継承した MCP ツールは落ちる。残すなら `mcp__<server>__<tool>` id も列挙する |
| `disallowedTools` | コアの正本では必須 | `Task` を含めること — 委譲するのはコンダクターだけ。ハーネスが別のネイティブツール方針面を使うとき、パッケージャはこの Claude 方言キーを除くか翻訳する |
| `tier` | はい | `judgment`、`balanced`、`templated`。書く側のダイヤル。パッケージャが各ハーネスのネイティブ model / effort キーへ投影する（下のエージェントティア）。生の `model:` / `effort:` は書いた frontmatter には出さない — `dist/<harness>/` の投影**出力** |

Kiro IDE はこのコア契約を別の形に投影します。`disallowedTools` を除き、`tools: ["read", "write", "shell"]` を足し、能力スコープの `permissions.rules` を足します。`tools:` から `subagent` を省くことで、IDE の語彙でも同じ「ネストした委譲はしない」拘束になります。

### Markdown 本文の節

frontmatter の下、Markdown 本文が定義します。

| 節 | 目的 |
|---------|---------|
| **Core Responsibilities** | エージェントが何をするか |
| **Collaboration** | 受け取る相手 / 一緒に働く相手 / 渡す相手 |
| **Memory Focus** | 関係するときに見る、エージェント固有のメモリ話題 |
| **Key Principles** | エージェントの振る舞い指針 |

---

## 共有設定

手で書く 14 エージェントは、共通の設定ベースラインを共有します。Claude Code ではどれも `tools:` 許可リストを宣言しないので、どのエージェントも**セッションのツール一式**と用意された MCP ツールを継ぎ、出荷の拒否は `disallowedTools: Task` です。ほかのハーネスはその意図をネイティブ面へ投影します。Kiro のエージェント Markdown は `disallowedTools` を省き、Kiro CLI の委譲 JSON は `tools` から `subagent` を外し、Kiro IDE の委譲 `tools:` 付与も委譲を外します。

### Claude Code のセッションツール一式

どの Claude Code エージェントも組み込みツールを継ぎます。含まれるものは次です。

| ツール | 目的 |
|------|---------|
| Read | ファイルシステムから読む |
| Edit | ファイル内の正確な文字列置換 |
| Write | ファイルシステムへ書く |
| Glob | 速いファイルパターン照合 |
| Grep | ripgrep による内容検索 |
| AskUserQuestion | 対話のプロンプト（メインスレッドのステージだけ） |

### 共通で禁じる Claude Code ツール

| ツール | 理由 |
|------|--------|
| Task | エージェントは委譲された働き手です。Task 呼び出しをするのは SKILL.md のコンダクターだけです。Claude は `disallowedTools: Task` を強制し、ほかのハーネスはネイティブの拒否 / 許可リスト相当を使います。 |

### 各ペルソナが使うと方法論が期待するツール

Claude Code では、どのエージェントも継承で Bash と WebSearch に*届きます*。表は、方法論がステージ作業で**使うと期待する**ペルソナであり、エージェント単位の付与ではありません。Claude のペルソナを本当に狭めるなら、任意の `tools:` 許可リストを足します（継承 MCP は落ちるので、残すなら `mcp__<server>__<tool>` id も列挙します）。

| ツール | 使うと期待される相手 |
|------|---------------------|
| Bash | aidlc-aws-platform-agent、aidlc-devsecops-agent、aidlc-developer-agent、aidlc-quality-agent、aidlc-pipeline-deploy-agent、aidlc-operations-agent |
| WebSearch | aidlc-product-agent、aidlc-design-agent、aidlc-compliance-agent |

### エージェントティア

各エージェントに書くダイヤルは `tier:` です。ペルソナがする仕事の**種類**を名前にし、パッケージャ（`bun scripts/package.ts`）が各ハーネスのネイティブ model / effort 形へ投影します。以前の振る舞い（v2.2.15 から v2.2.19。その前は効かない `modelOverride:`）はエージェントごとに生の `model: opus|sonnet` をピンし、より大きなモデルで走っているセッションを強制的に下げていました。ティア投影がそのピンを置き換えます。

| ティア | エージェント | 意味 |
|------|--------|---------|
| `judgment` | architect、aws-platform、compliance、composer、design、developer、devsecops、product、quality | 曖昧さの下での複数拘束の推論。出力は下流へ波及する。下げない。セッションのモデル**と** effort を継ぐ |
| `balanced` | architecture-reviewer、product-lead | レビュアー形の仕事 — 明示基準に対する新規入力。Claude Code、Codex、opencode では中型モデル + 下げた effort（Kiro、Cursor、Copilot ではどのティアもセッションモデルを継ぐ） |
| `templated` | delivery、operations、pipeline-deploy | 型に従う出力が主。方法論はすでにナレッジにある（デリバリ計画、CI/CD YAML、ランブック）。Claude Code、Codex、opencode では中型モデル + 下げた effort（Kiro、Cursor、Copilot ではどのティアもセッションモデルを継ぐ） |

`balanced` と `templated` は、いまどのハーネスでも投影は**同じ**です。どちらも中型モデルを `medium` effort にピンします。二つの名前を分けるのは、仕事が違うからと、片方だけ後から調律できるからです。名前が二つだから投影も二つ、とは読まないでください。セッションの effort を継ぐのは `judgment` だけです。

ハーネスごとの投影（正本は `core/tools/aidlc-tiers.ts` 一つ）です。

| ティア | Claude Code（.md frontmatter） | Codex CLI（.toml） | Kiro CLI エージェント JSON / Kiro IDE `.md` | Kiro CLI cli.json `chat.modelDefaults` | opencode（.md frontmatter） | Copilot（.md frontmatter） | Cursor（.md frontmatter） |
|------|-------------------------------|-------------------|--------------------------------------|-------------------------------------|-----------------------------|-----------------------------|--------------------------|
| `judgment` | `model: inherit`、`effort:` 行なし | `model` / `model_reasoning_effort` キーなし（config.toml のセッション既定が効く） | フィールド省略（スキーマのフォールバック: 利用者の既定モデル） | ティアエントリなし | `model:` / `variant:` キーなし（opencode.json のセッション既定が効く） | 省略（セッションモデルを継ぐ） | `model:` 省略（セッションモデルを継ぐ） |
| `balanced` | `model: sonnet`、`effort: medium` | `model = "openai.gpt-5.6-terra"`、`model_reasoning_effort = "medium"` | フィールド省略（下を参照） | ティアエントリなし | `model: amazon-bedrock/global.anthropic.claude-sonnet-4-6`、`variant: medium` | 省略（セッションモデルを継ぐ） | `model:` 省略（下を参照） |
| `templated` | `model: sonnet`、`effort: medium` | `model = "openai.gpt-5.6-terra"`、`model_reasoning_effort = "medium"` | フィールド省略（下を参照） | ティアエントリなし | `model: amazon-bedrock/global.anthropic.claude-sonnet-4-6`、`variant: medium` | 省略（セッションモデルを継ぐ） | `model:` 省略（下を参照） |

表の背後です。

- **省略が継承の機構です。** Claude Code では `effort:` キーの無いエージェント .md はセッション effort を継ぎ、ピンした `effort:` は両方向でセッションを上書きします（ピンは天井であり床ではありません）。だから欠如が契約なのは judgment だけで、`balanced` と `templated` はどちらも `effort: medium` をピンします。Codex では `model` の無いロール TOML は、出荷の `.codex/config.toml` セッション既定で起動します（codex-cli 0.139.0 と 0.142.5 でライブ確認。いま doctor が強制する下限は、即時の compact-session 再読み込み向け 0.145.0）。Kiro CLI の agent-v1 スキーマは、無い `"model"` のフォールバックを文書化しています。「指定しなければ既定モデル」。Kiro IDE もエージェント `.md` が `model:` を省けば継承します。
- **Kiro はモデルをピンしません。** 出荷した Kiro モデル ID は、利用者の導入でそのモデルが有効なときだけ解決します。別モデルで走っているセッションは、委譲起動のたびに `Invalid model ID` で拒否し、Kiro は Claude 方言のティア別名（`opus` / `sonnet`）も拒みます。どこでも安全にピンできる値はありません。だからどの Kiro ティアも `"model"`（と `.md` frontmatter の `model:` 行）を省き、全エージェントがセッションモデルを継ぎます。`TIER_PROJECTIONS` の kiro 枠と `kiroModelDefaults()` 機構は残したまま休眠です。導入ごとに解決できるピン機構が出たときの備えです。
- **Kiro にエージェント単位の effort 面はありません。** kiro-cli はエージェント JSON の effort っぽいキーで fail-close するので、モデル単位の effort 既定は `settings/cli.json` の `chat.modelDefaults[<modelId>].output_config.effort` にしか乗れません。ティアがモデルをピンしないので、出荷するのは書いた条件付きエントリだけです（`claude-opus-4.8` → `xhigh`。セッションが本当にそのモデルで走っているときだけ効く）。そのファイルは CLI 専用です。Kiro IDE は cli.json を無視し、拡張に埋め込まれたモデル単位既定（または利用者の `/effort` セッション状態）を使います。
- **Cursor もモデルをピンしません。** Cursor のモデル可用性はプラン依存です（Free は名前付きモデルをすべて拒否し、`Auto` しか走れません）。ピンしたエージェントモデルは下位プランの導入を硬く落とします。だからどの Cursor ティアも `.md` frontmatter の `model:` 行を省きます（Cursor にエージェント単位の effort キーはなく、effort はモデル id の接尾辞に乗る）。全エージェントがセッションモデルを継ぎます。`TIER_PROJECTIONS` の cursor 枠はモデルのみで休眠です。プラン非依存のピン機構が出たときの備えです。

### ティア上限（コスト上書き）

プロジェクトはエージェントファイルを触らず、パック時にすべての投影を上限できます。

- **残るつまみ:** スペースメモリ層ファイル（`core/memory/org.md` → `team.md` → `project.md`。最後の書き手が勝つ。プロジェクトは org 天井を下げても上げてもよい）の YAML frontmatter の `tier_cap:`。例: `tier_cap: balanced` は、どのハーネスの投影でも `judgment` を `balanced` に潰します（Kiro ではどのティアもモデルをピンしないので、上限は無効です。どのティアもすでにセッションモデルを継ぎます）。
- **呼び出し単位の上書き:** `AIDLC_TIER_CAP` 環境変数が、そのパッケージャ実行ではメモリ層に勝ちます（`AIDLC_TIER_CAP=templated bun scripts/package.ts`）。メモリ上限が効いているときに一度だけ上限なしで焼くなら、最上ティアをセットします — `AIDLC_TIER_CAP=judgment` — メモリ層に勝ち、何も締めません（空の値は未設定であり、上限なしではありません）。

二つのつまみは範囲が違います。メモリ上限はリポジトリと一緒に動くので、write でも `--check` でも効きます。上限付き dist をコミットしたプロジェクトは自己一貫します。環境変数は一回限りの WRITE つまみで、`--check` では**無視**します。ドリフト検査は、コミット済み dist が正当に焼かれた元と比較します。CI やテストランナーに残った `AIDLC_TIER_CAP` が失敗も隠蔽もしないようにします（パッケージャは無視するときに通知を出します）。上限付き実行では、効いている上限とその出所も毎回出します。

一つのエージェントだけ外すなら、入れた `dist/<harness>/` コピーの投影値を直します（例: Claude のエージェント .md 一つに `model: opus`）。dist シェルを再コピーするまで残ります。

---

## エージェント比較マトリクス

次の二列の `Yes` は、継承ツールを使うという方法論の期待であり、アクセスの付与ではありません。

| エージェント | Bash を使う期待 | WebSearch を使う期待 | ティア | リードステージ | サポートステージ | 合計 |
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

**所見:**
- aidlc-architect-agent のステージ関与が一番広いです（3 フェーズ・10 ステージ）。
- 14 体全体では、9 体が `judgment` ティアで、5 体は Claude Code、Codex、opencode で一段下がります（`balanced` レビュアー 2 と `templated` 計画 3。Kiro、Cursor、Copilot ではどのティアもセッションのモデルと effort を継ぐので、そこでは誰も下がりません）。下がるエージェントは、明示チェックリストに対するレビューか、型が主の計画・CI/CD・ランブックです。上のマトリクスは領域の専門家 11 です。
- aidlc-compliance-agent は助言だけです（サポート 4、リードなし）。
- 11 のうち 6 が、CLI 操作で Bash を使うと期待されます。
- 3 体が、調査で WebSearch を使うと期待されます。

---

## フェーズ参加

| エージェント | Init (0) | Ideation (1) | Inception (2) | Construction (3) | Operation (4) |
|-------|----------|--------------|---------------|-------------------|---------------|
| aidlc-product-agent | -- | L (intent-capture, market-research, scope-definition), S (rough-mockups, approval-handoff) | L (requirements-analysis, user-stories), S (refined-mockups) | -- | -- |
| aidlc-design-agent | -- | L (rough-mockups) | L (refined-mockups), S (user-stories, domain-design) | -- | -- |
| aidlc-delivery-agent | -- | L (team-formation, approval-handoff), S (scope-definition) | L (delivery-planning), S (units-generation) | -- | -- |
| aidlc-architect-agent | -- | L (feasibility), S (intent-capture) | L (domain-design, units-generation, contract-design), S (reverse-engineering, delivery-planning) | L (functional-design, nfr-requirements, nfr-design) | -- |
| aidlc-aws-platform-agent | -- | S (feasibility) | S (domain-design, contract-design) | L (infrastructure-design), S (nfr-design) | L (environment-provisioning), S (feedback-optimization) |
| aidlc-compliance-agent | -- | S (feasibility) | -- | S (nfr-requirements, infrastructure-design) | S (environment-provisioning) |
| aidlc-devsecops-agent | -- | -- | S (practices-discovery) | S (nfr-requirements, infrastructure-design, build-and-test) | S (environment-provisioning) |
| aidlc-developer-agent | -- | -- | L (reverse-engineering), S (practices-discovery, user-stories) | L (code-generation), S (functional-design) | S (deployment-execution) |
| aidlc-quality-agent | -- | -- | S (practices-discovery, user-stories) | L (build-and-test), S (nfr-requirements) | L (performance-validation) |
| aidlc-pipeline-deploy-agent | -- | -- | L (practices-discovery) | L (ci-pipeline) | L (deployment-pipeline, deployment-execution) |
| aidlc-operations-agent | -- | -- | -- | -- | L (observability-setup, incident-response, feedback-optimization) |

L = Lead、S = Support

---

## エージェントの足し方

表示名と例のナレッジファイルは、各エージェント `.md` の `display_name` と `examples` が正です。TypeScript は不要です。手順の全体（必須 frontmatter、検証手順、自動で見るものと手で見るもの）は [Contributing: Adding an Agent](11-contributing.md#adding-an-agent) です。短い要約です。

1. 必須 frontmatter 付きで `core/agents/{name}-agent.md` を作る: `name`、`display_name`、`examples`、`description`、`disallowedTools`（`Task` を含む）、`tier`。コア frontmatter に生の `model:` / `effort:` は書かない — 投影出力です（上のエージェントティア）。任意の `tools:` 許可リストは継承ツール一式を狭めます。省略するとセッションのツール一式を継ぎます。`core/tools/aidlc-lib.ts` の `loadAgents()` が次の呼び出しでファイルを発見します。
2. ナレッジファイルを `core/knowledge/{name}-agent/` に足す
3. 参加するステージファイル（`core/aidlc-common/stages/`）にエージェントを足す — 各ステージ frontmatter の `lead_agent` / `support_agents`。コンパイル済み `tools/data/stage-graph.json` はその frontmatter から `bun scripts/package.ts` が**生成**します。手では触らない（手で直した dist は `package.ts --check` のドリフト検査が CI を落とします）。
4. 配布を再生成する: `bun scripts/package.ts`（ドリフト無しを確認するなら `--check`）
5. 手で維持するナレッジ表にエージェント → examples 行を足す（スペース単位のチームナレッジディレクトリは `aidlc/knowledge/{name}-agent/`。中身があるときにチームが作る — エンジンは骨組みを作らない）
6. テストを更新する: ファイル有無の smoke、ステージとエージェントの交差の feature
7. このファイルと [reference/agents/](agents/) の文書を更新する

## エージェントの直し方

- **ツールを変える**: frontmatter の `tools:` 許可リストを足すか直して狭める。省略するとセッションのツール一式を継ぐ。`tools:` 一覧は継承 MCP を落とすので、残すなら `mcp__<server>__<tool>` id も列挙する。
- **ティアを変える**: `tier:` を `judgment`、`balanced`、`templated` に直し、再生成する（`bun scripts/package.ts`）。入れたコピーの一つのエージェントだけ特定モデルにしたいなら、`dist/<harness>/` のエージェントファイルの投影 `model:` を直す（Claude Code は別名、完全 id、`inherit` を受け付ける）。
- **振る舞いを変える**: Markdown 本文の節（責任、原則）を直す。
- **ステージ割り当てを変える**: 該当ステージファイル（`core/aidlc-common/stages/`）の `lead_agent` / `support_agents` を直し、`bun scripts/package.ts` で再生成する — コンパイル済みステージグラフはステージ frontmatter から派生し、手では触らない。

---

## 相互参照

- [Architecture](01-architecture.md) — エージェント層を含む 5 層モデル
- [Knowledge System](10-knowledge-system.md) — ナレッジの読み込み順
- [Agents Technical Reference](agents/) — エージェントごとの技術詳細
- [Stage Protocol](04-stage-protocol.md) — エージェントペルソナの読み込み規則
