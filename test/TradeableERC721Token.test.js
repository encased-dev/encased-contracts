const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const setUp = async () => {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();

  const tokenFactory = await ethers.getContractFactory("TradeableERC721Token");

  let token = await tokenFactory.deploy(
    "TestTradeableERC721Token",
    "T721",
    owner.address,
    "baseTokenUri"
  );

  return {
    token: token,
    addresses: [owner, addr1, addr2, addr3],
  };
};

describe("TradeableERC721Token", function () {
  let token, addresses;
  beforeEach(function (done) {
    Promise.resolve(setUp()).then(function (res) {
      token = res.token;
      owner = res.addresses[0];
      addr1 = res.addresses[1];
      addr2 = res.addresses[2];
      addr3 = res.addresses[3];
      done();
    });
  });
  it("Should deploy properly (rest of the tests are in the ERC20Box tests for practicality)", async function () {
    expect(await token.totalSupply()).to.equal(0);
  });
});
