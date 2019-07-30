const fs = require("fs");
const { sep, relative } = require("path");
const common = (lhs, rhs) =>
    (index => index === -1 ? lhs : lhs.slice(0, index))
    (lhs.findIndex((component, index) => component !== rhs[index]));
const glob = require("./glob");
const { base, getArguments } = require("generic-jsx");
const { is, data, string, any } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const { Dependency } = require("@cause/task/dependent");
const Instruction = require("./instruction");
const getChecksum = require("./get-checksum");
const fail = (type, message) => { throw type(message); }
const docker = require("./docker");
const Task = require("@cause/task");
const persistentTar = require("./persistent-tar");
const { join } = require("@parallel-branch/fs");


const Image = data `Image` (
    ptag    => string,
    forTags => any );

const BuildContext = data `BuildContext` (
    dockerfile  => string,
    fileSet     => OrderedMap(string, string)
);

const isLocalInclude = instruction =>
    is (Instruction.include, instruction) &&
    instruction.from === None;

module.exports = parallel function image({ from, workspace, ...args })
{console.log("OK GOING TO START BUILDING " + args.tag);
    const { persistent } = args;
    const instructions =
        args.instructions ||
        (branch build(persistent, args.children));

    const [root, patterns, fileSet] = branch toFileSet(
        workspace,
        instructions
            .filter(isLocalInclude)
            .map(include => include.source));
    const dockerfile = branch toDockerfile({ persistent, from, instructions });
    
    ((args.tags+"").indexOf("local") >= 0) && console.log(dockerfile);
    
    const buildContext = BuildContext({ dockerfile, fileSet });
    const ptag = getChecksum(BuildContext, buildContext);
    const result = branch docker.image.inspect([`isx:${ptag}`]);

    // If we inline result, it breaks.
    if (result !== None)
        return Image({ ptag });

    const tarPath = branch persistentTar(persistent, root, fileSet, dockerfile);
    const tarStream = fs.createReadStream(tarPath);
    const output = branch docker.build(
        ["-", "-t", `isx:${ptag}`],
        { stdio: [tarStream, "pipe", "pipe"] });

    return output && Image({ ptag, forTags: args.tag });
}

parallel function toDockerfile({ from, instructions, persistent })
{
    const fromTag =
        typeof from === "function" ?
            `isx:${(branch build(persistent, from)).ptag}` :
            from;

    return [`from ${fromTag}`,
        ...instructions.map(Instruction.render)].join("\n");
}

parallel function build(persistent, element)
{console.log("GOING TO TRY TO GET ARGUMENTS FROM: ", element);
    const args = getArguments(element);
    const f = base(element);
    const fromXML = f.fromXML;

    if (fromXML)
        return branch fromXML({ ...args, persistent });

    if (element === false)
        return false;

    const ptype = Array.isArray(element) ? "array" : typeof element;

    if (ptype === "array")
        return []
            .concat(...element
            .map(branching (child => build(persistent, child))))
            .filter(built => built !== false);

    if (ptype === "function")
    {
        console.log("THE ARGS: " + Object.keys(args));
        return branch build(persistent, branch element({ persistent }));
}
    if (is(Image, element))
        return element;

    if (!is(Instruction, element))
        return fail(Error, `Unexpected ${ptype} when evaluating isx.`);

    return element;
}

module.exports.build = build;


parallel function toFileSet(workspace, workspacePatterns)
{console.log("PATTERNS: " + workspace + " " + workspacePatterns);
    if (workspacePatterns.length <= 0)
        return [None, List(string)(), OrderedMap(string, string)()];
console.log("here...");
    // We are calculating the root from the source PATTERNS instead of the
    // resultant files. This is only OK if we don't allow .. to follow **.
    const absolutePatterns = workspacePatterns
        .map(pattern => join(workspace, pattern));console.log(absolutePatterns);
    const root = absolutePatterns
        .reduce((root, pattern) =>
            common(root, pattern.split(sep)),
            join(workspace, "/").split(sep))
        .join(sep);
    const x = console.log("SO FAR: " + workspace + " " + root + " " + absolutePatterns + " " + join(workspace, "/").split(sep));
    const rootPatterns = absolutePatterns
        .map(pattern => relative(root, pattern));
    const filenames = (branch glob({ origin: root, patterns: rootPatterns }))
        .map(filename => relative(root, filename));

    const fromLocal = branch toShasumMap({ root, filenames });
    const tarPatterns = rootPatterns.map(pattern => join("root", pattern));
    const resulting = console.log("MY FROM LOCAL IS EASY: " + fromLocal);

    return [root, tarPatterns, fromLocal];
}

const toShasumMap = (function ()
{
    const { string } = require("@algebraic/type");
    const { OrderedMap } = require("@algebraic/collections");
    const spawn = require("@parallel-branch/spawn");
    const command = (binary, prefix) =>
        parallel((args, options = { }) =>
            branch spawn(binary, [...prefix, ...args], options));
    const darwin = require("os").platform() === "darwin";
    const shasum = command(...(darwin ?
        ["shasum", ["-a", "256"]] : ["sha256sum"]));
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return parallel function shasums({ root, filenames })
    {
        if (filenames.size === 0)
            return OrderedMap(string, string)();

        const { stdout } = branch shasum(filenames, { cwd: root });
        const [...matches] = stdout.matchAll(ShasumRegExp);
        const entries = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return OrderedMap(string, string)(entries);
    }
})();

