const { is, data, string, union, Maybe } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");
const { base, getArguments } = require("generic-jsx");

const primitives = require("./primitives");

const BuildContext = require("./build-context");
const Image = data `Image` (
    buildContext    => BuildContext,
    tags            => List(string),
    from            => string,
    instructions    => List(string),
    socket          => Maybe(string));
const CompileState = data `CompileState` (
    instructions    => [List(string), List(string)()],
    states          => [Map(Function, Object), Map(Function, Object)()] );


module.exports = Image;

Image.compile = function (fImage)
{
    const args = getArguments(fImage);
    const { from, workspace, children, } = args;

    if (!from)
        throw Error("Image must have a from property.");

    if (!workspace)
        throw Error("Image must have a context property.");

    const { instructions } = children.reduce(
        (compileState, child) =>
            compile(compileState, child), CompileState({ }));
    const buildContext = BuildContext.from({ workspace, instructions });
    const tags = List(string)((args.tags || []).concat(args.tag || []));
    const socket = args.socket || Maybe(string).Nothing;

    return Image({ buildContext, from, instructions, tags, socket });
}

Image.render = function (image)
{
    const stringified = image.instructions
        .map(instruction => instruction())
        .join("\n");

    return `FROM ${image.from}\n${stringified}`;
}

function compile(compileState, element)
{
    if (element === false)
        return compileState;

    const type = Array.isArray(element) ? "array" : typeof element;

    if (type === "array")
        return element.reduce((compileState, child) =>
            compile(compileState, child), compileState);

    if (type !== "function")
        throw Error(`Unexpected ${type} when evaluating Image DSX.`);

    if (primitives.has(base(element)))
    {
        const instructions = compileState.instructions.push(element);

        return CompileState({ ...compileState, instructions });
    }

    const [updated, result] = stateful(compileState, element);

    return compile(updated, result);
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
