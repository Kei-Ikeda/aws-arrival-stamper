import { AWS_URLS, DEFAULT_SETTINGS, RATE_LIMITS } from '@shared/constants';
import type {
  ChromeMessage,
  ChromeStorageSettings,
  EnvironmentType,
  MessageResponse,
  RegionCode,
  UsageStats,
} from '@shared/types';
import { isAWSPage } from '@shared/utils';

class BackgroundService {
  private rateLimiter: Map<string, number> = new Map();

  constructor() {
    this.init();
  }

  private init(): void {
    // Extension installation handler
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Tab update handler
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Message handler
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    console.log('🛂 AWS Arrival Stamper background service started');
  }

  private async handleInstallation(details: chrome.runtime.InstalledDetails): Promise<void> {
    if (details.reason === 'install') {
      await this.setDefaultSettings();
      this.showWelcomeNotification();
    } else if (details.reason === 'update') {
      await this.handleUpdate(details);
    }
  }

  private async setDefaultSettings(): Promise<void> {
    const defaultSettings: ChromeStorageSettings & { installDate: string; version: string } = {
      ...DEFAULT_SETTINGS,
      installDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    };

    try {
      await chrome.storage.sync.set(defaultSettings);
      console.log('🛂 Default settings initialized');
    } catch (error) {
      console.error('Failed to set default settings:', error);
    }
  }

  private showWelcomeNotification(): void {
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: '🛂 AWS Arrival Stamper',
        message: 'インストール完了！AWS環境で美しいスタンプをお楽しみください✨',
      });
    }
  }

  private async handleUpdate(details: chrome.runtime.InstalledDetails): Promise<void> {
    const manifest = chrome.runtime.getManifest();
    console.log(`🛂 Updated to version ${manifest.version}`);

    if (details.previousVersion) {
      await this.migrateSettings(details.previousVersion, manifest.version);
    }
  }

  private async migrateSettings(previousVersion: string, currentVersion: string): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get();

      // Version-specific migration logic
      if (this.compareVersions(previousVersion, '1.0.0') < 0) {
        // Migration from v1.0.0 and below
        settings.version = currentVersion;
        await chrome.storage.sync.set(settings);
      }
    } catch (error) {
      console.error('Settings migration failed:', error);
    }
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  private handleTabUpdate(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      const isAWSPageUrl = isAWSPage(tab.url);

      if (isAWSPageUrl) {
        this.updateIcon(tabId, true);
        this.sendInitMessage(tabId);
      } else {
        this.updateIcon(tabId, false);
      }
    }
  }

  private updateIcon(tabId: number, isActive: boolean): void {
    const iconPath = isActive
      ? {
          16: 'icons/icon16.png',
          32: 'icons/icon32.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png',
        }
      : {
          16: 'icons/icon16-gray.png',
          32: 'icons/icon32-gray.png',
          48: 'icons/icon48-gray.png',
          128: 'icons/icon128-gray.png',
        };

    chrome.action.setIcon({ tabId, path: iconPath }).catch(() => {
      // Icon setting failure is acceptable
    });

    const title = isActive
      ? '🛂 AWS Arrival Stamper - Active'
      : '🛂 AWS Arrival Stamper - Inactive';

    chrome.action.setTitle({ tabId, title }).catch(() => {
      // Title setting failure is acceptable
    });
  }

  private async sendInitMessage(tabId: number): Promise<void> {
    // Wait for content script to be ready
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'BACKGROUND_READY',
          timestamp: Date.now(),
        });
      } catch (error) {
        // Content script might not be ready yet
      }
    }, 1000);
  }

  private async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageResponse) => void
  ): Promise<void> {
    // Security: Validate sender
    if (!this.isValidSender(sender)) {
      console.warn('Unauthorized message sender:', sender);
      sendResponse({ success: false, error: 'Unauthorized sender' });
      return;
    }

    // Validate message structure
    if (!message || typeof message.type !== 'string') {
      sendResponse({ success: false, error: 'Invalid message format' });
      return;
    }

    // Rate limiting
    if (!this.checkRateLimit(sender)) {
      sendResponse({ success: false, error: 'Rate limit exceeded' });
      return;
    }

    try {
      switch (message.type) {
        case 'GET_SETTINGS': {
          const settings = await chrome.storage.sync.get();
          sendResponse({ success: true, settings: settings as ChromeStorageSettings });
          break;
        }

        case 'UPDATE_SETTINGS': {
          const updateMessage = message as ChromeMessage & { settings: Partial<ChromeStorageSettings> };
          if (!updateMessage.settings || typeof updateMessage.settings !== 'object') {
            sendResponse({ success: false, error: 'Invalid settings format' });
            break;
          }
          await chrome.storage.sync.set(updateMessage.settings);
          sendResponse({ success: true });
          break;
        }

        case 'STAMP_APPLIED': {
          const stampMessage = message as ChromeMessage & {
            data: { environment: EnvironmentType; region: RegionCode; timestamp: number };
          };
          if (!stampMessage.data || typeof stampMessage.data !== 'object') {
            sendResponse({ success: false, error: 'Invalid data format' });
            break;
          }
          await this.recordStampUsage(stampMessage.data);
          sendResponse({ success: true });
          break;
        }

        case 'GET_STATS': {
          const stats = await this.getUsageStats();
          sendResponse({ success: true, stats: stats || undefined });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      sendResponse({ success: false, error: 'Internal error' });
    }
  }

  private isValidSender(sender: chrome.runtime.MessageSender): boolean {
    // Extension internal messages (popup.js etc.)
    if (sender.tab === undefined && sender.url) {
      const extensionId = chrome.runtime.id;
      const expectedUrl = `chrome-extension://${extensionId}/`;

      if (!sender.url.startsWith(expectedUrl)) {
        console.warn('Invalid extension URL:', sender.url);
        return false;
      }

      // Check allowed files
      const allowedFiles = ['popup.html'];
      return allowedFiles.some((file) => sender.url?.includes(file));
    }

    // Content script messages
    if (sender.tab?.url) {
      const strictOrigins = [`https://${AWS_URLS.CONSOLE}`, `https://${AWS_URLS.SIGNIN}`];

      const validSubdomainPatterns = [
        /^https:\/\/[a-zA-Z0-9-]+\.console\.aws\.amazon\.com(\/.*)?$/,
        /^https:\/\/[a-zA-Z0-9-]+\.awsapps\.com\/start(\/.*)?$/,
        /^https:\/\/[a-zA-Z0-9-]+\.awsapps\.com\/[a-zA-Z0-9-]+\/dashboard(\/.*)?$/,
      ];

      const tabUrl = sender.tab.url;

      // Exact match check
      if (strictOrigins.some((origin) => tabUrl.startsWith(origin))) {
        return true;
      }

      // Subdomain pattern check
      if (validSubdomainPatterns.some((pattern) => pattern.test(tabUrl))) {
        return true;
      }

      console.warn('Invalid sender URL:', tabUrl);
      return false;
    }

    console.warn('Unknown sender type:', sender);
    return false;
  }

  private checkRateLimit(sender: chrome.runtime.MessageSender): boolean {
    const key = sender.tab?.id?.toString() || sender.url || 'unknown';
    const now = Date.now();
    const lastTime = this.rateLimiter.get(key) || 0;

    if (now - lastTime < RATE_LIMITS.MESSAGE_THROTTLE) {
      return false;
    }

    this.rateLimiter.set(key, now);
    return true;
  }

  private async recordStampUsage(data: {
    environment: EnvironmentType;
    region: RegionCode;
    timestamp: number;
  }): Promise<void> {
    try {
      const result = await chrome.storage.local.get('usage_stats');
      const currentStats: UsageStats = result.usage_stats || {
        totalStamps: 0,
        environments: {} as Record<EnvironmentType, number>,
        regions: {} as Record<RegionCode, number>,
        lastUsed: null,
      };

      // Update statistics
      currentStats.totalStamps++;
      currentStats.environments[data.environment] =
        (currentStats.environments[data.environment] || 0) + 1;
      currentStats.regions[data.region] = (currentStats.regions[data.region] || 0) + 1;
      currentStats.lastUsed = new Date().toISOString();

      await chrome.storage.local.set({ usage_stats: currentStats });
    } catch (error) {
      console.error('Failed to record usage stats:', error);
    }
  }

  private async getUsageStats(): Promise<UsageStats | null> {
    try {
      const result = await chrome.storage.local.get('usage_stats');
      return (
        result.usage_stats || {
          totalStamps: 0,
          environments: {},
          regions: {},
          lastUsed: null,
        }
      );
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return null;
    }
  }
}

// Start background service
new BackgroundService();
