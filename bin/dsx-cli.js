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



const fDockerfile = require(absolute);
const dockerfile = Dockerfile.compile(fDockerfile);


const { mkdtempSync, writeFileSync } = require("fs");
const tmp = `${require("os").tmpdir()}/`;
const DockerfilePath = `${mkdtempSync(tmp)}/Dockerfile`;
const DockerfileContents = Dockerfile.render(dockerfile);

writeFileSync(DockerfilePath, DockerfileContents, "utf-8");
console.log(DockerfileContents);
const { buildContext } = dockerfile;
const includes = buildContext.filenames.push(DockerfilePath).join("\n");
const steps =
[
    `printf "${includes}"`,
    `tar -cv --files-from - `,
    `docker build -f ${DockerfilePath} -`
].join(" | ")

const { spawnSync: spawn } = require("child_process");

spawn("sh", ["-c", steps], { cwd:buildContext.workspace, stdio:["inherit", "inherit", "inherit"] });
