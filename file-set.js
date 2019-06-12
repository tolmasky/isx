const { data, union, string, type } = require("@algebraic/type");
const { dirname } = require("path");
const { List } = require("@algebraic/collections");
const { None } = require("@algebraic/type/optional");
const toPooled = require("@cause/task/transform/to-pooled");
const { fromAsync } = require("@cause/task");
const { join } = require("@cause/task/fs");
const t_id = fromAsync(async x => (await 0, x));
const Image = require("./image_");

const Origin = union `Origin` (
    string,
    Image );

const FileSet = data `FileSet` (
    origin      => Origin,
    patterns    => List(string) );


module.exports = FileSet;

const toOrigin = toPooled(["t_id", "build"], function toOrigin({ from, workspace })
{
    if (from === None)
        return t_id(["workspace", workspace]);

    const build = buildR();
    const image = build(from);

    return [image.id, image];
}, { t_id, None, buildR: () => require("./build-3").build_ });

FileSet.extract = function (workspace)
{
    return toPooled(["toOrigin", "t_id"], function (instruction)
    {
        if (!type.is(add, instruction) && !type.is(copy, instruction))
            return t_id([None, instruction]);

        const T = type.of(instruction);
        const { from, source, destination } = instruction;
        const [tarBase, origin] = toOrigin({ from, workspace });
        const patterns = List(string)([source]);
        const fileSet = FileSet({ origin, patterns });

        return [fileSet, T({ source: join(tarBase, source), destination })];
    }, { type, None, List, FileSet, string, toOrigin, workspace, t_id, join });
}

FileSet.from = function (dirname, filename)
{
    const origin = 1;
}

/*
const extract = toPooled(["toFileSet", "t_id"], function ({ workspace, instruction })
{
    if (!type.is(add, instruction) && !type.is(copy, instruction))
        return t_id([None, instruction]);

    const __announce__ = console.log(`EXTRACT ${instruction.from.tags}`);
    const T = type.of(instruction);
    const fileSet = toFileSet({ workspace, instruction });
    const t = console.log("file set is " + fileSet);
    const { source, destination } = instruction;
    const scopedSource = `${fileSet.scope}/${source}`;

    return [fileSet, T({ source: scopedSource, destination })];
}, { type, None, toFileSet, t_id });

/*

    if (from === None)
        return t_id([, ]

    const fileSet = toFileSet({ workspace, instruction });
    const { source, destination } = instruction;
    const scopedSource = `${fileSet.scope}/${source}`;

    return [fileSet, T({ source: scopedSource, destination })];
*/