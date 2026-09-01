# エージェントを足す

エージェントはフレームワークの *誰が* です。領域、ツールの許可リスト、ティアを持つペルソナです。配布の 14 体は、プロダクト、デザイン、デリバリー、アーキテクチャ、AWS プラットフォーム、コンプライアンス、DevSecOps、開発、品質、パイプラインデプロイ、運用をカバーする領域の専門家 11、レビュー専用 2、適応型ワークフローのコンポーザー 1 です。チームが、フレームワークがカバーしていない領域を要する場合（データガバナンスのレビュアーやモバイルの専門家など）、Markdown ファイル 1 本を `core/agents/` に置くだけでペルソナを足します。TypeScript は要りません。

この章はワークフローです。ペルソナファイルとは何か、frontmatter での判断、そして *見える* エージェントはまだ *動いていない* という 2 段の事実です。フィールドごとの契約は Developer Reference へ下ろします。利用者の席から見たエージェントは [User Guide — Agents](../guide/06-agents.md) です。

---

## ペルソナファイルとは、どこにあるか

どのエージェントも、`core/agents/<slug>-agent.md` の平たいファイル 1 本です。上が YAML frontmatter、下が Markdown 本文です。配布ファイルはすべて `aidlc-` 接頭辞を付けます（`aidlc-architect-agent.md`、`aidlc-developer-agent.md`）。あなたが足すファイルはあなたのもので、その接頭辞は必須ではありません。配布の 14 はフレームワークファイルとして扱ってください。アップグレードで上書きされます。*既存エージェントが知ること* をカスタマイズするときは、ファイルを直さずチームナレッジです（[チームナレッジ](07-team-knowledge.md)）。本当に新しいペルソナは別の手です。新しいファイル、あなたが所有し、アップグレードを生き延びます。

フレームワークがパースするのは frontmatter です。本文は、エージェントが起動したときに自分について読む散文です。責任、協働、メモリの焦点、仕事の原則。機械が読むのは frontmatter だけです。本文はエージェント自身の枠組み用で、配布ファイルの構造に合わせて書きます。パッケージャは、必須の委譲ナレッジ事前検査を、どのハーネス投影にも足します。

実物のエージェントの frontmatter です。書いた場所は `core/agents/aidlc-architect-agent.md` です。

```yaml
---
name: aidlc-architect-agent
display_name: Architect Agent
examples:
  - tech-stack.md
  - infrastructure-preferences.md
description: >
  Solutions architect responsible for domain design, contract design,
  NFR patterns, and component decomposition.
disallowedTools: Task
tier: judgment
---
```

---

## frontmatter の契約と、あなたがする判断

フィールドごとのスキーマ全体はリファレンスにあります。ここでは、実際に書くときにする判断です。

**`name` はファイル名ステムと一致しなければなりません。** `aidlc-data-governance-agent.md` のファイルは `name: aidlc-data-governance-agent` を宣言します。パーサはこれをキーにします。不一致は、解決されないエージェントを書くいちばん簡単な道です。ローダーはファイル横断のエージェント `name` 重複を拒否し、エラーで両方のファイルを指名します。

**エージェントは既定で、セッションのツール一式を継ぎます。** 配布の 14 体はどれも `tools:` 許可リストを宣言しないので、セッションが提供するツール全部に届きます。`Read`、`Edit`、`Write`、`Glob`、`Grep`、`AskUserQuestion`、`Bash`、`WebSearch`、継いだ MCP ツールも同様です。ペルソナを狭めるには、任意の `tools:` 許可リストを足し、使ってよいツールだけを指名します。`tools:` を列挙すると、指名したツールだけに狭まり、完全修飾の `mcp__<server>__<tool>` id も指名しない限り、継いだ MCP ツールは落ちます（下の MCP 継承の注記）。領域が本当に狭い面を要するときだけ使ってください。ほとんどのペルソナは全部継ぐのがよいです。

**MCP サーバーは継承であり、エージェント単位の許可ではありません。** プロジェクトルートの `.mcp.json` で宣言した 5 つの MCP サーバーはセッションに載り、どのエージェントも全部自動で継ぎます。エージェント単位の許可を書くものはありません。あるサーバーからペルソナを *遠ざける* には、`tools:` 許可リストを、そのサーバーを省いた完全修飾 `mcp__<server>__<tool>` 一覧に狭めます（裸の `mcp__<server>` トークンは何もしません。サーバー単位の許可ではありません）。継承と制限の模型は `t110` のレジストリ整合テストが演習します（[Testing](../reference/09-testing.md)）。

**`disallowedTools` には `Task` が入っていなければなりません。** 任意ではありません。エージェントは委譲された働き手として走ります。エンジンの `run-stage` ディレクティブが `mode: subagent` を載せるとき、`Task` 呼び出しをするのはコンダクター（生きている `/aidlc` セッション）です。`Task` を許すと、エージェントが自分のサブエージェントを産み、フレームワークが防ぐ委譲の連鎖になります。配布のどのエージェントも `Task` を禁じており、あなたのものも同じです。Kiro 投影はこの Claude 専用 frontmatter キーを外し、同じ入れ子委譲なしの境界を Kiro ネイティブのエージェントツール設定で強制します。ほかの `disallowedTools` 値はパッケージに失敗するか、プラグイン compose 時に drop ログされます。

**`tier` は仕事の種類を指名します。パッケージャがハーネスごとの model / effort キーへ投影します。** コアのエージェント frontmatter に生の `model:` や `effort:` は書きません。それらは `dist/<harness>/` の投影 *出力* で、`core/tools/aidlc-tiers.ts` のティア表から導きます。下流へ波及する多制約の推論をするペルソナには `judgment` です。曖昧な意図の解釈、密な文脈の下でのアーキテクチャの取捨。judgment エージェントはセッションのモデル *と* effort を継ぐので、黙って格下げされません。明示基準に対して新しい入力を判断する、レビュアー形のペルソナには `balanced` です。出力がほぼパターンに従い、方法論がすでにエージェントのナレッジファイルに載っているときだけ `templated` です。デリバリー計画、CI/CD YAML、ランブックの足場など。`balanced` と `templated` はどちらも effort を `medium` に下げます（Claude Code、Codex、opencode。Kiro、Cursor、Copilot では全ティアがセッションのモデルと effort を継ぐので、ティアは何も変えません）。いまの投影結果は同じです。effort をセッションから継ぐのは `judgment` だけです。迷ったら `judgment` です。投影表（とプロジェクトの `tier_cap`）はあとからコストを下げられますが、低く書きすぎたペルソナは黙って推論不足になります。[Agent System](../reference/05-agent-system.md) に投影表と cap の上書きがあります。

振る舞いではなく提示を駆動するフィールドがもう 2 つあります。`display_name` はステータスラインが描く人向けラベルです（アーキテクトは "Architect Agent"）。`examples` は、エージェント→examples 表に載る推奨ナレッジファイル名です。*利用者に見せる提案* です。ランタイムは読み込まず、エンジンはディスクに書きません。

必須 / 任意の正確な表と、共有設定の行列は [Agent System: Frontmatter Contract](../reference/05-agent-system.md#frontmatter-contract) です。

---

## 見えるは動いていない: 2 段の事実

内面化するのはこれです。ファイルを置くとエージェントは *見える* ようになります。ステージに結ぶと *動く* ようになります。両方要ります。存在して一度も走らないエージェントになります。

- **発見が見えるようにします。** `.claude/tools/aidlc-lib.ts` の `loadAgents()` が、次の呼び出しで `.claude/agents/` のすべての `.md` を読み、メタデータの地図を導きます。コード編集も登録手順もありません。ファイルがあることが登録です。ここからステータスラインは display name を描け、チームはスペース単位の `aidlc/knowledge/<slug>-agent/` に標準を足せます。
- **ステージへの結びが動かします。** ステージは frontmatter の `lead_agent` / `support_agents` で、リードと支援を slug で指名します（`.claude/tools/data/stage-graph.json` にコンパイルされます）。どこかのステージがあなたの slug を参照するまで、どの `run-stage` ディレクティブも指名しないので、コンダクターはそのペルソナへ委譲しません。

これはフレームワーク中核の非対称と同じです。ステージがエージェントを指名し、エージェントは自分のステージを指名しません。だからエージェントファイルだけでは、設計どおり惰性です。新しいペルソナを働かせるには、使うべきステージを直します。結びの仕組みは [ステージを足す](02-adding-a-stage.md) です。

各エージェントは、あなたが `core/knowledge/aidlc-<slug>-agent/` に書くナレッジディレクトリ（フレームワークの方法論）と、スペース単位の任意のチーム重ね `aidlc/knowledge/<slug>-agent/`（あなたの標準）にも対になります。スペース単位の `aidlc/knowledge/` は自由形式で、ブートストラップ時は空です。中身があるときにチームがエージェントごとのサブディレクトリを作ります。エンジンは足場を作りません。二層のナレッジの流れは [チームナレッジ](07-team-knowledge.md) です。

---

## 手順

リファレンスのレシピに合わせ、端から端までの流れです。

1. **エージェントファイルを作る** — `core/agents/<slug>-agent.md` に必須 frontmatter: `name`、`display_name`、`examples`、`description`、`disallowedTools`（`Task` を含む）、`tier`。任意の `tools:` 許可リストはペルソナを狭めます。省略するとセッションのツール一式を継ぎます。任意の `maxTurns: <n>` はエージェントのターン予算を上限します。Claude Code では拘束、opencode ではネイティブの `steps:` キーへ投影、Codex CLI、Cursor、GitHub Copilot、Kiro の両面では惰性（ペルソナ散文のみ）です。これらはエージェント単位の cap キーを出しません（Codex の TOML emit はペルソナの frontmatter 引用を書き直し、kiro のエージェント JSON はキーを受け取りません。未知フィールドで fail-close します）。レビュー専用の 2 体はいまこれを載せています（レビュアーペルソナの `## Turn Budget` 節が対の約束です）。
   本文は配布ファイルの構造に合わせて書いてください（Core Responsibilities、Collaboration、任意の Memory Focus、Key Principles）。
2. **ナレッジファイルを足す** — 起動時にペルソナが読む方法論を `core/knowledge/aidlc-<slug>-agent/` に置きます。
3. **ステージに結ぶ** — リードまたは支援する各ステージファイル（`core/aidlc-common/stages/<phase>/<slug>.md`）の `lead_agent` / `support_agents` frontmatter に slug を足し、再コンパイル（`bun .claude/tools/aidlc-graph.ts compile`）して `stage-graph.json` を再生成します。`stage-graph.json` を手で直さないでください。ビルド成果物です。次のコンパイルが手編集を上書きします（[ステージを足す](02-adding-a-stage.md#4-regenerate-the-harnesses-so-stage-graphjson-recompiles)）。これが動かすステップです。
4. **チームナレッジディレクトリを文書化する** — チームはスペース単位の `aidlc/knowledge/<slug>-agent/` に標準を足す、と書いておきます。エンジンはこのディレクトリを作りません。中身があるときにチームが作ります（スペースの `aidlc/knowledge/` は自由形式で、ブートストラップ時は空です）。
5. **手メンテの文書表を更新する** — Phase Participation 行列とエージェント→examples 表は自分では再生成しません（下の、自動では検証されないものを見てください）。

発見、intent-create、ステータスライン確認のコマンドまで含めたレシピ全体は [Contributing: Adding an Agent](../reference/11-contributing.md#adding-an-agent) です。足すのではなく、既存エージェントのツール、ティア、ステージ割り当てを変えるときは [Agent System: How to Modify an Agent](../reference/05-agent-system.md#how-to-modify-an-agent) です。

### 自動で検証されるもの

- `loadAgents()` は、次の呼び出しで `.claude/agents/` の新しい `.md` を発見します。コード編集も登録もありません。
- `name` または `display_name` が無いとパーサは投げ、ファイルと欠けたフィールドを指名します。
- エージェントは slug のアルファベット順で返るので、発見順はどのプラットフォームでも同じです。
- インテント作成は、空のスペース単位 `aidlc/knowledge/` ディレクトリを作ります。エージェントごとのサブディレクトリや README は種まきしません。
- ステータスラインは、導出したメタデータから display name を描きます。

### 自動では検証されないもの

- **ステージグラフへの参加。** `stage-graph.json` はエージェントを slug で参照します。結ばずにエージェントを足すと、存在しますが走りません。発見と起動は別ステップです。
- **ナレッジファイルの存在。** `examples` はエージェント→examples 表に載る推奨ファイル名です。作るものも検査するものもありません。実体は `aidlc/knowledge/<slug>-agent/`（スペース単位のナレッジ）に置きます。
- **手メンテの文書表。** [Agent System](../reference/05-agent-system.md#phase-participation) の Phase Participation 行列と、ナレッジ README テンプレートのエージェント→examples 表は手編集です。エージェントを足す同じ変更で更新してください。
- **エージェントファイルの本文。** パースされるのは frontmatter だけです。本文の散文は起動時にエージェント自身が読むので、配布の 14 に合わせて丁寧に書いてください。

---

## 次

[スコープ](04-scopes.md) — ある種類の仕事で、どのステージ（したがってどのエージェント）が走るかを決める。
