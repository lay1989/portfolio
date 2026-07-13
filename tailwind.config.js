/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./components/**/*.html",
        "./src/**/*.{ts,tsx,html,js}",
        "./script.js"
    ],
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
                'hover-lift': 'var(--hover-lift-offset)',
            },
            colors: {
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                card: 'var(--card)',
                'card-foreground': 'var(--card-foreground)',
                primary: 'var(--primary)',
                'primary-foreground': 'var(--primary-foreground)',
                secondary: 'var(--secondary)',
                'secondary-foreground': 'var(--secondary-foreground)',
                muted: 'var(--muted)',
                'muted-foreground': 'var(--muted-foreground)',
                accent: 'var(--accent)',
                'accent-foreground': 'var(--accent-foreground)',
                border: 'var(--border)',
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
