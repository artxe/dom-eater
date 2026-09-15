import escape_end from "./escape_end.js"
import is_newline from "./is_newline.js"
import newline_end from "./newline_end.js"
import skip_run from "./skip_run.js"
import skip_whitespace from "./skip_whitespace.js"
import utf8_suffix_end from "./utf8_suffix_end.js"
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
function raw_end(text, index) {
	const quote_end = skip_run(text, index, "\"")
	const quotes = quote_end - index
	let i = skip_whitespace(text, quote_end)
	if (!is_newline(text[i] ?? "")) {
		i = quote_end
		for (;;) {
			const char = text[i]
			if (char === undefined || is_newline(char)) return i
			if (char == "\"") {
				const run_end = skip_run(text, i, "\"")
				if (run_end - i >= quotes) return run_end
				i = run_end
			} else {
				i++
			}
		}
	}
	for (;;) {
		i = skip_whitespace(text, newline_end(text, i))
		const run_end = skip_run(text, i, "\"")
		if (run_end - i >= quotes) return run_end
		i = run_end
		for (;;) {
			const char = text[i]
			if (char === undefined) return i
			if (is_newline(char)) break
			if (char == "\"") {
				const content_run_end = skip_run(text, i, "\"")
				if (content_run_end - i >= quotes) return content_run_end
				i = content_run_end
			} else {
				i++
			}
		}
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {number}
 */
export default function(text, index) {
	if (text.startsWith("\"\"\"", index)) return utf8_suffix_end(text, raw_end(text, index))
	const quote = text[index]
	let i = index + 1
	for (;;) {
		const char = text[i]
		if (char == "\\") {
			i = escape_end(text, i)
		} else if (char == quote) {
			i++
			break
		} else if (char === undefined || is_newline(char)) {
			break
		} else {
			i++
		}
	}
	return quote == "\""
		? utf8_suffix_end(text, i)
		: i
}