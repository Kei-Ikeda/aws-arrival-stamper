import type { StampComponentProps } from '@shared/types';
import { cn } from '@shared/utils';
import type React from 'react';

const StampComponent: React.FC<StampComponentProps> = ({
  environment,
  // region,
  // accountInfo,
  style,
  className,
}) => {
  const stampClasses = cn(
    // Base styles
    'fixed top-5 right-5 z-[2147483647] pointer-events-none select-none',
    'bg-white/95 border-3 rounded-lg px-4 py-3 font-mono font-bold text-center shadow-lg',
    'animate-stamp -rotate-2',

    // Environment-specific colors
    {
      'border-aws-dev text-green-800': environment === 'dev',
      'border-aws-staging text-amber-800': environment === 'staging',
      'border-aws-prod text-red-800': environment === 'prod',
      'border-aws-sso text-purple-800': environment === 'sso',
      'border-aws-console text-blue-800': environment === 'console',
      'border-cyan-500 text-cyan-800': environment === 'test',
      'border-lime-500 text-lime-800': environment === 'sandbox',
    },

    // Style variants
    {
      'border-solid': style === 'classic',
      'border-dashed sepia': style === 'vintage',
      'rounded-2xl border-2 backdrop-blur-sm': style === 'modern',
      'rounded-[50px] border-4 border-dotted animate-shimmer': style === 'cute',
    },

    className
  );

  const timeString = new Date().toLocaleTimeString();

  return (
    <div className={stampClasses}>
      {/* Stamp Icon */}
      <div className="text-2xl leading-none mb-1">🛂</div>

      {/* Stamp Text */}
      <div className="space-y-1">
        <div className="text-sm font-bold leading-tight">
          {/* This will be populated by the parent component with actual stamp text */}
        </div>
        <div className="text-xs opacity-70">{timeString}</div>
      </div>

      {/* Greeting (appears with delay) */}
      <div className="text-xs mt-2 opacity-80 italic animate-fade-in-up">
        {/* This will be populated by the parent component with greeting */}
      </div>
    </div>
  );
};

export default StampComponent;
