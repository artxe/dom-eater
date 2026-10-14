import {
	attribute_node,
	check_non_string_input,
	class_attributes,
	comment_node,
	element_names,
	element_node,
	razor,
	razor_items,
	razor_node,
	readme_example,
	string_node,
	text_node
} from "./helpers.js"
import { parseRazor } from "dom-eater"
import { describe, expect, it, vi } from "vitest"
describe(
	"parseRazor",
	() => {
		describe(
			"agreement with the Razor compiler",
			() => {
				it.each(
					[
						[
							"<!-- <!-- --><p/>",
							[ "element 13-17 closed \"p\"" ]
						],
						[
							"<!-- a -- b --><p/>",
							[ "element 15-19 closed \"p\"" ]
						],
						[
							"<!-- a --!><p/>-->",
							[ "element 11-15 closed \"p\"" ]
						],
						[
							"<!-- a ----><p/>",
							[ "element 12-16 closed \"p\"" ]
						],
						[ "<!-- a <p/>", [] ],
						[
							"<!DOCTYPE html><!--><!---><!-- a ---><![CDATA[ @x ]]><![cdata[x]]><![ x]><p/>",
							[ "element 73-77 closed \"p\"" ]
						],
						[ "<![CDATAx<p/>", [] ],
						[
							"<!br>x",
							[ "element 0-5 open \"br\"" ]
						],
						[
							"<!p class=\"a\">x</!p>",
							[
								"attribute 4-13 \"class\" 10-13",
								"element 0-20 open \"p\""
							]
						],
						[
							"</ p><b/>",
							[
								"element 0-3 close \"\"",
								"element 5-9 closed \"b\""
							]
						],
						[
							"</p x><p></P>",
							[
								"element 0-4 close \"p\"",
								"element 6-13 open \"p\""
							]
						],
						[
							"<<<<<<< HEAD\n@model A\n=======\n@model B\n>>>>>>> b\n<p/>",
							[
								"attribute 8-12 \"HEAD\" true",
								"element 0-1 open \"\"",
								"element 1-2 open \"\"",
								"element 2-3 open \"\"",
								"element 3-4 open \"\"",
								"element 4-5 open \"\"",
								"element 49-53 closed \"p\"",
								"element 5-6 open \"\"",
								"element 6-53 open \"\"",
								"script 13-21",
								"script 30-38"
							]
						],
						[
							"<?x?y?><p/>",
							[ "element 7-11 closed \"p\"" ]
						],
						[
							"<a href=a/b>",
							[
								"attribute 3-11 \"href\" 8-11",
								"element 0-12 open \"a\""
							]
						],
						[
							"<a href=x/>",
							[
								"attribute 3-9 \"href\" 8-9",
								"element 0-11 closed \"a\""
							]
						],
						[
							"<div><b></div>",
							[
								"element 0-14 open \"div\"",
								"element 5-8 open \"b\""
							]
						],
						[
							"<div><br></div>",
							[
								"element 0-15 open \"div\"",
								"element 5-9 open \"br\""
							]
						],
						[
							"<input disabled><p/ >",
							[
								"attribute 7-15 \"disabled\" true",
								"element 0-16 open \"input\"",
								"element 16-19 closed \"p\""
							]
						],
						[
							"<p /b>",
							[
								"attribute 4-5 \"b\" true",
								"element 0-6 open \"p\""
							]
						],
						[
							"<p\" @* c *@ \"><b/>",
							[
								"element 0-18 open \"p\"",
								"element 14-18 closed \"b\""
							]
						],
						[
							"<p\"abc",
							[ "element 0-6 open \"p\"" ]
						],
						[
							"<p @@x=\"y\">",
							[
								"attribute 4-10 \"@x\" 7-10",
								"element 0-11 open \"p\""
							]
						],
						[
							"<p @attrs @(cond ? \"x\" : \"\")>",
							[
								"element 0-29 open \"p\"",
								"script 10-28",
								"script 3-9",
								"string 19-22",
								"string 25-27"
							]
						],
						[
							"<p @onclick=\"x\" @bind-Value:event=\"y\">",
							[
								"element 0-38 open \"p\"",
								"script 16-21",
								"script 3-11"
							]
						],
						[
							"<p a/b c/>",
							[
								"attribute 3-6 \"a/b\" true",
								"attribute 7-8 \"c\" true",
								"element 0-10 closed \"p\""
							]
						],
						[
							"<p class=",
							[
								"attribute 3-9 \"class\" true",
								"element 0-9 open \"p\""
							]
						],
						[
							"<p class= x>",
							[
								"attribute 10-11 \"x\" true",
								"attribute 3-9 \"class\" true",
								"element 0-12 open \"p\""
							]
						],
						[
							"<p class=\"@(a ? \"b\" : \"c\") d\">",
							[
								"attribute 3-29 \"class\" 9-29",
								"element 0-30 open \"p\"",
								"script 10-26",
								"string 16-19",
								"string 22-25"
							]
						],
						[
							"<p class=\"@@a\">",
							[
								"attribute 3-14 \"class\" 9-14",
								"element 0-15 open \"p\""
							]
						],
						[
							"<p class=\"a @b\">@c.d</p>",
							[
								"attribute 3-15 \"class\" 9-15",
								"element 0-24 open \"p\"",
								"script 12-14",
								"script 16-20"
							]
						],
						[
							"<p class=\"x\" @* c *@ id=\"y\">",
							[
								"attribute 21-27 \"id\" 24-27",
								"attribute 3-12 \"class\" 9-12",
								"element 0-28 open \"p\""
							]
						],
						[
							"<p class='a'>",
							[
								"attribute 3-12 \"class\" 9-12",
								"element 0-13 open \"p\""
							]
						],
						[
							"<p class=@x>",
							[
								"attribute 3-11 \"class\" 9-11",
								"element 0-12 open \"p\"",
								"script 9-11"
							]
						],
						[
							"<p class=a\"b>",
							[
								"attribute 10-12 \"\\\"b\" true",
								"attribute 3-10 \"class\" 9-10",
								"element 0-13 open \"p\""
							]
						],
						[
							"<p></ >",
							[
								"element 0-7 open \"p\"",
								"element 3-7 close \"\""
							]
						],
						[
							"<p>@",
							[
								"element 0-4 open \"p\"",
								"script 3-4"
							]
						],
						[
							"<p>@(a</p>",
							[
								"element 0-10 open \"p\"",
								"script 3-6"
							]
						],
						[
							"<p>@a(b</p>",
							[
								"element 0-11 open \"p\"",
								"script 3-7"
							]
						],
						[
							"<p>@a?</p>",
							[
								"element 0-10 open \"p\"",
								"script 3-5"
							]
						],
						[
							"<p>a<p>b</p>",
							[
								"element 0-12 open \"p\"",
								"element 4-12 open \"p\""
							]
						],
						[
							"<pre>\nTitle\n=======\n@Model.Body</pre>",
							[
								"element 0-37 open \"pre\"",
								"script 20-31"
							]
						],
						[
							"<p class=\"é\">",
							[
								"attribute 3-12 \"class\" 9-12",
								"element 0-13 open \"p\""
							]
						],
						[
							"<script a=@{ }\n> x",
							[
								"attribute 8-14 \"a\" 10-14",
								"element 0-17 open \"script\"",
								"script 10-14"
							]
						],
						[
							"<script a=@{ }\n>@@ x",
							[
								"attribute 8-14 \"a\" 10-14",
								"element 0-17 open \"script\"",
								"script 10-14"
							]
						],
						[
							"<script src=\"a\" /><p class=\"b\"></p></script>",
							[
								"attribute 8-15 \"src\" 12-15",
								"element 0-44 closed \"script\""
							]
						],
						[
							"<script type=\"\"><p></p></script>",
							[
								"attribute 8-15 \"type\" 13-15",
								"element 0-32 open \"script\""
							]
						],
						[
							"<script type=\"text/html\"><p class=\"a\"></p></script>",
							[
								"attribute 28-37 \"class\" 34-37",
								"attribute 8-24 \"type\" 13-24",
								"element 0-51 open \"script\"",
								"element 25-42 open \"p\""
							]
						],
						[
							"<script type=text/html><p></p></script>",
							[
								"attribute 8-22 \"type\" 13-22",
								"element 0-39 open \"script\"",
								"element 23-30 open \"p\""
							]
						],
						[
							"<script typex=\"text/html\"><p></p></script>",
							[
								"attribute 8-25 \"typex\" 14-25",
								"element 0-42 open \"script\""
							]
						],
						[
							"<script>@**@\n",
							[
								"comment 8-12",
								"element 0-13 open \"script\""
							]
						],
						[
							"x<script>@**@\n",
							[
								"comment 9-13",
								"element 1-13 open \"script\""
							]
						],
						[
							"<p></p><script>@**@\n",
							[
								"comment 15-19",
								"element 0-7 open \"p\"",
								"element 7-20 open \"script\""
							]
						],
						[
							"<)<script>@**@\n",
							[
								"comment 10-14",
								"element 0-15 open \")\"",
								"element 2-15 open \"script\""
							]
						],
						[
							"<<script>@**@\n",
							[
								"comment 9-13",
								"element 0-1 open \"\"",
								"element 1-14 open \"script\""
							]
						],
						[
							"<p a=b><script>@**@\n",
							[
								"attribute 3-6 \"a\" 5-6",
								"comment 15-19",
								"element 0-20 open \"p\"",
								"element 7-19 open \"script\""
							]
						],
						[
							"<p>x</p><script>@**@\n",
							[
								"comment 16-20",
								"element 0-8 open \"p\"",
								"element 8-20 open \"script\""
							]
						],
						[
							"<script>a@**@\n",
							[
								"comment 9-13",
								"element 0-13 open \"script\""
							]
						],
						[
							"<script><b></b> @**@ \nx",
							[
								"comment 16-20",
								"element 0-20 open \"script\""
							]
						],
						[
							"<script>\n @* c *@\nx",
							[
								"comment 10-17",
								"element 0-18 open \"script\""
							]
						],
						[
							"<script>@{}\n@@@b@@@x ",
							[
								"element 0-21 open \"script\"",
								"script 14-16",
								"script 18-20",
								"script 8-11"
							]
						],
						[
							"<script>@{ }\n@@ x",
							[
								"element 0-14 open \"script\"",
								"script 8-12"
							]
						],
						[
							"<script>@{ }\n\n@@ x",
							[
								"element 0-15 open \"script\"",
								"script 8-12"
							]
						],
						[
							"<script>a</script <p>",
							[
								"element 0-18 open \"script\"",
								"element 18-21 open \"p\""
							]
						],
						[
							"<script>var a = \"<p>\"; @x</script><p/>",
							[
								"element 0-34 open \"script\"",
								"element 34-38 closed \"p\"",
								"script 23-25"
							]
						],
						[
							"<script>x",
							[ "element 0-8 open \"script\"" ]
						],
						[
							"<style>@@media x { .a { } }</style>",
							[ "element 0-35 open \"style\"" ]
						],
						[
							"<textarea><p></p></textarea>",
							[
								"element 0-28 open \"textarea\"",
								"element 10-17 open \"p\""
							]
						],
						[
							"<ul>@foreach (var i in l) { <li>@i</li> }</ul>",
							[
								"element 0-46 open \"ul\"",
								"element 28-39 open \"li\"",
								"script 32-34",
								"script 4-41"
							]
						],
						[
							"=======\n@x <p/>",
							[
								"element 11-15 closed \"p\"",
								"script 8-10"
							]
						],
						[
							"@(\"\"\"",
							[ "script 0-5", "string 2-5" ]
						],
						[
							"@(\"\\x",
							[ "script 0-5", "string 2-5" ]
						],
						[
							"@(\"\\x4a\\u0042\\U00000043\\\"d\" + \"\"\"\n  a\n  \"\"\" + \"\"\"\na\nb\"\"\"x\n\"\"\")",
							[
								"script 0-62",
								"string 2-27",
								"string 30-43",
								"string 46-56",
								"string 58-62"
							]
						],
						[
							"@(\"a\" + @\"b\"\"c\" + $\"d{e}f\" + $@\"g{h}\" + "
										+ "\"\"\"i\"\"\" + $$\"\"\"j{{k}}\"\"\" + \"l\"u8 + 'm')",
							[
								"script 0-79",
								"string 19-26",
								"string 2-5",
								"string 31-37",
								"string 40-47",
								"string 52-64",
								"string 67-70",
								"string 9-15"
							]
						],
						[
							"@(\"a\\",
							[ "script 0-5", "string 2-5" ]
						],
						[
							"@($\"\" + @$$\"{{x}}\" + $$\"{{x}}\" + $\"\"\"\n  {a}\n  \"\"\" + $\"\"\"\n\"\"\" + $\"\"\"a\"\"b\"\"\" + "
										+ "$\"a}}b\" + $\"a}b\" + $\"\"\"a}b\"\"\" + $$\"\"\"a}b\"\"\" + $\"a{{b\" + $\"\"\"{{a}}\"\"\" + "
										+ "$$\"\"\"{{a}\"\"\" + $$\"\"\"{a}\"\"\" + $\"\\}\" + $\"a\\nb\" + $\"\"\"\na\"\"\"\n)",
							[
								"script 0-206",
								"string 11-18",
								"string 111-120",
								"string 124-130",
								"string 134-145",
								"string 150-160",
								"string 165-174",
								"string 178-182",
								"string 186-192",
								"string 196-204",
								"string 23-30",
								"string 3-5",
								"string 34-49",
								"string 53-60",
								"string 64-74",
								"string 78-84",
								"string 88-93",
								"string 97-106"
							]
						],
						[
							"@($\"\"\"",
							[ "script 0-6", "string 3-6" ]
						],
						[
							"@($\"\"\"\na",
							[ "script 0-8", "string 3-8" ]
						],
						[
							"@($\"\"\"a",
							[ "script 0-7", "string 3-7" ]
						],
						[
							"@($\"\"\"a\n<p/>",
							[
								"element 8-12 closed \"p\"",
								"script 0-7",
								"string 3-7"
							]
						],
						[
							"@($\"\\{\" ",
							[ "script 0-7", "string 3-7" ]
						],
						[
							"@($\"\\{{\" ",
							[ "script 0-8", "string 3-8" ]
						],
						[
							"@($\"{#}\" + $\"{a)}\" + $\"{a ? \"b\" : 'c'}\" + $\"{#\"x\"}\" + 1)",
							[
								"script 0-56",
								"string 12-18",
								"string 22-39",
								"string 3-8",
								"string 43-47",
								"string 48-51"
							]
						],
						[
							"@($\"{$\"a\"}\" + $\"{$@\"b\"}\" + $\"{$$\"\"\"c\"\"\"}\" + $\"{@\"a\"}{@$\"b\"}{a @* c *@}{@a}\" + "
										+ "$\"{a // c\n}\" + $\"{a /* } */}\" + $\"{new { A = 1 }}{f(a)}{a[0]}{f(a}\")",
							[
								"script 0-146",
								"string 111-145",
								"string 15-24",
								"string 28-41",
								"string 3-11",
								"string 45-75",
								"string 79-90",
								"string 94-107"
							]
						],
						[
							"@($\"{'}'}\")",
							[ "script 0-11", "string 3-10" ]
						],
						[
							"@($\"{@* c\")",
							[ "script 0-11", "string 3-11" ]
						],
						[
							"@($\"{a",
							[ "script 0-6", "string 3-6" ]
						],
						[
							"@($\"{a /* x\")",
							[ "script 0-13", "string 3-13" ]
						],
						[
							"@($\"{a\" + 1)",
							[ "script 0-12", "string 3-12" ]
						],
						[
							"@($\"{x:N",
							[ "script 0-8", "string 3-8" ]
						],
						[
							"@($\"{x:N2}\" + $\"{x:\\\"}\" + $@\"{x:\"\"}\" + $\"{x:{}\" + $\"{x:a\" + 1)",
							[
								"script 0-62",
								"string 15-23",
								"string 28-36",
								"string 3-11",
								"string 40-47",
								"string 51-57"
							]
						],
						[
							"@($$\"\"\"{{a\"\"\")",
							[ "script 0-14", "string 4-14" ]
						],
						[
							"@(a < @@b <p/>",
							[
								"element 10-14 closed \"p\"",
								"script 0-9"
							]
						],
						[
							"@(a @* ) *@ + b)<p/>",
							[
								"element 16-20 closed \"p\"",
								"script 0-16"
							]
						],
						[
							"@(a) @(a <p>b</p>",
							[
								"element 9-17 open \"p\"",
								"script 0-4",
								"script 5-8"
							]
						],
						[
							"@(a\u{1f600})<p/>",
							[
								"element 6-10 closed \"p\"",
								"script 0-6"
							]
						],
						[
							"@* c *@<p/>",
							[
								"comment 0-7",
								"element 7-11 closed \"p\""
							]
						],
						[
							"@@x <p>@@y</p>",
							[ "element 4-14 open \"p\"" ]
						],
						[
							"@a.b()\n<<<<<<< HEAD\n<p/>",
							[
								"attribute 15-19 \"HEAD\" true",
								"element 10-11 open \"\"",
								"element 11-12 open \"\"",
								"element 12-13 open \"\"",
								"element 13-20 open \"\"",
								"element 20-24 closed \"p\"",
								"element 7-8 open \"\"",
								"element 8-9 open \"\"",
								"element 9-10 open \"\"",
								"script 0-6"
							]
						],
						[
							"@a.b.c @a.b. @a(b).c[d] @a?.b @a!.b @a<b>() @await Foo() @a-b",
							[
								"element 38-61 open \"b\"",
								"script 0-6",
								"script 13-23",
								"script 24-29",
								"script 30-35",
								"script 36-38",
								"script 44-56",
								"script 57-59",
								"script 7-11"
							]
						],
						[
							"@a?[0].b @a!?.b @a![0] @a!(b)",
							[
								"script 0-8",
								"script 16-22",
								"script 23-29",
								"script 9-15"
							]
						],
						[
							"@addTagHelper\n<p/>",
							[
								"element 14-18 closed \"p\"",
								"script 0-13"
							]
						],
						[
							"@attribute [A\n<p/>",
							[ "script 0-18" ]
						],
						[
							"@attribute x\n<p/>",
							[
								"element 13-17 closed \"p\"",
								"script 0-10"
							]
						],
						[
							"@do { <p/> } <b/>",
							[
								"element 13-17 closed \"b\"",
								"element 6-10 closed \"p\"",
								"script 0-12"
							]
						],
						[
							"@do { } while (a) <p/>",
							[
								"element 18-22 closed \"p\"",
								"script 0-17"
							]
						],
						[
							"@for (var i = 0; i < n; i++) { <p/> } @while (a) { <b/> } @do { <i/> } while (a);",
							[
								"element 31-35 closed \"p\"",
								"element 51-55 closed \"b\"",
								"element 64-68 closed \"i\"",
								"script 0-37",
								"script 38-57",
								"script 58-81"
							]
						],
						[ "@functions", [ "script 0-10" ] ],
						[
							"@functions { void M() { <p/> } }",
							[
								"element 24-28 closed \"p\"",
								"script 0-32"
							]
						],
						[
							"@helper x @class",
							[ "script 0-7", "script 10-16" ]
						],
						[ "@if (a)", [ "script 0-7" ] ],
						[
							"@if (a) @@b @while (c) { }",
							[ "script 0-11", "script 12-26" ]
						],
						[
							"@if (a) { <p class=\"",
							[
								"attribute 13-20 \"class\" 19-20",
								"element 10-20 open \"p\"",
								"script 0-20"
							]
						],
						[
							"@if (a) { <p/> } else if (b) { <b/> } else { <i/> }",
							[
								"element 10-14 closed \"p\"",
								"element 31-35 closed \"b\"",
								"element 45-49 closed \"i\"",
								"script 0-51"
							]
						],
						[
							"@if (a) { } @* c *@ else { <p/> } @try { } @* c *@ catch (E) { } @* d *@ finally { <b/> } "
										+ "@do { } @* c *@ while (a); @if (a) { } @* c *@ <i/>",
							[
								"element 137-141 closed \"i\"",
								"element 27-31 closed \"p\"",
								"element 83-87 closed \"b\"",
								"script 0-33",
								"script 117-136",
								"script 34-89",
								"script 90-116"
							]
						],
						[
							"@if (a) { } else",
							[ "script 0-16" ]
						],
						[
							"@if(@</>\n<",
							[
								"element 5-8 close \"\"",
								"script 0-10"
							]
						],
						[
							"@inject IFoo 1\n<p/>",
							[
								"element 15-19 closed \"p\"",
								"script 0-12"
							]
						],
						[ "@model", [ "script 0-6" ] ],
						[
							"@model (1, 2)\n@model global::\n<p/>",
							[
								"element 30-34 closed \"p\"",
								"script 0-8",
								"script 14-29"
							]
						],
						[
							"@model (int, string)\n@inherits ( int a , string b )\n@implements global::System.String\n"
										+ "@inject int [] A\n@inject int[][,] B\n@inject int ? C\n@inject int? D\n<p/>",
							[
								"element 153-157 closed \"p\"",
								"script 0-20",
								"script 103-121",
								"script 122-137",
								"script 138-152",
								"script 21-51",
								"script 52-85",
								"script 86-102"
							]
						],
						[
							"@model 1\n<p/>",
							[
								"element 9-13 closed \"p\"",
								"script 0-6"
							]
						],
						[
							"@model A b\n<p/>",
							[
								"element 11-15 closed \"p\"",
								"script 0-8"
							]
						],
						[
							"@model List<A",
							[ "script 0-13" ]
						],
						[
							"@model List<Foo>\n<p/>",
							[
								"element 17-21 closed \"p\"",
								"script 0-16"
							]
						],
						[
							"@model int[\n<p/>",
							[ "script 0-16" ]
						],
						[ "@model(A)", [ "script 0-6" ] ],
						[
							"@model A\n<p/>",
							[
								"element 9-13 closed \"p\"",
								"script 0-8"
							]
						],
						[
							"@namespace 1\n<p/>",
							[
								"element 13-17 closed \"p\"",
								"script 0-10"
							]
						],
						[
							"@namespace A.\n<p/>",
							[
								"element 14-18 closed \"p\"",
								"script 0-10"
							]
						],
						[
							"@page \"/x\"\n@inject IFoo Foo\n@attribute [A(\"x\")]\n"
										+ "@namespace A.B\n@addTagHelper *, A\n<p/>",
							[
								"element 82-86 closed \"p\"",
								"script 0-10",
								"script 11-27",
								"script 28-47",
								"script 48-62",
								"script 63-81",
								"string 42-45",
								"string 6-10"
							]
						],
						[
							"@section S { <div>x",
							[
								"element 13-18 open \"div\"",
								"script 0-19"
							]
						],
						[
							"@section S { <p/> @if (a) { <b class=\"c\"/> } }",
							[
								"attribute 31-40 \"class\" 37-40",
								"element 13-17 closed \"p\"",
								"element 28-42 closed \"b\"",
								"script 0-46"
							]
						],
						[
							"@section S { <p>@x",
							[
								"element 13-18 open \"p\"",
								"script 0-18",
								"script 16-18"
							]
						],
						[
							"@section S { a{b} <p/> }",
							[
								"element 18-22 closed \"p\"",
								"script 0-24"
							]
						],
						[
							"@section S {<a<?x?>}\n<p/>",
							[
								"element 12-14 open \"a\"",
								"element 21-25 closed \"p\"",
								"script 0-20"
							]
						],
						[
							"@switch (a) { case (1, 2): <p/> break; case { A: 1 }: <b/> break; case [1]: <i/> break; }",
							[
								"element 27-31 closed \"p\"",
								"element 54-58 closed \"b\"",
								"element 76-80 closed \"i\"",
								"script 0-89"
							]
						],
						[
							"@switch (a) { case 1 }",
							[ "script 0-22" ]
						],
						[
							"@switch (a) { case 1: <p/> break; default: <b/> break; }",
							[
								"element 22-26 closed \"p\"",
								"element 43-47 closed \"b\"",
								"script 0-56"
							]
						],
						[
							"@tagHelperPrefix",
							[ "script 0-16" ]
						],
						[
							"@try { <p/> } catch (E e) when (x) { <b/> } finally { <i/> }",
							[
								"element 37-41 closed \"b\"",
								"element 54-58 closed \"i\"",
								"element 7-11 closed \"p\"",
								"script 0-60"
							]
						],
						[
							"@try { <p/> } catch { <b/> }",
							[
								"element 22-26 closed \"b\"",
								"element 7-11 closed \"p\"",
								"script 0-28"
							]
						],
						[
							"@try { } catch (E\n@try { } catch (E) when (x\n<p/>",
							[
								"element 45-49 closed \"p\"",
								"script 0-17",
								"script 18-44"
							]
						],
						[
							"@using (a\n<p/>",
							[
								"element 10-14 closed \"p\"",
								"script 0-9"
							]
						],
						[
							"@using (a) { <p/> } @lock (a) { <b/> }",
							[
								"element 13-17 closed \"p\"",
								"element 32-36 closed \"b\"",
								"script 0-19",
								"script 20-38"
							]
						],
						[
							"@using System.Linq\n<p/>",
							[
								"element 19-23 closed \"p\"",
								"script 0-18"
							]
						],
						[
							"@using static System.Math;\n@using A = B<C>;\n@using global::System\n@{ using X; }\n@using 1",
							[
								"script 0-26",
								"script 27-43",
								"script 44-65",
								"script 66-79",
								"script 80-86"
							]
						],
						[
							"@{\n\t#region a\n\t#if false\n\t<a/>\n\t#endif\n\t<p/>\n\t#endregion\n}",
							[
								"element 40-44 closed \"p\"",
								"script 0-58"
							]
						],
						[
							"@{\n#if DEBUG\n<p/>\n#else\n<b/>\n#endif\n}",
							[
								"element 24-28 closed \"b\"",
								"script 0-37"
							]
						],
						[
							"@{\n#if false\n<a/>",
							[ "script 0-17" ]
						],
						[ "@{ ", [ "script 0-2" ] ],
						[
							"@{ // c <p>\n <b/> /* <i> */ <u/> }",
							[
								"element 13-17 closed \"b\"",
								"element 28-32 closed \"u\"",
								"script 0-34"
							]
						],
						[
							"@{ <!-- c --> <p/> }",
							[
								"element 14-18 closed \"p\"",
								"script 0-20"
							]
						],
						[
							"@{ <br> <p/> }",
							[
								"element 3-7 open \"br\"",
								"element 8-12 closed \"p\"",
								"script 0-14"
							]
						],
						[
							"@{ <br></br> }",
							[
								"element 3-12 open \"br\"",
								"script 0-14"
							]
						],
						[
							"@{ <div><b></i> }",
							[
								"element 11-15 close \"i\"",
								"element 3-15 open \"div\"",
								"element 8-15 open \"b\"",
								"script 0-17"
							]
						],
						[
							"@{ <p",
							[
								"element 3-5 open \"p\"",
								"script 0-5"
							]
						],
						[
							"@{ <p>unclosed }",
							[
								"element 3-16 open \"p\"",
								"script 0-16"
							]
						],
						[
							"@{ <text >a</text> }",
							[
								"element 3-18 open \"text\"",
								"script 0-20"
							]
						],
						[
							"@{ <text a\n b</text> }",
							[
								"element 3-20 open \"text\"",
								"script 0-22"
							]
						],
						[
							"@{ <text a>b</text> }",
							[
								"element 3-19 open \"text\"",
								"script 0-21"
							]
						],
						[
							"@{ <text/> }",
							[
								"element 3-10 closed \"text\"",
								"script 0-12"
							]
						],
						[
							"@{ <text>a</text x\n<p/> }",
							[
								"element 19-23 closed \"p\"",
								"element 3-18 open \"text\"",
								"script 0-25"
							]
						],
						[
							"@{ <text>a</text x> }",
							[
								"element 3-19 open \"text\"",
								"script 0-21"
							]
						],
						[
							"@{ <text>t</text> } @{ @: a @b\n}",
							[
								"element 3-17 open \"text\"",
								"script 0-19",
								"script 20-32"
							]
						],
						[
							"@{ @* c *@ <p/> }",
							[
								"element 11-15 closed \"p\"",
								"script 0-17"
							]
						],
						[
							"@{ @: @(\"a\")\n}",
							[ "script 0-14", "string 8-11" ]
						],
						[ "@{ @: a", [ "script 0-7" ] ],
						[
							"@{ @<p/> }",
							[
								"element 4-8 closed \"p\"",
								"script 0-10"
							]
						],
						[
							"@{ @a.<p/> }",
							[
								"element 6-10 closed \"p\"",
								"script 0-12"
							]
						],
						[
							"@{ @if (a) { <p/> }\n}",
							[
								"element 13-17 closed \"p\"",
								"script 0-21"
							]
						],
						[
							"@{ @{ } <p/> }",
							[
								"element 8-12 closed \"p\"",
								"script 0-14"
							]
						],
						[
							"@{ Func<int, object> f = @<p>@item</p>; }",
							[
								"element 26-38 open \"p\"",
								"script 0-41",
								"script 29-34"
							]
						],
						[
							"@{ List<int> a = new(); <p/> }",
							[
								"element 24-28 closed \"p\"",
								"script 0-30"
							]
						],
						[
							"@{ a <b/> c",
							[
								"element 5-9 closed \"b\"",
								"script 0-11"
							]
						],
						[
							"@{ a @* c *@ b; <p/> }",
							[
								"element 16-20 closed \"p\"",
								"script 0-22"
							]
						],
						[
							"@{ a @; <p/> }",
							[
								"element 8-12 closed \"p\"",
								"script 0-14"
							]
						],
						[
							"@{ a @@b; <p/> }",
							[
								"element 10-14 closed \"p\"",
								"script 0-16"
							]
						],
						[
							"@{ a @b; <p/> }",
							[
								"element 9-13 closed \"p\"",
								"script 0-15"
							]
						],
						[
							"@{ a(b <p/> }",
							[
								"element 7-11 closed \"p\"",
								"script 0-13"
							]
						],
						[ "@{ a(b)", [ "script 0-7" ] ],
						[
							"@{ await Foo(); <p/> } @await foreach (var x in y) { <b/> }",
							[
								"element 16-20 closed \"p\"",
								"element 53-57 closed \"b\"",
								"script 0-22",
								"script 23-59"
							]
						],
						[
							"@{ i--; j -= 1; k = p->x; <p/> }",
							[
								"element 26-30 closed \"p\"",
								"script 0-32"
							]
						],
						[ "@{ var", [ "script 0-6" ] ],
						[
							"@{ var a = \"x\"; <p>@a</p> }",
							[
								"element 16-25 open \"p\"",
								"script 0-27",
								"script 19-21",
								"string 11-14"
							]
						],
						[
							"@{ var a = $@x; <p/> }",
							[
								"element 16-20 closed \"p\"",
								"script 0-22"
							]
						],
						[
							"@{ var a = 1;\n=======\r\nvar b = \"x;\r\n>>>>>>> b\r\n}<p/>",
							[
								"element 48-52 closed \"p\"",
								"script 0-48"
							]
						],
						[
							"@{ var s = \"\"\"\na\"b\n\"\"\"; var t = \"\"\"a\"b\"\"\"; <p/> }",
							[
								"element 43-47 closed \"p\"",
								"script 0-49",
								"string 11-22",
								"string 32-41"
							]
						],
						[
							"@{ var s = \"\"\"\nabc",
							[ "script 0-18", "string 11-18" ]
						],
						[
							"@{ var s = $\"\"\"\n  a\n  b {c}\n  \"\"\" + $@\"a\"\"b{c}\"; <p/> }",
							[
								"element 49-53 closed \"p\"",
								"script 0-55",
								"string 12-33",
								"string 38-47"
							]
						],
						[
							"@{ var s = $\"x\\{y\"; <p/> }",
							[
								"element 20-24 closed \"p\"",
								"script 0-26",
								"string 12-18"
							]
						],
						[
							"@{ var x = y switch { 1 => \"a\", _ => \"b\" }; <p/> }",
							[
								"element 44-48 closed \"p\"",
								"script 0-50",
								"string 27-30",
								"string 37-40"
							]
						],
						[
							"@{ var x = y switch { 1 => 2 <p/>",
							[
								"element 29-33 closed \"p\"",
								"script 0-33"
							]
						],
						[
							"@{ }\n@* c *@<p/>",
							[
								"comment 5-12",
								"element 12-16 closed \"p\"",
								"script 0-4"
							]
						],
						[
							"@{ }\n@x <p/>",
							[
								"element 8-12 closed \"p\"",
								"script 0-4",
								"script 5-7"
							]
						],
						[ "a@", [ "script 1-2" ] ],
						[
							"a@b.com <p>x@y @z</p>",
							[
								"element 8-21 open \"p\"",
								"script 15-17"
							]
						],
						[
							"|||||||\n@x <p/>",
							[
								"element 11-15 closed \"p\"",
								"script 8-10"
							]
						],
						[
							"<script>@{ }\n@@@x y",
							[
								"element 0-18 open \"script\"",
								"script 15-17",
								"script 8-12"
							]
						],
						[
							"<script a=@{ }\n>> x",
							[
								"attribute 8-14 \"a\" 10-14",
								"element 0-16 open \"script\"",
								"script 10-14"
							]
						],
						[
							"<script a=@{ }\n> @@@x y",
							[
								"attribute 8-14 \"a\" 10-14",
								"element 0-22 open \"script\"",
								"script 10-14",
								"script 19-21"
							]
						],
						[
							"<script>@{ }\n@@@x) y",
							[
								"element 0-17 open \"script\"",
								"script 15-17",
								"script 8-12"
							]
						],
						[
							"<script>@{ }\n@@@*c*@ y",
							[
								"comment 15-20",
								"element 0-21 open \"script\"",
								"script 8-12"
							]
						],
						[
							"<script>@{ }\n@@@ y",
							[
								"element 0-17 open \"script\"",
								"script 15-16",
								"script 8-12"
							]
						],
						[
							"<script>@{ }\n@@@@@x y",
							[
								"element 0-20 open \"script\"",
								"script 17-19",
								"script 8-12"
							]
						],
						[
							"<script>@{ }\n@@ y",
							[
								"element 0-14 open \"script\"",
								"script 8-12"
							]
						],
						[
							"@a\\u62c(\"x\")",
							[ "script 0-12", "string 8-11" ]
						],
						[
							"@a\\ux\\U12345678(\"x\")",
							[ "script 0-20", "string 16-19" ]
						],
						[
							"@a\\Uff(\"x\")",
							[ "script 0-11", "string 7-10" ]
						],
						[ "@a\\x(\"x\")", [ "script 0-2" ] ],
						[
							"@a\\u12(\"x\")",
							[ "script 0-2" ]
						],
						[
							"@a\\U1234567(\"x\")",
							[ "script 0-2" ]
						]
					]
				)(
					"%j",
					(source, expected) => {
						expect(
							razor_items(source, parseRazor)
						).toStrictEqual(expected)
					}
				)
			}
		)
		describe(
			"attributes",
			() => {
				it(
					"keeps C# expressions with quotes inside quoted values",
					() => {
						expect(
							razor(
								"<p class=\"btn @(active ? \"on\" : \"off\")\">x</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"btn @(active ? \"on\" : \"off\")\">x</p>",
										"p",
										"open",
										[
											attribute_node(
												"class=\"btn @(active ? \"on\" : \"off\")\"",
												"class",
												string_node(
													"\"btn @(active ? \"on\" : \"off\")\"",
													"double",
													[
														razor_node(
															"@(active ? \"on\" : \"off\")",
															[
																string_node("\"on\"", "double"),
																string_node("\"off\"", "double")
															]
														)
													]
												)
											)
										],
										[ text_node("x") ]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses C# in the attribute area of views and unquoted code values",
					() => {
						expect(
							razor("<p @attrs class=@cls id= x>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p @attrs class=@cls id= x>",
										"p",
										"open",
										[
											attribute_node("@attrs", "", razor_node("@attrs")),
											attribute_node(
												"class=@cls",
												"class",
												string_node(
													"@cls",
													"unquoted",
													[ razor_node("@cls") ]
												)
											),
											attribute_node("id=", "id"),
											attribute_node("x", "x")
										]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		describe(
			"code",
			() => {
				it(
					"collects C# string literals with interpolation holes",
					() => {
						expect(
							razor(
								"@($\"btn btn-{size}\" + @\"a\"\"b\" + \"\"\"raw\"\"\")"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@($\"btn btn-{size}\" + @\"a\"\"b\" + \"\"\"raw\"\"\")",
										[
											string_node(
												"\"btn btn-{size}\"",
												"double",
												[ razor_node("{size}") ]
											),
											string_node("\"a\"\"b\"", "double"),
											string_node("\"\"\"raw\"\"\"", "double")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"continues a /// documentation comment through the newline after its last /// line",
					() => {
						expect(
							razor(
								"@addTagHelper *, A /// x\n/// y\n<p/>\n<b/>\n@addTagHelper *, B /// z\n//// w\n<i/>\n@addTagHelper *, C /// v"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@addTagHelper *, A /// x\n/// y\n<p/>"
									),
									text_node("\n"),
									element_node("<b/>", "b", "closed"),
									text_node("\n"),
									razor_node(
										"@addTagHelper *, B /// z\n//// w"
									),
									text_node("\n"),
									element_node("<i/>", "i", "closed"),
									text_node("\n"),
									razor_node("@addTagHelper *, C /// v")
								],
								errors: []
							}
						)
					}
				)
				it(
					"disables #if branches whose condition is false, skipping nested #if blocks",
					() => {
						expect(
							razor(
								"@{\n#if false\n<a/>\n#if true\n<b/>\n#endif\n#elif false\n<i/>\n#elif true\n<p/>\n"
									+ "#if true\n#elif true\n<s/>\n#endif\n#else\n<u/>\n#endif\n}"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{\n#if false\n<a/>\n#if true\n<b/>\n#endif\n#elif false\n<i/>\n#elif true\n<p/>\n"
											+ "#if true\n#elif true\n<s/>\n#endif\n#else\n<u/>\n#endif\n}",
										[],
										[
											element_node("<p/>", "p", "closed")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"disables conflict sections up to the >>>>>>> marker, or to the end without one",
					() => {
						expect(
							razor(
								"@{ var a = 1;\n|||||||\nvar b = \"x;\n=======\nvar c = \"y;\n>>>>>>> b\n}<p/>"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{ var a = 1;\n|||||||\nvar b = \"x;\n=======\nvar c = \"y;\n>>>>>>> b\n}"
									),
									element_node("<p/>", "p", "closed")
								],
								errors: []
							}
						)
						expect(
							razor(
								"@{ var a = 1;\n=======\nvar b = \"x;\n}<p/>"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{ var a = 1;\n=======\nvar b = \"x;\n}<p/>"
									)
								],
								errors: [
									{
										end: 39,
										message: "The code block is missing a closing \"}\".",
										start: 1
									}
								]
							}
						)
					}
				)
				it(
					"does not read the format clause of a hole as strings",
					() => {
						expect(
							razor(
								"@($@\"{x:\"\"}\" + $$\"\"\"{{y:N2}}\"\"\")"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@($@\"{x:\"\"}\" + $$\"\"\"{{y:N2}}\"\"\")",
										[
											string_node(
												"\"{x:\"\"}\"",
												"double",
												[ razor_node("{x:\"\"}") ]
											),
											string_node(
												"\"\"\"{{y:N2}}\"\"\"",
												"double",
												[ razor_node("{{y:N2}}") ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends a code block at the end of the text after a switch without a body",
					() => {
						expect(razor("@{ var x = y switch")).toStrictEqual(
							{
								ast: [
									razor_node("@{ var x = y switch")
								],
								errors: [
									{
										end: 19,
										message: "The code block is missing a closing \"}\".",
										start: 1
									}
								]
							}
						)
					}
				)
				it(
					"ends an implicit expression before a trailing punctuation mark",
					() => {
						expect(razor("<p>@user.Name!</p>")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>@user.Name!</p>",
										"p",
										"open",
										[],
										[
											razor_node("@user.Name"),
											text_node("!")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"ends an unclosed explicit expression at a tag, not at <=, << or <<=",
					() => {
						expect(
							razor("<p>@(a <= b <<= c << d</p>")
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>@(a <= b <<= c << d</p>",
										"p",
										"open",
										[],
										[
											razor_node("@(a <= b <<= c << d")
										]
									)
								],
								errors: [
									{
										end: 22,
										message: "The explicit expression is missing a closing \")\".",
										start: 4
									}
								]
							}
						)
					}
				)
				it(
					"evaluates #if conditions with operators and parentheses, with every symbol undefined",
					() => {
						expect(
							razor(
								"@{\n#if !(true || DEBUG) && true\n<a/>\n#elif true == false || true != false\n<p/>\n#endif\n"
									+ "#if\n<b/>\n#endif\n}"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{\n#if !(true || DEBUG) && true\n<a/>\n#elif true == false || true != false\n<p/>\n#endif\n"
											+ "#if\n<b/>\n#endif\n}",
										[],
										[
											element_node("<p/>", "p", "closed")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"finds markup at statement starts in control flow blocks",
					() => {
						expect(
							razor(
								"<ul>@foreach (var item in items) { <li class=\"item\">@item</li> }</ul>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<ul>@foreach (var item in items) { <li class=\"item\">@item</li> }</ul>",
										"ul",
										"open",
										[],
										[
											razor_node(
												"@foreach (var item in items) { <li class=\"item\">@item</li> }",
												[],
												[
													element_node(
														"<li class=\"item\">@item</li>",
														"li",
														"open",
														[
															attribute_node(
																"class=\"item\"",
																"class",
																string_node("\"item\"", "double")
															)
														],
														[ razor_node("@item") ]
													)
												]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"hoists the elements of code inside a section into the section",
					() => {
						expect(
							razor(
								"@section S { <script src=\"a.js\"></script> @if (d) { <b class=\"x\"></b> } }"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@section S { <script src=\"a.js\"></script> @if (d) { <b class=\"x\"></b> } }",
										[],
										[
											element_node(
												"<script src=\"a.js\"></script>",
												"script",
												"open",
												[
													attribute_node(
														"src=\"a.js\"",
														"src",
														string_node("\"a.js\"", "double")
													)
												]
											),
											element_node(
												"<b class=\"x\"></b>",
												"b",
												"open",
												[
													attribute_node(
														"class=\"x\"",
														"class",
														string_node("\"x\"", "double")
													)
												]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps a number typed at the end of the text in its explicit expression",
					() => {
						expect(razor("@(1.")).toStrictEqual(
							{
								ast: [ razor_node("@(1.") ],
								errors: [
									{
										end: 4,
										message: "The explicit expression is missing a closing \")\".",
										start: 1
									}
								]
							}
						)
					}
				)
				it(
					"keeps an @ typed at the end of the text in the arguments of its implicit expression",
					() => {
						expect(razor("@a(@")).toStrictEqual(
							{
								ast: [ razor_node("@a(@") ],
								errors: [
									{
										end: 4,
										message: "Expected \")\".",
										start: 2
									}
								]
							}
						)
					}
				)
				it(
					"keeps an element typed at the end of the text in its script",
					() => {
						expect(razor("<p class=\"@(a ? \"b")).toStrictEqual(
							{
								ast: [
									element_node(
										"<p class=\"@(a ? \"b",
										"p",
										"open",
										[
											attribute_node(
												"class=\"@(a ? \"b",
												"class",
												string_node(
													"\"@(a ? \"b",
													"double",
													[
														razor_node(
															"@(a ? \"b",
															[ string_node("\"b", "double") ]
														)
													]
												)
											)
										]
									)
								],
								errors: [
									{
										end: 18,
										message: "The explicit expression is missing a closing \")\".",
										start: 11
									}
								]
							}
						)
					}
				)
				it(
					"keeps numeric literals and compound operators inside an explicit expression",
					() => {
						expect(
							razor(
								"@(n != 0 ? 1L + 2lu + 3u + 4UL + 0x1F + 0Xffu + 0b101 + 0B1L + 1.5 + .5f + 1e5 + 1E-5d + 1e+5m"
									+ " + a[1..5] + a[..2] : b ??= c ?? \"none\")"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@(n != 0 ? 1L + 2lu + 3u + 4UL + 0x1F + 0Xffu + 0b101 + 0B1L + 1.5 + .5f + 1e5 + 1E-5d + 1e+5m"
											+ " + a[1..5] + a[..2] : b ??= c ?? \"none\")",
										[
											string_node("\"none\"", "double")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads :: in the qualified names of directives and case labels",
					() => {
						expect(
							razor(
								"@model global::A.B\n@switch (a) { case global::A.C: <p/> break; }"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node("@model global::A.B"),
									text_node("\n"),
									razor_node(
										"@switch (a) { case global::A.C: <p/> break; }",
										[],
										[
											element_node("<p/>", "p", "closed")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads text tags and single-line markup in code blocks",
					() => {
						expect(
							razor(
								"@{ <text>@a</text> @: b @c\n}"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node(
										"@{ <text>@a</text> @: b @c\n}",
										[],
										[
											element_node(
												"<text>@a</text>",
												"text",
												"open",
												[],
												[ razor_node("@a") ]
											)
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reads unicode escapes inside identifiers",
					() => {
						expect(
							razor(
								"<p>@a\\u0062c(\"x\") @a\\u0020(\"y\")</p>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>@a\\u0062c(\"x\") @a\\u0020(\"y\")</p>",
										"p",
										"open",
										[],
										[
											razor_node(
												"@a\\u0062c(\"x\")",
												[ string_node("\"x\"", "double") ]
											),
											text_node(" "),
											razor_node("@a"),
											text_node("\\u0020(\"y\")")
										]
									)
								],
								errors: []
							}
						)
					}
				)
				it(
					"reports a unicode escape after @ over its escaped identifier, or over the backslash when invalid",
					() => {
						expect(
							razor(
								"<p>@\\u0061b @\\U00000031 @\\u00zz @\\U00110000</p>@\\u61"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<p>@\\u0061b @\\U00000031 @\\u00zz @\\U00110000</p>",
										"p",
										"open",
										[],
										[
											razor_node("@"),
											text_node("\\u0061b "),
											razor_node("@"),
											text_node("\\U00000031 "),
											razor_node("@"),
											text_node("\\u00zz "),
											razor_node("@"),
											text_node("\\U00110000")
										]
									),
									razor_node("@"),
									text_node("\\u61")
								],
								errors: [
									{
										end: 11,
										message: "Expected a code block, an expression or an identifier after \"@\".",
										start: 4
									},
									{
										end: 23,
										message: "Expected a code block, an expression or an identifier after \"@\".",
										start: 13
									},
									{
										end: 26,
										message: "Expected a code block, an expression or an identifier after \"@\".",
										start: 25
									},
									{
										end: 34,
										message: "Expected a code block, an expression or an identifier after \"@\".",
										start: 33
									},
									{
										end: 49,
										message: "Expected a code block, an expression or an identifier after \"@\".",
										start: 48
									}
								]
							}
						)
					}
				)
				it(
					"reports markup in single-line control flow statements",
					() => {
						expect(
							razor(
								"@if (a) @: x\n@if (b) @@y\n@if (c) <p/>"
							)
						).toStrictEqual(
							{
								ast: [
									razor_node("@if (a) @: x"),
									text_node("\n"),
									razor_node("@if (b) @@y"),
									text_node("\n"),
									razor_node(
										"@if (c) <p/>",
										[],
										[
											element_node("<p/>", "p", "closed")
										]
									)
								],
								errors: [
									{
										end: 9,
										message: "Single-line control flow statements cannot contain markup.",
										start: 8
									},
									{
										end: 22,
										message: "Single-line control flow statements cannot contain markup.",
										start: 21
									},
									{
										end: 34,
										message: "Single-line control flow statements cannot contain markup.",
										start: 33
									}
								]
							}
						)
					}
				)
			}
		)
		describe(
			"errors",
			() => {
				it.each(
					[
						[
							"<p/>@(",
							[
								{
									end: 6,
									message: "The explicit expression is missing a closing \")\".",
									start: 5
								}
							]
						],
						[
							"<p>@",
							[
								{
									end: 4,
									message: "Expected a code block, an expression or an identifier after \"@\".",
									start: 4
								}
							]
						],
						[
							"<p>@(a</p><p>@(b</p>",
							[
								{
									end: 6,
									message: "The explicit expression is missing a closing \")\".",
									start: 4
								},
								{
									end: 16,
									message: "The explicit expression is missing a closing \")\".",
									start: 14
								}
							]
						],
						[
							"<script>a</script <p>",
							[
								{
									end: 18,
									message: "The \"script\" end tag is not finished.",
									start: 9
								}
							]
						],
						[
							"@Html.Grid(@<p>@F(@<b/>)</p>)",
							[
								{
									end: 19,
									message: "Inline markup blocks cannot be nested.",
									start: 18
								}
							]
						],
						[
							"@a[0\n<p/>",
							[
								{
									end: 9,
									message: "Expected \"]\".",
									start: 2
								}
							]
						],
						[
							"@addTagHelper\n<p/>",
							[
								{
									end: 13,
									message: "The directive must have a value.",
									start: 1
								}
							]
						],
						[
							"@attribute x\n<p/>",
							[
								{
									end: 12,
									message: "The directive expects a C# attribute.",
									start: 11
								}
							]
						],
						[
							"@functions",
							[
								{
									end: 10,
									message: "Expected \"{\" after the directive.",
									start: 1
								}
							]
						],
						[
							"@if (",
							[
								{
									end: 5,
									message: "Expected \")\".",
									start: 4
								}
							]
						],
						[
							"@if (a\n<p/>",
							[
								{
									end: 11,
									message: "Expected \")\".",
									start: 4
								}
							]
						],
						[
							"@inject IFoo 1\n<p/>",
							[
								{
									end: 14,
									message: "The directive expects an identifier.",
									start: 13
								}
							]
						],
						[
							"@model",
							[
								{
									end: 6,
									message: "Unexpected end of file after the directive.",
									start: 1
								}
							]
						],
						[
							"@model 1\n<p/>",
							[
								{
									end: 8,
									message: "The directive expects a type name.",
									start: 7
								}
							]
						],
						[
							"@model A b\n<p/>",
							[
								{
									end: 10,
									message: "Unexpected text after the directive.",
									start: 9
								}
							]
						],
						[
							"@model(A)",
							[
								{
									end: 7,
									message: "Directive tokens must be separated by whitespace.",
									start: 6
								}
							]
						],
						[
							"@namespace 1\n<p/>",
							[
								{
									end: 12,
									message: "The directive expects a namespace name.",
									start: 11
								}
							]
						],
						[
							"@namespace A.\n<p/>",
							[
								{
									end: 12,
									message: "The directive expects a namespace name.",
									start: 11
								}
							]
						],
						[
							"@tagHelperPrefix",
							[
								{
									end: 16,
									message: "The directive must have a value.",
									start: 1
								}
							]
						],
						[
							"@{ <div><b></i> }",
							[
								{
									end: 15,
									message: "The \"div\" element is not closed.",
									start: 3
								}
							]
						],
						[
							"@{ <text a>b</text> }",
							[
								{
									end: 9,
									message: "The \"text\" tag cannot contain attributes.",
									start: 3
								}
							]
						],
						[
							"@{ <text>a</text x> }",
							[
								{
									end: 16,
									message: "The \"text\" tag cannot contain attributes.",
									start: 10
								}
							]
						],
						[
							"@{ @<p/> }",
							[
								{
									end: 4,
									message: "\"@\" in a code block must be followed by \":\", \"(\" or an identifier.",
									start: 3
								}
							]
						],
						[
							"@{ @{ } <p/> }",
							[
								{
									end: 5,
									message: "Unexpected \"{\" after \"@\" in a code block.",
									start: 3
								}
							]
						],
						[
							"@{ a <b/> c",
							[
								{
									end: 11,
									message: "The code block is missing a closing \"}\".",
									start: 1
								}
							]
						],
						[
							"@{ a @; <p/> }",
							[
								{
									end: 6,
									message: "\"@\" in a code block must be followed by \":\", \"(\" or an identifier.",
									start: 5
								}
							]
						]
					]
				)(
					"%j",
					(source, expected) => {
						expect(razor(source).errors).toStrictEqual(expected)
					}
				)
			}
		)
		describe(
			"frameworks",
			() => {
				it(
					"ASP.NET Core Razor Pages",
					() => {
						const result = razor(
							"@page\n@model IndexModel\n@{\n\tViewData[\"Title\"] = \"Home\";\n}\n"
								+ "<div class=\"text-center @(Model.Dark ? \"dark\" : \"light\")\">\n"
								+ "\t<h1 class=\"display-4\">@ViewData[\"Title\"]</h1>\n"
								+ "\t@foreach (var item in Model.Items)\n\t{\n\t\t<p class=\"item @item.Css\">@item.Name</p>\n"
								+ "\t}\n</div>\n"
								+ "@section Scripts {\n\t<script src=\"~/js/site.js\"></script>\n}"
						)
						expect(result.errors).toStrictEqual([])
						expect(element_names(result.ast)).toStrictEqual([ "div", "h1", "p", "script" ])
						expect(class_attributes(result.ast)).toStrictEqual(
							[
								"class=\"text-center @(Model.Dark ? \"dark\" : \"light\")\"",
								"class=\"display-4\"",
								"class=\"item @item.Css\""
							]
						)
					}
				)
			}
		)
		describe(
			"markup",
			() => {
				it(
					"ends an HTML comment at the end of the text when its end is inside code",
					() => {
						expect(razor("<!-- @(\"-->\")")).toStrictEqual(
							{
								ast: [
									comment_node("<!-- @(\"-->\")")
								],
								errors: []
							}
						)
					}
				)
				it(
					"keeps escaped transitions, email addresses and razor comments out of code",
					() => {
						expect(
							razor("@* note *@ a@b.com @@x")
						).toStrictEqual(
							{
								ast: [
									comment_node("@* note *@"),
									text_node(" a@b.com @@x")
								],
								errors: []
							}
						)
					}
				)
				it(
					"parses a razor comment that is never closed to the end",
					() => {
						expect(razor("<p/>@* a")).toStrictEqual(
							{
								ast: [
									element_node("<p/>", "p", "closed"),
									comment_node("@* a")
								],
								errors: [
									{
										end: 8,
										message: "The Razor comment is not closed.",
										start: 4
									}
								]
							}
						)
					}
				)
				it(
					"parses transitions inside script content",
					() => {
						expect(
							razor(
								"<script>var a = \"@b\";</script>"
							)
						).toStrictEqual(
							{
								ast: [
									element_node(
										"<script>var a = \"@b\";</script>",
										"script",
										"open",
										[],
										[
											text_node("var a = \""),
											razor_node("@b"),
											text_node("\";")
										]
									)
								],
								errors: []
							}
						)
					}
				)
			}
		)
		it(
			"matches the README example",
			() => {
				const { expected, source } = readme_example("parseRazor")
				expect(
					JSON.parse(
						JSON.stringify(parseRazor(source))
					)
				).toStrictEqual(expected)
			}
		)
		it(
			"reports a stack overflow after the markup is parsed as input nested too deeply, with no nodes",
			() => {
				const get = Map.prototype.get
				const spy = vi.spyOn(Map.prototype, "get").mockImplementation(
					/**
					 * @this {Map<unknown, unknown>}
					 * @param {unknown} key
					 * @returns {unknown}
					 */
					function(key) {
						if (typeof key == "object") {
							throw new RangeError("Injected.")
						}
						return get.call(this, key)
					}
				)
				/** @type {ReturnType<typeof parseRazor>} */
				let result
				try {
					result = parseRazor("<p></p>")
				} finally {
					spy.mockRestore()
				}
				expect(result.ast).toStrictEqual([])
				expect(
					result.errors.map(
						({ end, message, start }) => ({ end, message, start })
					)
				).toStrictEqual(
					[
						{
							end: 7,
							message: "The input is nested too deeply.",
							start: 0
						}
					]
				)
			}
		)
		it(
			"reports input nested too deeply instead of throwing, keeping the nodes before it",
			() => {
				expect(
					razor(
						`<i></i>${"@if (a) {".repeat(3000)}`
					)
				).toStrictEqual(
					{
						ast: [
							element_node("<i></i>", "i", "open"),
							text_node("@if (a) {".repeat(3000))
						],
						errors: [
							{
								end: 27007,
								message: "The input is nested too deeply.",
								start: 7
							}
						]
					}
				)
			}
		)
		it(
			"reports input that is not a string instead of throwing",
			() => {
				check_non_string_input(parseRazor)
			}
		)
		it(
			"rethrows errors other than deep nesting",
			() => {
				const injected = new TypeError("Injected.")
				const get = vi.spyOn(Map.prototype, "get").mockImplementation(
					() => {
						throw injected
					}
				)
				/** @type {unknown} */
				let thrown
				try {
					parseRazor("@x")
				} catch (error) {
					thrown = error
				} finally {
					get.mockRestore()
				}
				expect(thrown).toBe(injected)
			}
		)
	}
)