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
    const [, inserted] = insert(0, paths, transformed);
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

function fromAST(symbol, fAST)
{
    return babelMapAccum(OptionalDependencyPath, babelMapAccum.fromDefinitions(
    {
        CallExpression(mapAccumNode, expression)
        {
            if (expression.callee.name === symbol)
                return [DependencyPath.Root, expression];

            return mapAccumNode.fallback(mapAccumNode, expression);
        }
    }))(toLambdaForm.fromAST(fAST)[1]);
}

function insert(index, dependencies, node)
{
    if (dependencies === OptionalDependencyPath.None)
        return [index, node];

    if (dependencies === DependencyPath.Root)
        return [index + 1, t.memberExpression(t.identifier("dependencies"), t.numericLiteral(index), true)];

    const entries = List(Object)(dependencies.children.entries()).toArray();
    const [newIndex, changes] = mapAccumArray(function (index, [field, dependencies])
    {
        const [newIndex, child] = insert(index, dependencies, node[field]);
 
        return [newIndex, [child, field]];
    }, index, entries);
    const updated = changes.reduce(
        (node, [child, field]) => (node[field] = child, node),
        Array.isArray(node) ? [...node] : { ...node });

    return [newIndex, updated];
}

//DependentNode<Node>

/*
((i,h,g) => i(h(g(f(x))),f(y)))(1,2,2)


i([f(f(x))],[f(x)])



f(x)


keep tracking dependency up, until you either reach ANOTHER ONE (and have to nest), or, you reach the top.
*/



















