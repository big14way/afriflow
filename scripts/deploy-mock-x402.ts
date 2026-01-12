import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying MockX402Facilitator to Cronos Testnet...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "TCRO\n");

  // Deploy MockX402Facilitator
  const MockX402 = await ethers.getContractFactory("MockX402Facilitator");
  const mockX402 = await MockX402.deploy();
  await mockX402.waitForDeployment();

  const mockX402Address = await mockX402.getAddress();
  console.log("✅ MockX402Facilitator deployed to:", mockX402Address);

  // Update .env instructions
  console.log("\n📝 UPDATE YOUR .env FILE:");
  console.log(`X402_FACILITATOR=${mockX402Address}`);

  // Verify on block explorer (optional)
  console.log("\n🔍 To verify on Cronoscan:");
  console.log(`npx hardhat verify --network cronosTestnet ${mockX402Address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
