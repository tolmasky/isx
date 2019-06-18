const { data, string, of } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { OrderedMap, OrderedSet } = require("@algebraic/collections");

const spawn = require("@cause/task/spawn");

const uuid = require("uuid");
const getChecksum = require("./get-checksum");
const mktmp = () => mkdirp(join("/tmp", "isx", uuid.v4()));

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync }))
    (require("fs"));
const { join, mkdirp } = require("@cause/task/fs");


module.exports = function persistentTar(persistent, root, fileSet)
{const r = console.log("IN HERE: " + persistent + " " + root + " " + fileSet);
    const checksum = getChecksum(of(fileSet), fileSet);
    const what = console.log("huh?... " + checksum);
    const tarname = join(δ[mkdirp](persistent), `${checksum}.tar.gz`);

    if (sync.exists(tarname))
        return tarname;

    const tmpDirectory = δ[mktmp]();
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
    const stdio = [toReadableStream(filenames.join("\n")), "pipe", "pipe"];
    const gtar = δ[spawn]("gtar", [
        "-czf", tarname,
        "--absolute-names",
        `--transform=s,${join(tmpDirectory, "/")},/,`,
        ...(root === None ?
            [] :
            [`--transform=s,${join(root, "/")},/root/,`]),
        ...fileSet.fromImages.keySeq().map(({ ptag }) =>
            `--transform=s,${join(persistent, `volumes/${ptag}/root/`)},/volumes/${ptag}/,`),
        "--files-from", "-"],
        { stdio });

    return (gtar, tarname);
}

function toReadableStream(string)
{
    const stream = new (require("stream").Readable);

    stream.push(string);
    stream.push(null);

    return stream;
}
