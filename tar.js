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
const CACHE = require("path").resolve("../cache");


const copy = toPooled(["mkdirp", "spawn"], function copy(container, filename, destinationBase)
{
    const parent = mkdirp(dirname(join(destinationBase, filename)));
    const destination = join(parent, basename(filename));
    const source = `${container}:${filename}`;
const bb = console.log(["docker", "cp", source, destination].join(" "));
    return spawn("docker", ["cp", source, destination]) || destination;
}, { dirname, basename, join, mkdirp, spawn });

const extract = toPooled(["glob", "mkdirp", "spawn", "map", "copy"], function extract(fileSet)
{
    const { origin } = fileSet;
    const filenames = glob(fileSet);

    if (is(string, fileSet.origin))
        return filenames;

    const destination = join(CACHE, origin.id);
    const stdio = [toReadableStream(filenames.join("\n")), "pipe", "pipe"];
    const container_name = origin.id + Date.now();
    const ii = console.log("GOING TO USE CONTAINER " + container_name);
    const remoteTarPath = (tarPath => spawn("docker",
    [
        "run", "-i", "--name", container_name, origin.id,
        "tar", "-cvf", tarPath, "--files-from", "-"
    ], { stdio }) && tarPath)(`/${origin.id}.tar`);
    const aa = console.log("REMOTE PATH: " + remoteTarPath);
    const tarPath = copy(container_name, remoteTarPath, "/tmp");
    const cc = console.log("RESULT PATH: " + tarPath + " to " + destination);
    const r2 = mkdirp(destination);
    const ccc = console.log("MK: " + r2);
    const result = spawn("tar", ["-xf", tarPath, "-C", r2]) || destination;
    const dd = console.log("DID RESULT WITH: " + result);

    return result;
}, { glob, is, string, CACHE, spawn, map, lastline, copy, join, mkdirp, toReadableStream });

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
    const filen = console.log("INCLUDING: " + filenames + " " + fileSets);
    const checksum = getChecksum(List(string), filenames);
    const tarPath = (tarPath => spawn("gtar", ["-cvf",
        tarPath,
        "--absolute-names",
        ...transforms,
        ...filenames
    ]) && tarPath)(join(CACHE, "tars", `${checksum}.tar`));

    return tarPath;
}, { map, glob, FileSet, extract, is, string, CACHE, List, getChecksum, spawn, join });


function toReadableStream(string)
{
    const stream = new (require("stream").Readable);

    stream.push(string);
    stream.push(null);

    return stream;
}


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
