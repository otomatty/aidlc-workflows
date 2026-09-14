# 初期化フェーズのステージ（0.1–0.3）

## フェーズ概要

初期化フェーズは、AI-DLC ワークフローの五フェーズの最初です。ステージ 0.1 から 0.3 を走り、**インテントを作り**、レコードディレクトリを `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`（以下 `<record>/`）に鋳造します。状態ファイル、スコープ内フェーズごとのディレクトリ 1 つ、ワークスペース分類、ルーティング設定付きです。別の足場コマンドはありません。ワークスペースの殻は、入れたまたは版付けされた `runtime/<harness>/` 投影にあらかじめ同梱され、エンジンは最初の `/aidlc`（または何を作るかを述べたとき）で最初のインテントを自動作成します。

このフェーズの 3 ステージはどのスコープでも走ります。条件付きステージはありません。どのステージも承認ゲート無しで自動進行します。

歓迎メッセージはセッション開始時に `settings.json` の `companyAnnouncements` 項目経由で描かれます。ステージではありません。ステージファイルも、監査イベントも、チェックボックスもありません。

3 ステージはすべて、1 回の決定論的な `aidlc-utility.ts intent-create --scope <scope>` 呼び出しの中で走り、1 秒未満で終わります。コンダクターは観測のためにサイドバーへタスク 3 つ（Workspace Scaffold、Workspace Detection、State Init）を作り、ツールが返ったあと全部を完了にします。

## スコープ駆動のステージ包含

| スコープ | 含まれるステージ |
|-------|----------------|
| enterprise | 全部 0.1–0.3 |
| feature | 全部 0.1–0.3 |
| mvp | 全部 0.1–0.3 |
| poc | 全部 0.1–0.3 |
| bugfix | 全部 0.1–0.3 |
| refactor | 全部 0.1–0.3 |
| infra | 全部 0.1–0.3 |
| security-patch | 全部 0.1–0.3 |
| classic | 全部 0.1–0.3 |
| workshop | 全部 0.1–0.3 |
| express | 全部 0.1–0.3 |

## ステージ要約

| Slug | # | ステージ名 | 条件 | リードエージェント | Mode |
|------|---|------------|-----------|------------|------|
| workspace-scaffold | 0.1 | Workspace Scaffold | ALWAYS | (orchestrator) | auto-proceed |
| workspace-detection | 0.2 | Workspace Detection | ALWAYS | (orchestrator) | auto-proceed |
| state-init | 0.3 | State Initialization | ALWAYS | (orchestrator) | auto-proceed |

---

## ステージ 0.1 — Workspace Scaffold

| フィールド | 値 |
|-------|-------|
| Stage # | 0.1 |
| Slug | workspace-scaffold |
| Phase | Initialization |
| Lead Agent | (orchestrator) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed（承認ゲート無し） |

### 手順
1. 要るなら `<record>/` ディレクトリを作る
2. スコープが走る各フェーズの成果物ディレクトリと、`<record>/verification/` を作る
3. 空のスペース単位 `aidlc/knowledge/` ディレクトリを作る（自由形式。エージェントごとのサブディレクトリも README も無し）
4. インテントの `audit/` シャードディレクトリのヘッダを作り、`WORKFLOW_STARTED` を出す
5. `STAGE_STARTED` + `WORKSPACE_SCAFFOLDED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- 無し（入口）

### 出力
- スコープが走るフェーズごとの成果物ディレクトリ 1 つ: `<record>/initialization/`、および EXECUTE ステージを少なくとも 1 つ持つ `ideation/`、`inception/`、`construction/`、`operation/` のそれぞれ。スコープが外すフェーズはディレクトリを得ません（bugfix レコードに `ideation/` は無い）。ステージごとのサブディレクトリはここでは作りません。ステージのディレクトリは、最初に成果物を書いたときに現れます
- `<record>/verification/`（どのスコープでも作る）
- 空のスペース単位 `aidlc/knowledge/` ディレクトリ（スペースの `intents/` の隣）
- インテントの `audit/` シャードディレクトリ（ヘッダ + セッション + 足場イベント）

### 注
- 冪等 — すでに存在するディレクトリとファイルは飛ばす
- `aidlc-utility intent-create` の中で走る。LLM 経由ではない

---

## ステージ 0.2 — Workspace Detection

| フィールド | 値 |
|-------|-------|
| Stage # | 0.2 |
| Slug | workspace-detection |
| Phase | Initialization |
| Lead Agent | (orchestrator — 決定論的な規則ベースのスキャナ) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed（承認ゲート無し） |

### 手順
1. プロジェクトディレクトリを 1 レベル深く歩き、既知のソースディレクトリ（`src/`、`app/`、`lib/`、`pages/`、`components/`、`tests/`）があればそれも。トップレベルの信号が発火しないときは、同じ信号集合で任意名の各サブディレクトリへ 1 レベル入るフォールバックをし、コンテナフォルダに入れ子のプロジェクト（例: `wordbook/`）がグリーンフィールド誤分類されず検出されるようにする
2. 拡張子ごとにファイルを数え、第一 / 第二言語を決める
3. 既知の設定ファイル名でフレームワークを検出する（Next.js、Vite、Angular、Nuxt、Remix、Gatsby、Astro、Svelte、NestJS）。React は `package.json` の依存経由
4. マニフェスト + ロックファイルでビルドシステムを検出する（npm/yarn/pnpm/bun/poetry/uv/hatch/pip/cargo/go/maven/gradle/composer/bundler）
5. あれば `.gitmodules` を読み、宣言したサブモジュールパスを初期化について探る
6. `stages/initialization/workspace-detection.md` の規則でグリーンフィールド対ブラウンフィールドを分類する
7. `STAGE_STARTED` + `WORKSPACE_SCANNED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- プロジェクトのファイルシステム（読み取り専用スキャン）

### 出力
- ワークスペース分類（グリーンフィールド / ブラウンフィールド）
- 技術スタック（言語、フレームワーク、ビルドシステム）
- スキャン結果を捉える `WORKSPACE_SCANNED` 監査イベント

### 注
- `aidlc-utility intent-create` 内の決定論スキャナとして走る。LLM サブエージェント派遣は無し
- シンボリックリンクは辿らない（`lstatSync` によるサイクル保護）
- `.claude/`、`<record>/`、`node_modules/`、`.git/`、`dist/`、`build/`、`.next/`、`target/`、`vendor/` を除外
- `devDependencies` だけの `package.json` はツール / 足場として扱い、それだけではブラウンフィールド分類にしない
- パースできる `.gitmodules` にサブモジュールパス項目が少なくとも 1 つあることはブラウンフィールド信号です（サブモジュールディレクトリが未初期化でも、リポジトリメタデータがコードを宣言する）。サブモジュールパスが未初期化のとき、スキャンは警告し `git submodule update --init --recursive` を指名します。`WORKSPACE_SCANNED` イベント（`Submodules` フィールド + `Details` の手当て）と作成 stdout に面に出るので、コンダクターが中継できます。言語はスキャンどおりです

---

## ステージ 0.3 — State Initialization

| フィールド | 値 |
|-------|-------|
| Stage # | 0.3 |
| Slug | state-init |
| Phase | Initialization |
| Lead Agent | (orchestrator) |
| support_agents    | — |
| Execution | ALWAYS |
| Mode | Auto-proceed（承認ゲート無し） |

### 手順
1. 状態契約を読む
2. スコープ写像 + 深度 + テスト戦略を適用する
3. グリーンフィールドでは `reverse-engineering` を SKIP にする
4. 初期化後の最初のステージを `[-]` にした完全な `<record>/aidlc-state.md` を書く
5. `STAGE_STARTED` + `WORKSPACE_INITIALISED` + `STAGE_COMPLETED` イベントを追記する

### 入力
- workspace-detection からのワークスペース分類（同じツール呼び出し）
- スコープ設定（`--scope` フラグ、`AWS_AIDLC_DEFAULT_SCOPE`、または `classic` 既定）
- 渡されていれば深度 / テスト戦略の上書き
- `.claude/knowledge/aidlc-shared/state-template.md` の状態契約
- コンパイル済み `tools/data/stage-graph.json` と `tools/data/scope-grid.json`

### 出力
- `<record>/aidlc-state.md`（完全に埋まる）
- `WORKSPACE_INITIALISED` 監査イベント

### 注
- ブラウンフィールドプロジェクトは reverse-engineering（ステージ 2.1）へ経路する
- グリーンフィールドプロジェクトは初期化以外の最初のステージへ経路する（feature/poc は intent-capture。bugfix/refactor/express は requirements-analysis。classic/workshop は practices-discovery。どちらも Ideation 全部を飛ばし、グリーンフィールドでは reverse-engineering が SKIP へ格下げされる）
- `/aidlc-init`（明示の作成包装）から起動したときは、オーケストレータはこのステージのあと止まる
- ワークフロー開始（`/aidlc <scope>` または何を作るかを述べる）から起動したときは、オーケストレータは初期化後の最初のステージへ続く

---

## 再初期化

再 init フラグはありません。最初のインテント作成はインテントごとに一度走ります。ワークスペースの殻自体はあらかじめ同梱され、再足場されません。やり直すには新しいインテントを作る（それぞれ自分の `<record>/` を得る）、またはきれいな状態のためにアクティブなインテントのレコードディレクトリを `aidlc/spaces/<space>/intents/` の下へ退避し、エンジンに新しいものを作らせます。既存インテントの上の二通目の `/aidlc` は再初期化せず再開します。

## 注

- 3 ステージとも自動進行 — 初期化フェーズに承認ゲートは無い
- 決定論の初期化ツールは完了した各ステージを報告します。エンジンは `Current Stage`、状態チェックボックス、監査イベントを原子的に更新します
- コンダクターは初期化のライフサイクル状態を直接直しません
- Initialization → Ideation のフェーズ遷移に統治境界検査はありません

## 関連

- [Architecture](../01-architecture.md) — 実行モデルの概要
- [Orchestrator](../03-orchestrator.md) — ルーティングの論理
- [Stage Protocol](../04-stage-protocol.md) — 状態追跡の規則
- [Ideation Stages](ideation.md) — 次のフェーズ
