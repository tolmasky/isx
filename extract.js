const { type, data, string } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { List, OrderedMap } = require("@algebraic/collections");
const { add, copy } = require("./instruction");
const toPooled = require("@cause/task/transform/to-pooled");

const { mkdirp } = require("@cause/task/fs");
const spawn = require("@cause/task/spawn");
const CACHE = "./cache";

const FileSet = data `FileSet` (
    pattern     => string,
    scope       => string,
    workspace   => string );

/*
//    filenames   => OrderedSet(string),
*/

const toFileSet = toPooled(["build", "spawn"], function({ workspace, instruction })
{
    const { from, source } = instruction;

    if (from === None)
        return FileSet({ pattern: source, scope: "workspace", workspace });
const _ = console.log("SO this far...");
    const build = buildR();
    const image = build(from);
    const container = spawn("docker",
        ["create", image])
        .match(/([^\n]*)\n$/)[1];
    const identifier = source.replace(/-/g, "--").replace(/\//g, "-");
const a = console.log("IDENTIFIER: " + identifier);
    const destination = mkdirp(`${CACHE}/${from.checksum}/${identifier}`);
const o = console.log("DESTINATION: " + destination);
    const pattern = spawn("docker",
    [
        "cp",
        `${container}:${source}`,
        destination
    ]) || `${destination}/${source}`;
    const scope = `from/${from.checksum}`;

    return FileSet({ pattern, scope, workspace: destination });
}, { CACHE, FileSet, None, spawn, mkdirp, buildR: () => require("./build-3") });

const extract = toPooled(["toFileSet"], function ({ workspace, instruction })
{
    if (!type.is(add, instruction) && !type.is(copy, instruction))
        return [None, instruction];
const a = console.log("EXTRACTING " + workspace + " " + instruction.from);
    const T = type.of(instruction);
    const fileSet = toFileSet({ workspace, instruction });
    const t = console.log("file set is " + fileSet);
    const { source, destination } = instruction;
    const scopedSource = `${fileSet.scope}/${source}`;

    return [fileSet, T({ source: scopedSource, destination })];
}, { type, None, toFileSet });

extract.from = workspace => instruction => extract({ workspace, instruction });

extract.FileSet = FileSet;

module.exports = extract;

