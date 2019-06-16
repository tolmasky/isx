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

const t_id = require("@cause/task").fromAsync(async x => (await 0, x));


FileSet.toPersistentTag = function (fileSet)
{
    return getChecksum(FileSet, fileSet);
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

    return toPooled(function shasums({ root, filenames })
    {
        if (filenames.size === 0)
            return OrderedMap(string, string)();

        const stdout = δshasum(filenames);
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
    const filenames = δglob({ origin: root, patterns: rootPatterns })
        .map(filename => relative(root, filename));
    const fromLocal = δtoShasumMap({ root, filenames });
    const resulting = console.log("MY FROM LOCAL IS EASY: " + fromLocal);

    return [root, rootPatterns, fromLocal];
}, { common, join, sep, relative, resolve, glob, toShasumMap, List, string, OrderedMap, None });

const toDockerImage = toPooled(function (persistent, buildContext)
{const aa = console.log("aBOTU TO BUIDL " + buildContext);
    const { fileSet } = buildContext;
    const ptag = FileSet.toPersistentTag(fileSet);
    const exists = δspawn("docker",
        ["image", "inspect", `isx:${ptag}`],
        { rejectOnError: false }).exitCode === 0;

    if (exists)
        return Image({ ptag });

    const tarPath = δpersistentTar(persistent, buildContext.root, fileSet);
    const tt = console.log("PATH: " + tarPath);
    const tarStream = fs.createReadStream(tarPath);
    const o = console.log("WHAT: " +
        ["build", "-", "-t", `isx:${ptag}`].join(" "))
    const dockerOutput = δspawn("docker",
        ["build", "-", "-t", `isx:${ptag}`],
        { stdio: [tarStream, "pipe", "pipe"] });

    return (dockerOutput, Image({ ptag }));
}, { spawn, FileSet, fs, persistentTar, Image });

const toImage = toPooled(function (persistent, playbook, patterns)
{
    const fromPlaybook = FileSet.fromPlaybook;
    const buildContext = δfromPlaybook(playbook);
    const ptag = FileSet.toPersistentTag(buildContext.fileSet);
    const checksum = getChecksum(List(string), patterns);
    const dirname = δmkdirp(join(persistent, "extract", ptag));
    const globname = join(dirname, `${checksum}.json`);

    if (sync.exists(globname))
        return JSON.parse(sync.read(globname, "utf-8"));

    const image = δtoDockerImage(persistent, buildContext);

    const pp = console.log("THE IMAGE: " + image);
/*    const filenames = glob.image(image, patterns);
    const written = write(globname, JSON.stringify(filenames));
    const pp = console.log("THE FILE NAMES: " + filenames);
*/
    return pp;
}, { FileSet, List, string, getChecksum, write, sync, mkdirp, join, glob, toDockerImage });
console.log(toImage + "");

/*
    if (sync.exists(globname))
        return JSON.parse(sync.read(globname, "utf-8"));
const x = console.log("DOESNT EXIST!");
    const gimage = glob.image;
    const filenames = glob.image(fileSet, patterns);
    const written = write(globname, JSON.stringify(filenames));
    const p = console.log("THE FILE NAMES: " + filenames);

    return (written, filenames);*/
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
    const [root, rootPatterns, fromLocal] = δtoLocal(
        playbook.workspace,
        indexesLocal.map(index => instructions.get(index).source));
    const aa2 = console.log("HOW FAR?... " + root + (global.not_again = true));
    const fromImages = δmap(
        ([playbook, indexes]) => toImage(
            "/Users/tolmasky/Development/cache",
            playbook,
            indexes.map(index => instructions.get(index).source)),
        [...grouped.remove(None).entrySeq().toList()]);
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
        fromImages: OrderedMap(string, OrderedSet(string))()
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
