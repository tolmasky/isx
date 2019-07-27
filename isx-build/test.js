"use strict";


(async function ()
{
    const delay = timeout => new Promise((resolve, reject) => setTimeout(resolve, timeout));
    const id_ = x => (console.log(`${x} started`), delay(1000).then(() => (console.log(`${x} finished`), x)));
    const id = require("@cause/task").fromAsync(id_);
    const task = require("@cause/task").Success({ value: 20 });
    const toPromise = require("@cause/cause/to-promise");

    console.log(function add()
    {
        const concat = (δ|id("a")) + (δ|id("b"));
        const results = 10;
//        const results = [1,2,3,4,5].δ[map](id).reduce((x, y) => x + y, 0);

        return console.log("THE SUM IS " + (δ|id(concat + results)));
    }+"");
    console.log(Object, async function add()
    {
        const concat = (δ|id("a")) + (δ|id("b")) + (await await task);
        const results = 10;
//        const results = [1,2,3,4,5].δ[map](id).reduce((x, y) => x + y, 0);

        return console.log("THE SUM IS " + (δ|id(concat + results)));
    }+"");

    await toPromise(Object, function add()
    {
        const concat = (δ|id("a")) + (δ|id("b")) + (δ|δ|task);
        const results = (δ|[1,2,3,4,5].δ(map)(id)).reduce((x, y) => x + y, 0);

        return console.log("THE SUM IS " + (δ|id(concat + results)));
    }());
})();

/*
console.log(function add()
    {
        const concat = (δ[id]("a") + δ[id]("b"));
        const results = [1,2,3,4,5].δ[map](id).reduce((x, y) => x + y, 0);

        return console.log("THE SUM IS " + δ[id](concat + results));
    }+"");
    await toPromise(Object, function add()
    {
        const concat = (δ[id]("a") + δ[id]("b"));
        const results = [1,2,3,4,5].δ[map](id).reduce((x, y) => x + y, 0);

        return console.log("THE SUM IS " + δ[id](concat + results));
    }());
*/


//(T -> U) -> [T] -> [U]
//(T -> S(U)) -> [T] -> [S(U)]
//(T -> S(U)) -> [T] -> S([U])









