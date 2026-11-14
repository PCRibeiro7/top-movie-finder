const nextVitals = require('eslint-config-next/core-web-vitals');
const prettier = require('eslint-config-prettier/flat');

module.exports = [
    {
        ignores: [
            '.next/**',
            '.next-dev/**',
            'out/**',
            'build/**',
            'coverage/**',
            '.netlify/**',
            'next-env.d.ts',
        ],
    },
    ...nextVitals,
    prettier,
    { rules: { '@next/next/no-img-element': 'off' } },
    {
        files: ['pages/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
        ignores: ['pages/api/**', 'src/server/**'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '**/server',
                                '**/server/**',
                                '**/pages',
                                '**/pages/**',
                            ],
                            message:
                                'Browser code must use shared contracts and API clients.',
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['src/shared/**/*.ts'],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        '**/server/**',
                        '**/server',
                        '**/pages/**',
                        '**/pages',
                        '**/features/**',
                        '**/features',
                        '**/components/**',
                        '**/components',
                    ],
                },
            ],
        },
    },
];
