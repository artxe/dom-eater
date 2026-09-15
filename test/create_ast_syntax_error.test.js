import { createAstSyntaxError, parseHtml } from "dom-eater"
import { describe, expect, it } from "vitest"
describe(
	"createAstSyntaxError",
	() => {
		it(
			"creates an Error carrying the source range",
			() => {
				const error = createAstSyntaxError("message", 1, 2)
				expect(error).toBeInstanceOf(Error)
				expect(error.name).toBe("AstSyntaxError")
				expect(error.message).toBe("message")
				expect(error.start).toBe(1)
				expect(error.end).toBe(2)
				expect(String(error)).toBe("AstSyntaxError: message")
			}
		)
		it(
			"keeps every field through JSON",
			() => {
				expect(
					JSON.parse(
						JSON.stringify(
							createAstSyntaxError("message", 1, 2)
						)
					)
				).toStrictEqual(
					{
						end: 2,
						message: "message",
						name: "AstSyntaxError",
						start: 1
					}
				)
			}
		)
		it(
			"keeps every field through structuredClone",
			() => {
				expect(
					{
						...structuredClone(
							createAstSyntaxError("message", 1, 2)
						)
					}
				).toStrictEqual(
					{
						end: 2,
						message: "message",
						name: "AstSyntaxError",
						start: 1
					}
				)
			}
		)
		it(
			"matches the errors the parsers return",
			() => {
				const [ error ] = parseHtml("<p class=\"a").errors
				expect(Object.getPrototypeOf(error)).toBe(
					Object.getPrototypeOf(createAstSyntaxError("", 0, 0))
				)
				expect(Object.keys(error ?? {})).toStrictEqual(
					[ "end", "message", "name", "start" ]
				)
			}
		)
	}
)