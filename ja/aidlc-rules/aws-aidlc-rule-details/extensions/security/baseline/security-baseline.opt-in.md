# セキュリティベースライン — オプトイン

**拡張機能**: セキュリティベースライン

## オプトインプロンプト

このエクステンションが読み込まれると、要件分析の確認質問に以下の質問が自動的に追加されます：

```markdown
## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```
