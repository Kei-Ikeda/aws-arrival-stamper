// 🛂 AWS Arrival Stamper - Background Script
class BackgroundService {
  constructor() {
    this.init();
  }

  init() {
    // 拡張機能インストール時の初期化
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // タブ更新時の処理
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Content Scriptからのメッセージ処理
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンス用
    });

    console.log("🛂 AWS Arrival Stamper background service started");
  }

  async handleInstallation(details) {
    if (details.reason === "install") {
      // 初回インストール時のデフォルト設定
      await this.setDefaultSettings();

      // ウェルカムメッセージ
      this.showWelcomeNotification();
    } else if (details.reason === "update") {
      // アップデート時の処理
      await this.handleUpdate(details);
    }
  }

  async setDefaultSettings() {
    const defaultSettings = {
      isEnabled: true,
      regionColors: true,
      stampStyle: "classic",
      installDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    };

    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log("🛂 Default settings initialized");
    } catch (error) {
      console.error("Failed to set default settings:", error);
    }
  }

  showWelcomeNotification() {
    // インストール完了通知（オプション）
    if (chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "🛂 AWS Arrival Stamper",
        message:
          "インストール完了！AWS環境で美しいスタンプをお楽しみください✨",
      });
    }
  }

  async handleUpdate(details) {
    const manifest = chrome.runtime.getManifest();
    console.log(`🛂 Updated to version ${manifest.version}`);

    // 必要に応じて設定の移行処理
    await this.migrateSettings(details.previousVersion, manifest.version);
  }

  async migrateSettings(previousVersion, currentVersion) {
    try {
      const settings = await chrome.storage.sync.get();

      // バージョン固有の移行処理
      if (
        previousVersion &&
        this.compareVersions(previousVersion, "1.0.0") < 0
      ) {
        // v1.0.0未満からの移行
        settings.version = currentVersion;
        await chrome.storage.sync.set(settings);
      }
    } catch (error) {
      console.error("Settings migration failed:", error);
    }
  }

  compareVersions(a, b) {
    const aParts = a.split(".").map(Number);
    const bParts = b.split(".").map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // AWSページの読み込み完了を検知
    if (changeInfo.status === "complete" && tab.url) {
      const isAWSPage = this.isAWSPage(tab.url);

      if (isAWSPage) {
        // アイコンの状態を更新
        this.updateIcon(tabId, true);

        // Content Scriptに初期化メッセージを送信
        this.sendInitMessage(tabId);
      } else {
        // 非AWSページではアイコンをグレーアウト
        this.updateIcon(tabId, false);
      }
    }
  }

  isAWSPage(url) {
    return (
      url.includes("console.aws.amazon.com") ||
      url.includes("awsapps.com") ||
      url.includes("signin.aws.amazon.com")
    );
  }

  updateIcon(tabId, isActive) {
    const iconPath = isActive
      ? {
          16: "icons/icon16.png",
          32: "icons/icon32.png",
          48: "icons/icon48.png",
          128: "icons/icon128.png",
        }
      : {
          16: "icons/icon16-gray.png",
          32: "icons/icon32-gray.png",
          48: "icons/icon48-gray.png",
          128: "icons/icon128-gray.png",
        };

    chrome.action.setIcon({ tabId, path: iconPath }).catch(() => {
      // アイコン設定失敗は無視
    });

    // ツールチップテキストも更新
    const title = isActive
      ? "🛂 AWS Arrival Stamper - Active"
      : "🛂 AWS Arrival Stamper - Inactive";

    chrome.action.setTitle({ tabId, title }).catch(() => {
      // タイトル設定失敗は無視
    });
  }

  async sendInitMessage(tabId) {
    // Content Scriptの準備ができるまで少し待つ
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "BACKGROUND_READY",
          timestamp: Date.now(),
        });
      } catch (error) {
        // Content Scriptがまだ準備できていない場合は無視
      }
    }, 1000);
  }

  async handleMessage(message, sender, sendResponse) {
    // セキュリティ: 送信者検証
    if (!this.isValidSender(sender)) {
      console.warn("Unauthorized message sender:", sender);
      sendResponse({ success: false, error: "Unauthorized sender" });
      return;
    }

    // メッセージ構造の検証
    if (!message || typeof message.type !== 'string') {
      sendResponse({ success: false, error: "Invalid message format" });
      return;
    }

    try {
      switch (message.type) {
        case "GET_SETTINGS":
          const settings = await chrome.storage.sync.get();
          sendResponse({ success: true, settings });
          break;

        case "UPDATE_SETTINGS":
          if (!message.settings || typeof message.settings !== 'object') {
            sendResponse({ success: false, error: "Invalid settings format" });
            break;
          }
          await chrome.storage.sync.set(message.settings);
          sendResponse({ success: true });
          break;

        case "STAMP_APPLIED":
          if (!message.data || typeof message.data !== 'object') {
            sendResponse({ success: false, error: "Invalid data format" });
            break;
          }
          // スタンプ適用の統計情報を記録
          await this.recordStampUsage(message.data);
          sendResponse({ success: true });
          break;

        case "GET_STATS":
          const stats = await this.getUsageStats();
          sendResponse({ success: true, stats });
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("Message handling error:", error);
      sendResponse({ success: false, error: "Internal error" });
    }
  }

  isValidSender(sender) {
    // 拡張機能内部からのメッセージ（popup.js等）
    if (sender.tab === undefined && sender.url) {
      const extensionId = chrome.runtime.id;
      const expectedUrl = `chrome-extension://${extensionId}/`;
      
      if (!sender.url.startsWith(expectedUrl)) {
        console.warn('Invalid extension URL:', sender.url);
        return false;
      }
      
      // 許可されたファイルのみチェック
      const allowedFiles = ['popup.html'];
      return allowedFiles.some(file => sender.url.includes(file));
    }

    // Content scriptからのメッセージ
    if (sender.tab && sender.tab.url) {
      // 厳密なオリジン検証
      const strictOrigins = [
        'https://console.aws.amazon.com',
        'https://signin.aws.amazon.com'
      ];
      
      // サブドメインパターンの厳密な検証
      const validSubdomainPatterns = [
        /^https:\/\/[a-zA-Z0-9-]+\.console\.aws\.amazon\.com(\/.*)?$/,
        /^https:\/\/[a-zA-Z0-9-]+\.awsapps\.com\/start(\/.*)?$/,
        /^https:\/\/[a-zA-Z0-9-]+\.awsapps\.com\/[a-zA-Z0-9-]+\/dashboard(\/.*)?$/
      ];

      const tabUrl = sender.tab.url;
      
      // 完全一致チェック
      if (strictOrigins.some(origin => tabUrl.startsWith(origin))) {
        return true;
      }
      
      // サブドメインパターンチェック
      if (validSubdomainPatterns.some(pattern => pattern.test(tabUrl))) {
        return true;
      }
      
      console.warn('Invalid sender URL:', tabUrl);
      return false;
    }

    console.warn('Unknown sender type:', sender);
    return false;
  }

  async recordStampUsage(data) {
    try {
      const stats = (await chrome.storage.local.get("usage_stats")) || {};
      const currentStats = stats.usage_stats || {
        totalStamps: 0,
        environments: {},
        regions: {},
        lastUsed: null,
      };

      // 統計情報を更新
      currentStats.totalStamps++;
      currentStats.environments[data.environment] =
        (currentStats.environments[data.environment] || 0) + 1;
      currentStats.regions[data.region] =
        (currentStats.regions[data.region] || 0) + 1;
      currentStats.lastUsed = new Date().toISOString();

      await chrome.storage.local.set({ usage_stats: currentStats });
    } catch (error) {
      console.error("Failed to record usage stats:", error);
    }
  }

  async getUsageStats() {
    try {
      const result = await chrome.storage.local.get("usage_stats");
      return (
        result.usage_stats || {
          totalStamps: 0,
          environments: {},
          regions: {},
          lastUsed: null,
        }
      );
    } catch (error) {
      console.error("Failed to get usage stats:", error);
      return null;
    }
  }
}

// バックグラウンドサービスを開始
new BackgroundService();
