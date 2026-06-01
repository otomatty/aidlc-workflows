# 技術環境：返品・返金モジュール — OrderFlow プラットフォーム

> **ブラウンフィールドプロジェクト。** 既存のスタックがベースラインです。新しいコードは
> 確立済みのパターンに合わせる必要があります。以下に記載のない選択については、
> 既存のコードベースに従ってください — 正当な理由なく新しいパターンを導入しないこと。

---

## 既存スタック（保持必須）

| レイヤー             | 現在の技術          | バージョン | 備考                                                                 |
| ------------------ | ------------------- | --------- | -------------------------------------------------------------------- |
| 言語               | TypeScript          | 5.x       | ストリクトモード。JavaScriptファイルを導入しないこと。                 |
| ランタイム           | Node.js             | 20.x LTS  |                                                                      |
| APIフレームワーク    | Express             | 4.x       | 既存サービスはすべてExpressを使用。FastifyやKoaを導入しないこと。     |
| データベース         | PostgreSQL          | 15        | pgおよびnode-postgres経由。ORMなし — 型付きクエリヘルパーを使った生SQL。|
| インフラ             | AWS ECS Fargate     | —         | サービスはDockerコンテナとしてデプロイ。インフラはすべてCDK。         |
| メッセージバス       | Amazon SQS          | —         | notification-serviceが非同期メール配信に使用。                        |
| 認証               | AWS Cognito         | —         | API GatewayでJWTトークンを検証。新たな認証レイヤーを構築しないこと。   |
| パッケージマネージャー | npm                | 10.x      | yarnやpnpmを導入しないこと。                                           |
| テストフレームワーク  | Jest                | 29.x      | ts-jest使用。テストはすべてソースファイルと同じ場所の `__tests__/` に配置。|
| リンター / フォーマッター | ESLint + Prettier | —         | 設定ファイルはリポジトリルートにある。変更しないこと。                  |

---

## 追加するもの（本モジュール向けの新規追加）

- `order-service` と同じ構造に従った新しい `returns-service`
- 新しいPostgreSQLテーブル：`return_requests`、`return_items`、`return_status_history`
- 顧客向け返品フォームおよびオペレーションダッシュボード用の新しいReactコンポーネント
- これらの追加は、既存のテーブルやサービスのコントラクトを変更しないこと

---

## 変更せずに維持するもの

- `order-service`、`payment-service`、`notification-service` — これらのサービスを変更しないこと
- 既存のPostgreSQLテーブル — 追加マイグレーションのみ（新しいテーブル、新しいテーブルへの新しいカラム）
- `notification-service` のAPIコントラクト — ドキュメントに従って呼び出すだけで、拡張しないこと
- 既存のCDKスタック — `returns-service` 用に新しいスタックを追加し、既存スタックは編集しないこと
- フロントエンドのデザインシステムコンポーネント — 既存コンポーネントを使用し、代替品を作成しないこと

---

## 削除すべきもの / 導入してはならないもの

| 禁止事項                          | 理由                                                                                         | 代替手段                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| ORM（TypeORM、Prisma、Sequelize）   | 既存コードベースは型付きヘルパーを使った生SQLを使用。ORMを導入すると一貫性が失われる。       | 既存パターンに合わせた、型付きクエリ関数を使ったnode-postgres             |
| Axios                               | プロジェクトはネイティブのfetch（Node 20組み込み）を使用。                                   | fetch                                                                       |
| 新しいCSSフレームワーク              | 既存フロントエンドはTailwind CSSを使用。                                                     | Tailwind CSS、既存のデザインシステムコンポーネント                          |
| 新しい状態管理ライブラリ             | 既存フロントエンドはReact Context + useReducerを使用。                                        | React Context + useReducer                                                  |
| 新しいテストランナー（Vitest、Mocha）| プロジェクト全体でJestを使用。                                                               | Jest                                                                        |
| 独立した認証サービスやミドルウェア   | 認証はCognito JWTによってAPI Gatewayで処理される。                                           | Authorization ヘッダーで渡されるJWTを検証する（他のサービスと同様）        |

---

## セキュリティの基本事項

- 認証：Cognito JWTはAPI Gatewayで検証される。サービスは `x-user-id` および `x-user-role` ヘッダーを受け取る — これらを信頼し、サービス内でJWTを再検証しないこと
- 認可：オペレーションダッシュボードのエンドポイントには `role === 'operations'` が必要 — このヘッダーを確認すること
- 入力バリデーション：処理前にZodスキーマですべてのリクエストボディを検証すること
- 個人情報：返品申請には顧客名や住所が含まれる — これらのフィールドをログに記録しないこと
- シークレット：データベースの認証情報やサービスURLはAWS Secrets Manager経由で管理（既存サービスと同様）

---

## コードパターンの例

既存コードベースから以下のパターンに従うこと。代替手段を独自に考案しないこと。

**サービスエンドポイント（Expressルートハンドラー）:**

```typescript
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createReturnRequest } from '../domain/returns';
import { AppError } from '../errors';

const router = Router();

const CreateReturnSchema = z.object({
  orderId: z.string().uuid(),
  items: z.array(z.object({ orderItemId: z.string().uuid(), reason: z.string().min(1) })).min(1),
});

router.post('/returns', async (req: Request, res: Response) => {
  const parsed = CreateReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
  }
  try {
    const result = await createReturnRequest(parsed.data, req.headers['x-user-id'] as string);
    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }
    throw err;
  }
});

export default router;
```

**データベースクエリ関数:**

```typescript
import { pool } from '../db/pool';

export interface ReturnRequest {
  id: string;
  orderId: string;
  customerId: string;
  status: 'submitted' | 'approved' | 'rejected' | 'refunded';
  createdAt: Date;
}

export async function getReturnRequestById(id: string): Promise<ReturnRequest | null> {
  const { rows } = await pool.query<ReturnRequest>(
    'SELECT id, order_id AS "orderId", customer_id AS "customerId", status, created_at AS "createdAt" FROM return_requests WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}
```

**Jestテスト:**

```typescript
import { getReturnRequestById } from '../db/return-requests';
import { pool } from '../db/pool';

jest.mock('../db/pool');
const mockQuery = pool.query as jest.Mock;

describe('getReturnRequestById', () => {
  it('returns the request when found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'abc', orderId: '123', status: 'submitted' }] });
    const result = await getReturnRequestById('abc');
    expect(result?.id).toBe('abc');
  });

  it('returns null when not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getReturnRequestById('missing');
    expect(result).toBeNull();
  });
});
```
