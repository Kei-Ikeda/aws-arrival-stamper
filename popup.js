// 🛂 AWS Arrival Stamper - Popup Script
class SettingsManager {
  constructor() {
    this.settings = {
      isEnabled: true,
      regionColors: true,
      stampStyle: "classic",
      accountColors: {},
    };

    this.elements = {
      enableToggle: document.getElementById("enableToggle"),
      regionColorsToggle: document.getElementById("regionColorsToggle"),
      stampStyle: document.getElementById("stampStyle"),
      status: document.getElementById("status"),
      resetBtn: document.getElementById("resetBtn"),
      // アカウント設定関連
      accountId: document.getElementById("accountId"),
      accountEnvironment: document.getElementById("accountEnvironment"),
      accountColor: document.getElementById("accountColor"),
      accountName: document.getElementById("accountName"),
      saveAccountBtn: document.getElementById("saveAccountBtn"),
      deleteAccountBtn: document.getElementById("deleteAccountBtn"),
      accountList: document.getElementById("accountList"),
    };
    
    this.selectedAccountId = null;
    this.lastSaveTime = 0;
    this.saveRateLimit = 1000; // 1秒間に1回の保存制限

    this.init();
  }

  async init() {
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    this.updateStatus();
    this.updateAccountList();
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get([
        "isEnabled",
        "regionColors",
        "stampStyle",
        "accountColors",
      ]);

      this.settings = {
        isEnabled: stored.isEnabled !== false,
        regionColors: stored.regionColors !== false,
        stampStyle: stored.stampStyle || "classic",
        accountColors: stored.accountColors || {},
      };
    } catch (error) {
      console.warn("Failed to load settings:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
      this.updateStatus();

      // Content scriptに設定変更を通知
      this.notifyContentScript();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  async notifyContentScript() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (
        tab &&
        tab.url &&
        (tab.url.includes("console.aws.amazon.com") ||
          tab.url.includes("awsapps.com"))
      ) {
        chrome.tabs
          .sendMessage(tab.id, {
            type: "SETTINGS_UPDATED",
            settings: this.settings,
          })
          .catch(() => {
            // Content script might not be ready, that's ok
          });
      }
    } catch (error) {
      // タブアクセス失敗は無視
    }
  }

  bindEvents() {
    // メイン機能のオン/オフ
    this.elements.enableToggle.addEventListener("click", () => {
      this.settings.isEnabled = !this.settings.isEnabled;
      this.updateToggle(this.elements.enableToggle, this.settings.isEnabled);
      this.saveSettings();
    });

    // リージョンカラーのオン/オフ
    this.elements.regionColorsToggle.addEventListener("click", () => {
      this.settings.regionColors = !this.settings.regionColors;
      this.updateToggle(
        this.elements.regionColorsToggle,
        this.settings.regionColors
      );
      this.saveSettings();
    });

    // スタンプスタイル変更
    this.elements.stampStyle.addEventListener("change", (e) => {
      this.settings.stampStyle = e.target.value;
      this.updatePreviewStyle();
      this.saveSettings();
    });

    // リセットボタン
    this.elements.resetBtn.addEventListener("click", () => {
      this.resetSettings();
    });

    // アカウント設定関連
    this.elements.saveAccountBtn.addEventListener("click", () => {
      this.saveAccountSettings();
    });

    this.elements.deleteAccountBtn.addEventListener("click", () => {
      this.deleteAccountSettings();
    });

    this.elements.accountId.addEventListener("input", () => {
      this.validateAccountForm();
    });

    this.elements.accountId.addEventListener("blur", () => {
      this.loadAccountSettings();
    });
  }

  updateUI() {
    // トグルスイッチの状態を更新
    this.updateToggle(this.elements.enableToggle, this.settings.isEnabled);
    this.updateToggle(
      this.elements.regionColorsToggle,
      this.settings.regionColors
    );

    // スタイル選択の状態を更新
    this.elements.stampStyle.value = this.settings.stampStyle;

    // プレビューを更新
    this.updatePreviewStyle();
  }

  updateToggle(toggleElement, isActive) {
    if (isActive) {
      toggleElement.classList.add("active");
    } else {
      toggleElement.classList.remove("active");
    }
  }

  updatePreviewStyle() {
    const previews = document.querySelectorAll(".preview-stamp");
    const style = this.settings.stampStyle;

    previews.forEach((preview) => {
      // 既存のスタイルクラスを削除
      preview.classList.remove("classic", "vintage", "modern", "cute");
      // 新しいスタイルクラスを追加
      preview.classList.add(style);
      
      // 不要になったインラインスタイルをリセット
      preview.removeAttribute('style');
    });
  }

  updateStatus() {
    const status = this.elements.status;

    if (this.settings.isEnabled) {
      status.textContent = "✅ スタンプサービス有効";
      status.className = "status active";
    } else {
      status.textContent = "❌ スタンプサービス無効";
      status.className = "status inactive";
    }
  }

  async resetSettings() {
    if (confirm("設定をデフォルトに戻しますか？")) {
      this.settings = {
        isEnabled: true,
        regionColors: true,
        stampStyle: "classic",
        accountColors: {},
      };

      await this.saveSettings();
      this.updateUI();
      this.updateAccountList();
      this.clearAccountForm();

      // リセット完了のフィードバック - クラスベース
      const originalText = this.elements.resetBtn.textContent;
      this.elements.resetBtn.textContent = "✅ リセット完了";
      this.elements.resetBtn.classList.add("success");

      setTimeout(() => {
        this.elements.resetBtn.textContent = originalText;
        this.elements.resetBtn.classList.remove("success");
      }, 1500);
    }
  }

  // アカウント設定管理メソッド
  saveAccountSettings() {
    // レート制限チェック
    if (!this.checkRateLimit()) {
      this.showError("設定変更が頻繁すぎます。しばらく待ってから再試行してください");
      return;
    }

    const accountId = this.sanitizeAccountId(this.elements.accountId.value);
    const environment = this.elements.accountEnvironment.value;
    const color = this.elements.accountColor.value;
    const name = this.sanitizeName(this.elements.accountName.value);

    // 強化された入力値検証
    if (!this.isValidAccountId(accountId)) {
      this.showError("有効なAWSアカウントID (12桁の数字) を入力してください");
      return;
    }

    if (!this.isValidEnvironment(environment)) {
      this.showError("無効な環境が選択されています");
      return;
    }

    if (!this.isValidName(name)) {
      this.showError("表示名に無効な文字が含まれているか、50文字を超えています");
      return;
    }

    // 追加セキュリティチェック
    if (name && name.length > 0) {
      const sanitizedName = this.sanitizeName(name);
      if (sanitizedName !== name) {
        this.showError("表示名に使用できない文字が含まれています");
        return;
      }
    }

    const accountConfig = {
      environment: environment || null,
      color: this.sanitizeColor(color),
      name: name || null,
    };

    this.settings.accountColors[accountId] = accountConfig;
    this.saveSettings();
    this.updateAccountList();
    this.showSaveSuccess();
  }

  showError(message) {
    // セキュアなエラー表示 - クラスベース
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
      if (document.body.contains(errorElement)) {
        document.body.removeChild(errorElement);
      }
    }, 3000);
  }

  deleteAccountSettings() {
    if (!this.selectedAccountId) return;
    
    if (confirm(`アカウント ${this.selectedAccountId} の設定を削除しますか？`)) {
      delete this.settings.accountColors[this.selectedAccountId];
      this.saveSettings();
      this.updateAccountList();
      this.clearAccountForm();
    }
  }

  loadAccountSettings() {
    const accountId = this.elements.accountId.value.trim();
    if (!this.isValidAccountId(accountId)) {
      this.clearAccountForm(false);
      return;
    }

    const config = this.settings.accountColors[accountId];
    if (config) {
      this.elements.accountEnvironment.value = config.environment || "";
      this.elements.accountColor.value = config.color || "#3b82f6";
      this.elements.accountName.value = config.name || "";
      this.selectedAccountId = accountId;
      this.elements.deleteAccountBtn.disabled = false;
    } else {
      this.elements.accountEnvironment.value = "";
      this.elements.accountColor.value = "#3b82f6";
      this.elements.accountName.value = "";
      this.selectedAccountId = null;
      this.elements.deleteAccountBtn.disabled = true;
    }
  }

  clearAccountForm(clearId = true) {
    if (clearId) {
      this.elements.accountId.value = "";
    }
    this.elements.accountEnvironment.value = "";
    this.elements.accountColor.value = "#3b82f6";
    this.elements.accountName.value = "";
    this.selectedAccountId = null;
    this.elements.deleteAccountBtn.disabled = true;
  }

  validateAccountForm() {
    const accountId = this.elements.accountId.value.trim();
    this.elements.saveAccountBtn.disabled = !this.isValidAccountId(accountId);
  }

  isValidAccountId(accountId) {
    return /^\d{12}$/.test(accountId);
  }

  updateAccountList() {
    const accountList = this.elements.accountList;
    accountList.innerHTML = "";

    const accounts = Object.keys(this.settings.accountColors);
    if (accounts.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "empty-message";
      emptyMessage.textContent = "設定されたアカウントはありません";
      accountList.appendChild(emptyMessage);
      return;
    }

    accounts.forEach(accountId => {
      const config = this.settings.accountColors[accountId];
      const item = document.createElement("div");
      item.className = "account-list-item";
      
      // セキュアなDOM構築 - クラスベース
      const textContainer = document.createElement("div");
      textContainer.className = "account-info";
      
      const accountSpan = document.createElement("span");
      accountSpan.className = "account-id";
      accountSpan.textContent = this.sanitizeInput(accountId);
      
      const nameSpan = document.createElement("span");
      nameSpan.className = "account-name";
      if (config.name) {
        nameSpan.textContent = ` (${this.sanitizeInput(config.name)})`;
      }
      
      const lineBreak = document.createElement("br");
      
      const envSpan = document.createElement("span");
      envSpan.className = "account-env";
      const envText = config.environment ? config.environment.toUpperCase() : "AUTO";
      envSpan.textContent = this.sanitizeInput(envText);
      
      textContainer.appendChild(accountSpan);
      textContainer.appendChild(nameSpan);
      textContainer.appendChild(lineBreak);
      textContainer.appendChild(envSpan);
      
      const colorBox = document.createElement("div");
      colorBox.className = "account-color-box";
      colorBox.style.backgroundColor = this.sanitizeColor(config.color);
      
      item.appendChild(textContainer);
      item.appendChild(colorBox);
      
      item.addEventListener("click", () => {
        this.elements.accountId.value = accountId;
        this.loadAccountSettings();
      });
      
      accountList.appendChild(item);
    });
  }

  // セキュリティ強化された入力値検証メソッド
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // HTMLエンティティエスケープ
    const entityMap = {
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '&': '&amp;',
      '/': '&#x2F;',
      '\\': '&#x5C;'
    };
    
    return input
      .replace(/[<>"'&\/\\]/g, char => entityMap[char] || char)
      .trim()
      .substring(0, 100);
  }

  sanitizeAccountId(input) {
    if (typeof input !== 'string') return '';
    // アカウントIDは数字のみ許可
    return input.replace(/[^\d]/g, '').substring(0, 12);
  }

  sanitizeName(input) {
    if (typeof input !== 'string') return '';
    
    // より厳格な名前のサニタイゼーション
    const dangerousPatterns = [
      /<script/i, /javascript:/i, /vbscript:/i, /on\w+=/i,
      /expression\s*\(/i, /url\s*\(/i, /import\s/i
    ];
    
    // 危険パターンの検出
    if (dangerousPatterns.some(pattern => pattern.test(input))) {
      console.warn('Potentially dangerous input detected in name field');
      return '';
    }
    
    // 安全な文字のみ許可（英数字、スペース、ハイフン、アンダースコア、日本語）
    return input
      .replace(/[^\w\s\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
      .trim()
      .substring(0, 50);
  }

  sanitizeColor(color) {
    if (typeof color !== 'string') return '#3b82f6';
    
    // 厳密なカラーコード検証
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      console.warn('Invalid color format detected:', color);
      return '#3b82f6';
    }
    
    // CSS注入攻撃を防ぐための追加チェック
    const dangerousKeywords = [
      'expression', 'javascript', 'vbscript', 'data:', 
      'url(', 'import', '@import', 'behavior'
    ];
    
    const lowerColor = color.toLowerCase();
    if (dangerousKeywords.some(keyword => lowerColor.includes(keyword))) {
      console.warn('Potentially dangerous color value detected:', color);
      return '#3b82f6';
    }
    
    return color;
  }

  isValidName(name) {
    if (typeof name !== 'string') return false;
    if (name.length === 0) return true; // 空文字は許可
    if (name.length > 50) return false;
    
    // 危険なパターンの検証
    const dangerousPatterns = [
      /<[^>]*>/,  // HTMLタグ
      /javascript:/i,
      /vbscript:/i,
      /on\w+=/i,
      /expression\s*\(/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(name));
  }

  isValidEnvironment(env) {
    const validEnvs = ['', 'dev', 'staging', 'prod', 'test', 'sandbox'];
    return typeof env === 'string' && validEnvs.includes(env);
  }

  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastSaveTime < this.saveRateLimit) {
      return false;
    }
    this.lastSaveTime = now;
    return true;
  }

  showSaveSuccess() {
    const originalText = this.elements.saveAccountBtn.textContent;
    this.elements.saveAccountBtn.textContent = "✅ 保存完了";
    this.elements.saveAccountBtn.classList.add("success");
    
    setTimeout(() => {
      this.elements.saveAccountBtn.textContent = originalText;
      this.elements.saveAccountBtn.classList.remove("success");
    }, 1500);
  }
}

// ポップアップ読み込み時に初期化
document.addEventListener("DOMContentLoaded", () => {
  new SettingsManager();
});

// 現在のタブ情報を表示（デバッグ用）
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (tab && tab.url) {
    const isAWSPage =
      tab.url.includes("console.aws.amazon.com") ||
      tab.url.includes("awsapps.com");

    if (!isAWSPage) {
      const status = document.getElementById("status");
      status.textContent = "ℹ️ AWSページで有効になります";
      status.className = "status aws-page-info";
    }
  }
});
