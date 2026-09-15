import {
	check_seeds,
	pick,
	random,
	sim_seeds,
	test_strings
} from "./fuzz.js"
import { parseRazor, parseRazorComponent } from "dom-eater"
import { execFileSync, spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
const fixtures = [
	"@model Shop.Item\n@{\n    ViewData[\"Title\"] = \"Items\";\n    var css = Model.Active ? \"on\" : \"off\";\n}\n<h1 class=\"title @css\">@Model.Name</h1>\n@if (Model.Tags.Count > 0)\n{\n    <ul class='tags'>\n        @foreach (var tag in Model.Tags)\n        {\n            <li data-id=\"@tag.Id\">@tag.Label</li>\n        }\n    </ul>\n}\nelse\n{\n    <p>None</p>\n}\n",
	"@page \"/counter\"\n<button class=\"btn btn-primary\" @onclick=\"IncrementCount\" disabled=\"@busy\">Click</button>\n<p role=\"status\">Current count: @currentCount</p>\n@code {\n    private int currentCount = 0;\n    private bool busy;\n    private string label = $\"n={currentCount}\";\n    private void IncrementCount() => currentCount++;\n}\n",
	"@using System.Linq\n@section Scripts {\n    <script src=\"~/js/site.js\"></script>\n}\n<div class=\"@(Model.Wide ? \"wide\" : \"narrow\")\">\n    @Html.Raw(\"<b>x</b>\")\n    <text>plain @Model.Text</text>\n    @: line @Model.Line\n    @* comment *@\n    <a href=\"mailto:a@b.com\">@@handle</a>\n</div>\n",
	"@switch (Model.Kind)\n{\n    case 1:\n        <p class=\"one\">One</p>\n        break;\n    default:\n        <p>@(\"other\")</p>\n        break;\n}\n@try\n{\n    <span>@Model.Risky()</span>\n}\ncatch (Exception e)\n{\n    <span class=\"error\">@e.Message</span>\n}\n",
	"<CascadingValue Value=\"@theme\">\n    <MudButton Class=\"ma-2\" Variant=\"Variant.Filled\" OnClick=\"@(() => Save(\"x\"))\">Save</MudButton>\n    <input @bind=\"name\" @bind:event=\"oninput\" />\n</CascadingValue>\n@code {\n    string name = \"\";\n    RenderFragment frag = @<p class=\"frag\">@name</p>;\n}\n"
]
const mutations = [
	"\n",
	" ",
	"\"",
	"'",
	"(",
	")",
	"*@",
	"/>",
	"<",
	"</",
	"</div>",
	"<div>",
	"<p class=\"",
	"<text>",
	">",
	"@",
	"@(",
	"@*",
	"@:",
	"@@",
	"@if (a) {",
	"@{",
	"a@b.c",
	"{",
	"}"
]
/**
 * @param {boolean} component
 * @returns {string | undefined}
 */
function build_reference(component) {
	if (spawnSync(
		"dotnet",
		[ "--version" ],
		{ shell: false }
	).status !== 0) return undefined
	const artifacts = join(
		tmpdir(),
		`dom-eater-razor-${component ? "component" : "legacy"}`
	)
	execFileSync(
		"dotnet",
		[
			"build",
			fileURLToPath(
				new URL(
					"razor/razor.csproj",
					import.meta.url
				)
			),
			"--artifacts-path",
			artifacts,
			"-c",
			"Release"
		],
		{ stdio: "ignore" }
	)
	return join(
		artifacts,
		"bin",
		"razor",
		"release",
		"razor.dll"
	)
}
/**
 * @param {string} text
 * @param {boolean} component
 * @returns {string[]}
 */
function dom_eater_items(text, component) {
	/** @type {string[]} */
	const items = []
	/**
	 * @param {import("dom-eater").AstNode} node
	 * @param {boolean} in_string
	 * @returns {void}
	 */
	function visit(node, in_string) {
		if (node.type == "Element") {
			items.push(
				`element ${node.start}-${node.end} ${node.subType} ${JSON.stringify(node.name.replace(/^!/, ""))}`
			)
			for (const attribute of node.attributes) {
				if (attribute.name != "") items.push(
					`attribute ${attribute.start}-${attribute.end} ${JSON.stringify(attribute.name)}`
				)
				if (attribute.value !== true) visit(attribute.value, false)
			}
			for (const child of node.children) visit(child, false)
		} else if (node.type == "Script") {
			for (const string of node.strings) {
				if (!in_string) items.push(
					`string ${string.start}-${string.end}`
				)
				for (const script of string.scripts) visit(script, true)
			}
			if ("elements" in node) {
				for (const element of node.elements) visit(element, false)
			}
		} else if (node.type == "String") {
			for (const script of node.scripts) visit(script, in_string)
		}
	}
	for (const node of (component ? parseRazorComponent : parseRazor)(text).ast) visit(node, false)
	return items
}
/**
 * @param {boolean} component
 * @param {number} seed
 * @returns {string}
 */
function mutated_page(component, seed) {
	const next = random(seed)
	let source = pick(
		next,
		next() < 0.5
			? fixtures
			: test_strings(
				component ? "parse_razor_component" : "parse_razor"
			)
	)
	const count = Math.floor(next() * 3)
	for (let i = 0; i < count; i++) {
		const at = Math.floor(next() * (source.length + 1))
		source = next() < 0.6
			? source.slice(0, at) + pick(next, mutations) + source.slice(at)
			: source.slice(0, at) + source.slice(
				at + 1 + Math.floor(next() * 4)
			)
	}
	return source
}
/**
 * @param {boolean} component
 * @param {number} count
 * @returns {void}
 */
export function razor_differential(component, count) {
	if (process.env["SIM_MODE"] != "razor") return
	const dll = build_reference(component)
	if (!dll) return
	/** @type {Map<string, { diagnostics: number, error: string | null, items: string[] }>} */
	const cache = new Map()
	/**
	 * @param {string} reference
	 * @param {string[]} texts
	 * @returns {void}
	 */
	function query(reference, texts) {
		const pending = [ ...new Set(texts) ].filter(text => !cache.has(text))
		for (let i = 0; i < pending.length; i += 2000) {
			const batch = pending.slice(i, i + 2000)
			const output = execFileSync(
				"dotnet",
				[ reference ],
				{
					encoding: "utf8",
					input: batch.map(
						text => `${JSON.stringify({ component, text })}\n`
					).join(""),
					maxBuffer: 1 << 30
				}
			)
			output.trim().split(/\r?\n/)
				.forEach(
					(line, j) => cache.set(
						/** @type {string} */(batch[j])/**/,
						/** @type {{ diagnostics: number, error: string | null, items: string[] }} */(JSON.parse(line))/**/
					)
				)
		}
	}
	/**
	 * @param {string} text
	 * @returns {boolean}
	 */
	function usable(text) {
		return text.isWellFormed()
	}
	query(
		dll,
		sim_seeds("razor", count).map(
			seed => mutated_page(component, seed)
		)
			.filter(usable)
	)
	check_seeds(
		"razor",
		count,
		seed => mutated_page(component, seed),
		text => {
			if (!usable(text)) return undefined
			query(dll, [ text ])
			const reference = cache.get(text)
			if (!reference || reference.error || reference.diagnostics) return undefined
			const expected = new Set(
				reference_items(reference.items, text)
			)
			const actual = new Set(
				dom_eater_items(text, component)
			)
			return [
				...[ ...expected ].filter(item => !actual.has(item)).map(item => `Razor only: ${item}`),
				...[ ...actual ].filter(item => !expected.has(item)).map(
					item => `dom-eater only: ${item}`
				)
			]
		}
	)
}
/**
 * @param {string[]} items
 * @param {string} text
 * @returns {string[]}
 */
function reference_items(items, text) {
	return items
		.filter(
			item => !item.startsWith("unclosed-start") && !item.startsWith("token CharacterLiteral")
		)
		.map(
			item => {
				if (!item.startsWith("token ")) return item
				const [ start, end ] = String(item.split(" ")[2]).split("-")
					.map(Number)
				let from = Number(start)
				while (text[from] == "$" || text[from] == "@") from++
				return `string ${from}-${end}`
			}
		)
}