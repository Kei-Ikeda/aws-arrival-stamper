import { SECURE_HEADER_SELECTORS, TRUSTED_SELECTORS } from '@shared/constants';
import type {
  AccountConfig,
  AccountInfo,
  EnvironmentType,
  RegionCode,
  StampData,
  StampStyle,
} from '@shared/types';
import {
  detectEnvironmentFromUrl,
  detectRegionFromUrl,
  extractAccountId,
  generateStampData,
  getSecureClassNames,
  sanitizeColor,
  sanitizeText,
} from '@shared/utils';
import type React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles/content.css';

class AWSArrivalStamper {
  private isEnabled = true;
  private regionColors = true;
  private stampStyle: StampStyle = 'classic';
  private accountColors: Record<string, AccountConfig> = {};
  // private currentStamp: StampData | null = null;
  private stampRoot: HTMLElement | null = null;
  private reactRoot: ReturnType<typeof createRoot> | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadSettings();
    this.detectAWSEnvironment();
    this.observeChanges();
    console.log('🛂 AWS Arrival Stamper initialized!');
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await chrome.storage.sync.get([
        'isEnabled',
        'regionColors',
        'stampStyle',
        'accountColors',
      ]);

      this.isEnabled = settings.isEnabled !== false;
      this.regionColors = settings.regionColors !== false;
      this.stampStyle = settings.stampStyle || 'classic';
      this.accountColors = settings.accountColors || {};
    } catch (error) {
      console.warn('Settings load failed, using defaults');
    }
  }

  private detectAWSEnvironment(): void {
    if (!this.isEnabled) return;

    const url = window.location.href;
    const hostname = window.location.hostname;

    const accountInfo = this.detectAccount();
    const environment = this.detectEnvironment(url, hostname, accountInfo);
    const region = this.detectRegion(url);

    if (environment && region && accountInfo) {
      this.applyArrivalStamp(environment, region, accountInfo);
    }
  }

  private detectEnvironment(
    url: string,
    hostname: string,
    accountInfo: AccountInfo
  ): EnvironmentType | null {
    // Account configuration override
    if (accountInfo?.id && this.accountColors[accountInfo.id]) {
      const accountConfig = this.accountColors[accountInfo.id];
      if (accountConfig.environment) {
        return accountConfig.environment;
      }
    }

    return detectEnvironmentFromUrl(url, hostname);
  }

  private detectRegion(url: string): RegionCode {
    const detectedRegion = detectRegionFromUrl(url);

    // Also try to get region from region selector
    const regionSelector = document.querySelector('[data-testid="region-selector"]');
    if (regionSelector) {
      const regionText = regionSelector.textContent;
      const match = regionText?.match(/([a-z]{2}-[a-z]+-\d+)/);
      if (match) return match[1] as RegionCode;
    }

    return detectedRegion;
  }

  private detectAccount(): AccountInfo {
    // Use trusted selectors for security
    for (const selector of TRUSTED_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) {
        const accountInfo = this.extractAccountFromElement(element);
        if (accountInfo.id !== 'unknown') {
          return accountInfo;
        }
      }
    }

    // Pattern 2: Copy button with account ID
    const copyButton = document.querySelector('[data-testid="awsc-copy-accountid"]');
    if (copyButton) {
      const accountInfo = this.extractAccountFromCopyButton(copyButton);
      if (accountInfo.id !== 'unknown') {
        return accountInfo;
      }
    }

    return { id: 'unknown', name: 'AWS Account' };
  }

  private extractAccountFromElement(element: Element): AccountInfo {
    const text = sanitizeText(element.textContent);
    const accountId = extractAccountId(text);

    if (accountId) {
      return {
        id: accountId,
        name: sanitizeText(text.split('(')[0]?.trim() || 'AWS Account'),
      };
    }
    return { id: 'unknown', name: 'AWS Account' };
  }

  private extractAccountFromCopyButton(copyButton: Element): AccountInfo {
    // Safe parent-child relationship traversal (max 2 levels)
    const possibleContainers = [
      copyButton.parentElement,
      copyButton.parentElement?.parentElement,
    ].filter(Boolean);

    for (const container of possibleContainers) {
      const accountSpan = container?.querySelector('span:last-child');
      if (accountSpan) {
        const accountText = sanitizeText(accountSpan.textContent);
        const accountId = extractAccountId(accountText);

        if (accountId) {
          return {
            id: accountId,
            name: 'AWS Account',
            displayId: accountText.match(/(\d{4}-\d{4}-\d{4})/)?.[1] || accountId,
          };
        }
      }
    }
    return { id: 'unknown', name: 'AWS Account' };
  }

  private applyArrivalStamp(
    environment: EnvironmentType,
    region: RegionCode,
    accountInfo: AccountInfo
  ): void {
    // Remove existing stamp
    this.removeExistingStamp();

    // Generate stamp data
    const accountConfig = this.accountColors[accountInfo.id];
    const stampData = generateStampData(environment, region, accountInfo, accountConfig);

    // Apply header colors
    this.applyHeaderColors(environment, region, accountInfo);

    // Create and insert stamp
    this.insertStamp(stampData);

    // Record usage
    this.recordStampUsage(environment, region);

    // this.currentStamp = stampData;
    console.log(`🛂 Stamped: ${region} ${environment}`);
  }

  private applyHeaderColors(
    environment: EnvironmentType,
    region: RegionCode,
    accountInfo: AccountInfo
  ): void {
    const header = this.findSecureHeader();
    if (!header) return;

    const accountConfig = this.accountColors[accountInfo.id];
    const stampData = generateStampData(environment, region, accountInfo, accountConfig);
    const baseColor = sanitizeColor(stampData.environment.base);
    const accentColor = this.regionColors ? sanitizeColor(stampData.region.accent) : baseColor;

    // Use CSS variables for secure style application
    (header as HTMLElement).style.setProperty('--aws-stamp-base-color', baseColor);
    (header as HTMLElement).style.setProperty('--aws-stamp-accent-color', accentColor);
    (header as HTMLElement).style.setProperty('--aws-stamp-transition', '1s ease-in-out');

    // Add secure classes
    header.classList.add('aws-arrival-header');
    const { envClass, regionClass, accountClass } = getSecureClassNames(
      environment,
      region,
      accountInfo.id
    );

    if (envClass) header.classList.add(envClass);
    if (regionClass) header.classList.add(regionClass);
    if (accountClass) header.classList.add(accountClass);

    // Apply gradient background
    const gradient = `linear-gradient(135deg, ${baseColor}, ${accentColor})`;
    (header as HTMLElement).style.background = `${gradient} !important`;
  }

  private findSecureHeader(): Element | null {
    for (const selector of SECURE_HEADER_SELECTORS) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return document.body;
  }

  private insertStamp(stampData: StampData): void {
    // Create container with style isolation
    this.stampRoot = document.createElement('div');
    this.stampRoot.className = 'aws-extension-root';

    // Create React root and render stamp
    this.reactRoot = createRoot(this.stampRoot);
    this.renderStamp(stampData);

    // Insert into page
    document.body.appendChild(this.stampRoot);
  }

  private renderStamp(stampData: StampData): void {
    if (!this.reactRoot) return;

    const StampDisplay: React.FC = () => {
      const stampClasses = [
        'fixed top-5 right-5 z-[2147483647] pointer-events-none select-none',
        'bg-white/95 border-3 rounded-lg px-4 py-3 font-mono font-bold text-center shadow-lg',
        'animate-stamp -rotate-2',
      ];

      // Add environment-specific colors
      const envColorMap: Record<string, string> = {
        dev: 'border-green-500 text-green-800',
        staging: 'border-amber-500 text-amber-800',
        prod: 'border-red-500 text-red-800',
        sso: 'border-purple-500 text-purple-800',
        console: 'border-blue-500 text-blue-800',
        test: 'border-cyan-500 text-cyan-800',
        sandbox: 'border-lime-500 text-lime-800',
      };

      const envClass =
        envColorMap[stampData.environment.name.toLowerCase()] || 'border-gray-500 text-gray-800';
      stampClasses.push(envClass);

      // Add style-specific classes
      const styleClasses: Record<StampStyle, string> = {
        classic: 'border-solid',
        vintage: 'border-dashed sepia',
        modern: 'rounded-2xl border-2 backdrop-blur-sm',
        cute: 'rounded-[50px] border-4 border-dotted',
      };

      stampClasses.push(styleClasses[this.stampStyle]);

      const timeString = new Date().toLocaleTimeString();

      return (
        <div className={stampClasses.join(' ')}>
          <div className="text-2xl leading-none mb-1">🛂</div>
          <div className="space-y-1">
            <div className="text-sm font-bold leading-tight">{stampData.stampText}</div>
            <div className="text-xs opacity-70">{timeString}</div>
          </div>
          <div className="text-xs mt-2 opacity-80 italic animate-fade-in-up">
            {stampData.greeting}
          </div>
        </div>
      );
    };

    this.reactRoot.render(<StampDisplay />);
  }

  private removeExistingStamp(): void {
    // Remove React stamp
    if (this.stampRoot) {
      if (this.reactRoot) {
        this.reactRoot.unmount();
        this.reactRoot = null;
      }
      this.stampRoot.remove();
      this.stampRoot = null;
    }

    // Remove legacy stamps
    const existingStamps = document.querySelectorAll('.aws-arrival-stamp');
    existingStamps.forEach((stamp) => stamp.remove());

    // Reset header classes
    const headers = document.querySelectorAll('.aws-arrival-header');
    headers.forEach((header) => {
      header.classList.remove('aws-arrival-header');
      (header as HTMLElement).style.background = '';
    });
  }

  private observeChanges(): void {
    // URL change monitoring
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

    // Settings change monitoring
    chrome.storage.onChanged.addListener((changes) => {
      if (
        changes.isEnabled ||
        changes.regionColors ||
        changes.stampStyle ||
        changes.accountColors
      ) {
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

  private async recordStampUsage(environment: EnvironmentType, region: RegionCode): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'STAMP_APPLIED',
        data: {
          environment,
          region,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      // Background script communication failure is acceptable
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AWSArrivalStamper();
  });
} else {
  new AWSArrivalStamper();
}
