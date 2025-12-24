import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentInfo {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    AfriFlowPayment: string;
    EscrowVault: string;
  };
  supportedTokens: string[];
  configuration: {
    feeBps: number;
    treasury: string;
    x402Facilitator: string;
  };
}

async function main() {
  console.log("\n🌍 AfriFlow Deployment Script");
  console.log("═".repeat(50));

  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`\n📡 Network: ${networkName} (Chain ID: ${chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} CRO\n`);

  // Configuration based on network
  const config = getNetworkConfig(networkName);

  console.log("📋 Configuration:");
  console.log(`   Fee BPS: ${config.feeBps} (${config.feeBps / 100}%)`);
  console.log(`   Treasury: ${config.treasury}`);
  console.log(`   x402 Facilitator: ${config.x402Facilitator}`);
  console.log(`   Supported Tokens: ${config.supportedTokens.length}`);

  // Deploy AfriFlowPayment
  console.log("\n🚀 Deploying AfriFlowPayment...");
  const AfriFlowPayment = await ethers.getContractFactory("AfriFlowPayment");
  const afriFlowPayment = await AfriFlowPayment.deploy(
    config.x402Facilitator,
    config.treasury,
    config.feeBps,
    config.supportedTokens
  );
  await afriFlowPayment.waitForDeployment();
  const afriFlowPaymentAddress = await afriFlowPayment.getAddress();
  console.log(`   ✅ AfriFlowPayment deployed at: ${afriFlowPaymentAddress}`);

  // Deploy EscrowVault
  console.log("\n🚀 Deploying EscrowVault...");
  const EscrowVault = await ethers.getContractFactory("EscrowVault");
  const escrowVault = await EscrowVault.deploy(config.treasury, config.feeBps);
  await escrowVault.waitForDeployment();
  const escrowVaultAddress = await escrowVault.getAddress();
  console.log(`   ✅ EscrowVault deployed at: ${escrowVaultAddress}`);

  // Grant AGENT_ROLE to AfriFlowPayment on EscrowVault
  console.log("\n🔐 Setting up roles...");
  const AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AGENT_ROLE"));
  await escrowVault.grantRole(AGENT_ROLE, afriFlowPaymentAddress);
  console.log("   ✅ AGENT_ROLE granted to AfriFlowPayment on EscrowVault");

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: networkName,
    chainId: Number(chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AfriFlowPayment: afriFlowPaymentAddress,
      EscrowVault: escrowVaultAddress,
    },
    supportedTokens: config.supportedTokens,
    configuration: {
      feeBps: config.feeBps,
      treasury: config.treasury,
      x402Facilitator: config.x402Facilitator,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📁 Deployment info saved to: ${deploymentPath}`);

  // Generate frontend config
  const frontendConfigPath = path.join(__dirname, "../frontend/src/config/contracts.json");
  const frontendDir = path.dirname(frontendConfigPath);
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  fs.writeFileSync(frontendConfigPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📁 Frontend config saved to: ${frontendConfigPath}`);

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("═".repeat(50));
  console.log("\n📍 Contract Addresses:");
  console.log(`   AfriFlowPayment: ${afriFlowPaymentAddress}`);
  console.log(`   EscrowVault:     ${escrowVaultAddress}`);

  // Verification instructions
  console.log("\n📝 To verify contracts on explorer:");
  console.log(`   npx hardhat verify --network ${networkName} ${afriFlowPaymentAddress} \\`);
  console.log(`     "${config.x402Facilitator}" "${config.treasury}" ${config.feeBps} \\`);
  console.log(`     "[${config.supportedTokens.map(t => `\\"${t}\\"`).join(",")}]"`);
  console.log(`\n   npx hardhat verify --network ${networkName} ${escrowVaultAddress} \\`);
  console.log(`     "${config.treasury}" ${config.feeBps}`);

  return deploymentInfo;
}

function getNetworkConfig(networkName: string) {
  // Testnet configurations
  const testnetConfig = {
    feeBps: 10, // 0.1%
    treasury: process.env.TREASURY_ADDRESS || "0x0000000000000000000000000000000000000001",
    x402Facilitator: process.env.X402_FACILITATOR || "0x0000000000000000000000000000000000000000",
    supportedTokens: [
      // Cronos Testnet devUSDC.e
      "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
      // Add more testnet tokens as needed
    ],
  };

  // Mainnet configurations
  const mainnetConfig = {
    feeBps: 10, // 0.1%
    treasury: process.env.TREASURY_ADDRESS || "",
    x402Facilitator: process.env.X402_FACILITATOR || "",
    supportedTokens: [
      // Cronos Mainnet USDC
      "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
      // Cronos Mainnet USDT
      "0x66e428c3f67a68878562e79A0234c1F83c208770",
    ],
  };

  switch (networkName) {
    case "cronosTestnet":
      return testnetConfig;
    case "cronosMainnet":
      return mainnetConfig;
    case "hardhat":
    case "localhost":
    default:
      return {
        ...testnetConfig,
        treasury: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account 0
      };
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
