import js from "@eslint/js";
import globals from "globals";
import jsdoc from 'eslint-plugin-jsdoc';
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from "eslint/config";


export default defineConfig([
    jsdoc.configs['flat/recommended'],
    { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
    { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
    { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: {...globals.browser, ...globals.node} } },
    {
        files: ['**/*.{js,mjs}'],
        languageOptions: {
            globals: {
                MathJax: 'readonly',
                Knockout: 'readonly',
                Numbas: 'writable',
                R: 'writable',
                '$': 'readonly',
                parsel: 'readonly',
                Decimal: 'readonly',
                'i18next': 'readonly',
                'pipwerks': 'readonly',
            }
        },
        plugins: {
            jsdoc,
        },
        rules: {
            'no-cond-assign': 'off',
            'no-global-assign': ['error',{exceptions:['window']}],
            'no-unused-vars': ['warn', {args: 'none'}],
            'no-empty': 'off',
            'jsdoc/require-description': 'warn',
            "jsdoc/check-alignment": 'warn', // Recommended
            "jsdoc/check-indentation": 'warn',
            "jsdoc/check-param-names": 'warn', // Recommended
            "jsdoc/check-syntax": 'warn',
            "jsdoc/check-tag-names": 'warn', // Recommended
            "jsdoc/check-types": 'warn', // Recommended
            "jsdoc/implements-on-classes": 'warn', // Recommended
            "jsdoc/match-description": 'warn',
            "jsdoc/no-types": 'off',
            "jsdoc/no-undefined-types": [
                1,
                {
                    definedTypes: ['Numbas','JME','TeX','Decimal','matrix','complex','Promise','Observable','observable','observableArray']
                }
            ], // Recommended
            "jsdoc/require-description": 'warn',
            "jsdoc/require-description-complete-sentence": 'off',
            "jsdoc/require-example": 'off',
            "jsdoc/require-hyphen-before-param-description": 'warn',
            "jsdoc/require-jsdoc": 'warn', // Recommended
            "jsdoc/require-param": 'warn', // Recommended
            "jsdoc/require-param-description": 'off', // Recommended
            "jsdoc/require-param-name": 'warn', // Recommended
            "jsdoc/require-param-type": 'warn', // Recommended
            "jsdoc/require-returns": 'warn', // Recommended
            "jsdoc/require-returns-check": 'off', // Recommended
            "jsdoc/require-returns-description": 'off', // Recommended
            "jsdoc/require-returns-type": 'warn', // Recommended
            "jsdoc/valid-types": 'warn', // Recommended
            "jsdoc/tag-lines": "off",
            "jsdoc/multiline-blocks": "off",
            "jsdoc/no-defaults": "off",

            "linebreak-style": [
                "error",
                "unix"
            ]
        }
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            'array-bracket-spacing': ['warn', 'never'],
            'arrow-parens': 'warn',
            'arrow-spacing': 'warn',
            'block-spacing': 'warn',
            'brace-style': ['warn', '1tbs'],
            'comma-spacing': 'warn',
            '@stylistic/function-call-spacing': ['warn', 'never'],
            'lines-between-class-members': 'warn',
            'no-mixed-spaces-and-tabs': 'error',
            'no-multi-spaces': ['error',{ignoreEOLComments: true}],
            'no-tabs': 'error',
            'no-trailing-spaces': 'warn',
            'no-whitespace-before-property': 'warn',
            'one-var-declaration-per-line': 'warn',
            'space-before-blocks': ['warn', 'always'],
            'space-before-function-paren': ['error', {'anonymous': 'never', 'named': 'never', 'asyncArrow': 'always'}],
            'space-in-parens': 'error',
        }
    }
]);
