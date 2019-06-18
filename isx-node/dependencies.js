const { basename, relative } = require("path");
const { object } = require("@algebraic/type");

const node = require("@isx/build/node");
const build = require("@isx/build/build").build_
const toPromise = require("@cause/cause/to-promise");
const { compile } = require("@isx/build/playbook");


const exists = (({ existsSync }) =>
    filename => existsSync(filename) && filename)
    (require("fs"));
const { copy, join, mkdirp, write, read } = require("@cause/task/fs");
const { run } = require("@isx/build/instruction");

const getChecksum = require("@isx/build/get-checksum");
const docker = require("@isx/build/docker");
const sh = (...commands) =>
    ["/bin/sh", "-c", commands
        .map(command => command.join(" ")).join(" && ")];
const fail = message => { throw Error(message) };

const lockfiles =
{
    npm: ["package-lock.json", "npm-shrinkwrap.json"],
    yarn: ["yarn.lock"]
};
const binaries = { npm: "npm", yarn: "/root/.yarn/bin/yarn" };


function install({ versions, source, persistent })
{
    const installer = versions.yarn ? "yarn" : "npm";
    const lockfile = lockfiles[installer]
        .map(filename => join(source, filename))
        .find(exists);

    if (!lockfile)
        return fail(
            `No ${lockfiles[installer]}.join(" or ") found at ${source}`);

    const manifest = require(`${source}/package.json`);
    const dependencies = manifest.dependencies || { };

    if (Object.keys(dependencies).length <= 0)
        return false;

    const name = "ephemeral-dependencies-package";
    const description = "Just the dependencies.";
    const truncatedManifest =
        { name, description, dependencies, private: true };
    const shrinkwrap = δ[read](lockfile);

    const checksum = getChecksum(object,
        { manifest: truncatedManifest, shrinkwrap });
    const version = Object.keys(versions)
        .sort()
        .map(key => `${key}-${versions[key]}`)
        .join("-");
    const installerPersistent = join(persistent, installer, version)
    const install = join(installerPersistent, "installs", checksum);
    const tarname = join(install, "node_modules.tar.gz");

    if (exists(tarname))
        return toInstructions(relative(persistent, tarname));

    const truncatedPackage = δ[write](
        join(δ[mkdirp](install), "truncated-package.json"),
        JSON.stringify(truncatedManifest),
        "utf-8");

    const playbook = node[installer]({ versions });
    const image = δ[build](compile(playbook));
    const installerCache = δ[mkdirp](join(installerPersistent, "cache"));
    const installerCacheKey = installer === "npm" ? "cache" : "cache-folder";
    const created = docker.δ[run](image, sh(
        [binaries[installer], "config", "set", installerCacheKey, `/${installer}-cache`],
        [binaries[installer], "install"],
        ["tar", "-czf", "node_modules.tar.gz", "node_modules"],
        ["mv", "node_modules.tar.gz", "/dropbox/node_modules.tar.gz"]),
    {
        mounts:
        {
            [`bind:/package.json`]: `ro:${truncatedPackage}`,
            [`bind:/${basename(lockfile)}`]: `ro:${lockfile}`,
            [`bind:/dropbox`]: `delegated:${install}`,
            [`bind:/${installer}-cache`]: `cached:${installerCache}`
        }
    });

    return created && toInstructions(relative(persistent, tarname));
}

const toInstructions = install =>
    <run>{ `curl -SLO "host.docker.internal/${install}"` }</run>;

(async function ()
{
    try
    {
    //evaluator/system-0.10.x
        const versions = { node: "10.15.3", yarn: "1.16.0" };
        const source = "/Users/tolmasky/Development/tonic/app";
        const persistent = "/Users/tolmasky/Development/cache";

        console.log(await toPromise(Object, install({ versions, source, persistent })));
    }
    catch (e)
    {
        console.log(e);
    }
})();
