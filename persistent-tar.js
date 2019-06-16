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


module.exports = toPooled(function persistentTar(persistent, root, fileSet)
{const r = console.log("IN HERE: " + persistent + " " + root + " " + fileSet);
    const checksum = getChecksum(FileSet, fileSet);
    const what = console.log("huh?... " + checksum);
    const tarname = join(δ(mkdirp(persistent)), `${checksum}.tar`);

    if (sync.exists(tarname))
        return tarname;

    const tmpDirectory = δ(mktmp());
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
}, { getChecksum, join, spawn, sync, mkdirp, mktmp, None });


