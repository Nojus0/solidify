const solidify = require("solidify");


(async()=>{
    await solidify.build("./src/");
    console.log(`Done`)
})();