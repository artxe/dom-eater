import create_ast_syntax_error from "./create_ast_syntax_error.js"
/**
 * @returns {{ ast: never[], errors: import("../public.js").AstSyntaxError[] }}
 */
export default function() {
	return {
		ast: [],
		errors: [
			create_ast_syntax_error("The input is not a string.", 0, 0)
		]
	}
}