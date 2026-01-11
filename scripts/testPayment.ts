import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const [signer] = await ethers.getSigners();

  const paymentContract = await ethers.getContractAt(
    "AfriFlowPayment",
    process.env.PAYMENT_CONTRACT!
  );

  const usdc = await ethers.getContractAt(
    "MockUSDC",
    process.env.USDC_ADDRESS!
  );

  const recipient = "0x3C343AD077983371b29fee386bdBC8a92E934C51";
  const amount = ethers.parseUnits("10", 6); // 10 USDC
  const fromCorridor = ethers.encodeBytes32String("US");
  const toCorridor = ethers.encodeBytes32String("KE");

  console.log("\n🧪 Testing payment...");
  console.log("From:", signer.address);
  console.log("To:", recipient);
  console.log("Amount:", ethers.formatUnits(amount, 6), "USDC");
  console.log("Corridor:", "US ->", "KE");
  console.log("From bytes32:", ethers.hexlify(fromCorridor));
  console.log("To bytes32:", ethers.hexlify(toCorridor));

  // Check corridor
  const isSupported = await paymentContract.isCorridorSupported(fromCorridor, toCorridor);
  console.log("\nCorridor supported:", isSupported);

  // Check balance
  const balance = await usdc.balanceOf(signer.address);
  console.log("USDC balance:", ethers.formatUnits(balance, 6), "USDC");

  // Check allowance
  const allowance = await usdc.allowance(signer.address, process.env.PAYMENT_CONTRACT!);
  console.log("USDC allowance:", ethers.formatUnits(allowance, 6), "USDC");

  if (!isSupported) {
    console.log("\n❌ Corridor not supported! Enabling...");
    const tx = await paymentContract.setCorridor(fromCorridor, toCorridor, true);
    await tx.wait();
    console.log("✅ Corridor enabled");
  }

  console.log("\n💸 Executing payment...");
  try {
    const tx = await paymentContract.executeInstantPayment(
      recipient,
      process.env.USDC_ADDRESS!,
      amount,
      fromCorridor,
      toCorridor,
      "{}"
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Payment successful!");
    console.log("Gas used:", receipt.gasUsed.toString());
  } catch (error: any) {
    console.error("\n❌ Payment failed:");
    console.error(error.message);

    // Try to decode the error
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
