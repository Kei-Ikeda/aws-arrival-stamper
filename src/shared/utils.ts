import { type ClassValue, clsx } from 'clsx';
import {
  DANGEROUS_CSS_KEYWORDS,
  DANGEROUS_PATTERNS,
  DEFAULT_ENV_COLORS,
  REGION_DATA,
  VALIDATION_PATTERNS,
} from './constants';
import type { AccountConfig, AccountInfo, EnvironmentType, RegionCode, StampData } from './types';

// Utility for combining class names (like clsx)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Security utilities
export function sanitizeText(text: unknown): string {
  if (typeof text !== 'string') return '';

  const entityMap: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '&': '&amp;',
    '/': '&#x2F;',
    '\\': '&#x5C;',
  };

  return text
    .replace(/[<>"'&/\\]/g, (char) => entityMap[char] || char)
    .trim()
    .substring(0, 200);
}

export function sanitizeAccountId(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\d]/g, '').substring(0, 12);
}

export function sanitizeName(input: unknown): string {
  if (typeof input !== 'string') return '';

  // Check for dangerous patterns
  if (DANGEROUS_PATTERNS.some((pattern) => pattern.test(input))) {
    console.warn('Potentially dangerous input detected in name field');
    return '';
  }

  // Allow only safe characters
  return input
    .replace(/[^\w\s\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
    .trim()
    .substring(0, 50);
}

export function sanitizeColor(color: unknown): string {
  if (typeof color !== 'string') return '#3b82f6';

  if (!VALIDATION_PATTERNS.COLOR_HEX.test(color)) {
    console.warn('Invalid color format detected:', color);
    return '#3b82f6';
  }

  const lowerColor = color.toLowerCase();
  if (DANGEROUS_CSS_KEYWORDS.some((keyword) => lowerColor.includes(keyword))) {
    console.warn('Potentially dangerous color value detected:', color);
    return '#3b82f6';
  }

  return color;
}

// Validation utilities
export function isValidAccountId(accountId: unknown): boolean {
  return typeof accountId === 'string' && VALIDATION_PATTERNS.ACCOUNT_ID.test(accountId);
}

export function isValidEnvironment(env: unknown): env is EnvironmentType {
  const validEnvs: EnvironmentType[] = [
    'dev',
    'staging',
    'prod',
    'sso',
    'console',
    'test',
    'sandbox',
  ];
  return typeof env === 'string' && validEnvs.includes(env as EnvironmentType);
}

export function isValidRegion(region: unknown): region is RegionCode {
  return typeof region === 'string' && VALIDATION_PATTERNS.REGION_CODE.test(region);
}

export function isValidName(name: unknown): boolean {
  if (typeof name !== 'string') return false;
  if (name.length === 0) return true; // Empty string is allowed
  if (name.length > 50) return false;

  return !DANGEROUS_PATTERNS.some((pattern) => pattern.test(name));
}

// AWS detection utilities
export function extractAccountId(text: string): string | null {
  const accountMatch = text.match(/(\d{4}-\d{4}-\d{4}|\d{12})/);
  if (accountMatch) {
    const accountId = accountMatch[1].replace(/-/g, '');
    return VALIDATION_PATTERNS.ACCOUNT_ID.test(accountId) ? accountId : null;
  }
  return null;
}

export function detectRegionFromUrl(url: string): RegionCode {
  const regionMatch = url.match(/region=([a-z0-9-]+)/);
  if (regionMatch && isValidRegion(regionMatch[1])) {
    return regionMatch[1];
  }
  return 'us-east-1'; // Default region
}

export function detectEnvironmentFromUrl(url: string, hostname: string): EnvironmentType | null {
  if (hostname.includes('awsapps.com')) {
    if (url.includes('dev') || url.includes('development')) return 'dev';
    if (url.includes('staging') || url.includes('test')) return 'staging';
    if (url.includes('prod') || url.includes('production')) return 'prod';
    return 'sso';
  }

  if (hostname.includes('console.aws.amazon.com')) {
    return 'console';
  }

  return null;
}

// Stamp data generation
export function generateStampData(
  environment: EnvironmentType,
  region: RegionCode,
  accountInfo: AccountInfo,
  accountConfig?: AccountConfig
): StampData {
  // Account configuration overrides
  let envColor = DEFAULT_ENV_COLORS[environment]?.base;

  if (accountConfig?.environment) {
    envColor =
      accountConfig.color || DEFAULT_ENV_COLORS[accountConfig.environment]?.base || envColor;
  } else if (accountConfig?.color) {
    envColor = accountConfig.color;
  }

  const envData = {
    base: sanitizeColor(envColor) || DEFAULT_ENV_COLORS[environment]?.base || '#3b82f6',
    name: (accountConfig?.environment || environment || 'CONSOLE').toUpperCase(),
  };

  const regData = REGION_DATA[region] || {
    flag: '🌍',
    name: region,
    accent: '#64748b',
    greeting: 'Welcome!',
  };

  return {
    environment: envData,
    region: regData,
    account: accountInfo,
    stampText: `${regData.flag} ${regData.name} ${envData.name}`,
    greeting: accountConfig?.name
      ? `${sanitizeText(accountConfig.name)} - ${regData.greeting}`
      : regData.greeting,
  };
}

// Rate limiting utility
export function createRateLimiter(limitMs: number) {
  let lastTime = 0;

  return (): boolean => {
    const now = Date.now();
    if (now - lastTime < limitMs) {
      return false;
    }
    lastTime = now;
    return true;
  };
}

// Chrome extension utilities
export function isAWSPage(url: string): boolean {
  return (
    url.includes('console.aws.amazon.com') ||
    url.includes('awsapps.com') ||
    url.includes('signin.aws.amazon.com')
  );
}

export function getSecureClassNames(
  environment: EnvironmentType,
  region: RegionCode,
  accountId: string
) {
  const envClass = isValidEnvironment(environment) ? `env-${environment}` : '';
  const regionClass = isValidRegion(region) ? `region-${region.replace(/[^a-z0-9-]/g, '')}` : '';
  const accountClass = isValidAccountId(accountId) ? `account-${accountId.substring(0, 4)}` : '';

  return { envClass, regionClass, accountClass };
}

// Storage utilities
export async function getStorageData<T>(keys: string | string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result as T);
      }
    });
  });
}

export async function setStorageData(data: Record<string, unknown>): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
