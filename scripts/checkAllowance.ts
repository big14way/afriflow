import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const usdcAddress = process.env.USDC_ADDRESS!;
  const paymentContract = process.env.PAYMENT_CONTRACT!;
  const [signer] = await ethers.getSigners();

  const usdc = await ethers.getContractAt("MockUSDC", usdcAddress);

  const balance = await usdc.balanceOf(signer.address);
  const allowance = await usdc.allowance(signer.address, paymentContract);

  console.log("\n💰 USDC Status:");
  console.log("User address:", signer.address);
  console.log("USDC balance:", ethers.formatUnits(balance, 6), "USDC");
  console.log("USDC allowance for contract:", ethers.formatUnits(allowance, 6), "USDC");

  if (allowance < balance) {
    console.log("\n⚠️  Allowance is less than balance. Consider increasing it.");
  } else {
    console.log("\n✅ Sufficient allowance");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
