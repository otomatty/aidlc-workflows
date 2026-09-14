# 貢献

## 概要

この実装への貢献を歓迎します。この案内は前提、開発の流れ、テスト、変更の出し方です。

> **パスの慣例。** 以下の `<record>/` は、作ったインテントのレコードディレクトリ、
> `aidlc/spaces/<space>/intents/<YYMMDD>-<label>/` — インテントごとの状態、監査
> シャード、ナレッジ、成果物がある場所です。

## 前提

- **Claude Code** — ネイティブ導入（推奨、自動更新）: macOS / Linux / WSL は `curl -fsSL https://claude.ai/install.sh | bash`。Windows PowerShell は `irm https://claude.ai/install.ps1 | iex`。または `brew install --cask claude-code`。（[Claude Code の文書](https://code.claude.com/docs/en/quickstart)）
- **bun** — ビルド、パッケージ、テスト、書いた TypeScript 正本の直接実行、局所生成した `dist/<harness>/` 投影の利用に必須。ネイティブリリース実行時は入れた `aidlc` コマンドを使います。導入は `curl -fsSL https://bun.sh/install | bash`。Windows は `powershell -c "irm bun.sh/install.ps1 | iex"`。
- **timeout**（GNU coreutils） — テストスイートの LLM タイムアウト（L2 / L3）に必須。Linux には最初からあります。macOS は `brew install coreutils` のあと gnubin を PATH に足します: `export PATH="/opt/homebrew/opt/coreutils/libexec/gnubin:$PATH"`（`~/.zshenv` か `~/.zshrc`）。
- **Bash** — POSIX 互換ラッパ（`tests/run-tests.sh`）向けに任意。主ランナーは `bun tests/run-tests.ts` です。実行時、配布フックのどれも Bash を要求しません。
- **Bedrock アクセス** — ライブの integration と e2e（L2 / L3）に必須。L1 のプロトコルテストには不要です。

クローンしたあと、パッケージャ、型検査、テストが使うピン留め開発依存を入れます。

```bash
bun install --frozen-lockfile
```

## リポジトリ構造

```
core/                # Hand-authored, harness-neutral source (tools, stages, agents, rules, knowledge, hooks)
harness/<name>/      # Per-harness authored surfaces; claude/, kiro/, kiro-ide/, codex/, opencode/, copilot/
scripts/package.ts   # The build: materializes ignored local projections (`--check` builds twice and compares)
scripts/build-binaries.ts # Release-only compiled CLI artifacts in ignored build/binaries/ after package --check
dist/<harness>/      # GENERATED + ignored: dist/claude/, dist/kiro/, dist/kiro-ide/, dist/codex/, dist/opencode/, dist/copilot/ — never hand-edit or commit
tests/               # All-TypeScript test suite (t*.test.ts, run via bun)
docs/                # Documentation
  guide/             # User guide (how to use AI-DLC)
  harness-engineering/  # Harness engineer guide (configure AI-DLC without code)
  reference/         # Developer reference (how it works internally)
```

アーキテクチャ全体は [reference/01-architecture.md](01-architecture.md) です。

## 開発の流れ

1. **`main` からフォークとブランチ**し、`bun install --frozen-lockfile` を走らせる（`main` は統合ブランチかつ PR 対象）
2. **アーキテクチャを読む** — [reference/01-architecture.md](01-architecture.md) が実行モデル、エージェント委譲、フックを説明します
3. **入口を理解する** — 決定論的エンジン `core/tools/aidlc-orchestrate.ts`（サブコマンドはちょうど 5 つ: `next`、`continue`、`report`、`park`、`team-board`。`continue` は内部の操舵輸送、`team-board` は読み取り専用の Team Construction 照会）がルーティングを持ちます。コンダクター `harness/claude/skills/aidlc/SKILL.md` は薄い転送ループで、ディレクティブに従います。規範となるエンジン / ディレクティブ / コンダクター / スウォーム契約は [The Skill System](17-skill-system.md) です
4. **変更する** — ハーネス非依存の正本は `core/`（ツール、ステージ、エージェント、フック、ルール、ナレッジ）、ハーネス面は `harness/<name>/`（オーケストレータスキル、設定）。そのあと `bun scripts/package.ts` で gitignore した局所の `dist/` と `dist-release/` ルートを実体化します。どちらも手で触らず、コミットもしない。`package.ts --check` はディスク上のそれらの木を無視し、完全な投影集合を独立した一時ルートで二度ビルドし、結果をバイト比較します
5. **テストする** — 出す前に `bun tests/run-tests.ts`
6. **出す** — `main` への PR

リリース用バイナリ成果物は `dist/` の一部ではなく、パッケージャも作りません。`bun scripts/package.ts --check` がきれいなあと、ネイティブ成果物なら `bun scripts/build-binaries.ts`、リリース行列なら `--all-targets` を足します。スクリプトは実行ファイルを `build/binaries/<target>/` に書き、そのターゲットの `runtime/<harness>/` に生成配布一式を置き、`build/binaries/build-results-<target>.json` を書きます。ビルドホストで実行できる対象は、センサー、グラフコンパイル、検証、生成面の検査、プラグイン選択 / 合成、オーケストレーション、通常ボルトと自律スウォームの合成、パッケージ済み実行時の不変、フック、ステータスライン、アダプタ、明示プロジェクトルーティング、doctor JSON、init dry-run、versions / プラグイン一覧、Unix 補完、パッケージ検証を、`PATH` に `bun` 実行ファイルが無くても回します。横断成果物は検査ゲートを受け、明示 `UNVERIFIED` と印されます。ホスト実行の成果物は `VERIFIED` です。置いた `runtime/<harness>/` の木は読み取り専用のフォールバックです。可変コマンドは入れたプロジェクトハーネスを対象にします。ゲートが一つでも落ちたらビルドは失敗です。

対象バイナリが揃ったあと、`bun scripts/package-release.ts` が局所投影を再生成して検証し、`dist-release/` を版付き `aidlc-runtime-X.Y.Z.tar.gz` に梱包し、`version.json`、`checksums.txt`、`install.sh`、`install.ps1` を出します。対象ごとの `runtime/` ディレクトリはスモークゲートのステージングです。リリースデータのアーカイブは、それらのサイドカーからコピーせず、新しく生成したネイティブ投影から作り直します。`--require-release-matrix` は対象 7 すべてと、各バイナリに一致する検証記録を要求します。生成した平らなディレクトリが、インストーラとリリース梱包道具が消費する契約です。

リリースワークフローは意図して候補を保ちます。検証とインストーラ lint が先。対象ネイティブジョブがバイナリと証拠を作り、`package-release.ts` が一度走って `release-candidate` を作り、ステージングジョブがチェックサムして署名せずにアップロードし、Unix / Windows の寿命ジョブがそのバイトを消費します。`publish` は候補を再検証して証跡し、出したバンドルを足し、完全な目録を検証し、`attested-release` 成果物を一つアップロードします。`release` はタグとチェックサムを再検査し、このリポジトリで `GITHUB_TOKEN` 付き GitHub Release を作り、アップロードした資産目録を検証します。候補を再ビルド、再梱包、差し替えしないでください。

安定リリースは `.github/workflows/release.yml` の、押した版タグから始まります。隔離した `.github/workflows/preview-release.yml` ワークフローは、`main` からのプレビュービルドをスケジュールまたは手動ディスパッチし、呼び出し可能な CI でゲートし、`AIDLC_BUILD_VERSION` を押し、注釈タグのプレリリースを公開します。これは決して "latest" ではありません。プレビューは UTC 日につき高々一度です。スケジュールと手動実行は `release-preview` ワークフロー並行を共有します。あとの実行はリリースを再読みし、その日にすでに公開プレビューがあれば、`main` が進んでいても飛ばします。変わっていないソースも飛ばします。下書きと孤児タグは日次枠を消費しません。計画器は空いている id で再試行でき、その `.N` カウンタはその日の追加公開リリースを認可しません。

安定とプレビューの公開は、それぞれ `release` と `preview` 環境を使い、独立に直列化します。一晩の公開時刻が日次上限にどう数えるかも含め、信頼設計全体は [Supply-Chain Security](19-supply-chain-security.md) です。

## テスト

スイートはすべて TypeScript（`t*.test.ts`、`bun` で実行）で、四階層 — `smoke`、`unit`、`integration`、`e2e` — です。三層ピラミッドに対応します（smoke + unit = L1 Protocol、integration = L2 Stage、e2e = L3 Acceptance）。ピン留め開発依存を入れたあと、L1 は外部サービスなしでローカルに走ります。ライブの integration と e2e は `claude` CLI（と Bedrock 資格）が要り、無いときはきれいに skip します。

**早見:**

```bash
# L1 Protocol -- runs in seconds, no dependencies
bun tests/run-tests.ts

# L2 Stage -- CI pipeline (requires claude CLI tool)
bun tests/run-tests.ts --ci

# L3 Acceptance -- release gate (requires claude CLI tool)
bun tests/run-tests.ts --release

# POSIX compatibility wrapper
bash tests/run-tests.sh --ci

# Individual levels
bash tests/run-tests.sh --smoke        # File structure validation
bash tests/run-tests.sh --unit         # Hook behavior, stage content
bash tests/run-tests.sh --integration  # Cross-component and stage/CLI tests
bash tests/run-tests.sh --e2e          # Workflow, worktree, and terminal journeys
```

テスト戦略全体、スタブ、新しいテストの足し方は [reference/09-testing.md](09-testing.md) です。

## ディスパッチャ経路の変更

`core/tools/aidlc.ts` は、公開、隠し、ホスト専用コマンド経路のレジストリです。新しい経路は、振る舞いを偶然継がず、方針の次元をすべて宣言しなければなりません。

1. `projectRequirement`、`outputModes`、`visibility`、`networkPolicy`、`mutationScope` をセットする。
2. `pinPolicy` を意図して選ぶ。マシン寿命 / 管理は `active`、アクティブバイナリの診断と修理は `inspect`、プロジェクトエンジン振る舞いは `pinned`。
3. 経路を既存ツールへ写すか、ツールを `TOOLS` に足す。フック、ステータスライン、アダプタ、低層の委譲先は、公開別名ではなく経路だけのエントリを使う。
4. 経路と方針の断言を `tests/unit/t230-dispatcher-routes.test.ts` に足す。グローバルフラグの並びと、当たるときはコンパイル / 開発の揃えも含める。
5. 書いた散文がコマンドを呼ぶなら、`{{INVOKE}}` または `{{TOOL_PREFIX}}` を使い、コピー投影とネイティブ投影を分けたままにする。局所チャネル両方を再生成し、パッケージ決定論ガードを走らせる。

## 導入機構の変異を足す

init、寿命、ピン、プラグイン管理のプロジェクトとマシン変異は、`core/tools/aidlc-transaction.ts` を使わなければなりません。ルート相対で重ならない操作から `TransactionPlan` を組み立て、行き先の `expected` 状態と、copy / tree 操作のソースハッシュを含めます。意味検査は `validateCandidates` または `validateCommitted` に置き、成功したトランザクションが返ったあとに置かないでください。コミット済み検証器の失敗はトランザクションの一部なので、ロールバックします。

出荷前に故障注入カバレッジを足します。ステージングの前後、スナップショット、コミット、当たるときはコミット済み検証で失敗させ、以前のバイトとモードがすべて戻り、ロックが解放され、不完全なロールバックが名前付き復旧証拠を残すことを断言します。エンジンの型は `t243-install-mechanism.test.ts`、プロジェクト変異の例は `t224-plugin-selection.test.ts` と `t242-plugin-state.test.ts` です。

## ユーティリティハンドラの追加 {#adding-a-utility-handler}

> **監査イベントを足す前に**、[State Machine](12-state-machine.md) を読んでください。分類の全イベント、発行元、「同じコミット規則」が書いてあります。コードと章の表を同じ PR で更新しないと、ドリフトテストが落ちます。

ユーティリティハンドラは二種類です。

### 決定論的ハンドラ（こちらを優先）

LLM の推論が要らないハンドラ（テキスト表示、ファイルの読み / 整形、前提検査、ディレクトリ作成）です。

1. `core/tools/aidlc-utility.ts` にサブコマンドを足す
2. 意味のあるディスパッチャ名詞 / 動詞を登録し、SKILL.md から `aidlc engine <noun> <verb>`（またはその公開経路）で呼ぶ
3. タスク追跡は不要 — スクリプトは一秒未満で終わる
4. 監査ログはスクリプト内で `aidlc-audit.ts` の `appendAuditEntry` を使う（`**Event**:` の Markdown ブロックは手で書かない）
5. 動詞を `aidlc-utility` の usage 文字列に足す。生成 SKILL.md 領域を描くなら、この章に対応する `--check` ガードも書く

`--help`、`--version`、`--status`、`--doctor` が参照実装です。`--doctor` は `--export`（任意の `--output <dir>`）も受け、新しい doctor パスを走らせてから小さく秘匿した診断報告を書きます。共有の `DoctorFinding` モデルと報告組み立ては `core/tools/aidlc-doctor-bundle.ts` にあり、ライブ報告とエクスポート報告は同じ所見集合から取ります。

`codekb-path`、`codekb-snapshot`、`codekb-publish`、`codekb-scope-diff` は**直接ユーティリティ動詞**です。ステージ散文は `bun <harness-dir>/tools/aidlc-utility.ts <verb>` を呼び、`/aidlc <verb>` ではありません（`codekb-path` はディスパッチャ経由でも `aidlc engine workspace codekb` として届く）。`codekb-path` と `codekb-scope-diff` は読み取り専用です。`codekb-snapshot` は、中断した以前の CodeKB ディレクトリ入れ替えを復旧してから、ソース / ストア世代を返すことがあります。`codekb-publish` が共有ストアの唯一の書き手です。完全な 9 ファイル候補を検証し、スペース + リポジトリの compare-and-swap ロックの下でコミットします。どれも監査イベントを出さず、SKILL.md のタスク追跡も駆動しません。

`project-description` と `document-input` も同じ読み取り専用の直接ユーティリティ形です。消費するステージはどちらも先に `project-description` を呼びます。印のあるレコードは正確な `project-description.json` 文字列を復号し、印の無い 2.6.115 以前のレコードは明示的に古い `Project` 状態フィールドへ落ちます。選んだパスをネイティブのファイル書き込みツールで、アクティブレコードの固定輸送 `.aidlc-document-input-path` に書いたあと、`bun <harness-dir>/tools/aidlc-utility.ts document-input` を呼びます。利用者が選んだパスのバイトはシェルコマンドに入りません。ハンドラはプロジェクトルートの正確なパス一つを解決し、含まれるファイル身元を記録し、開いた記述子がそれに一致してから読みます。親ディレクトリの入れ替え、リダイレクト、未対応入力は拒否します。成功した読みは、DocumentKB と同じインラインの未信頼パス / 未信頼内容の通知を出します。

### LLM 駆動ハンドラ

エージェントの推論が効くハンドラ（ファイルシステム走査、判断）です。

1. **タスク追跡** — 論理ステップごとに `TaskCreate` でタスクを作り、進むにつれ `TaskUpdate`（`in_progress` → `completed`）で遷移する。Claude Code のタスクサイドバーを駆動します。
2. **ステータスライン更新** — アクティブインテントの `aidlc-state.md` があれば、一時的に `Current Stage` を走っているユーティリティの説明にする（例: `running health check`）。終わったら元に戻す。`aidlc-statusline.ts` フックがターミナルのステータスバー用にこのフィールドを読みます。
3. **監査ログ** — 適切な意味のネイティブディスパッチャ経路を呼ぶ。裏のハンドラが内部で `appendAuditEntry` を呼びます。LLM の散文から `**Event**:` の Markdown ブロックを手で書かない — [State Machine: Forbidden patterns](12-state-machine.md) を見てください。

`intent-create` ハンドラは完全に決定論的です。Initialization の 3 ステージ（workspace-scaffold、workspace-detection、state-init）は `aidlc-utility intent-create` 呼び出し一つで走ります。歓迎メッセージはセッション開始時に `settings.json` の `companyAnnouncements` で描き、ステージではありません。

## スコープの追加 {#adding-a-scope}

スコープはファイル（身元）と、ステージごとの所属タグで書きます。身元は `core/scopes/aidlc-<name>.md`、所属は `core/aidlc-common/stages/` の各ステージ frontmatter の `scopes:` 一覧です。`init`、`scope-change`、`resolve-env-scope`、`doctor`、状態ツールをまたぐ検証は、実行時に `.claude/scopes/*.md` から有効スコープ一覧を導きます（`core/tools/aidlc-lib.ts` の `validScopes()`）。EXECUTE / SKIP グリッドはステージごとの `scopes:` 一覧の転置で、`tools/data/scope-grid.json` にコンパイルします。スコープ追加に TypeScript の編集は要りません。

### 手順

1. **`core/scopes/aidlc-hotfix.md` を作る** — スコープの身元。frontmatter:
   - `name`（必須）: スコープ名。ファイル名のステムと一致すること。
   - `depth`（必須）: `Minimal` | `Standard` | `Comprehensive`。
   - `keywords`（任意）: `/aidlc <自由文>` 自動判定の NL 引き金。平らな文字列一覧はブロック（`- item`）でもフロー（`[item, item]`）でもよい。単語境界照合、スコープ名のアルファベット順でタイブレーク。空一覧は推論から外れる。5 語を超える説明は、コアの高特異性許可リストからの陽性一致が要る。プラグイン固有トークンは長さヒューリスティックを保つ。[スコープ自動判定](../guide/05-scopes-and-depth.md#auto-detection-from-freeform-intent) を見てください。
   - `description`（任意）: `/aidlc --help` と SKILL.md のコンパイル済みスコープ表に出る一行要約。
   - `testStrategy`（任意）: 深度と独立したテスト戦略の上書き。省略時は深度に合わせる。
   - `review_cap`（任意）: `adversarial` | `advisory` | `none`。このスコープのステージレビュークラスを上限する。無いときはスコープ単位の下げなし。上限はステージ宣言を下げられても上げられない。自律スウォームのレビューは対象外。
   - `runner`（任意）: `true` で既定の生成ランナー集合に入れる。
   - `freeform_default`（任意）: 優先するコア既定（`classic`）が有効でないとき、このスコープを指名する。主張できる有効スコープは高々一つ。グラフコンパイルは曖昧な選択プラグイン集合を拒否する。未知の明示 `AWS_AIDLC_DEFAULT_SCOPE` 値は検証に落ちる。
   - `change_control`（任意）: `strict` | `relaxed`。このスコープの新しいインテントが始める Change Control 既定。人が承認または確認したあと入力が変わったときの扱い（strict は承認を再開し、relaxed は変化を一度記録して続ける）。無いときは strict。`skeleton` と同じく検証する（ローダがファイルと二つの値を指名する）。メモリ層の `## Change Control` の `Mode: strict` は、どのスコープ既定にも勝ちます。

   本文は散文の意図です — 「なぜこれらのステージで、なぜあれを飛ばすか」。`validScopes()` は `.claude/scopes/*.md` の存在から導くので、ファイルが乗った瞬間にスコープは有効です。直したあと `/aidlc --doctor` を走らせ、構造の問題を拾います。

   ```yaml
   ---
   name: hotfix
   depth: Minimal
   keywords:
     - hotfix
     - urgent
   description: Urgent production fix
   runner: true
   ---

   # hotfix scope

   Lean path for the urgent production patch — regression test and deploy, nothing else.
   ```

2. **所属ステージにタグを付ける** — `hotfix` の下で走らせたい各ステージ（`core/aidlc-common/stages/<phase>/`）の frontmatter `scopes:` に `hotfix` を足す。タグしないステージはそのスコープで `SKIP` です。Initialization の 3 ステージ（`workspace-scaffold`、`workspace-detection`、`state-init`）は必ず含める — 常に走ります。

3. **再コンパイル + スコープ表の再生成** — `aidlc engine graph compile` が `scopes:` タグを `tools/data/scope-grid.json` へ転置します。次に `aidlc engine gen scope-table` が SKILL.md のコンパイル済みスコープ表向けの正 Markdown 領域を出します。`<!-- BEGIN: compiled ... -->` / `<!-- END: compiled ... -->` のあいだは生成のままにし、`aidlc engine graph compile --check` と `aidlc engine gen scope-table --check` で終了 0（ドリフトなし）を確認します。

4. **スコープが解決することを確認する** — `bun core/tools/aidlc-utility.ts intent-create --scope hotfix --project-dir /tmp/scope-smoke` が成功し、`Scope: hotfix` の状態ファイルを出すこと。

5. **`doctor` が環境既定として受け入れることを確認する** — `AWS_AIDLC_DEFAULT_SCOPE=hotfix aidlc doctor` が環境変数を有効と報告すること。

6. **キーワード推論を確認する**（`keywords` を埋めたとき） — `aidlc engine scope detect --from-text --input "urgent customer issue" --project-dir /tmp/scope-smoke` が `{"scope":"hotfix","source":"keyword","matches":["urgent"]}` を返すこと。

7. **計画の揃えを確認する**（任意だが推奨） — `AIDLC_GRAPH_RESOLVE=1 aidlc engine graph resolve hotfix --stdout` がそのスコープの計画を出します。EXECUTE 集合がタグしたものと合うかを目で見ます。

8. **スコープを意識した文書を更新する** — `docs/guide/05-scopes-and-depth.md`（スコープ参照全体。Stage-by-Scope Matrix のマスは `tests/unit/t244-scope-matrix-doc-sync.test.ts` がコンパイル済み `scope-grid.json` に対してドリフト検査する）、`docs/guide/13-customization.md`（有効値一覧とスコープ表）、`docs/reference/03-orchestrator.md`（スコープとステージの対応）はどれもスコープを明示列挙します。この章末尾のドキュメント方針どおり、同じ PR で更新します。

9. **スコープルーティングのワークフローテストを足す** — 既存スコープと違う振る舞いがあるなら（新しいフェーズ飛ばし、新しい深度の組み合わせ）、`tests/e2e/t53.test.ts`（sdk スコープルーティング）か `tests/e2e/t-tui-t50-bugfix-scope.serial.test.ts`（tui スコープ通し）を型にしたルーティング旅のテストを足します。

### 自動で検証されるもの

- `.claude/scopes/aidlc-hotfix.md` が乗った瞬間に `validScopes().has("hotfix")` は `true` を返します。検証箇所はどれもこのヘルパを使います。
- エラーメッセージはコード変更なしで、新しいスコープをアルファベット順に列挙します。
- `/aidlc --doctor` は `AWS_AIDLC_DEFAULT_SCOPE=hotfix` を有効として扱います。
- 飛行中のワークフローで `aidlc-utility scope-change --scope hotfix` は新しいスコープを受けます。
- 転置のドリフト検査: ステージの `scopes:` タグを直して `scope-grid.json` を再コンパイルしないと、`aidlc-graph compile --check` がビルドを落とします。SKILL.md のコンパイル済みスコープ表には独自の `--check` ドリフト検査があります（t67）。
- 自由文 `/aidlc <text>` のキーワード判定は、各スコープの `keywords` を `.claude/scopes/*.md` の frontmatter から読みます。独自の NL 引き金を持つカスタムスコープは、`keywords` 一覧を埋めた瞬間に自動判定します（SKILL.md の変更は不要）。推論を飛ばすなら、いままでどおり `--scope hotfix` を明示できます。

### 自動では検証されないもの

- 誤字したスコープ名の `scopes:` タグでもコンパイルは通ります。誰も聞かないグリッド列ができるだけで、本物のスコープからそのステージが静かに落ちます。ガードレールは `/aidlc --doctor` とスコープごとのテストです。
- ステージ飛ばしの意味（`PHASE_SKIPPED` イベント）。`tests/integration/t39.test.ts` は既知スコープ名 9 をスコープごとのループにハードコードしています。その一覧を伸ばすまで新しいスコープは走りません。同じ PR でループに新しいスコープを足してください。

## ステージの追加 {#adding-a-stage}

ステージは YAML frontmatter 付き Markdown として `core/aidlc-common/stages/<phase>/<slug>.md` に書きます。コンパイラは frontmatter を `tools/data/stage-graph.json` に読み、ランナー生成器はコンパイル済みステージ一覧から、コアステージ向けの打てる `/aidlc-<slug>` スキルを出します（プラグイン所有のステージはプラグイン接頭辞付きの裸スラッグ）。拡張契約は「ステージを足すにはステージファイルを書く」です。登録のためのエンジン編集は要りません。エンジンはコンパイル済みグラフでルーティングするからです。（フィールド参照全体と本文の三区画は Harness Engineer Guide の [Anatomy of a Stage](../harness-engineering/01-anatomy-of-a-stage.md) と [Adding a Stage](../harness-engineering/02-adding-a-stage.md)。スキーマは [Stage Definition](15-stage-definition.md) です。）

### 手順

1. **ステージファイルを書く** — `core/aidlc-common/stages/<phase>/<slug>.md` を作る。frontmatter は `slug`、`phase`、`execution` / `condition`、`lead_agent` と任意の `support_agents`（エージェントスラッグ）、`mode`（`inline`、`subagent`、`pipeline`、`mob`。`agent-team` は予約で未実装）、`consumes` / `produces`（成果物語彙の名前）、ユニットごとに条件付きでだけ書く成果物の `optional_produces`（ユニットごとのカバレッジ対象外）、`requires_stage`（順序エッジ）、所属の `scopes:` 一覧、結ぶ `sensors:`、ユニットごとに反復するなら `for_each`、（ユニット単位ステージでは）任意の `produces_kinds` マップで produces 成果物を各ユニットの kind に絞る。本文はステージの三区画です。フィールド契約全体は [Stage Definition](15-stage-definition.md) です。

2. **グラフを再コンパイルする** — `aidlc engine graph compile` が新しい frontmatter を `tools/data/stage-graph.json` に読み、`scopes:` タグを `tools/data/scope-grid.json` へ転置します。`aidlc engine graph compile --check` で終了 0（ドリフトなし）を確認します。次に `aidlc engine gen stage-table` と `aidlc engine gen scope-table` で生成 SKILL.md 鏡を更新し、`aidlc engine gen stage-table --check` と `scope-table --check` がどちらも終了 0 であることを確認します。ステージはすぐ `aidlc engine orchestrate next --stage <slug> --single` で走れます。

3. **ランナーを再生成する** — `aidlc engine gen runners` が、コンパイル済みの走れるステージごとに `/aidlc-<slug>` ランナースキルを出します。新しいステージは手書きなしで打てるコマンドを得ます。`aidlc engine gen runners --check` で、ディスク上のランナー集合がコンパイル済みステージ集合と合うことを確認します（ドリフト検査。ブートストラップの Initialization ステージは設計どおり除外）。

4. **ステージがルーティングされることを確認する** — そのステージを含むスコープのワークフローで `aidlc engine orchestrate next` を回し、エンジンがあなたのスラッグを指名する `run-stage` ディレクティブを、解決済み `lead_agent`、ゲート、`consumes`、`produces` 付きで出すことを確認します。

5. **スコープとステージを意識した文書を更新する** — 新しいステージはステージ数とスコープごとの計画を変えます。`docs/guide/05-scopes-and-depth.md`（Stage-by-Scope Matrix。マスは `tests/unit/t244-scope-matrix-doc-sync.test.ts` がドリフト検査する）、`docs/reference/16-artifact-vocabulary.md`（Initialization 以外のステージ数）、Harness Engineer Guide のステージ章、計画を列挙するスコープ参照を更新します。この章末尾のドキュメント方針どおり、同じ PR でやります。

6. **テストを足し、カバレッジを更新する** — ステージの振る舞いに `t*.test.ts` を書く（スイートは発見するので、適切な階層ディレクトリに落とせばランナーには十分です。レジストリ行は足しません）。次に `bun tests/gen-coverage-registry.ts` でカバレッジ索引を再生成し、`bun tests/gen-coverage-registry.ts --check` がきれいなことを確認します。ステージランナーのドリフト検査 `tests/unit/t129-stage-runner-drift.test.ts` は生成ランナー集合がコンパイル済みステージ集合と等しいことを主張し、`tests/integration/t55-test-suite-drift.test.ts` は古いパスとマーカーを掃きます。

### 自動で検証されるもの

- **グラフ上の位置。** `compile` した時点で、ステージのエッジ（`requires_stage`、`consumes`、`produces`）は解決され順序が付きます。ディスク上の `stage-graph.json` が frontmatter からずれると `compile --check` がビルドを落とします。
- **生成ステージ表。** SKILL.md の Stage Graph 表はコンパイル済み `stage-graph.json` から描きます。生成領域がずれると `aidlc-utility stage-table --check` が落ちます（t32）。
- **スキーマ + 参照。** `aidlc-graph.ts compile` は `aidlc-stage-schema.ts` で各ステージの frontmatter を検証し、`/aidlc --doctor` は `validateStageFrontmatter` に加え、すべての `lead_agent` / `support_agents` / `consumes` スラッグが解決する「Graph references」検査を再走します。
- **ランナーの揃え。** コンパイル済みステージにランナーが無い、または消えたステージにランナーがある、と `aidlc-runner-gen.ts check`（と t129）が落ちます。

### 自動では検証されないもの

- **コンパイラが知らない新しい frontmatter キー。** スキーマが実装していないキーが欲しいのはフレームワーク変更です。データを読むコードを直すので、この手順ではなくエンジン / コンパイルパイプラインの経路です。[Stage Definition](15-stage-definition.md) の予約キー名前空間は、将来の構造拡張が予測どおり着地するためです。
- **文書の列挙。** `docs/` をまたぐステージ数とスコープごとの計画表は手で維持します。同じ PR で更新してください（下のドキュメント方針）。

## エージェントの追加 {#adding-an-agent}

エージェントのメタデータ（表示名、例のナレッジファイル）は `core/agents/` の各 `.md` frontmatter から読みます。`core/tools/aidlc-lib.ts` の `loadAgents()` がそのディレクトリのすべての `.md` を発見し、ステータスラインフックが消費するメタデータマップ（表示名の描画）を導きます。エージェント追加に TypeScript の編集は要りません。

### 手順

1. **エージェントファイルを作る** — 必須 frontmatter 付きで新しい `core/agents/<slug>-agent.md` を置く。

   ```yaml
   ---
   name: <slug>-agent
   display_name: <Human-Readable Name>
   examples:
     - example-knowledge-file-one.md
     - example-knowledge-file-two.md
   description: >
     One-paragraph description of the agent's responsibilities and which stages it leads or supports.
   disallowedTools: Task
   tier: judgment
   ---
   ```

   `name` はファイル名のステムと正確に一致します。`display_name` はステータスラインが使う人向けラベルです。`examples` はエージェント → examples 表に書いた推奨ナレッジファイル名です。利用者への提案であり、実行時には載せず、ディスクにも書きません。`tier`（`judgment` | `balanced` | `templated`）はパッケージャが各ハーネスの model / effort キーへ投影する書く側のダイヤルです。コア frontmatter に生の `model:` / `effort:` は書かない（[Agent System](05-agent-system.md)）。

2. **エージェントが発見されることを確認する** — `bun -e "import { loadAgents } from 'core/tools/aidlc-lib.ts'; console.log(loadAgents().find(a => a.slug === '<slug>-agent'));"` が新しいエージェントのメタデータを出すこと。

3. **インテント作成がスペースナレッジディレクトリを作ることを確認する** — `bun core/tools/aidlc-utility.ts intent-create --scope poc --project-dir /tmp/agent-smoke` が空のスペース単位 `aidlc/knowledge/` ディレクトリ（そのスペースの `intents/` の兄弟）を作ること。作成はエージェントごとのサブディレクトリや README を種まきしません。チームが中身があるときに自分で `aidlc/knowledge/<slug>-agent/` を作ります。

4. **ステータスラインが描画することを確認する** — `Active Agent: <slug>-agent` の状態ファイルを種まきし、ステータスラインフックを呼ぶ。出力の `--` 区切りのあとに表示名が入ること。

5. **エージェントをステージへ配線する** — リードまたはサポートすべき新しいエージェントは、`core/aidlc-common/stages/<phase>/` のステージ `.md` の `lead_agent` / `support_agents` に名前を書きます。そのあと `aidlc engine graph compile`（ドリフト検査は `compile --check`）で、その frontmatter から `tools/data/stage-graph.json` を再生成します。`stage-graph.json` は手で触らない — コンパイル成果物であり、次の `compile` が手修正を上書きします。発見とは別です。`loadAgents()` が見えるようにし、ステージ frontmatter（グラフへコンパイル）が動かすようにします。

### 自動で検証されるもの

- `loadAgents()` は次の呼び出しで `.claude/agents/` の新しい `.md` をどれでも発見します。コード編集は不要です。
- `name` か `display_name` が無いとパーサは投げ、ファイル名と欠けたフィールドを指名します。
- エージェントはスラッグのアルファベット順で返るので、どのプラットフォームの `readdirSync` 順でも同じ出力です。
- インテント作成は空のスペース単位 `aidlc/knowledge/` ディレクトリを作ります（エージェントごとのサブディレクトリや README は種まきしません）。
- ステータスライン描画は同じメタデータ源から表示名を導きます。
- `tests/unit/t61.test.ts` はフィクスチャエージェントに対し、五つの性質を端から端まで主張します。

### 自動では検証されないもの

- **ステージグラフへの参加。** ステージ frontmatter は `lead_agent` / `support_agents` でエージェントをスラッグ指名し、`aidlc-graph.ts compile` がそれを `stage-graph.json` へ運びます。どのステージ frontmatter にも名前を書かずにエージェントを足すと、エージェントは存在するが走りません。ステージグラフのスキーマ検証（`core/tools/aidlc-stage-schema.ts`）は配線済みです。`aidlc-graph.ts compile` は各ステージの frontmatter を検証し（CI のドリフト検査は `compile --check`）、`/aidlc --doctor` は同じ `validateStageFrontmatter` に加え、すべての `lead_agent` / `support_agents` スラッグが解決する「Graph references」検査を再走します。
- **ナレッジファイルの存在。** `examples` はエージェント → examples 表に書いた推奨ファイル名の一覧です。作られも検証されもしません。実体は利用者が `aidlc/knowledge/<agent>/`（スペース単位のナレッジディレクトリ）に置きます。
- **エージェントを列挙する文書の表。** `docs/reference/05-agent-system.md:119-131` のフェーズ参加マトリクスと、`core/knowledge/aidlc-shared/knowledge-readme-template.md:16-29` のエージェント → examples 表は手で維持します。エージェントを足す同じ PR で更新してください（下のドキュメント方針）。
- **`.claude/agents/<new-agent>.md` の本文。** パースするのは frontmatter だけです。本文の散文（Core Responsibilities、Collaboration、任意の Memory Focus、Key Principles）は起動時にエージェント自身が読みます。既存エージェントファイルの構造に合わせて書いてください。

## ドキュメント方針

ファイル、ディレクトリ、コマンド、フラグを足す、消す、改名するときは:

1. `docs/` と `README.md` を grep し、古い参照を探す
2. 同じコミットですべての参照を更新する

## 権限方針 {#authority-policy}

計画承認、レビュー、ゲート、Unit 寿命のレシートは、内容とステージ試行に結びます。プロンプトを出したディレクティブの身元にも、イベント順にも結びません。二つの規則は [`12-state-machine.md`](12-state-machine.md#authority-invariants) にあります。出す前に、次に答えてください。

1. この変更は、指紋、世代、レシート身元のどれかに入力を足すか。その入力が検出する、人に見える変化を名指す。人の動作がそれを変えないなら（`next` の再実行、探り、状態照会、マーカー書き直し、メタデータ刷新）、身元には入らない。出自として記録する。
2. この変更は照会経路を書き込みにするか。`next`、Stop フックの探り、経路検査、`--status`、`--doctor`、`team-board` は権限状態を決して書かない。エンジン観察者はさらに、耐久書き込み原語で型付き障壁に当たるので、事故の書きは黙らず大きく失敗する。
3. この変更はガードに証拠を消させるか。ガードの一手は拒否だけ。拒否を表すためにレシート、挑戦、マーカーを消さない。記録したものを撤回するのは、明示の人の判断だけ。
4. この変更は `aidlc-state.md` にフィールドを足すか。新しいフィールドは既定でアクティブディレクティブに結ぶ。状態ダイジェストから外すのは、そのフィールドをキャッシュとして意図して分類することであり、項目 1 と同じ名付けが要る。

## 変更の提出

1. 何が変わりなぜかをはっきり書いた PR を `main` へ出す
2. L1 テストが通ること: `bash tests/run-tests.sh`
3. フックの変更なら: `bash tests/run-tests.sh --unit`
4. 統合テストなら: `bash tests/run-tests.sh --integration`（`claude` CLI が要る）
5. ファイル、コマンド、フラグに効く変更なら文書を更新する（上のドキュメント方針）
6. 指紋、世代、レシート身元のどれかに入力を足すなら、それが検出する人に見える変化を名指す（上の権限方針）
