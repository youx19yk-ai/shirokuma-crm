# CRM App

営業用顧客管理システム

## ファイル構成

```
crm-app/
├── server.js        ← サーバー（APIとDB）
├── package.json     ← Node.js設定
├── render.yaml      ← Render自動設定
└── public/
    └── index.html   ← 画面
```

## Renderへのデプロイ手順

1. このリポジトリをGitHubにアップロード
2. https://render.com にログイン
3. 「New +」→「Blueprint」を選択
4. このリポジトリを選択
5. 自動でWebサーバー＋DBが作成される
6. 発行されたURLにアクセスして完了
