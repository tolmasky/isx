const { is, data, string, union, Maybe } = require("@algebraic/type");
const { List, Map, Set } = require("@algebraic/collections");
const { base, getArguments } = require("generic-jsx");
const { Optional, None } = require("./optional");
const instruction = require("./instruction");

const image = data `image` (
    from            => string,
    tags            => [List(string), List(string)()],
    workspace       => Optional(string),
    instructions    => List(instruction) );


image.compile = function compile (element)
{
    const args = getArguments(element);
    const f = base(element);
    const fromXML = f.fromXML;

    if (fromXML)
        return fromXML(element);

    if (element === false)
        return false;

    const type = Array.isArray(element) ? "array" : typeof element;

    if (type === "array")
        return [].concat(...element.map(compile));

    if (type !== "function")
        throw Error(`Unexpected ${type} when evaluating isx.`);

    return compile(element());
}

image.fromXML = function (element)
{
    const args = getArguments(element);
    const from = args.from;
    const workspace = args.workspace || None;

    if (!from)
        throw Error("<image> must have a from property.");

    const tags = List(string)((args.tags || []).concat(args.tag || []));
    const instructions = List(instruction)(image.compile(args.children));

    return image({ from, tags, workspace, instructions });
}

module.exports = image;
