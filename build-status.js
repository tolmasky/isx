const { is, data, union, tundefined, number, string, serialize } = require("@algebraic/type");
const { List, Set } = require("@algebraic/collections");
const { copy, add } = require("./instruction");
const { None } = require("./optional");
const Image = require("./image");
const Optional = require("./optional");
const getChecksum = require("./get-checksum");

const Process = require("@cause/process");
const Cause = require("@cause/cause");
const update = require("@cause/cause/update");



const Status = union `Status` (
    data `Built` (
        image           => Image,
        dependencies    => List(Status.Built) ),

    data `Ready` (
        image           => Image,
        dependencies    => List(Status.Built),
        buildProcess    => Process ),

    data `Blocked` (
        image           => Image,
        dependencies    => List(NotBuilt) ),

    data `Failed` (
        image           => Image,
        dependencies    => List(Status.Built) ) );

const Built = data `Built` ();

Status.Ready.update = update
    .on(Cause(number).Completed.Succeeded, (ready, event) =>
        [Status.Built(ready), [Built]]);

Status.Blocked.update = update
    .on(Cause.Start, (blocked, event) =>
    {
        console.log("HERE!");
        return [blocked, []];
    })
    .on(Built, (blocked, event, fromKeyPath) =>
    (console.log("HERE! " + blocked.dependencies.every(dependency => is(NotBuilt, dependency)) + " " + fromKeyPath),
        blocked.dependencies.some(dependency => is(NotBuilt, dependency)) ?
            blocked :
            Status.Ready({ ...blocked, buildProcess: toBuildProcess(blocked.image) })));



const NotBuilt = union `NotBuilt` (
    Status.Ready,
    Status.Blocked,
    Status.Failed )






module.exports = Status;

Status.fromImage = function fromImage(image)
{
    const hasDependency = instruction =>
        (is(copy, instruction) || is(add, instruction)) &&
        instruction.from !== None;
    const dependencies = image.instructions
        .filter(hasDependency)
        .map(instruction => fromImage(instruction.from));
    const hasDependencies = dependencies.size > 0;

    return hasDependencies ?
        Status.Blocked({ image, dependencies }) :
        Status.Ready({ image, dependencies,
            buildProcess: toBuildProcess(image) });
}


function toBuildProcess(image)
{
    // FIXME: Move to command too?
    const { mkdtempSync, writeFileSync } = require("fs");
    const tmp = `${require("os").tmpdir()}/`;
    const DockerfilePath = `${mkdtempSync(tmp)}/Dockerfile`;
    const DockerfileContents = Image.render(image);
console.log(DockerfileContents);
    writeFileSync(DockerfilePath, DockerfileContents, "utf-8");

    const command = "sh";
    const { buildContext } = image;
    const includes = List(string)().push(DockerfilePath).join("\n");
    const steps =
    [
        `printf "${includes}"`,
        `gtar -cv --transform=s,${DockerfilePath},Dockerfile, --absolute-names --show-transformed-names --files-from - `,
        toBuildCommand(image, "Dockerfile")
    ].join(" | ")
    const cwd = image.workspace === Optional.None ?
        process.cwd() : image.workspace;

    return Process.start("sh", ["-c", steps], cwd);
}

function command(...args)
{
    return args.join(" ");
}

function toBuildCommand(image, path)
{
    const flags =
    [
//        image.socket !== Maybe(string).Nothing && `-H ${image.socket}`,
//        ...image.dockerArguments
    ].filter(flag => !!flag).join(" ");
    const buildFlags =
    [
        `-f ${path}`,
        ...image.tags.map(tag => `-t ${tag}`),
        `-t tracking:${image.checksum}`
    ].filter(flag => !!flag).join(" ");

    return `docker ${flags} build ${buildFlags} -`;
}


/*

Status.initialStatusOfImage = function (image)
{
    const hasDependency = instruction =>
        (is(copy, instruction) || is(add, instruction)) &&
        instruction.from !== None;
    const { ready, dependencies } = image.instructions
        .map(instruction => hasDependency(instruction) && instruction.from)
        .filter(dependency => !!dependency)
        .reduce((accum, dependency) =>
            (({ status, ready }) =>
                ({
                    dependencies: accum.dependencies.push(status),
                    ready: accum.ready.union(ready)
                }))(Status.initialStatusOfImage(dependency)),
            { ready: Set(Status)(), dependencies: List(Status)() });
    const hasDependencies = dependencies.size > 0;

    const status = hasDependencies ?
        Status.Blocked({ image, dependencies }) :
        Status.Ready({ image, dependencies,
            buildProcess: toBuildProcess(image) });

    return { status, ready: hasDependencies ? ready : ready.add(status) };
}
*/
