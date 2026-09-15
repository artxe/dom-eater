import {
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
} from "dom-eater"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { assert, describe, it } from "vitest"
const root = resolve(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const require_from_root = createRequire(join(root, "package.json"))
const parsers = {
	parseHtml,
	parseJsx,
	parsePug,
	parseRazor,
	parseRazorComponent,
	parseScript
}
const source = readFileSync(join(root, "README.md"), "utf8")
	.split("\r\n")
	.join("\n")
/**
 * @param {string} code
 * @returns {boolean}
 */
function resolvable(code) {
	for (const [ , specifier ] of code.matchAll(
		/(?:from|import)\s*\(?\s*["']([^"']+)["']/g
	)) {
		const name = /** @type {string} */(specifier)/**/
		if (name.startsWith("node:")) continue
		try {
			require_from_root.resolve(name)
		} catch {
			return false
		}
	}
	return true
}
/**
 * @returns {{ json: string, name: string, source: string }[]}
 */
function shown_outputs() {
	return [
		...source.matchAll(
			/```ts\n[\s\S]*?\b(\w+)\(`((?:[^`\\]|\\.)*)`\)\n```\n```json\n([\s\S]*?)```/g
		)
	].map(
		([ , name, code, json ]) => ({
			json: /** @type {string} */(json)/**/,
			name: /** @type {string} */(name)/**/,
			source: /** @type {string} */(code)/**/
		})
	)
}
/**
 * @returns {number}
 */
function skipped() {
	let count = 0
	for (const match of source.matchAll(
		/^(\t| *)```ts\n([\s\S]*?)^\1```/gm
	)) {
		const code = /** @type {string} */(match[2])/**/
		if (!match[1] && !resolvable(code)) count++
	}
	return count
}
/**
 * @returns {{ code: string, line: number }[]}
 */
function ts_blocks() {
	/** @type {{ code: string, line: number }[]} */
	const blocks = []
	for (const match of source.matchAll(
		/^(\t| *)```ts\n([\s\S]*?)^\1```/gm
	)) {
		const code = /** @type {string} */(match[2])/**/
		if (match[1] || !resolvable(code)) continue
		blocks.push(
			{
				code,
				line: source.slice(0, match.index).split("\n").length + 1
			}
		)
	}
	return blocks
}
describe(
	"readme",
	() => {
		it(
			"examples type check",
			() => {
				const blocks = ts_blocks()
				assert.isNotEmpty(blocks)
				assert.equal(
					blocks.length + skipped(),
					(source.match(/^```ts\n/gm) ?? []).length,
					"every top level ts block is either checked or skipped for a reason"
				)
				/** @type {Map<string, string>} */
				const files = new Map()
				/** @type {Map<string, { code: string, line: number }>} */
				const origins = new Map()
				for (const [ index, block ] of blocks.entries()) {
					const path = join(root, `readme_${index}.mts`)
						.split("\\")
						.join("/")
					files.set(
						path,
						`${block.code}\nexport {}\n`
					)
					origins.set(path, block)
				}
				const host = ts.createCompilerHost({}, true)
				const read_file = host.readFile.bind(host)
				const file_exists = host.fileExists.bind(host)
				const get_source = host.getSourceFile.bind(host)
				host.fileExists = path => files.has(path.split("\\").join("/")) || file_exists(path)
				host.readFile = path => files.get(path.split("\\").join("/")) ?? read_file(path)
				host.getSourceFile = (
					path,
					options,
					on_error,
					should_create
				) => {
					const code = files.get(path.split("\\").join("/"))
					return code === void 0
						? get_source(
							path,
							options,
							on_error,
							should_create
						)
						: ts.createSourceFile(path, code, options, true)
				}
				const program = ts.createProgram(
					[ ...files.keys() ],
					{
						lib: [ "lib.es2023.d.ts" ],
						module: ts.ModuleKind.NodeNext,
						moduleResolution: ts.ModuleResolutionKind.NodeNext,
						noEmit: true,
						noUnusedLocals: false,
						skipLibCheck: true,
						strict: true,
						target: ts.ScriptTarget.ES2023,
						types: [ "node" ]
					},
					host
				)
				/** @type {string[]} */
				const problems = []
				for (const diagnostic of [
					...program.getSemanticDiagnostics(),
					...program.getSyntacticDiagnostics()
				]) {
					const path = diagnostic.file?.fileName.split("\\").join("/") ?? ""
					const origin = origins.get(path)
					const inside = origin && diagnostic.file && diagnostic.start != null
						? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line
						: 0
					problems.push(
						`${origin ? `README.md:${origin.line + inside}` : "?"}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`
					)
				}
				assert.deepEqual(problems, [])
			},
			60000
		)
		it(
			"shows the output each parser really gives",
			() => {
				const shown = shown_outputs()
				assert.isNotEmpty(shown)
				for (const { json, name, source: code } of shown) {
					const parse = parsers[/** @type {keyof typeof parsers} */(name)/**/]
					assert.isFunction(parse, name)
					assert.deepEqual(
						JSON.parse(
							JSON.stringify(
								parse(
									code.replace(/\\([\\$`])/g, "$1")
								)
							)
						),
						JSON.parse(json),
						name
					)
				}
			}
		)
	}
)