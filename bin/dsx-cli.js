const { Maybe, string } = require("@algebraic/type");
const { dirname, resolve, sep } = require("path");
//const { base, getArguments } = require("generic-jsx");

const options = require("commander")
    .version(require("../package").version)
    .parse(process.argv);

const getPackageDescriptions = require("magic-ws/get-package-descriptions");
const genericJSXPath = dirname(require.resolve("generic-jsx"));
const packageDescriptions = getPackageDescriptions([], [genericJSXPath]);

require("magic-ws/modify-resolve-lookup-paths")(packageDescriptions);

const relative = options.args[0] || "dockerfile.dsx.js";
const absolute = resolve(process.cwd(), relative);
Error.stackTraceLimit = 1000;

require("@babel/register")
({
    ignore:[new RegExp(`^.*${sep}node_modules${sep}/.*`, "i")],
    plugins:[require("@generic-jsx/babel-plugin")]
});

const Image = require("../image");
const primitives = require("../primitives");

global.Image = Image;

for (const key of Object.keys(primitives))
    global[key] = primitives[key];

global.node = require("../node");


const fImages = [].concat(require(absolute));
const images = fImages.map(fImage => Image.compile(fImage));

for (const image of images)
{
    const { mkdtempSync, writeFileSync } = require("fs");
    const tmp = `${require("os").tmpdir()}/`;
    const DockerfilePath = `${mkdtempSync(tmp)}/Dockerfile`;
    const DockerfileContents = Image.render(image);

    writeFileSync(DockerfilePath, DockerfileContents, "utf-8");
    console.log(DockerfileContents);
    const { buildContext } = image;
    const includes = buildContext.filenames.push(DockerfilePath).join("\n");

    const steps =
    [
        `printf "${includes}"`,
        `tar -cv --files-from - `,
        toBuildCommand(image, DockerfilePath)
    ].join(" | ")

    const { spawnSync: spawn } = require("child_process");

    spawn("sh", ["-c", steps], { cwd:buildContext.workspace, stdio:["inherit", "inherit", "inherit"] });
}

function toBuildCommand(image, path)
{
    const flags =
    [
        image.socket !== Maybe(string).Nothing && `-H ${image.socket}`
    ].filter(flag => !!flag).join(" ");
    const buildFlags =
    [
        `-f ${path}`,
        ...image.tags.map(tag => `-t ${tag}`)
    ].filter(flag => !!flag).join(" ");

    return `docker ${flags} build ${buildFlags} -`;
}
