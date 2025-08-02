// 🛂 AWS Arrival Stamper - Content Script
class AWSArrivalStamper {
  constructor() {
    this.isEnabled = true;
    this.regionColors = true;
    this.stampStyle = "classic";
    this.currentStamp = null;

    this.init();
  }

  async init() {
    // 設定を読み込み
    await this.loadSettings();

    // AWS環境情報を検出
    this.detectAWSEnvironment();

    // 監視開始
    this.observeChanges();

    console.log("🛂 AWS Arrival Stamper initialized!");
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        "isEnabled",
        "regionColors",
        "stampStyle",
        "accountColors",
      ]);

      this.isEnabled = settings.isEnabled !== false;
      this.regionColors = settings.regionColors !== false;
      this.stampStyle = settings.stampStyle || "classic";
      this.accountColors = settings.accountColors || {};
    } catch (error) {
      console.warn("Settings load failed, using defaults");
    }
  }

  detectAWSEnvironment() {
    if (!this.isEnabled) return;

    // AWS コンソールのURLから情報を抽出
    const url = window.location.href;
    const hostname = window.location.hostname;

    let accountInfo = this.detectAccount();
    let environment = this.detectEnvironment(url, hostname, accountInfo);
    let region = this.detectRegion(url);

    if (environment && region && accountInfo) {
      this.applyArrivalStamp(environment, region, accountInfo);
    }
  }

  detectEnvironment(url, hostname, accountInfo) {
    // アカウント設定による環境の優先判定
    if (accountInfo && accountInfo.id && this.accountColors[accountInfo.id]) {
      const accountConfig = this.accountColors[accountInfo.id];
      if (accountConfig.environment) {
        return accountConfig.environment;
      }
    }

    // Identity Center / SSO Portal の検出
    if (hostname.includes("awsapps.com")) {
      if (url.includes("dev") || url.includes("development")) return "dev";
      if (url.includes("staging") || url.includes("test")) return "staging";
      if (url.includes("prod") || url.includes("production")) return "prod";
      return "sso"; // SSO Portal
    }

    // AWS Console の検出 - アカウント設定がない場合のフォールバック
    if (hostname.includes("console.aws.amazon.com")) {
      // URL やページ要素から環境を推測
      const title = document.title;
      const breadcrumbs =
        document.querySelector('[data-testid="breadcrumbs"]')?.textContent ||
        "";

      if (title.includes("prod") || breadcrumbs.includes("prod")) return "prod";
      if (title.includes("dev") || breadcrumbs.includes("dev")) return "dev";
      if (title.includes("staging") || breadcrumbs.includes("staging"))
        return "staging";

      return "console"; // デフォルトコンソール
    }

    return null;
  }

  detectRegion(url) {
    // URLからリージョンを抽出
    const regionMatch = url.match(/region=([a-z0-9-]+)/);
    if (regionMatch) return regionMatch[1];

    // コンソールのリージョンセレクターから取得
    const regionSelector = document.querySelector(
      '[data-testid="region-selector"]'
    );
    if (regionSelector) {
      const regionText = regionSelector.textContent;
      const match = regionText.match(/([a-z]{2}-[a-z]+-\d+)/);
      if (match) return match[1];
    }

    // デフォルトリージョン
    return "us-east-1";
  }

  detectAccount() {
    // セキュリティ強化: 信頼できるAWS固有セレクターのみを使用
    const trustedSelectors = [
      '[data-testid="account-detail"]',
      '[data-testid="awsc-copy-accountid"]',
      '.awsc-username-display-text',
      '[data-testid="account-info"]',
      '[data-testid="account-id"]',
      '#account-id',
      '.account-id-display'
    ];

    // パターン1: data-testidでの検出（最も信頼性が高い）
    for (const selector of trustedSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const accountInfo = this.extractAccountFromElement(element);
        if (accountInfo.id !== "unknown") {
          return accountInfo;
        }
      }
    }

    // パターン2: コピーボタン付きアカウントID（安全な親子関係のみ）
    const copyButton = document.querySelector('[data-testid="awsc-copy-accountid"]');
    if (copyButton) {
      const accountInfo = this.extractAccountFromCopyButton(copyButton);
      if (accountInfo.id !== "unknown") {
        return accountInfo;
      }
    }

    return { id: "unknown", name: "AWS Account" };
  }

  extractAccountFromElement(element) {
    const text = this.sanitizeText(element.textContent);
    const accountId = this.extractAccountId(text);
    
    if (accountId) {
      return {
        id: accountId,
        name: this.sanitizeText(text.split("(")[0]?.trim() || "AWS Account"),
      };
    }
    return { id: "unknown", name: "AWS Account" };
  }

  extractAccountFromCopyButton(copyButton) {
    // 安全な親子関係のみを辿る（最大2レベルまで）
    const possibleContainers = [
      copyButton.parentElement,
      copyButton.parentElement?.parentElement
    ].filter(Boolean);

    for (const container of possibleContainers) {
      const accountSpan = container.querySelector('span:last-child');
      if (accountSpan) {
        const accountText = this.sanitizeText(accountSpan.textContent);
        const accountId = this.extractAccountId(accountText);
        
        if (accountId) {
          return {
            id: accountId,
            name: "AWS Account",
            displayId: accountText.match(/(\d{4}-\d{4}-\d{4})/)?.[1] || accountId
          };
        }
      }
    }
    return { id: "unknown", name: "AWS Account" };
  }

  extractAccountId(text) {
    // 厳密なアカウントIDパターンマッチング
    const accountMatch = text.match(/(\d{4}-\d{4}-\d{4}|\d{12})/);
    if (accountMatch) {
      const accountId = accountMatch[1].replace(/-/g, '');
      // AWSアカウントIDの有効性チェック（12桁の数字）
      return /^\d{12}$/.test(accountId) ? accountId : null;
    }
    return null;
  }

  sanitizeText(text) {
    if (typeof text !== 'string') return '';
    // XSS攻撃を防ぐため、危険な文字を除去
    return text.replace(/[<>"'&\\]/g, '').trim().substring(0, 200);
  }

  applyArrivalStamp(environment, region, accountInfo) {
    // 既存のスタンプを削除
    this.removeExistingStamp();

    // 新しいスタンプを作成
    const stampData = this.getStampData(environment, region, accountInfo);
    const stampElement = this.createStampElement(stampData, accountInfo);

    // ヘッダーにスタンプを適用
    this.applyHeaderColors(environment, region, accountInfo);
    this.insertStamp(stampElement);

    // アニメーション実行
    this.playArrivalAnimation(stampElement);

    this.currentStamp = { environment, region, accountInfo, stampData };

    // セキュリティのため、アカウントIDをログに出力しない
    console.log(`🛂 Stamped: ${region} ${environment}`);
  }

  getStampData(environment, region, accountInfo) {
    // アカウント別の設定を取得
    const accountConfig = this.accountColors[accountInfo.id] || {};
    
    // デフォルトの環境色
    const defaultEnvColors = {
      dev: { base: "#22c55e", name: "DEV" },
      staging: { base: "#f59e0b", name: "STAGING" },
      prod: { base: "#ef4444", name: "PROD" },
      sso: { base: "#8b5cf6", name: "SSO" },
      console: { base: "#3b82f6", name: "CONSOLE" },
    };

    const regionData = {
      "us-east-1": {
        flag: "🇺🇸",
        name: "Virginia",
        accent: "#3b82f6",
        greeting: "Welcome to Virginia!",
      },
      "us-west-2": {
        flag: "🇺🇸",
        name: "Oregon",
        accent: "#f59e0b",
        greeting: "Welcome to Oregon!",
      },
      "ap-northeast-1": {
        flag: "🇯🇵",
        name: "Tokyo",
        accent: "#ec4899",
        greeting: "ようこそ東京へ！",
      },
      "ap-southeast-1": {
        flag: "🇸🇬",
        name: "Singapore",
        accent: "#10b981",
        greeting: "Welcome to Singapore!",
      },
      "eu-west-1": {
        flag: "🇮🇪",
        name: "Ireland",
        accent: "#10b981",
        greeting: "Welcome to Ireland!",
      },
      "eu-central-1": {
        flag: "🇩🇪",
        name: "Frankfurt",
        accent: "#6366f1",
        greeting: "Willkommen in Frankfurt!",
      },
    };

    // アカウント設定による環境の判定とカラーオーバーライド
    let envName = environment;
    let envColor = defaultEnvColors[environment]?.base;
    
    if (accountConfig.environment) {
      envName = accountConfig.environment;
      envColor = accountConfig.color || defaultEnvColors[accountConfig.environment]?.base || envColor;
    } else if (accountConfig.color) {
      envColor = accountConfig.color;
    }

    const envData = {
      base: envColor || defaultEnvColors[environment]?.base || "#3b82f6",
      name: (accountConfig.environment || environment || "CONSOLE").toUpperCase()
    };

    const regData = regionData[region] || {
      flag: "🌍",
      name: region,
      accent: "#64748b",
      greeting: "Welcome!",
    };

    return {
      environment: envData,
      region: regData,
      account: accountInfo,
      stampText: `${regData.flag} ${regData.name} ${envData.name}`,
      greeting: accountConfig.name ? `${accountConfig.name} - ${regData.greeting}` : regData.greeting,
    };
  }

  createStampElement(stampData, accountInfo) {
    const stamp = document.createElement("div");
    stamp.className = `aws-arrival-stamp ${this.stampStyle}`;
    stamp.setAttribute("data-env", stampData.environment.name.toLowerCase());
    stamp.setAttribute("data-region", stampData.region.name.toLowerCase());

    // XSS脆弱性を防ぐため、innerHTML ではなく createElement と textContent を使用
    const stampIcon = document.createElement("div");
    stampIcon.className = "stamp-icon";
    stampIcon.textContent = "🛂";

    const stampText = document.createElement("div");
    stampText.className = "stamp-text";

    const stampMain = document.createElement("div");
    stampMain.className = "stamp-main";
    stampMain.textContent = stampData.stampText;

    const stampTime = document.createElement("div");
    stampTime.className = "stamp-time";
    stampTime.textContent = new Date().toLocaleTimeString();

    stampText.appendChild(stampMain);
    stampText.appendChild(stampTime);

    const stampGreeting = document.createElement("div");
    stampGreeting.className = "stamp-greeting";
    stampGreeting.textContent = stampData.greeting;

    stamp.appendChild(stampIcon);
    stamp.appendChild(stampText);
    stamp.appendChild(stampGreeting);

    return stamp;
  }

  applyHeaderColors(environment, region, accountInfo) {
    const header = this.findSecureHeader();
    if (!header) return;

    const stampData = this.getStampData(environment, region, accountInfo);
    const baseColor = this.sanitizeColorValue(stampData.environment.base);
    const accentColor = this.regionColors ? 
      this.sanitizeColorValue(stampData.region.accent) : baseColor;

    // セキュリティ強化: CSS変数を使用してCSS注入を防ぐ
    header.style.setProperty('--aws-stamp-base-color', baseColor);
    header.style.setProperty('--aws-stamp-accent-color', accentColor);
    header.style.setProperty('--aws-stamp-transition', '1s ease-in-out');
    
    // セキュアなクラス追加（サニタイズ済み）
    header.classList.add('aws-arrival-header');
    this.addSecureEnvironmentClass(header, environment);
    this.addSecureRegionClass(header, region);
    this.addSecureAccountClass(header, accountInfo.id);
  }

  findSecureHeader() {
    // セキュリティ: 信頼できるヘッダー要素のみを対象
    const secureSelectors = [
      "#b-navbar",
      '[data-testid="header"]',
      "header",
      ".awsui-app-layout-header"
    ];

    for (const selector of secureSelectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    // 最後の手段として body を使用
    return document.body;
  }

  sanitizeColorValue(color) {
    if (typeof color !== 'string') return '#3b82f6';
    
    // 厳密なカラーコード検証
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(color)) {
      console.warn('Invalid color value detected, using default:', color);
      return '#3b82f6';
    }
    
    // 追加セキュリティ: CSSキーワードの除外
    const dangerousKeywords = ['expression', 'javascript', 'vbscript', 'data:', 'url('];
    const lowerColor = color.toLowerCase();
    
    if (dangerousKeywords.some(keyword => lowerColor.includes(keyword))) {
      console.warn('Potentially dangerous color value detected, using default:', color);
      return '#3b82f6';
    }
    
    return color;
  }

  addSecureEnvironmentClass(element, environment) {
    const validEnvs = ['dev', 'staging', 'prod', 'sso', 'console', 'test', 'sandbox'];
    if (typeof environment === 'string' && validEnvs.includes(environment)) {
      element.classList.add(`env-${environment}`);
    }
  }

  addSecureRegionClass(element, region) {
    // リージョンコードの厳密な検証
    const regionRegex = /^[a-z]{2}-[a-z]+-\d+$/;
    if (typeof region === 'string' && regionRegex.test(region)) {
      // CSS クラス名として安全な形式に変換
      const safeRegion = region.replace(/[^a-z0-9-]/g, '');
      element.classList.add(`region-${safeRegion}`);
    }
  }

  addSecureAccountClass(element, accountId) {
    // アカウントIDの厳密な検証
    if (typeof accountId === 'string' && /^\d{12}$/.test(accountId)) {
      // セキュリティ: アカウントIDの一部のみをクラス名に使用
      const accountHash = accountId.substring(0, 4);
      element.classList.add(`account-${accountHash}`);
    }
  }

  insertStamp(stampElement) {
    // 適切な場所にスタンプを挿入
    const targetContainer =
      document.querySelector("#b-navbar") ||
      document.querySelector('[data-testid="header"]') ||
      document.querySelector("header") ||
      document.body;

    if (targetContainer) {
      targetContainer.appendChild(stampElement);
    }
  }

  playArrivalAnimation(stampElement) {
    // 到着アニメーション
    stampElement.style.animation = "arrivalStamp 2s ease-out";

    // 効果音（オプション）
    this.playArrivalSound();
  }

  playArrivalSound() {
    // 小さな到着音（オプション）
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBjiN0fPReS0GJHjH8N2QQAoUXrTp66hVFApGnt..."
      );
      audio.volume = 0.1;
      audio.play().catch(() => {}); // エラーは無視
    } catch (error) {
      // 音声再生失敗は無視
    }
  }

  removeExistingStamp() {
    const existingStamps = document.querySelectorAll(".aws-arrival-stamp");
    existingStamps.forEach((stamp) => stamp.remove());

    // ヘッダーのクラスをリセット
    const headers = document.querySelectorAll(".aws-arrival-header");
    headers.forEach((header) => {
      header.classList.remove("aws-arrival-header");
      header.style.background = "";
    });
  }

  observeChanges() {
    // URL変更を監視
    let currentUrl = window.location.href;

    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        setTimeout(() => this.detectAWSEnvironment(), 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // 設定変更を監視
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isEnabled || changes.regionColors || changes.stampStyle || changes.accountColors) {
        this.loadSettings().then(() => {
          if (this.isEnabled) {
            this.detectAWSEnvironment();
          } else {
            this.removeExistingStamp();
          }
        });
      }
    });
  }
}

// ページ読み込み完了後に初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new AWSArrivalStamper();
  });
} else {
  new AWSArrivalStamper();
}
