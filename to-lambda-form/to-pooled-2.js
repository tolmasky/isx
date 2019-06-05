const t = require("@babel/types");
const toLambdaForm = require("./to-lambda-form");
const Scope = require("./scope");
const transformScope = require("./transform-scope");
const babelMapAccum = require("@climb/babel-map-accum");
const mapAccumArray = require("@climb/map-accum");

const { data, number, union, string, is } = require("@algebraic/type");
const { List, Map } = require("@algebraic/collections");
const Optional = require("../optional");
const { default: generate } = require("@babel/generator");
const Asynchronous = require("@cause/asynchronous");
const wrap = require("@cause/task/wrap");
const has = (({ hasOwnProperty }) =>
    (key, object) => hasOwnProperty.call(object, key))
    (Object);


module.exports = function (symbolOrSymbols, f, free)
{
    const { parseExpression } = require("@babel/parser");
    const symbols = typeof symbolOrSymbols === "string" ?
        { [symbolOrSymbols]: true } :
        Object.fromEntries([...symbolOrSymbols].map(key => [key, true]));
    const [type, transformed] = fromAST(symbols, parseExpression(`(${f})`));

    const parameters = Object.keys(free || { });
    // const missing = scope.free.subtract(parameters);

//    if (missing.size > 0)
//        throw Error("Missing values for " + missing.join(", "));

    const code = `return ${generate(transformed).code}`;
    const args = parameters.map(parameter => free[parameter]);

    return (new Function("p", ...parameters, code))(wrap, ...args);
}

const Type = union `Type` (
    data `Value` (),
    data `State` (),
    data `Function` (
        input    => Type,
        output   => Type ) );

Type.returns = function (T)
{
    return is (Type.Function, T) ? T.output : T;
}

Type.fValueToValue = Type.Function({ input: Type.Value, output: Type.Value });
Type.fToState = Type.Function({ input: Type.Value, output: Type.State });

Type.identity = Type.Value;
Type.concat = (lhs, rhs) =>
    lhs === Type.Value ? rhs :
    rhs === Type.Value ? lhs :
    Type.State;


function prefix(operator)
{
    return { type: "prefix", operator: t.stringLiteral(operator) };
}

function fromAST(symbols, fAST)
{
    const template = require("@babel/template").expression;
    const pCall = template(`p(%%callee%%)(%%arguments%%)`);
    const pSuccess = template(`p.success(%%argument%%)`);
    const pLift = template(`p.lift(%%callee%%)(%%arguments%%)`);

    return babelMapAccum(Type, babelMapAccum.fromDefinitions(
    {
        BinaryExpression(mapAccum, expression)
        {
            const callee = prefix(expression.operator);
            const arguments = [expression.left, expression.right];
            const [returnT, updated] =
                CallExpression(mapAccum, { callee, arguments });

            return returnT === Type.Value ?
                [Type.Value, expression] :
                [returnT, updated];
        },

        Identifier(mapAccum, identifier)
        {
            return has(identifier.name, symbols) ?
                [Type.fToState, identifier] :
                [Type.Value, identifier];
        },

        CallExpression,

    }))(toLambdaForm.fromAST(fAST)[1]);

    function CallExpression(mapAccum, expression)
    {
        const [calleeT, callee] = expression.callee.type === "prefix" ?
            [Type.fValueToValue, expression.callee.operator] :
            mapAccum(expression.callee);
        const argumentPairs = expression.arguments.map(mapAccum);
        const argumentsT = argumentPairs.reduce(
            (T, [argumentT]) => Type.concat(T, argumentT),
            Type.identity);

        if (is (Type.State, argumentsT))
        {
            const arguments = argumentPairs.map(
                ([argumentT, argument]) => is (Type.State, argumentT) ?
                    argument : pSuccess({ argument }));

            return calleeT === Type.fToState ?
                [Type.State, pCall({ callee, arguments })] :
                [Type.State, pLift({ callee, arguments })];
        }

        const arguments = argumentPairs.map(([, argument]) => argument);
        const returnT = Type.concat(Type.returns(calleeT), argumentsT);
        const updated = { ...expression, callee, arguments };

        return [returnT, updated];
    }
}

