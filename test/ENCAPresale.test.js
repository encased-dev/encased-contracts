const { expect } = require("chai");
const { deployMockContract, deployContract } = require("ethereum-waffle");
const { ethers, waffle } = require("hardhat");
const routerMock = require("./mocks/UniswapRouterV2.json");

const setUp = async () => {
  const [owner, addr1, addr2, addr3] = await ethers.getSigners();
  const UniswapRouterV2 = await deployMockContract(addr3, routerMock);
  UniswapRouterV2.mock.addLiquidityETH.returns(
    ethers.utils.parseEther("50"),
    ethers.utils.parseEther("0.5"),
    ethers.utils.parseEther("5")
  );
  const tokenFactory = await ethers.getContractFactory("ENCA");
  const presaleFactory = await ethers.getContractFactory("ENCAPresale");
  let router = await UniswapRouterV2.deployed();
  let token = await tokenFactory.deploy(true);
  await token.deployed();
  let presale = await presaleFactory.deploy(
    token.address,
    2,
    100,
    router.address
  );
  await presale.deployed();
  let owneradd = token.connect(owner);
  await owneradd.transfer(presale.address, ethers.utils.parseEther("100"));
  return {
    presale: presale,
    token: token,
    router: router,
    addresses: [owner, addr1, addr2, addr3],
  };
};

describe("ENCAPresale", function () {
  let presale, token, addresses;
  beforeEach(function (done) {
    Promise.resolve(setUp()).then(function (res) {
      presale = res.presale;
      token = res.token;
      router = res.router;
      owner = res.addresses[0];
      addr1 = res.addresses[1];
      addr2 = res.addresses[2];
      addr3 = res.addresses[3];
      done();
    });
  });
  it("Should deploy properly", async function () {
    expect(await presale.uniswapRouterAddress()).to.equal(router.address);
    expect(await presale.availableTokens()).to.equal(
      ethers.utils.parseEther("100")
    );
  });
  it("Should set presale length correctly", async function () {
    expect(await presale.presaleLength()).to.equal(172800);
  });
  describe("Starting and ending presale", () => {
    it("Only owner can start presale", async function () {
      addr1presale = presale.connect(addr1);
      await expect(addr1presale.startSale()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
    it("Should start presale", async function () {
      await presale.startSale();
      expect(await presale.startDate()).to.be.not.eql(0);
      expect(await presale.endDate()).to.be.not.eql(0);
    });
    it("Should end presale", async function () {
      expect(await presale.presaleClosed()).to.equal(false);
      await presale.endPresale();
      expect(await presale.presaleClosed()).to.equal(true);
    });
    it("Only owner can end presale", async function () {
      expect(await presale.presaleClosed()).to.equal(false);
      addr1presale = presale.connect(addr1);
      await expect(addr1presale.endPresale()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });
  describe("Converting ETH to tokens", () => {
    it("Should reward 100 tokens per 1 ETH - fallback", async function () {
      await presale.startSale();
      addr1presale = presale.connect(addr1);
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("1"),
      });
      expect(await token.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseEther("100")
      );
    });
    it("Should reward 100 tokens per 1 ETH - contribute", async function () {
      await presale.startSale();
      let addr1presale = presale.connect(addr1);
      await addr1presale.contribute({
        value: ethers.utils.parseEther("1"),
      });
      expect(await token.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseEther("100")
      );
    });
    it("Should revert too little ETH sent", async function () {
      await presale.startSale();
      addr1presale = presale.connect(addr1);
      await expect(
        addr1.sendTransaction({
          to: presale.address,
          value: ethers.utils.parseEther("0.01"),
        })
      ).to.be.revertedWith("Invalid ether sent");
    });
    it("Should revert too much ETH sent", async function () {
      await presale.startSale();
      addr1presale = presale.connect(addr1);
      await expect(
        addr1.sendTransaction({
          to: presale.address,
          value: ethers.utils.parseEther("101"),
        })
      ).to.be.revertedWith("Invalid ether sent");
    });
    it("Should revert presale not running", async function () {
      addr1presale = presale.connect(addr1);
      await expect(
        addr1.sendTransaction({
          to: presale.address,
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.revertedWith("Presale is not running");
    });
    it("Should revert No more tokens to sell", async function () {
      await presale.startSale();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("1"),
      });
      await expect(
        addr1.sendTransaction({
          to: presale.address,
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.revertedWith("No more tokens to sell");
    });
    it("Should revert Not enough tokens to sell", async function () {
      await presale.startSale();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("0.5"),
      });
      await expect(
        addr1.sendTransaction({
          to: presale.address,
          value: ethers.utils.parseEther("1"),
        })
      ).to.be.revertedWith("Not enough tokens to sell");
    });
  });
  describe("Concluding presale", () => {
    it("Should end presale, and withdraw eth", async function () {
      await presale.startSale();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("1"),
      });
      await presale.endPresale();
      await presale.withdrawETH();
      expect(await presale.presaleClosed()).to.equal(true);
      let balance = await owner.getBalance();
      balance = ethers.utils.formatEther(balance);
      expect(parseInt(balance)).to.be.gte(10000);
    });
    it("Should not withdraw eth when presale is running", async function () {
      await presale.startSale();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("1"),
      });
      await expect(presale.withdrawETH()).to.be.revertedWith(
        "Presale is still running"
      );
    });
    it("Should conclude presale, mocked uniswap pool creation, burn rest of the tokens", async function () {
      await presale.startSale();
      let provider = ethers.getDefaultProvider();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("0.5"),
      });
      await presale.endPresale();
      expect(await token.balanceOf(presale.address)).to.equal(
        ethers.utils.parseEther("50")
      );
      await presale.concludePresale();
      expect(await token.balanceOf(presale.address)).to.equal(0);
      expect(await provider.getBalance(presale.address)).to.equal(0);
    });
    it("Conclude should revert with not enough tokens available", async function () {
      await presale.startSale();
      await addr1.sendTransaction({
        to: presale.address,
        value: ethers.utils.parseEther("1"),
      });
      await presale.endPresale();
      await expect(presale.concludePresale()).to.be.revertedWith(
        "No tokens in contract"
      );
    });
    it("Conclude should revert with not enough ETH available", async function () {
      await presale.startSale();     
      await presale.endPresale();
      expect(await token.balanceOf(presale.address)).to.equal(
        ethers.utils.parseEther("100")
      );
      await expect(presale.concludePresale()).to.be.revertedWith(
        "No ETH in contract"
      );
    });
  });
});
