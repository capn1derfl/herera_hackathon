// run_v2.js
const { SV2 } = require("./SovereignV2.js");
const { anchorMintmark } = require("./hedera_bridge_v2.js");

async function main() {
  const cmd = process.argv[2];

  if (cmd === "init") {
    const res = SV2.run();
    console.log("INIT:", res);
    return;
  }

  if (cmd === "mint") {
    const artifact = process.argv.slice(3).join(" ") || "Default artifact";
    const mm = SV2.mintMark(artifact, { by: "mike" });
    console.log("LOCAL MINTMARK:", mm);

    try {
      const anchorRes = await anchorMintmark(mm);
      console.log("HEDERA ANCHOR:", anchorRes);
    } catch (e) {
      console.error("HEDERA ERROR:", e.message);
    }
    return;
  }

  console.log("Usage:");
  console.log("  node run_v2.js init");
  console.log('  node run_v2.js mint "some artifact text"');
}

main();
