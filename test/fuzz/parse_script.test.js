import {
	completion_ends,
	fuzz_invariants,
	last_element
} from "./fuzz.js"
import {
	typescript_corpus,
	typescript_differential
} from "./typescript.js"
import { parseScript } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parseScript fuzzing",
	() => {
		it(
			"agrees with the TypeScript parser on generated programs",
			() => {
				typescript_differential(false, 150)
			},
			600000
		)
		it(
			"agrees with the TypeScript parser on the node_modules corpus",
			() => {
				typescript_corpus(false)
			},
			3600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"x = html`<p class=\"${x} a",
					"@Component({ template: `<p class=\"a",
					"x = /* html */`<p class=\"a"
				]) {
					expect(
						completion_ends(
							last_element(parseScript(source).ast)
						),
						source
					).toStrictEqual(
						{
							attribute: source.length,
							element: source.length
						}
					)
				}
			},
			600000
		)
		it(
			"keeps the invariants on generated input",
			() => {
				fuzz_invariants("parse_script", 300)
			},
			600000
		)
	}
)