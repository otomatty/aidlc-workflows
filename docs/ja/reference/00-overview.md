# Developer Reference の概要

> [AI-DLC ドキュメント](../README.md) の一部 · [User Guide](../guide/00-introduction.md) · [Harness Engineer Guide](../harness-engineering/00-overview.md) · **Developer Reference**

このリファレンスは、AI-DLC の内部構造と実装を書きます。対象は、コードそのものを直す人です。オーケストレータ、フック、CLI ツール、ステージグラフのコンパイル、監査の分類、テストスイートです。

AI-DLC を**使って**ソフトウェアを作るなら、先に [User Guide](../guide/00-introduction.md) です。設定だけで**振る舞いを寄せる**（ステージやエージェントを足す、スコープを定義する、ルールやセンサーを書く、チームナレッジを足す）なら [Harness Engineer Guide](../harness-engineering/00-overview.md) です。そちらはデータの変更であり、コードの変更ではありません。作業の流れを先に書き、網羅的なスキーマはこちらへ戻します。

> **このリファレンスのパス。** AI-DLC は一度書いてハーネスごとに生成するので、ファイルの呼び方は意図で三つに分かれます。
> - **`core/…`** — 手で書く、ハーネス非依存の**正本**（例: `core/tools/aidlc-orchestrate.ts`、`core/aidlc-common/stages/`）。直すのはここです。*どこで書いたか / どこを変えるか* を言うときは `core/` です。
> - **`dist/<harness>/…`** — **生成され、コミットされ、ドリフト検査される**配布（`dist/claude/.claude/`、`dist/kiro/.kiro/`、`dist/kiro-ide/.kiro/`、`dist/codex/`、`dist/opencode/`、`dist/copilot/`）。手では触りません。`bun scripts/package.ts` がバイト一致で作り直します。*出荷物* を説明するときだけ出します。
> - **`<harness-dir>/…`**（例: `.claude/`、`.kiro/`、`.codex/`） — *入れた*プロジェクト内の**実行時**の場所。コマンドが走り、ワークフロー中にフレームワークが読み書きします（`bun .claude/tools/aidlc-graph.ts compile`、`loadAgents()` が `.claude/agents/` を読む）。ディレクトリはハーネスのパラメータです。
>
> 裸の `.claude/` が出てきたら、Claude ハーネス専用の実行時パスと読んでください。同じファイルは `core/` に書き、各ハーネス自身のディレクトリへ出荷します。

## このリファレンスの範囲

| 章 | 内容 |
|----|------|
| [Architecture](01-architecture.md) | 5 層モデル、[設定レイヤ](01-architecture.md#configuration-layers) の振り分け原則、実行モデル、設計判断 |
| [Plane Architecture](02-plane-architecture.md) | コントロール / データ / マネジメントプレーンの分離と境界 |
| [Orchestrator](03-orchestrator.md) | SKILL.md のコンダクター。転送ループ、ゲートの儀式、それが駆動する状態機械 |
| [Stage Protocol](04-stage-protocol.md) | 振る舞いの契約。承認ゲート、コンプライアンスチェックリスト |
| [Stages](04-stages/) | フェーズごとのステージ文書（5 ファイル） |
| [Agent System](05-agent-system.md) | エージェントの構造、frontmatter 契約、設定マトリクス |
| [Hooks and Tools](06-hooks-and-tools.md) | フック、CLI ツール、91 種の監査イベント |
| [Sensor System](07-sensor-system.md) | センサーマニフェストのスキーマ、PULL import、発火モデル、既定の重大度 |
| [Rule System](08-rule-system.md) | ルールファイルの配置、スコープ導出、層チェーンの解決、衝突ゲート |
| [Testing](09-testing.md) | テストピラミッド、階層、スタブ、フィクスチャ、テストレジストリ |
| [Knowledge System](10-knowledge-system.md) | 二層アーキテクチャ、DocumentKB の派生カタログ、読み込み順、テンプレート |
| [Contributing](11-contributing.md) | 開発の流れ、ユーティリティハンドラのチェックリスト、ドキュメント方針 |
| [State Machine](12-state-machine.md) | ワークフロー / フェーズ / ステージ機械、91 種の分類、監査先行の規則 |
| [Runtime Graph](13-runtime-graph.md) | コンパイル済み `runtime-graph.json`。ステージグラフのデータプレーン鏡 |
| [Harness Primitives Mapping](14-claude-features.md) | AI-DLC の概念が、各ハーネスのネイティブ能力にどう対応するか（Claude Code を詳しく） |
| [Stage Definition](15-stage-definition.md) | YAML frontmatter 契約、本文の三区画、コンパイルパイプライン |
| [Artifact Vocabulary](16-artifact-vocabulary.md) | 命名規則、衝突方針、ファイルシステム対応、現行レジストリの見方 |
| [Engine and Skill System](17-skill-system.md) | オーケストレーションエンジン（`next` / `report` / `park`）、型付きディレクティブ契約、コンダクター、複数スキル、スコープの形、スウォームの審判 |
| [Plugin Mechanism](18-plugin-mechanism.md) | AIDLC プラグイン。マニフェスト、導入時に本物のホストプラグインとして合成、加算の寄与シーム、マルチテナントのガード、現状。書き方は [harness-engineering/10](../harness-engineering/10-authoring-a-plugin.md) |
| [Diagrams](diagrams.md) | Mermaid 図を一箇所に集めたもの |
| [Agents](agents/) | エージェントの技術リファレンス（frontmatter、ツール、ステージ所有） |

## 読み方

- **新しい関心（ルール、方法論、ナレッジの事実）はどこへ置くか。** [Architecture: Configuration layers](01-architecture.md#configuration-layers) です。著者 × 消費の二軸と境界テストで、正しいファイルへ振り分けます。
- **ステージを足す？** [Stage Protocol](04-stage-protocol.md)、該当フェーズの [Stages](04-stages/)、それから [Contributing](11-contributing.md) です。
- **ステージ定義の形式を変える？** ステージの `.md` を触る前に [Stage Definition](15-stage-definition.md) です。形式はデータ駆動で、実行時はコンパイル済み JSON を読みます。
- **成果物を足す、または改名する？** [Artifact Vocabulary](16-artifact-vocabulary.md) です。命名規則、安定方針（改名・削除は major、追加は minor）、現行一覧は `bun aidlc-graph.ts artifacts`。レジストリはステージファイルから派生し、手では書きません。
- **スコープを足す？** [Contributing: Adding a Scope](11-contributing.md#adding-a-scope) です。スコープはファイルで書きます。`.claude/scopes/aidlc-<name>.md` と、所属ステージへの `scopes:` タグ。TypeScript は不要です。
- **エージェントを足す？** [Contributing: Adding an Agent](11-contributing.md#adding-an-agent) です。エージェントは `.md` の frontmatter によるデータ駆動です。TypeScript は不要です。
- **エージェントを直す？** [Agent System](05-agent-system.md) と、[Agents](agents/) のそのファイルです。
- **フックを触る？** [Hooks and Tools](06-hooks-and-tools.md) と、フックのテスト型は [Testing](09-testing.md) です。
- **オーケストレータを変える？** [Orchestrator](03-orchestrator.md) と [Architecture](01-architecture.md) です。監査イベントを足す・変えるなら、先に [State Machine](12-state-machine.md) です。合わせないとドリフトテストに捕まります。

## User Guide との関係

User Guide（`docs/guide/`）は、AI-DLC が**何をするか**と**使い方**です。この Developer Reference は、**どう動くか**と**どう変えるか**です。両方に出る話題もあります。

| 話題 | User Guide | Developer Reference |
|------|-----------|-------------------|
| エージェント | 何をするか、いつ出るか | frontmatter 契約、追加・変更の仕方 |
| ナレッジ | 社内標準の足し方 | 読み込み順の内部、テンプレート |
| フック | 何がログに残るか | フック実装、監査イベントの分類 |
