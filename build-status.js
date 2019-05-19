const { is, data, union } = require("@algebraic/type");
const { List, Set } = require("@algebraic/collections");
const { copy, add } = require("./instruction");
const { None } = require("./optional");
const Image = require("./image");


const Status = union `Status` (
    data `Built` (
        image           => Image,
        dependencies    => List(Status.Built) ),

    data `Ready` (
        image           => Image,
        dependencies    => List(Status.Built) ),

    data `Blocked` (
        image           => Image,
        dependencies    => List(NotBuilt) ),

    data `Failed` (
        image           => Image,
        dependencies    => List(Status.Built) ) );

const NotBuilt = union `NotBuilt` (
    Status.Ready,
    Status.Blocked,
    Status.Failed )


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
        Status.Ready({ image, dependencies });

    return { status, ready: hasDependencies ? ready : ready.add(status) };
}

module.exports = Status;
