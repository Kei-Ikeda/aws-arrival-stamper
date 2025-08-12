import type { StampStyle } from '@shared/types';
import { cn } from '@shared/utils';
import type React from 'react';

interface PreviewStampProps {
  environment: 'dev' | 'staging' | 'prod';
  region: string;
  flag: string;
  style: StampStyle;
}

const PreviewStamp: React.FC<PreviewStampProps> = ({ environment, region, flag, style }) => {
  const baseClasses = cn(
    'inline-block bg-white/95 border-2 px-3 py-2 m-1',
    'font-mono text-xs font-bold text-center text-gray-800 transform -rotate-1',
    {
      'border-green-500': environment === 'dev',
      'border-amber-500': environment === 'staging',
      'border-red-500': environment === 'prod',
    },
    {
      'border-solid rounded-md': style === 'classic',
      'border-dashed rounded-md sepia': style === 'vintage',
      'border-solid rounded-2xl backdrop-blur-sm': style === 'modern',
      'border-dotted rounded-full': style === 'cute',
    }
  );

  return (
    <div className={baseClasses}>
      <div>🛂</div>
      <div>
        {flag} {region} {environment.toUpperCase()}
      </div>
      <div className="text-[10px] opacity-70">12:34:56</div>
    </div>
  );
};

export default PreviewStamp;
