import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, posix } from "node:path"
import { fileURLToPath } from "node:url"
import { assert, describe, it } from "vitest"
const package_path = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
/**
 * @param {unknown} target
 * @returns {string[]}
 */
function entry_paths(target) {
	if (typeof target == "string") return [ posix.normalize(target) ]
	if (target && typeof target == "object") return Object.values(target).flatMap(entry_paths)
	return []
}
/**
 * @returns {string[]}
 */
function packed_files() {
	const output = execFileSync(
		"npm",
		[
			"pack",
			"--dry-run",
			"--json",
			"--ignore-scripts"
		],
		{
			cwd: package_path,
			encoding: "utf8",
			shell: true,
			stdio: [ "ignore", "pipe", "ignore" ]
		}
	)
	const [ result ] = /** @type {{ files: { path: string }[] }[]} */(JSON.parse(output))/**/
	return /** @type {{ files: { path: string }[] }} */(result)/**/.files.map(file => file.path)
}
describe(
	"published files",
	() => {
		it(
			"ships every declaration the entries reach, and nothing private",
			() => {
				const manifest = /** @type {Record<string, unknown>} */(JSON.parse(
					readFileSync(
						join(package_path, "package.json"),
						"utf8"
					)
				))/**/
				const files = packed_files()
				const packed = new Set(files)
				for (const doc of [
					"CHANGELOG.md",
					"LICENSE",
					"README.md"
				]) assert.include(files, doc)
				for (const file of files) {
					assert.notMatch(
						file,
						/^(?:test|types\/test)\/|^tsconfig[^/]*\.json$|^node_modules\//,
						file
					)
					assert.notMatch(file, /\.c(?:js|ts)$/, file)
					assert.notMatch(
						file,
						/(?:^|\/)private\.d\.c?ts$/,
						file
					)
				}
				const entries = [
					manifest["main"],
					manifest["types"],
					manifest["exports"]
				].flatMap(entry_paths)
				for (const entry of entries) {
					if (existsSync(join(package_path, entry))) assert.isTrue(packed.has(entry), entry)
				}
				const engines = /** @type {{ node?: string } | undefined} */(manifest["engines"])/**/
				assert.isString(engines?.node, "engines.node")
				assert.equal(manifest["author"], "artxe")
				assert.equal(
					manifest["homepage"],
					"https://github.com/artxe/dom-eater#readme"
				)
				assert.deepEqual(
					manifest["bugs"],
					{
						url: "https://github.com/artxe/dom-eater/issues"
					}
				)
				assert.isFalse(
					manifest["sideEffects"],
					"sideEffects"
				)
				const exports = /** @type {Record<string, Record<string, string>>} */(manifest["exports"])/**/
				for (const [ subpath, target ] of Object.entries(exports)) {
					assert.deepEqual(
						Object.keys(target),
						[ "types", "default" ],
						subpath
					)
					assert.isTrue(
						packed.has(
							posix.normalize(target["types"] ?? "")
						),
						subpath
					)
				}
				for (const file of files.filter(path => path.endsWith(".d.ts"))) {
					const source = readFileSync(join(package_path, file), "utf8")
					for (const [ , specifier ] of source.matchAll(
						/(?:from |import\()"(\.{1,2}\/[^"]+)"/g
					)) {
						const base = posix.join(
							posix.dirname(file),
							/** @type {string} */(specifier)/**/
						).replace(/\.js$/, "")
						assert.isTrue(
							packed.has(`${base}.d.ts`) || packed.has(`${base}.js`),
							`${file} imports ${specifier}`
						)
					}
				}
			}
		)
	}
)