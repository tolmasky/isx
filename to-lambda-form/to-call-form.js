const Scope = require("./scope");
const { parseExpression } = require("@babel/parser");

const f = function f(workspace, patterns)
{
    const filenames = getFilenames(workspace, patterns);
    const checksums = getChecksums(filenames);
    const checksum = getChecksum(Map(string, string), checksums);

    return Source({ filenames, checksum });
}
const fExpression = parseExpression(`(${f})`);

module.exports = require("./map-accum-node")(Scope, require("./transform-scope"));

console.log(module.exports(fExpression));