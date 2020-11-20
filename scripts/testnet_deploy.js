require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const tokenFactory = await hre.ethers.getContractFactory("ENCA");
  const presaleFactory = await hre.ethers.getContractFactory("ENCAPresale");
  const ndxFactory = await hre.ethers.getContractFactory("ERC20Box");
  // If we had constructor arguments, they would be passed into deploy()
  let contract = await tokenFactory.deploy();

  // The address the Contract WILL have once mined
  console.log(contract.address);

  // The transaction that was sent to the network to deploy the Contract

  // The contract is NOT deployed yet; we must wait until it is mined
  await contract.deployed();
  let presale = await presaleFactory.deploy(contract.address, 5, 100);
  console.log(presale.address);
  await presale.deployed();
  let ndx = await ndxFactory.deploy(
    "EBXBetaTest",
    "EBXBetaLog",
    contract.address,
    process.env.DEV_URL,
    contract.address
  );
  console.log(ndx.address);
  await ndx.deployed();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
