# ランタイムグラフ

> 読者: Tier 2/3（チームで入れる人、フレームワークの貢献者）。

この章は、v0.5.0 マイルストーン 8 で入った、ワークフローごとの `runtime-graph.json` 成果物 — `stage-graph.json` のデータプレーン鏡で、承認ゲートのたびに監査ログから実体化する — を書きます。相互リンクは [Plane Architecture](02-plane-architecture.md)（この成果物を動機づけるコントロール / データプレーンの分離）と [State Machine](12-state-machine.md)（コンパイルを引き起こすライフサイクル）です。

---

## 1. 何か

`stage-graph.json` は構造の正です。すべてのステージ定義、すべての `requires_stage` / `produces` / `consumes` 辺。ワークフロー実行をまたいで安定です。

`runtime-graph.json` は実行の正です。*いまの*ワークフローで、どのステージが始まったか、どれが承認されたか、各ステージの memory.md がどう見えるか、どのセンサーが発火したか。ワークフローにつき 1 ファイル、`<record>/runtime-graph.json` にあります。`<record>/` = インテントのレコードディレクトリ、`aidlc/spaces/<space>/intents/<YYMMDD>-<label>/`。`stage-graph.json` と同じノード形で、構造の代わりにテレメトリが入ります。

存在する理由は、消費者が（マイルストーン 11 のボルト fork / merge、マイルストーン 12 のゲート儀式、マイルストーン 14 の doctor、v0.10.0 のワークフロー横断オブザーバ）照会のたびに監査ログを歩き直さず、実体化したビュー 1 本を読むためです。

---

## 2. スキーマ

下の TS インタフェースが凍結契約です。変えるときは、同じ PR で消費者をすべて上げなければなりません。

```ts
interface RuntimeGraph {
  workflow_id: string;            // ISO timestamp from LATEST WORKFLOW_STARTED audit row (so a re-created intent identifies the live workflow, not a dead one)
  scope: string;                  // from state.md "Scope" field
  started_at: string;             // ISO 8601, same row as workflow_id
  stages: RuntimeStage[];         // chronological order by started_at
  bolt_dag?: BoltDag;             // present only when units-generation's unit-of-work-dependency.md carries a valid (well-formed, acyclic) fenced edge block; absent/malformed/cyclic blocks omit the node
}

interface BoltDag {
  units: { name: string; depends_on: string[]; kind?: string }[]; // verbatim from the authored edge block; new names use lowercase kebab-case, while safe legacy single-segment names beginning with a digit or containing uppercase letters, underscores, or dots remain accepted (the swarm derives a separate internal Bolt slug); kind (service|spec|ui|packaging|library) present only when the edge block tags the unit
  batches: string[][];            // topological levels; each level = units whose deps are all satisfied by prior levels; level entries sorted lexicographically (deterministic)
}

interface RuntimeStage {
  stage_slug: string;
  started_at: string | null;      // ISO from STAGE_STARTED; null when `instances` is present
  completed_at: string | null;    // ISO from STAGE_COMPLETED; null when pending OR when `instances` is present
  agent: string | null;           // lead_agent; null when `instances` is present
  memory_path: string;            // <record>/<phase>/<stage>/memory.md (parent stage path even on instance-bearing rows)
  memory_entries: number | null;  // null = no memory.md file OR `instances` is present; else parseMemoryHeadings.total
  memory_breakdown: {             // null when memory_entries is null
    interpretations: number;
    deviations: number;
    tradeoffs: number;
    open_questions: number;
  } | null;
  sensor_firings: SensorFiring[]; // empty array in milestone 8 (sensors fire in milestone 9 + milestone 10)
  outcome: "approved" | "failed" | "pending";
  learnings_captured: {           // null on pending rows; populated on transition to approved
    from_orchestrator: number;    // zero in milestone 8 (gate ritual is milestone 12)
    from_user_addition: number;
  } | null;
  instances?: BoltInstance[];     // present only when stage runs per-Bolt; milestone 11 populates
}

interface BoltInstance {
  bolt: string;
  worktree: string;
  started_at: string;
  completed_at: string | null;
  memory_path: string;
  memory_entries: number | null;
  memory_breakdown: { interpretations: number; deviations: number; tradeoffs: number; open_questions: number; } | null;
  sensor_firings: SensorFiring[];
  outcome: "approved" | "failed" | "pending";
}

interface SensorFiring {
  id: string;
  fire_id: string;                // 8-hex correlator emitted by the milestone 9 dispatcher on every row
  result: "passed" | "failed" | "budget-override" | "incomplete"; // 4-state (milestone 12 Q10)
  ts: string;                     // FIRED row's timestamp
  detail_path?: string;
}
```

`instances` があるとき、ステージ行の単一インスタンスフィールド（`started_at`、`completed_at`、`memory_entries`、`memory_breakdown`）は NULL です — それらの値は各インスタンスの上に座ります。ステージ行のフィールドとインスタンス配列のフィールドは決して共存しません。

### The Bolt/unit dependency DAG (`bolt_dag`)

任意の `bolt_dag` ノードは、エンジンが並行ビルドバッチを計算するために読む、機械可読のユニット依存グラフです — 「DAG が許可」がスウォーム展開です。既定のステージ主体ウォークの任意 `directive.wave` のエンジン入力でもあります。ウェーブを出す前に、エンジンはこのキャッシュを書いた依存成果物と比べ、癒したメモリ内バッチと kind を使って、ビルド、完了レシート、対のレビュー、Unit メモリパスを含むすべての Unit ごとのエントリを解決します。コンダクターはそのディレクティブだけを消費します。このキャッシュしたノードを読んだり、兄弟パスを組み立て直したりしません。源は、units-generation（2.7）が `unit-of-work-dependency.md` に、人が読む散文の隣へ書く、フェンスした **`yaml` `units:` 辺ブロック**です:

```yaml
units:
  - name: auth
    kind: service
    depends_on: []
  - name: api
    depends_on: [auth]
```

各ユニットは任意の `kind`（`service | spec | ui | packaging | library`）を運べます。ユニットが何かです。そのまま `bolt_dag.units[].kind` へ乗り、ユニットごとの construction 設計の刈り込みを駆動します（[Stage definition](15-stage-definition.md) の `produces_kinds`）。ステージの produces 成果物は、各ユニットの kind に適用するものへフィルタされます。タグ無しのユニットは `kind` キーを持たず、設計成果物マトリクス全体を保ちます。無効な kind 値はブロック全体を `malformed` にします（後述）。だから誤字は、誤って刈るのではなく 2.7 ゲートで大きく失敗します。

`compile` は *その構造化ブロック* を — 純粋データのパース、モデル呼び出し無し — `units`（そのままの辺）と `batches`（トポロジレベル）へパースします。各バッチは、先行バッチがすべての依存を満たすユニットの集合なので、バッチのユニットに相互依存は無く、並行して走れます。レベルエントリは出す前に辞書順で並べるので、書いた順に関係なくノードは決定論的です。

成果物が無い、または辺ブロックが無い、壊れている（重複名、ぶら下がりまたは自己依存、パース不能）、循環しているときは、ノードは **全体を省略** します — `compile` は理由を指名する stderr 診断を書き、間違っているが妥当な DAG を出すのではなく、封筒から `bolt_dag` を外します。それらの失敗は上流の 2.7 ゲートで `required-sections` センサーが面に出します。同じブロックを検証し、`edge_block: ok | absent | malformed | cyclic` を報告します。辺を構造化データとして書くこと（ナレッジ仕事、一度、2.7 承認ゲートの後ろ）が、フック発火の `compile` を再実行でバイト一致に保ちます。コンパイル経路にモデルは座りません。オーケストレーションエンジンはキャッシュした `bolt_dag` を `unit-of-work-dependency.md` と比べ、ノードが無いかその書いた成果物と食い違うとき、読み側でユニットごとの反復を自己治癒します。グラフファイル自身は次のコンパイルでだけ直ります。

---

## 3. コンパイルのライフサイクル

コンパイルは、遷移クラスの監査出力のたびに PostToolUse Bash フック（`.claude/hooks/aidlc-rebuild-stage-graph.ts`）が呼びます。フックはコンダクターからのすべての `Bash` ツール呼び出しで発火し、安くフィルタします:

1. **コマンドフィルタ** — 早期終了を通るのは、遷移できる `aidlc` の state、jump、Bolt、ユーティリティ経路だけ。実行時経路は除外（再帰ガード）。`aidlc-log.ts` はステージ内のうるさいイベントだけ。`aidlc-worktree.ts` は WORKTREE_* イベントだけ。
2. **監査存在ガード** — インテントの `audit/` シャードがまだ無ければ終了。
3. **ハートビート** — doctor の沈黙フック検出向けに `<record>/.aidlc-hooks-health/rebuild-stage-graph.last` を書く。
4. **最後 3 ブロックの末尾読み** — `audit.md` を `\n---\n` で割り、最後の 3 エントリを取る。
5. **イベントクラスフィルタ** — 3 ブロックのどれかに対して `**Event**: (GATE_APPROVED|STAGE_STARTED|STAGE_AWAITING_APPROVAL|AUDIT_MERGED|WORKFLOW_COMPLETED)` を照合。一致が無ければ終了。
6. **派遣** — `aidlc engine runtime compile ...`。

`WORKFLOW_COMPLETED` が遷移集合に入っているので、最終ステージの承認がコンパイルを発火します。`aidlc-state.ts:575-593` の `handleCompleteWorkflow` は監査行 4 つを出します — STAGE_COMPLETED + PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED — その最後 3 つは `PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED` です。（承認経路では、承認がすでに出しているので STAGE_COMPLETED は抑えられ、実行の前に `GATE_APPROVED` が来る — だから最終ステージ承認は、どちらにせよ 1 回の Bash 呼び出しで 5 行を付けます。）正規表現に `WORKFLOW_COMPLETED` が無いと、ランタイムグラフは最終ステージを承認済みとして決して残しません。

コンパイル自身は監査ログ全体を歩きます（だから結果はイベントソースであり、遷移増分ではありません）。同じ slug の次の `STAGE_COMPLETED` と `STAGE_STARTED` を対にし、`aidlc-lib.ts` の `parseMemoryHeadings()` 経由で各ステージの memory.md を読み、`withAuditLock` 内の `writeFileAtomic` で成果物を原子的に書きます。

---

## 4. Outcome enum と時系列の対

outcome 値は 3 つ: `"approved" | "failed" | "pending"`。

- **approved** — `STAGE_STARTED@T1` が後の `STAGE_COMPLETED@T2` と対になる。行の `completed_at` は `T2`。
- **pending** — `STAGE_STARTED@T1` に、その slug の後の `STAGE_COMPLETED` が無い。行の `completed_at` は `null`。
- **failed** — `instances[]` の親ステージ集約だけが出す（単一インスタンスステージは `"approved" | "pending"` のまま）。Construction ステージの `instances[]` が空でないとき、親の `outcome` はそのインスタンスの集約です: すべて承認 → `approved`。どれか失敗 → `failed`。それ以外（pending があり、失敗が無い）→ `pending`。単一インスタンスステージは `failed` を出しません。下にある `BOLT_FAILED` イベントが、インスタンスを運ぶ経路の外に Construction ステージスコープを持たないからです。

再ジャンプの扱い: `/aidlc --stage <slug>` は、すでに完了した slug に対して `STAGE_STARTED` を再出します。監査ログは `STAGE_STARTED@T1, STAGE_COMPLETED@T2, STAGE_STARTED@T3` を運びます。対の規則は `STARTED@T1` を `COMPLETED@T2` と合わせ → 承認になるはずですが、slug の **最新** `STAGE_STARTED` が先行行を上書きします — slug ごとに 1 行、最新 STARTED が勝ちます。だから結果は `started_at: T3, completed_at: null` の pending 行です。

単発ステージ除外: `--single` ステージランナー実行は、合成 `**Workflow**: single-stage:<slug>` id の下で `STAGE_STARTED` / `STAGE_COMPLETED` 対をコミットします（監査だけ。`aidlc-orchestrate.ts` の `handleSingleReport`）。対は `Workflow` フィールドが `single-stage:` で始まるどの `STAGE_*` 行も飛ばします — それらの行はどのメインワークフローにも属さないので、メインの `runtime-graph.json` に行を作ったり完了したりせず（したがって `summary` 件数を膨らませない）。メインワークフローの `STAGE_*` 行は `Workflow` フィールドを持ちません。無いことは行を残す意味です。同じ除外が `aidlc-state.ts` の `hasStageAuditEvent` 重複検査にも効くので、単発実行の `STAGE_COMPLETED` が、同じ slug のメインワークフロー自身の完了出力を抑えられません。

---

## 5. MEMORY_EMPTY の意味

`MEMORY_EMPTY` 監査行はコンパイルが出します（唯一の出力者 — `audit-format.md:171` が `tools/aidlc-runtime.ts compile` を登録）。ステージ行が次の **すべて** を満たすとき:

- `outcome === "approved"`（pending 行は出さない — 下の §6）
- `memory_entries === 0`（ファイルは存在し、正準 §13 見出し 4 つの下のエントリがゼロ）

エントリゼロの pending 行は出しません。飛行中のステージは、コンダクターがまだ memory.md に書いていないので、正当にエントリゼロであり得ます。飛行中に MEMORY_EMPTY を出すと、本物の日記飛ばしを表さない雑音になります。マイルストーン 14 の doctor が欲しい合図は「エントリゼロでステージが承認された」です — それにはステージが承認されていることが要ります。

### 冪等 — （slug、ゲート完了）ごとにちょうど一度

`runtime-graph.json` 自身は、同じ監査ログに対する再コンパイル横断でバイト同等です。MEMORY_EMPTY 出力はより強いです: **`(stage_slug, completed_at)` タプルごとに MEMORY_EMPTY 行は最大 1 つ**。

ロックした区間の中で、コンパイルは `audit.md` を再読みし、エントリゼロ承認 slug ごとの既存 MEMORY_EMPTY 行を走査し、先行行の Timestamp がこの slug の `completed_at` 以降なら出力を抑えます。つまり:

- エントリゼロでステージが承認されたあとの最初のコンパイルは、MEMORY_EMPTY 行を 1 つ出します。
- 同じワークフロー中の以後のコンパイルは、その slug に対して再出しません。
- `--stage <slug>` 再ジャンプ + 再承認は新しい `STAGE_COMPLETED`（後の `completed_at`）を出します — 再承認時にステージがまだ空なら、先行行の Timestamp がいま新しい completed_at より小さいので、新鮮な MEMORY_EMPTY 行が出ます。

doctor の MEMORY_EMPTY 率指標は、重複排除無しでこれらの行を直接読みます。空日記でのゲート完了ごとに 1 行です。

ロックした区間内で MEMORY_EMPTY を出したあと成果物書きが失敗すると、監査ログは、runtime-graph.json が決して着地しなかったステージ向けの MEMORY_EMPTY 行 N を運びます。次のコンパイルは抑制走査でそれらの行を見て再出しを飛ばし、それから成果物が着地します。重複出力も、幽霊成果物もありません。

---

## 6. v0.4.0 バックフィル規則

マイルストーン 13 の memory.md ライフサイクルが出荷する前に完了したステージは、memory.md 履歴がありません。バックフィル規則:

- `memory_entries: null` ↔ `memory_breakdown: null` ↔ MEMORY_EMPTY 出力無し。
- 両方のフィールドは一緒に動きます。判別子は「`parseMemoryHeadings` が実行したか」です — memory.md が存在する（ゼロバイトでも）なら実行し、キーは数です。memory.md が無ければ両方 `null`。

この規則が無いと、v0.5.0 へ上げるどの v0.4.x 利用者も、アップグレード後最初のワークフローで MEMORY_EMPTY 行の嵐を見ます。

---

## 7. 復旧模型 — スナップショット + 接尾辞リプレイ

`runtime-graph.json` + `audit.md` はイベントソース対を成します。`audit.md` は追記専用のイベントログ、`runtime-graph.json` は最後のゲート遷移で取った実体化スナップショットです。両方を持つ読み手は、スナップショットを読み、それからスナップショットの最後の `completed_at` のあとの監査行をリプレイして、いまの状態を再建します。

人が読む順の復旧源は 5 つ:

1. **成果物木**（`<record>/<phase>/<stage>/`） — 出したもの。
2. **memory.md**（`<record>/<phase>/<stage>/memory.md`） — コンダクターが捉えると選んだもの。
3. **audit/ シャード** — 正準イベントログ。実際に起きたこと。
4. **state.md** — アクティブステージのカーソル。
5. **runtime-graph.json** — 実体化ビュー。監査を歩き直すより照会が速いが、いつもそれから再導出できる。

### pending 行の鮮度注意

pending 行の `memory_entries` と `memory_breakdown` は、最後のコンパイル時にスナップショットされました。ステージが飛行中で、最後のコンパイルが発火してからコンダクターがさらにエントリを書いたなら、スナップショットは遅れます。復旧消費者は復旧時に memory.md を再パースしなければなりません。pending 行のスナップショット件数を信じてはいけません。

v0.5.0 に pending 件数をライブで読む消費者はありません。v0.6.0 `--resume` 向けに文書化してあり、この切り出しが要ります。

### 並行ボルト飛行中復旧（v0.5.0 で閉じた）

並行ボルトがバッチ途中で落ちるワークフローは、マイルストーン 8 にボルトごとの復旧継ぎ目がありませんでした — スキーマは `instances?` を予約していましたが、コンパイルはメインに単一インスタンス行だけを書き、worktree はランタイムグラフ断片を決して受けませんでした。v0.5.0 で閉じました。`aidlc-runtime.ts fragment-fork`（ボルト開始）と `fragment-merge`（ボルト完了 --merge）、および Construction フェーズステージの窓に相異なる slug が 2 以上あるとき監査が示すと `BoltInstance[]` を出すコンパイル埋める拡張です。

ボルトごとの断片は v0.5.0 では到着時に死んでいます（worktree のレコードディレクトリ `runtime-graph.json` の v0.5.0 読み手は無い）。v0.6.0 `--resume` は断片をヒントとして扱い、正本はメインのマージ後ランタイムグラフとし、加えて `aidlc-bolt.ts` どおり孤立 worktree を検査して、それらの復旧プロンプトを面に出すべきです。

---

## 8. CLI 面

```bash
# Walk audit + memory.md, write runtime-graph.json (invoked by hook).
aidlc engine runtime compile

# Print one stage row from runtime-graph.json (debug/test surface).
aidlc engine runtime read <stage-slug>

# Print deterministic aggregates over runtime-graph.json: stage/phase
# outcome tallies, memory-entry counts by category, sensor 4-state
# tallies, learnings captured, and workflow duration. Read-only; the
# session skills (session-cost, replay, outcomes-pack) consume the
# --json shape so every number they render comes from here, not from
# LLM-side counting.
aidlc engine runtime summary [--json]

# Byte-copy main runtime-graph.json into a Bolt's worktree fragment
# (one-shot; called by `aidlc-bolt start --worktree`). No audit emit —
# the fragment lifecycle rides on STATE_FORKED + AUDIT_FORKED.
aidlc engine runtime fragment-fork --slug <kebab-slug>

# Remove the worktree fragment (idempotent; called by
# `aidlc-bolt complete --merge`). No audit emit — the fragment
# lifecycle rides on STATE_MERGED + AUDIT_MERGED. Main's runtime-graph
# is rebuilt event-source by the post-Bash compile hook on AUDIT_MERGED.
aidlc engine runtime fragment-merge --slug <kebab-slug>
```

どのサブコマンドも、標準の cwd 解決を上書きする `--project-dir <path>` を受けます。

通常運用ではコンパイルはフック駆動です。手呼び出しはテストとデバッグ向けにあります。

---

## 9. なぜフック駆動か、LLM ツール結合ではないか

以前の計画改訂は、`handleApprove` / `handleAdvance` / `handleComplete --merge` の中へ `spawnSibling(..., "aidlc-runtime.ts compile", ...)` 呼び出しを入れることを提案しました。そのやり方は、[Plane Architecture](02-plane-architecture.md) に書いた荷重する信条に反します:

> 決定論が要るところではツールを使う。ナレッジが要るところでは LLM / エージェントを使う。判断が要るところでは人を使う。

ランタイムグラフコンパイルは、特定セッションの外から観測できなければならないデータプレーン基盤です。LLM が呼ぶツールへ結合すると、LLM の省略が決定論保証を壊します — 人が Approve をクリックしたあとコンダクターが `aidlc engine orchestrate report --stage <slug> --result approved --user-input "<exact choice>"` を呼び忘れると、監査行が付かない **かつ** コンパイルが発火せず、ランタイムグラフは黙って遅れ、復旧基盤は壊れます。

PostToolUse Bash フックは、LLM が次に何をしても、コンダクターの実際のコマンド呼び出しで発火します。監査を出す隠れたディスパッチャ経路（`aidlc engine state ...`、`jump ...`、`bolt ...`、`utility ...`）が決定論の錨です。

---

## 10. 将来の PR が閉じる既知の隙間

- **MEMORY_EMPTY 率指標** — マイルストーン 14 の doctor が、§5 で凍結した `(Stage, ISO-second)` 重複排除タプルを使って率を面に出す。
- **`learnings_captured` 出自件数** — マイルストーン 12 のゲート儀式が `from_orchestrator` と `from_user_addition` を埋める。
- **`sensor_firings` 配列** — マイルストーン 9 + マイルストーン 10 がセンサーを派遣し、このスロットを埋める。
- **runtime-graph.json のボルト fork / merge** — v0.5.0 で `fragment-fork`（新しい監査イベント無し。STATE_FORKED + AUDIT_FORKED に乗る）と `fragment-merge`（新しい監査イベント無し。STATE_MERGED + AUDIT_MERGED に乗る）で閉じた。コンパイルは、Construction ステージの窓に相異なる slug が 2 以上座るとき、監査の BOLT_* タグ付きイベントから `instances[]` を埋める。
- **ヘッドレスワークフロー向け CLI モード派遣** — v0.6.0+ が非 Claude Code 実行経路を出荷することがある。フックは Claude Code セッション内だけで発火する。

---

## 11. 断片のライフサイクル

ボルトごとのランタイムグラフ断片ファイルは `<worktree>/<record>/runtime-graph.json` にあり、gitignore され、メインの場所を映します。ライフサイクルは:

1. **ボルト開始で fork。** `aidlc-bolt start --worktree --slug <slug>` は、state-fork + audit-fork のあと `aidlc-runtime fragment-fork --slug <slug>` へ委譲します。単一読みプロトコル: `readFileSync` を一度バッファへ、そのバッファから断片パスへ `writeFileSync`、同じバッファを stdout 封筒向けにハッシュ。並行コンパイルが fork 途中でメインを書き直すバイトコピー / ハッシュ競合を閉じます。メインにまだ runtime-graph.json が無ければ、断片は worktree の状態カーソルに錨を置いた空グラフです。
2. **ボルトの寿命中に進化。** post-Bash コンパイルフックは、遷移クラスの監査出力のたびに発火します — worktree 内の遷移も含む。各発火は worktree の監査ビューから worktree の runtime-graph.json（断片）を再コンパイルします。断片は、このボルトの audit-fork 時点でアクティブだった兄弟向けに `instances[]` が埋まることがあります。後から始まる兄弟は断片に出ません。worktree の監査は fork 時のスナップショットだからです。
3. **ボルト完了で merge（ソロ / スウォーム経路）。** `aidlc-bolt complete --merge --slug <slug>` は、state-merge + audit-merge のあと `aidlc-runtime fragment-merge --slug <slug>` へ委譲します。fragment-merge は stdout 観測向けに断片をハッシュし、`unlinkSync` し、JSON 封筒を出します。親 Bash 呼び出しが返ったあと、コンパイルフックがメインで再発火し、いまマージした slug 向けに `instances[]` を埋めてメインのランタイムグラフを再建します。
4. **深さ防御の削除。** `aidlc-worktree merge` と `aidlc-worktree discard` はどちらも `git worktree remove` を呼び、推移的に断片を消します。fragment-merge の明示削除は、暗黙クリーンアップと対になって深さ防御の型です。状態側で state-merge と `git worktree remove` がすでに対になっているのと同じです。
5. **失敗モード。** `fragment-fork` 失敗（worktree 無し、断片がすでに存在、バイトコピー IO エラー、spawn タイムアウト）は、`aidlc-bolt` が doctor 帰属向けに `Reason: fragment-fork-*` フィールド付きの `BOLT_FAILED` を出します（IO / ガードエラーは `fragment-fork-failed`、spawn SIGTERM は `fragment-fork-timeout`）。state-fork + audit-fork はロールバックしません（それぞれすでに自分の監査行を出している）。audit-merge がすでに着地したあとの `fragment-merge` 失敗は、珍しい部分成功の監査署名 `BOLT_COMPLETED → STATE_MERGED → AUDIT_MERGED → BOLT_FAILED (Reason: fragment-merge-*)` を出します（IO / ガードエラーは `fragment-merge-failed`、spawn SIGTERM は `fragment-merge-timeout`）。断片ファイルは暗黙の `git worktree remove` クリーンアップまで残ります。メインに対する以後のコンパイルは一貫したランタイムグラフを出します（この位置の BOLT_FAILED はインスタンスを `"approved"` と採点します。集約の STATE_MERGED 勝ち優先が、ボルトの中身がすでにメインへ伝播したことを反映するからです。ここでの BOLT_FAILED は復旧テレメトリです。継ぎ目を残し、中身自身は無傷のままです）。

---

## Next Steps

- **データプレーンがこう構造化されている理由** — `runtime-graph.json` を第二の正本ではなく `stage-graph.json` の鏡にするコントロール / データプレーンの分離。[Plane Architecture](02-plane-architecture.md)。
- **コンパイルを引き起こすライフサイクル** — 監査出力がコンパイルフックを駆動するワークフロー / フェーズ / ステージ遷移。[State Machine](12-state-machine.md)。
- **このグラフが派生する監査ログ** — 98 種の分類と出力者レジストリ。[State Machine](12-state-machine.md) と User Guide の [State and Audit Trail](../guide/10-state-and-audit.md)。
