# 技術環境: CalcEngine

## 言語とパッケージマネージャー

- **Python 3.12+**
- パッケージ管理にはすべて **uv** を使用（pip、poetry、condaは使用不可）
- プロジェクトおよびツールの設定はすべて `pyproject.toml` に記載
- `uv.lock` はGitにコミットする

## Webフレームワーク

- リクエスト・レスポンスのバリデーションにPydantic v2を使用した **FastAPI**
- AWS Lambda上でFastAPIを動作させるための **Mangum**

## クラウドおよびデプロイ

- **AWS**、シングルアカウント、`us-east-1`
- **サーバーレス**: API Gateway（HTTP APIタイプ）の背後にLambdaを配置
- APIキーの保存と使用量の計測に **DynamoDB**
- ドキュメントサイトに **S3 + CloudFront**
- インフラはすべて **AWS CDK（Python）** で管理――コンソールでの手動変更は不可

## テスト

- **pytest**（pytest-cov使用、行カバレッジ最低90%）
- 数学的精度の特性ベーステストに **hypothesis**
- 型チェックに **mypy** ストリクトモード
- リントおよびフォーマットに **ruff**
- テストでのAWSサービスのモックに **moto**

## 使用禁止事項

| 禁止事項                      | 理由                                              | 代替手段                    |
| ------------------------------- | ------------------------------------------------- | --------------------------- |
| `eval()`, `exec()`, `compile()` | セキュリティ――任意コードの実行につながる         | ASTベースの数式パーサー     |
| Flask, Django                   | プロジェクトではFastAPIを使用                     | FastAPI                     |
| requests                        | 非同期イベントループをブロックする                | httpx                       |
| sympy                           | MVPには重すぎる                                   | カスタム数式パーサー        |
| pandas                          | 不要――単一の計算処理であり、データフレームは使わない | 標準Python                |
| pip, poetry, pipenv             | プロジェクトでは専らuvを使用                      | uv                          |
| black, flake8, isort            | ruffに置き換え済み                                | ruff                        |
| AWS EC2, ECS, RDS               | MVPではサーバーレスモデルを優先                   | Lambda、DynamoDB            |

## セキュリティの基本事項

- `Authorization: Bearer {key}` ヘッダーによるAPIキー認証
- キーはDynamoDBにbcryptハッシュとして保存し、平文でのログ記録は不可
- 数式パーサーは文字のホワイトリストとAST評価を使用――動的なコード実行は不可
- 数式の長さは最大4,096文字、ネストの深さは最大100レベルに制限
- TLS 1.2以上を強制、HTTPエンドポイントは設けない
- シークレットはAWS Secrets Managerに保存し、環境変数やコードには含めない

## コードパターンの例

エンドポイントは以下の構造に従うこと:

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from calcengine.api.middleware.auth import get_api_key_id
from calcengine.api.models.errors import error_response
from calcengine.api.models.responses import CalculationResponse
from calcengine.engine.errors import CalcEngineError
from calcengine.engine.trigonometry import sin

router = APIRouter()


class SinRequest(BaseModel):
    value: float
    angle_mode: str = Field(default="radians", pattern="^(radians|degrees)$")


@router.post("/v1/trigonometry/sin", response_model=CalculationResponse)
async def calculate_sin(
    request: SinRequest,
    api_key_id: str = Depends(get_api_key_id),
) -> CalculationResponse | dict:
    try:
        result = sin(request.value, angle_mode=request.angle_mode)
        return CalculationResponse(result=result, expression=f"sin({request.value})")
    except CalcEngineError as e:
        return error_response(e)
```

数学関数は以下の構造に従うこと:

```python
import math

from calcengine.engine.errors import DomainError


def log_base(value: float, base: float = 10.0) -> float:
    """Compute logarithm of value with given base. Raises DomainError for invalid input."""
    if value <= 0:
        raise DomainError(
            code="DOMAIN_ERROR",
            message=f"Cannot compute logarithm of {value}",
            detail="Logarithm is only defined for positive numbers",
        )
    if base <= 0 or base == 1.0:
        raise DomainError(
            code="DOMAIN_ERROR",
            message=f"Invalid logarithm base: {base}",
            detail="Base must be positive and not equal to 1",
        )
    return math.log(value) / math.log(base)
```

テストは以下の構造に従うこと:

```python
import math
import pytest
from hypothesis import given, strategies as st
from calcengine.engine.errors import DomainError
from calcengine.engine.logarithmic import log_base


def test_log10_of_100() -> None:
    assert log_base(100, 10) == pytest.approx(2.0)


def test_log_of_negative_raises_domain_error() -> None:
    with pytest.raises(DomainError):
        log_base(-5)


@given(st.floats(min_value=1e-300, max_value=1e300, allow_nan=False, allow_infinity=False))
def test_log10_matches_stdlib(x: float) -> None:
    assert log_base(x, 10) == pytest.approx(math.log10(x), rel=1e-14)
```
