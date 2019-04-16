const { resolve } = require("path");
Error.stackTraceLimit = 1000;

const options = require("commander")
    .version(require("../package").version)
    .option("--properties [properties]", "", "[]")
    .parse(process.argv);

const relative = options.args[0] || "image.isx.js";
const filename = resolve(process.cwd(), relative);
const properties = JSON.parse(options.properties);

require("../build")({ filename }, properties);
