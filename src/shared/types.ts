// Chrome Extension Type Definitions

export interface ChromeStorageSettings {
  isEnabled: boolean;
  regionColors: boolean;
  stampStyle: StampStyle;
  accountColors: Record<string, AccountConfig>;
}

export interface AccountConfig {
  environment: EnvironmentType | null;
  color: string;
  name: string | null;
}

export type EnvironmentType = 'dev' | 'staging' | 'prod' | 'sso' | 'console' | 'test' | 'sandbox';

export type StampStyle = 'classic' | 'vintage' | 'modern' | 'cute';

export type RegionCode =
  | 'us-east-1'
  | 'us-west-2'
  | 'ap-northeast-1'
  | 'ap-southeast-1'
  | 'eu-west-1'
  | 'eu-central-1';

export interface RegionData {
  flag: string;
  name: string;
  accent: string;
  greeting: string;
}

export interface EnvironmentData {
  base: string;
  name: string;
}

export interface AccountInfo {
  id: string;
  name: string;
  displayId?: string;
}

export interface StampData {
  environment: EnvironmentData;
  region: RegionData;
  account: AccountInfo;
  stampText: string;
  greeting: string;
}

export interface CurrentStamp {
  environment: EnvironmentType;
  region: RegionCode;
  accountInfo: AccountInfo;
  stampData: StampData;
}

// Message Types for Chrome Extension API
export interface ChromeMessage {
  type: string;
  [key: string]: unknown;
}

export interface SettingsUpdateMessage extends ChromeMessage {
  type: 'SETTINGS_UPDATED';
  settings: ChromeStorageSettings;
}

export interface BackgroundReadyMessage extends ChromeMessage {
  type: 'BACKGROUND_READY';
  timestamp: number;
}

export interface StampAppliedMessage extends ChromeMessage {
  type: 'STAMP_APPLIED';
  data: {
    environment: EnvironmentType;
    region: RegionCode;
    timestamp: number;
  };
}

export interface GetSettingsMessage extends ChromeMessage {
  type: 'GET_SETTINGS';
}

export interface UpdateSettingsMessage extends ChromeMessage {
  type: 'UPDATE_SETTINGS';
  settings: Partial<ChromeStorageSettings>;
}

export interface GetStatsMessage extends ChromeMessage {
  type: 'GET_STATS';
}

export interface MessageResponse {
  success: boolean;
  settings?: ChromeStorageSettings;
  stats?: UsageStats;
  error?: string;
}

export interface UsageStats {
  totalStamps: number;
  environments: Record<EnvironmentType, number>;
  regions: Record<RegionCode, number>;
  lastUsed: string | null;
}

// React Component Props
export interface StampComponentProps {
  environment: EnvironmentType;
  region: RegionCode;
  accountInfo: AccountInfo;
  style: StampStyle;
  className?: string;
}

export interface ToggleProps {
  isActive: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}

export interface AccountFormData {
  accountId: string;
  environment: EnvironmentType | '';
  color: string;
  name: string;
}
