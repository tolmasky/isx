const crypto = require("crypto");
const { data, union, is, primitive, parameterized, getKind } = require("@algebraic/type");
const { OrderedMap, OrderedSet, Map, List } = require("@algebraic/collections");
const fail = type => { throw Error(`Can't get checksum of objects of type ${type}`); }


function getChecksum(type, object)
{
    const kind = getKind(type);

    return  parameterized.is(List, type) ? getListChecksum(type, object) :
            parameterized.is(Map, type) ? getMapChecksum(type, object) :
            parameterized.is(OrderedMap, type) ? getOrderedMapChecksum(type, object) :
            parameterized.is(OrderedSet, type) ? getOrderedSetChecksum(type, object) :
            kind === data ? getDataChecksum(type, object) :
            kind === union ? getUnionChecksum(type, object) :
            kind === primitive ? getPrimitiveChecksum(type, object) :
            Buffer === type ? getSha512(object) :
            fail(type);
}

module.exports = getChecksum;

function getDataChecksum(type, value)
{
    const fields = data.fields(type)
        .map(([name, type]) => getChecksum(type, value[name]));

    return `data-${getSha512({ fields })}`;
}

function getUnionChecksum(type, value)
{
    const components = union.components(type);
    const index = components.findIndex(type => is(type, value));
    const nested = getChecksum(components[index], value);

    return `union-${getSha512({ index, nested })}`;
}

function getPrimitiveChecksum(type, value)
{
    return `${typeof value}-${getSha512(JSON.stringify(value))}`;
}

function getListChecksum(type, value)
{
    const [parameter] = parameterized.parameters(type);
    const items = value.map(value => getChecksum(parameter, value));

    return `List-${getSha512({ items })}`;
}

function getMapChecksum(type, value)
{
    const [keyType, valueType] = parameterized.parameters(type);
    const items = value
        .map((key, value) =>
            [getChecksum(keyType, key), getChecksum(valueType, value)])
        .toObject();

    return `Map-${getSha512({ items })}`;
}

function getOrderedMapChecksum(type, value)
{
    const [keyType, valueType] = parameterized.parameters(type);
    const items = value
        .map((key, value) =>
            [getChecksum(keyType, key), getChecksum(valueType, value)])
        .toObject();

    return `OrderedMap-${getSha512({ items })}`;
}

function getOrderedSetChecksum(type, value)
{
    const [parameter] = parameterized.parameters(type);
    const items = value.map(value => getChecksum(parameter, value)).toArray();

    return `OrderedSet-${getSha512({ items })}`;
}

function getSha512(value)
{
    return crypto.createHash("sha512")
        .update(Buffer.isBuffer(value) ? value : JSON.stringify(value))
        .digest("base64")
        .replace(/\//g, "-")
        .replace(/=/g, "_")
        .replace(/\+/g, ".");
}

/*
const getFunctionChecksum = getCachedChecksum(function (aFunction)
{
    const source = toString.call(aFunction);

    if (NativeRegExp.test(source))
        throw Error(`Can't auto-generate checksum for ${aFunction.name}.`);

    return crypto.createHash("sha512")
        .update("function:")
        .update("name:" + aFunction.name)
        .update(aFunction.name)
        .update("source:" + source)
        .digest("base64");
});




const crypto = require("crypto");
const toString = Function.prototype.toString;

const ChecksumSymbol = Symbol("checksum");
const CachedChecksums = new WeakMap();

const NativeRegExp = /^function [$A-Z_a-z][0-9A-Z_a-z$]*\(\) { \[native code\] }$/;

const { base, getArguments } = require("generic-jsx");

module.exports = getMerkleChecksum;

function getMerkleChecksum(value)
{
    if (value === null)
        return "value:null:null";

    const type = typeof value;

    if (type === "function")
        return getFunctionCallChecksum(value);

    if (type !== "object")
        return "value:" + type + ":" + value;

    if (value instanceof Set)
        return getSetChecksum(value);

    const cached = CachedChecksums.get(value);

    if (cached)
        return cached;

    const hash = crypto.createHash("sha512");
    const keys = Object.keys(value);
    const count = keys.length;
    const isArray = Array.isArray(value);

    hash.update(isArray ? "array:" : "object:");

    for (var index = 0; index < count; ++index)
    {
        const key = keys[index];

        hash.update("key:")
        hash.update(key);
        hash.update("value:")
        hash.update(getMerkleChecksum(value[key]));
    }

    const checksum = hash.digest("base64");

    CachedChecksums.set(value, checksum);

    return checksum;
}

function getSetChecksum(aSet)
{
    const hash = crypto.createHash("sha512");

    hash.update("set:");

    for (const item of aSet)
    {
        hash.update("item:")
        hash.update(getMerkleChecksum(item));
    }

    return hash.digest("base64");
}

const getFunctionCallChecksum = getCachedChecksum(function (aFunctionCall)
{
    return crypto.createHash("sha512")
        .update("function-call:")
        .update("base:" + getFunctionChecksum(base(aFunctionCall)))
        .update("arguments:" + getMerkleChecksum(getArguments(aFunctionCall)))
        .digest("base64");
});

const getFunctionChecksum = getCachedChecksum(function (aFunction)
{
    const source = toString.call(aFunction);

    if (NativeRegExp.test(source))
        throw Error(`Can't auto-generate checksum for ${aFunction.name}.`);

    return crypto.createHash("sha512")
        .update("function:")
        .update("name:" + aFunction.name)
        .update(aFunction.name)
        .update("source:" + source)
        .digest("base64");
});

function getCachedChecksum(getChecksum)
{
    return function (item)
    {
        if (item[ChecksumSymbol])
            return item[ChecksumSymbol];

        return item[ChecksumSymbol] = getChecksum(item);
    }
}*/
