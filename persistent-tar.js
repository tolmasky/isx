const { data, string } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { OrderedMap, OrderedSet } = require("@algebraic/collections");

const toPooled = require("@cause/task/transform/to-pooled");
const toPromise = require("@cause/cause/to-promise");
const spawn = require("@cause/task/spawn");

const uuid = require("uuid");
const getChecksum = require("./get-checksum");
const mktmp = () => mkdirp(join("/tmp", "isx", uuid.v4()));

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync }))
    (require("fs"));
const { join, mkdirp } = require("@cause/task/fs");


const FileSet = data `FileSet` (
    data        => OrderedMap(string, Buffer),
    fromLocal   => OrderedMap(string, string),
    fromImages  => OrderedMap(string, OrderedSet(string)) );


module.exports = toPooled(function persistentTar(persistent, root, fileSet)
{const r = console.log("IN HERE: " + persistent + " " + root + " " + fileSet);
    const checksum = getChecksum(FileSet, fileSet);
    const what = console.log("huh?... " + checksum);
    const tarname = join(δ(mkdirp(persistent)), `${checksum}.tar`);
const o = console.log("DONT UNDERSTAND: " + tarname);
    if (sync.exists(tarname))
        return tarname;
const l = console.log("WHAT... " + tarname);
    const tmpDirectory = δ(mktmp());const a = console.log(fileSet.data.entrySeq()
        .map(([inTarPath, buffer]) =>
            [inTarPath, join(tmpDirectory, inTarPath), buffer]));
    const filenames = fileSet.data.entrySeq()
        .map(([inTarPath, buffer]) =>
            [inTarPath, join(tmpDirectory, inTarPath), buffer])
        .map(([inTarPath, tmpPath, buffer]) =>
            (sync.write(tmpPath, buffer), tmpPath))
        .concat(fileSet.fromLocal.keySeq())
        .concat(fileSet.fromImages.entrySeq()
            .flatMap(([image, filename]) =>
                join(persistent, image.ptag, filename)))
        .toList();
    const gtar = δ(spawn("gtar", [
        "-cvf", tarname,
        "--absolute-names",
        `--transform=s,${join(tmpDirectory, "/")},/,`,
        ...(root === None ?
            [] :
            [`--transform=s,${join(root, "/")},/root/,`]),
        ...fileSet.fromImages.keySeq().map(image =>
            `--transform=s,${join(persistent, image.ptag, "/")},/${image.ptag}/,`),
        ...filenames]));

    return (gtar, tarname);
}, { FileSet, getChecksum, join, spawn, sync, mkdirp, mktmp, None });

module.exports.FileSet = FileSet;
console.log(module.exports + "");
/*
(async function ()
{
try {
    const fileSet = FileSet({
        data: OrderedMap(string, Buffer)([["Dockerfile", Buffer.from("blah", "utf-8")]]),
        fromLocal: OrderedMap(string, string)(),
        fromImages: OrderedMap(string, OrderedSet(string))()
    });
    const persistentTar = module.exports;
    console.log(await toPromise(Object, persistentTar("/Users/tolmasky/Development/tonic", "/Users/tolmasky/Development/cache", fileSet)));
    }
    catch (e)
    {
        console.log(e);
    }
})();*/
