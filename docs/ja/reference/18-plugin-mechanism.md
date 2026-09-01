# プラグインの仕組み

> 読者: Tier 2/3（チームで入れる人、フレームワークの貢献者）。

> **パスの慣例。** 以下の `<harness-dir>/` = ハーネスの実行時ディレクトリ（`.claude` / `.codex` / `.kiro` / `.aidlc`）。`plugins/<name>/` = 書いたプラグインソース。`dist/plugins/<name>/<harness>/` = 出した、インストールできるホストプラグイン。

この章は **AIDLC プラグイン** 系の正本です。任意で、所有があり、版付けされた寄与の集合 — 新しいステージ、エージェント、スコープ、方法 / ルール、センサー、doctor 検査、*既存コアステージへの加算変更* — をハーネス非依存の木として一度書き、各ハーネス向けに **本物のホストプラグインとして出す**。プラグインは `core/` を決して直しません。どのプラグインも無効なら、インストールは裸のコアとバイト一致です。系は、証明済みの編集無し継ぎ目一つ（加算で合成するフェーズルール）をどの面へも一般化し、専用インストーラではなく各ホスト自身のプラグイン機構で届けます。相互リンクは [Stage Definition](15-stage-definition.md)（プラグインが書くステージ frontmatter。`plugin` / `number` / `when` を含む）、[Engine and Skill System](17-skill-system.md)（コンポーザーが送りオーケストレータがルーティングするグラフ）、[Artifact Vocabulary](16-artifact-vocabulary.md)（名前空間規則）、執筆の通し [Authoring a Plugin](../harness-engineering/10-authoring-a-plugin.md)。

---

## 1. プラグインとは何か

プラグインは、宣言マニフェストとコア形の部分木を持つディレクトリ（かつ git リポジトリ）です。できることは:

- 新しいステージ（最初のコンパイルでエンジンが番号を付ける — プラグインは表示番号範囲を主張しない）、エージェント、スコープ、方法 / ルール（スペースメモリの種へ）、センサーを **足す**。
- 寄与の継ぎ目（§6）経由で、既存コアステージを **加算で変える** — ステージが出す・消費する・検査する・指示することを豊かにし、ステージ自身は直さない。

ファーストパーティプラグイン（AIDLC チームが出荷）とサードパーティプラグイン（ほかの誰でも）は **機械的に同一** です。同じ構造、同じ継ぎ目、同じ composer、同じホスト導入経路。違うのは出自だけです。プラグインが住むリポジトリは誰か、誰がレビューしたか。`plugins/test-pro/` が参照フィクスチャです。

仕組みが守る **設計原則**:

- **厳格加算、上書きは決してしない。** 寄与は *足す* だけです。構造面の集合和は可換なので、独立した著者が安全です。本当の衝突は、黙った last-writer-wins ではなく、プラグイン帰属付きの compose エラーです。
- **コアは不変。** どのプラグインも `core/` ファイルを直しません。プラグインが出荷するものはすべて、プラグイン自身の木にあります。
- **可逆で、切ると惰性。** プラグインを無効にすると、それが無いインストールへ正確に再合成します。
- **slug が身元。** ステージは、大事なところ（辺、ジャンプ、解決）ではどこでも slug で識別します。`number` は表示 / 順序専用なので、挿入したプラグインステージがコアを再番号付けしたり不安定にしたりしません。

## 2. なぜ導入時か、ホストプラグインとして届けるか

繰り返し出る設計の問いは、プラグインが *ビルド時* 成果物（中央で事前合成してコピー）か、*導入時* 成果物（消費者が選んだ集合の上で自分の機械で合成）かでした。仕組みは **導入時** です。広い生態系（npm、Cargo、Helm、VS Code、Nix）がすでに収束した構造上の理由が二つあります。

- **組み合わせ爆発。** N プラグインは有効部分集合を最大 2ⁿ 出します。中央ビルドはどの組み合わせも事前合成できません。事前に作る価値がある成果物は **裸のコア**（空集合）だけで、誰にとっても同一です。
- **遅い解決。** 正しいプラグイン集合 — と、同じステージへの 2 プラグインの寄与がどうマージするか — は、それらを選んだインストールの上でしか分かりません。

届け方は専用 AIDLC インストーラではなく、**ホスト自身のプラグイン系** です。フレームワークが対象にするどのハーネスも、すでにマニフェスト先行、git 配布のプラグイン模型を出荷しています（Claude Code の `.claude-plugin/`、Codex の `.codex-plugin/`）。AIDLC プラグインは *それらの一つ* です。これが **ハイブリッド** です。ストアがあるところ（Claude、Codex、opencode、Copilot は「ストア」配置として投影）では本物のホストプラグイン、無い一つ（Kiro）ではフォルダドロップ。帰結:

- **配布インフラは走らせない。** 顧客が自分のプラグインリポジトリをホストします（git + semver タグ + `marketplace.json`）。マーケットプレイス項目 1 つが、混成フリート向けにプラグインを列挙します。
- **信頼はホストネイティブ。** 組織制限はホストの管理許可リストを使います（Claude の `strictKnownMarketplaces`、利用者が上書き不可。Codex のハッシュピン信頼）。AIDLC は信頼層を作りません。
- **composer は導入時に走り、ホストフックが引き金。** 組み合わせごとの事前構築木はありません。SessionStart フックが選んだ集合を局所で合成します。

> **セキュリティ注記 — Kiro のフォルダドロップに導入時の信頼ゲートは無い。** Claude と Codex は、フックが走る*前に*自分の信頼プロンプト（管理マーケットプレイス / ハッシュピン承認）でプラグインを仲介します。Kiro にプラグインストアは無いので、フォルダドロップ経路は実行可能なプラグインファイルを **同等のゲート無し** でコピーします。木をドロップすることが信頼の判断です。Kiro IDE 投影は、`hooks/aidlc-plugin-compose.ts` のクロスプラットフォーム Bun ランチャを走らせる v2 SessionStart 登録を含みます。Kiro CLI 投影は、明示して走らせるコマンドへ合成を残します。どちらの Kiro プラグインドロップも `git clone && run` のように扱ってください。コードを走らせてよいソースからのみ入れ、ドロップが入れる差分をレビューし、動くブランチを追わずレビュー済みタグへプラグインリポジトリをピンしてください。composer 自身は加算で、`core/` を決して直しませんが、利用者のプロセス権限で実行します。

寄与の継ぎ目（§6）がこれが大事な理由です。構造的に VS Code の `contributes` + Cargo の加算 feature-union — 現場でいちばんよく合成する模型 — であり、ゲートキーピング無しで *どの* プラグインにも、ファーストパーティもサードパーティも、使えます。

## 3. プラグインの構造とマニフェスト

プラグインの木は `core/` の形を映すので、パッケージャがどのハーネスへも投影できます。一度書いてハーネス非依存です。

木は *設計した* 面として `core/` の全形を映します。✅ はきょうパッケージャが投影する部分木、⏳ は設計済みだがまだ投影していないもの（§7）です。

```text
plugins/<name>/
  .aidlc-plugin/plugin.json              # the manifest
  stages/<phase>/<slug>.md               # ✅ NEW stages (slug identity; number is display-only)
  sensors/aidlc-<id>.md                  # ✅ NEW sensor manifests
  tools/<id>.ts                          # ✅ sensor scripts (so a sensor can run)
  tools/<plugin>-doctor.ts               # ✅ optional /aidlc --doctor checks
  contributions/<phase>/<slug>.md        # ✅ ADDITIVE modifications to core stages (§6)
  agents/<plugin>-<role>-agent.md        # ✅ NEW agents (stem == frontmatter name)
  scopes/<plugin>-<name>.md              # ✅ NEW scopes (stem == frontmatter name)
  knowledge/<agent-slug>/…               # ✅ per-agent METHODOLOGY knowledge
  tests/                                 # the plugin's own content validation (integration tier)
  memory/{org,team,project}.md           # ⏳ method/rule additions → default-space seed (§7)
  memory/phases/<phase>.md               # ⏳
```

コアのスコープファイルは `aidlc-` ファイル名接頭辞を使います。プラグインのスコープファイルはそれをプラグイン接頭辞（`<plugin>-<name>.md`）に置き換え、ファイル名ステムは frontmatter の `name` と等しいです。プラグインのエージェントファイルも同じ規則です。`<plugin>-<role>-agent.md`、frontmatter の `name` はステムと等しい。

`.aidlc-plugin/plugin.json` は **宣言** マニフェストです。トップレベルはよくあるホストプラグインマニフェストの形を映します（マーケットプレイスやホスト道具が一覧 / 版付け / 信頼できるように）。AIDLC 固有の設定は入れ子の `aidlc` ブロックに隔離します。

```jsonc
{
  "name": "test-pro",                 // == dir name; "core", "aidlc", and "aidlc-*" are reserved; kebab-case
  "version": "0.1.0",                 // semver; checked against dependents' constraints
  "description": "…",
  "author": { "name": "AWS AIDLC" },
  "dependencies": ["core", "compliance@^1.2.0"],  // resolved vs git tags (<plugin>--v<version>)
  "aidlc": {
    "contributes": {                  // which subtrees this plugin ships
      "stages": "stages/", "agents": "agents/", "scopes": "scopes/",
      "sensors": "sensors/", "knowledge": "knowledge/",
      "tools": "tools/", "overlays": "contributions/"
    }
  }
}
```

決定論的な最小の書いたプラグインリポジトリを作ります。

```bash
bun <tools-dir>/aidlc-plugin-create.ts <name> [targetDir]
```

CREATE は空でない対象を拒否し、マニフェストと、名前空間付きの例ステージ、スコープ、エージェント、tests README を 1 つずつ出します。結果は直ちに妥当です。`hooks/compose.ts` は設計どおりありません。BUILD が同梱フックを注入するからです。

ビルド前に、書いたプラグインリポジトリを検証します。

```bash
bun <tools-dir>/aidlc-plugin-validate.ts <plugin-root>
```

出荷バリデータは、AIDLC プロジェクトもフレームワークチェックアウトも無しでオフラインに走ります。マニフェスト、ステージスキーマ、スコープとエージェントの身元、プラグイン局所の成果物衝突、`tools/` 下の事故のテスト / フィクスチャペイロード、ツールに同梱したテンプレートに対する vendored `hooks/compose.ts` を検査します。トップレベルの `aidlc plugin validate|build` 経路は同じ実装へ委ねます。`create|test` 経路は [RFC #723 §2e](https://github.com/awslabs/aidlc-workflows/issues/723) へ先送りのままです。

同じ外部リポジトリからホスト投影を 1 つビルドします。

```bash
bun <tools-dir>/aidlc-plugin-build.ts <plugin-root> <harness> [outDir]
```

ビルダは書く前に検証し、既定は `<plugin-root>/dist/<harness>/` です。チェックアウトパッケージャと出荷ビルダは同じ emitter を呼びます。ハーネスマニフェストが正本のままです。パッケージングは投影記録を `tools/data/plugin-targets.json` へ出し、スタンドアロンビルダがオフラインで消費します。

選んだインストールを変えずに合成をテストします。

```bash
bun <tools-dir>/aidlc-plugin-test.ts <plugin-root> \
  --install <project-root> [--harness <name>]
```

ツールは投影をビルドし、マニフェスト導出の導入ルートだけを使い捨て候補へコピーし、本物の compose フックを二度走らせ、drop 無しの最初の通過、プラグインステージとスコープを含むきれいな compose 後グラフ、バイト安定な二度目の通過を要求します。共有ハーネス葉は `--harness` が要ります。`--dist` は、RFC #722 マイルストーン 2 がリリース済みランタイムバンドル経路を出すまで予約のままです。

寄与パスはプラグイン相対で、プラグインルートから出ていけません。トップレベルは **寛容**（未知キーを保つ。前方互換と横断ツール耐性のため）。`aidlc` ブロックは **厳格**（未知キーを拒否。執筆のタイプミスを捕える）。投影はまだディレクトリ慣例（`stages/`、`sensors/`、`tools/`、`contributions/`、`scopes/`、`agents/`、`knowledge/`）で中身を発見するので、宣言した各値は正規ディレクトリと等しくなければなりません。設定可能なルーティングは先送りです。その部分木を投影できるまで、`memory` 宣言は拒否します。ステージ番号は表示専用なので、プラグインはマニフェストで番号範囲を主張しません。`overlays` は正規 `contributions/` のマニフェスト名で、コピーではなくマージが消費します。

## 4. 合成模型

composer は `裸のコア + {選んだプラグイン}` の上を一度走り、実効インストールを書きます。引き金の仕方に関係なく **同じ composer** が走ります。

| Host | Trigger | Trust |
|------|---------|-------|
| **Claude** | SessionStart hook (fires eagerly on session spawn) | managed allowlist (`strictKnownMarketplaces`) |
| **Codex** | SessionStart hook (fires lazily on first interaction) | one-time trust prompt, content-hash-pinned |
| **Kiro** (CLI/IDE) | `aidlc plugin sync` when the binary is on PATH, or manual `bun <plugin>/hooks/compose.ts` after the folder-drop | n/a - folder-drop distribution |

手順（引き金に関係なく同一）:

1. **解決** — 選んだプラグインと推移的 `dependencies` 閉包を、公開版に対して解決する。
2. **新しいプリミティブをコピー** — 各プラグインの `stages` / `agents` / `scopes` / `knowledge` / `sensors` / `tools` 部分木を対応するハーネスルートへ。`{{HARNESS_DIR}}` トークンをハーネスの実際のディレクトリへ置換。`memory` は先送りのまま（§7）。
3. **寄与をマージ** — ステージへのアクティブな寄与はすべて対象ステージのソースへ折り込む（§6）。構造面は集合和、散文フラグメントはアンカーで継ぎ込む。
4. **コンパイル** — `aidlc-graph compile` が `stage-graph.json` + `scope-grid.json` を再生成。オーケストレータは完全にそれらからルーティングするので、プラグインステージは合成された瞬間に走る。直す散文もスキルも要らない。

合成は独立オーバーレイの列ではなく N 方向マージ 1 回なので、**同じステージへ両方寄与する 2 プラグインは本当にマージされます** — 構造の追加は集合和、散文フラグメントは決定論的に並ぶ — 片方が黙ってもう片方を上書きするのではありません。実行時は合成に対して **読み取り専用** のままです。マージはすべて compose 時であり、セッションごとではありません。マージが直すのは **ステージソース**（コンパイル済み JSON ではない）なので、あとのどの `aidlc-graph compile`（例: rebuild-stage-graph フック）も **耐久** で、**冪等** です。どの SessionStart でも再実行しても新しいものは合成しません。

エンジン再インストールはグラフコンパイルとは違います。新しい `dist/<harness>/` をコピーするとコンパイル済みグラフとコアステージソースが上書きされるので、プラグイン所有ファイルとサイドカーは残っても、グラフ項目と寄与マージは消えることがあります。エンジンアップグレードのたびに `/aidlc plugin sync` を再実行してください。compose フック付きホストは、次のセッション開始でも面を直します。doctor の **Composed plugin surface** 検査は、欠けたプラグイングラフ項目と、古い構造または散文寄与の両方を検出します。読めない・壊れた有効プラグインサイドカーと、欠けたステージを対象にする記録も、飛ばさずに検査を落とします。すでに合成した構造値は、出自が壊れたあと安全に帰属できないので、無効なサイドカーは在庫エンジンを刷新し、そのサイドカーを外し、それから `plugin sync` を走らせて復旧します。

## 5. 選択

プラグインは足します。インストールが選びます。プラグインを合成するとファイルがインストールへコピーされ、加算寄与がマージされますが、そのインストールの利用者に見えるのは `<harness-dir>/tools/data/harness.json` が指名したプラグインだけです。

```json
{
  "harnessDir": ".claude",
  "rulesSubdir": "rules",
  "plugins": ["aidlc", "test-pro"]
}
```

`plugins` キーは任意です。無ければ、入れたどのプラグインも有効で、既存インストールを保ち、出荷コアをバイト一致にします。あるとき、一覧が有効集合です。`aidlc` は暗黙のコアプラグインです。省くとコアのステージ / スコープ / ランナーは無効になり、ファイルは入れたまま再有効化できます。例外は Initialization の 3 ステージです。ブートストラップにプラグイン身元は無いので、それらのステージは有効などのスコープでも常に有効です。

選択を見る・変えるには決定論ユーティリティコマンドを使います。

```bash
aidlc plugin list
aidlc plugin select test-pro
aidlc plugin select aidlc,test-pro
bun <harness-dir>/tools/aidlc-utility.ts select-plugins
bun <harness-dir>/tools/aidlc-utility.ts select-plugins test-pro
bun <harness-dir>/tools/aidlc-utility.ts select-plugins aidlc,test-pro
```

`select-plugins` は既知集合（`aidlc` に加え、コンパイル済みノードとスコープファイルで見つかったプラグイン名）に対して名前を検証し、`harness.json` を書き、グラフを再コンパイルし、ステージ / スコープランナーを再生成し、生成 SKILL.md のスコープ / ステージ表を一つのトランザクションで刷新します。`harness.json`、`stage-graph.json`、`scope-grid.json` をスナップショットし、遅い再生成ステップが失敗したら三つとも復元し、復元した選択に対して再生成鎖を再実行するので、インストールは裂けたままになりません。`/aidlc --doctor` は有効プラグイン、プラグインごとの有効ステージ件数を報告し、グラフの `enabled:false` フラグが `harness.json` と食い違えば hard-fail します。

`aidlc plugin sync` は、入れたプラグイン合成のコマンドライン前面です。発見したプラグインルートの `hooks/compose.ts` ファイルを走らせ、プラグインルートが設定されていなければ `no installed plugins; nothing to sync` できれいに終わります。ルートは設定されているがどれも `hooks/compose.ts` を持たなければ、exit 1 で各ルートと理由を指名します。混成集合では飛ばした各ルートを警告し、妥当なルートを合成し、exit 0 です。

### プラグイン doctor 検査

有効プラグインは `tools/<plugin>-doctor.ts` を出荷してよいです。`/aidlc --doctor` は合成したハーネス tools ディレクトリでそのスクリプトを発見し、シェル無しで Bun から直接走らせ、`AIDLC_PROJECT_DIR`、`AIDLC_HARNESS_DIR`、`AIDLC_PLUGIN_NAME` をセットします。無効プラグインのスクリプトは惰性のままです。`harness.json` に `plugins` 選択が無いとき、完全なステージ / スコープメタデータから知られる入れたどのプラグインも対象です。発見には、プラグインがステージまたはスコープを少なくとも一つ所有していることが要ります。ツール、センサー、ナレッジだけを出荷するプラグインは、doctor が発見できる身元を寄与しません。

スクリプトは JSON オブジェクト 1 つを stdout へ書きます。

```json
{
  "checks": [
    {
      "pass": false,
      "label": "required connector is installed",
      "fix": "install the connector and re-run doctor",
      "severity": "error"
    }
  ]
}
```

`severity` の既定は `error` です。落ちた error 検査は doctor を落とし、落ちた `advisory` 検査は表示とエクスポートだけで終了コードを変えません。通った検査は普通に描きます。doctor は入れたプラグインをコード信頼境界として扱いますが、失敗を閉じ込めます。spawn エラー、タイムアウト（既定 10 秒、正整数上書きは `AIDLC_PLUGIN_DOCTOR_TIMEOUT_MS`）、非ゼロ終了、無効な JSON / 形、壊れたエントリは、doctor を落とさず有界な所見になります。出力上限はプラグインにつき検査行 50、stdout 256 KiB、label / fix 300 文字です。

コンパイル済み `stage-graph.json` は入れたステージ集合全体を永続します。無効ノードは `"enabled": false` を運び、有効ノードはキーを省きます。実行時ローダは無効ノードをフィルタするので、ランナー、状態行、スコープ表、オーケストレーションは選んだグラフだけを見ます。`loadStageGraphAll()` は doctor と選択道具向けに予約です。ステージ番号は全グラフから割り当てるので、プラグインを無効にしてあとで再有効化しても正確な番号を保ちます。選択フィルタはステージ、スコープ、ランナーを覆います。無効プラグインの `agents/` と `knowledge/` ファイルはディスクに残り、**かつ** 読み込み可能です（エージェント名簿とナレッジ検索は選択フィルタされない）。それらをディスパッチするステージがフィルタされるので、何かが参照しなければ惰性です。

コンパイル済みスコープ格子は有効スコープ身元だけを含みます。無効プラグインのスコープファイルはディスクに残りますが、プラグインを再選択するまで妥当な実行時スコープではありません。コアが無効でプラグインスコープ所有者がちょうど一つ有効なら、自由文 / 既定スコープフォールバックはそのプラグインのアルファベット順最初のスコープを使います。複数のプラグインスコープ所有者が有効で、コアの好ましい `classic` フォールバックが使えなければ、オーケストレータはエラーし、明示 `--scope` を求めます。

プラグインを無効にすると、自分のファイルだけでなく、コアステージへマージしたものも外れます。compose は実際に適用した構造追加（produces / sensors / `required` と任意 `conditional_on` を含む完全 consume エントリ / scopes / required_sections、対象ステージごと）と、成功して適用した各フラグメントのアンカー / order / ハッシュを、プラグインごとのサイドカー `tools/data/plugin-contrib-<key>.json` に記録します。継ぎ込んだ散文フラグメントは自分の番兵マーカーも運びます。無効化時、`select-plugins` は同じロールバックトランザクションの中で両方を入れたステージソースから剥がすので、無効プラグインの寄与は有効ステージを操舵しなくなります。再有効化は次のセッション開始で戻します。プラグインの compose フックが再マージし、バイト一致です。

compose フックと `select-plugins` は、これらの変異を同じワークスペースロックで直列化します。ロックは入れたステージ編集、プラグインごとのサイドカー、選択書き、グラフ / 格子コンパイル、選択ロールバックにまたがるので、並行プラグインフックが互いの集合和更新を失わず、無効化が compose と競合して追跡されない寄与をアクティブに残せません。

選択はコンパイル時に閉包検査されます。有効ステージは、唯一の生産ステージが無効な成果物を要求してはいけません。エラーは消費ステージ、成果物、無効な生産ステージ、それらを提供するプラグインを指名し、それらのプラグインを有効にするか消費者を無効にするよう伝えます。プラグインだけの選択が、飢えた必須入力でステージをルーティングしてしまうのを捕えます。無効ステージを指す `requires_stage` 辺はエラーでは**ありません**（依存が走らないとき順序辺は空虚です。プラグインだけのインストールがコアのあとにプラグインステージを並べるのは正当）。ただし doctor はその落ちた辺を advisory として列挙します。

`select-plugins` は、アクティブなワークフローを座礁させる変更も拒否します。走っているワークフローのスコープを所有するプラグイン、または計画内の pending EXECUTE ステージを所有するプラグインを無効にすることは、各依存を指名して拒否します（先にワークフローを完了または park するか、プラグインを有効のままにする）。すでに座礁させる選択では doctor が hard-fail します。

選択がすでに存在するとき、プラグインを合成しても自動では有効になりません。compose フックはまだプラグイン自身のファイル（ステージ、スコープ、エージェント、ナレッジ、センサー、ツール — すべて実行時フィルタ）をコピーし、そのプラグインを出す `select-plugins` コマンドを指名する advisory drop を記録しますが、無効のあいだコアステージソースへ寄与をマージし**ません**。マージした寄与は選択フィルタを迂回し、マージするとセッション開始のたびに無効化時の剥がしが戻るからです。選択キーが無ければ、合成したプラグインは直ちにアクティブで、元の現状を保ちます。

`bundle` はきょう意図的に未使用です。語は将来のプラグイン集合概念向けに予約しています。プラグイン所有は常に `plugin:` で表します。

## 6. 寄与の継ぎ目

**寄与** は、名前付きの既存ステージを加算で変えるためにプラグインが出荷するファイルです。場所は `contributions/<phase>/<slug>.md`。対象を決して直しません。

```yaml
---
target: build-and-test        # the existing core stage being enriched
plugin: test-pro
adds:                         # STRUCTURAL — set-unioned into the stage node
  produces:
    - test-pro-regression-suite            # plugin-namespaced (§8)
  consumes:
    - artifact: test-pro-testability-requirements
      required: false
  sensors:
    - coverage-threshold
  required_sections:
    - "Branch Coverage"        # declared H2 (merged into the stage; not machine-enforced yet — see §9)
fragments:                    # PROSE — spliced into the stage body
  - anchor: after-step:8
    order: 100
---

## fragment: after-step:8

### Step 8a (test-pro): Branch + coverage enrichment
…prose the agent reads, inserted after the target stage's Step 8…
```

`bundle:` は予約で未使用です。プラグイン所有には `plugin:` を書いてください。

**マージの意味:**

- **構造面** — 対象ステージのソース frontmatter へ **集合和**。可換、順に依存しない、調整していない著者をまたいで安全。*きょう実装済み:* `produces`、`consumes`（成果物 + `required` + `conditional_on`、それぞれ保つ）、`sensors`、`scopes`、`required_sections`。`adds.scopes` はガードレールを二つ運びます。スコープの身元ファイルがすでに入っていなければならない（`scopes/<name>.md` の無い名前は全部 SKIP の幽霊として解決する）、その入れたファイルの `plugin:` frontmatter が寄与プラグインを正確に指名しなければならない — コアステージをコアまたは他プラグインのスコープの下に置くことは、もう片方の所有者が同意していない選択意味を変え、所有は名前接頭辞規則ではなくファイルの宣言所有者から来る（ダッシュ接頭辞はプラグイン名をまたいで重なる。コアスコープは `plugin:` を宣言せず、決してマージしない）。違反エントリはマージせず drop-with-log。*まだマージしない（先送り）:* `adds.requires_stage` — 寄与は宣言してよいが、compose フックはマージせず drops ログへ記録する（`--doctor` が表に出す）ので、欠落は見え、黙らない。卒業したらほかと同じく集合和する。
- **散文フラグメント**（ステップ / 質問散文の `fragments`） — 宣言したアンカーでステージ本文へ継ぎ込み、`(order, plugin)` で決定論的に並べる。継ぎ込んだ各ブロックは内容ハッシュ番兵で包み、アンカー / order / ハッシュは寄与サイドカーに永続するので、再合成は冪等、アップグレードしたフラグメントが以前のブロックを置き換え、散文だけのプラグインも検証できる出自を保ち、別プラグインのブロックはフック発火順に関係なく `(order, plugin)` でインターリーブする。エージェントは実行時に基底本文 + 並んだフラグメントを読む。
- **上書きは決して無い。** 寄与は足すだけです。ステージの `lead_agent` を変え、`consumes[].required` を緩め、フィールドを外し、既存ステップ散文を置き換えることはできません。上流振る舞いを *変える* 本当の必要はフレームワーク層の判断であり、プラグイン内の静かなパッチではありません。

**フラグメントアンカー:**

| Anchor | Inserts the fragment… |
|--------|------------------------|
| `after-step:<n>` | right after `### Step <n>`'s content (before the next heading) |
| `before-step:<n>` | immediately before `### Step <n>` |
| `after-questions` | after the questions-generating step |
| `end-of-steps` | at the end of the `## Steps` block |
| `in:<Compartment>` | at the end of the named `## <Compartment>` block |

**面ごと** — 上流変更の種類ごとにプラグインが使うもの。"Status" は、compose フックがきょうマージするもの対、設計済みだが先送りのものを印します。

| Change | Mechanism | Status |
|--------|-----------|--------|
| Stage asks new questions | `fragments` of question prose | ✅ implemented |
| Stage produces an extra artifact | `adds.produces` + a `fragments` step that emits it | ✅ implemented |
| Stage requires new sections | `adds.required_sections` | ✅ merged (⚠️ declarative — not machine-enforced yet, §9) |
| Add a verification to a stage | `adds.sensors` (+ ship the manifest and `tools/` script) | ✅ implemented |
| Add a consume edge | `adds.consumes` | ✅ implemented |
| Add a `requires_stage` edge | `adds.requires_stage` | ⏳ deferred (declared → logged, not merged) |
| Put an existing stage under a plugin scope | `adds.scopes` (own-plugin scopes only; installed identity file required) | ✅ implemented |
| Inject phase policy / guardrails | ship `memory/phases/<p>.md` into the default-space seed (§7) | ⏳ deferred (not yet projected) |

## 7. 方法 / ルール、エージェント、ナレッジ、スコープ、起動

この節は、新しいステージ + 寄与の継ぎ目を超えた面です。著者が誤導されないよう状態を明示します。

**方法 / ルール → メモリの種** *（⏳ 先送り）。* フレームワークのルール層はスペースごとの **memory** 木（`aidlc/spaces/<space>/memory/{org,team,project}.md`、`phases/<phase>.md`）で、`core/memory/` から種まきします。設計は、プラグインが `memory/phases/<p>.md` を寄与し、その種へ集合和することです。パッケージャはまだプラグインの `memory/` 木を投影しないので、きょう効果はありません。

**エージェント** *（✅ 投影 + 合成）。* プラグインは新しいペルソナを `agents/<plugin>-<role>-agent.md` の下へ出荷し、frontmatter の `name` はファイル名ステム、`plugin: <plugin>` です。compose はコアやほかのプラグインを壊さずに `<harness>/agents/` へコピーします。同一ファイルは冪等スキップ、同じ行き先の違う中身は drop-logged です。OpenCode では、compose はさらに `mode: subagent`、`permission.task: deny`、OpenCode 妥当な model / memory frontmatter 付きのネイティブ `.opencode/agents/` 双子を出します。Kiro では、compose は `.kiro/agents/` ペルソナから未対応の `disallowedTools: Task` 行を外し、Kiro のネイティブエージェントツール設定がネスト委譲を使えないままにします。違う `disallowedTools` 値は drop-logged で、ペルソナはコピーしません。再 compose は、投影前 composer からの正確で変わっていない同じプラグインコピーのときだけ、既存ペルソナを移行します。編集済みまたは他者のファイルは no-clobber 振る舞いを保ちます。すでに合成した未対応値はその場に残り、再 compose 前に外すファイルを指名する劣化した診断を出します。

Kiro CLI、Codex、OpenCode では、エンジン名簿の Markdown ペルソナは `mode: inline` にだけ使えます。ネイティブディスパッチはさらにハーネスごとのディスパッチ面が要ります。Kiro CLI では手書き agent-v1 JSON に加えコンダクターの `trustedAgents` 一覧への登録、Codex ではエージェント設定 TOML（出荷の `aidlc-*-agent.toml` 形）、OpenCode ではネイティブ `.opencode/agents/` サブエージェントファイル。Kiro IDE は代わりに入れたエージェント Markdown 自身をディスパッチしますが、`tools:` が空でなく、`permissions.rules` に整った `capability` / `effect` / `match` エントリが少なくとも一つあるときに限ります。空の permissions、欠けたまたは空の rules、壊れたエントリは拒否します。だから compose は、ディスパッチトポロジ（リードとサポートの `mob`、`pipeline`、`subagent`。どのゲート付きステージでもモードに関係なく `reviewer:`）が、完全な入れたディスパッチ面の無いエージェントを指名するプラグインステージを拒否し、ステージ、エージェント、手当てを compose drops ログに記録します。Kiro CLI では JSON と `trustedAgents` 登録を独立に検査します。片方だけでもステージを拒否します。Kiro IDE では、入れた `.md` に必須ブロック両方を書くか、ステージを `mode: inline` に変えてください。IDE 経路は `aidlc.json` を読みません。OpenCode — compose 自身がネイティブ面を出す唯一のハーネス — では、ネイティブ双子発行を生き延びるプラグイン出荷ペルソナ（閉じた frontmatter、投影不能な `disallowedTools` が無い）がその面として数えます。Kiro / Codex 面は常に手書きなので、プラグイン自身のファイルはそれらの検査を満たしません。欠けた面を手で書いて compose を再実行するとステージを受け付けます。Markdown ペルソナは、それを使う受け付けたどのインラインステージ向けにも合成されたままです。

`agent-team` はスキーマ予約ですが実行時消費者が無いので、compose はどのハーネスでもそれを選ぶプラグインステージを、黙ってインラインとして扱わず拒否します。入れたステージパーサが使えなければ、Kiro / Codex / OpenCode の compose は fail-close します。明示 `mode: inline` スカラーがあり `reviewer:` が無いステージだけを受け付けます（引用スカラー形は認識する）。no-clobber アップグレードは古いフックが合成したステージを外せないので、これらのディスパッチ検査に落ちる既存ステージはディスクに残りますが、手当てを指名する劣化した health 行を出します。

**ナレッジ = 方法論のみ** *（✅ 投影 + 合成）。* プラグインはエージェントごとの方法論ナレッジを `knowledge/<agent-slug>/` へ出荷し、`<harness>/knowledge/<agent-slug>/` へ合成します。領域 / スペースナレッジ（`aidlc/spaces/<space>/knowledge/`）はブートストラップ時に空の利用者実行時状態で、プラグインは出荷も種まきもしません。

**スコープ** *（✅ 投影 + 合成）。* プラグインスコープの身元は `scopes/<plugin>-<name>.md` の下のファイル 1 本で、frontmatter の `name` はファイル名ステム、`plugin: <plugin>` です。compose は壊さずに `<harness>/scopes/` へコピーします。プラグインが書いたステージの所属は、それらのステージの `scopes:` frontmatter 経由です。プラグインスコープは、好ましいコア `classic` 既定が無効なときに自分を指名する `freeform_default: true` をセットしてよいです。有効スコープが高々一つだけ指名を主張してよく、曖昧な選択集合はグラフコンパイルが拒否します。既存コアステージへプラグインスコープを足すのは、寄与の `adds.scopes`（§6）経由です。自プラグインスコープのみ、マージ前にスコープファイルが入っていなければなりません。

**起動（`when:`）** *（⚠️ 解析するが評価しない）。* ステージは構造化 `when:` 述語を運んでよいです。`{producer-in-plan: X}` はスキーマ検証と解析されますが、**エンジン消費者はまだ評価しません** — `aidlc-graph` が将来の家として自分を指名します。だから `when:` を運ぶステージはきょう、宣言スコープの下で無条件に EXECUTE です。プラグイン自身のステージは、プラグインが選んだ集合にあるときだけ存在するので、「このプラグインはアクティブか」はすでに compose 時の事実です。

**`plugin.json` の `aidlc.contributes`。** VALIDATE はブロックを読み、未知キーを拒否し、いま投影するどの部分木にも正確な正規値を要求します。BUILD と TEST は同じ所見で止まり、直接発行は出力を置き換える前にもう一度パス契約を断言します。emitter はまだ任意マニフェストパス経由ではなくディレクトリ慣例でバイトを発見します。設定可能なルーティングは先送りのままです。投影が存在するまで `memory` は拒否します。`aidlc.lock.json` 読みもありません。composer はきょうロックファイルから何も解決しません。

## 8. マルチテナントのガード

一度も調整しない独立した著者を安全に保つのは:

- **名前空間。** 寄与する成果物の論理名は `<plugin>-` 接頭辞。`core-*` は予約。プラグインのステージ、エージェント、スコープ、センサーは、選んだ集合を横断しコアに対して一意であるべきです。プリミティブファイル衝突は no-clobber で、帰属付き drop-logged（黙った影付けは無い）。
- **依存解決。** `dependencies` は git タグに対する semver で解決。循環は拒否。満たせない依存は、要求プラグインを指名する compose エラー。
- **決定論的な並び。** 唯一の非可換面（散文フラグメント）は明示 `(order, plugin)` で並び、読み込み順では決して並ばない。
- **衝突は見える。** 本当に非可換な衝突 — 同じステージの同じフラグメントアンカーで同じ order、満たせないプラグイン横断辺、重複プリミティブパス — は、オーバーレイ順で解決せず、帰属付きで落とすか拒否する。

## 9. As-built: 発行、導入、作業例

共有プラグイン emitter は、書いたルート 1 つをホストプラグイン 1 つへ投影します。`bun scripts/package.ts` は発見したファーストパーティ `plugins/<name>/` ルート向けに呼び、`aidlc-plugin-build.ts` は外部プラグインリポジトリから呼びます。各投影は `.aidlc-plugin-projection.json` を運び、置換権限を論理プラグインと正確なハーネスへ結び、加えてホストネイティブマニフェスト（`.claude-plugin/` / `.codex-plugin/` / Copilot `.plugin/` / `.kiro-plugin/` / `.opencode-plugin/` / `.cursor-plugin/`）、`marketplace.json`、compose フック、プラグインの中身（完全な `number` / `plugin` / `when` frontmatter 付きステージ — スキーマはネイティブに受け付ける）。一致する妥当なマーカーの無い空でない出力は決して掃除しません。force 迂回はありません。Cursor はプラグインエージェントの compose 入力を `aidlc/agents/` の下に保ち、Cursor が自動発見するルート `agents/` の外です。compose は入れた `.cursor/agents/` 名簿へ、ハーネストークンを解決し指名モデルピンを外したネイティブコピー 1 つを投影します。compose フックは持ち運び可能な `compose.ts` 1 本（bun — GNU 固有シェル無し）で **ハーネス非依存** です。プラグインルートは `CLAUDE_PLUGIN_ROOT | PLUGIN_ROOT | AIDLC_PLUGIN_ROOT` から解決し、出したフック位置へ落ちます。プロジェクトディレクトリは `CLAUDE_PROJECT_DIR | AIDLC_PROJECT_DIR | PWD`（Codex はプロジェクトディレクトリ変数を未設定のまま — PWD がフォールバック）。ハーネス葉は `AIDLC_HARNESS_DIR` から、各ホストコマンドまたは Cursor ランチャが供給します。Cursor のランチャはさらに SessionStart `workspace_roots` を解析し、AI-DLC Cursor インストールを運ぶ唯一のルートを選び、`AIDLC_PROJECT_DIR` が一つを選ばない限り一致ルートが複数なら拒否します。新しいステージ / スコープ / エージェント / ナレッジ / センサー / ツールを壊さずにコピーし、継ぎ目を冪等にマージし（内容ハッシュ番兵継ぎ込み、書く前に比較）、落とさなければならない寄与（欠けた対象、壊れたアンカー、入れたエンジンが受け付けないキー）をプラグインごとの `<hooksHealthDir>/plugin-compose-<key>.drops` ファイルへ記録します。コアフックが書き `/aidlc --doctor` が走査する同じスペースごとの health ディレクトリであり、セッションを落としません。入れたテスト / フィクスチャペイロードは、合成するハーネス葉でキー付けしたハーネスごとの `plugin-compose-installed-tool-payloads-<harness>.drops` 記録で別に監査します。走査は、直したプラグイン投影にもうパスが無くてもそのハーネスの入れたツール木を歩くので、あるハーネスのきれいな compose が別ハーネスの advisory を消さず、古い compose 版がツールファイル出自を格納しなかったので、次に compose するプラグインへ帰属させずにレガシーファイルを報告します。センサーマニフェストはコピー時ガードを追加で運びます。発見は `sensors/` を平坦に走査し、`aidlc-<id>.md` に一致するベース名だけ索引するので、ほかの名前（またはサブディレクトリに入れ子）のプラグインマニフェストは合成されても発火しません。compose はそのようなマニフェストを拒否し、ファイルと必須の形を指名する劣化した drop を記録し、古い compose フックがすでに着地させたものも次の実行で同じように報告するので、誤名センサーがディスク上で黙って死にません。

出したホストマニフェストがプラグイン身元の正です。compose はホストパッケージ ID `aidlc-<name>` を論理 `<name>` へ戻し、`plugin:` フィールドが違う所有ステージ、スコープ、エージェント、寄与中身を拒否します。入ってくるスコープ / エージェント名はファイルを受け付けるときに予約するので、1 プラグイン木内の重複身元はコンパイル前に落ちます。構造一覧比較は引用ありと無しの YAML スカラーを正規化します。compose はさらにトランザクション全体で realpath キーのワークスペースロックを持ちます。グラフコンパイルが失敗したら、新しくコピーしたファイルと寄与書きを、リトライマーカーを書く前に復元します。

出した SessionStart コマンドは先に `PATH` 上の `aidlc` を探り、使えるときは `aidlc plugin sync` を走らせます。持ち運び可能なランチャは、CLI が使えないとき直接 bun の `hooks/compose.ts` 呼び出しへ落ちます。

Cursor の出したフックは Cursor の平らな camelCase スキーマ（`hooks.sessionStart[].command`）を使い、`./hooks/aidlc-plugin-compose.ts .cursor` を呼びます。その Bun ランチャは `Bun.which` と `process.execPath` で `aidlc` を探り、兄弟 `compose.ts` を持ち運び可能に走らせます。ネイティブ Windows で `sh -c` 依存はありません。Kiro IDE の v2 SessionStart 登録は、投影をワークスペースルートへフォルダドロップしたあと、同じランチャを `.kiro kiro-ide` 付きで使います。

**導入、ホストごと:**

```bash
# Claude Code
/plugin marketplace add <repo-or-path>/dist/plugins/<name>/claude
/plugin install aidlc-<name>@aidlc-plugins        # SessionStart hook composes on next session

# Codex CLI (in a git repo)
codex plugin marketplace add <…>/dist/plugins/<name>/codex
codex plugin add aidlc-<name>@aidlc-plugins       # approve the one-time hook trust

# Kiro (no store — folder-drop, then run the composer explicitly).
# PLUGIN_ROOT is the emitted projection dir (it carries hooks/compose.ts + the
# plugin content); PROJECT_DIR is the install you dropped .kiro into.
PLUGIN_ROOT="$(pwd)/dist/plugins/<name>/kiro"
cp -r "$PLUGIN_ROOT"/. <project>/
AIDLC_PLUGIN_ROOT="$PLUGIN_ROOT" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro aidlc plugin sync
# fallback when aidlc is not installed:
AIDLC_PLUGIN_ROOT="$PLUGIN_ROOT" AIDLC_PROJECT_DIR="<project>" \
  AIDLC_HARNESS_DIR=.kiro bun "$PLUGIN_ROOT/hooks/compose.ts"
```

それから `/aidlc plugin list` と `/aidlc --doctor` が有効集合を映します（例: `core + test-pro` の 34 ステージグラフ、または `select-plugins` が狭めたフィルタ済みグラフ）。スコープ付き実行（`/aidlc --scope enterprise`）は、スコープが経路に置いたところへプラグインのステージをルーティングします。

**作業例 — 混成フリート横断の test-pro。** プラットフォームチームは `test-pro` を一度公開します（リポジトリを検証し、`aidlc-plugin-build.ts` で対応ハーネス投影を各々ビルドし、`aidlc-plugin-test.ts` で使い捨て導入候補に対して各投影をテストし、`<plugin>--v<version>` タグを押し、生成したマーケットプレイスメタデータを公開）。Claude チームは `/plugin install`。Codex チームは `codex plugin add`（信頼を一度承認）。Kiro チームは `git pull` + 上のように composer を明示実行。どの場合も composer は test-pro の新しいステージ 2 つ **と** `build-and-test` / `nfr-requirements` / `nfr-design` / `performance-validation` への寄与をマージします。同じ豊かな、34 ステージ、doctor きれいなインストールです。ハーネス投影 7 すべて（Claude、Codex、Cursor、Kiro CLI、Kiro IDE、opencode、GitHub Copilot）で検証済みです。

**Status.** 実装し検証済み: `number` / `name` / `plugin` / `when` のスキーマ支援（`aidlc-stage-schema.ts`）。書いた `plugin` 所有のコンパイル側持ち越し（コアはフィールドを省く）。`harness.json` + `select-plugins` 経由の導入時選択（全グラフ永続、フィルタ済み実行時読み込み、閉包検査、ランナー刈り込み、doctor 行、compose advisory drop を含む）。有界 fail-loud 実行の選択認識 `tools/<plugin>-doctor.ts` 検査。スタンドアロンオフライン執筆ツール `aidlc-plugin-create.ts`、`aidlc-plugin-validate.ts`、`aidlc-plugin-build.ts`、`aidlc-plugin-test.ts`（決定論足場、同梱 compose フックテンプレート、マニフェスト導出ハーネス対象データ、正規寄与パス検証、プラグイン / ハーネス結び出力マーカー付き）。同じツールへ委ねるトップレベル `aidlc plugin validate|build` 経路。`aidlc plugin list` と `aidlc plugin sync`。プラグイン名前空間のステージ / スコープランナー生成。共有パッケージャ / スタンドアロン emitter（発見したどのハーネス投影も）。プラグイン `stages/`、`scopes/`、`agents/`、`knowledge/`、`sensors/`、`tools/` の投影と no-clobber compose。ハーネス非依存 compose フック（`scripts/plugin-hooks-template/compose.ts`）。再利用 `tests/harness/plugin-kit.ts` のビルド、共有 compose サブプロセス / drop 読み、委譲内容検証、ライブ呼び出しヘルパ。`produces` / `consumes` / `sensors` / `scopes`（自プラグイン、入れたファイルガード付き） / `required_sections` + 散文フラグメント（内容ハッシュ、冪等、順決定論）の寄与継ぎ目。ガードは `tests/integration/t188-plugin-compose.test.ts`（compose 仕組み）、`tests/integration/t224-plugin-selection.test.ts`（選択）、`tests/integration/t300-plugin-kit.test.ts`（再利用キット）、`tests/integration/t327-plugin-author-routes.test.ts`（トップレベル執筆経路）、`tests/unit/t314-plugin-validate.test.ts`（オフラインバリデータ）、`tests/unit/t315-plugin-build.test.ts`（隔離バイト一致ビルダ）、`tests/unit/t316-plugin-test.test.ts`（隔離候補 compose 層）、`tests/unit/t317-plugin-create.test.ts`（隔離ツールチェーン全体足場）、`tests/unit/t313-plugin-doctor-checks.test.ts`（doctor ランナー）、各プラグイン自身の `tests/`（内容。統合層へ配線）。トップレベル `aidlc plugin create|test` 経路は RFC #723 §2e へ先送りのまま。`aidlc-plugin-test --dist` は RFC #722 マイルストーン 2 がリリース経路を出すまで予約のまま。**先送り / まだ配線していない:** プラグイン `memory/` 部分木の投影 / マージと設定可能な `aidlc.contributes` ルーティング。`adds.requires_stage` マージ（宣言 → 記録）。`when:` 述語評価（解析するがエンジン消費者無し）。マージした `required_sections` の機械強制（フィールドはマージ + 検証するがコンパイル済みノードへ届かず、出荷 required-sections センサーは期待をテンプレートから導く — 宣言節が欠けてもステージはまだ落ちない）。`after-questions` フラグメントアンカー（`locateAnchor` にケースが無い — "unknown anchor" を drop-log。`after-step:<n>` を使う）。どのロックファイルまたは `dependencies` の読み。NEW slug の番号種まきは辺認識です。最初のコンパイルは各フェーズの新しいステージのバッチを自分の `requires_stage` 辺で並べ（タイは書いた `number:` ヒント、それから slug）、その順で次の空き連続索引を割り当てます。エンジンが番号値をすべて所有します（著者は主張しないので、調整していないプラグインは衝突できない）。複数ステージプラグインの部分 DAG はファイル名に関係なく流れ順で種まきし、すでにピンした行は JSON 値を保ちます。書いた `name:` が新しい slug の表示名を種まきします。

## 9. 不変条件

- **コアは不変。** どのプラグインも `core/` を決して直さない。
- **加算のみ。** 寄与は足す。上書きも削除もしない。
- **切ると惰性。** どのプラグインも無効にすると裸のコア、バイト一致。
- **composer は一つ、ホストが引き金。** 同じコードがどこで走っても合成する。中央で事前構築する成果物は裸のコアだけ。
- **プラグインはホストプラグインである。** パッケージャは本物の `.claude-plugin/` / `.codex-plugin/` / Copilot `.plugin/` / `.kiro-plugin/` / `.opencode-plugin/` / `.cursor-plugin/` マニフェストを出し、ホストのネイティブコマンドで入れる。AIDLC は配布インフラを走らせない。
- **slug 身元、表示専用番号。** プラグインステージを挿入してもコアは再番号付けしない。
- **信頼はホストネイティブ。** 組織制限はホストの管理許可リストを使う。AIDLC は信頼層を作らない。
- **ゲートキーピング無し。** ファーストパーティとサードパーティのプラグインは機械的に平等。違うのは出自だけ。

## Cross-references

- [Authoring a Plugin](../harness-engineering/10-authoring-a-plugin.md) — 著者向けの通し（フィクスチャを端から端まで作る）。
- [Stage Definition](15-stage-definition.md) — ステージ frontmatter 契約。`plugin` / `number` / `when` を含む。
- [Artifact Vocabulary](16-artifact-vocabulary.md) — 論理名の名前空間。
- [Engine and Skill System](17-skill-system.md) — コンポーザーが送りオーケストレータがルーティングするコンパイル済みグラフ。
- 例設定文書（`marketplace.json`、`managed-settings.json`、`aidlc.lock.json`）は [`examples/test-pro/`](examples/test-pro/)。合成タイミングの証拠と順序付きビルド履歴はこのリポジトリの git ログに残しています。
