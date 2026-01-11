import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const paymentContract = await ethers.getContractAt(
    "AfriFlowPayment",
    process.env.PAYMENT_CONTRACT!
  );

  // Try different corridor combinations
  const corridors = [
    { from: "US", to: "KE" },
    { from: "NG", to: "KE" },
    { from: "KE", to: "NG" },
  ];

  console.log("\n🔍 Checking various corridors...\n");

  for (const corridor of corridors) {
    const from = ethers.encodeBytes32String(corridor.from);
    const to = ethers.encodeBytes32String(corridor.to);

    const isSupported = await paymentContract.isCorridorSupported(from, to);

    console.log(`${corridor.from} -> ${corridor.to}:`, isSupported);
    console.log(`  fromBytes32: ${ethers.hexlify(from)}`);
    console.log(`  toBytes32: ${ethers.hexlify(to)}`);

    // Try to directly read the mapping
    try {
      // Call corridors(from, to) directly
      const result = await paymentContract.corridors(from, to);
      console.log(`  Direct mapping read: ${result}`);
    } catch (e) {
      console.log(`  Direct mapping read failed`);
    }

    console.log();
  }

  // Now try to enable US->KE explicitly
  console.log("\n📝 Force-enabling US -> KE corridor...");
  const from = ethers.encodeBytes32String("US");
  const to = ethers.encodeBytes32String("KE");

  const tx = await paymentContract.setCorridor(from, to, true);
  await tx.wait();

  console.log("✅ Corridor set!");

  // Check again
  const isSupported = await paymentContract.isCorridorSupported(from, to);
  const direct = await paymentContract.corridors(from, to);

  console.log("isCorridorSupported:", isSupported);
  console.log("corridors mapping:", direct);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
