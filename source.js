const { data, string } = require("@algebraic/type");
const { List, Map, OrderedMap, Set } = require("@algebraic/collections");
const { fromAsyncCall } = require("@cause/task");
const getChecksum = require("./get-checksum");
const toPooled = require("@cause/task/transform/to-pooled");

const Source = data `Source` (
    checksum    => string,
    checksums   => OrderedMap(string, string) );

const getFilenames = (function ()
{
    const glob = (...args) => fromAsyncCall(require("fast-glob"), ...args);
    const path = require("path");
    const resolve = workspace => pattern =>
        path.resolve(workspace,
            pattern.startsWith("/") ? pattern.substr(1) : pattern);

    return toPooled("glob", function getFilenames(workspace, patterns)
    {
        const ignore = [];//["**/node_modules/"];
        const include = patterns.map(resolve(workspace));
        const b = console.log(include.toArray());
        const firstPass = glob(
            include.toArray(),
            { ignore, onlyFiles: false, markDirectories: true });
        const what = console.log(firstPass);
        const grouped = List(string)(firstPass)
            .groupBy(path => path.endsWith("/") ? "directories" : "filenames");
        const secondPass = glob(grouped
            .get("directories", List(string)())
            .map(path => `${path}**/*`).toArray(),
            { ignore });

        return Set(string)(grouped.get("filenames", List(string)()))
            .concat(secondPass)
            .toList()
            .sort();
    }, { glob, resolve, Set, string, path, List, console });
})();

const getChecksums = (function ()
{
    const spawn = require("@cause/task/spawn");
    const platform = require("os").platform();

    const command = platform === "darwin" ? "shasum" : "sha256sum";
    const args = platform === "darwin" ? ["-a", "256"] : [];
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return toPooled("spawn", function getChecksums(filenames)
    {
        const { stdout } = spawn(command, [...args, ...filenames]);
        const [...matches] = stdout.matchAll(ShasumRegExp);
        const pairs = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return OrderedMap(string, string)(pairs);
    }, { OrderedMap, string, spawn, platform, command, args, ShasumRegExp });
})();

Source.from = toPooled(["getFilenames", "getChecksums"], function toSource(workspace, patterns)
{
    const filenames = getFilenames(workspace, patterns);
    const checksums = getChecksums(filenames);
    const checksum = getChecksum(Map(string, string), checksums);

    return Source({ checksum, checksums });
    
    return checksums;
}, { getChecksums, getFilenames, getChecksum, Source, Map, string, console });

module.exports = Source;
