const { is, data, string, union, Maybe } = require("@algebraic/type");
const { List, Map, Set } = require("@algebraic/collections");
const { base, getArguments } = require("generic-jsx");
const { hasOwnProperty } = Object;
const ConstructorSymbol = require("./constructor-symbol");

const primitives = require("./primitives");

const BuildContext = require("./build-context");
const Image = data `Image` (
    buildContext    => BuildContext,
    tags            => List(string),
    from            => string,
    instructions    => List(string),
    subImages      => [Set(Image), Set(Image)()],
    socket          => Maybe(string),
    dockerArguments => [List(string), List(string)()]);
const CompileState = data `CompileState` (
    instructions    => [List(string), List(string)()],
    states          => [Map(Function, Object), Map(Function, Object)()] );

const ImageChild = union `ImageChild` (Image, Function);

//const Project = data `Project` (
//    images          =>  Set(Image),
//    intermediates   =>  Set(Image));
Array.prototype.print = function ()
{
    return "["+this.map(element => Array.isArray(element) ? element.print() : "item").join(",")+"]";
}
Image.compile = function compile (element)
{
    const args = getArguments(element);
    const f = base(element);
    const constructor = f[ConstructorSymbol];

    if (constructor)
        return constructor(element);

    if (element === false)
        return false;

    const type = Array.isArray(element) ? "array" : typeof element;

    if (type === "array")
    {
        const x = [].concat(...element.map(compile));

        console.log("RESULT: " + x.print());
        console.log(x[0]);

        return x;
}

    if (type !== "function")
        throw Error(`Unexpected ${type} when evaluating isx.`);

    return compile(element());
}

Image[ConstructorSymbol] = function (element)
{
    const args = getArguments(element);
    const { from, workspace, children } = args;

    if (!from)
        throw Error("Image must have a from property.");

    if (!workspace)
        throw Error("Image must have a context property.");

    const compiled = List(ImageChild)(Image.compile(children))
        .groupBy(child => is(Image, child) ? "images" : (console.log("IT WAS A"+child+Array.isArray(child)),"instructions"));
    const subImages = Set(Image)(compiled.get("images", List(Image)()));
    const instructions = compiled.get("instructions", List(Function)());

    const buildContext = BuildContext.from({ workspace, instructions });
    const tags = List(string)((args.tags || []).concat(args.tag || []));
    const socket = args.socket || Maybe(string).Nothing;
    const dockerArguments = hasOwnProperty.call(args, "dockerArguments") ?
        List(string)(args.dockerArguments) : List(string)();

    return Image({ buildContext, from, instructions, subImages, tags, socket, dockerArguments });
}

module.exports = Image;

/*
Project.compile = function (element)
{
    const args = getArguments(fImage);
    const { from, workspace, children } = args;
}


module.exports = Image;

Image.compile = function (project, fImage)
{
    const args = getArguments(fImage);
    const { from, workspace, children } = args;

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
    const dockerArguments = hasOwnProperty.call(args, "dockerArguments") ?
        List(string)(args.dockerArguments) : List(string)();

    return Image({ buildContext, from, instructions, tags, socket, dockerArguments });
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
}*/
