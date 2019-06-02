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


module.exports = function (symbol, f, free)
{
    const { parseExpression } = require("@babel/parser");
    const [type, transformed] = fromAST(symbol, parseExpression(`(${f})`));    
//    const inserted = wrap(paths, transformed);
    const code = `return ${generate(transformed).code}`;
console.log("RETURN TYPE FOR " + code + " is " + type);
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

Type.fToState = Type.Function({ input: Type.Value, output: Type.State });

Type.identity = Type.Value;
Type.concat = (lhs, rhs) =>
    lhs === Type.Value ? rhs :
    rhs === Type.Value ? lhs :
    Type.State;


function fromAST(symbol, fAST)
{
    return babelMapAccum(Type, babelMapAccum.fromDefinitions(
    {
        BinaryExpression(mapAccum, expression)
        {console.log("hey!");
            const [leftT, left] = mapAccum(expression.left);
            const [rightT, right] = mapAccum(expression.right);

            if (leftT !== Type.State && rightT !== Type.State) { console.log("yes/...");console.log(leftT);
                return [Type.Value, expression];}

            return [Type.State, t.callExpression(t.identifier(expression.operator), [left, right])];
        },

        Identifier(mapAccum, identifier)
        {
            return identifier.name === symbol ?
                [Type.fToState, identifier] :
                [Type.Value, identifier];
        },

        CallExpression(mapAccum, expression)
        {
            const [calleeT, callee] = mapAccum(expression.callee);
            const [argumentsT, arguments] = mapAccum(expression.arguments);
            const updated = { ...expression, callee, arguments };
            const returnT = Type.concat(Type.returns(calleeT), argumentsT);

            return [returnT, updated];
        }
    }))(toLambdaForm.fromAST(fAST)[1]);
}

