const { is, string } = require("@algebraic/type");
const { stdout: spawn } = require("@cause/task/spawn");
const { join } = require("@cause/task/fs");
const toPooled = require("@cause/task/transform/to-pooled");

const find = (...args) => spawn("find", args);
const findInDocker = (tag, ...args) =>
    spawn("docker", ["run", "--rm", tag, "find", "/", ...args]);


module.exports = toPooled(["command"], function glob(fileSet)
{
    const { origin, patterns } = fileSet;
    const local = is(string, origin);

    // FIXME: We should do "-o -empty -type d" with the same pattern without the
    // trailing piece.
    const optional = local ? "\\{0,1\\}" : "?";
    const globToRegExp = glob =>
        join(local ? origin : "/", glob)
            .replace(/[\?\.]/g, character => `\\${character}`)
            .replace(/\*/g, "[^\/]*") + `\\(/.*\\)${optional}`;

    const command = local ? find : findInDocker;
    const context = (local ? origin : origin.id);
    const contextNoSlash = context.replace(/\/$/, "");
    const output = command(
        contextNoSlash,
        "-type", "f",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]));

    const filenames = [...output.matchAll(/([^\n]*)\n/g)]
        .map(([_, filename]) => filename);
const tt = console.log(">> " + filenames);
    return filenames;
}, { find, findInDocker, is, string, join });

console.log(module.exports + "");

/*
const toPromise = require("@cause/cause/to-promise");

(async function ()
{
const glob = module.exports;
try {
    console.log("what?...");
    console.log(await toPromise(Object, glob("/Users/tolmasky/Development/tonic", ["app/build", "app/*.js"])));
    console.log(await toPromise(Object, glob({ identifier: "aa0705969327" }, ["node-v10.15.3-linux-x64.tar.xz", "bin"])));
}
catch(e)
{
    console.log(e);
}

})();*/

/*

const { fromAsync } = require("@cause/task");
const { stdout: spawn } = require("@cause/task/spawn");

const command = (binary, ...prefix) =>
    (...args) => spawn(binary, [...prefix, ...args]);

const darwin = require("os").platform() === "darwin";
const tar = command(darwin ? "gtar" : "tar");
const shasum = command(...(darwin ?
    ["shasum", "-a", "256"] : ["sha256sum"]));
    
    
function glob(source, patterns)
{
    const names = patterns.flatMap((pattern, index) =>
        [...(index > 0 ? ["-o"] : []), "-name", pattern]);
    const arguments = ["-print0", ...names];

    if (is(string, source))
        return spawn("find", [".", ...arguments], { cwd: source });

    return spawn("docker", ["run", source.identifier, cwd + " " + arguments.join(" ")]) 
}

function toFindArguments(patterns)
{
    return 
}


data `Source` (
    from    => Optional(string),
    pattern => string );

const Patterns = Map(Optional(string), List(string));


function (patternGroups)
{
    map(patternGroups)
}

function (image, patterns)
{
    // If this is on the local filesystem, we can immediately just grab matching
    // filenames.
    if (image === None)
        return getFilenames(patterns);

    // If not, then we have to first find all the paths that match in the image
}

function glob(image, patterns)
{

}


const fullGlob = toPooled("glob", function fullGlob(glob)
{
    
}
*/