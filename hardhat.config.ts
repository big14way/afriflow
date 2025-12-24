import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
      forking: {
        url: "https://evm-t3.cronos.org",
        enabled: false,
      },
    },
    // Cronos Testnet
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000000, // 5000 gwei
    },
    // Cronos Mainnet
    cronosMainnet: {
      url: "https://evm.cronos.org",
      chainId: 25,
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000000,
    },
  },
  etherscan: {
    apiKey: {
      cronosTestnet: process.env.CRONOS_API_KEY || "",
      cronosMainnet: process.env.CRONOS_API_KEY || "",
    },
    customChains: [
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://explorer-api.cronos.org/testnet/api",
          browserURL: "https://explorer.cronos.org/testnet",
        },
      },
      {
        network: "cronosMainnet",
        chainId: 25,
        urls: {
          apiURL: "https://explorer-api.cronos.org/mainnet/api",
          browserURL: "https://explorer.cronos.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
