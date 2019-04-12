const { is, data, string, union, Maybe } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");
const { base, getArguments } = require("generic-jsx");

const primitives = require("./primitives");

const Rule = union `BuildContext.Rule` (
    string,
    data `Glob` (pattern => string) );

const Context = data `` (
    includes => [List(Rule), List(Rule)()],
    excludes => [List(Rule), List(Rule)()] )

Context.Rule = Rule;

const Dockerfile = data `Dockerfile` (
    context         => [Context, Context({ })],
    from            => [Maybe(string), Maybe(string).Nothing],
    instructions    => [List(string), List(string)()],
    states          => [Map(Function, Object), Map(Function, Object)()] );

module.exports = Dockerfile;

Dockerfile.Context = Context;
Dockerfile.Dockerfile = Dockerfile;

Dockerfile.render = function (fDockerfile)
{
    const { from, children } = getArguments(fDockerfile);

    if (is(Maybe(string).Nothing, from))
        throw Error("Dockerfile must have a from property.");

    const dockerfile = children.reduce(
        (dockerfile, child) =>
            render(dockerfile, child), Dockerfile({ from }));
    const { instructions } = dockerfile;

    return `FROM ${from}\n${instructions.join("\n")}`;
}

function render(dockerfile, element)
{
    const [updated, result] = stateful(dockerfile, element);
    const type = typeof result;

    if (result === false)
        return updated;

    if (Array.isArray(result))
        return result.reduce((dockerfile, child) =>
            render(dockerfile, child), updated);

    if (type === "function")
        return render(updated, result);

    if (type !== "string")
        throw Error(`Unexpected ${type} when evaluating Dockerfile DSX.`);

    const instructions = updated.instructions.push(result);

    return Dockerfile({ ...updated, instructions });
}

function stateful(dockerfile, element)
{
    const f = base(element);
    const state = dockerfile.states.get(f);
    const properties = getArguments(element);
    const result = base(element)({ ...properties, state });

    if (typeof result !== "function" || base(result) !== primitives.state)
        return [dockerfile, result];

    const { value, children } = getArguments(result);
    const states = dockerfile.states.set(f, value);

    return [Dockerfile({ ...dockerfile, states }), children];
}
