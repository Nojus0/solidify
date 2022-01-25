const solidify = require("solidify");
const path = require("path");

(async () => {
  await solidify.build({ srcDir: path.join(__dirname, "./src/") });
  console.log(`Done`);
})();
