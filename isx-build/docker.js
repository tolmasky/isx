const spawn = require("@cause/task/spawn");


module.exports.run = function run(image, args, options = { })
{
    const { mounts, ...spawnOptions } = options;
    const mountArguments = Object
        .entries(mounts || {})
        .map(([target, source]) => [target.split(":"), source.split(":")])
        .map(([[type, target], [consistency, source]]) =>
            `type=${type},source=${source},target=${target},consistency=${consistency}`)
        .flatMap(argument => ["--mount", argument]);

    return spawn("docker",
    [
        "run", "--rm", ...mountArguments, `isx:${image.ptag}`,
        ...args
    ], spawnOptions);
}
