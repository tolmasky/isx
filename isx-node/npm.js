const fail = require("@algebraic/type/fail");
const image = require("@isx/build/image_");
const { build } = image;
const { run } = require("@isx/build/instruction");
const { join, mkdirp, exists } = require("@parallel-branch/fs");
const node = require("@isx/node/node");

const { basename, dirname } = require("path");
const toVersionKey = versions => Object.keys(versions)
    .sort().map(key => `${key}-${versions[key]}`).join("-");
const dependencies = require("./dependencies");


module.exports.install = parallel function ({ source, versions, persistent })
{
    if (basename(source) !== "package.json")
        return fail.type(
            "source field of npm.install must point to a package.json file.");

    const parent = dirname(source);
console.log("GOT PARNET: " + parent);
    const lockfile =
        branch exists(join(parent, "npm-shrinkwrap.json")) ||
        branch exists(join(parent, "package-lock.json"));
console.log("THIS FAR " + lockfile);
    if (!lockfile)
        return fail(
            `No lockfile found in ${parent}. npm.install requires a ` +
            `lockfile to be present.`);

    //const persistent = branch mkdirp(join(persistent, "yarn", key));
    const key = "npm";
    const image = branch build(persistent, <node version = { versions.node }/>);
    const binary = "npm";

//                { cache => [binary, "config", "set", "cache-folder", cache] }
    return  <dependencies { ...{ binary, image, source, lockfile, key } } >
                { [binary, "install"] }
            </dependencies>;
};
