const solidify = require("solidify");
const { join } = require("path");
const sr = join(__dirname, "./server.ts");
console.log(sr);
(async () => {
  await solidify.build({
    srcDir: join(__dirname, "./src/"),
    serverEntry: join(__dirname, "./server.tsx"),
  });
  console.log(`Done`);
})();
