const { is, string } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const { stdout: spawn } = require("@cause/task/spawn");
const { join } = require("@cause/task/fs");
const toPooled = require("@cause/task/transform/to-pooled");

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync, read: fs.readFileSync }))
    (require("fs"));

const find = (...args) => spawn("find", args);
const findInDocker = (tag, ...args) =>
    spawn("docker", ["run", "--rm", tag, "find", "/", ...args]);


module.exports = toPooled(["command"], function glob({ origin, patterns })
{
    const rr = console.log("ABOUT TO GLOB OVER: " + origin + " " + patterns);
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
    const mm = console.log("AND GOT TO ABOUT... " + contextNoSlash,
        "-type", "f",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]));
    const output = command(
        contextNoSlash,
        "-type", "f",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]));
    const filenames = [...output.matchAll(/([^\n]*)\n/g)]
        .map(([_, filename]) => filename);
    const u = console.log("AND GOT " + filenames);

    return List(string)(filenames);
}, { find, findInDocker, is, string, join, List });

toPooled(["command"], function glob({ origin, patterns })
{
    const rr = console.log("ABOUT TO GLOB OVER: " + origin + " " + patterns);
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
    const mm = console.log("AND GOT TO ABOUT... " + contextNoSlash,
        "-type", "f",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]));
    const output = command(
        contextNoSlash,
        "-type", "f",
        ...patterns
            .map(globToRegExp)
            .flatMap((pattern, index) =>
                [...(index > 0 ? ["-o"] : []), "-regex", pattern]));
    const filenames = [...output.matchAll(/([^\n]*)\n/g)]
        .map(([_, filename]) => filename);
    const u = console.log("AND GOT " + filenames);

    return List(string)(filenames);
}, { find, findInDocker, is, string, join, List });

/*
module.exports.image = toPooled([""], function ({ ptag, fileSet })
{
    spawn("docker", ["image", "inspect", ptag])
    if (ptag)
    return
})*/

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