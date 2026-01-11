import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Approving USDC for EscrowVault from:", signer.address);

  const USDC_ADDRESS = process.env.USDC_ADDRESS || "0xd8E68c3B9D3637CB99054efEdeE20BD8aeea45f1";
  const ESCROW_ADDRESS = process.env.ESCROW_VAULT || "0xde5eCbdf2e9601C4B4a08899EAa836081011F7ac";

  const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

  // Approve a large amount (1 million USDC)
  const approvalAmount = ethers.parseUnits("1000000", 6);

  console.log(`\nApproving ${ethers.formatUnits(approvalAmount, 6)} USDC for EscrowVault...`);
  const tx = await usdc.approve(ESCROW_ADDRESS, approvalAmount);
  await tx.wait();

  console.log("✅ Approval successful!");
  console.log(`Transaction: ${tx.hash}`);

  // Check allowance
  const allowance = await usdc.allowance(signer.address, ESCROW_ADDRESS);
  console.log(`\nCurrent allowance: ${ethers.formatUnits(allowance, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
