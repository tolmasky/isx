const { is, string } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const { dirname, basename } = require("path");
const toPooled = require("@cause/task/transform/to-pooled");
const map = require("@cause/task/map");
const { mkdirp } = require("@cause/task/fs");
const glob = require("./glob");
const FileSet = require("./file-set");
const { lastline, stdout: spawn } = require("@cause/task/spawn");
const { join } = require("@cause/task/fs");
const getChecksum = require("./get-checksum");
const CACHE = require("path").resolve("./cache");


const copy = toPooled(["mkdirp", "spawn"], function copy(container, filename, destinationBase)
{
    const parent = mkdirp(dirname(join(destinationBase, filename)));
    const destination = join(parent, basename(filename));
    const source = `${container}:${filename}`;

    return spawn("docker", ["cp", source, destination]) || destination;
}, { dirname, basename, join, mkdirp, spawn });

const extract = toPooled(["glob", "mkdirp", "spawn", "map"], function extract(fileSet)
{
    const { origin } = fileSet;
    const filenames = glob(fileSet);

    if (is(string, fileSet.origin))
        return filenames;

    const identifier = origin.id;
    const container = lastline(spawn("docker", ["create", origin.id]));
    const destination = join(CACHE, origin.id);

    return map(filename => copy(container, filename, destination), filenames);
}, { glob, is, string, CACHE, spawn, map, lastline, copy, join });

module.exports = toPooled(["map", "spawn"], function tar(fileSets)
{
    // Merge all the disparate file sets that share the same origin so we can
    // do one big glob for each of them.
    const flattenedFileSets = fileSets
        .groupBy(fileSet => fileSet.origin)
        .map((fileSets, origin) =>
            fileSets.flatMap(fileSet => fileSet.patterns))
        .map((patterns, origin) => FileSet({ origin, patterns }))
        .valueSeq().toList();
    const transforms = [
        `--transform=s,${join(join(CACHE, "dockerfiles") + "/")},,`,
        ...flattenedFileSets.map(
            ({ origin }) => is (string, origin) ?
                `--transform=s,${join(origin + "/")},workspace/,` :
                `--transform=s,${join(CACHE, origin.id + "/")},${origin.id}/,`)];
    const filenames = map(extract, flattenedFileSets).flatten();
    const checksum = getChecksum(List(string), filenames);
    const tarPath = (tarPath => spawn("gtar", ["-cvf",
        tarPath,
        "--absolute-names",
        ...transforms,
        ...filenames
    ]) && tarPath)(join(CACHE, "tars", `${checksum}.tar`));

    return tarPath;
}, { map, glob, FileSet, extract, is, string, CACHE, List, getChecksum, spawn, join });





/*

const { fromAsync } = require("@cause/task");
const { stdout: spawn } = require("@cause/task/spawn");

const command = (binary, ...prefix) =>
    (...args) => spawn(binary, [...prefix, ...args]);

const darwin = require("os").platform() === "darwin";
const tar = command(darwin ? "gtar" : "tar");
const shasum = command(...(darwin ?
    ["shasum", "-a", "256"] : ["sha256sum"]));


*/
