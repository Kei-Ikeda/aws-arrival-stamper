import type { AccountConfig, AccountFormData, EnvironmentType } from '@shared/types';
import { isValidAccountId, sanitizeAccountId, sanitizeColor, sanitizeName } from '@shared/utils';
import { cn } from '@shared/utils';
import type React from 'react';
import { useEffect, useState } from 'react';

interface AccountManagerProps {
  accountColors: Record<string, AccountConfig>;
  onSave: (accountId: string, config: AccountConfig) => void;
  onDelete: (accountId: string) => void;
  onError: (message: string) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  accountColors,
  onSave,
  onDelete,
  onError,
}) => {
  const [formData, setFormData] = useState<AccountFormData>({
    accountId: '',
    environment: '',
    color: '#3b82f6',
    name: '',
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedAccountId && accountColors[selectedAccountId]) {
      const config = accountColors[selectedAccountId];
      setFormData({
        accountId: selectedAccountId,
        environment: config.environment || '',
        color: config.color || '#3b82f6',
        name: config.name || '',
      });
    }
  }, [selectedAccountId, accountColors]);

  const handleAccountIdChange = (accountId: string) => {
    const sanitized = sanitizeAccountId(accountId);
    setFormData((prev) => ({ ...prev, accountId: sanitized }));

    if (isValidAccountId(sanitized) && accountColors[sanitized]) {
      setSelectedAccountId(sanitized);
    } else {
      setSelectedAccountId(null);
      setFormData((prev) => ({
        ...prev,
        environment: '',
        color: '#3b82f6',
        name: '',
      }));
    }
  };

  const handleSave = () => {
    setIsLoading(true);

    const sanitizedAccountId = sanitizeAccountId(formData.accountId);
    const sanitizedName = sanitizeName(formData.name);
    const sanitizedColor = sanitizeColor(formData.color);

    if (!isValidAccountId(sanitizedAccountId)) {
      onError('有効なAWSアカウントID (12桁の数字) を入力してください');
      setIsLoading(false);
      return;
    }

    if (formData.name && sanitizedName !== formData.name) {
      onError('表示名に使用できない文字が含まれています');
      setIsLoading(false);
      return;
    }

    const config: AccountConfig = {
      environment: (formData.environment as EnvironmentType | null) || null,
      color: sanitizedColor,
      name: sanitizedName || null,
    };

    onSave(sanitizedAccountId, config);
    setIsLoading(false);
  };

  const handleDelete = () => {
    if (!selectedAccountId) return;

    if (confirm(`アカウント ${selectedAccountId} の設定を削除しますか？`)) {
      onDelete(selectedAccountId);
      clearForm();
    }
  };

  const clearForm = () => {
    setFormData({
      accountId: '',
      environment: '',
      color: '#3b82f6',
      name: '',
    });
    setSelectedAccountId(null);
  };

  const accounts = Object.keys(accountColors);

  return (
    <div className="bg-white/10 rounded-lg p-4 backdrop-blur-lg">
      <h3 className="text-sm font-semibold mb-3 text-white">🏢 アカウント設定</h3>
      <p className="text-xs mb-3 text-white/80">アカウントIDごとに環境とカラーを指定できます</p>

      {/* Account ID Input */}
      <div className="mb-3">
        <label htmlFor="accountId" className="block text-xs text-white/90 mb-1">
          アカウントID
        </label>
        <input
          id="accountId"
          type="text"
          value={formData.accountId}
          onChange={(e) => handleAccountIdChange(e.target.value)}
          placeholder="123456789012"
          maxLength={12}
          className="w-full bg-white/90 border-none rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Environment Select */}
      <div className="mb-3">
        <label htmlFor="accountEnvironment" className="block text-xs text-white/90 mb-1">
          環境名
        </label>
        <select
          id="accountEnvironment"
          value={formData.environment}
          onChange={(e) => setFormData((prev) => ({ ...prev, environment: e.target.value as EnvironmentType | '' }))}
          className="w-full bg-white/90 border-none rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-300"
        >
          <option value="">自動判定</option>
          <option value="dev">Development</option>
          <option value="staging">Staging</option>
          <option value="prod">Production</option>
          <option value="test">Test</option>
          <option value="sandbox">Sandbox</option>
        </select>
      </div>

      {/* Color Input */}
      <div className="mb-3">
        <label htmlFor="accountColor" className="block text-xs text-white/90 mb-1">
          カラー
        </label>
        <input
          id="accountColor"
          type="color"
          value={formData.color}
          onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
          className="w-10 h-8 border-none rounded-md cursor-pointer bg-none"
        />
      </div>

      {/* Name Input */}
      <div className="mb-4">
        <label htmlFor="accountName" className="block text-xs text-white/90 mb-1">
          表示名
        </label>
        <input
          id="accountName"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="本番環境"
          maxLength={50}
          className="w-full bg-white/90 border-none rounded-md px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValidAccountId(formData.accountId) || isLoading}
          className={cn('flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors', {
            'bg-green-500/80 text-white hover:bg-green-500':
              isValidAccountId(formData.accountId) && !isLoading,
            'bg-gray-400/50 text-gray-300 cursor-not-allowed':
              !isValidAccountId(formData.accountId) || isLoading,
          })}
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!selectedAccountId}
          className={cn('flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors', {
            'bg-red-500/80 text-white hover:bg-red-500': selectedAccountId,
            'bg-gray-400/50 text-gray-300 cursor-not-allowed': !selectedAccountId,
          })}
        >
          削除
        </button>
      </div>

      {/* Account List */}
      <div className="max-h-32 overflow-y-auto">
        {accounts.length === 0 ? (
          <p className="text-xs text-white/70 text-center py-2">設定されたアカウントはありません</p>
        ) : (
          accounts.map((accountId) => {
            const config = accountColors[accountId];
            return (
              <button
                key={accountId}
                type="button"
                onClick={() => setSelectedAccountId(accountId)}
                className={cn(
                  'bg-white/10 rounded p-2 mb-1 text-xs cursor-pointer transition-colors w-full text-left',
                  'hover:bg-white/15 flex justify-between items-center focus:ring-2 focus:ring-white/50',
                  {
                    'ring-2 ring-white/30': selectedAccountId === accountId,
                  }
                )}
              >
                <div className="flex-1 text-white">
                  <div className="font-bold">{accountId}</div>
                  {config.name && <div className="text-white/80"> ({config.name})</div>}
                  <div className="text-white/70 text-[10px]">
                    {config.environment ? config.environment.toUpperCase() : 'AUTO'}
                  </div>
                </div>
                <div
                  className="w-4 h-4 rounded border border-white/30"
                  style={{ backgroundColor: config.color }}
                />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AccountManager;
