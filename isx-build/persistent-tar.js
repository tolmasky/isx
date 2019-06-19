const { dirname } = require("path");
const { data, string, of } = require("@algebraic/type");
const { None } = require("@algebraic/type/optional");
const { OrderedMap, OrderedSet, List } = require("@algebraic/collections");

const spawn = require("@cause/task/spawn");

const uuid = require("uuid");
const getChecksum = require("./get-checksum");
const mktmp = () => mkdirp(join("/tmp", "isx", uuid.v4()));

const sync = (fs =>
    ({ exists: fs.existsSync, write: fs.writeFileSync }))
    (require("fs"));
const { join, mkdirp, write } = require("@cause/task/fs");


module.exports = function persistentTar(persistent, root, fileSet, dockerfileContents)
{const r = console.log("IN HERE: " + persistent + " " + root + " " + fileSet + dockerfileContents);
    // FIXME: CHECKSUM WITH DOCKERFILE!
    const checksum = getChecksum(string, dockerfileContents);

//    const checksum = getChecksum(OrderedMap(string, string), fileSet);
    const what = console.log("huh?... " + checksum);
    const tarname = join(δ[mkdirp](join(persistent, "tars")), `${checksum}.tar.gz`);

    if (sync.exists(tarname))
        return tarname;


    const a = console.log(tarname);
    const dockerfile = δ[write](
        join(δ[mkdirp](join(persistent, "dockerfiles")), checksum),
        dockerfileContents);
    const filenames = List(string)([dockerfile]);
/*
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
        .toList();*/
    const stdio = [toReadableStream(filenames.join("\n")), "pipe", "pipe"];
    const gtar = δ[spawn]("gtar", [
        "-czf", tarname,
        "--absolute-names",
        `--transform=s,${dockerfile},/Dockerfile,`,
        ...(root === None ?
            [] :
            [`--transform=s,${join(root, "/")},/root/,`]),
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
