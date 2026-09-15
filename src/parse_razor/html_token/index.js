import is_newline from "../is_newline.js"
import is_whitespace from "../is_whitespace.js"
import newline_end from "../newline_end.js"
import skip_whitespace from "../skip_whitespace.js"
import is_letter_or_digit from "./is_letter_or_digit.js"
/** @type {{ index: number, text: string, token: import("../../../private.js").RazorToken | undefined }} */
const cache = {
	index: -1,
	text: "",
	token: undefined
}
const text_end_codes = new Set(
	[
		9,
		10,
		11,
		12,
		13,
		26,
		32,
		33,
		34,
		39,
		47,
		60,
		61,
		62,
		63,
		64,
		91,
		93
	]
)
const token_chars = "!\"'/<=>?@[]"
/**
 * @param {string} text
 * @param {number} index
 * @returns {boolean}
 */
function is_text_end(text, index) {
	const code = text.charCodeAt(index)
	if (code < 128) return text_end_codes.has(code) || code == 45 && text.charCodeAt(index + 1) == 45
	return is_whitespace(text[index] ?? "") || is_newline(text[index] ?? "")
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {import("../../../private.js").RazorToken | undefined}
 */
function scan_token(text, index) {
	const char = text[index]
	if (char === undefined) return
	if (is_whitespace(char)) {
		return {
			end: skip_whitespace(text, index),
			kind: "ws"
		}
	}
	if (is_newline(char)) {
		return {
			end: newline_end(text, index),
			kind: "nl"
		}
	}
	if (char == "@") {
		if (text[index + 1] == "*") {
			const close = text.indexOf("*@", index + 2)
			return {
				end: close < 0
					? text.length
					: close + 2,
				kind: "@*"
			}
		}
		return { end: index + 1, kind: "@" }
	}
	if (char == "-" && text[index + 1] == "-") {
		return { end: index + 2, kind: "--" }
	}
	if (token_chars.includes(char)) {
		return { end: index + 1, kind: char }
	}
	let i = index
	let previous = ""
	for (;;) {
		while (i < text.length && !is_text_end(text, i)) {
			previous = text[i] ?? ""
			i++
		}
		if (text[i] != "@" || !is_letter_or_digit(previous) || !is_letter_or_digit(text[i + 1] ?? "")) {
			return { end: i, kind: "text" }
		}
		i++
		previous = ""
	}
}
/**
 * @param {string} text
 * @param {number} index
 * @returns {import("../../../private.js").RazorToken | undefined}
 */
export default function(text, index) {
	if (cache.index == index && cache.text === text) return cache.token
	const token = scan_token(text, index)
	cache.index = index
	cache.text = text
	cache.token = token
	return token
}