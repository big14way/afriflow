import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const paymentContract = await ethers.getContractAt(
    "AfriFlowPayment",
    process.env.PAYMENT_CONTRACT!
  );

  const usdcAddress = process.env.USDC_ADDRESS!;

  console.log("\n🪙 Checking token support...");
  console.log("USDC Address:", usdcAddress);

  const isSupported = await paymentContract.supportedTokens(usdcAddress);
  console.log("Is USDC supported:", isSupported);

  if (!isSupported) {
    console.log("\n📝 Adding USDC to supported tokens...");
    const tx = await paymentContract.setTokenSupport(usdcAddress, true);
    await tx.wait();
    console.log("✅ USDC token support enabled!");
  } else {
    console.log("✅ USDC already supported");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
