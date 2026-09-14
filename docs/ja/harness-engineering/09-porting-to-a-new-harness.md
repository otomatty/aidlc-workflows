# 新しいハーネスへ AI-DLC を移植する

AI-DLC は **一つのコア、多くのハーネス** から出荷します。きょうは Claude Code、Kiro CLI、Kiro IDE、Codex CLI、Cursor、opencode、GitHub Copilot。集合は開いています。手で書くソースは、ハーネス非依存の `core/` と、CLI ごとの薄い `harness/<name>/` 面です。パッケージャ（`scripts/package.ts`）は、無視されるローカルの Bun コピー木を `dist/<harness>/` の下に、ネイティブの対を `dist-release/<harness>/` の下に実体化します。ハーネスを足すのは **ディレクトリ 1 つとマニフェスト行 1 つ** です。エンジン、方法論、投影の所有、ハーネスディレクトリ / ルールの解決は、`core/` の編集をまったく要しません。任意の例外はハーネスごとの `--doctor` 腕だけです（手順 2）。このページは契約を歩きます。

> このリポジトリの「ハーネス」の三つの意味: **`harness/`**（トップレベル — このページが語る CLI ごとの配布面）、**`docs/harness-engineering/`**（このガイド）、**`tests/harness/`**（テストスイートのヘルパーライブラリ）。無関係です。配布なのは最初だけです。

## 形

```
core/                      # harness-neutral source — not edited to add a harness (save the optional --doctor arm)
harness/
  claude/  manifest.ts · skills/aidlc/ · CLAUDE.md · settings.json
  kiro/    manifest.ts · skills/aidlc/ · agents/*.json · hooks/aidlc-kiro-adapter.ts · settings/cli.json · AGENTS.md
  codex/   manifest.ts · emit.ts · skills/aidlc/ · hooks/aidlc-codex-adapter.ts
  opencode/ manifest.ts · emit.ts · skills/aidlc/ · command/ · plugin/
  copilot/ manifest.ts · emit.ts · skills/aidlc/ · hooks/aidlc-copilot-adapter.ts
scripts/
  package.ts               # bun scripts/package.ts [<name>] [--check]
  manifest-types.ts        # the HarnessManifest contract every manifest implements
dist/<name>/               # GENERATED Bun-invocation channel
dist-release/<name>/       # GENERATED native-aidlc channel
```

`core/` の散文はハーネスディレクトリを `{{HARNESS_DIR}}` で指名し、フレームワークを `{{INVOKE}}` 経由で呼び、生成接頭辞が要るところでは `{{TOOL_PREFIX}}` を使います。パッケージャは宣言したディレクトリと、二つの起動方針のどちらかを代入します。

| チャネル | `{{INVOKE}}` | `{{TOOL_PREFIX}}` |
|---------|--------------|-------------------|
| `dist/` | `bun <harness-dir>/tools/aidlc.ts` | `bun <harness-dir>/tools/` |
| `dist-release/` | `aidlc` | `aidlc ` |

変換は Markdown と構造化したコマンド面（`.json` / `.toml` / `.hook`）、および TypeScript 内の起動トークンに効きます。一般のソース書き換えではありません。`core/tools/aidlc-lib.ts` の実行時 `harnessDir()` 継ぎ目は、それでも出荷レイアウトからディレクトリを導きます（開集合: ツール自身のパスであり、ハードコード一覧ではない）。だから同じ書いたツールソースがどの木でも走ります。受け入れゲートは **生成器の決定論** です。`package.ts --check` は両チャネルとどのプラグイン投影も、独立した一時ルートで二度ビルドし、出力全体をバイト比較します。ローカルの `dist/` や `dist-release/` は読みません。

パッケージャは `harness/` を走査して `manifest.ts` を **発見** するので、新しいディレクトリは既定の `bun scripts/package.ts` と `--check` でビルドされます。パッケージャ自身の編集は無し。「ディレクトリ 1 つとマニフェスト行 1 つ、共有コード編集ゼロ」の文字どおりの意味です。

## 手順 1 — マニフェスト（宣言の 80%）

`harness/<name>/manifest.ts` を作り、`HarnessManifest`（`scripts/manifest-types.ts`）を出します。フィールド:

- `name` / `harnessDir` — トークンが代入するディレクトリ（例: `.foo`）。
- `productName` / `configNextStep` — ライフサイクルと `aidlc config` が消費する、利用者が見る投影メタデータ。ホストコマンドは正確に保ってください。
- `rootIntegrations` — 通常投影が出すプロジェクトルートファイル全部。それぞれ明示の init マージ方針（`managed-block`、`json-map`、`json-array`、または `whole-file`）。マーカー / JSON の身元、任意性、正確なレガシー採用ハッシュをここで宣言します。パッケージャは、管理ディレクトリでも宣言したルート統合でもない出されたトップレベル項目を落とします。
- `nativeRootIntegrations`（任意） — リリースチャネル専用のルートファイル（信頼シードなど）。同じマージ契約に加え、書いた `src`。
- `tierFlavor` — 既存の Claude / Codex / Kiro / OpenCode エージェントのモデル / effort 投影形を選びます。マニフェストデータであり、`name` から決して推論しません。
- `coreDirs: DirMap[]` — どの `core/<src>` ディレクトリを `<harnessDir>/<dst>` へ投影するか。ここでディレクトリを改名または落とします（Kiro は `rules → steering`。Codex は `rules → aidlc-rules` で `skills/` を落とします — emit を参照）。セッションスキル 3 つは、木内ハーネス（claude、kiro、kiro-ide）ではコアディレクトリです。codex は代わりに出します。
- `harnessFiles: FileMap[]` — `harness/<name>/<src>` から各チャネルへそのままコピーする書いた面（対応テキスト形式はトークン代入を受けます）。`projectRoot: true` はハーネスディレクトリの隣にファイルを置きます（例: `AGENTS.md`）。
- `orchestratorSkillPath`（任意） — 組み立てたオーケストレータ `SKILL.md` のプロジェクトルート相対パス。既定は `<harnessDir>/skills/aidlc/SKILL.md`。その木の外の emit 所有レイアウト（`.agents/skills/aidlc/SKILL.md` など）では宣言します。
- `frontmatterAdditions`（任意） — 投影中にコア投影 `.md` の frontmatter へ足すファイルごとの YAML 行。ほかのハーネスへ出荷してはいけないハーネス **ネイティブ** フィールド向け（kiro-ide は委譲先エージェントファイルへ `tools: ["read", "write", "shell"]` を注入します。IDE はサブエージェントのツール付与を `.md` frontmatter から読みます）。マニフェストデータとして宣言するのでコアは単一ソースのままです。パッケージャはタイポしたパス、欠けた frontmatter ブロック、コアがすでに宣言するキーでエラーします。
- `rulesRename` — 改名したルールディレクトリ（`"steering"` | `"aidlc-rules"` | `null`）。パッケージャはコピーしたディレクトリ *と* 散文内の `<harnessDir>/rules/` 参照 *と* コンパイル済みステージグラフのルールパスに適用します（コンパイル時に `AIDLC_RULES_DIR` をセットするので `loadRules` が改名ディレクトリを見つける）。そしてマニフェスト名とルールディレクトリの両方を記録する生成 `tools/data/harness.json` へ出します。実行時のパス解決は、エンジンディレクトリを共有するハーネスを曖昧解消するために名前を使い、`rulesSubdir()` は改名を読みます。だから本物のインストールは両方の事実をハードコード無しで解決します。これが `rulesRename` を純粋なマニフェストデータにする継ぎ目です。ここでセットすると、どの層（ビルド散文、コンパイル済みパス、実行時）も従い、`core/` の編集は無しです。
- `onboarding` — `core/templates/onboarding.md` からホストのオンボーディングファイルを描く。`emit.ts` が所有するときは `null`。
- `skipRunnerGen` — ハーネスが `<harnessDir>/skills/` を出荷しないときにセット（Codex は `emit` 経由でスキル木を `.agents/skills/` へ出す）。パッケージャはそのとき標準の runner-gen 手順を飛ばします。
- `emit` — 任意のプラグイン（手順 3）。要らないハーネスは `null`。
- `plugin`（任意） — ホストプラグインのマニフェストディレクトリと届け方。省略すると `<harnessDir>-plugin` とストア届けを導きます。フォルダドロップのホストだけ `kind: "kiro"` をセットします。

Claude のマニフェストは最小の参照です（改名も emit も無し）。Kiro は改名 + `harnessFiles`（エージェント JSON、アダプタ、プロジェクトルートの AGENTS.md）を足します。Codex はネイティブ専用のルート統合と命令的な出しを示します。

パッケージャはこれらのフィールドから `tools/data/harness.json`、`aidlc-stamp.json`、`aidlc-projection.json` を書きます。最初は実行時設定。スタンプは版 / 配布 / ハーネスを識別します。投影記述子はインストール所有の契約です。`aidlc config` は一貫しない、または安全でない記述子を落とすので、`emit.ts` で並行メタデータを生成しないでください。

## 手順 2 — フックアダプタ（ハーネスごとのシム）

コアフックは通常形として Claude 形の stdin を消費します。新しいハーネスは **書いたアダプタ 1 つ** を出荷します（`harness/<name>/hooks/aidlc-<name>-adapter.ts`。`harnessFiles` に列挙）。ハーネスのフックペイロードをその契約へ正規化し、共有コアフックへサブプロセスパイプします。コアフックをロジック + アダプタに分けないでください。コア本体は、明示の起動トークン投影を除き、どのハーネスでもバイト共有のままです。`--check` は、生成された両形が同じソースから来たことを証明します。

アダプタをハーネスのイベントへ、ハーネス自身の仕方で結んでください。Kiro は `agents/aidlc.json` にターゲットを登録します。Codex は `hooks.json` を出します。本物のコアフック消費者がいるイベントだけを登録します。

フローを変えるフックは 6 つあり、パイプするだけでなく制御チャネルを転送する必要があります。Stop フックは stdout に `{"decision":"block"}` で答えます。dispatch-rules は委譲プロンプトを書き換えます。PreToolUse の reviewer-scope、review-freeze、plan-approval、state-transition ガードは終了 2 + stderr の理由で答えます（アダプタがその終了コードを中継するとき、ツール呼び出しは拒まれなければなりません）。新しいハーネスが pre-tool 継ぎ目からツール呼び出しを硬く止められないなら、reviewer-scope と review-freeze の登録は外し、死んだフックを結ぶのではなくギャップを文書化してください。そこでは stage-protocol-reviewer.md §12a の散文境界がそれでも統治します。ハーネスのペイロードがサブエージェントの身元を運ばないとき、ハーネスがエージェントごとのフックを支えるなら、reviewer-scope 登録をレビュアーエージェント自身に範囲してください（Kiro CLI の型: アダプタはそのとき `agent_type` の一致ではなく `scoped_registration` を主張します）。

> **許される唯一の `core/` 編集: doctor の腕。** `/aidlc --doctor`（`core/tools/aidlc-utility.ts`）は入れた木の健康検査をし、新しいハーネスは自分のインストール面（アダプタ + 配線ファイルがあること、任意のバイナリ版の床）のためにそこにハーネスごとの腕を足します。これは意図したハーネスごとの *ロジック* であり、データではありません。版検査は CLI を産み、semver を比べます。マニフェスト行では表現できません（三関心の規則: ナレッジはコードに住む）。だから「`core/` 編集ゼロ」の祝福された例外であり、違反ではありません（意図した設計のトレードオフ）。優雅に劣化します。腕が無いハーネスは失敗せず、汎用検査だけを得ます。ほか全部 — ディレクトリ解決、ルールディレクトリの改名、パッケージ — は純粋なマニフェストデータのままです。

## 手順 3 — `emit.ts`（命令の 20%、要るときだけ）

宣言行では表現できない構造のずれは `emit.ts` です。マニフェストが参照し、パッケージャが `EmitContext`（`repoRoot`、`coreRoot`、`harnessRoot`、`harnessName`、`distRoot`、`harnessDir`、チャネルを意識する `substituteToken`、`tierCap`）で呼ぶプラグインです。エミッタは出力を `distRoot` の下に書きます。Codex のが通した例です。`config.toml`、`hooks.json`、フック信頼の事前シード、`AGENTS.md` マージ、エージェント TOML の転置、`.agents/skills/` 木（`AIDLC_HARNESS_DIR` の下で `core/tools/aidlc-runner-gen.ts` の出した描画関数から組み立て、再実装しない）。面が全部書いたファイルのハーネス（Claude、Kiro）は `emit: null` をセットします。

`--check` の下、パッケージャは独立した一時 `distRoot` 集合を 2 つ供給し、同じエミッタを各ビルドのチャネルごとに一度走らせ、生成されたルート全体を 2 つ比較します。`<harnessDir>` の外の emit 所有ファイル（例: `.agents/skills/` とルートの `AGENTS.md`）は、だから宣言出力と同じ欠け、差、孤児検査に参加します。出したコマンド文はいつも `ctx.substituteToken` を通してください。そうしないと、エミッタが黙って Bun コマンドをネイティブチャネルへ置けます。

## 手順 4 — 有界の変換クラス

許される変換は、ハーネス / ルール投影、二つの起動トークン、宣言したティア / frontmatter 追加、`rewriteNativeInvocations` のネイティブホスト面書き換えです。そのネイティブパスはコマンド許可リスト、フック / アダプタ / ステータスライン経路、オンボーディング実行時テキスト、ネイティブ信頼項目を更新し、残ったトークンまたは AIDLC ツール / フックへの Bun 起動を落とします。盲目の `sed` は無し。`core/` の誠実なハーネス固有リテラル（`$CLAUDE_PROJECT_DIR` の注、workspace-detection のハーネスディレクトリ列挙）はトークンを持たず、そのまま通ります。コア衛生とネイティブ投影のテストが境界を守ります。

## 手順 5 — テストとゲート

- パッケージ決定論テスト（`t145`）は `package.ts --check` を走ります。発見したどのハーネスの両チャネルと、どのプラグイン投影もカバーし、ディスク上の生成木を要求しません。
- `t243-install-mechanism` は、コピー投影が Bun 起動を保つこと、リリース投影に AIDLC の Bun 起動が無いこと、メタデータが安全で網羅的であること、ネイティブ専用統合が `dist-release/` にだけ現れることを主張します。
- `t238-build-binaries` はネイティブディスパッチャをコンパイルし、`PATH` に Bun 無しで生成されたどのハーネス実行時も行使します。
- `<name>` フックアダプタ契約テストは、生きて捉えたペイロードをアダプタへパイプし、観測できるコアフック効果を主張します。
- 生きた旅は e2e として出荷し、`skipReason()`（`AIDLC_<NAME>_*_LIVE=1` 環境 + バイナリがあること + 認証済み）でゲートするので、決定論層ではきれいに飛び、ポートがマージする前にローカルで緑に走ります。

両ローカルチャネルを実体化するには `bun scripts/package.ts <name>`、決定論的生成を証明するには `--check`、ゲートするには決定論スイート（`bash tests/run-tests.sh --smoke --unit --integration -P 8`）と生きた旅を走らせます。

## 次

これで弧が閉じます。データ面を形作り（章 01–08）、いまコアを新しい CLI へ描きました。ここから:

- 地図全体は [ハーネスエンジニアガイドの概要](00-overview.md) へ戻る。
- 新しいハーネスは、ほかと並ぶ **利用者が見る章** を得ます。既存の読み方は User Guide の [Running on other harnesses](../guide/harnesses/README.md) 族です。
- 規範のビルド契約（マニフェスト型、`emit` プラグイン API、`harnessDir()` 継ぎ目）は Developer Reference の [Architecture § Source vs distribution](../reference/01-architecture.md#source-vs-distribution-one-core-many-harnesses) です。
