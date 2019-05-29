const { isArray } = Array;
const t = require("@babel/types");
const mapAccumArray = require("@climb/map-accum");

module.exports = function mapAccumNode({ concat, identity }, fOrDefinitions)
{
    const f = typeof fOrDefinitions === "object" ?
        fromDefinitions(fOrDefinitions) : fOrDefinitions;

    return function mapAccumNode(node)
    {
        if (node === null || node === void(0))
            return [identity, node];

        if (isArray(node))
        {
            const [accumOut, mapped] = mapAccumArray(
                (accumIn, node) =>
                    (([accumOut, mapped]) => [concat(accumIn, accumOut), mapped])
                    (mapAccumNode(node)), identity, node);
            const modified = mapped.some((mapped, index) => mapped !== node[index]);

            return [accumOut, modified ? mapped : node];
        }

        return f(mapAccumNode, node);
    }
}

module.exports.fromDefinitions = function fromDefinitions(definitions, fallback)
{
    return function f(mapAccumNode, node)
    {
        if (definitions[node.type])
            return definitions[node.type](mapAccumNode, node);

        if (fallback)
            return fallback(mapAccumNode, node);

        const fields = t.VISITOR_KEYS[node.type];
        const children = fields.map(field => node[field]);
        const [accumOut, mapped] = mapAccumNode(children);
        const modified = children
            .map((child, index) => [child, index, fields[index]])
            .filter(([child, index]) => child !== mapped[index]);
        const newNode = modified.length === 0 ?
            node :
            modified.reduce((accum, [, index, field]) =>
                (accum[field] = mapped[index], accum), { ...node });

        return [accumOut, newNode];
    }
}
