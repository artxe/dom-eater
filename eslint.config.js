import parser from "@typescript-eslint/parser"
import lube from "eslint-plugin-lube"
/** @type {import("eslint").Linter.Config[]} */
export default [
	{
		ignores: [
			"coverage/**",
			"test/fuzz/razor/bin/**",
			"test/fuzz/razor/obj/**",
			"types/**"
		]
	},
	{
		files: [
			"**/*.js",
			"**/*.json",
			"**/*.mjs",
			"**/*.ts"
		],
		languageOptions: {
			ecmaVersion: "latest",
			parser,
			sourceType: "module"
		},
		plugins: lube.configs.strict.plugins,
		rules: { ...lube.configs.strict.rules }
	},
	{
		files: [ "src/**/*.js" ],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					message: "src stays ES2020: logical assignment is ES2021.",
					selector: "AssignmentExpression[operator='&&=']"
				},
				{
					message: "src stays ES2020: logical assignment is ES2021.",
					selector: "AssignmentExpression[operator='??=']"
				},
				{
					message: "src stays ES2020: logical assignment is ES2021.",
					selector: "AssignmentExpression[operator='||=']"
				},
				{
					message: "A src module exports only a default.",
					selector: "ExportNamedDeclaration[source=null]"
				},
				{
					message: "src stays ES2020: class static blocks are ES2022.",
					selector: "StaticBlock"
				}
			]
		}
	}
]