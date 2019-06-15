const { resolve } = require("path");

const { is, data, string } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const { None } = require("@algebraic/type/optional");

const { base, getArguments } = require("generic-jsx");

const { Instruction, include } = require("./instruction");

const { hasOwnProperty } = Object;
const extract = (key, properties, fallback) =>
    hasOwnProperty.call(properties, key) ? properties[key] : fallback;


const Playbook = data `Playbook` (
    from            => string,
    tags            => [List(string), List(string)()],
    instructions    => List(Instruction) );


Playbook.render = playbook =>
[
    `from ${playbook.from}`,
    ...playbook.instructions.map(Instruction.render)
].join("\n");

Playbook.compile = function compile (element)
{
    const args = getArguments(element);
    const f = base(element);
    const fromXML = f.fromXML;

    if (fromXML)
        return fromXML(args);

    if (element === false)
        return false;

    const type = Array.isArray(element) ? "array" : typeof element;

    if (type === "array")
        return []
            .concat(...element.map(compile)
            .filter(compiled => compiled !== false));

    if (type !== "function")
        throw Error(`Unexpected ${type} when evaluating isx.`);

    return compile(element());
}

Playbook.fromXML = function (properties)
{
    const from = extract("from", properties, None);

    if (from === None)
        throw Error("<playbook> must have a from property.");

    const tag = extract("tag", properties, None);
    const tags = List(string)(extract("tags", properties, List(string)()))
        .concat(tag === None ? [] : [tag]);

    const children = extract("children", properties, []);
    const workspace = extract("workspace", properties, None);

    const instructions = List(Instruction)(Playbook.compile(children)
        .map(instruction =>
            !is(include, instruction) || instruction.from !== None ?
                instruction :
                include({ ...instruction,
                    source: resolve(workspace, instruction.source) })));

    return Playbook({ from, tags, instructions });
}


module.exports = Playbook;
