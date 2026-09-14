# テスト

## Overview

AI-DLC のテストスイートは **すべて TypeScript** です。どのテストも `bun` の下で走る `t*.test.ts` で、シェル（`.sh`）のテストファイルはゼロです。これが構成によるプラットフォーム不変の保証です。同じファイルが macOS、Linux、ネイティブ Windows で同じに走ります。

スイートは **4 レベル** — `smoke`、`unit`、`integration`、`e2e` — に分かれ、それぞれ `tests/` の下に 1 ディレクトリです。4 レベルは、速さと詳しさをバランスする古典的な 3 層テストピラミッドに対応します:

```
            /\
           /  \    ACCEPTANCE — full workflows, artifact + experience verification
          / L3 \   Level: e2e  ·  When: before releases (--release / --all)
         /------\
        /        \
       /   L2     \  STAGE — individual stages with stub input, verify artifacts
      /------------\ Level: integration  ·  When: CI push (--ci, every PR)
     /              \
    /      L1        \  PROTOCOL — contracts, structure, cross-references
   /------------------\ Levels: smoke + unit  ·  When: every local change
```

`--ci` プロファイルとフラグ無しの既定はどちらも **smoke + unit + integration** を走ります（したがって integration レベルは、ローカルの毎回の `bun tests/run-tests.ts` に乗ります）。`--release` / `--all` が `e2e` を足します。上のピラミッドは各レベルが概念上どこに座るかです。実際に選ぶのは下のプロファイルフラグです。

配布カバレッジは契約で分かれます:

- `t145-packaging-parity.test.ts` は、コピー、ネイティブ、プラグイン投影が、独立したきれいなパッケージャ実行 2 回で決定論的であることを証明します。
- `t238-build-binaries.test.ts` はスタンドアロンバイナリの閉包をコンパイルして探ります。ネイティブ経路、フック / アダプタ、プロジェクト変更、`PATH` 上に `bun` が無い最終導入レイアウトを含みます。
- `t242-plugin-state.test.ts` はホスト在庫の正規化、合成ハッシュ、トランザクション同期のロールバック、所有安全な prune を証明します。
- `t243-install-mechanism.test.ts` はアーカイブ拒否、共有トランザクションエンジンと復旧経路、プロジェクト init / refresh の所有、チェックサム、ライフサイクル、ピン、オフラインパッケージ、コピー / ネイティブ投影の分離を覆います。
- `t244-install-management.test.ts` は機械設定、更新発見、インストーラのハーネス選択、Windows ライフサイクル面、補完、リリースワークフローの候補連続を覆います。
- `t330-release-channel-grammar.test.ts` は閉じた stable / preview の version-id 文法、そのインストーラとライフサイクルのリテラル、ランチャーシムを通る preview 導入をピンします。
- `t331-preview-channel-lifecycle.test.ts` は `config --channel`、チャネルを意識した `update` と `update --check`、API 失敗を unavailable とすること、stable へ戻すこと、preview の保持、preview ピンを覆います。
- `t332-preview-release-pipeline.test.ts` は注釈タグのプレリリース公開、preview プランナとノート、計画レコードを覆います。UTC 日あたり公開 preview は最大 1 件という上限を、`main` が進んだあとや後の手動実行が始まっても、夜間公開のタイムスタンプを含めて検査します。変わっていないソースは飛ばします。下書きと孤立タグは、空いている id での再試行計画を許します。ワークフローのアサーションは、scheduled / 手動 preview から stable タグを隔離すること、共有 `release-preview` 並行、CI ゲートの祖先、チャネル固有の provenance 署名者、ビルドの刻印を覆います。

テストランナーは、テスト発見の前にプロセスロックの下ですべての投影を再生成するので、新鮮なクローンは既存の `dist/` バイトに依存しません。CI も、生成木を消費するジョブの前に明示のパッケージステップを走ります。バイナリとリリースのパッケージャは、`dist-release/` を読む前に自分で再生成と決定論検査をします。

リリース CI は Linux、macOS、Windows でネイティブ smoke を足し、7 つの対象成果物をそれぞれのネイティブランナーアーキテクチャでビルドし、両方の musl 探りを、Bun と Node.js が共有する文書化した `libgcc` と `libstdc++` 実行時前提を入れたあと、使い捨ての Alpine コンテナで実行します。musl マトリクスは `fail-fast: false` なので、CI がチェックサム検証した候補を 1 つ載せる前に、両方のアーキテクチャが報告します。Unix と Windows のライフサイクル旅程は、署名権限無しでそれらのバイトを消費します。ワークフローはそれからそれらを attest し、ワークフロー成果物を 1 つ上げます。`release` はタグとチェックサムを再検査し、ソースリポジトリに `GITHUB_TOKEN` で GitHub Release を作り、上げた資産在庫を候補と比べます。公開は候補を再ビルドも再パッケージもしません。

`tests/harness/release-fixture.ts` は、生成した投影マニフェストから決定論的なリリースディレクトリを作り、リダイレクト、遅延、切り詰め、キャプティブポータル、大きすぎるメタデータ、欠けた資産の故障を局所で出せます。フィクスチャを書くには `bun tests/harness/release-fixture.ts --output <dir>` です。通常のスイートはオフラインのままです。t243 を走るとき `AIDLC_RELEASE_CONTRACT_LIVE=1` をセットすると、公開リリースのメタデータとチェックサム契約検査へオプトインします。

決定論的な e2e スライス（`bash tests/run-tests.sh --debug -P 8 --e2e --filter "^t[0-9]"`）は CI で `--no-llm` 付きで走り、ローカル開発ループの既定は smoke + unit + integration です。merge、worktree、swarm 経路を触るブランチは、レビューラウンドの前にこのスライスもローカルで走らせてください。通常の Bolt と swarm 実行のあいだのモード境界回帰は、既定ティアでは見えません。

**ファイル名の約束。** テストのファイル名は `t<NN>[-description].test.ts` です — 住むレベルディレクトリと、任意の人向け説明だけ。名前に **機構セグメントはありません**。テストの機構（CLI を spawn するか、SDK を駆動するか、生きた TUI を描くか）は、本文が実際に呼ぶドライバから計算する *派生集合* であり、ファイル名では宣言しません。各テストが何を覆うかの機械検査インデックスは `tests/.coverage-registry.json`（ディスク上の `covers:` ヘッダから `tests/gen-coverage-registry.ts` が生成）にあり、ここで手で維持する表にはありません — 下の [Test Registry](#test-registry)。

## Layer 1: Protocol (every change, no LLM, seconds)

オーケストレータの構造上の正しさを、LLM を呼ばずに検証します。これらが通れば、プロトコルは内部で一貫しています — ステージは有効なファイルを参照し、入出力は正しく鎖になり、ルーティング表はステージファイルと一致します。

**Levels:** smoke、unit、integration

**What it tests:**
- ファイル存在、権限、命名規則（smoke）
- コピー / ネイティブ派遣を通るフックソース 17 すべて、ステージ frontmatter、ナレッジ在庫（unit）
- スコープ–ステージ対応、グラフ一貫性、ステージ I/O 契約の鎖、プロトコル遵守（integration）
- ステージ出力対ステップ検証: 宣言した出力がすべて命令ステップで参照される（integration。`aidlc-validate.ts` CLI ツール経由で決定論的）

**Run:** `bun tests/run-tests.ts`（既定。フラグ不要）。`bash tests/run-tests.sh` は既存 POSIX コマンド向けの互換ラッパです。

## Layer 2: Stage (CI push, LLM, minutes)

既知のワークスペース + 状態フィクスチャで、個々のステージを隔離して走ります。決定論的な入力を与えたとき、各ステージが正しい成果物を出すことを検証します。

**Levels:** integration

**What it tests:**
- プリフライトのヘルスゲート: PATH 上の Claude CLI、有効な AWS 資格情報、Claude が応答する（終了 0）、応答が空でない（preflight）
- CLI ツールのユーティリティハンドラ: intent-create、--doctor、--status、--stage、--phase（integration）
- グリーンフィールド / ブラウンフィールドスタブ付きの個々のステージ、成果物検証（integration）

**Run:** `bun tests/run-tests.ts --ci`

## Layer 3: Acceptance (release, LLM, hours)

ワークフロー全体を走り、体験を検証します。状態遷移を超えて、成果物の中身、ステージ横断の一貫性、領域の正しさを見ます。

**Levels:** e2e

**What it tests:**
- ブラウンフィールドスタブ + 成果物アサーション付きのバグ修正ライフサイクル全体
- グリーンフィールドスタブ + 成果物アサーション付きの POC ライフサイクル全体
- 状態進行、スコープルーティング、監査の完備、ジャンプ機構
- ステージ命令品質の LLM 意味レビュー（明瞭さ、論理の流れ、曖昧さ検出）

**Run:** `bun tests/run-tests.ts --release`

## Cross-Platform Coverage

テストスイートは、ネイティブ Bun ランナー経由で macOS、Linux、Windows で走ります:

```bash
bun tests/run-tests.ts [--ci | --all --debug -P 8]
```

`bash tests/run-tests.sh ...` は POSIX 互換ラッパとして残り、同じ TypeScript ランナーへ委譲します。リポジトリテストとコピーチャネルのフック / ツールは `bun` を要します。ネイティブリリース投影は、入れた `aidlc` バイナリ経由でフック / ツールを呼びます。Bash はもう主たるランナー基盤ではありません。

**スイートに焼き込んだ移植性の拘束:**

- **Paths**: `tests/harness/fixtures.ts` の `createTestProject` が一時プロジェクトパスを正規化し、JSON とネイティブ `bun` をきれいに往復できるようにする。
- **In-place edits**: テストでは TypeScript のファイル書き込みを優先する。シェルヘルパが避けられないなら、BSD/GNU 固有の `sed -i` 形を避ける。
- **`grep -qiF`**: Git Bash は `-i` と `-F` の組み合わせに既知のバグがある。パターンに正規表現メタ文字が無ければ `-i` だけ使う。t16 が直る前にここに当たった。
- **`tar` archives**: macOS の `tar` は既定で `._*` AppleDouble サイドカーを入れる。クロスプラットフォームのテスト実行向けにソースを束ねるときは `COPYFILE_DISABLE=1 tar …` か `git archive` を使う。
- **LLM timing on Windows**: Windows EC2 からの Bedrock 呼び出しは、macOS より意味のある遅さになり得る（初回のコールドスタート、MSYS プロセス fork のオーバーヘッド）。SDK/tui テストはドライバ結果面でアサートし、ランナーのプリフライト / ファイルごとの Claude ゲートに、基盤欠落と本当の失敗を分けさせる。

**Windows でスイートを手で走らせる:**

1. `bun`、Node.js、Claude Code CLI を入れる。
2. フルスイートまたは POSIX ラッパ互換 smoke を走るなら Git for Windows を入れる。ネイティブランナー経路自体は Bash を要しない。
3. e2e TUI テストでは、npm で dev 依存を入れ、node が `node-pty` と `@xterm/headless` を解決できるようにする。
4. `AIDLC_NODE_BIN` を具体的な `node.exe` パスに設定し、生きた Claude TUI カバレッジには `AIDLC_TUI_LIVE=1` を設定する。
5. Kiro IDE スライスでは、Kiro IDE を入れてサインインし、`AIDLC_KIRO_IDE_LIVE=1` を設定する。Windows の既定バイナリは `%LOCALAPPDATA%\Programs\Kiro\Kiro.exe`。上書きは `AIDLC_KIRO_IDE_BIN`。
6. `bun tests/run-tests.ts --all --debug -P 8` を走る。

WSL も Docker も要りません。対応する検証基盤はネイティブ Windows です。

**再現できる MR10 Windows EC2 ランブック:**

1. SSM アクセス付きの使い捨ての Windows Server 2022 ホストを立てる:

   ```bash
   aws cloudformation deploy \
     --stack-name aidlc-windows-test \
     --template-file tests/harness/windows/windows-test.cfn.yaml \
     --capabilities CAPABILITY_NAMED_IAM \
     --parameter-overrides VpcId=vpc-... SubnetId=subnet-...
   ```

2. 試験中のコミット済み git 木を同期する:

   ```bash
   bun tests/harness/windows/sync.ts --stack-name aidlc-windows-test HEAD
   ```

3. 箱の上でリポジトリの dev 依存を入れる:

   ```bash
   bun tests/harness/windows/ssm-run.ts --stack-name aidlc-windows-test -- \
     powershell -ExecutionPolicy Bypass -File C:\aidlc\tests\harness\windows\setup.ps1 -ProjectDir C:\aidlc
   ```

4. 生きた TUI を有効にして Windows `--all` ゲートを走る:

   ```bash
   bun tests/harness/windows/ssm-run.ts --stack-name aidlc-windows-test -- \
     powershell -ExecutionPolicy Bypass -File C:\aidlc\tests\harness\windows\run-all.ps1 -ProjectDir C:\aidlc -Parallel 8
   ```

5. ホストを壊す:

   ```bash
   aws cloudformation delete-stack --stack-name aidlc-windows-test
   ```

`run-all.ps1` は `bun tests/run-tests.ts --all --debug -P <N>` を呼ぶ前に `AIDLC_NODE_BIN` と `AIDLC_TUI_LIVE=1` を出すので、生きた TUI 旅程を黙って飛ばして緑になることはありません。claude バイナリは `C:\Users\Administrator\.local\bin` と systemprofile ホームを探ります。ネイティブインストーラは、CloudFormation UserData ブートストラップを走らせたユーザーの下へ `claude.exe` を落とすからです（EC2Launch v2 では Administrator）。

スタックの既定は **`c5.4xlarge`** です。フル `--all -P 8` 生きた実行で実証したサイズです。e2e ティアはテストごとの `bun:test` タイムアウトを運びます（Bolt の worktree ライフサイクルテストは c5.4xlarge で 5s 予算のうち約 5.5s に着地します）。より小さい箱（例: `t3.large`）は、並行負荷の下で決定論的な Bolt / 実行時テストを偽のタイムアウトへ傾けます。`InstanceType` パラメータを小さくするのは、より軽いティア選択を走るときだけにしてください。

## Preflight Validation

フィルタ無しの生きたレベル（integration または e2e）を走る前に、ランナーはゲートとして `tests/integration/t19.test.ts` を実行します。**Claude Agent SDK**（integration ティアが使うのと同じ生きた経路）を通る小さな本物のターンを駆動し、決定論的な面だけでアサートします。プリフライトが失敗すると、決定論的なファイルはまだ走り、Claude 依存のファイルはファイルごとの `SKIP` エントリで飛ばされます。

SDK ドライバは各 `driveAidlc()` 呼び出しに一時的な `CLAUDE_CONFIG_DIR` を与え、セッション永続を無効にします。したがって生きたテストは、利用者の `~/.claude.json` と Claude トランスクリプトを触りません。ホームディレクトリがコマンドサンドボックス内で読み取り専用のときも含みます。焦点較正向けに、呼び出しごとの `env.CLAUDE_CONFIG_DIR` は残ります。

| Assertion | Surface | On fail |
|-----------|---------|---------|
| AWS 資格情報が有効 | `aws sts get-caller-identity` が終了 0（`aws` CLI が無いときは PASS-by-skip） | bail — Bedrock は IAM 認証が要る |
| 生きたターンが終端結果に達する | SDK 実行が非 `undefined` の `resultEvent` を出す（ティアが要るバイナリが存在し到達できる） | bail — 基盤 / API に到達できない |
| ターンがエラー無しで完了 | `resultEvent.is_error === false`（`claude -p` 終了 0 の決定論的な同等。124/137 ハングは undefined のまま） | bail — API が応答しない |
| 応答が空でない | 実行が *何か* の出力を捉えた — `tool_result` またはアシスタントテキスト（存在。中身は決して見ない） | bail — API が何も出さなかった |

ここが赤なら、本物の環境所見です（欠けた `claude`、期限切れ資格情報）。柔らげるフレークではありません。下流 LLM ティアを速く止めるのがゲートの仕事です。

## Test Registry

スイートは **登録ではなく発見** です。`bun tests/run-tests.ts` は 4 つのレベルディレクトリ（`tests/{smoke,unit,integration,e2e}/`）を歩き、見つけた `t*.test.ts` をすべて走ります。同期し続ける手メンテのテストごとの表はありません。テストファイルを足せば、ランナーが拾います。

各テストが *覆うもの* は **`tests/.coverage-registry.json`** で機械的に追います。テストファイル先頭コメントブロックの `covers:` ヘッダ（だいたい 1 行目。正当に宣言無しのファイルはいくつかあり、カバレッジ主張を出さないだけです）から `bun tests/gen-coverage-registry.ts` が生成します。生成器はフレームワークの単位を 7 クラス（`function`、`audit`、`scope`、`stage`、`hook`、`subcommand`、`render-surface`）にわたって列挙し、各 `covers:` 主張を列挙した単位へ写し、カバレッジ件数とラチェット下限を出します。再生成とドリフト検証:

```bash
bun tests/gen-coverage-registry.ts          # ディスクからレジストリを書き直す
bun tests/gen-coverage-registry.ts --check  # コミットしたレジストリが古ければ失敗
```

`tests/.coverage-registry.json` が権威ある、機械検査したインデックスです。ある関数、監査イベント、スコープ、ステージ、フック、サブコマンド、描画面をどのテストが行使するかは、それを見る（または `covers:` ヘッダを直接 grep する）。`--check` モードはスイートに配線されているので、ディスクからドリフトしたレジストリはゲートを赤にします。

> **Note:** t19 は unit（`tests/unit/t19.test.ts`、ジャンプ CLI ツール）と integration（`tests/integration/t19.test.ts`、生きたプリフライトゲート）の両方に出ます。そのような衝突は、裸の ID ではなくレベル / ファイルパスで曖昧さを取ります。

## Trigger Points

| Trigger | Layer | Command | Where |
|---------|-------|---------|-------|
| `git commit` | L1 | `bun tests/run-tests.ts` | 局所（pre-commit フック） |
| CI pipeline | L2 | `bun tests/run-tests.ts --ci` | CI/CD パイプライン |
| Release / merge to `main` | L3 | `bun tests/run-tests.ts --release` | CI/CD パイプライン |

L1 は git pre-commit フックで強制できます: `bun tests/run-tests.ts || exit 1`。

## Stubs

### Greenfield Stub: `tests/fixtures/greenfield-todo/`

ソースコードの無いプロジェクト説明。workspace-detection は greenfield と分類します。ideation ステージ向けに、LLM へ決定論的なインテント文脈を与えます。

Contents: TypeScript と Vite の React Todo App を説明する `README.md` だけ。

### Brownfield Stub: `tests/fixtures/brownfield-todo/`

最小の React+TypeScript+Vite ソース（約 10 ファイル、約 200 LOC）。workspace-detection は brownfield と分類します。RE、要件、設計ステージは分析する具体的なコードを持ちます。

Contents:
- `package.json` — react、react-dom、typescript、vite、vitest
- `tsconfig.json`、`vite.config.ts`、`index.html`
- `src/main.tsx`、`src/App.tsx`
- `src/types/todo.ts` — Todo インタフェース（id、title、completed）
- `src/components/TodoList.tsx` — 一覧 + 追加フォーム（約 40 行）
- `src/components/TodoItem.tsx` — チェックボックス + タイトル + 削除ボタン
- `src/hooks/useTodos.ts` — addTodo、toggleTodo、deleteTodo

### RE Artifacts Fixture: `tests/fixtures/re-artifacts/`

下流ステージテスト向けの、種まき済み reverse-engineering 出力。セットアップ中にテストプロジェクトのスペース単位リポジトリ店 `$PROJ/aidlc/spaces/default/codekb/<repo>/` へコピーされます。

Contents: ブラウンフィールド-todo アプリを説明する最小 .md 4 つ（architecture-overview、technology-stack、codebase-analysis、integration-points）。

### Inception Artifacts Fixture: `tests/fixtures/inception-artifacts/`

construction へジャンプするテスト向けの、種まき済み inception フェーズ出力。セットアップ中に `$PROJ/aidlc/spaces/default/intents/<record>/inception/{requirements-analysis,domain-design,units-generation}/` へコピーされます。

Contents: Todo アプリを説明する最小 .md（requirements、統合した `components.md` カタログ、unit-of-work、unit-of-work-story-map）。ユニット名: `todo-core`。

### Construction Artifacts Fixture: `tests/fixtures/construction-artifacts/`

中盤 construction ステージ（例: code-generation）へジャンプするテスト向けの、種まき済み construction フェーズ出力。セットアップ中に `$PROJ/aidlc/spaces/default/intents/<record>/construction/todo-core/functional-design/` へコピーされます。

Contents: todo-core ユニットのコンポーネント仕様と状態管理を説明する最小 .md 1 つ（functional-design）。

## State Fixtures

| Fixture | Project Type | Scope | State | Used By |
|---------|-------------|-------|-------|---------|
| `state-pre-workspace-detection.md` | -- | feature | Welcome+scaffold 済み、次は workspace-detection | t70、t71 |
| `state-initialization-done.md` | Greenfield | feature | Init 済み、次は intent-capture | t73 |
| `state-brownfield-init-done.md` | Brownfield | bugfix | Init 済み、次は RE | t72 |
| `state-mid-inception.md` | Brownfield | bugfix | RE 済み、次は requirements-analysis | t74 |
| `state-mid-ideation.md` | Greenfield | feature | Intent+market 済み、次は feasibility | t08、t10、t11、t12、t20、t22、t24、t25、t37 |
| `state-construction.md` | -- | -- | Construction フェーズ | t07、t10、t11、t26、t57 |
| `state-operation.md` | -- | -- | Operation フェーズ | t07、t10、t11 |
| `state-completed.md` | -- | -- | 全ステージ完了 | t08、t11 |
| `state-jumped.md` | Brownfield | bugfix | ジャンプ履歴付きのワークフロー中盤 | t11、t37、t42 |
| `state-corrupted.md` | -- | -- | 無効 / 壊れた状態 | t08、t10 |

## How to Add a Stage Test

1. テストするステージを選び、要る状態フィクスチャを特定する（状態は、そのステージをいま / 次のステージとして示さなければならない）
2. `tests/fixtures/` に状態フィクスチャを作るか再利用する
3. `tests/integration/tNN-stage-SLUG.test.ts` を作り、共有 TypeScript ハーネスヘルパ（`tests/harness/fixtures.ts`、`tests/harness/sdk-drive.ts`、`tests/harness/tui-drive.ts`、`tests/harness/plugin-kit.ts`、または `tests/harness/exec-drive.ts`）を使う。シェル TAP ヘルパは使わない。
4. `bun tests/run-tests.ts --integration` で走る、または直接: `bun test tests/integration/tNN-stage-SLUG.test.ts`

## How to Add Acceptance Assertions

既存の `tests/e2e/` 下の e2e ワークフローテストへ成果物アサーションを足す:

1. いまのテストを読み、すでに何を見ているかを理解する
2. 既存の `test(...)` ブロック内に `expect(...)` アサーションを足す（bun:test は呼び出し自身からアサーションを数える — 同期し続ける `plan` 行は無い）
3. 柔軟なパターンを使う: `readFileSync` 内容に対して `/[Tt]odo/` を照合し、正確な文字列ではない
4. 非決定論的な LLM 出力形式に依存するアサーションは `test.skipIf(...)` / 早期 return を使う
5. サイズ下限検査は `expect(statSync(path).size).toBeGreaterThan(minBytes)` を使う

## Assertion Design Principles

- **Keyword classes** — 大文字小文字を問わない正規表現: `[Tt]odo`、`[Rr]eact`、`[Bb]rownfield`
- **Flexible discovery** — 正確な名前を見るのではなく、`find` + `wc -l` でファイルを数える
- **Size bounds** — 最小中身には `statSync(path).size` と `toBeGreaterThan()`
- **Graceful degradation** — 非決定論的な LLM 出力に依存するアサーションは `skip`
- **Structure over content** — 中身を見る前に、Markdown 見出し（`^#`）、ファイル存在、ディレクトリ作成を見る

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AIDLC_TEST_TIMEOUT` | `1800` | `claude -p` 呼び出しごとのタイムアウト（秒）。無効化は `0`。 |
| `AIDLC_TUI_SETTING_SOURCES` | `project` | 生きた `claude` TUI 起動へ注入する setting sources。利用者 / ローカルの Claude 設定を意図して含める焦点較正だけ、`default` または空値を使う。 |
| `AIDLC_TUI_TRACE_POLL_MS` | `10000` | 長い旅程が次のメニューまたはディスク終端を待っているあいだ、TUI NDJSON トレースの `answer_gate_poll` スナップショット間隔の下限。 |
| `AIDLC_KIRO_IDE_LIVE` | unset | `1` にすると、macOS または Windows でサインイン済み Kiro IDE デスクトップ旅程を走る。 |
| `AIDLC_KIRO_IDE_BIN` | プラットフォーム既定 | Kiro IDE 実行ファイルを上書き。既定は macOS で `/Applications/Kiro.app/Contents/MacOS/Electron`、Windows で `%LOCALAPPDATA%\Programs\Kiro\Kiro.exe`。 |
| `AIDLC_KIRO_IDE_SEED` | 生成したシード | 任意の Kiro user-data ディレクトリ。テストは起動前に使い捨ての一時ディレクトリへコピーし、元プロファイルは決して変えない。 |

## CLI Reference

```bash
# Entrypoints
bun tests/run-tests.ts        # Native cross-platform runner
bash tests/run-tests.sh       # POSIX compatibility wrapper

# Level flags (combinable)
--smoke         # Structural validation
--unit          # Single-component isolation
--integration   # Cross-component contracts and stage/CLI utilities
--e2e           # Full lifecycle, worktree, and rendered terminal journeys

# Profile flags (shortcuts)
(default)       # smoke + unit + integration
--ci            # smoke + unit + integration
--release       # smoke + unit + integration + e2e
--all           # Same as --release

# Output modifiers
--verbose       # Write per-test logs to tests/logs/
--no-llm        # Force all live-model gates closed while deterministic
                # integration/e2e tests still run. Also via AIDLC_NO_LLM=1.
--debug         # Implies --verbose; streams per-test output and writes SDK/TUI
                # driver traces to tests/logs/
--filter PAT    # Only run tests whose filename matches extended regex PAT
--parallel N    # Run up to N test files concurrently within a tier (alias: -P N).
                # Default: 1 (serial). Smoke and unit tiers are always serial.
--shard N/M     # Run one duration-balanced unit shard.
                # Requires --unit with no other level or profile flags.
```

`--no-llm`（または `AIDLC_NO_LLM=1`）は導出した Claude ゲートを閉じ、生きたモデルのオプトインをすべて `0` に強制します: Claude TUI、Kiro ACP/TUI/IDE、Codex exec、opencode run。それらのティアの決定論的なテストはまだ走ります。トークン無しの TUI 基盤プリフライトも含みます。これにより CI は、CLI が入っていて生きた変数が `1` として継承されていても、生きたモデルのコストやフレーク無しでフルティアの決定論プロファイルを得ます。

生きた SDK と TUI ハーネスドライバの既定は、プロジェクトだけの Claude setting sources です。つまり、コピーしたテストの `.claude/` プロジェクト設定とフックを読み、開発者の利用者レベルのフック / 設定は外します。これは入れたフレームワーク面を映し、局所の対話設定がテスト振る舞いを変えるのを止めます。明示のドライバオプションまたは `AIDLC_TUI_SETTING_SOURCES` が較正の逃げ道のままです。

`--all --debug`（と `--release --debug`）は、環境がすでにセットしていなければ `AIDLC_TUI_LIVE=1` を既定にします。これにより「トレース付きですべて」プロファイルは、既定で生きた、トークンを使う TUI 旅程を走ります。それらのファイルをテスト内 SKIP 経路に残すには、明示して `AIDLC_TUI_LIVE=0` をセットします。

## Parallel Execution

`--parallel N`（または `-P N`）は、ティア内で最大 N テストファイルを並行して走ります。既定は直列（`1`）です。

**効くとき。** integration と e2e レベルは、壁時計のほとんどを `claude -p` サブプロセス起動と LLM ターンに使います。これらのテストはすでにファイルシステム隔離です — `setup_integration_project` がテストごとに新鮮な `$PROJ` を足場にする — なので、干渉せず並べて走れます。

**スパイク結果（2026-05-06、Opus 4.7 via Bedrock）:**

| Scenario | Serial | `--parallel 4` | `--parallel 8` |
|---|---|---|---|
| 4 × `/aidlc --help` | 56s | 16s (3.5x) | — |
| 8 × `/aidlc --help` | — | — | 31s |

8 並行呼び出しすべてが `cache_read=73789` を観察しました — Bedrock のプロンプトキャッシュは並行ワーカー横断で温かいままです。8-way でスロットルも破壊も観察しませんでした。

**直列のまま残るもの。** smoke と unit ティアは `--parallel` を無視し、1 チェックアウト内で直列に走ります。Unit CI は代わりに隔離シャードで壁時計を減らします。各 GitHub Actions ジョブが新鮮なチェックアウトを持ち、割り当てたファイルを直列に走るので、パッケージングテストは読者と競合せず `dist/` を再生成できます。プリフライトゲート（`tests/integration/t19.test.ts`）も直列です。LLM ティアがその終了状態に依存するからです。

**並行下の出力。** `START` 印はライブで流れます（最初の `DONE` の前にいくつかが連続して出ることがある — ワーカーが並行している見える合図です）。通常 / verbose モードでは、各ワーカーの TAP 本文はバッファされ、ディレクトリ mutex（`mkdir $LOG_DIR/.stdout.lock`、POSIX で原子的 — `flock` 無しの macOS bash 3.2 でも動く）の下で stdout へ一塊としてフラッシュされます。だから別ファイルの `ok` / `not ok` 行は決して混ざりません。stdout は上から下へ直列実行のように読めます。ファイル完了順はディスパッチ順ではなく、各テストがどれだけかかったかで決まります。`--debug` モードでは、Bun stdout/stderr はライブで流れつつ、各テストごとのログにも書かれます。並行 debug 出力はファイルベース名で接頭するので、重なる生きたワーカーは帰属できます。SDK/TUI/Kiro-ACP ドライバトレースはログの隣へ `$LOG_DIR/sdk-drive-*.ndjson`、`$LOG_DIR/tui-drive-*.ndjson`、`$LOG_DIR/kiro-acp-drive-*.ndjson` として書かれます。正確なファイル名はプロセス ID と TUI セッション名に依存するので、ランナーは起動時と各テスト開始時に glob を印字します。Kiro-ACP トレースは生きた `kiro-cli acp` ターンをイベントごとに残します（spawn、prompt start、各 `tool_call` / `tool_call_update` とその逐語の出力プレビュー、権限の答え、spawn したプロセスの stderr、終端の `result` / `timeout` / `end`）。だから `session/prompt` タイムアウトは事後に診断できます — 進んでいたターン（本物のツール呼び出しが発火）と止まったターンを区別します。

**ワーカー調整。** 親は `run_bun_test_file` を `&` でバックグラウンドし、`jobs -rp | wc -l` 経由のスロットゲートを持ちます。各ワーカーは原子的な `.meta` サイドカーを `$LOG_DIR/_results/` へ書き、親は `wait` のあとそれらを読んで要約表を埋めます。macOS は bash 3.2.57（`wait -n` 無し）を出荷するので、ゲートは 200ms ごとにポーリングします — 分単位の LLM 呼び出しの隣では無視できます。

**指針。** `--parallel 4` から始めてください。Bedrock 容量と請求が許すなら `8` へ上げます。失敗している 1 テストのデバッグは直列へ戻すか、`--filter` で隔離します。

## Unit Sharding

`--unit --shard N/M` は、発見したすべての unit ファイルを、ちょうど 1 つの `M` 個の所要時間バランスシャードへ割り当てます。割り当ては決定論的で、いちばん遅いファイルには `tests/unit-shard-weights.json` を使います。一覧に無いファイルは 1 秒の既定重みを受けるので、新しいテストはコマンドを変えずにいちばん軽いシャードへ入ります。割り当て可能なグループ数を `M` が超えるとランナーは終了 2 するので、有効なシャードコマンドがゼロファイルを走らせたあと成功を報告することはありません。

各シャードは直列のままです。別シャードは別チェックアウトまたは CI ジョブで走らせてください。1 つのリポジトリ木に対して並行して走らせないでください。パッケージングテストが `dist/` を再生成し、生成ファイルを読むテストと競合し得るからです。

親和性一覧は、ファイル横断の前提を明示に保ちます。ネイティブバイナリビルダテストはいま、同じシャード内で Copilot のコンパイル済みアダプタカバレッジの前に走ります。シャードした unit 実行は、そのコンパイル済みカバレッジがプロデューサーのネイティブビルド結果を解決することを要するので、欠けた成果物はコンパイル済みケースを黙って飛ばさず失敗します。smoke ランナー契約は、CI シャード 4 つがすべて空でなく、互いに素で、unit 在庫全体を覆い、この順序を保つことを検証します。
