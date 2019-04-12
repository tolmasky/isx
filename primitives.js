module.exports =
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

    state: () => {},

    include: () => {},
    exclude: () => {},
}
