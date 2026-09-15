import {
	completion_ends,
	fuzz_invariants,
	last_element
} from "./fuzz.js"
import {
	pug_differential,
	pug_fixture_problems
} from "./pug.js"
import { parsePug } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"parsePug fuzzing",
	() => {
		it(
			"agrees with the Pug lexer and parser on mutated templates",
			() => {
				pug_differential(300)
			},
			600000
		)
		it(
			"agrees with the Pug lexer and parser on the fixtures",
			() => {
				expect(pug_fixture_problems()).toStrictEqual([])
			},
			600000
		)
		it(
			"ends the element and attribute being typed at the cursor",
			() => {
				for (const source of [
					"div(class=\"a",
					"div.a(class=\"",
					"+m(class=\"",
					"div(class=[\"a\", \"",
					"p #[span(class=\"a",
					"div\n  p(class=\"a",
					"div(class=`a ${b} c"
				]) {
					expect(
						completion_ends(
							last_element(parsePug(source).ast)
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
				fuzz_invariants("parse_pug", 300)
			},
			600000
		)
	}
)