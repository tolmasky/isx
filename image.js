const { data, string } = require("@algebraic/type");
const Playbook = Object;

const Image = data `Image` (
    id          => string );

module.exports = Image;
