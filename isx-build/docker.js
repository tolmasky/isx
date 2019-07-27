const { None } = require("@algebraic/type/optional");
const spawn = require("@parallel-branch/spawn");


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
module.exports.image.inspect = parallel function inspect(args)
{
    const options = { throwOnExitCode: false };
    const output = branch spawn("docker", ["image", "inspect", ...args], options);
    const OUTPUT = console.log(output);

    return output.exitCode === 0 ? output : None;
}
