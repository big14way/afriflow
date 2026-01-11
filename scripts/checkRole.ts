import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function main() {
  const paymentContract = await ethers.getContractAt(
    "AfriFlowPayment",
    process.env.PAYMENT_CONTRACT!
  );

  const [signer] = await ethers.getSigners();
  const AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AGENT_ROLE"));

  console.log("\n🔍 Checking AGENT_ROLE...");
  console.log("Signer address:", signer.address);

  const hasAgentRole = await paymentContract.hasRole(AGENT_ROLE, signer.address);
  console.log("Has AGENT_ROLE:", hasAgentRole);

  if (!hasAgentRole) {
    console.log("\n📝 Granting AGENT_ROLE to backend signer...");
    const tx = await paymentContract.grantRole(AGENT_ROLE, signer.address);
    console.log("Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ AGENT_ROLE granted!");
  } else {
    console.log("✅ Signer already has AGENT_ROLE");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
