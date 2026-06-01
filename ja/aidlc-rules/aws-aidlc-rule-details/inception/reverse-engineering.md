# リバースエンジニアリング

**目的**: 既存のコードベースを分析し、包括的な設計成果物を生成する

**実行タイミング**: ブラウンフィールドプロジェクトが検出された場合（ワークスペースに既存コードが存在する場合）

**スキップタイミング**: グリーンフィールドプロジェクト（既存コードが存在しない場合）

**再実行の動作**: 再実行は workspace-detection.md によって制御される。既存のリバースエンジニアリング成果物が見つかり、まだ有効であれば、それらを読み込んでリバースエンジニアリングをスキップする。成果物が古い（コードベースの最後の重要な変更より古い）場合、またはユーザーが明示的に再実行を要求した場合は、現在のコード状態を反映するためにリバースエンジニアリングを再実行する。

## ステップ1: マルチパッケージの検出

### 1.1 ワークスペースのスキャン
- すべてのパッケージ（言及されたものだけでなく）
- 設定ファイルを通じたパッケージの関係
- パッケージの種類: アプリケーション、CDK/インフラストラクチャ、モデル、クライアント、テスト

### 1.2 ビジネスコンテキストの理解
- システム全体が実装しているコアビジネス
- すべてのパッケージのビジネス概要
- システムに実装されているビジネストランザクションの一覧

### 1.3 インフラストラクチャの検出
- CDK パッケージ（CDK 依存関係を持つ package.json）
- Terraform（.tf ファイル）
- CloudFormation（.yaml/.json テンプレート）
- デプロイメントスクリプト

### 1.4 ビルドシステムの検出
- ビルドシステム: Brazil、Maven、Gradle、npm
- ビルドシステム宣言のための設定ファイル
- パッケージ間のビルド依存関係

### 1.5 サービスアーキテクチャの検出
- Lambda 関数（ハンドラー、トリガー）
- コンテナサービス（Docker/ECS 設定）
- API 定義（Smithy モデル、OpenAPI 仕様）
- データストア（DynamoDB、S3 など）

### 1.6 コード品質の分析
- プログラミング言語とフレームワーク
- テストカバレッジの指標
- リンティング設定
- CI/CD パイプライン

## ステップ2: ビジネス概要ドキュメントの生成

`aidlc-docs/inception/reverse-engineering/business-overview.md` を作成する：

```markdown
# Business Overview

## Business Context Diagram
[Mermaid diagram showing the Business Context]

## Business Description
- **Business Description**: [Overall Business description of what the system does]
- **Business Transactions**: [List of Business Transactions that the system implements and their descriptions]
- **Business Dictionary**: [Business dictionary terms that the system follows and their meaning]

## Component Level Business Descriptions
### [Package/Component Name]
- **Purpose**: [What it does from the business perspective]
- **Responsibilities**: [Key responsibilities]
```

## ステップ3: アーキテクチャドキュメントの生成

`aidlc-docs/inception/reverse-engineering/architecture.md` を作成する：

```markdown
# System Architecture

## System Overview
[High-level description of the system]

## Architecture Diagram
[Mermaid diagram showing all packages, services, data stores, relationships]

## Component Descriptions
### [Package/Component Name]
- **Purpose**: [What it does]
- **Responsibilities**: [Key responsibilities]
- **Dependencies**: [What it depends on]
- **Type**: [Application/Infrastructure/Model/Client/Test]

## Data Flow
[Mermaid sequence diagram of key workflows]

## Integration Points
- **External APIs**: [List with purposes]
- **Databases**: [List with purposes]
- **Third-party Services**: [List with purposes]

## Infrastructure Components
- **CDK Stacks**: [List with purposes]
- **Deployment Model**: [Description]
- **Networking**: [VPC, subnets, security groups]
```

## ステップ4: コード構造ドキュメントの生成

`aidlc-docs/inception/reverse-engineering/code-structure.md` を作成する：

```markdown
# Code Structure

## Build System
- **Type**: [Maven/Gradle/npm/Brazil]
- **Configuration**: [Key build files and settings]

## Key Classes/Modules
[Mermaid class diagram or module hierarchy]

### Existing Files Inventory
[List all source files with their purposes - these are candidates for modification in brownfield projects]

**Example format**:
- `[path/to/file]` - [Purpose/responsibility]

## Design Patterns
### [Pattern Name]
- **Location**: [Where used]
- **Purpose**: [Why used]
- **Implementation**: [How implemented]

## Critical Dependencies
### [Dependency Name]
- **Version**: [Version number]
- **Usage**: [How and where used]
- **Purpose**: [Why needed]
```

## ステップ5: API ドキュメントの生成

`aidlc-docs/inception/reverse-engineering/api-documentation.md` を作成する：

```markdown
# API Documentation

## REST APIs
### [Endpoint Name]
- **Method**: [GET/POST/PUT/DELETE]
- **Path**: [/api/path]
- **Purpose**: [What it does]
- **Request**: [Request format]
- **Response**: [Response format]

## Internal APIs
### [Interface/Class Name]
- **Methods**: [List with signatures]
- **Parameters**: [Parameter descriptions]
- **Return Types**: [Return type descriptions]

## Data Models
### [Model Name]
- **Fields**: [Field descriptions]
- **Relationships**: [Related models]
- **Validation**: [Validation rules]
```

## ステップ6: コンポーネントインベントリの生成

`aidlc-docs/inception/reverse-engineering/component-inventory.md` を作成する：

```markdown
# Component Inventory

## Application Packages
- [Package name] - [Purpose]

## Infrastructure Packages
- [Package name] - [CDK/Terraform] - [Purpose]

## Shared Packages
- [Package name] - [Models/Utilities/Clients] - [Purpose]

## Test Packages
- [Package name] - [Integration/Load/Unit] - [Purpose]

## Total Count
- **Total Packages**: [Number]
- **Application**: [Number]
- **Infrastructure**: [Number]
- **Shared**: [Number]
- **Test**: [Number]
```

## ステップ7: 技術スタックドキュメントの生成

`aidlc-docs/inception/reverse-engineering/technology-stack.md` を作成する：

```markdown
# Technology Stack

## Programming Languages
- [Language] - [Version] - [Usage]

## Frameworks
- [Framework] - [Version] - [Purpose]

## Infrastructure
- [Service] - [Purpose]

## Build Tools
- [Tool] - [Version] - [Purpose]

## Testing Tools
- [Tool] - [Version] - [Purpose]
```

## ステップ8: 依存関係ドキュメントの生成

`aidlc-docs/inception/reverse-engineering/dependencies.md` を作成する：

```markdown
# Dependencies

## Internal Dependencies
[Mermaid diagram showing package dependencies]

### [Package A] depends on [Package B]
- **Type**: [Compile/Runtime/Test]
- **Reason**: [Why dependency exists]

## External Dependencies
### [Dependency Name]
- **Version**: [Version]
- **Purpose**: [Why used]
- **License**: [License type]
```

## ステップ9: コード品質評価の生成

`aidlc-docs/inception/reverse-engineering/code-quality-assessment.md` を作成する：

```markdown
# Code Quality Assessment

## Test Coverage
- **Overall**: [Percentage or Good/Fair/Poor/None]
- **Unit Tests**: [Status]
- **Integration Tests**: [Status]

## Code Quality Indicators
- **Linting**: [Configured/Not configured]
- **Code Style**: [Consistent/Inconsistent]
- **Documentation**: [Good/Fair/Poor]

## Technical Debt
- [Issue description and location]

## Patterns and Anti-patterns
- **Good Patterns**: [List]
- **Anti-patterns**: [List with locations]
```

## ステップ10: タイムスタンプファイルの作成

`aidlc-docs/inception/reverse-engineering/reverse-engineering-timestamp.md` を作成する：

```markdown
# Reverse Engineering Metadata

**Analysis Date**: [ISO timestamp]
**Analyzer**: AI-DLC
**Workspace**: [Workspace path]
**Total Files Analyzed**: [Number]

## Artifacts Generated
- [x] architecture.md
- [x] code-structure.md
- [x] api-documentation.md
- [x] component-inventory.md
- [x] technology-stack.md
- [x] dependencies.md
- [x] code-quality-assessment.md
```

## ステップ11: 状態追跡の更新

`aidlc-docs/aidlc-state.md` を更新する：

```markdown
## Reverse Engineering Status
- [x] Reverse Engineering - Completed on [timestamp]
- **Artifacts Location**: aidlc-docs/inception/reverse-engineering/
```

## ステップ12: 完了メッセージをユーザーに提示する

```markdown
# 🔍 Reverse Engineering Complete

[AI-generated summary of key findings from analysis in the form of bullet points]

> **📋 <u>**REVIEW REQUIRED:**</u>**  
> Please examine the reverse engineering artifacts at: `aidlc-docs/inception/reverse-engineering/`

> **🚀 <u>**WHAT'S NEXT?**</u>**
>
> **You may:**
>
> 🔧 **Request Changes** - Ask for modifications to the reverse engineering analysis if required
> ✅ **Approve & Continue** - Approve analysis and proceed to **Requirements Analysis**
```

## ステップ13: ユーザーの承認を待つ

- **必須**: ユーザーが明示的に承認するまで進めないこと
- **必須**: audit.md にユーザーの完全な生の入力を記録すること
