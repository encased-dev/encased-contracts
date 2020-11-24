require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
async function main() {
  const tokenFactory = await hre.ethers.getContractFactory("ENCA");
  const presaleFactory = await hre.ethers.getContractFactory("ENCAPresale");
  const ebxFactory = await hre.ethers.getContractFactory("ERC20Box");
  // If we had constructor arguments, they would be passed into deploy()
  let token = await tokenFactory.deploy(true);

  // The address the Contract WILL have once mined
  console.log(token.address);
  // The transaction that was sent to the network to deploy the Contract

  // The contract is NOT deployed yet; we must wait until it is mined
  await token.deployed();
  fs.writeFileSync("./ENCA.txt", `true`);
  let presale = await presaleFactory.deploy(
    token.address,
    5,
    100,
    0x7a250d5630b4cf539739df2c5dacb4c659f2488d
  );
  console.log(presale.address);
  await presale.deployed();
  fs.writeFileSync(
    "./ENCAPresale.txt",
    `${token.address}, 5, 100, 0x7a250d5630b4cf539739df2c5dacb4c659f2488d`
  );
  let ebx = await ebxFactory.deploy(
    "EBXBeta",
    "EBXB",
    token.address,
    process.env.PROD_URL,
    token.address,
    1
  );
  console.log(ebx.address);
  fs.writeFileSync(
    "./ERC20Box.txt",
    `EBXBeta, EBXB, ${token.address}, ${process.env.PROD_URL}, ${token.address}, 1`
  );
  await ebx.deployed();
  // verifying contracts
  await hre.run("verify", {
    address: token.address,
    constructorArguments: "./ENCA.txt",
  });
  await hre.run("verify", {
    address: presale.address,
    constructorArguments: "./ENCAPresale.txt",
  });
  await hre.run("verify", {
    address: ebx.address,
    constructorArguments: "./ERC20Box.txt",
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
