const Scope = require("./scope");
const t = require("@babel/types");
const { parseExpression } = require("@babel/parser");
const transformScope = require("./transform-scope");

const toLambdaForm = require("./map-accum-node").fromDefinitions(
{
    BlockStatement(mapAccumNode, node)
    {
        const [[returnPair], declarations] = partition(
            ([, node]) => node.type === "ReturnStatement",
            node.body
                .flatMap(node => node.type === "VariableDeclaration" ?
                    node.declarations : node)
                .map(mapAccumNode));
        const blockScope = declarations.reduce((lhs, rhs) =>
            Scope.concat(lhs, rhs[0]), Scope.identity);
        const [passed, rejected] = partition(([scope]) =>
            scope.free.some(variable => blockScope.bound.has(variable)),
            declarations);

        const scope = Scope.concat(returnPair[0], blockScope);
        console.log(passed.map(([, { id }]) => id.elements));
        const fCallExpression = t.CallExpression(
            t.ArrowFunctionExpression(
                passed.map(([, { id }]) => id),
                returnPair[1].argument),
            passed.map(([, { init }]) => init));
        const lambdaForm = t.blockStatement(
            [t.returnStatement(fCallExpression)]);

        return [scope, lambdaForm];
    }
}, transformScope);

function partition(f, list)
{
    const filtered = [];
    const rejected = [];
    
    for (const item of list)
        (f(item) ? filtered : rejected).push(item);

    return [filtered, rejected];
}

module.exports = function (f)
{
    const { default: generate } = require("@babel/generator");
    const AST = parseExpression(`(${f})`);
    const [, transformed] = require("./map-accum-node")(Scope, toLambdaForm)(AST);

    return generate(transformed).code;
}

