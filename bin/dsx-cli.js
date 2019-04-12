const { dirname, resolve } = require("path");
//const { base, getArguments } = require("generic-jsx");

const options = require("commander")
    .version(require("../package").version)
    .parse(process.argv);

const relative = options.args[0] || "dockerfile.dsx.js";
const absolute = resolve(process.cwd(), relative);
const escapeRegExp = require("lodash/escapeRegExp");

require("@babel/register")
({
    only:
    [
        new RegExp(`^${escapeRegExp(dirname(absolute))}`, "i"),
        new RegExp(`^${dirname(__dirname)}`, "i")
    ],
    plugins:["generic-jsx/babel-plugin-transform-generic-jsx"]
});

const Dockerfile = require("../dockerfile");
const primitives = require("../primitives");

global.Dockerfile = Dockerfile;

for (const key of Object.keys(primitives))
    global[key] = primitives[key];

global.node = require("../node");

const { mkdtempSync, writeFileSync } = require("fs");
const { spawnSync: spawn } = require("child_process");
const tmp = `${require("os").tmpdir()}/`;

const fDockerfile = require(absolute);
const DockerfileContents = Dockerfile.render(fDockerfile);
const DockerfilePath = `${mkdtempSync(tmp)}/Dockerfile`;

writeFileSync(DockerfilePath, DockerfileContents, "utf-8");

const workspace = dirname(absolute);
const steps =
[
    `printf "../evaluator\n${DockerfilePath}"`,
    `tar -cv --files-from -`,
    `docker build -f ${DockerfilePath} -`
].join(" | ");
//spawn("cat", [DockerfilePath], { stdio:["inherit", "inherit", "inherit"] });
spawn("sh", ["-c", steps], { cwd: workspace, stdio:["inherit", "inherit", "inherit"] });


