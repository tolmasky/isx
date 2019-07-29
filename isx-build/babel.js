const { dirname, sep } = require("path");
const getPackageDescriptions = require("magic-ws/get-package-descriptions");
const genericJSXPath = dirname(require.resolve("generic-jsx"));
const packageDescriptions = getPackageDescriptions([], [genericJSXPath]);
require("magic-ws/modify-resolve-lookup-paths")(packageDescriptions);
Error.stackTraceLimit = 1000;

require("@babel/register")
({
    ignore:[new RegExp(`^.*${sep}node_modules${sep}.*`, "i")],
    plugins:[require("@parallel-branch/babel-plugin"), require("@generic-jsx/babel-plugin")],
    cache: false
});

//module.exports = require(require("path").resolve(process.cwd(), process.argv[1]));