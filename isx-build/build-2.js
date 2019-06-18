const { sep } = require("path");

require("@babel/register")
({
    ignore:[new RegExp(`^.*${sep}node_modules${sep}/.*`, "i")],
    plugins:[require("@cause/task/transform/babel-plugin")],
    cache: false
});

module.exports = require("./build");
