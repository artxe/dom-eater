import escape_end from "./escape_end.js"
import is_newline from "./is_newline.js"
import line_end from "./line_end.js"
import newline_end from "./newline_end.js"
import skip_run from "./skip_run.js"
import skip_whitespace from "./skip_whitespace.js"
import string_literal_end from "./string_literal_end.js"
import verbatim_end from "./verbatim_end.js"
/**
 * @param {string} text
 * @param {number} index
 * @param {"normal" | "verbatim" | "single" | "multi"} kind
 * @param {{ error: boolean }} scanner
 * @returns {number}
 */
function format_end(text, index, kind, scanner) {
	let i = index + 1
	for (;;) {
		const char = text[i]
		if (char === undefined) return i
		if (char == "\\" && kind == "normal") {
			i = escape_end(text, i)
		} else if (char == "\"") {
			if (kind == "verbatim" && text[i + 1] == "\"") {
				i += 2
			} else {
				return i
			}
		} else if (char == "{") {
			scanner.error = true
			i++
		} else if (char == "}") {
			return i
		} else {
			i++
		}
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @param {"normal" | "verbatim" | "single" | "multi"} kind
 * @param {string} ending
 * @param {boolean} hole
 * @param {{ error: boolean }} scanner
 * @returns {number}
 */
function hole_end(text, index, kind, ending, hole, scanner) {
	let i = index
	for (;;) {
		const char = text[i]
		if (char === undefined) return i
		const next = text[i + 1]
		if (char == "#") {
			scanner.error = true
			i++
		} else if (char == "$" && (next == "$" || next == "@" || next == "\"")) {
			i = interpolated_end(text, i)
		} else if (char == ":" && hole) {
			return format_end(text, i, kind, scanner)
		} else if (char == "}" || char == ")" || char == "]") {
			if (char == ending) return i
			scanner.error = true
			i++
		} else if (char == "\"") {
			if (scanner.error) return i
			i = string_literal_end(text, i)
		} else if (char == "'") {
			i = string_literal_end(text, i)
		} else if (char == "@") {
			const at_end = skip_run(text, i, "@")
			if (text[at_end] == "\"") {
				i = verbatim_end(text, i)
			} else if (text[at_end] == "$") {
				i = interpolated_end(text, i)
			} else if (next == "*") {
				const close = text.indexOf("*@", i + 2)
				i = close < 0
					? text.length
					: close + 2
			} else {
				i++
			}
		} else if (char == "/" && next == "/") {
			i = line_end(text, i)
		} else if (char == "/" && next == "*") {
			const close = text.indexOf("*/", i + 2)
			i = close < 0
				? text.length
				: close + 2
		} else if (char == "{" || char == "(" || char == "[") {
			const close = char == "{"
				? "}"
				: char == "("
					? ")"
					: "]"
			i = hole_end(text, i + 1, kind, close, false, scanner)
			if (text[i] == close) i++
		} else {
			i++
		}
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @param {[ number, number, number, number ][]} [holes]
 * @returns {number}
 */
function interpolated_end(text, index, holes) {
	/** @type {{ error: boolean }} */
	const scanner = { error: false }
	let i = index
	let unrecoverable = false
	/** @type {"normal" | "verbatim" | "single" | "multi"} */
	let kind = "normal"
	let dollars = 1
	let quotes = 1
	if (text.startsWith("$@\"", i) || text.startsWith("@$\"", i)) {
		kind = "verbatim"
		i += 3
	} else if (text.startsWith("$\"", i) && (text[i + 2] != "\"" || text[i + 3] != "\"")) {
		i += 2
	} else {
		const at_end = skip_run(text, i, "@")
		const dollar_end = skip_run(text, at_end, "$")
		const second_at_end = skip_run(text, dollar_end, "@")
		const quote_end = skip_run(text, second_at_end, "\"")
		dollars = dollar_end - at_end
		quotes = quote_end - second_at_end
		i = quote_end
		if (!quotes) return i
		if (at_end > index || second_at_end > dollar_end || quotes < 3) scanner.error = true
		const after = skip_whitespace(text, i)
		if (is_newline(text[after] ?? "")) {
			kind = "multi"
			i = newline_end(text, after)
		} else {
			kind = "single"
		}
	}
	const allow_newline = kind == "verbatim" || kind == "multi"
	if (kind == "multi") {
		const before = skip_whitespace(text, i)
		if (skip_run(text, before, "\"") - before >= quotes) {
			i = before
		}
	}
	for (;;) {
		const char = text[i]
		if (char === undefined || !allow_newline && is_newline(char)) break
		if (kind == "multi" && is_newline(char)) {
			const after = skip_whitespace(text, newline_end(text, i))
			if (skip_run(text, after, "\"") - after >= quotes) break
		}
		if (char == "\"") {
			if (kind == "normal" || kind == "verbatim") {
				if (scanner.error || kind == "normal" || text[i + 1] != "\"") break
				i += 2
			} else {
				const run_end = skip_run(text, i, "\"")
				if (run_end - i >= quotes) break
				i = run_end
			}
		} else if (unrecoverable && (char == "{" || char == "}")) {
			i++
		} else if (char == "}") {
			if (kind == "normal" || kind == "verbatim") {
				i++
				if (text[i] == "}") {
					i++
				} else {
					scanner.error = true
				}
			} else {
				const run_end = skip_run(text, i, "}")
				if (run_end - i >= dollars) scanner.error = true
				i = run_end
			}
		} else if (char == "{") {
			if (kind == "normal" || kind == "verbatim") {
				if (text[i + 1] == "{") {
					i += 2
				} else {
					const open = i
					i = hole_end(text, i + 1, kind, "}", true, scanner)
					const content_end = i
					if (text[i] == "}") {
						i++
					} else {
						scanner.error = true
					}
					holes?.push(
						[ open, open + 1, content_end, i ]
					)
				}
			} else {
				const run_end = skip_run(text, i, "{")
				if (run_end - i >= dollars) {
					if (run_end - i >= 2 * dollars) scanner.error = true
					i = hole_end(text, run_end, kind, "}", true, scanner)
					const close_end = skip_run(text, i, "}")
					if (close_end == i || close_end - i < dollars) {
						scanner.error = true
						holes?.push(
							[
								run_end - dollars,
								run_end,
								i,
								close_end
							]
						)
						i = close_end
					} else {
						holes?.push(
							[
								run_end - dollars,
								run_end,
								i,
								i + dollars
							]
						)
						i += dollars
					}
				} else {
					i = run_end
				}
			}
		} else if (char == "\\" && kind == "normal") {
			if (text[i + 1] == "{" || text[i + 1] == "}") {
				unrecoverable = true
				i++
			} else {
				i = escape_end(text, i)
			}
		} else {
			i++
		}
	}
	if (kind == "normal" || kind == "verbatim") {
		return text[i] == "\""
			? i + 1
			: i
	}
	if (kind == "single") {
		return text[i] == "\""
			? skip_run(text, i, "\"")
			: i
	}
	if (i >= text.length) return i
	if (text[i] == "\"") return skip_run(text, i, "\"")
	return skip_run(
		text,
		skip_whitespace(text, newline_end(text, i)),
		"\""
	)
}
export default interpolated_end