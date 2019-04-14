const { Maybe, string } = require("@algebraic/type");
const Image = require("./image");
const primitives = require("./primitives");


module.exports = function build({ filename })
{
    FIXME_registerGenericJSX();

    const fImages = [].concat(require(filename));
    const images = fImages.map(fImage => Image.compile(fImage));

    for (const image of images)
    {
        const { mkdtempSync, writeFileSync } = require("fs");
        const tmp = `${require("os").tmpdir()}/`;
        const DockerfilePath = `${mkdtempSync(tmp)}/Dockerfile`;
        const DockerfileContents = Image.render(image);
    
        writeFileSync(DockerfilePath, DockerfileContents, "utf-8");

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

    global.Image = Image;

    for (const key of Object.keys(primitives))
        global[key] = primitives[key];

    global.node = require("./node");
}


