# Initialization Phase Stages (0.1-0.3)

## Phase Overview

Initialization は AI-DLC ワークフロー 5 フェーズの先頭です。ステージ 0.1 から 0.3 を走らせ、**インテントを作り**、レコードディレクトリを `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` に発行します（以下 `<record>/`）。状態ファイル、スコープに入るフェーズごとのディレクトリ、ワークスペース分類、ルーティング設定がそこに載ります。足場コマンドは別途ありません。ワークスペースシェルは `dist/<harness>/` にあらかじめ組み込まれており、エンジンは最初の `/aidlc`（または作りたいことを書いたとき）で最初のインテントを自動作成します。

このフェーズの 3 ステージはどのスコープでも走ります。条件付きステージはありません。承認ゲートも無く、すべて自動進行です。

ウェルカムメッセージはセッション開始時に `settings.json` の `companyAnnouncements` で出します。ステージではありません。ステージファイルも、監査イベントも、チェックボックスもありません。

3 ステージは、決定論的な `bun .claude/tools/aidlc-utility.ts intent-create --scope <scope>` の 1 呼び出しの中で走り、1 秒もかかりません。コンダクターはサイドバーに 3 タスク（Workspace Scaffold、Workspace Detection、State Init）を作って観測できるようにし、ツールが返ったら全部完了にします。

## Scope-Driven Stage Inclusion

| Scope | Stages Included |
|-------|----------------|
| enterprise | All 0.1-0.3 |
| feature | All 0.1-0.3 |
| mvp | All 0.1-0.3 |
| poc | All 0.1-0.3 |
| bugfix | All 0.1-0.3 |
| refactor | All 0.1-0.3 |
| infra | All 0.1-0.3 |
| security-patch | All 0.1-0.3 |
| classic | All 0.1-0.3 |
| workshop | All 0.1-0.3 |
| express | All 0.1-0.3 |

## Stage Summary

| Slug | # | Stage Name | Condition | Lead Agent | Mode |
|------|---|------------|-----------|------------|------|
| workspace-scaffold | 0.1 | Workspace Scaffold | ALWAYS | (orchestrator) | auto-proceed |
| workspace-detection | 0.2 | Workspace Detection | ALWAYS | (orchestrator) | auto-proceed |
| state-init | 0.3 | State Initialization | ALWAYS | (orchestrator) | auto-proceed |

---

## Stage 0.1 — Workspace Scaffold

| Field | Value |
|-------|-------|
| Stage # | 0.1 |
| Slug | workspace-scaffold |
| Phase | Initialization |
| Lead Agent | (orchestrator) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed (no approval gate) |

### Steps
1. 必要なら `<record>/` ディレクトリを作る
2. スコープが走らせるフェーズごとに成果物ディレクトリを作り、加えて `<record>/verification/` を作る
3. スペース単位の空ディレクトリ `aidlc/knowledge/` を作る（自由形式。エージェントごとのサブディレクトリも README も無い）
4. インテントの `audit/` シャードディレクトリのヘッダを作り、`WORKFLOW_STARTED` を出す
5. `STAGE_STARTED` + `WORKSPACE_SCAFFOLDED` + `STAGE_COMPLETED` イベントを追記する

### Inputs
- なし（入口）

### Outputs
- スコープが走らせるフェーズごとに成果物ディレクトリ 1 つ: `<record>/initialization/`、および EXECUTE ステージを 1 つ以上持つ `ideation/`、`inception/`、`construction/`、`operation/`。スコープが外したフェーズにはディレクトリを作らない（bugfix のレコードに `ideation/` は無い）。ステージごとのサブディレクトリもここでは作らない。ステージのディレクトリは、そのステージが初めて成果物を書いたときに現れる
- `<record>/verification/`（どのスコープでも作る）
- スペース単位の空ディレクトリ `aidlc/knowledge/`（そのスペースの `intents/` の兄弟）
- インテントの `audit/` シャードディレクトリ（ヘッダ + セッション + 足場イベント）

### Notes
- 冪等 — 既にあるディレクトリとファイルは飛ばす
- LLM 経由ではなく、`aidlc-utility intent-create` の中で走る

---

## Stage 0.2 — Workspace Detection

| Field | Value |
|-------|-------|
| Stage # | 0.2 |
| Slug | workspace-detection |
| Phase | Initialization |
| Lead Agent | (orchestrator — deterministic rule-based scanner) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed (no approval gate) |

### Steps
1. プロジェクト直下を 1 段歩き、既知のソースディレクトリ（`src/`、`app/`、`lib/`、`pages/`、`components/`、`tests/`）があればそれも見る。トップレベルの合図が無いときは、名前が任意のサブディレクトリにも同じ合図セットで 1 段降りる。コンテナフォルダ（例: `wordbook/`）にネストしたプロジェクトを、誤って greenfield と判定しないため
2. 拡張子ごとにファイルを数え、第一言語と第二言語を決める
3. 既知の設定ファイル名からフレームワークを検出する（Next.js、Vite、Angular、Nuxt、Remix、Gatsby、Astro、Svelte、NestJS）。React は `package.json` の dependencies から
4. マニフェストとロックファイルからビルドシステムを検出する（npm/yarn/pnpm/bun/poetry/uv/hatch/pip/cargo/go/maven/gradle/composer/bundler）
5. `.gitmodules` があれば宣言されたサブモジュールパスを読み、それぞれ初期化済みかを調べる
6. `stages/initialization/workspace-detection.md` の規則で greenfield か brownfield かを分類する
7. `STAGE_STARTED` + `WORKSPACE_SCANNED` + `STAGE_COMPLETED` イベントを追記する

### Inputs
- プロジェクトのファイルシステム（読み取り専用スキャン）

### Outputs
- ワークスペース分類（greenfield / brownfield）
- 技術スタック（言語、フレームワーク、ビルドシステム）
- スキャン結果を載せる `WORKSPACE_SCANNED` 監査イベント

### Notes
- `aidlc-utility intent-create` の中の決定論的スキャナとして走る。LLM サブエージェントへの委譲は無い
- シンボリックリンクは辿らない（`lstatSync` による循環防止）
- 除外: `.claude/`、`<record>/`、`node_modules/`、`.git/`、`dist/`、`build/`、`.next/`、`target/`、`vendor/`
- `package.json` に `devDependencies` しか無いものはツール／足場とみなし、それだけでは brownfield にしない
- 解析できる `.gitmodules` にサブモジュールパスが 1 件でもあれば brownfield の合図になる（サブモジュールディレクトリが未初期化でも、リポジトリメタデータがコードを宣言している）。未初期化のときはスキャンが警告し、`git submodule update --init --recursive` を名指しする。`WORKSPACE_SCANNED` イベント（`Submodules` 欄 + `Details` の対処）と作成時の stdout に出し、コンダクターが伝えられるようにする。言語はそのままスキャン結果

---

## Stage 0.3 — State Initialization

| Field | Value |
|-------|-------|
| Stage # | 0.3 |
| Slug | state-init |
| Phase | Initialization |
| Lead Agent | (orchestrator) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed (no approval gate) |

### Steps
1. 状態契約を読む
2. スコープ写像、深度、テスト戦略を当てる
3. greenfield なら `reverse-engineering` を SKIP にする
4. 完全な `<record>/aidlc-state.md` を書き、Initialization の次の最初のステージを `[-]` にする
5. `STAGE_STARTED` + `WORKSPACE_INITIALISED` + `STAGE_COMPLETED` イベントを追記する

### Inputs
- workspace-detection のワークスペース分類（同じツール呼び出し）
- スコープ設定（`--scope` フラグ、`AWS_AIDLC_DEFAULT_SCOPE`、または既定の `classic`）
- 渡されていれば深度 / テスト戦略の上書き
- `.claude/knowledge/aidlc-shared/state-template.md` の状態契約
- コンパイル済み `tools/data/stage-graph.json` と `tools/data/scope-grid.json`

### Outputs
- `<record>/aidlc-state.md`（全部埋めたもの）
- `WORKSPACE_INITIALISED` 監査イベント

### Notes
- brownfield プロジェクトは reverse-engineering（ステージ 2.1）へ回す
- greenfield プロジェクトは Initialization の次の最初のステージへ回す（feature / poc は intent-capture。bugfix / refactor / express は requirements-analysis。classic / workshop は practices-discovery。どちらも Ideation を全部飛ばし、greenfield では reverse-engineering を SKIP に落とす）
- `/aidlc-init`（明示の作成パッケージ）から呼ばれたときは、オーケストレータはこのステージで止まる
- ワークフロー開始（`/aidlc <scope>`、または作りたいことの記述）から呼ばれたときは、オーケストレータは Initialization の次の最初のステージへ続く

---

## Re-initialization

再初期化フラグはありません。最初のインテント作成はインテントごとに一度です。ワークスペースシェル自体はあらかじめ組み込まれており、足場を作り直すことはありません。やり直すなら新しいインテントを作る（それぞれ自分の `<record>/` を持つ）。まっさらにするなら、アクティブなインテントのレコードディレクトリを `aidlc/spaces/<space>/intents/` の下で退避し、エンジンに新しいものを作らせます。既存インテントの上での 2 回目の `/aidlc` は、再初期化ではなく再開です。

## Notes

- 3 ステージとも自動進行 — Initialization フェーズに承認ゲートは無い
- 決定論的な初期化ツールが完了したステージを報告する。エンジンは `Current Stage`、状態のチェックボックス、監査イベントを原子的に更新する
- コンダクターは Initialization のライフサイクル状態を直接編集しない
- Initialization → Ideation のフェーズ遷移に、ガバナンス境界検査は無い

## Cross-References

- [Architecture](../01-architecture.md) — 実行モデルの概要
- [Orchestrator](../03-orchestrator.md) — ルーティング論理
- [Stage Protocol](../04-stage-protocol.md) — 状態追跡の規則
- [Ideation Stages](ideation.md) — 次のフェーズ
