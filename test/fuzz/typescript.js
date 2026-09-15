import {
	dom_eater_ranges,
	typescript_ranges
} from "../typescript_ranges.js"
import {
	check_seeds,
	entry_problems,
	last_element,
	pick,
	random,
	report,
	sim_seeds
} from "./fuzz.js"
import { parseJsx } from "dom-eater"
import {
	readFileSync,
	readdirSync,
	statSync
} from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"
import { expect } from "vitest"
const expressions = [
	"!a",
	"\"s'\"",
	"'d\"'",
	"(a) / 2",
	"(a, b)",
	"(x) => <p className=\"q\">{x}</p>",
	"++a",
	"/[/]/.test(s)",
	"/re/g",
	"1",
	"</>",
	"<></>",
	"<A.B />",
	"<T,>(a: T) => a",
	"<div a=\"b\" c={d} {...e}>t{f}</div>",
	"<div className=\"a b\" id='c'>t</div>",
	"<p>{a / 2}{\"/\"}</p>",
	"() => a",
	"[a, ...b]",
	"`t${`u${b}`}`",
	"`t${a}`",
	"a",
	"a != b",
	"a / b",
	"a /= 2",
	"a < b",
	"a > b",
	"a ? b : c",
	"a ?? b",
	"a as T",
	"a satisfies T",
	"a!",
	"a++",
	"a.b",
	"a<b>c",
	"a = b",
	"a?.b",
	"async () => await a",
	"await",
	"class { m() { return 1 } }",
	"f(a)",
	"f<T>(a)",
	"function () { return a }",
	"new A<B>()",
	"tag`<p class=\"x ${a}\">${b}</p>`",
	"typeof a",
	"void 0",
	"x[0] / 2",
	"yield",
	"{ a: 1, b }"
]
const statements = [
	"@dec class K {}",
	"E;",
	"a\n++b",
	"abstract class D { abstract m(): void }",
	"async function h() { S await E; }",
	"class C<T> { x = E; m() { S } static { S } }",
	"const f = (a) => { S };",
	"declare module \"m\" { export const a: number }",
	"do S while (E);",
	"enum En { A, B = 2 }",
	"export const e = E;",
	"for (const x of E) S",
	"for (let i = 0; i < n; i++) S",
	"function g<T>(a: T): T { S return a }",
	"function* gen() { yield E; S }",
	"if (E) S",
	"if (E) S else S",
	"import x from \"y\";",
	"interface I { a: string; m(): void }",
	"label: for (;;) { break label; }",
	"let v\n/re/g.exec(s)",
	"let x = E;",
	"namespace N { S }",
	"return E;",
	"switch (E) { case E: S break; default: S }",
	"throw E;",
	"try { S } catch (e) { S } finally { S }",
	"type X<T> = T extends E ? A : B;",
	"while (E) S",
	"x\n/re/.test(y)",
	"{ S S }"
]
/**
 * @param {string} code
 * @param {boolean} jsx
 * @param {() => number} next
 * @returns {string[]}
 */
export function completion_problems(code, jsx, next) {
	if (!jsx) return []
	const source = parse_typescript(code, jsx)
	/** @type {import("typescript").JsxAttribute[]} */
	const attributes = []
	/**
	 * @param {import("typescript").Node} node
	 * @returns {void}
	 */
	function visit(node) {
		if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) attributes.push(node)
		ts.forEachChild(node, visit)
	}
	visit(source)
	if (!attributes.length) return []
	const attribute = pick(next, attributes)
	const value = /** @type {import("typescript").StringLiteral} */(attribute.initializer)/**/
	const value_start = value.getStart(source)
	const cursor = value_start + 1 + Math.floor(
		next() * (value.end - value_start - 1)
	)
	const typed = code.slice(0, cursor)
	const element = last_element(parseJsx(typed).ast)
	const found = {
		attribute: element?.attributes[element.attributes.length - 1]?.start,
		attribute_end: element?.attributes[element.attributes.length - 1]?.end,
		element: element?.start,
		element_end: element?.end
	}
	const expected = {
		attribute: attribute.getStart(source),
		attribute_end: cursor,
		element: attribute.parent.parent.getStart(source),
		element_end: cursor
	}
	return JSON.stringify(found) == JSON.stringify(expected)
		? []
		: [
			`typed ${JSON.stringify(typed)}: ${JSON.stringify(found)}, expected ${JSON.stringify(expected)}`
		]
}
/**
 * @param {number} seed
 * @returns {string}
 */
export function generated_program(seed) {
	const next = random(seed)
	let depth = 0
	/**
	 * @param {string} template
	 * @returns {string}
	 */
	function expand(template) {
		return template.replace(
			/\b[ES]\b/g,
			symbol => {
				if (++depth > 25) return symbol == "E" ? "a" : ";"
				return expand(
					pick(
						next,
						symbol == "E" ? expressions : statements
					)
				)
			}
		)
	}
	let code = ""
	const count = 1 + Math.floor(next() * 4)
	for (let i = 0; i < count; i++) code += expand(pick(next, statements)) + (next() < 0.5 ? "\n" : " ")
	return code
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @returns {import("typescript").SourceFile}
 */
function parse_typescript(code, jsx) {
	return ts.createSourceFile(
		jsx ? "x.tsx" : "x.ts",
		code,
		ts.ScriptTarget.Latest,
		true,
		jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	)
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @param {() => number} next
 * @returns {string[]}
 */
export function prefix_problems(code, jsx, next) {
	const cut = Math.floor(next() * (code.length + 1))
	return entry_problems(
		jsx ? "parse_jsx" : "parse_script",
		code.slice(0, cut)
	).map(
		problem => `prefix ${cut}: ${problem}`
	)
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @param {() => number} next
 * @returns {string[]}
 */
export function probed_programs(code, jsx, next) {
	const source = parse_typescript(code, jsx)
	/** @type {number[]} */
	const statement_starts = []
	/** @type {[ number, number ][]} */
	const operands = []
	/**
	 * @param {import("typescript").Node} node
	 * @returns {void}
	 */
	function visit(node) {
		if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isModuleBlock(node)) {
			for (const statement of node.statements) statement_starts.push(statement.getStart(source))
		}
		const { parent } = node
		if (
			ts.isIdentifier(node) && (
				ts.isBinaryExpression(parent) && parent.right == node
				|| ts.isCallExpression(parent) && parent.arguments.includes(node)
				|| ts.isReturnStatement(parent)
				|| ts.isConditionalExpression(parent)
			)
		) operands.push(
			[ node.getStart(source), node.end ]
		)
		ts.forEachChild(node, visit)
	}
	visit(source)
	/** @type {string[]} */
	const programs = []
	for (let i = 0; i < 2 && statement_starts.length; i++) {
		const at = pick(next, statement_starts)
		programs.push(
			`${code.slice(0, at)}/'/.test(q);${code.slice(at)}`
		)
		if (jsx) programs.push(
			`${code.slice(0, at)}<Q/>;${code.slice(at)}`
		)
	}
	for (let i = 0; i < 2 && operands.length; i++) {
		const [ start, end ] = pick(next, operands)
		programs.push(
			`${code.slice(0, start)}(e / "'" / 1)${code.slice(end)}`
		)
	}
	return programs
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @param {() => number} next
 * @returns {string[] | undefined}
 */
function program_problems(code, jsx, next) {
	const problems = typescript_problems(code, jsx)
	if (!problems) return undefined
	if (problems.length) return problems
	for (const probed of probed_programs(code, jsx, next)) {
		const found = typescript_problems(probed, jsx)
		if (found?.length) return [
			`probe ${JSON.stringify(probed)}`,
			...found
		]
	}
	return [
		...completion_problems(code, jsx, next),
		...prefix_problems(code, jsx, next)
	]
}
/**
 * @param {boolean} jsx
 * @returns {void}
 */
export function typescript_corpus(jsx) {
	if (process.env["SIM_MODE"] != "typescript-corpus") return
	/** @type {string[]} */
	const files = []
	/**
	 * @param {string} directory
	 * @returns {void}
	 */
	function walk(directory) {
		for (const entry of readdirSync(
			directory,
			{ withFileTypes: true }
		)) {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) {
				walk(path)
			} else if ((jsx ? /\.(?:[cm]?js|jsx|tsx)$/ : /\.[cm]?ts$/).test(entry.name) && statSync(path).size < 500000) {
				files.push(path)
			}
		}
	}
	walk(
		fileURLToPath(
			new URL(
				"../../node_modules/.pnpm",
				import.meta.url
			)
		)
	)
	files.sort()
	/** @type {string[]} */
	const failures = []
	for (const seed of sim_seeds(
		"typescript-corpus",
		files.length
	)) {
		const file = files[seed - 1]
		if (!file) continue
		const code = readFileSync(file, "utf8").replace(/^#!/, "//")
		const problems = program_problems(code, jsx, random(seed))
		if (problems?.length) failures.push(
			`SIM_MODE=typescript-corpus SIM_SEED=${seed} ${file}\n${problems.join("\n")}`
		)
	}
	report(failures)
}
/**
 * @param {boolean} jsx
 * @param {number} count
 * @returns {void}
 */
export function typescript_differential(jsx, count) {
	check_seeds(
		"typescript",
		count,
		generated_program,
		(code, seed) => program_problems(code, jsx, random(seed))
	)
}
/**
 * @param {string} code
 * @param {boolean} jsx
 * @returns {string[] | undefined}
 */
export function typescript_problems(code, jsx) {
	const diagnostics = /** @type {unknown[]} */(Reflect.get(
		parse_typescript(code, jsx),
		"parseDiagnostics"
	))/**/
	if (diagnostics.length) return undefined
	try {
		expect(dom_eater_ranges(code, jsx)).toStrictEqual(typescript_ranges(code, jsx))
		return []
	} catch (error) {
		return [ String(error).slice(0, 3000) ]
	}
}