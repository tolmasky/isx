const { data, union, string, Maybe } = require("@algebraic/type");
const { base, getArguments } = require("generic-jsx");

const image = () => require("./image");
const { Optional, None } = require("./optional");
const type = record => (Object.getPrototypeOf(record).constructor);


const instruction = union `instruction` (
    data `add` (
        from        => [Optional(image()), None],
        source      => string,
        destination => string ),

    data `cmd` (
        command     => string ),

    data `copy` (
        from        => [Optional(image()), None],
        source      => string,
        destination => string ),

    data `env` (
        key         => string,
        value       => string ),

    data `expose` (
        port        => number ),

    data `label` (
        name        => string ),

    data `run` (
        PATH        => [Optional(string), None],
        command     => string ),

    data `workdir` (
        path        => string ),

    data `user` (
        name        => string ),

    data `volume` (
        name        => string )
);

instruction.render = function (instruction)
{
    return type(instruction).render(instruction);
}

const insert = instruction => ({ from, source, destination }) =>
    `${instruction} ${from === None ? None : `--from ${from} `}` +
    `${source} ${destination}`;

instruction.add.render = insert("ADD");
instruction.copy.render = insert("COPY");
instruction.cmd.render = ({ command }) => `CMD ${command}`;

instruction.env.render = ({ key, value }) => `ENV ${key}=${JSON.stringify(value)}`;

instruction.expose.render = ({ port }) => `EXPORT ${port}`;
instruction.label.render = ({ name }) => `LABEL ${name}`;

instruction.user.render = ({ name }) => `USER ${name}`;
instruction.run.render = ({ PATH, command }) =>
    `RUN ${PATH === None ? command : `PATH=${PATH} && ${command}`}`;

instruction.workdir.render = ({ name }) => `WORKDIR ${name}`;

instruction.user.render = ({ name }) => `USER ${name}`;
instruction.volume.render = ({ name }) => `VOLUME ${name}`;

instruction.add.fromXML =
instruction.copy.fromXML = function (element)
{
    const args = getArguments(element);
    const f = base(element);
    const from = args.from ? image().compile(args.from) : None;
    
    return f({ ...args, from });
}

instruction.run.fromXML = fromChildren("command");
instruction.workdir.fromXML = fromChildren("path");
instruction.user.fromXML = fromChildren("name");

function fromChildren(key)
{
    return function (element)
    {
        const { children, ...args } = getArguments(element);
        const value = children.join("");

        return base(element)({ ...args, [key]: value });
    }
}

module.exports = instruction;
