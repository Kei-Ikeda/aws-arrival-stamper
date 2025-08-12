import type { EnvironmentData, EnvironmentType, RegionCode, RegionData } from './types';

// Default Environment Colors
export const DEFAULT_ENV_COLORS: Record<EnvironmentType, EnvironmentData> = {
  dev: { base: '#22c55e', name: 'DEV' },
  staging: { base: '#f59e0b', name: 'STAGING' },
  prod: { base: '#ef4444', name: 'PROD' },
  sso: { base: '#8b5cf6', name: 'SSO' },
  console: { base: '#3b82f6', name: 'CONSOLE' },
  test: { base: '#06b6d4', name: 'TEST' },
  sandbox: { base: '#84cc16', name: 'SANDBOX' },
};

// Region Data
export const REGION_DATA: Record<RegionCode, RegionData> = {
  'us-east-1': {
    flag: '🇺🇸',
    name: 'Virginia',
    accent: '#3b82f6',
    greeting: 'Welcome to Virginia!',
  },
  'us-west-2': {
    flag: '🇺🇸',
    name: 'Oregon',
    accent: '#f59e0b',
    greeting: 'Welcome to Oregon!',
  },
  'ap-northeast-1': {
    flag: '🇯🇵',
    name: 'Tokyo',
    accent: '#ec4899',
    greeting: 'ようこそ東京へ！',
  },
  'ap-southeast-1': {
    flag: '🇸🇬',
    name: 'Singapore',
    accent: '#10b981',
    greeting: 'Welcome to Singapore!',
  },
  'eu-west-1': {
    flag: '🇮🇪',
    name: 'Ireland',
    accent: '#10b981',
    greeting: 'Welcome to Ireland!',
  },
  'eu-central-1': {
    flag: '🇩🇪',
    name: 'Frankfurt',
    accent: '#6366f1',
    greeting: 'Willkommen in Frankfurt!',
  },
};

// Default Settings
export const DEFAULT_SETTINGS = {
  isEnabled: true,
  regionColors: true,
  stampStyle: 'classic' as const,
  accountColors: {},
};

// Chrome Extension URLs
export const AWS_URLS = {
  CONSOLE: 'console.aws.amazon.com',
  SIGNIN: 'signin.aws.amazon.com',
  SSO: 'awsapps.com',
} as const;

// Trusted selectors for security
export const TRUSTED_SELECTORS = [
  '[data-testid="account-detail"]',
  '[data-testid="awsc-copy-accountid"]',
  '.awsc-username-display-text',
  '[data-testid="account-info"]',
  '[data-testid="account-id"]',
  '#account-id',
  '.account-id-display',
] as const;

export const SECURE_HEADER_SELECTORS = [
  '#b-navbar',
  '[data-testid="header"]',
  'header',
  '.awsui-app-layout-header',
] as const;

// Rate limiting
export const RATE_LIMITS = {
  SAVE_SETTINGS: 1000, // 1 second
  MESSAGE_THROTTLE: 100, // 100ms
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  ACCOUNT_ID: /^\d{12}$/,
  REGION_CODE: /^[a-z]{2}-[a-z]+-\d+$/,
  COLOR_HEX: /^#[0-9A-Fa-f]{6}$/,
} as const;

// Security constants
export const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /vbscript:/i,
  /on\w+=/i,
  /expression\s*\(/i,
  /url\s*\(/i,
  /import\s/i,
] as const;

export const DANGEROUS_CSS_KEYWORDS = [
  'expression',
  'javascript',
  'vbscript',
  'data:',
  'url(',
  'import',
  '@import',
  'behavior',
] as const;
