const { data, union, string, type } = require("@algebraic/type");
const { Optional, None } = require("@algebraic/type/optional");
const { base, getArguments } = require("generic-jsx");
const { hasOwnProperty } = Object;
const has = (key, object) => hasOwnProperty.call(object, key);

const getPlaybook = () => require("./playbook");


const instruction = union `instruction` (

    data `cmd` (
        command     => string ),

    data `env` (
        key         => string,
        value       => string ),

    data `expose` (
        port        => number ),

    data `include` (
        from        => [Optional(getPlaybook()), None],
        method      => instruction.include.method,
        source      => string,
        destination => string ),

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

instruction.include.method = union `Instruction.include.method` (
    data `add` (),
    data `copy` ()
);

instruction.render = function (instruction)
{
    return type.of(instruction).render(instruction);
}

instruction.add = toInclude(instruction.include.method.add);
instruction.copy = toInclude(instruction.include.method.copy);

function toInclude(method)
{
    return function ({ from: uncompiled = None, source, destination })
    {
        const { compile } = getPlaybook();
        const from = uncompiled !== None ? compile(uncompiled) : None;

        return instruction.include({ method, from, source, destination });
    }
}

instruction.include.render = ({ method, from, source, destination }) =>
[
    method === instruction.include.method.add ? "ADD" : "COPY",
    source,
    destination
].join(" ");

instruction.cmd.render = ({ command }) => `CMD ${command}`;

instruction.env.render = ({ key, value }) => `ENV ${key}=${JSON.stringify(value)}`;

instruction.expose.render = ({ port }) => `EXPORT ${port}`;
instruction.label.render = ({ name }) => `LABEL ${name}`;

instruction.user.render = ({ name }) => `USER ${name}`;
instruction.run.render = ({ PATH, command }) =>
    `RUN ${PATH === None ? command : `PATH=${PATH} && ${command}`}`;

instruction.workdir.render = ({ path }) => `WORKDIR ${path}`;

instruction.user.render = ({ name }) => `USER ${name}`;
instruction.volume.render = ({ name }) => `VOLUME ${name}`;

// FIXME: Never allow undefined?...
const optionalPath = T => args =>
    !!args.PATH ? T(args) : T({ ...args, PATH: None });

const fromChildren = (T, key) =>
    ({ children, ...rest }) => T({ ...rest, [key]: children.join("") });

instruction.run.fromXML = fromChildren(optionalPath(instruction.run), "command");
instruction.workdir.fromXML = fromChildren(instruction.workdir, "path");
instruction.user.fromXML = fromChildren(instruction.user, "name");

module.exports = instruction;
module.exports.Instruction = module.exports;

