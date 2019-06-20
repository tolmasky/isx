const image = require("@isx/build/image_");
const { build } = image;
const { run } = require("@isx/build/instruction");
const { join, mkdirp, exists } = require("@cause/task/fs");
const node = require("@isx/node/node");

const { basename, dirname } = require("path");
const toVersionKey = versions => Object.keys(versions)
    .sort().map(key => `${key}-${versions[key]}`).join("-");
const dependencies = require("./dependencies");
const fail = (type, message) => { throw type(message); }


function yarn({ versions })
{
    const from = "buildpack-deps:jessie";
    const tag = `isx:${toVersionKey(versions)}`;

    return  <image { ...{ from, tag } } >
                <node.install version = { versions.node } />
                <run>
                {[
                    "curl -o- -L https://yarnpkg.com/install.sh",
                    `bash -s -- --version ${versions.yarn}`
                ].join(" | ")}
                </run>
            </image>;
}

module.exports = yarn;

yarn.install = function ({ source, versions, persistent })
{
    if (basename(source) !== "package.json")
        return fail(TypeError,
            "source field of yarn.install must point to a package.json file.");
const m = console.log(source, versions, persistent);
    const parent = dirname(source);
    const lockfile = δ[exists](join(parent, "yarn.lock"));
const p = console.log(lockfile + "!");
    if (!lockfile) {
    const m = console.log("what?" + lockfile);
        return fail(Error,
            `No lockfile found in ${parent}. yarn.install requires a ` +
            `lockfile to be present.`); }
const __ = console.log(lockfile);
const RR = console.log("RR: " + persistent);
    //const persistent = δ[mkdirp](join(persistent, "yarn", key));const r2 = console.log("... " + persistent);
    const key = join("yarn", toVersionKey(versions));
    const binary = "/root/.yarn/bin/yarn";
    const image = δ[build](persistent, <yarn { ...{ versions } }/>);

//                { cache => [binary, "config", "set", "cache-folder", cache] }
    return  <dependencies { ...{ image, source, lockfile, key } } >
                { [binary, "install"] }
            </dependencies>;
};
console.log(yarn.install + "");
(async function ()
{
    try
    {
        const versions = { node: "10.15.3", yarn: "1.16.0" };
        const source = "/Users/tolmasky/Development/tonic/app/package.json";
        const persistent = "/Users/tolmasky/Development/cache";
        const toPromise = require("@cause/cause/to-promise");
        const entrypoint = <image from = "buildpack-deps:jessie" >
            <yarn.install { ...{ versions, source } } />
        </image>;
        const build = require("../isx-build/image_").build;

        console.log("--> " + await toPromise(Object, build(persistent, entrypoint)));
    }
    catch (e)
    {
        console.log(e);
    }
})();
