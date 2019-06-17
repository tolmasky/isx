const { is, data, string, number } = require("@algebraic/type");
const { Optional, None } = require("@algebraic/type/optional");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const getChecksum = require("./get-checksum");
const persistentTar = require("./persistent-tar");
const spawn = require("@cause/task/spawn");
const fs = require("fs");

const { include } = require("./instruction");
const glob = require("./glob");

const { join, write, mkdirp } = require("@cause/task/fs");
const { sep, resolve, relative } = require("path");
const common = (lhs, rhs) =>
    (index => index === -1 ? lhs : lhs.slice(0, index))
    (lhs.findIndex((component, index) => component !== rhs[index]))

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
    fromImages  => OrderedMap(Image, OrderedSet(string)) );

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
            spawn(binary, [...prefix, ...args], options);
    const darwin = require("os").platform() === "darwin";
    const shasum = command(...(darwin ?
        ["shasum", ["-a", "256"]] : ["sha256sum"]));
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return function shasums({ root, filenames })
    {
        if (filenames.size === 0)
            return OrderedMap(string, string)();

        const { stdout } = δ(shasum(filenames, { cwd: root }));
        const [...matches] = stdout.matchAll(ShasumRegExp);
        const entries = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return OrderedMap(string, string)(entries);
    }
})();

const toLocal = function (workspace, workspacePatterns)
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
    const x = console.log("SO FAR: " + workspace + " " + root + " " + absolutePatterns + " " + join(workspace, "/").split(sep));
    const rootPatterns = absolutePatterns
        .map(pattern => relative(root, pattern));
    const filenames = δ(glob({ origin: root, patterns: rootPatterns }))
        .map(filename => relative(root, filename));

    const fromLocal = δ(toShasumMap({ root, filenames }));
    const tarPatterns = rootPatterns.map(pattern => join("root", pattern));
    const resulting = console.log("MY FROM LOCAL IS EASY: " + fromLocal);

    return [root, tarPatterns, fromLocal];
}

const toDockerImage = function (persistent, buildContext)
{//const aa = console.log("aBOTU TO BUIDL " + buildContext);
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
    const r = console.log(`cat ${tarPath} | ` + ["docker", "build", "-", "-t", `isx:${ptag}`].join(" "));
    const dockerOutput = δ(spawn("docker",
        ["build", "-", "-t", `isx:${ptag}`],
        { stdio: [tarStream, "pipe", "pipe"] }));

    return (dockerOutput, Image({ ptag }));
}

const toImage = function (persistent, playbook, patterns)
{
    const fromPlaybook = FileSet.fromPlaybook;
    const buildContext = δ(fromPlaybook(playbook));
    const ptag = FileSet.toPersistentTag(buildContext.fileSet);
    const checksum = getChecksum(List(string), patterns);
    const volume = δ(mkdirp(join(persistent, "volumes", ptag)));
    const globs = δ(mkdirp(join(volume, "globs")));
    const globname = join(globs, `${checksum}.json`);

    if (sync.exists(globname))
        return [Image({ ptag }),
            OrderedSet(string)(JSON.parse(sync.read(globname, "utf-8")))];
const aa2 = console.log("BC: " + buildContext);
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
}

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


const fromPlaybook = function (playbook)
{
//    const rr = console.log("RUNNING fromPlaybook: " + playbook);
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

    const includesFromVolumes = grouped.remove(None).entrySeq();
    const fromImages = OrderedMap(Image, OrderedSet(string))(
        δ(includesFromVolumes.map(([playbook, indexes]) =>
            toImage(
                "/Users/tolmasky/Development/cache",
                playbook,
                indexes.map(index => instructions.get(index).source)))));

    const rootInstructions = includesFromVolumes
        .zipWith(([, indexes], [image]) =>
            [`/volumes/${image.ptag}`, indexes], fromImages.entrySeq())
        .reduce((instructions, [dirname, indexes]) =>
            indexes.reduce((instructions, index) =>
                instructions.update(index, ({ source, ...rest }) =>
                     include({ ...rest, source: join(dirname, source) })),
                instructions),
            rootPatterns.reduce((instructions, source, index) =>
                instructions.update(
                    indexesLocal.get(index),
                    previous => include({ ...previous, source })),
                playbook.instructions));

    const modified = Playbook({ ...playbook, instructions: rootInstructions });
    const dockerfile = Buffer.from(Playbook.render(modified), "utf-8");
    const fileSet = FileSet(
    {
        data: OrderedMap(string, Buffer)([["Dockerfile", dockerfile]]),
        fromLocal,
        fromImages
    });

    return BuildContext({ root, fileSet });
}

FileSet.fromPlaybook = fromPlaybook;

module.exports = fromPlaybook;
module.exports.toDockerImage = toDockerImage;
