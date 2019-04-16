const { resolve } = require("path");
Error.stackTraceLimit = 1000;

const options = require("commander")
    .version(require("../package").version)
    .parse(process.argv);

const relative = options.args[0] || "image.dsx.js";
const filename = resolve(process.cwd(), relative);

require("../build")({ filename });
