const { of, is, Maybe, union, string, getUnscopedTypename } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const image = require("./image");
const Instruction = require("./instruction");
const { None } = require("@algebraic/type/optional");
const toPooled = require("@cause/task/transform/to-pooled");
const toPromise = require("@cause/cause/to-promise");
const { stdout: spawn } = require("@cause/task/spawn");
const fs = require("fs");
const { join, mkdirp, write } = require("@cause/task/fs");
const map = require("@cause/task/map");
const getChecksum = require("./get-checksum");
const CACHE = require("path").resolve("./cache");
const FileSet = require("./file-set");
const Image = require("./image_");
const tar = require("./tar");


const build = toPooled(["map", "spawn", "write", "mkdirp", "tar"], function build(playbook)
{
    const __announce__ = console.log(`BUILD ${playbook.tags}`);
    const { workspace } = playbook;
    const [fileSets, instructions] =
        map(FileSet.extract(workspace), playbook.instructions)
        .reduce(([fileSets, instructions], [fileSet, instruction]) =>
        [
            fileSet === None ? fileSets : fileSets.push(fileSet),
            instructions.push(instruction)
        ], [List(FileSet)(), List(Instruction)()]);

    const fromExtractions = image({ ...playbook, instructions });
    const contents = image.render(fromExtractions);
    const tt = console.log("THE DOCKERFILE WILL BE " + contents);
    const checksum = getChecksum(string, contents);
    const dockerfiles = join(CACHE, "dockerfiles");
    const DockerfilePath = write(
        join(dockerfiles, checksum),
        contents,
        "utf-8");

    const patterns = List(string)([checksum]);
    const dockerfileSet = FileSet({ origin: dockerfiles, patterns });

    const tarPath = tar(fileSets.push(dockerfileSet));
    const tarStream = fs.createReadStream(tarPath);
    const dockerOutput = spawn("docker",
        ["build", "-", "-f", checksum],
        { stdio: [tarStream, "pipe", "pipe"] });
    const id = dockerOutput.match(/([a-z0-9]{12})\n$/)[1];

    return Image({ id });
}, { CACHE, getChecksum, FileSet, List, string, spawn, console, write, is, image, Instruction, fs, None, map, of, mkdirp, Image, tar, join });

module.exports = async function build_({ filename, push, sequential }, properties)
{
try {
    FIXME_registerGenericJSX();

    const result = require(filename);
    const fImages = List(Function)([]
        .concat(typeof result === "function" ?
            result(properties) : result));
    const images = fImages.map(fImage => image.compile(fImage));
//    const extract = from(images.get(0).workspace);
//    const tarPath = await toPromise(Object, extract(images.get(0).instructions.get(0)));
    const tarPath = await toPromise(Object, build(images.get(0)));

    console.log(tarPath);
    }
    catch(e)
    {
        console.log(e);
    }
}

module.exports.build_ = build;

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
    const o = console.log("DOCKER FILE: " + DockerfilePath);
    const tarPath = (tarPath => spawn("gtar", ["-cvf",
        tarPath,
        "--absolute-names",
//        ...workspaceTransform,
        `--transform=s,${DockerfilePath},Dockerfile,`,
//        ...source.checksums.keySeq(),
        DockerfilePath]) && tarPath)
        (`${CACHE}/tars/${getChecksum(string, contents)}`);
const i = console.log("THE TAR FILE: " + tarPath);
    const tarStream = fs.createReadStream(tarPath);
    const dockerOutput = spawn("docker",
        ["build", "-"],
        { stdio: [tarStream, "pipe", "pipe"] });
const c = console.log("THE RESULT WAS: " + dockerOutput);
    return dockerOutput.match(/([a-z0-9]{12})\n$/)[1];*/
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


