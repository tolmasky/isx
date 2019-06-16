const { of, is, Maybe, union, string, getUnscopedTypename } = require("@algebraic/type");
const { List, OrderedMap, OrderedSet } = require("@algebraic/collections");
const Playbook = require("./playbook");
const Instruction = require("./instruction");
const { None } = require("@algebraic/type/optional");
const toPooled = require("@cause/task/transform/to-pooled");
const toPromise = require("@cause/cause/to-promise");
const spawn = require("@cause/task/spawn");
const fs = require("fs");
const { join, mkdirp, write } = require("@cause/task/fs");
const map = require("@cause/task/map");
const getChecksum = require("./get-checksum");
const CACHE = require("path").resolve("../cache");
const FileSet = require("./file-set");
const Image = require("./image");
const tar = require("./tar");
const persistentTar = require("./persistent-tar");
const BUILD = require("./_file-set");


const build = toPooled(function build(playbook)
{
    const buildContext = δ(BUILD(playbook));
    const image = δ(BUILD.toDockerImage(
        "/Users/tolmasky/Development/cache",
        buildContext));
    const ll = console.log("THEN ALL DONE?... " + image);

    return ll;
}, { CACHE, getChecksum, FileSet, List, string, spawn, console, write, is, Playbook, Instruction, fs, None, map, of, mkdirp, Image, tar, join, Buffer, persistentTar, OrderedMap, OrderedSet, BUILD });
console.log(build+"");
module.exports = async function build_({ filename, push, sequential }, properties)
{
    try {
        FIXME_registerGenericJSX();

        const result = require(filename);
        const fPlaybooks = List(Function)([]
            .concat(typeof result === "function" ?
                result(properties) : result));
        const playbooks = fPlaybooks.map(fPlaybook => Playbook.compile(fPlaybook));
        const playbook = playbooks.get(0);console.log(playbooks);
        const theBuild = build(playbook);
        const image = await toPromise(Object, theBuild);

        console.log("---> " + image);
    }
    catch(e)
    {
        console.log(e);
    }
}

module.exports.build_ = build;

function FIXME_registerGenericJSX()
{
    if (FIXME_registerGenericJSX.registered)
        return;

    FIXME_registerGenericJSX.registered = true;

    const { dirname, sep } = require("path");
    const getPackageDescriptions = require("magic-ws/get-package-descriptions");
    const genericJSXPath = dirname(require.resolve("generic-jsx"));
    const packageDescriptions = getPackageDescriptions([], [genericJSXPath]);
    require("magic-ws/modify-resolve-lookup-paths")(packageDescriptions);
    require("@babel/register")
    ({
        ignore:[new RegExp(`^.*${sep}node_modules${sep}/.*`, "i")],
        plugins:[require("@generic-jsx/babel-plugin")]
    });

    global.playbook = Playbook;

    for (const [key, value] of Object.entries(Instruction))
        if (value !== Instruction)
            global[key] = value;

    global.node = require("./node");
}
