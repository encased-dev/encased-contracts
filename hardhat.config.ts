require('dotenv').config()

import { HardhatUserConfig, HardhatNetworkUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-typechain";
import "hardhat-deploy";
import "hardhat-gas-reporter";
// import "hardhat-abi-exporter";
import "hardhat-spdx-license-identifier";
import '@openzeppelin/hardhat-upgrades';
import "solidity-coverage"

const KOVAN_PRIVATE_KEY:string = process.env.KOVAN_KEY!;
const KOVAN_RPC_URL = process.env.RPC_URL_KOVAN;
const RINKEBY_RPC_URL = process.env.RPC_URL_RINKEBY
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_KEY;
const DEPLOYER:string = process.env.TESTNET_DEPLOYER!;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [{ version: "0.6.8", settings: {
      optimizer: {
        enabled: true,
        runs: 100
      }
    } }],
  },
  networks: {
    hardhat: {},
    localhost: {},
    kovan: {
      url: KOVAN_RPC_URL,
      accounts: [KOVAN_PRIVATE_KEY],
    },
    rinkeby: {
      url: KOVAN_RPC_URL,
      accounts: [KOVAN_PRIVATE_KEY],
    }
   },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  gasReporter: {
    gasPrice: 20,
    showTimeSpent: true,
    noColors: true,
    rst: true,
    showMethodSig: true,
    maxMethodDiff: 20,
    outputFile: './gas_report.rst'
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  }, 
  mocha: {
    timeout: 150000  
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: true,
  },
  namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
            42: DEPLOYER,
            4: DEPLOYER, // but for rinkeby it will be a specific address           
        },
   },
};

export default config;