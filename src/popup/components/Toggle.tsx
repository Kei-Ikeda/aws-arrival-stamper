import type { ToggleProps } from '@shared/types';
import { cn } from '@shared/utils';
import type React from 'react';

const Toggle: React.FC<ToggleProps> = ({ isActive, onToggle, label, disabled = false }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm flex-1 text-white">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-white/20',
          {
            'bg-green-500': isActive && !disabled,
            'bg-white/30': !isActive && !disabled,
            'bg-gray-400 cursor-not-allowed': disabled,
          }
        )}
        aria-label={label}
        role="switch"
        aria-checked={isActive}
      >
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300',
            {
              'translate-x-5': isActive,
              'translate-x-0': !isActive,
            }
          )}
        />
      </button>
    </div>
  );
};

export default Toggle;
