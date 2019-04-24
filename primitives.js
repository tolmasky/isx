const { Set } = require("@algebraic/collections");
const ConstructorSymbol = require("./constructor-symbol");
const functions =
{
    add: ({ source, destination }) => `ADD ${source} ${destination}`,

    cmd: ({ children:[command] }) => `CMD ${command}`,

    copy: ({ source, destination }) => `COPY ${source} ${destination}`,

    env: ({ key, value }) => `ENV ${key}=${JSON.stringify(value)}`,

    expose: ({ children:[port] }) => `EXPOSE ${port}`,

    label: ({ children:[label] }) => `LABEL ${children}`,

    run: ({ PATH, children:[command] }) =>
        `RUN ${ PATH !== void(0) ? `PATH=${PATH} && ${command}` : command }`,

    workdir: ({ children:[path] }) => `WORKDIR ${path}`,

    user: ({ children:[user] }) => `USER ${user}`,

    volume: ({ children:JSON }) => `VOLUME ${JSON}`
};

for (const instruction of Object.values(functions))
    instruction[ConstructorSymbol] = instruction => instruction;

module.exports = Object.assign(
    Set(Function)(Object.values(functions)),
    functions);
