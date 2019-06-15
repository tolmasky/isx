const { is, data, string } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const toPooled = require("@cause/task/transform/to-pooled");

const { include } = require("./instruction");
const glob = require("./glob");

const { join } = require("@cause/task/fs");
const { sep, resolve, relative } = require("path");
const common = (lhs, rhs) => lhs
    .slice(0, lhs.findIndex((component, index) => component != rhs[index]))

const Playbook = require("./playbook");

const FileSet = data `FileSet` (
    data        => OrderedMap(string, Buffer),
    fromLocal   => OrderedMap(string, string),
    fromImages  => OrderedMap(string, OrderedSet(string)) );


const toShasumMap = (function ()
{
    const { string } = require("@algebraic/type");
    const { OrderedMap } = require("@algebraic/collections");
    const { stdout: spawn } = require("@cause/task/spawn");
    const command = (binary, prefix) =>
        (args, options = { }) =>
            spawn(binary, [...prefix, ...args]);
    const darwin = require("os").platform() === "darwin";
    const shasum = command(...(darwin ?
        ["shasum", ["-a", "256"]] : ["sha256sum"]));
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return toPooled(["shasum"], function shasums({ root, filenames })
    {
        if (filenames.size === 0)
            return OrderedMap(string, string)();

        const stdout = shasum(filenames);
        const [...matches] = stdout.matchAll(ShasumRegExp);
        const entries = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return OrderedMap(string, string)(entries);
    }, { OrderedMap, string, shasum, ShasumRegExp });
})();

const toLocal = toPooled(["glob", "toShasumMap"], function (workspace, entriesRelativeToWorkspace)
{
    // We are calculating the root from the source PATTERNS instead of the
    // resultant files. This is only OK if we don't allow .. to follow **.
    const entriesAbsolute = entriesRelativeToWorkspace
        .map(([index, { source, ...rest }]) =>
            [index, include({ ...rest, source: resolve(workspace, source) })]);
    const root = entriesAbsolute
        .reduce((root, [, { source }]) =>
            common(root, source.split(sep)),
            join(workspace, "/").split(sep))
        .join(sep);
    const entriesRelativeToRoot = entriesAbsolute
        .map(([index, { source, ...rest }]) =>
            [index, include({ ...rest, source: relative(workspace, source) })]);
    const patterns = entriesRelativeToRoot.map(([, { source }]) => source);
    const filenames = glob({ origin: root, patterns })
        .map(filename => relative(root, filename));
    const fromLocal = toShasumMap({ root, filenames });

    return [root, entriesRelativeToRoot, fromLocal];
}, { common, join, sep, relative, resolve, glob, toShasumMap });



module.exports = toPooled(["toLocal"], function (playbook)
{
    const includes = playbook.instructions.entrySeq()
        .filter(([, instruction]) => is(include, instruction));
    const grouped = includes.groupBy(([, instruction]) => instruction.from);

    const entriesRelativeToWorkspace = grouped.get(None, List(string)());
    const [root, entriesRelativeToRoot, fromLocal] =
        toLocal(playbook.workspace, entriesRelativeToWorkspace);

    const instructions = entriesRelativeToRoot
        .reduce((instructions, [index, instruction]) => instructions
            .update(index, previous => include({ ...previous, source: instruction.source })),
        playbook.instructions);
    const modified = Playbook({ ...playbook, instructions });
    const dockerfile = Buffer.from(Playbook.render(modified), "utf-8");

    const fileSet = FileSet(
    {
        data: OrderedMap(string, Buffer)([["Dockerfile", dockerfile]]),
        fromLocal,
        fromImages: OrderedMap(string, OrderedSet(string))()
    });
    const aa = console.log(root, entriesRelativeToRoot, fileSet);

    return aa;
}, { toLocal, console, is, List, string, None, OrderedMap, Buffer, OrderedSet, FileSet, Buffer, Playbook });



/*
        .reduce((root, [, include]) =>
            common(root, join(workspace, include.source).split(sep)),
            workspace.split(sep)).join(sep);


    const root = entriesLocal
        .reduce((root, [, include]) =>
            common(root, join(workspace, include.source).split(sep)),
            workspace.split(sep)).join(sep);
    const entriesRelativeToRoot = entriesLocal
        .map([]
    

    console.log("ROOT: " + root);
    /*
    
        if (is(subpath))
            return great.
        
        if-not
            go back further.
        join(workspace, filename))

    console.log(local, includes.toList());*/

/*

BuildSet
{
root
fileSet
tags
instructions
}

*/
