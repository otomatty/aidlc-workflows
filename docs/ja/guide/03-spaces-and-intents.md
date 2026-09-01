# スペースとインテント

[最初のワークフロー](02-your-first-workflow.md) では、1 回の実行を最初から最後まで追いました。実際の仕事は、そう一列にはなりません。機能を進めている途中に緊急のバグが入り、別チームが同じリポジトリを共有する、というのが普通です。この章では、AI-DLC が **一つの場所** — *ワークスペース* — に **複数** の仕事をどう置くか、そしてそこを動く二つの概念、**スペース** と **インテント** を説明します。

短い版: **インテント** は仕事 1 件（ライフサイクルの 1 回の実行）。**スペース** は、あるチームのインテント、ナレッジ、プラクティスの世界です。ほとんどの人は `default` という一つのスペースだけで動き、スペースを意識しません。インテントを始めて、切り替えるだけです。この章の残りは、その動きと、ものがどこに置かれるかです。

---

## 一つのワークスペースを、いまの仕事で分ける

AI-DLC を入れると、エンジンがプロジェクトにコピーされます。ハーネス固有のディレクトリは一つだけです（Claude Code は `.claude/`、Kiro は `.kiro/`、Codex は `.codex/`、opencode と GitHub Copilot は `.aidlc/`）。レイアウトのうちハーネスで違うのは、そこだけです。以降、AI-DLC が作るものはすべて、プロジェクトルートの中立な `aidlc/` に置かれます。並びは *どのハーネスで走らせたか* ではなく *いま何をやっているか* です。見るのは `aidlc/` で、エンジンのディレクトリを開く必要はありません。

次は、チームが二つ、進行中のインテントがいくつかある、完成したワークスペースです（エンジンディレクトリは `.claude/` で書いてあります。Kiro や Codex では `.kiro/` や `.codex/` と読み替えてください）。上から下へ読んでください。この章の頭の中の地図になります:

```
my-project/
│
├── .claude/                      THE ENGINE — tools, hooks, skills, agents.
│                                 (or .kiro/ / .codex/ — the one harness-specific dir)
│                                 You never browse this; it just runs /aidlc.
│
├── aidlc/                        EVERYTHING AI-DLC — neutral, browsable, committed to git
│   ├── active-space              ← cursor: which space you're in (gitignored, per-user)
│   └── spaces/
│       ├── default/              ★ the only space most people ever see
│       │   ├── memory/           THE METHOD — how this team works (committed)
│       │   │   ├── org.md          framework defaults
│       │   │   ├── team.md         your team's practices  (overrides org)
│       │   │   ├── project.md      project-specific practices (overrides team)
│       │   │   ├── phases/         phase-scoped rules
│       │   │   └── templates/      your output-format overrides, one per artifact
│       │   │
│       │   ├── knowledge/        DOMAIN KNOWLEDGE — standards an agent reads (committed)
│       │   │   │                   free-form; empty until you add files
│       │   │   ├── documents/      YOUR ORIGINALS — PDFs, Word, Markdown (you own this)
│       │   │   │                     nest them however you like; never reorganised
│       │   │   └── documentkb/     THE CATALOG — derived from documents/ (tool-owned)
│       │   │       ├── index.json     every indexed document, with its state
│       │   │       └── <doc-id>/      metadata.json + extracted content.md
│       │   ├── codekb/           CODE KNOWLEDGE — what each repo is (committed, per-repo)
│       │   │   └── <repo>/          architecture, component inventory, freshness marker
│       │   │
│       │   └── intents/          THE RECORD — one subdir per piece of work
│       │       ├── active-intent   ← cursor: which intent is current (gitignored)
│       │       ├── intents.json    the registry: every intent + its scope/repos/status
│       │       ├── 260620-inventory-api/        ✓ a completed intent
│       │       └── 260624-export-bug/           ◷ an in-flight intent
│       │           ├── aidlc-state.md             where this intent is in the lifecycle
│       │           ├── audit/                     the decision trail
│       │           └── inception/requirements-analysis/requirements.md   …artifacts
│       │
│       └── payments-team/        another SPACE (another team) — identical shape
│           └── memory/  knowledge/  codekb/  intents/
│
├── repo-a/                       YOUR CODE REPOS live as siblings (each its own git)
└── repo-b/                       an intent can span more than one
```

この木から抜き出すべきは三つです。それが全体の考え方です:

- **`aidlc/spaces/<space>/`** は、一つのチームが完結した世界です。方法論（`memory/`）、ナレッジ、コードナレッジ、全インテントの記録。`spaces/default/` は最初からあり、一人開発者や単一チームなら、それより先は見ません。
- **`intents/<YYMMDD>-<label>/`** は仕事 1 件です。[最初のワークフロー](02-your-first-workflow.md) が埋めていった、実行ごとのレコードです。`<YYMMDD>` は短い UTC 日付なので、レコードは時系列に並びます。`<label>` は人が読める短い名前です。同一性そのものはディレクトリ名ではなく、レジストリの UUIDv7 が持つので、同日同ラベルのインテントも別物のままです。
- **カーソルは二つ** — `active-space` と `active-intent` が、*いまどこにいるか* を記録します。利用者ごと（gitignore）なので、二人のチームメイトが別のインテントに同時にいても、共有ファイルを奪い合いません。

> **古い版からのアップグレード?** 以前のリリースは、プロジェクトルートの平坦なディレクトリにワークフローを一つだけ置き、新しい実行が上書きしていました。ワークスペースモデルは、上のインテントごとのレコードディレクトリに置き換えるので、複数の仕事を並べても、一方が他方を潰しません。

---

## インテント — 仕事 1 件につき 1 つ

**インテント** は、AI-DLC ライフサイクルの 1 回の実行で、一つの作業にスコープされます。どのインテントも、スペースの `intents.json` レジストリに 1 行持ちます — `{uuid, slug, dirName, scope, repos, status}` — そしてその実行の状態、監査証跡、成果物を抱える **レコードディレクトリ** を持ちます。衝突しない正式な同一性は `uuid`（UUIDv7）です。`dirName` は、人が読むレコードディレクトリ名をそのまま残します。

インテントを作る専用コマンドはありません。仕事を初めて書いたとき、エンジンがインテントを **自動作成** します:

```
/aidlc Build a REST API for inventory management
```

空のワークスペースでは、これでインテントが発行され、レコードディレクトリ `aidlc/spaces/default/intents/260624-inventory-api/` が作られ、アクティブなインテントになり、最初のステージが始まります。前の章で見た実行そのものです。

### 二つ目の仕事を始める

ワークスペースが効くのはここです。機能の途中で、無関係なバグに手が要るとします。アーカイブも init コマンドも不要です。新しい仕事を書くだけです:

```
/aidlc Fix the timeout on the export endpoint
```

すでにインテントがアクティブなとき、AI-DLC はこれを *いまの機能の続き* ではなく *新しく、無関係な* 仕事と見て、一つ目の横に **二つ目のインテントを始めるか** を聞きます:

```
▸ This looks like new work, separate from "inventory-api". Start a second intent?
  (1) Yes — start a second intent (scope: bugfix)
  (2) No — this continues the inventory-api work
```

- **Yes** を選ぶと、AI-DLC は二つ目のインテント（ここでは `bugfix`）を作り、そちらへ切り替え、最初のステージを始めます。inventory-api のインテントはそのままです。レコードディレクトリ、状態、進捗は、置いた場所に残ります。
- **No** を選ぶと、AI-DLC はメッセージをアクティブなインテントの一部として扱います。

AI-DLC が二つ目のインテントを、聞かずに作ることはありません。ゲートへの返答や要件の訂正など、いまの仕事の続きなら、アクティブなインテントに留まります。提案が出るのは、仕事が明らかに別物のときだけです。

### インテントを切り替える

スペース内のインテントを一覧し、名前（slug）で切り替えます:

```
/aidlc intent                     List all intents in the active space
/aidlc intent export-bug          Switch the active intent to "export-bug"
```

切り替えは、呼び出したセッションの紐づけを更新し、`active-intent` カーソルへ書き通します。そのセッションの次の `/aidlc` は、止まった場所からインテントを再開します。同じステージ、同じ状態、同じ監査証跡です。インテントはいくつでも同時に抱え、自由に行き来できます。それぞれ独立した実行です。

> 引数なしの `/aidlc intent` は読み取り専用で、一覧するだけです。機械可読にするなら `--json` を付けます。フラグの全体は [CLI コマンド](12-cli-commands.md) です。

### 一つのチェックアウトでの並行セッション

生きているセッションは、マシンローカルの紐づけを `aidlc/.aidlc-sessions/<session-id>.binding.json` に持ちます。紐づけはそのセッションのスペースとインテントを記録するので、別のターミナルや IDE ウィンドウが共有カーソルを動かしても、このセッションのワークフローは黙って動きません。

セッションの同一性は、次の順で決まります:

1. フックに渡されたホストのセッション id
2. ハーネスプロセスから継いだ、有効な `AIDLC_SESSION_OVERRIDE`
3. いちばん近い、生きている PID 祖先のエントリ
4. セッション同一性なし

同一性が分かったあとの優先は、明示のスペース／インテントセレクタ、そのセッションの紐づけ、共有の `active-space` と `active-intent` カーソル、既存の「インテントが一つだけ」「空のワークスペース」フォールバック、の順です。

ヘッドレスの自動化では、`AIDLC_SESSION_OVERRIDE` は個別のツールコマンドではなく、ハーネスのプロセスに付けます。起動されたツールは同じ同一性を継ぎます。その上書きが PID 祖先から見つかったセッションと食い違うと、AI-DLC はどちらのワークフローにも書く前に拒否し、所有している会話か、インテント／スペースの切り替え動詞で結び直すよう案内します。`AIDLC_SESSION_OVERRIDE_SOURCE=payload` は、同じ利用者の内部契約であり、認証されたセキュリティ境界ではありません。両方の変数を意図して付けると、許可されたセッション切り替えとして扱います。

カーソルは、書き通しの互換状態のままです。紐づけが無い古い環境や未対応環境は、以前とまったく同じ動きです。

セッション紐づけは、スペースをまたいだワークフロー選択を隔離します。一方、ハーネスネイティブの方法論 include は、チェックアウト全体で一つの、書き換え可能な面のままです。SessionStart とスペース切り替え動詞は、その面を選んだスペースへ付け替えます。そのため、別スペースで同時に走るセッションが、ハーネスが次に渡す環境ルールのスペースを上書きし合えます。この段階が支えるのは、一つのスペース内での並行インテントです。複数スペースへの環境方法論の同時配送は、まだこれからです。

POSIX では、Codex アダプタが検証済みのフック payload セッションを、すべてのコアフックの子と Bash コマンドに固定します。macOS サンドボックスが `ps` を拒んでも、Codex のワークフロー選択は弱まりません。Windows では、PID 祖先の解決はセッション同一性を返さず、POSIX のコマンド書き換えも使えません。一つのプロセスを共有するハーネスも、チャットを区別できません。Kiro IDE のマルチチャットや、マルチセッションの opencode が該当します。payload 付きフックの子は payload のセッションに従います。その親が無いツールは、祖先が取れなければ共有カーソルに落ちます。ただしハーネスプロセスに有効な `AIDLC_SESSION_OVERRIDE` がある場合を除きます。

既知の制限: それらのプラットフォームでは、フックの書き込みとインテント／スペース切り替え動詞は、従来の v2 共有カーソルと `.current-session` の動きのままです。そのため、あるチャットが別チャットの移動やフックの帰属に影響できます。それらの経路のセッション単位の隔離は、まだこれからです。

---

## スペース — チームにつき 1 つ

**スペース** は、一つのチームが完結した世界です。独自の `memory/`（方法論）、`knowledge/`、`codekb/`、`intents/` を持ちます。この章でここまで起きたことは、すべて `default` という一つのスペースの中です。自動で作られます。**一人開発者や単一チームなら、話はここで終わりです。スペースに名前を付けることはなく、そのまま動きます。**

スペースが要るのは、**複数チームが一つのプロジェクトを共有** し、それぞれが自分の方法論、ナレッジ、記録を、衝突せずに持ちたいときです。チームを足すのは純粋に追加です。同じ形の `spaces/<name>/` が `default/` の隣に現れます。動くものも、移行するものもありません。

作る、一覧する、切り替えるは、インテントの動詞とちょうど同じ形です:

```
/aidlc space                      List all spaces
/aidlc space create payments-team Create a new space, seeded from the framework baseline
/aidlc space switch payments-team Switch the active space to "payments-team"
```

古い `/aidlc space-create <name>` と、引数だけの `/aidlc space <name>` も、まだ受け付けます。

作ったばかりのスペースは、フレームワーク既定の方法論（`org.md`）と、空の `team.md` / `project.md` プラクティスファイルから始まります。新しいチームは、他チームのプラクティスを継がず、自分のものを積みます。`knowledge/` と `codekb/` も空です。

スペースを切り替えると、カーソルに続いて自動で二つが動きます:

1. **AI-DLC 自身のリゾルバ** — 次に始めるインテントも、エージェントが載せるプラクティスとナレッジも、切り替えた先のスペースから来ます。
2. **ハーネスがコンテキストに載せるルール** — 切り替えは、ハーネスネイティブのルール include（Claude の `@`-import、Kiro CLI の resources または IDE の steering、Codex の rules ディレクトリ）を、新しいスペースの `memory/` へ付け替えます。次のターンは、そのチームの方法論で動きます。

`default` でのこの付け替えは何もしません。単一チームのワークスペースが、コミット対象ファイルを揺らさないのはそのためです。include はセッションローカルではなくチェックアウト全体なので、ワークフロー記録の選択は紐づいたままでも、別スペースの同時セッションは環境方法論の配送で競合できます。

### いまどのスペースにいるか

スペースが二つ以上あると、ステータスラインはアクティブな `space · intent` を、ずっと見える「いまここ」として出します。シェルのプロンプトがカレントディレクトリを出すのと同じで、仕事が違うスペースに落ちません。単一チームで `default` しか無いときは、スペースのトークン自体が出ません。

---

## 一つのインテントに複数リポジトリ

インテントは、リポジトリ一つに限りません。コードリポジトリはワークスペースの兄弟であり（どれかの中に入れ子ではない）、インテントは必要な数だけまたげます。

リポジトリ集合は **インテント作成時** に取ります。追加の入力はありません。既定では、AI-DLC が兄弟リポジトリを全部自動発見します（ワークスペースルートの直下の子で、自分の `.git` を持つもの）。集合はインテントの `intents.json` 行に残ります。Construction では、各 git 操作が正しいリポジトリに自動で錨を打ちます。

```
my-project/
├── aidlc/          # the workspace
├── checkout-api/   # repo-a   ┐ both auto-discovered as siblings;
└── checkout-web/   # repo-b   ┘ an intent here can touch either or both
```

リポジトリを記録しないインテントは、普通の単一リポジトリの場合です。レコードディレクトリの詳細は [成果物リファレンス](14-artifacts-reference.md)、用語は用語集の [複数リポジトリインテント](glossary.md) です。

### リポジトリ集合を宣言する（任意のマニフェスト）

自動発見は、兄弟リポジトリがすでに clone されていることが前提です。共有ワークスペースを新しくチェックアウトしただけでは揃っていないので、チームメイトはどのリポジトリをどこへ clone するかを知る必要があります。任意の `repos.json` マニフェストをワークスペースルートに置くと、その想定集合が残り、コマンド一つで再現できます:

```json
{
  "org": "your-github-org",
  "repos": [
    { "name": "checkout-api", "branch": "main" },
    { "name": "checkout-web" }
  ]
}
```

`org` は既定の clone 先です（`url` が無いエントリは `git@github.com:<org>/<name>.git` から clone します。上書きするならエントリに `url` を付けます）。`branch` は新規 clone のチェックアウト先で、すでにディスクにあるリポジトリに対しては助言の期待値です。省略すると、そのリポジトリ自身の既定を使います。リポジトリ名は安全な単一パスセグメントである必要があり、実行時の直下の子の発見モデルと一致します。このファイルを読んで欠けたリポジトリを clone し、gitignore ブロックを保ち、VSCode のマルチルートワークスペースを生成する `aidlc-workspace-sync` ツールは、[CLI コマンド](12-cli-commands.md#aidlc-workspace-sync-clone-and-reconcile-the-declared-repo-set) にあります。

マニフェストは便利さであり、第二の正本ではありません。**実行時はディスクが勝ちます**。インテント作成は、実際にいる兄弟を自動発見するので、宣言の有無にかかわらず、clone された瞬間からリポジトリは使えます。宣言されていても clone されていないリポジトリは、集合に入りません。マニフェストが動かすのは同期ツールと、宣言集合とディスクがずれたときに印を付ける助言の `--doctor` 行だけです。（この「ワークスペースマニフェスト」は、ハーネスの `manifest.ts` とは無関係です。そちらはパッケージング用のファイルです。）

---

## コミットするもの、しないもの

`aidlc/` は git に入れるので、チームは仕事を **共有** します。方法論、インテントのレジストリ、各インテントの状態、監査証跡、成果物が、リポジトリと一緒に動きます。意図して **gitignore** するのは、次の二種類です:

| gitignore（利用者ごと、マシンローカル） | 理由 |
|---|---|
| `aidlc/active-space`、`…/intents/active-intent` | カーソル — 「いまどこにいるか」。コミットすると、利用者ごとの移動が共有リポジトリの状態になり、チームメイトがインテント作成とカーソル切り替えで衝突します。 |
| `.../intents/<id>/runtime-graph.json`、`.aidlc-*`、`aidlc/.aidlc-sessions/`、`aidlc/.aidlc-active-space-*.tmp` | 派生した、マシンローカルの実行時状態。セッションごとの紐づけと PID 祖先のエントリを含む。 |
| `…/knowledge/documentkb/.journal/` | 進行中の文書トランザクションごとのディレクトリ。一時的でクローンごと。ジャーナルをコミットすると、並行する `sync` のたびにマージ衝突します。 |
| `…/knowledge/.sources.local.json` | *このマシン* が、リポジトリ外からリンクした文書を解決する場所。パスは定義上マシン固有なので、コミットすると全員のチェックアウトが壊れます。 |

スペースのほかはすべてコミットします。`memory/**`、`knowledge/**`、`codekb/**`、`intents.json`、各レコードの `aidlc-state.md`、`audit/` シャード、成果物です。目安はこれです。**カーソルと実行時の作業用はローカル、共有する仕事はコミットする。**

`knowledge/documents/` と `knowledge/documentkb/` はどちらもコミットしますが、所有者が違い、その違いが設計そのものです。`documents/` は原本です。追加、移動、削除は利用者がし、フレームワークは並べ替えません。`documentkb/` はツールが導出するカタログで、ワークスペースロックの下でトランザクション書き込みされます。**インデックス** は再構築できます。`documentkb/index.json` だけ消して `/aidlc knowledge sync` すれば、残っている文書ごとの `metadata.json` から、tombstone も含めて作り直します。`documentkb/` ツリーごと消すのは別の、復旧できない操作です。すべての `metadata.json` も消えるので、document id と tombstone が失われます。そのあとの `sync` は、残った原本を新しい id の新しい行として再オンボードします。`documentkb/` を手で直すのが近道ではなく誤りなのも、そのためです。次の `sync` が、`documents/` の実際の中身へ戻します。

---

## 次に読む

- [フェーズとステージ](04-phases-and-stages.md) — 1 インテントの実行の中身
- [ナレッジ](08-knowledge.md) — チームの標準をスペースの `knowledge/` に載せる
- [ルールとラーニングループ](09-rules-and-the-learning-loop.md) — スペースの `memory/` 方法論の書き方と学び方
- [成果物リファレンス](14-artifacts-reference.md) — インテントごとのレコードディレクトリの詳細
- [CLI コマンド](12-cli-commands.md) — `space` / `intent` 動詞の全体
- [用語集](glossary.md) — Space、Intent、Record dir、Multi-repo intent の定義
