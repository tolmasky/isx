const fs = require("fs");
const path = require("path");
const glob = require("fast-glob");
const { data, string } = require("@algebraic/type");
const { List } = require("@algebraic/collections");

const { base, getArguments } = require("generic-jsx");
const { copy, add } = require("./primitives");
const isCopyOrAdd = instruction =>
    (base => base === add || base === copy)(base(instruction));


const BuildContext = data `BuildContext` (
    workspace => string,
    filenames => List(string) );

module.exports = BuildContext;

BuildContext.from = function ({ workspace, instructions })
{
    const ignore = fromDockerignore(workspace);
    const include = instructions
        .filter(isCopyOrAdd)
        .map(instruction => (console.log(instruction), instruction))
        .map(resolve(workspace))
        .toArray();
    const firstPass = glob.sync(
        include,
        { ignore, onlyFiles: false, markDirectories: true });
    const grouped = List(string)(firstPass)
        .groupBy(path => path.endsWith("/") ? "directories" : "filenames");
    const secondPass = glob.sync(
        grouped.get("directories").map(path => `${path}**/*`).toArray(),
        { ignore });
    const filenames = grouped.get("filenames").concat(secondPass)
        .sort()
        .map(filename => path.relative(workspace, filename));

    return BuildContext({ workspace, filenames });
}

function resolve(workspace)
{
    return instruction =>
        (({ source }) => 
            path.resolve(workspace,
                source.startsWith("/") ? source.substr(1) : source))
        (getArguments(instruction));
}

function fromDockerignore(workspace)
{
    const filename = `${workspace}/.dockerignore`;

    if (!fs.existsSync(filename))
        return [];

    return fs.readFileSync(filename, "utf-8")
        .split("\n")
        .filter(line => line.length > 0 && !line.startsWith("#"));
}