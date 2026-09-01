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

`instances` があるとき、ステージ行の単一インスタンスフィールド（`started_at`、`completed_at`、`memory_entries`、`memory_breakdown`）は NULL です。それらの値は各インスタンスにあります。ステージ行のフィールドとインスタンス配列のフィールドは決して共存しません。

### ボルト / ユニット依存 DAG（`bolt_dag`）

任意の `bolt_dag` ノードは、エンジンが並行ビルドバッチを計算するために読む、機械可読のユニット依存グラフです。スウォーム展開では「DAG が許可」です。既定のステージ主体歩きでは、任意の `directive.wave` のエンジン入力でもあります。ウェーブを出す前に、エンジンはこのキャッシュを書いた依存成果物に対して検証し、直したメモリ内バッチと kind を使って、ビルド、完了レシート、対レビュー、Unit メモリパスを含むユニットごとのエントリをすべて解決します。コンダクターはそのディレクティブだけを消費します。このキャッシュノードを読まず、兄弟パスを再構成しません。ソースは、units-generation（2.7）が `unit-of-work-dependency.md` に、人が読む散文の横へ書く **フェンス付き `yaml` `units:` 辺ブロック** です。

```yaml
units:
  - name: auth
    kind: service
    depends_on: []
  - name: api
    depends_on: [auth]
```

各ユニットは任意の `kind`（`service | spec | ui | packaging | library`）を運べます。ユニットが何かです。そのまま `bolt_dag.units[].kind` へ乗り、ユニットごとの Construction 設計の刈り込みを駆動します（[Stage definition](15-stage-definition.md) の `produces_kinds` 参照）。ステージの produces 成果物は、各ユニットの kind に当たるものへフィルタされます。タグ無しユニットは `kind` キーを持たず、設計成果物マトリクス全体を保ちます。無効な kind 値はブロック全体を `malformed` にします（下参照）。タイプミスは間違って刈るのではなく、2.7 ゲートで大きく失敗します。

`compile` は*その構造化ブロック*を — 純データの解析、モデル呼び出し無し — `units`（辺をそのまま）と `batches`（トポロジレベル）へ解析します。各バッチは、依存がすべてより早いバッチで満たされたユニットの集合なので、バッチ内のユニットに相互依存は無く、並行で走れます。レベルエントリは発行前に辞書順へ並べるので、書いた順に関係なくノードは決定論的です。

成果物が無い、または辺ブロックが無い、壊れている（名前の重複、ぶら下がりまたは自己依存、解析不能）、循環しているときは、ノードは**まるごと省略**されます。`compile` は理由を指名する stderr 診断を書き、間違っているが妥当な DAG を出す代わりに `bolt_dag` を封筒から外します。それらの失敗は上流の 2.7 ゲートで `required-sections` センサーが表に出します。同じブロックを検証し、`edge_block: ok | absent | malformed | cyclic` を報告します。辺を構造化データとして書くこと（知識作業、一度、2.7 承認ゲートの後ろ）が、フック発火の `compile` を再実行でバイト一致にします。コンパイル経路にモデルは座りません。orchestrate エンジンはキャッシュした `bolt_dag` を `unit-of-work-dependency.md` に対して検証し、ノードが無い、またはその書いた成果物と食い違うときは読み側でユニットごとの反復を自己修復します。グラフファイル自身が直されるのは次のコンパイルだけです。

---

## 3. コンパイルの寿命

コンパイルは、遷移クラスの監査発行のたびに PostToolUse Bash フック（`.claude/hooks/aidlc-rebuild-stage-graph.ts`）が呼びます。フックはコンダクターからのどの `Bash` ツール呼び出しでも発火し、安くフィルタします。

1. **コマンドフィルタ** — `bun .claude/tools/aidlc-(state|jump|bolt|utility).ts` 呼び出しだけが早期終了を通ります。`aidlc-runtime.ts` は除外（再帰ガード）。`aidlc-log.ts` はステージ内のうるさいイベントだけ。`aidlc-worktree.ts` は WORKTREE_* イベントだけ。
2. **監査存在ガード** — インテントの `audit/` シャードがまだ無ければ終了。
3. **ハートビート** — doctor の黙ったフック検出向けに `<record>/.aidlc-hooks-health/rebuild-stage-graph.last` を書く。
4. **末尾 3 ブロックの tail-read** — `audit.md` を `\n---\n` で割り、最後の 3 エントリを取る。
5. **イベントクラスフィルタ** — 3 ブロックのいずれかに `**Event**: (GATE_APPROVED|STAGE_STARTED|STAGE_AWAITING_APPROVAL|AUDIT_MERGED|WORKFLOW_COMPLETED)` を合わせる。一致が無ければ終了。
6. **ディスパッチ** — `spawnSync("bun", [".claude/tools/aidlc-runtime.ts", "compile", ...])`。

`WORKFLOW_COMPLETED` が遷移集合に入っているので、最終ステージの承認がコンパイルを発火します。`aidlc-state.ts:575-593` の `handleCompleteWorkflow` は監査行 4 本を出します — STAGE_COMPLETED + PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED — その最後の 3 本が `PHASE_COMPLETED + PHASE_VERIFIED + WORKFLOW_COMPLETED` です。（承認経路では STAGE_COMPLETED は抑制されます。承認がすでに出しているからです。`GATE_APPROVED` がその実行の前に来るので、最終ステージ承認はどちらの道でも 1 回の Bash 呼び出しで 5 行を追記します。）正規表現に `WORKFLOW_COMPLETED` が無いと、ランタイムグラフは最終ステージを承認済みとして記録しません。

コンパイル自身は監査ログ全体を歩きます（結果はイベントソースであり、遷移増分ではありません）。同じ slug の次の `STAGE_COMPLETED` と `STAGE_STARTED` を対にし、`aidlc-lib.ts` の `parseMemoryHeadings()` 経由で各ステージの memory.md を読み、`withAuditLock` 内の `writeFileAtomic` で成果物を原子的に書きます。

---

## 4. outcome 列挙と時系列の対

outcome 値は三つです。`"approved" | "failed" | "pending"`。

- **approved** — `STAGE_STARTED@T1` が後の `STAGE_COMPLETED@T2` と対。行の `completed_at` は `T2`。
- **pending** — `STAGE_STARTED@T1` に、その slug の後の `STAGE_COMPLETED` が無い。行の `completed_at` は `null`。
- **failed** — `instances[]` の親ステージ rollup だけが出します（単一インスタンスステージは `"approved" | "pending"` のまま）。Construction ステージの `instances[]` が空でないとき、親の `outcome` はインスタンスの rollup です。全部 approved → `approved`。どれかが failed → `failed`。それ以外（pending があり、失敗が無い）→ `pending`。単一インスタンスステージは `failed` を出しません。下にある `BOLT_FAILED` イベントは、instances 付き経路の外に Construction ステージ範囲を持たないからです。

再ジャンプの扱い: `/aidlc --stage <slug>` は、すでに完了した slug へ `STAGE_STARTED` を再発行します。監査ログは `STAGE_STARTED@T1, STAGE_COMPLETED@T2, STAGE_STARTED@T3` を運びます。対規則は `STARTED@T1` を `COMPLETED@T2` と合わせ → approved になりますが、slug の最新 `STAGE_STARTED` がより早い行を上書きします。slug につき 1 行、最新 STARTED が勝ちます。だから結果は `started_at: T3, completed_at: null` の pending 行です。

単発ステージ除外: `--single` のステージランナー実行は、`STAGE_STARTED` / `STAGE_COMPLETED` 対を合成 `**Workflow**: single-stage:<slug>` id の下にコミットします（監査のみ。`aidlc-orchestrate.ts` の `handleSingleReport` 参照）。対付けは `Workflow` フィールドが `single-stage:` で始まるどの `STAGE_*` 行も飛ばします。それらの行はメインワークフローに属さないので、メインの `runtime-graph.json` に行を作らず完了もさせません（だから `summary` 件数を膨らませません）。メインワークフローの `STAGE_*` 行は `Workflow` フィールドを持ちません。無いことは行を残す意味です。同じ除外は `aidlc-state.ts` の `hasStageAuditEvent` 重複検査にも効くので、単発実行の `STAGE_COMPLETED` が、同じ slug のメインワークフロー自身の完了発行を抑えられません。

---

## 5. MEMORY_EMPTY の意味

`MEMORY_EMPTY` 監査行はコンパイルが出します（唯一の発行元 — `audit-format.md:171` が `tools/aidlc-runtime.ts compile` を登録）。ステージ行が次を**すべて**満たすときです。

- `outcome === "approved"`（pending 行は出さない — 下の §6）
- `memory_entries === 0`（ファイルはあり、正規 §13 四見出しの下のエントリがゼロ）

エントリゼロの pending 行は出しません。飛行中のステージは、コンダクターがまだ memory.md に書いていないので、エントリがゼロでも正当です。飛行中に MEMORY_EMPTY を出すと、本当の日記スキップではない雑音になります。マイルストーン 14 の doctor が欲しい合図は「エントリゼロでステージ承認」です。それにはステージが承認済みであることが要ります。

### 冪等 — （slug、ゲート完了）につきちょうど一度

`runtime-graph.json` 自身は、同じ監査ログに対する再コンパイルでバイト同等です。MEMORY_EMPTY 発行はより強いです。**`(stage_slug, completed_at)` タプルにつき MEMORY_EMPTY 行は高々 1 本**。

ロックした区間の中で、コンパイルは `audit.md` を再読みし、エントリゼロで承認済みの各 slug の既存 MEMORY_EMPTY 行を走査し、以前の行の Timestamp がこの slug の `completed_at` 以降なら発行を抑えます。つまり:

- エントリゼロでステージが承認されたあとの最初のコンパイルが MEMORY_EMPTY 行を 1 本出す。
- 同じワークフロー中の以後のコンパイルは、その slug へ再発行しない。
- `--stage <slug>` 再ジャンプ + 再承認は新しい `STAGE_COMPLETED`（より遅い `completed_at`）を作る — 再承認でもまだ空なら、以前の行の Timestamp がいまは新しい completed_at より小さいので、新しい MEMORY_EMPTY 行が出る。

doctor の MEMORY_EMPTY 率メトリクスは、これらの行を重複排除せずに直接読みます。空日記のゲート完了につき 1 行です。

ロックした区間の中で MEMORY_EMPTY を出したあと成果物書きが失敗したら、監査ログは、runtime-graph.json が着地しなかったステージ向けの MEMORY_EMPTY 行を N 本運びます。次のコンパイルは抑制走査でそれらの行を見て再発行を飛ばし、それから成果物が着地します。重複発行も幽霊成果物もありません。

---

## 6. v0.4.0 バックフィル規則

マイルストーン 13 の memory.md 寿命が出荷される前に完了したステージは、memory.md 履歴がありません。バックフィル規則:

- `memory_entries: null` ↔ `memory_breakdown: null` ↔ MEMORY_EMPTY 発行なし。
- 両フィールドは一緒に動きます。判別子は「`parseMemoryHeadings` は実行したか」です。memory.md がある（ゼロバイトでも）なら実行し、キーは数値です。memory.md が無ければ両方 `null`。

この規則が無いと、v0.4.x から v0.5.0 へ上げた利用者は、アップグレード後最初のワークフローで MEMORY_EMPTY 行の嵐を見ます。

---

## 7. 復旧モデル — スナップショット + 接尾辞再生

`runtime-graph.json` + `audit.md` はイベントソースの対です。`audit.md` は追記専用イベントログ。`runtime-graph.json` は最後のゲート遷移で取った実体化スナップショットです。両方を持つ読み手は、スナップショットを読み、スナップショットの最後の `completed_at` よりあとの監査行を再生して、いまの状態を再構成します。

復旧ソースは五つ、人が読む順です。

1. **成果物ツリー**（`<record>/<phase>/<stage>/`） — 何が作られたか。
2. **memory.md**（`<record>/<phase>/<stage>/memory.md`） — コンダクターが残すと選んだこと。
3. **audit/ シャード** — 正のイベントログ。実際に起きたこと。
4. **state.md** — アクティブステージのカーソル。
5. **runtime-graph.json** — 実体化ビュー。監査を歩き直すより照会が速いが、常にそこから再導出できる。

### pending 行の鮮度注意

pending 行の `memory_entries` と `memory_breakdown` は、最後のコンパイル時にスナップショットされています。ステージが飛行中で、最後のコンパイル発火以降にコンダクターがエントリを足していれば、スナップショットは遅れます。復旧消費者は復旧時に memory.md を再解析しなければなりません。pending 行のスナップショット件数を信じてはいけません。

v0.5.0 に pending 件数をライブで読む消費者はありません。v0.6.0 の `--resume` 向けに文書化しています。この切り出しが要ります。

### 並行ボルトの飛行中復旧（v0.5.0 で閉じた）

並行ボルトのワークフローがバッチ途中で落ちたとき、マイルストーン 8 にはボルトごとの復旧継ぎ目がありませんでした。スキーマは `instances?` を予約していましたが、コンパイルはメインに単一インスタンス行だけを書き、worktree はランタイムグラフ断片を受け取りませんでした。v0.5.0 で閉じました。`aidlc-runtime.ts fragment-fork`（ボルト開始）と `fragment-merge`（ボルト complete --merge）、および Construction フェーズステージの窓に別 slug が 2 以上あると監査が示すときに `BoltInstance[]` を出すコンパイル populater 拡張です。

ボルトごとの断片は v0.5.0 では着地時点で死んでいます（v0.5.0 に worktree のレコードディレクトリ `runtime-graph.json` の読み手は無い）。v0.6.0 の `--resume` は断片をヒントとして扱い、メインのマージ後ランタイムグラフを正とし、加えて `aidlc-bolt.ts` に従い孤児 worktree を調べ、それら向けの復旧プロンプトを出すべきです。

---

## 8. CLI 面

```bash
# Walk audit + memory.md, write runtime-graph.json (invoked by hook).
bun .claude/tools/aidlc-runtime.ts compile

# Print one stage row from runtime-graph.json (debug/test surface).
bun .claude/tools/aidlc-runtime.ts read <stage-slug>

# Print deterministic aggregates over runtime-graph.json: stage/phase
# outcome tallies, memory-entry counts by category, sensor 4-state
# tallies, learnings captured, and workflow duration. Read-only; the
# session skills (session-cost, replay, outcomes-pack) consume the
# --json shape so every number they render comes from here, not from
# LLM-side counting.
bun .claude/tools/aidlc-runtime.ts summary [--json]

# Byte-copy main runtime-graph.json into a Bolt's worktree fragment
# (one-shot; called by `aidlc-bolt start --worktree`). No audit emit —
# the fragment lifecycle rides on STATE_FORKED + AUDIT_FORKED.
bun .claude/tools/aidlc-runtime.ts fragment-fork --slug <kebab-slug>

# Remove the worktree fragment (idempotent; called by
# `aidlc-bolt complete --merge`). No audit emit — the fragment
# lifecycle rides on STATE_MERGED + AUDIT_MERGED. Main's runtime-graph
# is rebuilt event-source by the post-Bash compile hook on AUDIT_MERGED.
bun .claude/tools/aidlc-runtime.ts fragment-merge --slug <kebab-slug>
```

どのサブコマンドも `--project-dir <path>` を受け付け、標準の cwd 基準解決を上書きします。

通常運用ではコンパイルはフック駆動です。手動呼び出しはテストとデバッグ向けです。

---

## 9. なぜフック駆動か、LLM ツール結合ではないか

以前の計画改訂は、`handleApprove` / `handleAdvance` / `handleComplete --merge` の中へ `spawnSibling(..., "aidlc-runtime.ts compile", ...)` 呼び出しを入れる案でした。そのやり方は、[Plane Architecture](02-plane-architecture.md) に書いた支えるテーゼに反します。

> 決定論が要るところはツール。知識が要るところは LLM / エージェント。判断が要るところは人。

ランタイムグラフのコンパイルはデータプレーンの土台であり、特定のセッションの外から観測できなければなりません。LLM が呼ぶツールへ結合すると、LLM の省略が決定論の保証を壊します。人が Approve をクリックしたあとコンダクターが `aidlc-orchestrate.ts report --stage <slug> --result approved --user-input "<exact choice>"` を呼び忘れると、監査行は追記されず、コンパイルも発火せず、ランタイムグラフは黙って遅れ、復旧土台が壊れます。

PostToolUse Bash フックは、LLM が次に何をしても、コンダクターの実際のサブプロセス呼び出しで発火します。監査発行側の継ぎ目（`bun aidlc-(state|jump|bolt|utility).ts`）が決定論の錨です。

---

## 10. 将来 PR が閉じる既知の隙間

- **MEMORY_EMPTY 率メトリクス** — マイルストーン 14 の doctor が、§5 で凍った `(Stage, ISO-second)` 重複排除タプルを使って率を出す。
- **`learnings_captured` 出自件数** — マイルストーン 12 のゲート儀式が `from_orchestrator` と `from_user_addition` を埋める。
- **`sensor_firings` 配列** — マイルストーン 9 + マイルストーン 10 がセンサーをディスパッチし、この枠を埋める。
- **runtime-graph.json のボルト fork / merge** — v0.5.0 で閉じた。`fragment-fork`（新しい監査イベントは無し。STATE_FORKED + AUDIT_FORKED に乗る）と `fragment-merge`（新しい監査イベントは無し。STATE_MERGED + AUDIT_MERGED に乗る）。コンパイルは、Construction ステージの窓に別 slug が 2 以上あるとき、監査の BOLT_* 付きイベントから `instances[]` を埋める。
- **ヘッドレスワークフロー向け CLI モードディスパッチ** — v0.6.0+ が Claude Code 以外の実行経路を出荷することがある。フックは Claude Code セッションの中でだけ発火する。

---

## 11. 断片の寿命

ボルトごとのランタイムグラフ断片ファイルは `<worktree>/<record>/runtime-graph.json` にあり、gitignore され、メインの場所を映します。寿命は次です。

1. **ボルト開始で fork。** `aidlc-bolt start --worktree --slug <slug>` は、state-fork + audit-fork のあと `aidlc-runtime fragment-fork --slug <slug>` に委ねます。単一読みプロトコル: `readFileSync` を一度バッファへ、そのバッファから断片パスへ `writeFileSync`、同じバッファを stdout 封筒のハッシュに使う。fork 途中に並行コンパイルがメインを書き直すバイトコピー / ハッシュ競合を閉じます。メインにまだ runtime-graph.json が無ければ、断片は worktree の状態カーソルに錨を打った空グラフです。
2. **ボルトの寿命中に進化。** post-Bash コンパイルフックは、遷移クラスの監査発行のたびに発火します。worktree 内の遷移も含みます。各発火は worktree の監査ビューから worktree の runtime-graph.json（断片）を再コンパイルします。断片は、このボルトの audit-fork 時点でアクティブだった兄弟向けに `instances[]` が埋まることがあります。あとから始まる兄弟は断片に現れません。worktree の監査は fork 時点のスナップショットだからです。
3. **ボルト完了で merge（solo / スウォーム経路）。** `aidlc-bolt complete --merge --slug <slug>` は、state-merge + audit-merge のあと `aidlc-runtime fragment-merge --slug <slug>` に委ねます。fragment-merge は stdout 観測向けに断片をハッシュし、`unlinkSync` し、JSON 封筒を出します。親 Bash 呼び出しが返ったあと、コンパイルフックがメインで再発火し、いまマージした slug 向けに `instances[]` を埋めたメインのランタイムグラフを作り直します。
4. **防御の深さの削除。** `aidlc-worktree merge` と `aidlc-worktree discard` はどちらも `git worktree remove` を呼び、推移的に断片を消します。fragment-merge の明示削除は、暗黙の掃除と組んで防御の深さの型です。状態側で state-merge と `git worktree remove` がすでに組むのと同じです。
5. **失敗の型。** `fragment-fork` 失敗（worktree 無し、断片がすでに存在、バイトコピー IO エラー、spawn タイムアウト）は、`aidlc-bolt` に `BOLT_FAILED` を `Reason: fragment-fork-*` フィールド付きで出させ、doctor 帰属に使います（IO / ガードエラーは `fragment-fork-failed`、spawn SIGTERM は `fragment-fork-timeout`）。state-fork + audit-fork はロールバックしません（それぞれがすでに自分の監査行を出しています）。audit-merge がすでに着地したあとの `fragment-merge` 失敗は、珍しい部分成功の監査署名 `BOLT_COMPLETED → STATE_MERGED → AUDIT_MERGED → BOLT_FAILED (Reason: fragment-merge-*)` を作ります（IO / ガードエラーは `fragment-merge-failed`、spawn SIGTERM は `fragment-merge-timeout`）。断片ファイルは暗黙の `git worktree remove` 掃除まで残ります。続くメインへのコンパイルは一貫したランタイムグラフを出します。この位置の BOLT_FAILED はインスタンスを `"approved"` と採点します。rollup の STATE_MERGED 勝ち優先が、ボルトの中身がすでにメインへ伝播したことを映すからです。ここでの BOLT_FAILED は復旧テレメトリです。継ぎ目を記録し、中身自身は無事のままです。

---

## Next Steps

- **なぜデータプレーンがこの構造か** — `runtime-graph.json` を第二の正本ではなく `stage-graph.json` の鏡にする、コントロール / データプレーンの分離。 [Plane Architecture](02-plane-architecture.md)。
- **コンパイルを引き起こすライフサイクル** — 監査発行がコンパイルフックを駆動する、ワークフロー / フェーズ / ステージ遷移。 [State Machine](12-state-machine.md)。
- **このグラフの導出元である監査ログ** — 91 イベントの分類と発行元レジストリ。 [State Machine](12-state-machine.md) と User Guide の [State and Audit Trail](../guide/10-state-and-audit.md)。
