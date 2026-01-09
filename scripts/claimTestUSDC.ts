import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const mockUSDCAddress = process.env.USDC_ADDRESS;

  if (!mockUSDCAddress) {
    console.error("❌ USDC_ADDRESS not found in .env file");
    process.exit(1);
  }

  console.log("\n💧 Claiming test USDC from faucet...\n");

  const [signer] = await ethers.getSigners();
  console.log("Claiming for address:", signer.address);

  // Connect to MockUSDC contract
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);

  // Check balance before
  const balanceBefore = await mockUSDC.balanceOf(signer.address);
  console.log("USDC balance before:", ethers.formatUnits(balanceBefore, 6), "USDC");

  // Call faucet
  console.log("\n🚰 Calling faucet...");
  const tx = await mockUSDC.faucet();
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Check balance after
  const balanceAfter = await mockUSDC.balanceOf(signer.address);
  console.log("\n💰 USDC balance after:", ethers.formatUnits(balanceAfter, 6), "USDC");
  console.log("   Received:", ethers.formatUnits(balanceAfter - balanceBefore, 6), "USDC");

  console.log("\n✅ Done! You can now make payments with AfriFlow.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
