# エージェントを足す

エージェントはフレームワークの *誰が* です。領域、ツールの許可リスト、ティアを持つペルソナです。同梱のエージェント 14 は、プロダクト、デザイン、デリバリー、アーキテクチャ、AWS プラットフォーム、コンプライアンス、DevSecOps、開発、品質、パイプラインデプロイ、オペレーションをカバーする領域の専門家 11、レビュー専用 2、適応型ワークフローのコンポーザーです。フレームワークがカバーしていない領域がチームに要るとき（データガバナンスのレビュアーやモバイルの専門家など）、Markdown ファイル 1 枚を `core/agents/` に置くだけでペルソナを足します。TypeScript は無し。

この章はワークフローを歩きます。ペルソナファイルとは何か、frontmatter の判断、*見える* エージェントはまだ *動いていない* という二段の真実。フィールドごとの契約は Developer Reference へ下ろします。利用者の席からこれらのエージェントが誰かは、[User Guide — Agents](../guide/06-agents.md) です。

---

## ペルソナファイルとは何か、どこにあるか

エージェントはどれも `core/agents/<slug>-agent.md` の平らなファイル 1 枚です。上に YAML frontmatter、下に Markdown 本文。同梱ファイルは全部 `aidlc-` 接頭辞です（`aidlc-architect-agent.md`、`aidlc-developer-agent.md`）。足すファイルはあなたのもので、その接頭辞は要りません。同梱の 14 はフレームワークファイルとして扱ってください。アップグレードで上書きされるので、*既存エージェントが知ること* を寄せるのはファイルを直すのではなくチームナレッジです（[チームナレッジ](07-team-knowledge.md)）。本当に新しいペルソナは別の手です。新しいファイル、あなたが所有し、アップグレードを生き延びます。

frontmatter はフレームワークがパースする部分です。本文は、起動したときエージェントが自分について読む散文です。責任、協働、メモリの焦点、働く原則。機械が読むのは frontmatter だけです。本文はエージェント自身の枠付けで、同梱ファイルの構造に合わせて書きます。パッケージャは、必須の委譲ナレッジ事前検査をどのハーネス投影にも足します。

本物のエージェントの frontmatter です。書いた場所は `core/agents/aidlc-architect-agent.md`:

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

## frontmatter 契約と、する判断

フィールドごとのスキーマ全体はリファレンスです。ここでは、書くときに実際にする判断です。

**`name` はファイル名ステムと一致しなければなりません。** `aidlc-data-governance-agent.md` のファイルは `name: aidlc-data-governance-agent` を宣言します。パーサはこのキーで引き、不一致はエージェントが決して解決しないいちばん簡単な書き方です。ローダーはファイル横断の重複したエージェント `name` を落とし、エラーで両方のファイルを指名します。

**エージェントは既定でセッションのツール一式を継ぎます。** 同梱 14 はどれも `tools:` 許可リストを宣言しないので、セッションが提供するどのツールにも届きます。`Read`、`Edit`、`Write`、`Glob`、`Grep`、`AskUserQuestion`、`Bash`、`WebSearch`、継いだ MCP ツールも同様です。ペルソナを狭めるには、使ってよいツールだけを指名する任意の `tools:` 許可リストを足します。`tools:` を列挙すると、指名したツールだけに狭まり、完全修飾の `mcp__<server>__<tool>` id も指名しない限り継いだ MCP ツールは落ちます（後述の MCP 継承の注）。領域が本当に小さい面を要する場合だけ手を伸ばしてください。たいていのペルソナは全部を継ぐのが最善です。

**MCP サーバーは継承であり、エージェントごとに付与しません。** プロジェクトルートの `.mcp.json` で宣言した 5 つの MCP サーバーはセッションに供給され、どのエージェントも全部を自動で継ぎます。エージェントごとの付与を書くものはありません。ペルソナをサーバーから *遠ざける* には、そのサーバーを省いた完全修飾の `mcp__<server>__<tool>` 一覧へ `tools:` 許可リストを狭めます（裸の `mcp__<server>` トークンは何もしません。サーバー単位の付与ではありません）。継承と制限の模型は `t110` のレジストリ完全性テストが行使します（[Testing](../reference/09-testing.md)）。

**`disallowedTools` は `Task` を含まなければなりません。** これは任意ではありません。エージェントは委譲された働き手として走ります。エンジンの `run-stage` ディレクティブが `mode: subagent` を運ぶとき、コンダクター（生きている `/aidlc` セッション）が `Task` 呼び出しをします。`Task` を許すと、エージェントが自分のサブエージェントを産み、フレームワークが防ぐ入れ子の委譲鎖になります。同梱のエージェントはどれも `Task` を禁じ、あなたのもそうしなければなりません。Kiro 投影はこの Claude 専用 frontmatter キーを外し、Kiro のネイティブエージェントツール設定で同じネスト委譲無しの境界を強制します。ほかの `disallowedTools` 値はパッケージを落とすか、プラグイン合成時にドロップログされます。

**`tier` は仕事の種類を指名します。パッケージャがハーネスごとのモデル / effort キーへ投影します。** コアエージェントの frontmatter に生の `model:` や `effort:` を書いてはいけません。それらは無視されるローカル `dist/<harness>/` 木と版付けされたリリース実行時の投影 **出力** で、`core/tools/aidlc-tiers.ts` のティア表から導きます。下流へ波及する多制約の推論 — 曖昧な意図の解釈、密な文脈の下でのアーキテクチャのトレードオフ — をするペルソナは `judgment` を選んでください。judgment エージェントはセッションのモデル *と* effort を継ぐので、黙って格下げされません。明示した基準に対して新しい入力を判断するレビュアー形のペルソナは `balanced` です。出力が主にパターン追従で、方法論がすでにエージェントのナレッジファイルに符号化されているときだけ `templated` です。デリバリー計画、CI/CD YAML、ランブックの足場など。`balanced` と `templated` はどちらも effort を `medium` へ下げます（Claude Code、Codex、opencode 上。Kiro、Cursor、Copilot では全ティアがセッションのモデルと effort を継ぐので、そこではティアは何も変えません）。いまのところ投影は同一です。セッション effort を継ぐのは `judgment` だけです。迷ったら `judgment` です。投影表（とプロジェクトの `tier_cap`）はあとでコストを下げられますが、低く書きすぎたペルソナは黙って推論不足になります。投影表の全体と cap の上書きは [Agent System](../reference/05-agent-system.md) です。

振る舞いではなく提示を駆動するフィールドがもう 2 つあります。`display_name` はステータスラインが描く人が読むラベルです（アーキテクトは "Architect Agent" と出ます）。`examples` はエージェント→例表に文書化した推奨ナレッジファイル名です。*利用者に面に出す提案* です。実行時は決して載せず、エンジンはディスクに書きません。

正確な必須 / 任意の表と共有設定マトリクスは [Agent System: Frontmatter Contract](../reference/05-agent-system.md#frontmatter-contract) です。

---

## 見えるは動いていない: 二段の真実

内面化する一点です。ファイルを置くとエージェントは *見える*。ステージに結ぶと *動く*。両方要ります。存在して決して走らないエージェントになります。

- **発見が見えるようにします。** `.claude/tools/aidlc-lib.ts` の `loadAgents()` は、次の起動で `.claude/agents/` の `.md` ファイル全部を読み、メタデータの写像を導きます。コード編集も登録手順も無し。ファイルがあることが登録です。ここからステータスラインは表示名を描け、チームはスペース単位の `aidlc/knowledge/<slug>-agent/` ディレクトリの下に標準を足せます。
- **ステージの結びが動かします。** ステージは frontmatter の `lead_agent` / `support_agents` フィールドでリードと支援エージェントを slug で指名します（`.claude/tools/data/stage-graph.json` へコンパイルされます）。どこかのステージがあなたの slug を参照するまで、どの `run-stage` ディレクティブもそれを指名せず、コンダクターはペルソナへ委譲しません。

これはフレームワークの中核の非対称を映します。ステージがエージェントを指名し、エージェントは自分のステージを指名しません。だからエージェントファイルだけでは、設計どおり惰性です。新しいペルソナを働かせるには、使うべきステージを直します。結びの仕組みは [ステージを足す](02-adding-a-stage.md) です。

各エージェントは、`core/knowledge/aidlc-<slug>-agent/` に書くナレッジディレクトリ（フレームワークの方法論）と、任意のチーム重ね（スペース単位の `aidlc/knowledge/<slug>-agent/`、あなたの標準）も対になります。スペース単位の `aidlc/knowledge/` ディレクトリは自由形式で、ブートストラップ時は空です。チームが中身を持つときエージェントごとのサブディレクトリを作ります。エンジンは足場を作りません。二層ナレッジのワークフローは [チームナレッジ](07-team-knowledge.md) です。

---

## 手順

リファレンスのレシピを映し、端から端までのワークフローです。

1. **エージェントファイルを作る** — `core/agents/<slug>-agent.md` に必須 frontmatter: `name`、`display_name`、`examples`、`description`、`disallowedTools`（`Task` を含む）、`tier`。任意の `tools:` 許可リストはペルソナを狭めます。省略するとセッションのツール一式を継ぎます。任意の `maxTurns: <n>` はエージェントのターン予算を上限します。Claude Code では拘束、opencode のネイティブ `steps:` キーへ投影、Codex CLI、Cursor、GitHub Copilot、両方の Kiro 面では惰性（ペルソナ散文のみ）です。これらはエージェントごとの cap キーを出しません（Codex の TOML emit はペルソナの frontmatter 引用を書き換え、kiro エージェント JSON はキーを決して受け取りません。未知フィールドで fail-close します）。レビュー専用エージェント 2 つがきょう同梱します（対の慣習はレビュアーペルソナの `## Turn Budget` 節）。
   本文は同梱ファイルの構造に合わせて書いてください（Core Responsibilities、Collaboration、任意の Memory Focus、Key Principles）。
2. **ナレッジファイルを足す** — 起動時にペルソナが載せるべき方法論を `core/knowledge/aidlc-<slug>-agent/` の下に。
3. **ステージに結ぶ** — リードまたは支援する各ステージファイル（`core/aidlc-common/stages/<phase>/<slug>.md`）の `lead_agent` / `support_agents` frontmatter に slug を足し、再コンパイル（`aidlc engine graph compile`）して `stage-graph.json` を再生成します。`stage-graph.json` を手で直さないでください。ビルド成果物です。次のコンパイルが手編集を上書きします（[ステージを足す](02-adding-a-stage.md#4-ハーネスを再生成しstage-graphjson-を再コンパイルする)）。これが動かす手順です。
4. **チームナレッジディレクトリを文書化する** — チームが標準をスペース単位の `aidlc/knowledge/<slug>-agent/` の下に足すことを注記します。エンジンはこのディレクトリを作りません。チームが中身を持つときに作ります（スペースの `aidlc/knowledge/` は自由形式で、ブートストラップ時は空です）。
5. **手で保つ文書の表を更新する** — Phase Participation マトリクスとエージェント→例表は自分では再生成しません（下の、検証しないもの）。

発見、intent-create、ステータスライン検証のコマンド付きのレシピ全体は [Contributing: Adding an Agent](../reference/11-contributing.md#adding-an-agent) です。足すのではなく既存エージェントのツール、ティア、ステージ割り当てを変えるなら [Agent System: How to Modify an Agent](../reference/05-agent-system.md#how-to-modify-an-agent) です。

### 自動で検証されるもの

- `loadAgents()` は次の起動で `.claude/agents/` の新しい `.md` ファイルをどれでも発見します。コード編集も登録も無し。
- パーサは `name` または `display_name` が無いと投げ、ファイルと欠けたフィールドを指名します。
- エージェントは slug のアルファベット順で返るので、発見順はどのプラットフォームでも同一です。
- Intent 作成は空のスペース単位 `aidlc/knowledge/` ディレクトリを作ります。エージェントごとのサブディレクトリや README は種にしません。
- ステータスラインは導出したメタデータから表示名を描きます。

### 自動では検証しないもの

- **ステージグラフの参加。** `stage-graph.json` はエージェントを slug で参照します。そこに結ばずにエージェントを足すと、存在しますが決して走りません。発見と起動は別の手順です。
- **ナレッジファイルの存在。** `examples` はエージェント→例表に文書化した推奨ファイル名です。作るものも検査するものもありません。本物の中身は `aidlc/knowledge/<slug>-agent/`（スペース単位のナレッジディレクトリ）の下に置きます。
- **手で保つ文書の表。** [Agent System](../reference/05-agent-system.md#phase-participation) の Phase Participation マトリクスと、ナレッジ README テンプレートのエージェント→例表は手で直します。エージェントを足す同じ変更で更新してください。
- **エージェントファイルの本文。** パースされるのは frontmatter だけです。本文の散文は起動時にエージェント自身が読むので、同梱 14 に合わせて丁寧に書いてください。

---

## 次

[スコープ](04-scopes.md) — ある種類の仕事でどのステージ（したがってどのエージェント）が走るかを決める。
