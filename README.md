# Stock Viewer (資産管理ビューアー)

保有している株式や投資信託（ETFプロキシ）の数量を入力することで、現在の資産評価額と前日比の増減を一目で確認できるWebアプリケーションです。

## 特徴

*   **簡単なポートフォリオ管理**: 主要な指数や個別株のシンボルを入力するだけで追跡可能。
*   **マルチ通貨対応**: USD/JPYの切り替え表示、および資産ごとの通貨設定が可能。
*   **バックエンドキャッシュ**: サーバー側で株価データをキャッシュ（1時間）し、API利用制限を回避しながら効率的に運用。
*   **プライバシー**: 保有数などの個人データはブラウザ（LocalStorage）にのみ保存され、サーバーには送信されません（※株価取得のためのシンボルのみ送信されます）。

## 推奨動作環境

*   Docker および Docker Compose がインストールされているサーバー
*   Alpha Vantage の API Key（無料）

## セットアップ手順

### 1. リポジトリの取得

```bash
git clone https://github.com/milky1210/stock_viewer.git
cd stock_viewer
```

### 2. 環境変数の設定

Alpha VantageのAPIキーを設定します。

```bash
cp .env.sample .env
vi .env
# VITE_ALPHA_VANTAGE_API_KEY=あなたのAPIキー を入力
```

> APIキーは [Alpha Vantage公式サイト](https://www.alphavantage.co/support/#api-key) から無料で取得できます。

### 3. アプリケーションの起動

Docker Composeを使用して、フロントエンドとバックエンドサーバーを一括で起動します。

```bash
docker compose up -d --build
```

起動後、ブラウザで `http://localhost:8080` （またはサーバーのIPアドレス:8080）にアクセスしてください。

### 4. 停止

```bash
docker compose down
```

## アーキテクチャ

*   **Frontend**: React (Vite), Recharts (グラフ), TypeScript
*   **Backend**: Node.js (Express) - APIプロキシおよびキャッシュ担当
*   **Infrastructure**: Nginx (Webサーバー), Docker Compose

## 注意事項

*   投資信託（eMAXIS Slim等）のデータは、連動する米国ETF（ACWI, VOO等）のデータを代用して表示しています。
*   無料APIプランの制限（1日25回等）を考慮し、サーバー側でデータを1時間キャッシュします。頻繁に新しい銘柄を追加すると制限に達する可能性があります。
