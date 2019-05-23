const { is, Maybe, union, string, getUnscopedTypename } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const image = require("./image");
const instruction = require("./instruction");

const stdio = ["inherit", "inherit", "inherit"];
const spawn = require("@await/spawn");
const getChecksum = require("./get-checksum");
const Status = require("./build-status");
const getType = object => Object.getPrototypeOf(object).constructor;
const toPromise = require("@cause/cause/to-promise");


module.exports = async function build({ filename, push, sequential }, properties)
{
    FIXME_registerGenericJSX();

    const result = require(filename);
    const fImages = List(Function)([]
        .concat(typeof result === "function" ?
            result(properties) : result));
    const images = fImages.map(fImage => image.compile(fImage));
    const status = Status.initialStatusOfImage(images.get(0)).status


    console.log(toString(0)(status));

    toPromise(Status, status);
    //console.log(Status.initialStatusOfImage(images.get(0)));

    //console.log(getChecksum(image, images.get(0)));
/*
    await each(async image =>
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

        const cwd = buildContext.workspace;

        await spawn("sh", ["-c", steps], { cwd, stdio });

        console.log("FINISHED BUILDING " + image.tags.join(", "));
    }, images, sequential);

    if (push)
        await each(
            args => spawn("docker", args, { stdio }),
            images.flatMap(toPushCommands),
            sequential);*/
}



function toString(indent)
{
    return function (status)
    {
        const { image, dependencies } = status;
        const name = getUnscopedTypename(getType(status));
        const spaces = Array.from({ length: indent * 2 }, () => " ").join("");
        const children = dependencies.map(toString(indent + 1)).join("\n");
        var rest = children && `\n${children}`;

        if (status.buildProcess)
            rest+= `\n${spaces}[${status.buildProcess}]`;

        return `${spaces}${name} (${image.tags.get(0)})${rest}`;
    }
}

async function each(f, array, sequential)
{
    if (sequential)
        for (const item of array)
            await f(item);
    else
        await Promise.all(array.map(f));
}

function toPushCommands(image)
{
    const socket = is(string, image.socket) ? ["-H", image.socket] : [];

    return image.tags.map(tag => [...socket, "push", tag]);
}

function toBuildCommand(image, path)
{
    const flags =
    [
        image.socket !== Maybe(string).Nothing && `-H ${image.socket}`,
        ...image.dockerArguments
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

    global.image = image;

    for (const type of union.components(instruction))
        global[getUnscopedTypename(type)] = type;

    global.node = require("./node");
}


