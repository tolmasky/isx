const { data, string } = require("@algebraic/type");
const { OrderedMap, OrderedSet } = require("@algebraic/collections");

const toPooled = require("@cause/task/transform/to-pooled");
const toPromise = require("@cause/cause/to-promise");
const { stdout: spawn } = require("@cause/task/spawn");

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


module.exports = toPooled(["spawn", "mkdirp", "mktmp"], function persistentTar(root, persistent, fileSet)
{
    const checksum = getChecksum(FileSet, fileSet);
    const tarname = join(mkdirp(persistent), `${checksum}.tar`);

    if (sync.exists(tarname))
        return tarname;

    const tmpDirectory = mktmp();
    const filenames = fileSet.data.entrySeq()
        .map(([inTarPath, buffer]) =>
            [inTarPath, join(tmpDirectory, inTarPath), buffer])
        .map(([inTarPath, tmpPath, buffer]) =>
            (sync.write(tmpPath, buffer), tmpPath))
        .concat(fileSet.fromLocal.keySeq())
        .concat(fileSet.fromImages.entrySeq()
            .flatMap(([origin, filename]) =>
                join(persistent, origin, filename)))
        .toList();
    const gtar = spawn("gtar", [
        "-cvf", tarname,
        "--absolute-names",
        `--transform=s,${join(tmpDirectory, "/")},/,`,
        `--transform=s,${join(root, "/")},/root/,`,
        ...fileSet.fromImages.keySeq().map(origin =>
            `--transform=s,${join(persistent, origin, "/")},/${origin}/,`),
        ...filenames]);

    return (gtar, tarname);
}, { FileSet, getChecksum, join, spawn, sync, mkdirp, mktmp });

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
