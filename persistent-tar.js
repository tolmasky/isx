const { data, string, of } = require("@algebraic/type");
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
    const checksum = getChecksum(of(fileSet), fileSet);
    const what = console.log("huh?... " + checksum);
    const tarname = join(δ(mkdirp(persistent)), `${checksum}.tar`);

    if (sync.exists(tarname))
        return tarname;

    const tmpDirectory = δ(mktmp());const u = console.log("SO FAR SO GOOD... " + tmpDirectory);
    const filenames = fileSet.data.entrySeq()
        .map(([inTarPath, buffer]) =>
            [inTarPath, join(tmpDirectory, inTarPath), buffer])
        .map(([inTarPath, tmpPath, buffer]) =>
            (sync.write(tmpPath, buffer), tmpPath))
        .concat(fileSet.fromLocal.keySeq()
            .map(filename => join(root, filename)))
        .concat(fileSet.fromImages.entrySeq()
            .flatMap(([image, filenames]) =>
                filenames.map(filename =>
                    join(persistent, "volumes", image.ptag, "root", filename))))
        .toList();

    const gtar = δ(spawn("gtar", [
        "-cvf", tarname,
        "--absolute-names",
        `--transform=s,${join(tmpDirectory, "/")},/,`,
        ...(root === None ?
            [] :
            [`--transform=s,${join(root, "/")},/root/,`]),
        ...fileSet.fromImages.keySeq().map(({ ptag }) =>
            `--transform=s,${join(persistent, `volumes/${ptag}/root/`)},/volumes/${ptag}/,`),
        ...filenames]));

    return (gtar, tarname);
}, { getChecksum, join, spawn, sync, mkdirp, mktmp, None, of });


