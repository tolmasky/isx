const { data, string } = require("@algebraic/type");
const { List, Map, Set } = require("@algebraic/collections");
const getChecksum = require("./get-checksum");
const toLambdaForm = require("./to-lambda-form/to-lambda-form");
const toPooled = require("./to-lambda-form/to-pooled-2");
const fromAsync = require("@cause/cause/from-async");
const Cause = require("@cause/cause");
const toPromise = require("@cause/cause/to-promise");

//const pooled = require("./pooled");

/*console.log(toPooled("f", function test(x)
{
    return i(g(h(f(x), f(y))));
}, { i:1,g:1,h:1,f:1}) + "");
*/
/*
console.log(toLambdaForm(function test(f)
{
    const a = f(x);
    const b = f(a);
    
    return i(a + b);
}, { i:1, x: 20 }) + "");

console.log(toPooled("f", function test(f)
{
    const a = g(x);
    const b = f(a);
    const c = f(x);
    
    return i(a + b);
}, { i:1 }) + "");*/
/*
console.log(toLambdaForm(function test(f)
{
    const a = f(x);
    const b = f(a);
    
    return i(a + b);
}, { i:1, x: 10 }) + "");
console.log(toPooled("f", function test(f)
{
    const a = f(x);
    const b = f(a);
    
    return i(a + b);
}, { i:1 }) + "");*/

function show(f)
{
    console.log("FOR " + f);
    
    console.log("LForm: " + toLambdaForm(f, { f: 1, i: 1, g: 1 }));

    console.log("Pooled: " + toPooled("f", f, { f: 1, i: 1, g: 1 }));

    console.log();
}

console.log((function ()
{
    const glob = require("fast-glob").sync;
    const path = require("path");
    const resolve = workspace => pattern =>
        path.resolve(workspace,
            pattern.startsWith("/") ? pattern.substr(1) : pattern);

    return toPooled("glob", function getFilenames(workspace, patterns)
    {
        const ignore = [];//["**/node_modules/"];
        const include = patterns.map(resolve(workspace));
        const firstPass = glob(
            include.toArray(),
            { ignore, onlyFiles: false, markDirectories: true });
        const grouped = List(string)(firstPass)
            .groupBy(path => path.endsWith("/") ? "directories" : "filenames");
        const secondPass = glob(grouped
            .get("directories", List(string)())
            .map(path => `${path}**/*`).toArray(),
            { ignore });

        return Set(string)(grouped.get("filenames", List(string)()))
            .concat(secondPass)
            .toList()
            .sort()
            .map(filename => path.relative(workspace, filename));
    }, { glob, resolve, Set, string, path, List, console });
})() + "");

const ls = path => fromAsync(Object, () => require("fs").promises.readdir(path));
const state = toPooled("ls", (a, b) => 10 + ls(a + b), { ls })(".", "/");

toPromise(Object, state);

//console.log("[" + toPooled("ls", (a, b) => 10 + ls(a + b), { ls })(1, 2) + "]");

return;
// show((a, b) => (x => x + 3 + 2)(f(a)));

// show((a, b) => (x => x + 3)(f(a)));


// show((a, b) => f(a) + f(b));
show((a, b) => i(f(a)));
show((a, b) => f(f(a)));
show((a, b) => i(f(a) + f(b)));
show((a, b) => f(a)(f(a) + f(b)));
show((a, b) => 
{
    const a1 = a + a;

    return f(a1);
});

return
console.log(toLambdaForm(a =>
{
    const a1 = f(a);

    return f(a1);
}, { f: 1 }) + "");
console.log(toLambdaForm(a => f(f(a)), { f: 1 }) + "");
console.log(toLambdaForm( a =>
{
    const a1 = a + a;
    
    return f(a1);
}, { f: 1 }) + "");


console.log(toPooled("f", a =>
{
    const a1 = f(a);
    const b = f(a1);
    
    return b
}) + "");

console.log(toPooled("f", a =>
{
    const a1 = a + a;
    
    return f(a1);
}) + "");


return;
const Source = data `Source` (
    checksum    => string,
    checksums   => Map(string, string) );

const getFilenames = (function ()
{
    const glob = require("fast-glob").sync;
    const path = require("path");
    const resolve = workspace => pattern =>
        path.resolve(workspace,
            pattern.startsWith("/") ? pattern.substr(1) : pattern);

    return toPooled("glob", function getFilenames(workspace, patterns)
    {
        const ignore = [];//["**/node_modules/"];
        const include = patterns.map(resolve(workspace));
        const firstPass = glob(
            include.toArray(),
            { ignore, onlyFiles: false, markDirectories: true });
        const grouped = List(string)(firstPass)
            .groupBy(path => path.endsWith("/") ? "directories" : "filenames");
        const secondPass = glob(grouped
            .get("directories", List(string)())
            .map(path => `${path}**/*`).toArray(),
            { ignore });

        return Set(string)(grouped.get("filenames", List(string)()))
            .concat(secondPass)
            .toList()
            .sort()
            .map(filename => path.relative(workspace, filename));
    }, { glob, resolve, Set, string, path, List, console });
})();

const getChecksums = (function ()
{
    const { spawnSync: spawn } = require("child_process");
    const platform = require("os").platform();

    const command = platform === "darwin" ? "shasum" : "sha256sum";
    const args = platform === "darwin" ? ["-a", "256"] : [];
    const ShasumRegExp = /([a-z0-9]{64})\s{2}([^\n]+)\n/g;

    return toLambdaForm(function getChecksums(filenames)
    {
        const { stdout } = spawn(command, [...args, ...filenames]);
        const [...matches] = stdout.toString().matchAll(ShasumRegExp);
        const pairs = matches
            .map(([, checksum, filename]) => [filename, checksum]);

        return Map(string, string)(pairs);
    }, { Map, string, spawn, platform, command, args, ShasumRegExp });
})();

const toSource = toLambdaForm(function toSource(workspace, patterns)
{
    const filenames = getFilenames(workspace, patterns);
    const checksums = getChecksums(filenames);
    const checksum = getChecksum(Map(string, string), checksums);

    return Source({ checksum, checksums });
}, { getChecksums, getFilenames, getChecksum, Source, Map, string, console });


console.log("WHAT"+getFilenames+"");

//const start = Date.now();
//const result = toSource(process.cwd(), List(string)(["app/**/*.js"]));
//console.log(Date.now() - start);
//console.log(result);
//console.log(getFilenames(process.cwd(), List(string)(["app/**/*.js"])));

/*function fromDockerignore(workspace)
{
    const filename = `${workspace}/.dockerignore`;

    if (!fs.existsSync(filename))
        return [];

    return fs.readFileSync(filename, "utf-8")
        .split("\n")
        .filter(line => line.length > 0 && !line.startsWith("#"));
}*/
