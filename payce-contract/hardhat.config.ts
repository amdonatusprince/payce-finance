import type { HardhatUserConfig } from "hardhat/config";
import 'dotenv/config';
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import { configVariable } from "hardhat/config";


const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          evmVersion: "london",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  
  networks: {
    mezotestnet: {
      type: "http",
      url: "https://rpc.test.mezo.org",
      chainId: 31611,
      accounts: [configVariable("MEZO_PRIVATE_KEY")],
    },
  },
  // @ts-ignore: etherscan config is provided by @nomicfoundation/hardhat-verify
  etherscan: {
    apiKey: {
      "mezotestnet": "empty",
    },
    customChains: [
      {
        network: "mezotestnet",
        chainId: 31611,
        urls: {
          apiURL: "https://api.explorer.test.mezo.org/api",
          browserURL: "https://explorer.test.mezo.org",
        },
      },
    ],
  },
};

export default config;
