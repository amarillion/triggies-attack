import globals from 'globals';
import tseslint from 'typescript-eslint';
import { globalIgnores } from 'eslint/config';
import stylistic from '@stylistic/eslint-plugin';
import eslint from '@eslint/js';

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	globalIgnores([ 'node_modules', 'dist' ]),
	{
		plugins: {
			'@stylistic': stylistic,
		},
			
		languageOptions: {
			globals: { ...globals.browser, '__VERSION__': false, '__BUILD_DATE__': false },
			parserOptions: {
				// needed for recommendedTypeChecked
				projectService: {
					allowDefaultProject: [ '*.js' ],
				},
			},
		},
		rules: {
			'eqeqeq': [ 'error', 'always' ],
			'camelcase': [ 'error' ],
			'no-shadow': [ 'error' ],

			// Base ESLint rules
			'no-console': 'off',
			'no-unused-vars': 'off', // Handled by TypeScript ESLint

			// TypeScript specific rules
			'@typescript-eslint/no-unused-vars': [ 'warn', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: "^_",
			} ],
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',
			'@typescript-eslint/no-empty-function': 'off',

			// // helps to catch inproper use of BooleanModel, like `if(booleanModel)` instead of `if(booleanModel.get())`
			'@typescript-eslint/strict-boolean-expressions': 'error',

			'@stylistic/comma-dangle': [ 'error', 'always-multiline' ],
			'@stylistic/indent': [ 'error', 'tab' ],
			'@stylistic/indent-binary-ops': [ 'error', 'tab' ],
			'@stylistic/no-tabs': 'off',
			'@stylistic/array-bracket-spacing': [ 'error', 'always' ],
			'@stylistic/semi': [ 'error', 'always' ],

			'@stylistic/arrow-parens': [ 'error', 'as-needed', {
				requireForBlockBody: false,
			} ],

			'@stylistic/no-trailing-spaces': [ 'error', {
				skipBlankLines: true,
			} ],

			'@stylistic/member-delimiter-style': [ 'error', {
				multiline: {
					delimiter: 'comma',
					requireLast: true,
				},

				singleline: {
					delimiter: 'comma',
				},
			} ],

			'@stylistic/padded-blocks': 'off',
			'@stylistic/max-statements-per-line': 'off',
		},
	},
);
