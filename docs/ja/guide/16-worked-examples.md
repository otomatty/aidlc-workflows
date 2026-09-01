# 実例

AI-DLC の通しを 2 本。バグ修正と機能追加です。コマンドの起動、ステージの進行、承認ゲート、成果物まで一通り出します。

> **ハーネスについての注。** このログは **Claude Code** で取っているので、その面 — `/aidlc` と、`Task` 呼び出しで出すサブエージェントステージ — が出ます。ステージの流れ、ゲート、成果物はどのハーネスでも同じです。違うのは出し方だけです（Kiro は `subagent` ツール、Codex は `codex exec` ワーカー）。[他ハーネスで動かす](harnesses/README.md) を見てください。

---

## バグ修正の通し

ユーザープロフィール API の NullPointerException を直す例です。**bugfix** スコープは 9 ステージ（Initialization 3 + 領域 6）を Minimal 深度で走ります。

### 起動

```
/aidlc bugfix
```

コンダクターが、何を直すかを聞きます:

> **What would you like to build?**

こう答えます:

> The user profile API returns HTTP 500 when the `display_name` field is null. The `GET /api/v1/users/:id/profile` endpoint crashes with a NullPointerException in `ProfileSerializer.serialize()`. This affects about 12% of user profiles created before display_name was made mandatory.

### 走るステージ

| # | ステージ | フェーズ | リードエージェント | モード |
|---|----------|----------|--------------------|--------|
| 0.1 | Workspace Scaffold | Initialization | orchestrator | inline（自動進行） |
| 0.2 | Workspace Detection | Initialization | orchestrator | inline（自動進行） |
| 0.3 | State Init | Initialization | orchestrator | inline（自動進行） |
| 2.1 | Reverse Engineering | Inception | aidlc-developer-agent + aidlc-architect-agent | pipeline |
| 2.3 | Requirements Analysis | Inception | aidlc-product-agent | inline |
| 3.5 | Code Generation | Construction | aidlc-developer-agent | subagent |
| 3.6 | Build and Test | Construction | aidlc-quality-agent | inline |
| 4.1 | Deployment Pipeline | Operation | aidlc-pipeline-deploy-agent | inline |
| 4.3 | Deployment Execution | Operation | aidlc-pipeline-deploy-agent + aidlc-developer-agent | inline |

### Initialization（ステージ 0.1–0.3）— 自動進行

Initialization の 3 ステージは、決定論的なツール呼び出し 1 回（`aidlc-utility intent-create`）の中で、1 秒もかからず、人の操作なしで走ります:

- **0.1 Workspace Scaffold** — 最初のインテントを自動作成し、レコードディレクトリを `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` に置く（以降は `<record>/` と書く）。`<YYMMDD>` は UTC の短い日付なので並びが時系列になる。`<label>` は依頼の短い kebab-case。正式 ID は `intents.json` のレジストリ行が持つ UUIDv7
- **0.2 Workspace Detection** — ルールベースのスキャンが Java 17、Spring Boot 3.2、Maven、brownfield と判定する
- **0.3 State Init** — `aidlc-state.md` をスコープ `bugfix`、深度 `Minimal` で初期化し、走る領域ステージに印を付ける

> Progress: 3/9 overall | 3/3 INITIALIZATION stages complete. Next: Reverse Engineering

### ステージ 2.1 — Reverse Engineering

2 段のパイプラインがコードベースを見ます。先に aidlc-developer-agent のコードスキャン、続けて aidlc-architect-agent が合成して成果物を書きます。リポジトリ向けの永続成果物 9 本が `aidlc/spaces/default/codekb/user-service/` に出ます:

| 成果物 | 中身 |
|--------|------|
| `business-overview.md` | ユーザーサービス — プロフィール、設定、認証トークン |
| `architecture.md` | Spring Boot モノリス、3 層設計 |
| `code-structure.md` | パッケージ 6 つ: controller、service、model、repository、serializer、config |
| `api-documentation.md` | `/api/v1/users/` 配下の REST エンドポイント 8 本 |
| `component-inventory.md` | コントローラ、サービス、リポジトリ、シリアライザの一覧 |
| `technology-stack.md` | Java 17、Spring Boot 3.2、PostgreSQL 15、Jackson 2.15 |
| `dependencies.md` | Maven の依存ツリー、第三者ライブラリ、版の拘束 |
| `code-quality-assessment.md` | テストカバレッジ 62%、基本的な CI |
| `reverse-engineering-timestamp.md` | スキャンした時刻と対象コミット |

**承認ゲート:**

```
Reverse Engineering complete. How would you like to proceed?
- Approve        -> Continue to Requirements Analysis
- Request Changes -> Provide revision feedback
```

**Approve** を選びます。

### ステージ 2.3 — Requirements Analysis

aidlc-product-agent のペルソナが載り、確認質問を `<record>/inception/requirements-analysis/requirements-analysis-questions.md` に書きます:

```markdown
## Q1: Bug Severity Classification
How severe is this bug for your users?
A. Critical — causes data loss or security exposure
B. High — blocks a core workflow for affected users
C. Medium — degraded experience but workaround exists
D. Low — cosmetic or minor inconvenience
X. Other (please specify)

[Answer]:
```

コンダクターがやり取りのモードを出します:

```
How would you like to answer these questions?
- Guide me        -> Walk through each question interactively
- I'll edit the file -> Fill in answers directly
- Chat            -> Discuss freely
```

**Guide me** を選び、答えは Q1 = High、Q2 = Username as fallback、Q3 = Handle null gracefully（移行なし）。

コンダクターが `requirements.md` を書きます。機能要件 3 つ（null の扱い、シリアライザの直し、フォールバック）と非機能要件 1 つ（応答時間の回帰なし）。

**承認ゲート:** **Approve** を選びます。

### ステージ 3.5 — Code Generation

コンダクターがコード生成の計画を作り、aidlc-developer-agent のサブエージェントに渡します:

**計画:**
1. `ProfileSerializer.serialize()` が null の `display_name` を扱えるようにする
2. null / 非 null のユニットテストを足す
3. `ProfileService.getProfile()` に防御チェックを入れる
4. API エンドポイントの統合テストを足す

計画を承認します。サブエージェントが 4 ステップ全部を実装します:

- **変更**: `ProfileSerializer.java`（null 安全、ユーザー名フォールバック）
- **変更**: `ProfileService.java`（防御的な null 処理）
- **新規**: `ProfileSerializerTest.java`（ユニットテスト 2 本）
- **新規**: `ProfileControllerIntegrationTest.java`（統合テスト 2 本）

**承認ゲート:** **Approve** を選びます。

### ステージ 3.6 — Build and Test

aidlc-quality-agent がビルドとテストを走らせます:

```
mvn clean compile        # BUILD SUCCESS
mvn test                 # 89 tests, 0 failures
mvn verify               # Integration tests pass
```

結果は `<record>/construction/build-and-test/test-results.md` に残ります。テスト 89 本すべて成功、失敗 0、カバレッジは 62% から 64% へ。

**承認ゲート:** **Approve** を選びます。

### ステージ 4.1 と 4.3 — デプロイ

Deployment Pipeline は既存のデリバリー設定を見て、デプロイ戦略、CD 設定、ロールバック手順を残します。このバグ修正は既存の対象環境を使うので、Environment Provisioning はスキップのままです。

承認のあと、Deployment Execution がそのパイプラインで検証済み成果物をデプロイし、スモークテストとヘルスチェックを走らせ、デプロイログを残します。最後のゲートを承認すると、ワークフローは完了です。

### 終わりの状態

```
aidlc/spaces/default/
  codekb/
    user-service/             # 9 space-level RE artifacts
  intents/260624-null-display-fix/
    aidlc-state.md            # All 9 stages marked [x]
    audit/                    # Full decision trail (per-clone shards)
    inception/
      requirements-analysis/ # requirements.md + questions
    construction/
      bugfix-null-display-name/
        code-generation/     # plan + summary
      build-and-test/        # instructions + test results
    operation/
      deployment-pipeline/   # CD config + strategy + rollback runbook
      deployment-execution/  # deployment log + smoke tests + health checks
```

ワークスペース直下のアプリケーションコード:
- `ProfileSerializer.java`（変更）
- `ProfileService.java`（変更）
- `ProfileSerializerTest.java`（新規）
- `ProfileControllerIntegrationTest.java`（新規）

### 押さえておく点

1. **領域ステージごとに承認ゲート** — 決めるのは常に人
2. **Minimal 深度** — 成果物は短く、直しを定義するのに要る質問だけ
3. **サブエージェントへの委譲** — 重い仕事（RE、コード生成）はサブプロセスで走り、人は承認する
4. **監査証跡が残る** — 判断はすべて ISO 時刻付きでログに残る
5. **セッション再開** — 途中で切れても、`/aidlc` が進行中の状態を見つける

---

## 機能追加の通し

タスク管理アプリ向けの通知サービスを作る例です。**feature** スコープは 33 ステージ全部を Standard 深度で走ります。この通しでは、各フェーズの要所だけを追います。

### 起動

```
/aidlc feature
```

> **What would you like to build?**

> A notification service for our task management app. Users should receive in-app notifications and optional email digests when tasks are assigned, due dates approach, or comments are posted. Support notification preferences per user.

### Initialization（ステージ 0.1–0.3）— 自動進行

Initialization の 3 ステージは `aidlc-utility intent-create` の中で自動に走ります。Workspace Detection の判定は TypeScript、Node.js 20、Express、PostgreSQL、既存のタスク／ユーザーサービスがある brownfield。

> Progress: 3/33 overall | Scope: feature, Depth: Standard

### Ideation フェーズ（ステージ 1.1–1.7）

**ステージ 1.1 — Intent Capture**（aidlc-product-agent）

aidlc-product-agent はまず、許されたソースの範囲を `intent-capture-questions.md` に残し、そのあと問題、対象ユーザー、ステークホルダー、決裁、コミュニケーション、スコープを聞きます:

```markdown
## Sources

- [desc] Initial description: "A notification service for our task management app..."
- [scope] Workflow-selected scope: `feature`.

## Q1. Which notification channels are in scope?
A. In-app only
B. In-app + email
C. In-app + email + push
D. In-app + email + push + SMS
X. Other

[Answer]: B. In-app + email
```

できた成果物では、主張のひとつひとつがその登録か、確認した答えに結びつきます:

```markdown
## Target Customer

Task-management users receiving assignment, due-date, or comment events. [desc]

## Notification Channels

In-app notifications and optional email digests are in scope. [Q1]

## Assumptions & Open Questions

None.
```

ステークホルダーマップも同じタグを `Source` 列に使います。裏付けの無い内容は追加質問になるか、`## Assumptions & Open Questions` に残ります。残す前提は明示の確認が要り、前提のままラベルされます。そのあと aidlc-product-lead-agent がソース接地をレビューし、通常の承認ゲートへ進みます。

**ステージ 1.4 — Scope Definition**（aidlc-product-agent）

スコープの境界を決めます。対象（トリガー種別 3 つ、ユーザー設定、メールダイジェスト）、対象外（プッシュ通知、SMS、リアルタイム WebSocket）。`scope-document.md` と、優先度付きの `intent-backlog.md` を出します。

**ステージ 1.7 — Approval & Handoff**（aidlc-delivery-agent）

Ideation の出力をまとめたイニシアティブブリーフを組み立てます。フェーズ境界検証が、インテントからスコープへのトレーサビリティを確認します。

> Progress: 10/33 overall | IDEATION complete. Verification Gate passed.

### Inception フェーズ（ステージ 2.1–2.9）

**ステージ 2.1 — Reverse Engineering**（パイプライン）

既存コードベースの 2 段スキャン。9 本の成果物を、リポジトリのスペース単位ストア `aidlc/spaces/<active-space>/codekb/<repo>/` に書きます。通知サービスが組み込む既存のサービス構造、DB スキーマ、API の型を拾います。

**ステージ 2.2 — Practices Discovery**（aidlc-pipeline-deploy-agent）

サブエージェントのハブ＆スポークです。aidlc-pipeline-deploy-agent が Reverse Engineering の証拠から下書きし、aidlc-quality-agent、aidlc-developer-agent、aidlc-devsecops-agent が、互いの寄与を見ずに並行で点検します。人へのインタビューで証拠の穴とポリシー判断を埋め、リードが 3 つの寄与を `team-practices.md`、`discovered-rules.md`、`evidence.md` に統合します。ゲートは **Approve** / **Request Changes** です。Approve のあと `practices-promote` が `aidlc/spaces/<active-space>/memory/team.md` と `project.md` を書き、確認した時刻と一致する `PRACTICES_AFFIRMED` レシートを原子的に残してから、コンダクターがステージ承認を報告します。昇格が無い、古い、失敗した、のいずれでもゲートは開いたままで、ステージは未完了です。

**ステージ 2.3 — Requirements Analysis**（aidlc-product-agent）

機能要件 12（通知トリガー、設定の CRUD、メール描画、ダイジェストのスケジュール）と非機能要件 5（配送遅延 5 秒未満、メール再試行、設定の保存）。質問は端まで掘ります。メール配送が失敗したら？ ダイジェストの頻度は？

**ステージ 2.4 — User Stories**（モブ）

aidlc-product-agent が先にペルソナとストーリーを下書きします。aidlc-design-agent、aidlc-developer-agent、aidlc-quality-agent が、互いに見えない協力者としてその下書きを点検し、身元付きの寄与ファイルを書きます。リードの aidlc-product-agent が 3 つの寄与を `personas.md` と `stories.md` に統合してから、**Approve** / **Request Changes** のゲートを出します。

**ステージ 2.6 — Domain Design**（aidlc-architect-agent）

aidlc-architect-agent が通知サービスのアーキテクチャを設計します:

- **コンポーネント**: NotificationService、PreferenceService、EmailRenderer、DigestScheduler — それぞれ振る舞いに、依存／被依存、所有する実体が付く
- **実体の所有**: NotificationService が Notification と NotificationEvent、PreferenceService が Preference
- **根拠**: イベント駆動のトリガー（ポーリングではなく）、メールキューに SQS（直接送信ではなく）。Rationale 節に残す

まとめた `components.md`（フェンス付き `yaml` カタログ + mermaid 図、要約、所有、根拠の表）と `decisions.md`（ADR ログ）を出します。

**ステージ 2.7 — Units Generation**（aidlc-architect-agent）

作業ユニット 3 つに分解します:

1. **notification-core** — イベントハンドラ、通知の保存、アプリ内配送
2. **notification-preferences** — 設定の CRUD API、既定の設定
3. **notification-email** — メール描画、SQS 連携、ダイジェストスケジューラ

`unit-of-work.md` に依存マップを出します。notification-core が先、preferences と email はそのあと並行。

**ステージ 2.8 — Contract Design**（aidlc-architect-agent）

システムが統合する 3 ユニットに分かれるので、Contract Design がユニット間の境界を固めます。notification-core が呼び出し側へ出す内部イベント契約と、notification-email が notification-preferences から取る設定参照契約。`contract-summary.md`（境界ごとに 1 行、それぞれにインラインの仕様ブロック）を出します。

**ステージ 2.9 — Delivery Planning**（aidlc-delivery-agent）

計画だけです。ボルト 1 は notification-core を出す（ウォーキングスケルトン — イベントハンドラのパイプラインを端から端まで通す）。ボルト 2 は notification-preferences と notification-email を一緒に出す。ボルトごとの DoD は `bolt-plan.md`、WSJF 風の根拠は `risk-and-sequencing-rationale.md`、外部の SES / SQS 依存は `external-dependency-map.md`。Construction エンジンはこの計画をウォーク順には使いません。実行時バッチは 2.7 の DAG からです。フェーズ境界検証が、要件とアーキテクチャの整合を確認します。

> Progress: 19/33 overall | INCEPTION complete. Verification Gate passed.

### Construction フェーズ（ステージ 3.1–3.7）

Construction の **既定ウォークは stage-major** です。2.9 のボルト計画はディスク上の計画のまま残り、エンジンは `unit-of-work-dependency.md` のユニットを歩きます。対象になる最初の Construction EXECUTE ステージ（ここでは 3.1）がウォーキングスケルトンのゲートで、そのあとのラダーが残りの *ステージ* ゲートを決めます。

**3.1 Functional Design** — 全ユニット（ウォーキングスケルトンのゲート）

コンダクターは notification-core、続けて notification-preferences、続けて notification-email の機能設計を走らせます（core が落ち着いたあと、後ろ 2 つは wave にもできます）。承認するのは、3 ユニットを覆うステージ単位のゲート 1 回です。Code Generation はまだ走っていません。

- **notification-core** — ドメイン実体（Notification、NotificationEvent）、業務ルール（重複排除、レート制限）
- **notification-preferences** — Preference 実体、既定値、チャネルの切り替え
- **notification-email** — あとのメールユニットが実装する配送アドレス規則

最初の Construction ゲートの直後に、**ラダープロンプト** が出ます:

```
The walking skeleton shipped. How should the remaining Bolts run?
  ▸ Continue autonomously
    Skip remaining Construction stage gates. Failures still halt and ask.
  ▸ Gate every Bolt
    Present an approval gate after each remaining Construction stage.
```

冒頭の設計の形は見えているので、**Continue autonomously** を選びます。コンダクターは `aidlc-state.md` に `Construction Autonomy Mode: autonomous` を残し、`AUTONOMY_MODE_SET` を出します。残りの設計ステージ（対象なら 3.2–3.4）は、ゲート無しで全ユニットに走ります。

**3.5 Code Generation** — 全ユニット。preferences と email はバッチになり得る

notification-core が先に生成します（ほかの封鎖を解く）。イベントハンドラ、通知リポジトリ、アプリ内配送エンドポイント。ソース 3 ファイル、テスト 4 ファイル。notification-preferences と notification-email は依存が満たされたバッチを共有するので、コンダクターは 1 ターンで `Task` を 2 本出し、**両方のコード生成ユニットを同時に**派遣します。

- **notification-preferences** — CRUD API、設定リポジトリ、検証。ソース 2 ファイル、テスト 3 ファイル。
- **notification-email** — メール描画、SQS コンシューマ、ダイジェストの cron。ソース 4 ファイル、テスト 5 ファイル。（このユニットの 3.2 / 3.4 成果物は、先の stage-major パスですでにあります。）

両方のサブエージェント Task が次のターンで戻ります。スウォームの下では、エンジンはこの最終バッチのあとに Code Generation のステージゲートを **1 回** 出します。中間バッチごとではありません。自律を選んでいるので、その残りのステージゲートは飛ばし、Construction は 3.6 へ進みます。

**失敗したときの姿。** たとえば `notification-email` の Code Generation が壊れた SES モックで戻ったとします。コンダクターは `notification-preferences` の完了を待ち、その成果物はディスクに残し、次を出します:

```
Unit notification-preferences succeeded. Unit notification-email failed during code generation:
  "SES client mock could not be constructed — check test config."

Options:
  ▸ Retry         Re-run notification-email from code generation.
  ▸ Skip          Mark notification-email skipped and continue. Dependents may also fail.
  ▸ Abort         Stop Construction. Resume via /aidlc --stage code-generation.
```

**Retry** を選び、モックの用意を直し、再実行するのは notification-email だけです。preferences はすでに `[x]` 完了です。

**ステージ 3.6 — Build and Test**（aidlc-quality-agent。全ユニットのあと一度）

ビルド手順を出し、3 ユニット全部のテスト一式を走らせます。テスト 47 本成功、失敗 0、カバレッジ 78%。

**ステージ 3.7 — CI Pipeline**（aidlc-pipeline-deploy-agent）

lint、build、test、セキュリティスキャンのステージで CI パイプラインを組む。品質ゲート: カバレッジ 75% 以上、重大な脆弱性なし。

> Progress: 26/33 overall | CONSTRUCTION complete. Verification Gate passed.

### Operation フェーズ（ステージ 4.1–4.7）

**ステージ 4.1 — Deployment Pipeline** — ヘルスチェックゲート付きのブルーグリーンデプロイ

**ステージ 4.2 — Environment Provisioning** — SQS キュー、SES 設定、通知保存用の DynamoDB テーブル

**ステージ 4.4 — Observability Setup** — 通知配送遅延、メール送信レート、デッドレターキューの深さの CloudWatch ダッシュボード。配送失敗のアラーム。

**ステージ 4.7 — Feedback & Optimization** — SLO 目標（アプリ内配送 99.9%、30 秒以内のメール配送 99%）、コスト分析、フィードバックループ文書。

> Progress: 33/33 overall | OPERATION complete. Feature workflow complete.

### バグ修正との主な違い

| 観点 | バグ修正 | 機能追加 |
|------|----------|----------|
| 走るステージ | 9 | 33 |
| 深度 | Minimal | Standard |
| フェーズ | Initialization + Inception + Construction + Operation | 5 つ全部 |
| 作業ユニット | 1 | 3 |
| Construction のウォーク | stage-major。ユニット 1 つ | ユニット 3 つにまたがる stage-major（2.9 はボルト 2 つを計画したまま） |
| 条件付きステージ | 大半をスキップ | 大半が走る |
| 承認ゲート | 4 | 最初の Construction EXECUTE ステージ + ラダー。残りのステージゲートは自律モード次第 |

---

## 次に読む章

- [スコープ・深度・テスト戦略](05-scopes-and-depth.md) — スコープがどのステージを走らせるか
- [ステージの走り方](04-phases-and-stages.md) — ステージプロトコルの詳細
- [エージェント](06-agents.md) — エージェントのペルソナと担当
- [成果物リファレンス](14-artifacts-reference.md) — 成果物ディレクトリの全体
