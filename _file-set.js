const { is, data, string, number } = require("@algebraic/type");
const { Optional, None } = require("@algebraic/type/optional");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const toPooled = require("@cause/task/transform/to-pooled");
const map = require("@cause/task/map");
const getChecksum = require("./get-checksum");
const persistentTar = require("./persistent-tar");
const spawn = require("@cause/task/spawn");
const fs = require("fs");

const { include } = require("./instruction");
const glob = require("./glob");

const { join, write, mkdirp } = require("@cause/task/fs");
const { sep, resolve, relative } = require("path");
const common = (lhs, rhs) => lhs
    .slice(0, lhs.findIndex((component, index) => component != rhs[index]))

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync, read: fs.readFileSync }))
    (require("fs"));

const Playbook = require("./playbook");

const BuildContext = data `BuildContext` (
    root    => Optional(string),
    fileSet => FileSet );

const FileSet = data `FileSet` (
    data        => OrderedMap(string, Buffer),
    fromLocal   => OrderedMap(string, string),
    fromImages  => OrderedMap(string, OrderedSet(string)) );

const Image = data `Image` (
    ptag        => string );


FileSet.toPersistentTag = function (fileSet)
{
    return getChecksum(FileSet, fileSet);
}

const toShasumMap = (function ()
{
    const { string } = require("@algebraic/type");
    const { OrderedMap } = require("@algebraic/collections");
    const spawn = require("@cause/task/spawn");
    const command = (binary, prefix) =>
        (args, options = { }) =>
            spawn(binary, [...prefix, ...args]);
    const darwin = require("os").platform() === "darwin";
    const shasum = command(...(darwin ?
        ["shasum", ["-a", "256"]] : ["sha256sum"]));
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return toPooled(function shasums({ root, filenames })
    {
        if (filenames.size === 0)
            return OrderedMap(string, string)();

        const { stdout } = δ(shasum(filenames));
        const [...matches] = stdout.matchAll(ShasumRegExp);
        const entries = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return OrderedMap(string, string)(entries);
    }, { OrderedMap, string, shasum, ShasumRegExp });
})();

const toLocal = toPooled(function (workspace, workspacePatterns)
{
    if (workspacePatterns.size <= 0)
        return [None, List(string)(), OrderedMap(string, string)()];

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
    const filenames = δ(glob({ origin: root, patterns: rootPatterns }))
        .map(filename => relative(root, filename));
    const fromLocal = δ(toShasumMap({ root, filenames }));
    const resulting = console.log("MY FROM LOCAL IS EASY: " + fromLocal);

    return [root, rootPatterns, fromLocal];
}, { common, join, sep, relative, resolve, glob, toShasumMap, List, string, OrderedMap, None });

const toDockerImage = toPooled(function (persistent, buildContext)
{const aa = console.log("aBOTU TO BUIDL " + buildContext);
    const { fileSet } = buildContext;
    const ptag = FileSet.toPersistentTag(fileSet);
    const exists = δ(spawn("docker",
        ["image", "inspect", `isx:${ptag}`],
        { rejectOnError: false })).exitCode === 0;

    if (exists)
        return Image({ ptag });

    const tarPath = δ(persistentTar(persistent, buildContext.root, fileSet));
    const tt = console.log("PATH: " + tarPath);
    const tarStream = fs.createReadStream(tarPath);
    const o = console.log("WHAT: " +
        ["build", "-", "-t", `isx:${ptag}`].join(" "))
    const dockerOutput = δ(spawn("docker"),
        ["build", "-", "-t", `isx:${ptag}`],
        { stdio: [tarStream, "pipe", "pipe"] });

    return (dockerOutput, Image({ ptag }));
}, { spawn, FileSet, fs, persistentTar, Image });

const toImage = toPooled(function (persistent, playbook, patterns)
{
    const fromPlaybook = FileSet.fromPlaybook;
    const buildContext = δ(fromPlaybook(playbook));
    const ptag = FileSet.toPersistentTag(buildContext.fileSet);
    const checksum = getChecksum(List(string), patterns);
    const volume = δ(mkdirp(join(persistent, "volumes", ptag)));
    const globs = δ(mkdirp(join(volume, "globs")));
    const globname = join(globs, `${checksum}.json`);

    if (sync.exists(globname))
        return [Image({ ptag }), JSON.parse(sync.read(globname, "utf-8"))];

    const image = δ(toDockerImage(persistent, buildContext));
    const filenames = δ(glob({ origin: image, patterns }));
    const root = δ(mkdirp(join(volume, "root")));
    const missing = filenames
        .filter(filename => !sync.exists(join(root, filename)));

    if (missing.size <= 0)
    {
        const written = δ(write(globname, JSON.stringify(filenames)));

        return (written, [image, filenames]);
    }
const aa = console.log("MISSING: " + missing);
    // FIXME: We shouldn't need the Date.now() once we have deduping.
    const name = image.ptag + Date.now();
    const stdio = [toReadableStream(missing.join("\n")), "pipe", "pipe"];
    const tarname = join(δ(mkdirp(join(volume, "tars"))), `${checksum}.tar`);
    const tarnameRemote = `/${checksum}.tar`;
    const tarred = δ(spawn("docker",
    [
        "run", "-i", "--name", name, `isx:${image.ptag}`,
        "tar", "-cvf", tarnameRemote, "--files-from", "-"
    ], { stdio }));
    const rr = console.log("REMOTE: " + tarnameRemote + " " + tarred);
    const copied = tarred && δ(spawn("docker",
        ["cp", `${name}:${tarnameRemote}`, tarname]));
    const untarred = copied && δ(spawn("tar", ["-xf", tarname, "-C", root]));
    const written = untarred && δ(write(globname, JSON.stringify(filenames)));

    return (written, [image, filenames]);
}, { FileSet, List, string, getChecksum, write, sync, mkdirp, join, glob, toDockerImage, Image, spawn, toReadableStream });

function toReadableStream(string)
{
    const stream = new (require("stream").Readable);

    stream.push(string);
    stream.push(null);

    return stream;
}

/*
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


const fromPlaybook = toPooled(function (playbook)
{
    const rr = console.log("RUNNING fromPlaybook: " + playbook);
    const { instructions } = playbook;
    const includes = instructions.entrySeq()
        .filter(([, instruction]) => is(include, instruction)).toList();
    const grouped = includes
        .groupBy(([, instruction]) => instruction.from)
        .map(includes => includes.map(([index]) => index));
    const indexesLocal = grouped.get(None, List(number)());
    const [root, rootPatterns, fromLocal] = δ(toLocal(
        playbook.workspace,
        indexesLocal.map(index => instructions.get(index).source)));
    const aa2 = console.log("HOW FAR?... " + root + (global.not_again = true));
    const fromImages = OrderedMap(string, OrderedSet(string))(δ(grouped
        .remove(None)
        .entrySeq()
        .map(([playbook, indexes]) =>
            toImage(
                "/Users/tolmasky/Development/cache",
                playbook,
                indexes.map(index => instructions.get(index).source)))));

    const annow = console.log("OK CALLED TO_IMAGE: " + fromImages);
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
        fromImages
    });

    return BuildContext({ root, fileSet });
}, { toLocal, console, is, List, string, None, OrderedMap, Buffer, OrderedSet, FileSet, Buffer, Playbook, number, toImage, map, BuildContext });

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
