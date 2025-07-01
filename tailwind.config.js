/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
			// 클리닉 전용 색상 시스템
			clinic: {
				patients: {
					50: '#eff6ff',
					100: '#dbeafe',
					200: '#bfdbfe',
					300: '#93c5fd',
					400: '#60a5fa',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
					800: '#1e40af',
					900: '#1e3a8a',
				},
				expenses: {
					50: '#ecfdf5',
					100: '#d1fae5',
					200: '#a7f3d0',
					300: '#6ee7b7',
					400: '#34d399',
					500: '#10b981',
					600: '#059669',
					700: '#047857',
					800: '#065f46',
					900: '#064e3b',
				},
				income: {
					50: '#faf5ff',
					100: '#f3e8ff',
					200: '#e9d5ff',
					300: '#d8b4fe',
					400: '#c084fc',
					500: '#a855f7',
					600: '#9333ea',
					700: '#7c3aed',
					800: '#6b21a8',
					900: '#581c87',
				},
				stats: {
					50: '#eef2ff',
					100: '#e0e7ff',
					200: '#c7d2fe',
					300: '#a5b4fc',
					400: '#818cf8',
					500: '#6366f1',
					600: '#4f46e5',
					700: '#4338ca',
					800: '#3730a3',
					900: '#312e81',
				}
			}
  		},
  		fontFamily: {
  			sans: [
  				'var(--font-sans)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Apple SD Gothic Neo',
  				'Pretendard Variable',
  				'Pretendard',
  				'Roboto',
  				'Noto Sans KR',
  				'Segoe UI',
  				'Malgun Gothic',
  				'Apple Color Emoji',
  				'Segoe UI Emoji',
  				'Segoe UI Symbol',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'SF Mono',
  				'Monaco',
  				'Inconsolata',
  				'Roboto Mono',
  				'Noto Sans Mono KR',
  				'source-code-pro',
  				'Menlo',
  				'monospace'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
			'clinic': '12px',
			'clinic-lg': '16px',
			'clinic-xl': '20px'
  		},
		spacing: {
			'clinic-xs': '0.5rem',  // 8px
			'clinic-sm': '0.75rem', // 12px
			'clinic-md': '1rem',    // 16px
			'clinic-lg': '1.5rem',  // 24px
			'clinic-xl': '2rem',    // 32px
			'clinic-2xl': '3rem',   // 48px
		},
		boxShadow: {
			'clinic-sm': '0 2px 4px 0 rgb(0 0 0 / 0.05)',
			'clinic': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
			'clinic-md': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
			'clinic-lg': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
			'clinic-xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
		},
		fontSize: {
			'clinic-xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
			'clinic-sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
			'clinic-base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
			'clinic-lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
			'clinic-xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
			'clinic-2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
		},
		animation: {
			'clinic-fade-in': 'clinic-fade-in 0.3s ease-in-out',
			'clinic-slide-up': 'clinic-slide-up 0.3s ease-out',
			'clinic-scale': 'clinic-scale 0.2s ease-in-out',
		},
		keyframes: {
			'clinic-fade-in': {
				'0%': { opacity: '0' },
				'100%': { opacity: '1' },
			},
			'clinic-slide-up': {
				'0%': { transform: 'translateY(10px)', opacity: '0' },
				'100%': { transform: 'translateY(0)', opacity: '1' },
			},
			'clinic-scale': {
				'0%': { transform: 'scale(0.95)' },
				'100%': { transform: 'scale(1)' },
			},
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 