import { DEFAULT_SETTINGS, RATE_LIMITS } from '@shared/constants';
import type { AccountConfig, ChromeStorageSettings, StampStyle } from '@shared/types';
import { createRateLimiter, isAWSPage } from '@shared/utils';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import AccountManager from './components/AccountManager';
import PreviewStamp from './components/PreviewStamp';
import Toggle from './components/Toggle';
import '../styles/globals.css';

const PopupApp: React.FC = () => {
  const [settings, setSettings] = useState<ChromeStorageSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  const saveRateLimiter = createRateLimiter(RATE_LIMITS.SAVE_SETTINGS);

  const loadSettings = useCallback(async () => {
    try {
      const stored = await chrome.storage.sync.get([
        'isEnabled',
        'regionColors',
        'stampStyle',
        'accountColors',
      ]);

      setSettings({
        isEnabled: stored.isEnabled !== false,
        regionColors: stored.regionColors !== false,
        stampStyle: stored.stampStyle || 'classic',
        accountColors: stored.accountColors || {},
      });
    } catch (error) {
      console.warn('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getCurrentTab = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentTab(tab);
    } catch (error) {
      console.warn('Failed to get current tab:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    getCurrentTab();
  }, [loadSettings, getCurrentTab]);

  const saveSettings = async (newSettings: Partial<ChromeStorageSettings>) => {
    if (!saveRateLimiter()) {
      showError('設定変更が頻繁すぎます。しばらく待ってから再試行してください');
      return;
    }

    try {
      const updatedSettings = { ...settings, ...newSettings };
      await chrome.storage.sync.set(updatedSettings);
      setSettings(updatedSettings);

      // Notify content script
      notifyContentScript(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      showError('設定の保存に失敗しました');
    }
  };

  const notifyContentScript = async (newSettings: ChromeStorageSettings) => {
    if (!currentTab?.id || !currentTab.url) return;

    if (isAWSPage(currentTab.url)) {
      try {
        await chrome.tabs.sendMessage(currentTab.id, {
          type: 'SETTINGS_UPDATED',
          settings: newSettings,
        });
      } catch (_error) {
        // Content script might not be ready
      }
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 1500);
  };

  const handleToggleEnabled = () => {
    saveSettings({ isEnabled: !settings.isEnabled });
  };

  const handleToggleRegionColors = () => {
    saveSettings({ regionColors: !settings.regionColors });
  };

  const handleStyleChange = (style: StampStyle) => {
    saveSettings({ stampStyle: style });
  };

  const handleAccountSave = (accountId: string, config: AccountConfig) => {
    const newAccountColors = { ...settings.accountColors, [accountId]: config };
    saveSettings({ accountColors: newAccountColors });
    showSuccess('アカウント設定を保存しました');
  };

  const handleAccountDelete = (accountId: string) => {
    const newAccountColors = { ...settings.accountColors };
    delete newAccountColors[accountId];
    saveSettings({ accountColors: newAccountColors });
    showSuccess('アカウント設定を削除しました');
  };

  const handleResetSettings = async () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      try {
        await chrome.storage.sync.clear();
        setSettings(DEFAULT_SETTINGS);
        showSuccess('設定をリセットしました');
      } catch (_error) {
        showError('設定のリセットに失敗しました');
      }
    }
  };

  const isAWSTabActive = currentTab?.url ? isAWSPage(currentTab.url) : false;

  if (isLoading) {
    return (
      <div className="w-80 h-96 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2" />
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 min-h-96 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      {/* Error/Success Messages */}
      {errorMessage && (
        <div className="fixed top-2 left-2 right-2 z-50 bg-red-500/90 text-white p-3 rounded-md text-sm text-center">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="fixed top-2 left-2 right-2 z-50 bg-green-500/90 text-white p-3 rounded-md text-sm text-center">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="text-center p-4 border-b border-white/20">
        <h1 className="text-lg font-bold">🛂 AWS Arrival Stamper</h1>
        <p className="text-xs text-white/80 mt-1">AWS環境到着記念スタンプサービス</p>
      </div>

      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Basic Settings */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
          <h3 className="text-sm font-semibold mb-3">⚙️ 基本設定</h3>
          <div className="space-y-3">
            <Toggle
              isActive={settings.isEnabled}
              onToggle={handleToggleEnabled}
              label="スタンプ機能を有効にする"
            />
            <Toggle
              isActive={settings.regionColors}
              onToggle={handleToggleRegionColors}
              label="リージョン別カラーを有効にする"
            />
          </div>
        </div>

        {/* Stamp Style */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
          <h3 className="text-sm font-semibold mb-3">🎨 スタンプスタイル</h3>
          <div className="mb-2">
            <label htmlFor="stampStyle" className="block text-xs text-white/90 mb-1">
              スタイル
            </label>
            <select
              id="stampStyle"
              value={settings.stampStyle}
              onChange={(e) => handleStyleChange(e.target.value as StampStyle)}
              className="w-full bg-white/90 border-none rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-300"
            >
              <option value="classic">Classic (シンプル)</option>
              <option value="vintage">Vintage (ヴィンテージ)</option>
              <option value="modern">Modern (モダン)</option>
              <option value="cute">Cute (可愛い)</option>
            </select>
          </div>
        </div>

        {/* Account Management */}
        <AccountManager
          accountColors={settings.accountColors}
          onSave={handleAccountSave}
          onDelete={handleAccountDelete}
          onError={showError}
        />

        {/* Preview */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
          <h3 className="text-sm font-semibold mb-3">👀 プレビュー</h3>
          <p className="text-xs text-white/80 mb-3">スタンプの表示例：</p>
          <div className="bg-black/20 rounded-md p-3 text-center">
            <PreviewStamp
              environment="dev"
              region="Virginia"
              flag="🇺🇸"
              style={settings.stampStyle}
            />
            <PreviewStamp
              environment="staging"
              region="Tokyo"
              flag="🇯🇵"
              style={settings.stampStyle}
            />
            <PreviewStamp
              environment="prod"
              region="Ireland"
              flag="🇪🇺"
              style={settings.stampStyle}
            />
          </div>
        </div>

        {/* Status */}
        <div
          className={`rounded-lg p-3 text-center text-sm ${
            isAWSTabActive && settings.isEnabled
              ? 'bg-green-500/20 border border-green-400/30'
              : !isAWSTabActive
                ? 'bg-blue-500/20 border border-blue-400/30'
                : 'bg-red-500/20 border border-red-400/30'
          }`}
        >
          {isAWSTabActive && settings.isEnabled
            ? '✅ スタンプサービス有効'
            : !isAWSTabActive
              ? 'ℹ️ AWSページで有効になります'
              : '❌ スタンプサービス無効'}
        </div>

        {/* Other Settings */}
        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
          <h3 className="text-sm font-semibold mb-3">🔧 その他</h3>
          <button
            type="button"
            onClick={handleResetSettings}
            className="w-full bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            設定をリセット
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-white/70 py-2">
          <p>version 2.0.0 | AWS環境を彩る旅のお供</p>
        </div>
      </div>
    </div>
  );
};

// Initialize React App
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
