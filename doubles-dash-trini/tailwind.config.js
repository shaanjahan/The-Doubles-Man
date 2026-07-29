/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 4px)',
  			sm: 'calc(var(--radius) - 8px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
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
            tropic: {
                teal: 'hsl(var(--tropic-teal))',
                sea: 'hsl(var(--tropic-sea))',
                coral: 'hsl(var(--tropic-coral))',
                gold: 'hsl(var(--tropic-gold))',
                magenta: 'hsl(var(--tropic-magenta))',
                green: 'hsl(var(--tropic-green))',
                purple: 'hsl(var(--tropic-purple))',
                sand: 'hsl(var(--tropic-sand))',
                palm: 'hsl(var(--tropic-palm))'
            },
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
            'pop-in': {
                '0%': { transform: 'scale(0.6)', opacity: '0' },
                '70%': { transform: 'scale(1.08)', opacity: '1' },
                '100%': { transform: 'scale(1)', opacity: '1' }
            },
            'float-soft': {
                '0%,100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-8px)' }
            },
            'shake-soft': {
                '0%,100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px) rotate(-2deg)' },
                '75%': { transform: 'translateX(5px) rotate(2deg)' }
            },
            'combo-pop': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.35)' },
                '100%': { transform: 'scale(1)' }
            },
            'coin-fly': {
                '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
                '100%': { transform: 'translateY(-60px) scale(0.5)', opacity: '0' }
            },
            'patience-drain': {
                from: { width: '100%' },
                to: { width: '0%' }
            },
            'slide-in-right': {
                from: { transform: 'translateX(120%)' },
                to: { transform: 'translateX(0)' }
            },
            'slide-out-left': {
                from: { transform: 'translateX(0)' },
                to: { transform: 'translateX(-120%)' }
            },
            'wiggle': {
                '0%,100%': { transform: 'rotate(-3deg)' },
                '50%': { transform: 'rotate(3deg)' }
            },
            'steam-rise': {
                '0%': { opacity: '0', transform: 'translateY(6px) scale(0.6)' },
                '30%': { opacity: '0.55' },
                '100%': { opacity: '0', transform: 'translateY(-22px) scale(1.4)' }
            },
            'drip-fall': {
                '0%': { transform: 'translateY(-2px)', opacity: '0' },
                '25%': { opacity: '1' },
                '100%': { transform: 'translateY(14px)', opacity: '0' }
            },
            'fadeIn': {
                '0%': { opacity: '0' },
                '100%': { opacity: '1' }
            },
            'slideUp': {
                '0%': { transform: 'translateY(24px)', opacity: '0' },
                '100%': { transform: 'translateY(0)', opacity: '1' }
            }
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
            'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            'float-soft': 'float-soft 3s ease-in-out infinite',
            'shake-soft': 'shake-soft 0.4s ease-in-out',
            'combo-pop': 'combo-pop 0.3s ease-out',
            'coin-fly': 'coin-fly 0.7s ease-out forwards',
            'patience-drain': 'patience-drain linear forwards',
            'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
            'slide-out-left': 'slide-out-left 0.35s ease-in both',
            'wiggle': 'wiggle 0.5s ease-in-out infinite',
            'steam-rise': 'steam-rise 2.2s ease-out infinite',
            'drip-fall': 'drip-fall 0.45s linear infinite',
            'fade-in': 'fadeIn 0.2s ease-out',
            'slide-up': 'slideUp 0.25s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
