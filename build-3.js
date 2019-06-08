const { of, is, Maybe, union, string, getUnscopedTypename } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const image = require("./image");
const Instruction = require("./instruction");
const { None } = require("@algebraic/type/optional");
const { from: toSource } = require("./source");
const toPooled = require("@cause/task/transform/to-pooled");
const toPromise = require("@cause/cause/to-promise");
const { stdout: spawn } = require("@cause/task/spawn");
const fs = require("fs");
const { mkdirp, write } = require("@cause/task/fs");
const tmp = () => (path => (fs.mkdtempSync(path), path))(`${require("os").tmpdir()}/`);
const map = require("@cause/task/map");
        
const CACHE = "./cache";
const { FileSet, from } = require("./extract");


const build = toPooled(["extract", "map", "spawn", "write"], function build(playbook)
{
    const { workspace } = playbook;
    const extract = from(workspace);
    const [fileSets, instructions] = map(extract, playbook.instructions)
        .reduce(([fileSets, instructions], [fileSet, instruction]) =>
        [
            fileSet === None ? fileSets : fileSets.push(fileSet),
            instructions.push(instruction)
        ], [List(FileSet)(), List(Instruction)()]);

    const a = console.log(fileSets);

    const contents = image.render(playbook);
    const DockerfilePath = write(`${tmp()}Dockerfile`, contents, "utf-8");
const b = console.log("BLAH! " + ["-cvf",
        tarPath,
        "--absolute-names",
//        ...workspaceTransform,
        `--transform=s,${DockerfilePath},Dockerfile,`,
//        ...source.checksums.keySeq(),
        DockerfilePath].join(" "));
    const tarPath = (tarPath => spawn("gtar", ["-cvf",
        tarPath,
        "--absolute-names",
//        ...workspaceTransform,
        `--transform=s,${DockerfilePath},Dockerfile,`,
//        ...source.checksums.keySeq(),
        DockerfilePath]) && tarPath)(`${tmp()}/blah.tar`);

    const tarStream = fs.createReadStream(tarPath);
    const dockerOutput = spawn("docker",
        ["build", "-"],
        { stdio: [tarStream, "pipe", "pipe"] });
const c = console.log(dockerOutput);
    return dockerOutput.match(/([a-z0-9]{12})\n$/)[1];
}, { from, FileSet, List, string, spawn, console, write, tmp, is, image, Instruction, fs, None, map });

module.exports = async function build_({ filename, push, sequential }, properties)
{
try {
    FIXME_registerGenericJSX();

    const result = require(filename);
    const fImages = List(Function)([]
        .concat(typeof result === "function" ?
            result(properties) : result));
    const images = fImages.map(fImage => image.compile(fImage));
    const tarPath = await toPromise(Object, build(images.get(0)));

    console.log(tarPath);
    }
    catch(e)
    {
        console.log(e);
    }
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

    for (const type of union.components(Instruction))
        global[getUnscopedTypename(type)] = type;

    global.node = require("./node");
}

/*
const extract = toPooled(["build", "spawn", "mkdirp"], function extract({ from, source })
{
    const a = console.log("EXTRACTING " + source);
    const { checksum } = from;
    const build = buildR();
    const image = build(from);
    const container = spawn("docker", ["create", image])
        .match(/([^\n]*)\n$/)[1];
    const destination = mkdirp(`${CACHE}/${checksum}/`);
    const result = spawn("docker",
    [
        "cp",
        `${container}:${source}`,
        destination
    ]);
    const t = console.log("AND NOW: " + destination + " " + result);

    return t;
}, { buildR: () => build, spawn, console, mkdirp, CACHE });

console.log(extract+"");
*/

    //const status = Status.fromImage(images.get(0));

    //console.log(toString(0)(status));

    //toPromise(Status, status);
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


