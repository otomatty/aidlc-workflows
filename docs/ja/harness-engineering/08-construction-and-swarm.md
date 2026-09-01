# Construction とスウォーム

Construction は、AI-DLC がものを作る場所です。Unit ごとのステージが走り、**スウォーム** がその仕事を複数 Unit へ一度に広げられる場所です。ハーネスのなかで、「何を形作れるか、どうやって？」へのいちばんきれいな答えが、どのノブが誰のものかを正直にすることを求める部分でもあります。ここのレバーの一部は、ほかの章が教えるとおりデータとして書く、ハーネスエンジニアのものです。ほかのノブは、ゲートにいる人と、実行を起動する運用者のものです。この章は全部歩き、線を正確に印します。正しい面に手を出し、自分のものではないものを押すのを止めます。

通しは、このガイドのほかが運ぶものと同じです。Construction を形作るのは `core/` の下の **データ** を直すことです。ルール、ステージ、センサーの検査コマンド。コードは直しません。Construction が違って感じるのは、いちばん見える振る舞いの 2 つ（自律の許可、スウォームのドライバ）が、意図して *データファイルではない* 関心に支配されているからです。それを認めると、存在しない設定を書くのを止められます。

---

## 関心は 3 つ、所有者も 3 人

フレームワークの設計原則は、どの判断も種類で分けます。決定論はツール、ナレッジはエージェント、判断は人。Construction のスウォームはその切れ目を具体にしたものです。どれか 1 つのノブに触る前に、全体像を持っておく価値があります。

| Construction の関心 | 所有者 | 置き場所 |
|---------------------|--------|----------|
| チームの自律 **姿勢**（残る既定） | あなた、ハーネスエンジニア | `core/memory/{team,project}.md` のルール（データ） |
| Unit が **並行できる** こと | あなた、ハーネスエンジニア | `units-generation` ステージとその依存 DAG（データ） |
| スウォームが信じる **収束検査** | あなた、ハーネスエンジニア | プロジェクト自身のビルド / テストコマンド + 保護された仕様（データ + プロジェクト設定） |
| このプロジェクトの実際の自律 **許可** | 人 | 実行時のラダープロンプト |
| スウォーム **ドライバ** の選択 | 運用者 | `AIDLC_USE_SWARM` 環境変数 |
| 収束の **判定**、マージバック、監査 | ツール | `aidlc-swarm.ts`（コード → Developer Reference） |

「あなた」印の 3 行がこの章の本体です。ほかの 3 つは、データが形作るランタイムを理解するために扱いますが、どれも書きません。

---

## 自律の姿勢 — 本当のレバー、ルールとして書く

チームがいちばん制御したいのは、Construction がどれだけ手を求めるかです。同梱の既定は、`core/memory/org.md` の `## Walking Skeleton` 見出しの下にある org ルールです（`org.md:28-42`）。フレームワークの姿勢として読んでください。

- **walking-skeleton ゲート** は、greenfield スコープ（`mvp`、`enterprise`、`feature`、`poc`、`classic`、`workshop`、`infra`）で、スコープ内の最初の Construction EXECUTE ステージです。そのゲートはいつも出ます。`bolt-plan.md` の計画上の最初のボルトは advisory です。姿勢は `org.md` → `team.md` → `project.md` で解決します。
- **スケルトンの儀式は飛ばされます** 増分スコープ（`bugfix`、`refactor`、`security-patch`）では。既存コードベースにブートストラップするものが無いので、最初の Construction ステージはほかと同じく走ります。
- その最初の Construction ゲートのあと、**ラダープロンプト** が一度発火します。「残りのボルトはどう走らせるか？」二択です。自律で続けるか、残りの Construction *ステージ* ごとにゲートするか。選んだ答えは、インテントの `aidlc-state.md`（レコードディレクトリ内）の `Construction Autonomy Mode` として残ります。既定の stage-major ウォークでは、`autonomous` は残りのステージゲートを飛ばします。任意の unit-major はスウォームを抑え、ステージごとのゲート連鎖は残します。

この姿勢を形作るのは、ほかのルールと同じです。[ルールとラーニングループ](05-rules-and-the-loop.md) の厳格加算の層です。チーム全体の姿勢は `team.md`、1 プロジェクトの残る逸脱は `project.md`。`org.md` は触りません。フレームワーク同梱で、継がれます。

設定するのは **既定と案内** です。許可はラダープロンプトにいる人のままです。プロジェクトごとの判断をします。ルールの散文は、そのプロンプトに入るときエージェントが読むものなので、推奨を枠取ります。*この* プロジェクトを手放しで走らせるかの判断は、ゲートにいる人のままです。決定論・ナレッジ・判断の線を、プロンプト 1 つに真っすぐ引いたものです。残る案内を書く（データ）、エージェントが出す（ナレッジ）、人が決める（判断）。

### 実例 — チーム既定で、ボルトごとにゲートする

チームが自律 Construction に新しく、保守的な姿勢を欲しいとします。信頼が稼げるまで、どのボルトもレビュー、手放し実行なし。`core/memory/team.md` の `## Walking Skeleton` の下に箇条を足します。

```markdown
## Walking Skeleton

Until our team has shipped three clean autonomous batches, the recommended
answer at the ladder prompt is **gate every Bolt**. Reviewers see each
remaining Construction stage (all Units) before the next stage starts.
Revisit this default once our convergence checks have proven reliable.
```

これは org 既定の上に積みます。スケルトン先行 / 儀式スキップの切れ目は変わらず、チームの散文がラダープロンプトでエージェントの文脈に加わります。あるプロジェクトが要するなら、人はまだ「自律で続ける」を選べます。ルールは推奨を形作り、選択は開けたままです。効くのは次のワークフローのコンパイル境界です。ほかのルール編集とまったく同じです。途中の編集は、進行中の実行を遡って変えません。

信頼できるスコープで手放し Construction に進むチームは、鏡の箇条を書きます。「このコードベースの `feature` スコープでは、walking skeleton が緑になったら、推奨するラダーの答えは自律で続ける。」同じファイル、同じ見出し、反対の推奨です。

---

## 並行で走れるものを形作る — ボルト DAG

スウォームは仕事を Unit へ広げるので、「何が一度に走れるか」は上流、inception の `units-generation` ステージで決まります。そのステージは `unit-of-work-dependency.md` を出します（`core/aidlc-common/stages/inception/units-generation.md` が `produces: unit-of-work-dependency` を宣言）。その成果物の中で、必須の囲み `yaml` 辺ブロックが、各 Unit を `depends_on` 一覧付きで列挙します。

コンパイラはそのブロックを `runtime-graph.json` の `bolt_dag` ノードへ読みます。ノードがあるのは、辺ブロックが整形式で非循環のとき **だけ** です。無い、壊れている、循環しているブロックはノードを丸ごと省略します（[Runtime Graph](../reference/13-runtime-graph.md)、44 行目のスキーマ注記）。`bolt_dag` ノードは `batches` も持ちます。トポロジカルな段で、各 Unit の依存が先行段で満たされるので、バッチ内の Unit 同士に辺は無く、一緒に広げられます。

並行の面そのものは、**Unit ごと** の Construction ステージ 5 つです。それぞれ frontmatter で `for_each: unit-of-work` を宣言します。

人のチーム所有では、デリバリー計画が `Construction Iteration: unit-major` と `Unit Ownership: team` を組み合わせられます。エンジンは同じ DAG / 成果物 / レシートの証拠から `## Unit Progress` を導き、古い遅い unit-major 連鎖の代わりに、ステージごとまたはユニット末の Unit ゲートを使います。これは実行方針のノブであり、ステージグラフの編集ではありません。所有が無い / 単独なら、グラフとディレクティブは変わりません。

| ステージ | 走る回数 |
|----------|----------|
| `nfr-requirements` | Unit ごとに 1 回 |
| `functional-design` | Unit ごとに 1 回 |
| `nfr-design` | Unit ごとに 1 回 |
| `infrastructure-design` | Unit ごとに 1 回 |
| `code-generation` | Unit ごとに 1 回 |

設計 4 ステージでは、Unit ごとのカバレッジはさらに **kind フィルタ** されます。各 Unit の `kind`（2.7 の辺ブロックでタグ）が、ステージの `produces_kinds` 地図経由で、その Unit が実際に負う produces 成果物を選びます。エンジンは run-stage ディレクティブの produces パスとカバレッジ検査の両方をその集合へ剪定するので、`spec` Unit はデプロイドキュメント無しで infrastructure-design 完了、`packaging` Unit はファイル 0 で functional-design 完了です。タグ無し Unit は行列全体を保ちます。

（残りの Construction ステージ 2 つ、`build-and-test` と `ci-pipeline` は最後に全体へ一度走るので、Unit ごとの広がりには入りません。）

**この並行面があるのは、`units-generation` が走るスコープだけです** — `enterprise`、`feature`、`mvp`、`classic`、`workshop`。増分スコープ（`bugfix`、`refactor`、`security-patch`）と `poc` / `infra` / `express` は `units-generation` を走らせないので、辺ブロックも出さず、`bolt_dag` も持たず、Construction は単通路で走り、スウォームが広げるものはありません。仕事が本当に複数 Unit のところでスウォームを形作り、手放し Construction は複数 Unit の greenfield スコープの性質として扱い、どのスコープでも、ではありません。

ここのハーネスレバーは間接ですが本物です。**並行するものを形作るのは、`units-generation` が捉える依存構造を形作ることです。** 横断依存が少ない粗い Unit を好むチーム案内を書くと、より多くの Unit が同じバッチに着地し、同時に走ります。きつく深く鎖になった依存は、仕事を多くの小さいバッチへ直列化します。影響するのは `units-generation` ステージの散文と、分解中にアーキテクトエージェントが読むルールです。分解そのものは、エージェントが人と一緒にするナレッジの判断であり、書く位相をコンパイラがバッチにします。

辺ブロックを `bolt_dag` にするコンパイルとパースはコードであり、あなたが書くものではありません。そのパーサを形作るのはコード変更です → [Developer Reference](../reference/13-runtime-graph.md)。

---

## 収束を結ぶ — 信頼する信号はプロジェクト自身の検査

Code Generation のスウォームは計画を迂回しません。`prepare` の前に、出したどの Unit も、構造化された Testing Contract、ユニット範囲のテスト指示、一致する承認指紋を含む、いまの人が承認した計画を持っていなければなりません。`prepare` はワークツリーを分岐する前にその証拠を検証し、どのワーカーブリーフも承認済み Unit マーカー、契約ハッシュ、計画、指示を運びます。自律の道を、普通の Code Generation と同じ方法論と Plan Approval 契約に留めます。

スウォームワーカーは、自分の Unit が収束したと主張できます。フレームワークはその主張を信仰では取りません。権威の信号は、審判が走らせるプロジェクトの **自身の検査コマンド** です。終了 `0` は本当に収束、ほかの終了はまだです。自律 Construction でハーネスエンジニアが確保するいちばん大事なことです。プロジェクトが実際に *本物の* 検査コマンドと保護された仕様を持ち、スウォームが信頼して収束できること。

信号を運ぶ面は 2 つです。

- **検査コマンド。** Unit が完了したことを証明するもの。`npm test`、`pytest`、ビルドと lint のスクリプト、CI のローカル相当。審判はループ中に Unit ごとに走らせ、finalize でもう一度。緑の終了だけが、その Unit の仕事のマージを許します。
- **保護された仕様ファイル。** 審判は指定の `--test-file` を分岐 git の基線と改ざん防止比較できるので、ワーカーは「完了」を定義するテストを静かに弱めて、赤い検査を緑にはできません。受け入れ基準を載せる仕様が存在し、指しているファイルであることを確保します。

ハーネスとしての寄与は、両方を本物で意味あるものにすることです。いつも通る検査、または空の仕様は、スウォームにゴム印を渡します。`org.md` の `## Testing Posture` ルールはすでに、選んだ Test Strategy と加算のスコープごとの下限を組み合わせています（例: `mvp` / `feature` はカバレッジ 80% を足す）。`team.md` でより厳しい構造化方法論 / 順序を書くのが、それらの下限を捨てずに実行の拍子を変える仕方です。

センサーは、散文側で検査を補います。`units-generation` がすでに取り込む `required-sections` と `upstream-coverage` センサーが、ゲートで成果物の形とカバレッジを検証します。[センサー](06-sensors.md) の筋肉で、プロジェクト固有の収束または required-sections センサーを書き、同じ欠けを何度も見ている Construction ステージに結べます。センサーは各書き込みで発火する advisory のテレメトリ、プロジェクトの検査コマンドは硬い収束ゲートです。両半分で働きます。センサーはエージェントが書くあいだ形を見守り、検査は Unit がマージしてよいかを決めます。

---

## ドライバの継ぎ目 — `AIDLC_USE_SWARM`

スウォームが物理的に広がる仕方は環境変数で選ばれます。これは **運用者のノブ** だと率直に言う価値があります。`.claude/` のデータファイルではなく、`settings.json` にもありません（広げるときにコンダクター側が読みます）。書きません。データが形作るランタイムを知るために理解します。

| `AIDLC_USE_SWARM` | ドライバ | 振る舞い |
|-------------------|----------|----------|
| 未設定、または `"1"` でない | サブエージェントの床 | コンダクターが 1 メッセージで N 本の並行 `Task` を出す。Unit ごとに 1 本 |
| `"1"` | インライン Dynamic Workflow | コンダクターが `Workflow` を書き、その JS が Unit ごとのパイプラインと反復上限を所有する |
| `"1"` だが Workflow ツールが使えない | 床への大きな劣化 | コンダクターは床に戻り、`--degraded-from ultracode` を渡すので、審判が `SWARM_DEGRADED` を出す |

どちらのドライバも同じ Unit ごと 5 ステージを走らせ、同じプロジェクト検査に対して収束します。違いは純粋に、並行仕事の出し方です。暴走の止めはハーネスの **Stop フック上限** にあります（`core/hooks/aidlc-continue-workflow.ts` の `blockCap()` / `defaultBlockCap()` の対、`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` として出す）。スウォームツール自身の外です。この自律 Construction の道では、既定上限は **8 ブロック** です（対話の既定は 2。明示の `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` は両方を上書きします）。ドライバ継ぎ目の契約は [Skill System § 6](../reference/17-skill-system.md#6-the-swarm-referee-the-driver-seam-and-the-bolt-dag) です。

ドライバと一緒に動かない判断が 1 つあります。失敗は **いつも止まり、人を呼び戻します**。自律モードに関係なく、`aidlc-common/protocols/stage-protocol-construction.md`（"Halt-and-ask on failure"）どおりです。審判の `finalize` が終了 2 の封筒を返すと、コンダクターはバトンを人へ戻します。手放しモードは幸せな道のゲートを外し、失敗の停止は大きく残します。

---

## コード変更になるところ

線はきれいです。上の全部（自律姿勢のルール、辺ブロックを出す Unit 分解、プロジェクトの検査コマンドと保護された仕様、補うセンサー）は、`core/` またはプロジェクト設定の下に書くデータです。コードに触れずに Construction を形作ります。

スウォームの機械はコードで、形を作るのは Developer Reference の領分です。

- **審判** `aidlc-swarm.ts` — 状態を持たない `prepare` / `check` / `finalize` サブコマンド。自律 Code Generation では、`prepare` がまず各 Unit の承認済み Testing Contract と指紋を検証し、それからワークツリーを分岐します。残りのコマンドは判定を走らせ、マージ前に主張されたどの Unit も再検証し（嘘のコンダクターのガード）、レビュー済みレコード成果物と結んだソースマニフェストをスナップショットして着地させ、AIDLC メタデータのマージバックを直列化し、審判所有の `SWARM_*` イベント 6 つを出します。コンダクターはそれから、収束した各 Unit に対し `aidlc-worktree merge` を呼びます。その別の不変ソース着地が `SWARM_SOURCE_MERGED` を出します。
- **エンジン** `aidlc-orchestrate.ts` — 決定論的なルータ。サブコマンドはちょうど 5 つ: `next`、`continue`、`report`、`park`、`team-board`。`continue` は内部の操舵、`team-board` は Team Construction の読み取り専用照会。Construction バッチがスウォーム対象になるときを決めます。
- **ボルト DAG パーサ** — 辺ブロックを `runtime-graph.json` へ読むコンパイル手順。

3 つとも規範の契約は [Skill System § 6](../reference/17-skill-system.md#6-the-swarm-referee-the-driver-seam-and-the-bolt-dag)、`bolt_dag` ノードのスキーマは [Runtime Graph](../reference/13-runtime-graph.md) です。コンダクター自身の章は [Orchestrator](../reference/03-orchestrator.md) です。

姿勢ルールが支配するものの利用者向け側（walking-skeleton ゲート、ラダープロンプト、自律モード）は User Guide の [Phases and Stages § Construction](../guide/04-phases-and-stages.md) で歩き、ログに見える `SWARM_*` 監査イベント 6 つは [State and Audit](../guide/10-state-and-audit.md) に目録があります。

---

## 次

- **[新しいハーネスへの移植](09-porting-to-a-new-harness.md)** — このガイドの頂点。`core/` のデータ面を全部形作ったあとの最後の手順は、そのコアを *新しい* CLI へ焼くことです。`harness/<name>/` ディレクトリ 1 つ、マニフェスト 1 行、フックアダプタ、バイト一致の門。
- 形を作るデータ面の地図全体は [ハーネスエンジニアガイドの概観](00-overview.md) へ。
- コード層のスウォーム、エンジン、ボルト DAG 契約は [Developer Reference § Skill System](../reference/17-skill-system.md)。Construction を形作ることがデータ編集で終わり、コード変更になる線です。
