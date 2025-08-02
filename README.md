# 🛂 AWS Arrival Stamper

Welcome to your personal AWS arrival experience! ✈️

AWS環境への到着を記念して、美しい色付きスタンプでヘッダーを彩る親切な到着スタンプ係です。

## ✨ 到着体験

- 🟢 **開発環境到着** → 緑の歓迎スタンプでヘッダーを彩色
- 🟡 **ステージング到着** → オレンジの注意スタンプでヘッダーを彩色  
- 🔴 **本番環境到着** → 赤のVIPスタンプでヘッダーを彩色

各AWS環境への到着が、特別な記念になります。

## 🌍 リージョン別カラーリング

環境だけでなく、AWSリージョンごとにもアクセントカラーが変化します：

- 🇺🇸 **米国リージョン** → ブルーアクセント
- 🇯🇵 **アジアパシフィック** → ピンクアクセント  
- 🇪🇺 **ヨーロッパ** → エメラルドアクセント

## 🎨 スタンプスタイル

お好みに合わせて4つのスタンプスタイルから選択できます：

### Classic (シンプル)
```
🛂
🇺🇸 Virginia DEV
12:34:56
```

### Vintage (ヴィンテージ)
古い入国スタンプのような破線ボーダーとセピア調

### Modern (モダン)
角丸でブラー効果の効いた現代的なデザイン

### Cute (可愛い)
ドット線ボーダーでキラキラ光るキュートなスタイル

## 🚀 インストール方法

1. このリポジトリをクローンまたはダウンロード
```bash
git clone https://github.com/your-username/aws-arrival-stamper.git
cd aws-arrival-stamper
```

2. Chrome拡張機能として読み込み
   - Chrome で `chrome://extensions/` を開く
   - 「デベロッパーモード」を有効にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - このフォルダを選択

3. AWS環境にアクセスして到着体験を楽しむ！

## 📁 ファイル構成

```
aws-arrival-stamper/
├── manifest.json          # Chrome拡張機能の設定
├── content.js             # メインスクリプト
├── styles.css             # スタンプスタイル
├── popup.html             # 設定画面HTML
├── popup.js               # 設定画面スクリプト
├── background.js          # バックグラウンドサービス
├── icons/                 # アイコンファイル
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # このファイル
```

## ⚙️ 設定オプション

拡張機能アイコンをクリックして設定パネルを開けます：

- **スタンプ機能のオン/オフ**
- **リージョン別カラーの有効/無効**
- **スタンプスタイルの選択**
- **設定のリセット**

## 🎯 対応サービス

- **AWS Management Console** (`console.aws.amazon.com`)
- **AWS SSO / Identity Center** (`*.awsapps.com`)
- **AWS Sign-in** (`signin.aws.amazon.com`)

## 🔧 開発者向け情報

### 環境検出ロジック

```javascript
// 環境の検出
function detectEnvironment(url, hostname) {
  if (hostname.includes('awsapps.com')) {
    if (url.includes('dev')) return 'dev';
    if (url.includes('staging')) return 'staging';
    if (url.includes('prod')) return 'prod';
    return 'sso';
  }
  return 'console';
}

// リージョンの検出
function detectRegion(url) {
  const regionMatch = url.match(/region=([a-z0-9-]+)/);
  return regionMatch ? regionMatch[1] : 'us-east-1';
}
```

### カスタマイゼーション

新しいリージョンやスタイルを追加したい場合は、`content.js` の以下の部分を編集してください：

```javascript
const regionData = {
  'ap-southeast-2': { 
    flag: '🇦🇺', 
    name: 'Sydney', 
    accent: '#ff6b35', 
    greeting: 'G\'day Sydney!' 
  }
  // 新しいリージョンを追加
};
```

## 🐛 トラブルシューティング

### スタンプが表示されない
1. AWS関連のページにいることを確認
2. 拡張機能が有効になっていることを確認
3. 設定でスタンプ機能が有効になっていることを確認

### 色が変わらない
1. ページを再読み込みしてみる
2. 設定でリージョン別カラーが有効になっていることを確認
3. 他の拡張機能との競合を確認

### 設定が保存されない
1. Chrome の同期が有効になっていることを確認
2. ストレージ権限が付与されていることを確認

## 🤝 コントリビューション

プルリクエストやイシューは大歓迎です！

### 開発の流れ
1. フォークして新しいブランチを作成
2. 変更を加えてテスト
3. プルリクエストを送信

### 追加したい機能のアイデア
- [ ] 音声効果の追加
- [ ] カスタムスタンプデザイン
- [ ] 統計情報の表示
- [ ] 他のクラウドサービス対応

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照

## 🙏 謝辞

- AWS環境での開発体験を向上させるインスピレーション
- 空港の入国スタンプの美しいデザイン
- Chrome拡張機能開発コミュニティ

---

**🛂 素敵なAWS環境の旅をお楽しみください！** ✈️✨

---

## 📞 サポート

質問やフィードバックがあれば、お気軽にイシューを作成してください。

Happy coding! 🚀
