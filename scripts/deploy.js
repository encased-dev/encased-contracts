const hre = require("hardhat");
require("dotenv").config({ path: ".env" });
const fs = require("fs");
const provider = ethers.getDefaultProvider("kovan");
const mnemonic = process.env.DEV_MNEMONIC;
let wallet = ethers.Wallet.fromMnemonic(mnemonic);

let overrides = {
  // The maximum units of gas for the transaction to use
  gasLimit: 8000000,
  gasPrice: ethers.utils.parseUnits("100.0", "gwei"),
};

async function main() {
  async function main() {
    const tokenFactory = await hre.ethers.getContractFactory("GVRN");
    // const presaleFactory = await hre.ethers.getContractFactory("GVRNPresale");
    const ndxFactory = await hre.ethers.getContractFactory("ERC20Box");
    // If we had constructor arguments, they would be passed into deploy()
    let contract = await tokenFactory.deploy();

    // The address the Contract WILL have once mined
    console.log(contract.address);

    // The transaction that was sent to the network to deploy the Contract
    console.log(contract.deployTransaction.hash);

    // The contract is NOT deployed yet; we must wait until it is mined
    await contract.deployed();
    // let presale = await presaleFactory.deploy(contract.address, 5);
    // console.log(presale.address);
    // console.log(presale.deployTransaction.hash);
    // await presale.deployed();
    let ndx = await ndxFactory.deploy(
      "NBXLoggingTest",
      "NBXLog",
      contract.address,
      "baseTokenURI"
    );
    console.log(ndx.address);
    console.log(ndx.deployTransaction.hash);
    await ndx.deployed();
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
