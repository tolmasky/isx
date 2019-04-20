const { resolve } = require("path");
Error.stackTraceLimit = 1000;

const options = require("commander")
    .version(require("../package").version)
    .option("--properties [properties]", "", "[]")
    .option("--push", "")
    .parse(process.argv);

const relative = options.args[0] || "image.isx.js";
const filename = resolve(process.cwd(), relative);
const properties = JSON.parse(options.properties);
const push = !!options.push;

(async function ()
{
    try
    {
        await require("../build")({ filename, push }, properties);
    }
    catch (error)
    {
        console.error(error);
        process.exit(1);
    }
})();
