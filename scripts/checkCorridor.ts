import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const paymentContract = await ethers.getContractAt(
    "AfriFlowPayment",
    process.env.PAYMENT_CONTRACT!
  );

  const fromCorridor = ethers.encodeBytes32String("US");
  const toCorridor = ethers.encodeBytes32String("KE");

  console.log("\n🌍 Checking corridor support...");
  console.log("From:", "US", "->", ethers.hexlify(fromCorridor));
  console.log("To:", "KE", "->", ethers.hexlify(toCorridor));

  const isSupported = await paymentContract.isCorridorSupported(fromCorridor, toCorridor);
  console.log("\nUS -> KE corridor supported:", isSupported);

  if (!isSupported) {
    console.log("\n📝 Enabling US -> KE corridor...");
    const tx = await paymentContract.setCorridor(fromCorridor, toCorridor, true);
    await tx.wait();
    console.log("✅ Corridor enabled!");
  } else {
    console.log("✅ Corridor already enabled");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
