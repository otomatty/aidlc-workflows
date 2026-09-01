# ルールシステム

> 読者: Tier 2/3（チームで入れる人、フレームワークの貢献者）。

この章は v0.5.0 ルールシステムのスキーマ寄りのリファレンスです。ルールファイルの置き場所、スコープの導出、継承鎖の解決、有効な frontmatter フィールド。リゾルバ（`aidlc-graph.ts compile`）と doctor の rule-drift 検査が読む仕様です。ルールは制御ループのフィードフォワード側です。対になる決定論的検証側は [Sensor System](07-sensor-system.md) です。利用者向けの案内 — ラーニングループの儀式、ANZ の通し例、確認した学びがルールファイルへ着地する流れ — は User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md) です。

## Layout {#layout}

ルールはアクティブスペースのメモリ層 `aidlc/spaces/<active-space>/memory/` に置きます（ワークスペースルートに手で直せる一式。どのハーネスもネイティブ include で読む — Claude の `@`-import スタブ、Kiro CLI の agent resources、Kiro IDE の常時 include される steering と生きたファイル参照、Codex の `AIDLC_RULES_DIR`）。スコープ名の中立ファイルです:

```
aidlc/spaces/<active-space>/memory/
├── org.md
├── team.md
├── project.md
└── phases/
    ├── ideation.md
    ├── inception.md
    ├── construction.md
    └── operation.md
```

配置は、チームが書くハーネス設定（以前は別の practices 名前空間）と自己学習のガードレール（以前は二段）を、アクティブスペースのメモリディレクトリ `aidlc/spaces/<active-space>/memory/` へ一つにまとめたものです。

## Filename-derived scope {#filename-derived-scope}

ルールファイルは `scope:` frontmatter フィールドを **持ちません**。スコープはファイル名から導きます:

| Filename pattern | Scope |
|---|---|
| `org.md` | `org` |
| `team.md` | `team` |
| `project.md` | `project` |
| `phases/<phase>.md` | `phase`（フェーズ値 = ファイル名） |

org、team、project、phase のルールにパス範囲の frontmatter はありません。引きの執筆が関係をステージ側に置きます。org / team / project は万能既定として全ステージに効きます（ファイル名から導く）。対応するフェーズルールが付くのは、ステージ frontmatter の `phase: <name>` が `phases/<name>.md` の取り込みだからです。

## Five-layer inheritance {#five-layer-inheritance}

ルールはワークフロー開始時に 5 層の鎖で解決されます:

```
org → team → project → phase → stage
```

org はフレームワーク既定を持ち、team と project 層がチームの肯定とプロジェクト固有で伸ばします。phase は直交です。ステージがすでに frontmatter で `phase: <name>` を宣言しているので、対応する `phases/<name>.md` が付きます（`requires_stage` と `consumes` と同じ書く向き）。ステージルールは将来用に空けてあります。書いたときは、各 `aidlc-stage-<slug>.md` がステージの `slug:` 宣言経由で付きます。この鎖が運用する二軸の設定模型は [01-architecture.md § Configuration layers](01-architecture.md) です。

コンパイル出力（`stage-graph.json` のステージごとの `rules_in_context` フィールド）は、解決済みの鎖を各ステージノードへ焼き込みます。ランタイムは鎖を歩きません。解決はコンパイルの仕事です。

## Strict-additive runtime model {#strict-additive-runtime-model}

当たるルールはすべて `rules_in_context` に出ます。org、team、project のルールは連結です。実行時に落ちるものはありません。フェーズルールが付くのは、ルールのファイル名がステージの `phase:` 宣言と一致するときです。glob フィルタも、具体パスの合成もありません。`run-stage` の前に、エンジンはアクティブスペースから中身のある各ルールファイルを読み、範囲付きの `load-steering` ディレクティブを一つ以上通して本文を出します。継続トークンは、アクティブインテントの gitignore された `.aidlc-*` 実行時状態（またはインテントが無いあいだはクローンローカルのセッション実行時）の下にある、ランダムなマシンローカル秘密で鍵をかけた完全性 MAC を持ちます。トークンはステージ、ワークフロー状態、ルール束、経路、次のパートを結び、公開プロジェクトパスから再署名できません。新しい `next` は必要なら鍵を遅延発行します。サイズによるパスのフォールバックはありません。空のテンプレートは落とします。読めない、または無効な必須ルールは、直し方を出して止まります。配送はステージごとに繰り返すので、ワークフロー途中で受理した学びは次のステージに届きます。

§13 Learnings Ritual は、学びがリゾルバに届く前のメモリゲートで、オーケストレータに衝突（狭いスコープが広い方針と矛盾すること）を見させます。検査は見出し単位です。提案する日付付き学び項目が `memory/project.md`（または `memory/team.md`）へ書かれようとするとき、オーケストレータは LLM 検査で `memory/org.md` の対応見出しと較べます。衝突があれば、利用者は **直す、飛ばす、またはエスカレート** します（上書きの道は無い）。衝突が無い、または利用者がエスカレートした選択だけが `aidlc-learnings.ts persist` に届きます。persist は `org.md` を読まず、比較を独自には判断しません。したがって検査は監査の助けであり、決定論的な強制の境界ではありません。practices-discovery の肯定ゲートがもう一つの受理ゲートですが、その昇格は人の肯定で正当化された決定論的な見出し置換（`aidlc-state.ts practices-promote`）で、自動の org 衝突検査は走りません。org と team/project の中身の書き込み後ドリフトは、別に doctor の rule-drift 行が出します（後述）。

この設計は、以前の `enforcement: enforced` キーワードと `overrides:` ブロック模型を置き換えます。両方のキーワードはスキーマから外れています。frontmatter のパースは、下の未知キー許容方針経由でそれらを拒みます — 投げずに静かに通りますが、リゾルバは無視します。

doctor の rule-drift 検査は、要求に応じて書き込み後のドリフトを出します。team または project の中身がディスクに着地したあとで org ルールが変わったとき、doctor は決定論的に、team/project プラクティスファイル（`memory/team.md`、`memory/project.md`）が *埋まっている* org 見出しと共有する `##` 見出しを見つけ、各重なりを advisory 候補として出します — ファイル、見出し、引用した org の文 — 表示は `Rule drift: N team/project rule(s) overlap org policy (review for contradiction)`。古いファイルからの重なりは、その生きた件数から外し、別に `Rule drift: N stale-suppressed` として報告します。doctor 自身は LLM を走りません。検出はバイト再現の見出し / 文字列作業です。矛盾の判定 — 受理ゲートが走るのと同じ見出し単位の LLM 検査 — は、観察時の消費側オーケストレータの仕事で、止めません。人は出されたドリフトを直し、エスカレートし、または受け入れます。

## `pairing:` field {#pairing-field}

ルールは `.claude/sensors/aidlc-*.md` の決定論的センサーと対になってよいです:

```yaml
---
pairing: aidlc-required-sections
---
# or
pairing: feedforward-only
---
```

有効な値:

- `feedforward-only` — 相棒のセンサーが無いことの明示宣言（フレームワークは決定論的に検証できない）。
- `<sensor-id>` — 既存の `.claude/sensors/aidlc-<id>.md` の `id:` フィールドと一致しなければならない。

doctor の paired-coverage 行は、対になったルールと feedforward-only ルールを数え、対になっていないルールをカバレッジの欠けとして出します（[Rule-drift detection](#rule-drift-detection)）。

## Lifecycle fields {#lifecycle-fields}

どのルールファイルも、ファイル単位のライフサイクルメタデータを宣言してよいです:

```yaml
---
status: active
stale_after: 2026-12-31
---
```

- `status` が受け付けるのはちょうど `active`、`deprecated`、`draft`。`deprecated` はファイルを古くする。`active` と `draft` はしない。
- `stale_after` は `YYYY-MM-DD` 形式の実在する暦日でなければならない。ファイルが古くなるのは、現在の UTC 日付がこの値より厳密に大きいときだけなので、`stale_after` 当日はまだ生きている。
- ライフサイクルはファイル全体に効き、個々の見出しには効かない。古い team/project ファイルの org 見出し重なりは、生きた rule-drift 件数から、通過する別の `stale-suppressed` 行へ移る。

両方のフィールドは任意です。無効な値は、ファイル名を出したエラーでルール読み込みを止めます。org、team、project、phase のルールファイルで有効です。ただし Tier-1 の決定論的消費者は意図して狭く、`/aidlc --doctor` で team/project の重なりを抑えるだけです。ライフサイクルメタデータは、厳格加算の実行時束からルールを外しません。

## Rule-drift detection {#rule-drift-detection}

`/aidlc --doctor` は、ルール / センサーの状態を観察する advisory 行を 2 つ出します。どちらも読み取り専用で、いつも通過します — ヘルスチェックの終了コードは変えません。（v0.6.10 から `--doctor` は cold-safe です。paired-coverage 検査が出す `GUARDRAIL_LOADED` 監査行は、アクティブインテントの `audit/` シャードがすでに存在するときだけ書かれます。インテントがまだ無い新しいシェルでは、doctor は行を出しますが、何も発行せずファイルも作りません。）

- **Rule drift** — 各 team/project プラクティスファイル（`memory/team.md`、`memory/project.md`）について、doctor は `memory/org.md` の *埋まっている* 見出しにも現れる `##` 見出しを見つけ、各重なりを候補の対として出します。ファイル、見出し、最初の org 文をそのまま引用。org 本文が空の見出し（例: フレームワーク既定の `## Forbidden`、`## Mandated`、`## Corrections`。HTML コメントだけ）は数えません。重なりは両側に中身が要ります。生きた重なりは既存の review-for-contradiction 行に出ます。ライフサイクルが古いファイルからの重なりは、同じインライン詳細を持つ別の `Rule drift: N stale-suppressed` advisory 行に出ます。各行の件数 N は *構造上の* 候補対の数であり、LLM が確めた矛盾ではありません。doctor は決定論的に検出し、矛盾の判定は観察時のオーケストレータ LLM です（[strict-additive section](#strict-additive-runtime-model)）。
- **Paired sensor coverage** — `pairing: <sensor-id>` を持つ各ルールについて、doctor は `aidlc-` 接頭辞を外し、指名したセンサーが少なくとも 1 ステージの解決済みセンサー集合（`sensors_applicable`）に存在することを確かめます。行は `Paired sensor coverage: P/(M-X) guardrails paired (X feedforward-only)` です。M は `pairing:` 値を持つルール、X は feedforward-only ルール（センサーは要らない）、P は指名したセンサーが解決するルール。対になっていないルール（センサー id は指名されているが、どのステージにも結ばれていない）はインラインで列挙します。これは **ファイル存在の検査であり、意味の検査ではありません** — 結びが解決することを確かめ、センサーがルールに合うことは確かめません。行は初期化済みプロジェクトで実行ごとに `GUARDRAIL_LOADED` 監査イベントを 1 回出します（`audit.md` の無い真っさらなプロジェクトでは発行を抑える — 上の cold-safe 注）。

## Forward-compat policy {#forward-compat-policy}

ルール frontmatter は加算拡張で前方互換です:

- 新しいフィールドは加算で載る — 既存のルール行を書き直す必要は無い。
- 消費者は未知の frontmatter キーを許容しなければならない（無視して通す）。利用者拡張のオーバーレイに残っている古い `enforcement:` / `overrides:` キーが、エラーなく載るのはこのため。
- ルール本文の約束（`## Forbidden`、`## Mandated` のような見出し）は、既存のガードレール約束に従う。
- Learnings Ritual（メモリゲート）は、確認した学びをプラクティスとしてスペースメモリファイルへ直接書く — `memory/project.md`（既定）と `memory/team.md`（ワンクリック昇格。org スコープへの書き込みは無い）— 日記見出しの話題の下の日付付き項目として。確認した学び *は* プラクティスです。practices-discovery が肯定する同じファイルであり、別の `*-learnings.md` 面ではありません。リゾルバはきれいな整数鎖 `SCOPE_PRIORITY`（org:0、team:1、project:2、phase:3）で並べます。端数の 1.5 / 2.5 層はありません。オーケストレータが、上の `## Strict-additive runtime model` で書いた受理衝突検査を行い（提案する日付付き項目 1 つ対 `memory/org.md` の対応見出し。直す / 飛ばす / エスカレート。上書きの道は無い）、それから `aidlc-learnings.ts persist` は受け取った選択を、その比較を再実行せずに書きます。

v0.5.0 より前のルールファイルは、改名 + flatten のあと、中身を変えずに載ります。移行はパスだけです。

## Next Steps {#next-steps}

- **Sensors** — ルールが `pairing:` で対になれる決定論的な半分。[Sensor System](07-sensor-system.md)。
- **コンパイル境界** — `rules_in_context` がワークフロー開始時に一度解決され、ワークフロー全体でグラフノードから読まれる流れ。[Plane Architecture](02-plane-architecture.md)。
- **実際のラーニングループ** — `memory.md` 日記、承認ゲートの儀式、ANZ の通し例。User Guide の [Rules and the Learning Loop](../guide/09-rules-and-the-learning-loop.md)。
- **二軸の設定模型** — この 5 層の鎖が運用する、より広い振り分け原則。[Architecture § Configuration layers](01-architecture.md)。
