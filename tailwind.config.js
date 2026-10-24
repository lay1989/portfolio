/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./components/**/*.html",
        "./content/**/*.html",
        "./src/**/*.{ts,tsx,html,js}",
        "./scripts/**/*.js",
        "./script.js",
        "./templates/**/*.html"
    ],
    safelist: ['is-in'],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
            padding: '1.5rem',
            screens: {
                sm: '100%',
                md: '100%',
                lg: '1024px',
                xl: '1152px',
                '2xl': '1152px',
            },
        },
        extend: {
            transitionTimingFunction: {
                'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
            },
            boxShadow: {
                'hover-lift': '0 10px 30px -10px var(--shadow-hover)',
            },
            translate: {
                'hover-lift': 'rgb(var(--hover-lift-offset-rgb) / <alpha-value>)',
            },
            colors: {
                background: 'rgb(var(--background-rgb) / <alpha-value>)',
                foreground: 'rgb(var(--foreground-rgb) / <alpha-value>)',
                card: 'rgb(var(--card-rgb) / <alpha-value>)',
                'card-foreground': 'rgb(var(--card-foreground-rgb) / <alpha-value>)',
                primary: 'rgb(var(--primary-rgb) / <alpha-value>)',
                'primary-foreground': 'rgb(var(--primary-foreground-rgb) / <alpha-value>)',
                secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
                'secondary-foreground': 'rgb(var(--secondary-foreground-rgb) / <alpha-value>)',
                muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
                'muted-foreground': 'rgb(var(--muted-foreground-rgb) / <alpha-value>)',
                accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
                'accent-foreground': 'rgb(var(--accent-foreground-rgb) / <alpha-value>)',
                border: 'rgb(var(--border-rgb) / <alpha-value>)',
                ember: 'rgb(var(--ember-rgb) / <alpha-value>)',
                ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
                'ink-soft': 'rgb(var(--ink-soft-rgb) / <alpha-value>)',
                paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
                'paper-2': 'rgb(var(--paper-2-rgb) / <alpha-value>)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
                serif: ['"DM Serif Display"', 'Georgia', 'serif'],
            },
            keyframes: {
                fadeUp: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(var(--reveal-offset, 30px))',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
            },
            animation: {
                'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            },
            transitionDelay: {
                400: '400ms',
            },
            typography: {
                DEFAULT: {
                    css: {
                        p: {
                            lineHeight: '1.75',
                        },
                        li: {
                            lineHeight: '1.75',
                        },
                        blockquote: {
                            lineHeight: '1.75',
                        }
                    }
                }
            }
        }
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/container-queries'),
    ],
};
