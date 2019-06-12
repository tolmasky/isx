const { data, parameterized, string, union } = require("@algebraic/type");
const { List } = require("@algebraic/collections");
const { parseExpression } = require("@babel/parser");
const t = require("@babel/types");
const template = require("@babel/template").default;
const { isArray } = Array;
const valueToExpression = require("./value-to-expression");
const generate = require("@babel/generator").default;
const Optional = require("./optional");

const functionOf = parameterized ((...args) =>
    data `${args.join(" -> ")}` ( ) );

functionOf.returns = type => 
    (types => types[types.length - 1])
    (parameterized.parameters(type));

module.exports = pooled;

const Pooled = parameterized (T =>
    union `Pooled<${T}>` (
        data `Waiting` (
            ),
        data `Running` (
            ),
        data `Succeeded` (
            value => T
            ) ) );


const group = (f, list) =>
    list.reduce((groups, item) =>
        ((groups[f(item)] = (groups[f(item)] || []))
            .push(item),
        groups), { });

const fStateTemplate = template.expression(`function %%name%%(%%parameters%%)
{
    return AsyncState.start(%%dependencies%%, %%then%%);
}`);

const fStateThenTemplate = template.expression(`dependencies => %%body%%`);

function pooled(symbol, f)
{
    const ReturnT = Pooled(functionOf.returns(f.type));

    const name = f.name;
    const fExpression = parseExpression(`(${f})`);
    const [dependencies, transformed] = reduce(symbol, fExpression);
    const wrapped = fStateTemplate(
    {
        name: f.name,
        parameters: fExpression.params,
        dependencies: t.arrayExpression(dependencies.toArray()),
        then: fStateThenTemplate({ body: transformed.body })
    });

    console.log(generate(wrapped));

    return x => x;
    return f;
}


const Dependency = data `Dependency` (
    node    => Object );

const AutoLifted = Symbol("AutoLifted");

function reduce(symbol, node, dependencies = List(Dependency)())
{
    if (node === null)
        return [dependencies, null];

    if (node === void(0))
        return [dependencies, void(0)];

    if (isArray(node))
        return mapAccum((dependencies, node) =>
            reduce(symbol, node, dependencies),
            dependencies,
            node);

    if (handlers[node.type])
        return handlers[node.type](symbol, node, dependencies);

    const children = t.VISITOR_KEYS[node.type]
        .map((field, index) => [node[field], index, field]);
    const [newDependencies, reduced] = mapAccum(
        (dependencies, [child]) =>
        {
            console.log("INNER" + reduce(symbol, child, dependencies)[1]);
            return reduce(symbol, child, dependencies)
        },
        dependencies,
        children);console.log("FOR " + node.type, reduced);
    const modified = children
        .filter(([child, index]) => child !== reduced[index]);
    const newNode = modified.length === 0 ?
        node :
        modified.reduce((accum, [, index, field]) =>
            (accum[field] = reduced[index], accum), { ...node });

    return [newDependencies, newNode];
}

function mapAccum(fn, acc, list) {
  var idx = 0;
  var len = list.length;
  var result = [];
  var tuple = [acc];
  while (idx < len) {
    tuple = fn(tuple[0], list[idx]);
    result[idx] = tuple[1];
    idx += 1;
  }
  return [tuple[0], result];
}

const toImplicitlyPooledState = template(`
    ImplicitlyPooledState(%%f%%).initialize(%%args%%);
`);

const toDependencyAccess = template.expression(`dependencies[%%index%%]`)



const handlers =
{
    CallExpression(symbol, node, dependencies)
    {
        if (node.callee.name === symbol)
            return [
                dependencies.concat(node),
                toDependencyAccess({ index: t.valueToNode(dependencies.size) })];

        const [newDependencies, arguments] = reduce(symbol, node.arguments, dependencies);

        return [newDependencies, { ...node, arguments }];

        
/*
        if (paths.size === 0)
            return [node, Optional.None];

        return [node, PathTree.Parent(paths

        const { true: lifted = [], false: unmodified = [] } =
            group(
                ([, node]) => node[AutoLifted],
                reduce(symbol, node.arguments)
                    .map((node, index) => [index, node]));

        if (lifted.length > 0) { console.log(lifted);
            return { ...toImplicitlyPooledState({ f: node, args: valueToExpression(lifted) }), [AutoLifted]: true };
        }
        if (node.callee.name === symbol)
            return [node, ];
            node[AutoLifted] = true;

        return node;*/
    },
};





const f = x => f(g(ls(x)));

f.type = functionOf (string, string);

console.log(pooled("ls", f)("/Users/tolmasky/Desktop"));
console.log("PLUS");




function toCallForm(fExpression)
{
    fExpression.body.
}
