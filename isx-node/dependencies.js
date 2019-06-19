const { basename, relative } = require("path");
const { object } = require("@algebraic/type");

const node = require("@isx/build/node");
const build = require("@isx/build/build").build_;

const { join, mkdirp, write, read, exists } = require("@cause/task/fs");
const { run } = require("@isx/build/instruction");

const getChecksum = require("@isx/build/get-checksum");
const docker = require("@isx/build/docker");
const sh = (...commands) =>
    ["/bin/sh", "-c", commands
        .map(command => command.join(" ")).join(" && ")];
const fail = message => { throw Error(message) };


module.exports = function dependencies(properties)
{
    const { source } = properties;
    const fullPackage = JSON.parse(δ[read](source, "utf-8"));
    const dependencies = fullPackage.dependencies || { };

    if (Object.keys(dependencies).length <= 0)
        return false;

    const { lockfile } = properties;
    const shrinkwrap = δ[read](lockfile, "utf-8");
    const minimalPackage = toMinimalPackage(dependencies);
    const checksum = getChecksum(object, { minimalPackage, shrinkwrap });

    const { persistent, key } = properties;
    const install = δ[mkdirp](join(persistent, key, "installs", checksum));
    const tarname = join(install, "node_modules.tar.gz");

    if (δ[exists](tarname))
        return toInstructions(relative(persistent, tarname));

    const minimalPackagePath = δ[write](
        join(install, "minimal-package.json"),
        JSON.stringify(minimalPackage),
        "utf-8");

    const { image, children } = properties;
//    const installerCache = δ[mkdirp](join(persistent, key, "cache"));
    const created = docker.δ[run](image, sh(
        ...children.map(child =>
            typeof child === "function" ? child("/cache") : child),
        ["tar", "-czf", "node_modules.tar.gz", "node_modules"],
        ["mv", "node_modules.tar.gz", "/dropbox/node_modules.tar.gz"]),
    {
        mounts:
        {
            [`bind:/package.json`]: `ro:${minimalPackagePath}`,
            [`bind:/${basename(lockfile)}`]: `ro:${lockfile}`,
            [`bind:/dropbox`]: `delegated:${install}`,
//            [`bind:/cache`]: `cached:${installerCache}`
        }
    });

    return created && toInstructions(relative(persistent, tarname));
}

function toMinimalPackage(dependencies)
{
    const name = "minimal-package";
    const description = "Just the dependencies.";
    
    return { name, description, dependencies, private: true };
}

const toInstructions = install =>
[
    <run>{ `curl -SLO "http://host.docker.internal:9191/${install}"` }</run>,
    <run>
    {[
        `mkdir /node_modules`,
        `tar -xzf "/${basename(install)}" -C /node_modules/ --strip-components=1`,
        `rm "/${basename(install)}"`
    ].join(" && ")}
    </run>
];

/*
(async function ()
{
    try
    {
    //evaluator/system-0.10.x
        const versions = { node: "10.15.3", yarn: "1.16.0" };
        const source = "/Users/tolmasky/Development/tonic/app";
        const persistent = "/Users/tolmasky/Development/cache";

//        console.log(await toPromise(Object, install({ versions, source, persistent })));
        console.log(install({ versions, source, persistent }))
    }
    catch (e)
    {
        console.log(e);
    }
})();*/
