const solidify = require("solidify");
const { join } = require("path");

(async () => {
  await solidify.build({
    srcDir: join(__dirname, "./src/"),
    serverEntry: join(__dirname, "./server.tsx"),
  });
  console.log(`Done`);
})();
