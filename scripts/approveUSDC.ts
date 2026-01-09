import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const mockUSDCAddress = process.env.USDC_ADDRESS;
  const paymentContractAddress = process.env.PAYMENT_CONTRACT;

  if (!mockUSDCAddress || !paymentContractAddress) {
    console.error("❌ USDC_ADDRESS or PAYMENT_CONTRACT not found in .env file");
    process.exit(1);
  }

  console.log("\n💳 Approving USDC spending for AfriFlow contract...\n");

  const [signer] = await ethers.getSigners();
  console.log("Approving from address:", signer.address);
  console.log("AfriFlow Contract:", paymentContractAddress);

  // Connect to MockUSDC contract
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);

  // Check current allowance
  const currentAllowance = await mockUSDC.allowance(signer.address, paymentContractAddress);
  console.log("\nCurrent allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

  // Approve a large amount (1 million USDC for testing)
  const approveAmount = ethers.parseUnits("1000000", 6);

  console.log("\n📝 Approving 1,000,000 USDC...");
  const tx = await mockUSDC.approve(paymentContractAddress, approveAmount);
  console.log("Transaction sent:", tx.hash);

  console.log("⏳ Waiting for confirmation...");
  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Check new allowance
  const newAllowance = await mockUSDC.allowance(signer.address, paymentContractAddress);
  console.log("\n💰 New allowance:", ethers.formatUnits(newAllowance, 6), "USDC");

  console.log("\n✅ Done! You can now make payments with AfriFlow.");
  console.log("\n💡 Try in the app:");
  console.log('   "Send $10 to Kenya"');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
