import member_dot_pattern from "./member_dot_pattern.js"
export default "[\"'()/:?[\\]`{}]|=>"
	+ `|(?<![\\p{ID_Continue}$]|${member_dot_pattern})`
	+ "(?:as|class|export|function|import|interface|satisfies|type)(?![\\p{ID_Continue}$])"