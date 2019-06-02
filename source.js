const { data, string } = require("@algebraic/type");
const { List, Map, Set } = require("@algebraic/collections");
const getChecksum = require("./get-checksum");
const toLambdaForm = require("./to-lambda-form/to-lambda-form");
//const pooled = require("./pooled");


const Source = data `Source` (
    checksum    => string,
    checksums   => Map(string, string) );

const getFilenames = (function ()
{
    const glob = require("fast-glob");
    const path = require("path");
    const resolve = workspace => pattern =>
        path.resolve(workspace,
            pattern.startsWith("/") ? pattern.substr(1) : pattern);

    return toLambdaForm(function getFilenames(workspace, patterns)
    {
        const ignore = [];//["**/node_modules/"];
        const include = patterns.map(resolve(workspace));
        const firstPass = glob.sync(
            include.toArray(),
            { ignore, onlyFiles: false, markDirectories: true });
        const grouped = List(string)(firstPass)
            .groupBy(path => path.endsWith("/") ? "directories" : "filenames");
        const secondPass = glob.sync(grouped
            .get("directories", List(string)())
            .map(path => `${path}**/*`).toArray(),
            { ignore });

        return Set(string)(grouped.get("filenames", List(string)()))
            .concat(secondPass)
            .toList()
            .sort()
            .map(filename => path.relative(workspace, filename));
    }, { glob, resolve, Set, string, path, List, console });
})();

const getChecksums = (function ()
{
    const { spawnSync: spawn } = require("child_process");
    const platform = require("os").platform();

    const command = platform === "darwin" ? "shasum" : "sha256sum";
    const args = platform === "darwin" ? ["-a", "256"] : [];
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return toLambdaForm(function getChecksums(filenames)
    {
        const { stdout } = spawn(command, [...args, ...filenames]);
        const [...matches] = stdout.toString().matchAll(ShasumRegExp);
        const pairs = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return Map(string, string)(pairs);
    }, { Map, string, spawn, platform, command, args, ShasumRegExp });
})();

const toSource = toLambdaForm(function toSource(workspace, patterns)
{
    const filenames = getFilenames(workspace, patterns);
    const checksums = getChecksums(filenames);
    const checksum = getChecksum(Map(string, string), checksums);

    return Source({ checksum, checksums });
}, { getChecksums, getFilenames, getChecksum, Source, Map, string, console });

const start = Date.now();
const result = toSource(process.cwd(), List(string)(["app/**/*.js"]));
console.log(Date.now() - start);
console.log(result);
console.log(getFilenames(process.cwd(), List(string)(["app/**/*.js"])));

/*function fromDockerignore(workspace)
{
    const filename = `${workspace}/.dockerignore`;

    if (!fs.existsSync(filename))
        return [];

    return fs.readFileSync(filename, "utf-8")
        .split("\n")
        .filter(line => line.length > 0 && !line.startsWith("#"));
}*/