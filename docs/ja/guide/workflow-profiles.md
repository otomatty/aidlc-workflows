# Workflow Profiles

AI-DLC は、どの仕事も同じライフサイクルに通しません。よくある仕事向けに **ワークフロープロファイル** を配っています。フルの機能、速いバグ修正、インフラ変更、軽い Express の通し、ほか。

エンジンはワークフロープロファイルを **スコープ** と呼びます。同じ選択を、向きを変えて言っています。

- **ワークフロープロファイル** は利用者から見た体験です。いま何をしていて、どれだけの儀式が要るか。
- **スコープ** は `aidlc-state.md` に残るエンジン設定です。そのワークフローが使うステージ経路、深度、テスト戦略、レビュー上限。

選ぶときは `/aidlc <profile>` で明示するか、仕事を書いて AI-DLC に提案させます。キーワード一致や compose 提案は、始める前に経路を確認します。名前を明示したプロファイルはすぐ始まり、ステージ数とゲート数を出します。

## Quick chooser

| Workflow profile | Best for | Stages | Depth | Test strategy | Start with |
|------------------|----------|--------|-------|---------------|------------|
| **Classic** | Ideation 無しの確立ライフサイクルで、普通の仕事 | 26 / 33 | Standard | Standard | `/aidlc classic` |
| **Express** | いちばん軽い、要件からコードとテストまでの道 | 10 / 33 | Minimal | Minimal | `/aidlc express` |
| **Feature** | 完全なライフサイクルで本番機能を作る | 33 / 33 | Standard | Standard | `/aidlc feature` |
| **Enterprise** | 規制や高い保証。トレーサビリティまで | 33 / 33 | Comprehensive | Comprehensive | `/aidlc enterprise` |
| **MVP** | 本物の最初の製品増分。Operation フェーズは無し | 23 / 33 | Standard | Standard | `/aidlc mvp` |
| **Proof of concept** | 実現性を、いちばん薄い実装経路で試す | 8 / 33 | Minimal | Minimal | `/aidlc poc` |
| **Bugfix** | 既知の欠陥。狙い撃ちの直しと回帰テスト | 9 / 33 | Minimal | Minimal | `/aidlc bugfix` |
| **Refactor** | 製品の振る舞いを変えずに、既存コードを良くする | 10 / 33 | Minimal | Minimal | `/aidlc refactor` |
| **Infrastructure** | 環境、IaC、デプロイ基盤、コストの仕事 | 13 / 33 | Standard | Standard | `/aidlc infra` |
| **Security patch** | CVE や、絞った脆弱性対応 | 10 / 33 | Minimal | Minimal | `/aidlc security-patch` |
| **Workshop** | 進行付きのトレーニングや集団デリバリー | 26 / 33 | Standard | Minimal | `/aidlc workshop` |

ステージ数は静的な経路です。CONDITIONAL のステージは、条件が当たらなければ自分で飛びます。greenfield の Reverse Engineering が典型です。プロファイルごとの正確な行列は [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md#stage-by-scope-matrix) です。

## `classic`

**Classic を選ぶとき:** 確立した AI-DLC ライフサイクルが欲しく、仕事に Ideation フェーズが要らないとき。Inception から始まり、Construction、当てはまる Operation ステージへ進みます。

Classic は、あなたも `AWS_AIDLC_DEFAULT_SCOPE` も別プロファイルを名前しないときの、エンジンの暗黙の既定です。会話のコールドスタートでは、豊かな仕事の説明は、何かを作る前に適応型 compose 提案を受け取ることがあります。Classic は Standard の成果物とテストを使い、通常のステージレビューは助言 1 回が上限です。

問題そのものがまだぼやけていて、市場調査、実現性分析、明示のスコープ発見が効くなら、Classic は選ばないでください。Feature か Enterprise です。

## `express`

**Express を選ぶとき:** 要件はもう分かっていて、要件、実装、テスト、任意のデプロイ末尾まで、配布でいちばん短い道が欲しいとき。

Express は Ideation、設計パス、ユニット分解、Delivery Planning、CI Pipeline を飛ばします。ステージレビュアーの派遣は切り、成果物は Minimal、テストは要件駆動です。Reverse Engineering とデプロイステージは CONDITIONAL のままです。

曖昧、複数チーム、規制、アーキテクチャが厚い仕事に Express は選ばないでください。速さは、そうした判断面を意図して外した結果です。

## `feature`

**Feature を選ぶとき:** 本番機能を作っていて、実用の深度で完全なライフサイクルが欲しいとき。

Feature は 33 ステージ全部を Standard 深度で回します。インテント発見から設計、実装、デプロイ、フィードバックまで。未知を表に出す機会はいちばん広く、Enterprise より文書の下限は軽いです。

## `enterprise`

**Enterprise を選ぶとき:** 規制がある、リスクが高い、監査に敏感、形式のコンプライアンスと運用証拠が要るとき。

Enterprise は 33 ステージ全部を Comprehensive 深度で回します。市場、コンプライアンス、セキュリティ、設計、可観測性、インシデント対応、性能の仕事を残します。文書に残らない判断のコストが、儀式を足すコストより高いためです。

## `mvp`

**MVP を選ぶとき:** アイデアが可能かどうかではなく、本物の最初の製品増分を出荷するとき。

MVP は Inception と Construction の設計／実装経路を Standard 深度で残します。Ideation の儀式は一部削り、Operation フェーズは飛ばします。製品が本番運用と、フィードバックまでのフルライフサイクルを要するようになったら、Feature か Enterprise へ移してください。

## `poc`

**Proof of Concept を選ぶとき:** いちばんの問いが、その方針が通るか、であるとき。

PoC は Minimal 深度で 8 ステージです。要件、コード、テストまで急ぎ、製品、設計、運用の儀式の大半は外します。PoC は後の判断のための証拠であり、本番準備のプロファイルではありません。

## `bugfix`

**Bugfix を選ぶとき:** 欠陥は分かっていて、欲しい結果が狙い撃ちの修理と検証であるとき。

Bugfix は Minimal 深度で 9 ステージです。ワークスペース理解、要件、Code Generation、Build and Test、デプロイ経路は残し、発見、広い設計、関係ない Operation は落とします。

## `refactor`

**Refactor を選ぶとき:** 振る舞いは据え置き、内部構造、保守性、技術的負債を良くするとき。

Refactor は Minimal 深度で 10 ステージです。既存コードの理解、内部変更の定義、実装、振る舞いが退行していないことの証明、検証した成果のデプロイ通過に力を置きます。利用者に見える振る舞いが変わるなら Feature です。

## `infra`

**Infrastructure を選ぶとき:** 結果が環境、IaC の変更、デプロイ基盤、プラットフォーム能力、コスト最適化であるとき。

Infrastructure は Standard 深度で 13 ステージです。ユーザー向けの製品儀式を外し、要件、NFR、インフラ設計、CI/CD、デプロイ、可観測性に集中します。

## `security-patch`

**Security Patch を選ぶとき:** 既知の CVE、脆弱性、狭いセキュリティ欠陥に応えるとき。

Security Patch は Minimal 深度で 10 ステージです。セキュリティに効く要件、検証、実装、デプロイ経路は残し、関係ない製品儀式は避けます。絞ったパッチではなく、広いセキュリティやコンプライアンスの計画なら Enterprise です。

## `workshop`

**Workshop を選ぶとき:** 進行役がトレーニングラボや、揃えた集団セッションを率いるとき。

Workshop は Ideation を飛ばします。演習は進行役が出すからです。そのあと Inception から Operation までのライフサイクルを Standard 深度で回します。教えのセッションが止まらないよう、テスト戦略は意図して Minimal です。通常のレビューは助言 1 回が上限です。複数参加者の回し方は [Workshop Mode](workshop-mode.md) です。

## Let AI-DLC choose or compose

プロファイルを覚えなくても構いません。仕事を書いてください。

```
/aidlc Fix the login timeout bug
/aidlc Build a regulated payment approval service
/aidlc Create a lightweight prototype for the new search flow
```

キーワードがはっきり当たると、配布プロファイルを提案し、確認のためにステージ数とゲート数を出します。豊か、または曖昧な仕事は、適応型コンポーザーを使う提案を受けます。合わせたステージ経路を出し、作る前に承認を待ちます。

強制するなら:

```
/aidlc compose "harden the deployment pipeline and add observability"
```

## Related controls

ワークフロープロファイルは経路と既定を選びます。独立に調整できるのは次です。

- **深度** は `--depth minimal|standard|comprehensive`。
- **テスト戦略** は `--test-strategy minimal|standard|comprehensive`。
- **レビュー上限** は `--review adversarial|advisory|none`。効くクラスは、ステージ宣言、プロファイル上限、この実行上限のうちいちばん低いものなので、レビュー強度は上がりません。

これらの上書きは、あるプロファイルを別のプロファイルにはしません。選んだプロファイルを調整します。規範のルーティング行列と上書きの意味は [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) です。
