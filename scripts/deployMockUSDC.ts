import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  console.log("\n🚀 Deploying Mock USDC to Cronos Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "TCRO\n");

  // Deploy Mock USDC
  console.log("📝 Deploying MockUSDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();

  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", mockUSDCAddress);

  // Get initial balance
  const deployerBalance = await mockUSDC.balanceOf(deployer.address);
  console.log("   Deployer USDC balance:", ethers.formatUnits(deployerBalance, 6), "USDC");

  console.log("\n📋 Summary:");
  console.log("═══════════════════════════════════════════════════════");
  console.log("MockUSDC Address:", mockUSDCAddress);
  console.log("═══════════════════════════════════════════════════════");
  console.log("\n✅ Deployment complete!");
  console.log("\n💡 Next steps:");
  console.log("1. Update your .env file:");
  console.log(`   USDC_ADDRESS=${mockUSDCAddress}`);
  console.log("\n2. Use the faucet function to get test USDC:");
  console.log("   await mockUSDC.faucet() // Gives you 1000 USDC");
  console.log("\n3. Or mint specific amounts:");
  console.log("   await mockUSDC.mint(address, amount)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
