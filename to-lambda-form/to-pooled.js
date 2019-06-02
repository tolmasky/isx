const t = require("@babel/types");
const toLambdaForm = require("./to-lambda-form");
const Scope = require("./scope");
const transformScope = require("./transform-scope");
const babelMapAccum = require("@climb/babel-map-accum");
const mapAccumArray = require("@climb/map-accum");

const { data, number, union, string } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");
const Optional = require("../optional");
const { default: generate } = require("@babel/generator");


module.exports = function (symbol, f, free)
{
    const { parseExpression } = require("@babel/parser");
    const [paths, transformed] = fromAST(symbol, parseExpression(`(${f})`));    
    const inserted = wrap(paths, transformed);
    console.log(`return ${generate(inserted).code}`);
    const code = `return ${generate(inserted).code}`;

    return (new Function(code))();
/*
    const parameters = Object.keys(free || { });
    const missing = scope.free.subtract(parameters);

    if (missing.size > 0)
        throw Error("Missing values for " + missing.join(", "));

    const { default: generate } = require("@babel/generator");
    const code = `return ${generate(transformed).code}`;
    const args = parameters.map(parameter => free[parameter]);

    return (new Function(...parameters, code))(...args);*/
}

const Something = data `Something` ();

Something.identity = Something;
Something.concat = (lhs, rhs) => Something;



const DependencyPath = union `DependencyPath` (
    data `Root` (),
    data `Parent` (
        count    => [number, 1],
        children => DependencyPathMap ) );
const DependencyPathMap = Map(string, DependencyPath);
const OptionalDependencyPath = Optional(DependencyPath);

DependencyPath.Parent.prototype.toString = function ()
{
    const children = List(Object)(this.children.entries())
        .map(([key, value]) => value === DependencyPath.Root ?
            `${key}` :
            `${key} -> ${value}`);

    return children.size === 1 ? children.get(0) : `[${children.join(" , ")}]`;
}

DependencyPath.wrap = function (keyPath, path = DependencyPath.Root)
{
    if (path === OptionalDependencyPath.None)
        return OptionalDependencyPath.None;
    
    return (Array.isArray(keyPath) ? keyPath : [keyPath])
        .reduceRight((path, key) =>
            DependencyPath.Parent({ ...path, children: DependencyPathMap([[key, path]]) }),
            path);
}

OptionalDependencyPath.identity = OptionalDependencyPath.None;
OptionalDependencyPath.concat = (lhs, rhs, key) =>
    rhs === OptionalDependencyPath.identity ? lhs :
    lhs === OptionalDependencyPath.identity ?
        DependencyPath.Parent({ ...rhs, children: DependencyPathMap([[key, rhs]]) }) :
    DependencyPath.Parent(
    {
        count: lhs.count + (rhs.count || 1),
        children: lhs.children.set(key, rhs)
    });

function hasDependencies(path)
{
    return path !== OptionalDependencyPath.None;
}

function fromAST(symbol, fAST)
{
    return babelMapAccum(OptionalDependencyPath, babelMapAccum.fromDefinitions(
    {
        CallExpression(mapAccumNode, expression)
        {
            if (expression.callee.name === symbol)
                return [DependencyPath.Root, expression];
            
            return mapAccumNode.fallback(mapAccumNode, expression);

            // actually if part of callee's parameters...
            const [calleeDependencies, callee] =
                expression.callee.type === "Identifier" ?
                    expression.callee.name === symbol ?
                        [DependencyPath.Root, expression.callee] :
                        [OptionalDependencyPath.None, expression.callee] :
                    mapAccumNode(expression.callee);
            const [argumentsDependencies, arguments] = mapAccumNode(expression.arguments);
            const updated = { ...expression, callee, arguments };

            if (!hasDependencies(calleeDependencies))
                return [DependencyPath.wrap("arguments", argumentsDependencies), updated];

            if (!hasDependencies(argumentsDependencies)) 
                return [DependencyPath.wrap("callee", calleeDependencies), updated];

            const inserted = wrap(DependencyPath.wrap("arguments", argumentsDependencies), updated);
console.log(inserted);
console.log(generate(inserted).code+"");
            return [DependencyPath.wrap("callee", calleeDependencies), inserted];
            
//            /*DependencyPath.wrap(["callee", "object", "arguments", 0], calleeDependencies)*/, inserted];
        }
    }))(toLambdaForm.fromAST(fAST)[1]);
}

const wrap = (function ()
{
    const { expression: template } = require("@babel/template");
    const toImplicitlyPooledState = template(`
        (%%parameters%%) =>
            ImplicitlyPooledState(dependencies => %%f%%).initialize(%%args%%)
    `);
    const valueToExpression = require("../value-to-expression");

    return (dependencies, node) =>
    {
        const [[, args], result] = insert([0, []], dependencies, node);

        return toImplicitlyPooledState(
        {
            parameters: result.params,
            f: result.body,
            args: args
        });
    }
})();

function insert(state, dependencies, node)
{
    if (dependencies === OptionalDependencyPath.None)
        return [state, node];

    if (dependencies === DependencyPath.Root)
        return [[state[0] + 1, [...state[1], node]],
            t.memberExpression(t.identifier("dependencies"), t.numericLiteral(state[0]), true)];

    const entries = List(Object)(dependencies.children.entries()).toArray();
    const [newState, changes] = mapAccumArray(function (state, [field, dependencies])
    {//console.log("doing ", node);
        const [newState, child] = insert(state, dependencies, node[field]);
 
        return [newState, [child, field]];
    }, state, entries);
    const updated = changes.reduce(
        (node, [child, field]) => (node[field] = child, node),
        Array.isArray(node) ? [...node] : { ...node });

    return [newState, updated];
}

//DependentNode<Node>

/*
((i,h,g) => i(h(g(f(x))),f(y)))(1,2,2)


i([f(f(x))],[f(x)])



f(x)


keep tracking dependency up, until you either reach ANOTHER ONE (and have to nest), or, you reach the top.
*/



















