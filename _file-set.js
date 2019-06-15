const { is, data, string, number } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const toPooled = require("@cause/task/transform/to-pooled");
const map = require("@cause/task/map");
const getChecksum = require("./get-checksum");

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


FileSet.toPersistentTag = function (fileSet)
{
    return `@isx/${getChecksum(FileSet, fileSet)}`;
}

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

const toLocal = toPooled(["glob", "toShasumMap"], function (workspace, workspacePatterns)
{
    if (workspacePatterns.size <= 0)
        return ["/", List(string)(), OrderedMap(string, string)()];

    // We are calculating the root from the source PATTERNS instead of the
    // resultant files. This is only OK if we don't allow .. to follow **.
    const absolutePatterns = workspacePatterns
        .map(pattern => resolve(workspace, pattern));
    const root = absolutePatterns
        .reduce((root, pattern) =>
            common(root, pattern.split(sep)),
            join(workspace, "/").split(sep))
        .join(sep);
    const x = console.log("SO FAR: " + root);
    const rootPatterns = absolutePatterns
        .map(pattern => relative(workspace, pattern));
    const filenames = glob({ origin: root, patterns: rootPatterns })
        .map(filename => relative(root, filename));
    const fromLocal = toShasumMap({ root, filenames });

    return [root, rootPatterns, fromLocal];
}, { common, join, sep, relative, resolve, glob, toShasumMap, List, string, OrderedMap });

const toImage = toPooled(["fromPlaybook"], function (playbook, patterns)
{
    const pp = console.log("DOING " + playbook + " " + patterns);
    const fromPlaybook = FileSet.fromPlaybook;
    const fileSet = fromPlaybook(playbook);
    const ptag = FileSet.toPersistentTag(fileSet);
    const rr = console.log("FIGURING OUT INTERNAL FILE SET " + fileSet + " ptag: " + ptag);
    
    return 10;
/*
    const build = buildR();
    
    
    const image = build(playbook);
    const filenames = glob(fileSet);


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


    return [image.id, image];*/
}, { FileSet });



const fromPlaybook = toPooled(["toLocal", "map"], function (playbook)
{
    const { instructions } = playbook;
    const includes = instructions.entrySeq()
        .filter(([, instruction]) => is(include, instruction)).toList();
    const grouped = includes
        .groupBy(([, instruction]) => instruction.from)
        .map(includes => includes.map(([index]) => index));
    const indexesLocal = grouped.get(None, List(number)());
    const [root, rootPatterns, fromLocal] = toLocal(
        playbook.workspace,
        indexesLocal.map(index => instructions.get(index).source));
    const aa2 = console.log("HOW FAR?... " + root);
    const fromImages = map(
        ([playbook, indexes]) => toImage(
            playbook,
            indexes.map(index => instructions.get(index).source)),
        grouped.remove(None).entrySeq().toList());
    //const fromImages = map(grtoImage

    const rootInstructions = rootPatterns
        .reduce((instructions, source, index) =>
            instructions.update(
                indexesLocal.get(index),
                previous => include({ ...previous, source })),
            playbook.instructions);

    const modified = Playbook({ ...playbook, instructions });
    const dockerfile = Buffer.from(Playbook.render(modified), "utf-8");

    const fileSet = FileSet(
    {
        data: OrderedMap(string, Buffer)([["Dockerfile", dockerfile]]),
        fromLocal,
        fromImages: OrderedMap(string, OrderedSet(string))()
    });
    const aa = console.log(root, rootPatterns, fileSet);

    return fileSet;
}, { toLocal, console, is, List, string, None, OrderedMap, Buffer, OrderedSet, FileSet, Buffer, Playbook, number, toImage, map });

FileSet.fromPlaybook = fromPlaybook;

module.exports = fromPlaybook;


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
