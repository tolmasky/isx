const { None } = require("@algebraic/type/optional");
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

module.exports.build = function build(args, options)
{
    return spawn("docker", ["build", ...args], options);
}

module.exports.image = { };
module.exports.image.inspect = function inspect(args)
{
    const options = { rejectOnError: false };
    const output = δ|spawn("docker", ["image", "inspect", ...args], options);
    const OUTPUT = console.log(output);
    if (output.exitCode !== 0)
        return None;

    return output;
}
