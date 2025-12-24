import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { AfriFlowPayment, EscrowVault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AfriFlow Contracts", function () {
  // Fixtures
  async function deployContractsFixture() {
    const [owner, treasury, operator, agent, user1, user2, arbiter] = await ethers.getSigners();

    // Deploy mock ERC20 token (USDC-like with 6 decimals)
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockUSDC = await MockToken.deploy("Mock USDC", "mUSDC", 6);
    await mockUSDC.waitForDeployment();

    // Deploy mock x402 facilitator
    const MockX402 = await ethers.getContractFactory("MockX402Facilitator");
    const mockX402 = await MockX402.deploy();
    await mockX402.waitForDeployment();

    // Deploy AfriFlowPayment
    const AfriFlowPayment = await ethers.getContractFactory("AfriFlowPayment");
    const afriFlowPayment = await AfriFlowPayment.deploy(
      await mockX402.getAddress(),
      treasury.address,
      10, // 0.1% fee
      [await mockUSDC.getAddress()]
    );
    await afriFlowPayment.waitForDeployment();

    // Deploy EscrowVault
    const EscrowVault = await ethers.getContractFactory("EscrowVault");
    const escrowVault = await EscrowVault.deploy(treasury.address, 15); // 0.15% fee
    await escrowVault.waitForDeployment();

    // Setup roles
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("OPERATOR_ROLE"));
    const AGENT_ROLE = ethers.keccak256(ethers.toUtf8Bytes("AGENT_ROLE"));
    const ARBITER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ARBITER_ROLE"));

    await afriFlowPayment.grantRole(OPERATOR_ROLE, operator.address);
    await afriFlowPayment.grantRole(AGENT_ROLE, agent.address);
    await escrowVault.grantRole(OPERATOR_ROLE, operator.address);
    await escrowVault.grantRole(AGENT_ROLE, agent.address);
    await escrowVault.grantRole(ARBITER_ROLE, arbiter.address);

    // Mint tokens to users
    const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
    await mockUSDC.mint(user1.address, mintAmount);
    await mockUSDC.mint(user2.address, mintAmount);

    // Approve contracts
    await mockUSDC.connect(user1).approve(await afriFlowPayment.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(user2).approve(await afriFlowPayment.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(user1).approve(await escrowVault.getAddress(), ethers.MaxUint256);
    await mockUSDC.connect(user2).approve(await escrowVault.getAddress(), ethers.MaxUint256);

    // Corridors
    const NIGERIA = ethers.encodeBytes32String("NG");
    const KENYA = ethers.encodeBytes32String("KE");
    const USA = ethers.encodeBytes32String("US");

    return {
      afriFlowPayment,
      escrowVault,
      mockUSDC,
      mockX402,
      owner,
      treasury,
      operator,
      agent,
      user1,
      user2,
      arbiter,
      NIGERIA,
      KENYA,
      USA,
      OPERATOR_ROLE,
      AGENT_ROLE,
      ARBITER_ROLE,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AfriFlowPayment Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe("AfriFlowPayment", function () {
    describe("Deployment", function () {
      it("should deploy with correct parameters", async function () {
        const { afriFlowPayment, treasury, mockX402 } = await loadFixture(deployContractsFixture);

        expect(await afriFlowPayment.treasury()).to.equal(treasury.address);
        expect(await afriFlowPayment.feeBps()).to.equal(10);
        expect(await afriFlowPayment.x402Facilitator()).to.equal(await mockX402.getAddress());
      });

      it("should initialize African corridors correctly", async function () {
        const { afriFlowPayment, NIGERIA, KENYA } = await loadFixture(deployContractsFixture);

        expect(await afriFlowPayment.isCorridorSupported(NIGERIA, KENYA)).to.be.true;
        expect(await afriFlowPayment.isCorridorSupported(KENYA, NIGERIA)).to.be.true;
      });

      it("should support configured tokens", async function () {
        const { afriFlowPayment, mockUSDC } = await loadFixture(deployContractsFixture);

        expect(await afriFlowPayment.supportedTokens(await mockUSDC.getAddress())).to.be.true;
      });
    });

    describe("Instant Payments", function () {
      it("should execute instant payment correctly", async function () {
        const { afriFlowPayment, mockUSDC, user1, user2, treasury, NIGERIA, KENYA } =
          await loadFixture(deployContractsFixture);

        const amount = ethers.parseUnits("100", 6); // 100 USDC
        const expectedFee = amount * 10n / 10000n; // 0.1%
        const expectedNet = amount - expectedFee;

        const user2BalanceBefore = await mockUSDC.balanceOf(user2.address);
        const treasuryBalanceBefore = await mockUSDC.balanceOf(treasury.address);

        const tx = await afriFlowPayment.connect(user1).executeInstantPayment(
          user2.address,
          await mockUSDC.getAddress(),
          amount,
          NIGERIA,
          KENYA,
          '{"purpose": "family support"}'
        );

        await expect(tx).to.emit(afriFlowPayment, "PaymentInitiated");
        await expect(tx).to.emit(afriFlowPayment, "PaymentCompleted");

        // Verify balances
        expect(await mockUSDC.balanceOf(user2.address)).to.equal(user2BalanceBefore + expectedNet);
        expect(await mockUSDC.balanceOf(treasury.address)).to.equal(treasuryBalanceBefore + expectedFee);
      });

      it("should calculate fees correctly", async function () {
        const { afriFlowPayment } = await loadFixture(deployContractsFixture);

        const amount = ethers.parseUnits("1000", 6);
        const expectedFee = ethers.parseUnits("1", 6); // 0.1% of 1000

        expect(await afriFlowPayment.calculateFee(amount)).to.equal(expectedFee);
      });

      it("should revert for unsupported corridors", async function () {
        const { afriFlowPayment, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const invalidCorridor = ethers.encodeBytes32String("XX");
        const amount = ethers.parseUnits("100", 6);

        await expect(
          afriFlowPayment.connect(user1).executeInstantPayment(
            user2.address,
            await mockUSDC.getAddress(),
            amount,
            invalidCorridor,
            invalidCorridor,
            ""
          )
        ).to.be.revertedWithCustomError(afriFlowPayment, "UnsupportedCorridor");
      });

      it("should revert for amount below minimum", async function () {
        const { afriFlowPayment, mockUSDC, user1, user2, NIGERIA, KENYA } =
          await loadFixture(deployContractsFixture);

        const tooSmall = ethers.parseUnits("0.5", 6); // 0.5 USDC, below 1 USDC minimum

        await expect(
          afriFlowPayment.connect(user1).executeInstantPayment(
            user2.address,
            await mockUSDC.getAddress(),
            tooSmall,
            NIGERIA,
            KENYA,
            ""
          )
        ).to.be.revertedWithCustomError(afriFlowPayment, "InvalidAmount");
      });

      it("should track user payment history", async function () {
        const { afriFlowPayment, mockUSDC, user1, user2, NIGERIA, KENYA } =
          await loadFixture(deployContractsFixture);

        const amount = ethers.parseUnits("100", 6);

        await afriFlowPayment.connect(user1).executeInstantPayment(
          user2.address,
          await mockUSDC.getAddress(),
          amount,
          NIGERIA,
          KENYA,
          ""
        );

        const payments = await afriFlowPayment.getUserPayments(user1.address);
        expect(payments.length).to.equal(1);

        const payment = await afriFlowPayment.getPayment(payments[0]);
        expect(payment.sender).to.equal(user1.address);
        expect(payment.recipient).to.equal(user2.address);
        expect(payment.amount).to.equal(amount);
        expect(payment.status).to.equal(1); // COMPLETED
      });
    });

    describe("Batch Payments", function () {
      it("should execute batch payments correctly", async function () {
        const { afriFlowPayment, mockUSDC, user1, user2, treasury, NIGERIA, KENYA } =
          await loadFixture(deployContractsFixture);

        const [, , , , , , , recipient3] = await ethers.getSigners();

        const amounts = [
          ethers.parseUnits("100", 6),
          ethers.parseUnits("200", 6),
          ethers.parseUnits("150", 6),
        ];
        const recipients = [user2.address, recipient3.address, user2.address];
        const toCorridors = [KENYA, KENYA, KENYA];

        const totalAmount = amounts.reduce((a, b) => a + b, 0n);
        const totalFee = totalAmount * 10n / 10000n;

        const treasuryBefore = await mockUSDC.balanceOf(treasury.address);

        const tx = await afriFlowPayment.connect(user1).executeBatchPayment(
          recipients,
          await mockUSDC.getAddress(),
          amounts,
          NIGERIA,
          toCorridors
        );

        const receipt = await tx.wait();

        // Should emit 3 PaymentInitiated and 3 PaymentCompleted events
        expect(await mockUSDC.balanceOf(treasury.address)).to.equal(treasuryBefore + totalFee);
      });
    });

    describe("Access Control", function () {
      it("should allow admin to update fee", async function () {
        const { afriFlowPayment, owner } = await loadFixture(deployContractsFixture);

        await afriFlowPayment.connect(owner).setFeeBps(20);
        expect(await afriFlowPayment.feeBps()).to.equal(20);
      });

      it("should revert if non-admin tries to update fee", async function () {
        const { afriFlowPayment, user1 } = await loadFixture(deployContractsFixture);

        await expect(afriFlowPayment.connect(user1).setFeeBps(20)).to.be.reverted;
      });

      it("should allow operator to update corridors", async function () {
        const { afriFlowPayment, operator, NIGERIA } = await loadFixture(deployContractsFixture);

        const newCorridor = ethers.encodeBytes32String("BR"); // Brazil

        await afriFlowPayment.connect(operator).setCorridor(NIGERIA, newCorridor, true);
        expect(await afriFlowPayment.isCorridorSupported(NIGERIA, newCorridor)).to.be.true;
      });

      it("should allow operator to pause/unpause", async function () {
        const { afriFlowPayment, operator } = await loadFixture(deployContractsFixture);

        await afriFlowPayment.connect(operator).pause();
        expect(await afriFlowPayment.paused()).to.be.true;

        await afriFlowPayment.connect(operator).unpause();
        expect(await afriFlowPayment.paused()).to.be.false;
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EscrowVault Tests
  // ═══════════════════════════════════════════════════════════════════════

  describe("EscrowVault", function () {
    describe("Escrow Creation", function () {
      it("should create escrow with milestones", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("1000", 6);
        const milestoneAmounts = [
          ethers.parseUnits("300", 6),
          ethers.parseUnits("400", 6),
          ethers.parseUnits("300", 6),
        ];
        const descriptions = ["Design Complete", "Development Done", "Final Delivery"];
        const releaseTimes = [0, 0, 0]; // Manual release

        const tx = await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          descriptions,
          milestoneAmounts,
          releaseTimes,
          '{"project": "website development"}'
        );

        await expect(tx).to.emit(escrowVault, "EscrowCreated");

        const escrow = await escrowVault.getEscrow(1);
        expect(escrow.sender).to.equal(user1.address);
        expect(escrow.recipient).to.equal(user2.address);
        expect(escrow.totalAmount).to.equal(totalAmount);
        expect(escrow.milestoneCount).to.equal(3);
        expect(escrow.status).to.equal(0); // ACTIVE
      });

      it("should transfer funds to escrow on creation", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("500", 6);
        const user1Before = await mockUSDC.balanceOf(user1.address);
        const vaultBefore = await mockUSDC.balanceOf(await escrowVault.getAddress());

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Milestone 1"],
          [totalAmount],
          [0],
          ""
        );

        expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1Before - totalAmount);
        expect(await mockUSDC.balanceOf(await escrowVault.getAddress())).to.equal(vaultBefore + totalAmount);
      });
    });

    describe("Milestone Release", function () {
      it("should allow sender to release milestone", async function () {
        const { escrowVault, mockUSDC, user1, user2, treasury } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("1000", 6);
        const milestoneAmounts = [
          ethers.parseUnits("500", 6),
          ethers.parseUnits("500", 6),
        ];

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Phase 1", "Phase 2"],
          milestoneAmounts,
          [0, 0],
          ""
        );

        const user2Before = await mockUSDC.balanceOf(user2.address);
        const expectedFee = milestoneAmounts[0] * 15n / 10000n; // 0.15%
        const expectedNet = milestoneAmounts[0] - expectedFee;

        await escrowVault.connect(user1).releaseMilestone(1, 0);

        expect(await mockUSDC.balanceOf(user2.address)).to.equal(user2Before + expectedNet);

        const milestone = await escrowVault.getMilestone(1, 0);
        expect(milestone.status).to.equal(1); // RELEASED
      });

      it("should complete escrow when all milestones released", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Only Milestone"],
          [totalAmount],
          [0],
          ""
        );

        await expect(escrowVault.connect(user1).releaseMilestone(1, 0))
          .to.emit(escrowVault, "EscrowCompleted");

        const escrow = await escrowVault.getEscrow(1);
        expect(escrow.status).to.equal(1); // COMPLETED
      });

      it("should auto-release milestone after release time", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);
        const futureTime = (await time.latest()) + 3600; // 1 hour from now

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Auto Release"],
          [totalAmount],
          [futureTime],
          ""
        );

        // Before time: should fail
        await expect(
          escrowVault.connect(user2).releaseMilestone(1, 0)
        ).to.be.revertedWithCustomError(escrowVault, "NotAuthorized");

        // Advance time
        await time.increaseTo(futureTime + 1);

        // Now anyone can trigger release
        await expect(escrowVault.connect(user2).releaseMilestone(1, 0))
          .to.emit(escrowVault, "MilestoneReleased");
      });
    });

    describe("Disputes", function () {
      it("should allow recipient to dispute milestone", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Disputed Work"],
          [totalAmount],
          [0],
          ""
        );

        await expect(escrowVault.connect(user2).disputeMilestone(1, 0))
          .to.emit(escrowVault, "MilestoneDisputed");

        const milestone = await escrowVault.getMilestone(1, 0);
        expect(milestone.status).to.equal(2); // DISPUTED
      });

      it("should allow arbiter to resolve dispute in favor of recipient", async function () {
        const { escrowVault, mockUSDC, user1, user2, arbiter, treasury } =
          await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Disputed Work"],
          [totalAmount],
          [0],
          ""
        );

        await escrowVault.connect(user2).disputeMilestone(1, 0);

        const user2Before = await mockUSDC.balanceOf(user2.address);
        const expectedFee = totalAmount * 15n / 10000n;
        const expectedNet = totalAmount - expectedFee;

        await expect(escrowVault.connect(arbiter).resolveDispute(1, 0, true))
          .to.emit(escrowVault, "DisputeResolved");

        expect(await mockUSDC.balanceOf(user2.address)).to.equal(user2Before + expectedNet);
      });

      it("should allow arbiter to resolve dispute in favor of sender", async function () {
        const { escrowVault, mockUSDC, user1, user2, arbiter } =
          await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Disputed Work"],
          [totalAmount],
          [0],
          ""
        );

        await escrowVault.connect(user2).disputeMilestone(1, 0);

        const user1Before = await mockUSDC.balanceOf(user1.address);

        await escrowVault.connect(arbiter).resolveDispute(1, 0, false);

        // Full refund to sender (no fee on refund)
        expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1Before + totalAmount);
      });
    });

    describe("Cancellation", function () {
      it("should allow sender to cancel escrow before any release", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Never Started"],
          [totalAmount],
          [0],
          ""
        );

        const user1Before = await mockUSDC.balanceOf(user1.address);

        await expect(escrowVault.connect(user1).cancelEscrow(1))
          .to.emit(escrowVault, "EscrowCancelled");

        expect(await mockUSDC.balanceOf(user1.address)).to.equal(user1Before + totalAmount);

        const escrow = await escrowVault.getEscrow(1);
        expect(escrow.status).to.equal(2); // CANCELLED
      });

      it("should not allow cancellation after partial release", async function () {
        const { escrowVault, mockUSDC, user1, user2 } = await loadFixture(deployContractsFixture);

        const totalAmount = ethers.parseUnits("100", 6);
        const milestoneAmounts = [
          ethers.parseUnits("50", 6),
          ethers.parseUnits("50", 6),
        ];

        await escrowVault.connect(user1).createEscrow(
          user2.address,
          await mockUSDC.getAddress(),
          totalAmount,
          ["Phase 1", "Phase 2"],
          milestoneAmounts,
          [0, 0],
          ""
        );

        // Release first milestone
        await escrowVault.connect(user1).releaseMilestone(1, 0);

        // Try to cancel
        await expect(
          escrowVault.connect(user1).cancelEscrow(1)
        ).to.be.revertedWithCustomError(escrowVault, "NotAuthorized");
      });
    });
  });
});
