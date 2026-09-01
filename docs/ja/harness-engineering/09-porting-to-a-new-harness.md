# 新しいハーネスへの移植

AI-DLC は **1 つのコア、多くのハーネス** から出荷します。いまは Claude Code、Kiro CLI、Kiro IDE、Codex CLI、Cursor、opencode、GitHub Copilot で、集合は開いています。手で書くソースは、ハーネス非依存の `core/` と、CLI ごとの薄い `harness/<name>/` の面です。パッケージャ（`scripts/package.ts`）が、コミットされる各 `dist/<harness>/` の木を再生成します。ハーネスを足すのは **ディレクトリ 1 つとマニフェスト 1 行** です。エンジン、方法論、ハーネスディレクトリ / ルールの解決は、`core/` をまったく直しません。任意の例外はハーネスごとの `--doctor` 腕だけです（手順 2）。このページは契約を歩きます。

> このリポジトリで「ハーネス」に 3 義あります。**`harness/`**（トップレベル。このページが扱う CLI ごとの配布面）、**`docs/harness-engineering/`**（このガイド）、**`tests/harness/`**（テスト一式のヘルパライブラリ）。無関係です。配布なのは最初だけです。

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
dist/<name>/               # GENERATED, committed, drift-guarded
```

`core/` の散文はハーネスディレクトリを `{{HARNESS_DIR}}` トークンで指名します。パッケージャはマニフェストが宣言する `harnessDir` に置き換えます（`.claude` / `.kiro` / `.codex` / あなたの `.foo`）。`.ts` は変換せずバイトコピーです。実行時の `harnessDir()` 継ぎ目（`core/tools/aidlc-lib.ts`）は、実行時に出荷レイアウトからディレクトリを導きます（開集合。ツール自身のパスからディレクトリ名を読み、ハードコード一覧ではありません）。同じツールソースがどの木でも走ります。受け入れの門は **バイト一致** です。ハーネスを再生成すると、コミット済み dist が正確に再現されなければなりません（`package.ts --check`）。

パッケージャは `harness/` を走査して `manifest.ts` を **発見** するので、新しいディレクトリは既定の `bun scripts/package.ts` と `--check` でビルドされます。パッケージャ自身の編集は要りません。「ディレクトリ 1 つとマニフェスト 1 行、共有コード編集ゼロ」の字義です。

## 手順 1 — マニフェスト（宣言の 80%）

`harness/<name>/manifest.ts` を作り、`HarnessManifest`（`scripts/manifest-types.ts`）を export します。フィールドです。

- `name` / `harnessDir` — トークンが置き換えるディレクトリ（例: `.foo`）。
- `coreDirs: DirMap[]` — どの `core/<src>` ディレクトリを `<harnessDir>/<dst>` へ投影するか。ここでディレクトリを改名または落とします（Kiro は `rules → steering`。Codex は `rules → aidlc-rules` で `skills/` を落とす。emit を見てください）。3 つのセッションスキルは、木の中のハーネス（claude、kiro、kiro-ide）ではコアディレクトリです。codex は代わりに emit します。
- `harnessFiles: FileMap[]` — `harness/<name>/<src>` から dist へ、字義どおりコピーする手書きの面（`.md` はトークン置換を受ける）。`projectRoot: true` はハーネスディレクトリの隣にファイルを着地させます（例: `AGENTS.md`）。
- `orchestratorSkillPath`（任意） — 組み立てたオーケストレータ `SKILL.md` の、プロジェクトルート相対パス。既定は `<harnessDir>/skills/aidlc/SKILL.md`。その木の外の emit 所有レイアウト（`.agents/skills/aidlc/SKILL.md` など）では宣言します。
- `frontmatterAdditions`（任意） — コア投影の `.md` の frontmatter へ、投影中に追記するファイルごとの YAML 行。ほかのハーネスへ出荷してはいけないハーネス *ネイティブ* フィールド用です（kiro-ide は委譲先エージェントファイルに `tools: ["read", "write", "shell"]` を注入する。IDE はサブエージェントのツール許可を `.md` frontmatter から読む）。コアを単一ソースのままにするためマニフェストデータとして宣言します。パスの誤字、frontmatter ブロック無し、コアがすでに宣言しているキーは、パッケージャがエラーにします。
- `rulesRename` — 改名したルールディレクトリ（`"steering"` | `"aidlc-rules"` | `null`）。パッケージャはコピーしたディレクトリ *と* 散文中の `<harnessDir>/rules/` 参照 *と* コンパイル済みステージグラフのルールパスに適用します（コンパイル時に `AIDLC_RULES_DIR` をセットするので `loadRules` が改名先を見つける）。マニフェスト名とルールディレクトリの両方を記録する生成 `tools/data/harness.json` にも出します。実行時のパス解決は名前を使い、エンジンディレクトリを共有するハーネスを見分け、`rulesSubdir()` が改名を読みます。本物のインストールが、ハードコードなしで両方の事実を解決します。これが `rulesRename` を純粋なマニフェストデータにする継ぎ目です。ここでセットすれば、どの層（ビルド散文、コンパイル済みパス、ランタイム）も従い、`core/` の編集は要りません。
- `skipRunnerGen` — ハーネスが `<harnessDir>/skills/` を出荷しないときにセットします（Codex は `emit` 経由でスキルツリーを `.agents/skills/` へ出す）。パッケージャは標準の runner-gen 手順を飛ばします。
- `emit` — 任意のプラグイン（手順 3）。要らないハーネスは `null`。

Claude のマニフェストが最小の参照です（改名なし、emit なし）。Kiro は改名 + `harnessFiles`（エージェント JSON、アダプタ、プロジェクトルートの AGENTS.md）を足します。

## 手順 2 — フックアダプタ（ハーネスごとのシム）

コアフックは、正規形として Claude 形の stdin を消費します。新しいハーネスは **手書きアダプタ 1 本** を出荷します（`harness/<name>/hooks/aidlc-<name>-adapter.ts`。`harnessFiles` に載せる）。ハーネスのフックペイロードをその契約へ正規化し、共有コアフックへサブプロセス pipe します。コアフックをロジック + アダプタに分けないでください。コア本体は全ハーネスでバイト共有のままです（`--check` が証明します。dist のどの `.ts` も `core/` ソースとバイト一致）。

アダプタをハーネスのイベントへ、ハーネス自身の仕方で結んでください。Kiro は `agents/aidlc.json` にターゲットを登録し、Codex は `hooks.json` を emit します。本物のコアフック消費者がいるイベントだけ登録します。

流れを変えるフックは 6 つで、pipe するだけでなく制御チャネルを転送しなければなりません。Stop フックは stdout に `{"decision":"block"}` で答えます。dispatch-rules は委譲プロンプトを書き直します。PreToolUse の reviewer-scope、review-freeze、plan-approval、state-transition ガードは終了 2 + stderr の理由で答えます（アダプタがその終了コードを中継するとき、ツール呼び出しは拒否されなければなりません）。新しいハーネスが pre-tool 継ぎ目からツール呼び出しを硬く止められないなら、reviewer-scope と review-freeze の登録は外し、死んだフックを結ぶのではなくギャップを文書化してください。そこでは stage-protocol-reviewer.md §12a の散文境界がまだ支配します。ハーネスのペイロードがサブエージェントの身元を持たないとき、ハーネスがエージェントごとのフックを支えるなら、reviewer-scope 登録をレビュアーエージェント自身に範囲してください（Kiro CLI のパターン。アダプタは `agent_type` の一致ではなく `scoped_registration` を主張します）。

> **許される唯一の `core/` 編集: doctor 腕。** `/aidlc --doctor`（`core/tools/aidlc-utility.ts`）はインストール済みの木をヘルスチェックします。新しいハーネスは、自分のインストール面向けにハーネスごとの腕をそこに足します（アダプタ + 配線ファイルの存在、バイナリ版の下限）。これは意図したハーネスごとの *ロジック* であり、データではありません。版検査は CLI を産み、semver を較べます。マニフェスト 1 行では表現できません（三関心の規則: ナレッジはコードに住む）。だから「`core/` 編集ゼロ」の祝福された例外であり、違反ではありません（意図した設計の取捨）。優雅に劣化します。腕が無いハーネスは、失敗せず汎用検査だけを得ます。ほか全部（ディレクトリ解決、ルールディレクトリの改名、パッケージ）は純粋なマニフェストデータのままです。

## 手順 3 — `emit.ts`（命令の 20%、要るときだけ）

宣言行では表現できない構造のずれは `emit.ts` です。マニフェストが参照するプラグインで、パッケージャが `EmitContext`（`coreRoot`、`harnessRoot`、`distRoot`、`harnessDir`、`substituteToken`、`tierCap`）付きで呼びます。エミッタは出力を `distRoot` の下に書きます。Codex が実例です。`config.toml`、`hooks.json`、フック信頼の事前種まき、`AGENTS.md` のマージ、エージェント TOML の転置、`.agents/skills/` の木（`core/tools/aidlc-runner-gen.ts` が export する描画関数を `AIDLC_HARNESS_DIR` の下で組み立て、再実装しない）。面が全部手書きファイルのハーネス（Claude、Kiro）は `emit: null` です。

`--check` の下では、パッケージャは一時の `distRoot` を渡し、同じエミッタを走らせ、生成ルート全体をコミット済み配布と較べます。`<harnessDir>` の外の emit 所有ファイル（例: `.agents/skills/` とルート `AGENTS.md`）も、宣言出力と同じ欠け・差分・孤児検査に参加します。

## 手順 4 — 許される変換クラスは 1 つ

許されるテキスト変換は、スラッシュ錨のハーネスディレクトリ族だけです。`.md` 散文の `{{HARNESS_DIR}}` → ハーネスディレクトリ、加えてルールディレクトリの改名。盲目の `sed` はしません。`core/` の正直なハーネス固有リテラル（`$CLAUDE_PROJECT_DIR` の注記、workspace-detection のハーネスディレクトリ列挙）はトークンを持たず、そのまま通ります。コア衛生テスト（`t146-core-hygiene`）が、新しい生パスリテラルの滑り込みを守ります。

## 手順 5 — テストと門

- パッケージ一致テスト（`t145`）が `package.ts --check` を走らせます。マニフェストを持つどのハーネスも自動でカバーします。
- `<name>` フックアダプタの契約テストが、ライブ取得したペイロードをアダプタへ pipe し、観測できるコアフック効果を主張します。
- ライブ旅程は e2e として出荷し、`skipReason()` でゲートします（`AIDLC_<NAME>_*_LIVE=1` env + バイナリ存在 + 認証済み）。決定論的な層ではきれいにスキップし、移植がマージする前にローカルで緑にします。

再生成は `bun scripts/package.ts <name>`、ドリフト検査は `--check`、門は決定論的な一式（`bash tests/run-tests.sh --smoke --unit --integration -P 8`）とライブ旅程です。

## 次

弧は閉じます。データ面を形作り（01–08 章）、いまコアを新しい CLI へ焼きました。ここから:

- 地図全体は [ハーネスエンジニアガイドの概観](00-overview.md) へ。
- 新しいハーネスは、ほかと並ぶ **利用者向けの章** を得ます。既存の読み方は User Guide の [Running on other harnesses](../guide/harnesses/README.md) 族です。
- 規範のビルド契約（マニフェスト型、`emit` プラグイン API、`harnessDir()` 継ぎ目）は Developer Reference の [Architecture § Source vs distribution](../reference/01-architecture.md#source-vs-distribution-one-core-many-harnesses) です。
