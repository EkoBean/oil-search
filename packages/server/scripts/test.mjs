import { listAffectedOilPics } from "../src/images/affectedOilPics.js";

async function test() {

    try {
        const result = await listAffectedOilPics();
        console.log('result :>> ', result);
    } catch (err) {
        console.error(err)
    }
}

test();