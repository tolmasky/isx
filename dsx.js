





const plugins = ["generic-jsx/babel-plugin-transform-generic-jsx"];
const { is, data, string, Maybe } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");

const Dockerfile = data `Dockerfile` (
    from            => [Maybe(string), Maybe(string).Nothing],
    instructions    => [List(string), List(string)()],
    states          => [Map(Function, Object), Map(Function, Object)()] );

//const { Map } = require("immutable");
const { base, getArguments } = require("generic-jsx");

require("@babel/register")({ plugins });

const command = f => f()
const primitives =
{
    add: ({ from, to }) => `ADD ${from} ${to}`,

    cmd: ({ children:[command] }) => `CMD ${command}`,

    copy: ({ from, to }) => `COPY ${from} ${to}`,
    
    label: ({ children:[label] }) => `LABEL ${children}`,

    run: ({ PATH, children:[command] }) =>
        `RUN ${ PATH !== void(0) ? `PATH=${PATH} && ${command}` : command }`,

    mkdir: ({ children:[path] }) => `MKDIR ${path}`,

    workdir: ({ children:[path] }) => `WORKDIR ${path}`,

    user: ({ children:[user] }) => `USER ${user}`,
    
    volume: ({ children:JSON }) => `VOLUME ${JSON}`,

    state: () => {}
}

for (const key of Object.keys(primitives))
    global[key] = primitives[key];

global.Dockerfile = Dockerfile;


Dockerfile.render = function (fDockerfile)
{
    const { from, children } = getArguments(fDockerfile);

    if (is(Maybe(string).Nothing, from))
        throw Error("Dockerfile must have a from property.");

    const dockerfile = children.reduce(
        (dockerfile, child) =>
            render(dockerfile, child), Dockerfile({ from }));
    const { instructions } = dockerfile;

    console.log(`FROM ${from}\n${instructions.join("\n")}`);
}

console.log(Dockerfile.render(require("./build")));//.instructions.join("\n"));

function render(dockerfile, element)
{
    const [updated, result] = stateful(dockerfile, element);
    
//    console.log(updated, result);
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












