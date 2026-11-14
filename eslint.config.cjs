const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
    {
        ignores: [
            '.next/**',
            'out/**',
            'build/**',
            'coverage/**',
            '.netlify/**',
            'next-env.d.ts',
        ],
    },
    ...compat.extends('next/core-web-vitals', 'prettier'),
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
