/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/popup/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // AWS環境色の定義
        aws: {
          dev: '#22c55e',
          staging: '#f59e0b', 
          prod: '#ef4444',
          sso: '#8b5cf6',
          console: '#3b82f6',
        },
        // リージョン色の定義
        region: {
          us: '#3b82f6',
          jp: '#ec4899',
          sg: '#10b981',
          eu: '#6366f1',
        }
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
      animation: {
        'bounce-in': 'bounceIn 2s ease-out',
        'fade-in-up': 'fadeInUp 1s ease-out 1s both',
        'shimmer': 'shimmer 3s ease-in-out infinite',
        'stamp': 'stamp 2s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { 
            transform: 'scale(0) rotate(-20deg)',
            opacity: '0'
          },
          '30%': { 
            transform: 'scale(1.3) rotate(-10deg)',
            opacity: '0.8'
          },
          '70%': { 
            transform: 'scale(0.9) rotate(5deg)',
            opacity: '1'
          },
          '100%': { 
            transform: 'scale(1) rotate(-8deg)',
            opacity: '0.95'
          }
        },
        fadeInUp: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(10px)' 
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0)' 
          }
        },
        shimmer: {
          '0%': { 
            'background-position': '-200% 0' 
          },
          '100%': { 
            'background-position': '200% 0' 
          }
        },
        stamp: {
          '0%': { 
            transform: 'scale(0) rotate(-20deg)',
            opacity: '0'
          },
          '100%': { 
            transform: 'scale(1) rotate(-8deg)',
            opacity: '0.95'
          }
        }
      },
      borderWidth: {
        '3': '3px',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
  // Chrome拡張機能のContent Script用にpreflight無効化オプション
  corePlugins: {
    preflight: true, // popupでは有効
  },
  // ダークモード設定
  darkMode: 'media',
};