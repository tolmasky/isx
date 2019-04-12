const { is, data, string, union, Maybe } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");
const { base, getArguments } = require("generic-jsx");

const primitives = require("./primitives");

const BuildContext = require("./build-context");
const Dockerfile = data `Dockerfile` (
    buildContext    => BuildContext,
    from            => string,
    instructions    => List(string));
const CompileState = data `CompileState` (
    instructions    => [List(string), List(string)()],
    states          => [Map(Function, Object), Map(Function, Object)()] );


module.exports = Dockerfile;

Dockerfile.Dockerfile = Dockerfile;

Dockerfile.compile = function (fDockerfile)
{
    const { from, workspace, children } = getArguments(fDockerfile);

    if (!from)
        throw Error("Dockerfile must have a from property.");

    if (!workspace)
        throw Error("Dockerfile must have a context property.");

    const { instructions } = children.reduce(
        (compileState, child) =>
            compile(compileState, child), CompileState({ }));
    const buildContext = BuildContext.from({ workspace, instructions });

    return Dockerfile({ buildContext, from, instructions });
}

Dockerfile.render = function (dockerfile)
{
    const stringified = dockerfile.instructions
        .map(instruction => instruction())
        .join("\n");

    return `FROM ${dockerfile.from}\n${stringified}`;
}

function compile(compileState, element)
{
    if (primitives.has(base(element)))
    {
        const instructions = compileState.instructions.push(element);

        return CompileState({ ...compileState, instructions });
    }

    const [updated, result] = stateful(compileState, element);
    const type = typeof result;

    if (result === false)
        return updated;

    if (Array.isArray(result))
        return result.reduce((compileState, child) =>
            compile(compileState, child), updated);

    if (type === "function")
        return compile(updated, result);

    throw Error(`Unexpected ${type} when evaluating Dockerfile DSX.`);
}

function stateful(compileState, element)
{
    const f = base(element);
    const state = compileState.states.get(f);
    const properties = getArguments(element);
    const result = base(element)({ ...properties, state });

    if (typeof result !== "function" || base(result) !== primitives.state)
        return [compileState, result];

    const { value, children } = getArguments(result);
    const states = compileState.states.set(f, value);

    return [CompileState({ ...compileState, states }), children];
}
