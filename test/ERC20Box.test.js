const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

const setUp = async () => {
  const [owner, addr1, addr2] = await ethers.getSigners();
  const tokenFactory = await ethers.getContractFactory("ENCA");
  const boxFactory = await ethers.getContractFactory("ERC20Box");
  let token = await tokenFactory.deploy();
  await token.deployed();
  let box = await boxFactory.deploy(
    "LinkBoxTest",
    "LINKBX",
    token.address,
    "baseTokenURI",
    token.address,
    ethers.utils.parseEther("1")
  );
  await box.deployed();
  return {
    box: box,
    token: token,
    addresses: [owner, addr1, addr2],
  };
};

describe("ERC20Box", function () {
  let box, token, addresses;
  beforeEach(function (done) {
    Promise.resolve(setUp()).then(function (res) {
      box = res.box;
      token = res.token;
      owner = res.addresses[0];
      addr1 = res.addresses[1];
      addr2 = res.addresses[2];
      done();
    });
  });
  it("Should deploy properly", async function () {  
    expect(await box.burnedCount()).to.equal(0);
  });
  it("Should create valid tokenURI - emit TokenMinted", async function () {
    let approveadd1 = token.connect(owner);
    await approveadd1.approve(box.address, ethers.utils.parseEther("100.0"));
    await expect(box.mintTo())
      .to.emit(box, "TokenMinted(address,uint256)")
      .withArgs(owner.address, ethers.BigNumber.from("1"));
    expect(await token.balanceOf(box.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await box.tokenURI(1)).to.equal("baseTokenURI1");
    expect(await box.ownerOf(1)).to.equal(owner.address);
  });
  it("Should return array of tokenIds for tokensOfowner call", async function () {
    let approveadd1 = token.connect(owner);
    await approveadd1.approve(box.address, ethers.utils.parseEther("100.0"));
    await expect(box.mintTo())
      .to.emit(box, "TokenMinted(address,uint256)")
      .withArgs(owner.address, ethers.BigNumber.from("1"));
    expect(await token.balanceOf(box.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await box.tokenURI(1)).to.equal("baseTokenURI1");
    expect(await box.tokensOfOwner(owner.address)).to.eql([
      ethers.BigNumber.from("1"),
    ]);
  });
  it("Should return empty array for tokensOfowner call", async function () {
    let approveadd1 = token.connect(owner);
    await approveadd1.approve(box.address, ethers.utils.parseEther("100.0"));
    await expect(box.mintTo())
      .to.emit(box, "TokenMinted(address,uint256)")
      .withArgs(owner.address, ethers.BigNumber.from("1"));
    expect(await token.balanceOf(box.address)).to.equal(
      ethers.utils.parseEther("1")
    );
    expect(await box.tokenURI(1)).to.equal("baseTokenURI1");
    expect(await box.tokensOfOwner(addr1.address)).to.eql([]);
  });
  describe("Depositing", () => {
    it("Should revert with ERC20: transfer amount exceeds balance", async function () {
      let owneradd = token.connect(owner);
      await owneradd.transfer(addr1.address, ethers.utils.parseEther("2.0"));
      let approveadd1 = token.connect(addr1);
      await approveadd1.approve(box.address, ethers.utils.parseEther("100.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();

      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Should revert with ERC20: transfer amount exceeds allowance", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.approve(box.address, ethers.utils.parseEther("6.0"));
      await box.mintTo();
      let tokenadd1 = box.connect(owner);
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Should add 10 of ENCA to token - Emit RecievedERC20", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      )
        .to.emit(box, "RecievedERC20(address,uint256,address,uint256)")
        .withArgs(
          addr1.address,
          ethers.BigNumber.from("1"),
          token.address,
          ethers.utils.parseEther("10.0")
        );

      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("10.0")
      );
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Should return balace per token deposited", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      )
        .to.emit(box, "RecievedERC20(address,uint256,address,uint256)")
        .withArgs(
          addr1.address,
          ethers.BigNumber.from("1"),
          token.address,
          ethers.utils.parseEther("10.0")
        );
      expect(await tokenadd1.getAllBalancesPerBoxToken(1)).to.eql([
        [ethers.utils.parseEther("10.0"), token.address],
      ]);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Should return array of deposited tokens", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      )
        .to.emit(box, "RecievedERC20(address,uint256,address,uint256)")
        .withArgs(
          addr1.address,
          ethers.BigNumber.from("1"),
          token.address,
          ethers.utils.parseEther("10.0")
        );
      expect(await box.getTokenAdresses(1)).to.eql([token.address]);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Only owner of Box/token can deposit ERC20", async function () {
      let owneradd = token.connect(owner);
      await owneradd.transfer(addr1.address, ethers.utils.parseEther("11.0"));
      await owneradd.transfer(addr2.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      let approveadd2 = token.connect(addr2);
      let approveadd1 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("100.0"));
      await approveadd1.approve(box.address, ethers.utils.parseEther("11.0"));
      await tokenadd1.mintTo();
      await expect(
        tokenadd2.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      ).to.be.revertedWith("Only Box owner can perform this action");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Not even token owner can deposit for another user", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(owner);
      let tokenadd2 = box.connect(addr1);
      await tokenadd2.mintTo();
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      ).to.be.revertedWith("Only Box owner can perform this action");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
  });
  describe("Withdrawals", () => {
    it("Should remove 10 of ENCA from token and send it to tokenOwner - address 1", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();

      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1.unpackAll(1, addr1.address);
      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("0")
      );
      expect(await token.balanceOf(addr2.address)).to.equal(
        ethers.utils.parseEther("0")
      );
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
      expect(await token.balanceOf(addr1.address)).to.equal(
        ethers.utils.parseEther("10.0")
      );
      expect(await box.burnedCount()).to.equal(1);
    });
    it("Should remove 10 of ENCA from token and send it from address 1 to address 2", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      let tokenadd1 = box.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      await tokenadd1.mintTo();

      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1.unpackAll(1, addr2.address);
      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("0")
      );
      expect(await token.balanceOf(addr2.address)).to.equal(
        ethers.utils.parseEther("10.0")
      );
      expect(await box.burnedCount()).to.equal(1);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Token should be burned after unpacking", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));

      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1.unpackAll(1, addr2.address);
      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("0")
      );
      expect(await token.balanceOf(addr2.address)).to.equal(
        ethers.utils.parseEther("10.0")
      );
      expect(await box.burnedCount()).to.equal(1);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Only owner Box/token can withdraw", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));

      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      let tokenadd2 = box.connect(addr2);
      await expect(tokenadd2.unpackAll(1, addr2.address)).to.be.revertedWith(
        "Only Box owner can perform this action"
      );
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Not even token owner can withdraw for another user", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));

      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      let tokenadd2 = box.connect(owner);
      await expect(tokenadd2.unpackAll(1, addr2.address)).to.be.revertedWith(
        "Only Box owner can perform this action"
      );
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
  });
  describe("Trading", () => {
    it("Should sucessfully transfer token 1 owning 10 of ENCA from address1 and send it to addr2", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1["safeTransferFrom(address,address,uint256)"](
        addr1.address,
        addr2.address,
        1
      );
      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("10.0")
      );
      expect(await box.ownerOf(1)).to.equal(addr2.address);
      expect(await box.burnedCount()).to.equal(0);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Previous owner - address1, cannot deposit funds into traded token owned now by address2", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("100.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("100.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1["safeTransferFrom(address,address,uint256)"](
        addr1.address,
        addr2.address,
        1
      );
      await expect(
        tokenadd1.depositERC20(
          ethers.utils.parseEther("10.0"),
          token.address,
          1
        )
      ).to.be.revertedWith("Only Box owner can perform this action");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
    it("Previous owner - address1, cannot unpack the box and withdraw ERC20 owned now by address2", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("100.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("100.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd1["safeTransferFrom(address,address,uint256)"](
        addr1.address,
        addr2.address,
        1
      );
      await expect(tokenadd1.unpackAll(1, addr1.address)).to.be.revertedWith(
        "Only Box owner can perform this action"
      );
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("11")
      );
    });
  });
  describe("Minting Child tokens", () => {
    it("Should sucessfully mint a child token to secondary address for token 1 - event emission DerivedTokenMinted", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await expect(tokenadd1.createChildToken(addr2.address, 1))
        .to.emit(box, "DerivedTokenMinted(address,address,uint256,uint256)")
        .withArgs(
          addr1.address,
          addr2.address,
          ethers.BigNumber.from("1"),
          ethers.BigNumber.from("2")
        );
      expect(await box.getChildTokens(1)).to.deep.equal([
        ethers.BigNumber.from("2"),
      ]);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("2")
      );
      expect(await box.ownerOf(2)).to.equal(addr2.address);
    });
    it("Should sucessfully mint a child token to secondary address for token 1 and validate it by getParentToken", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await expect(tokenadd1.createChildToken(addr2.address, 1))
        .to.emit(box, "DerivedTokenMinted(address,address,uint256,uint256)")
        .withArgs(
          addr1.address,
          addr2.address,
          ethers.BigNumber.from("1"),
          ethers.BigNumber.from("2")
        );
      expect(await box.getChildTokens(1)).to.deep.equal([
        ethers.BigNumber.from("2"),
      ]);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("2")
      );
      expect(await box.getParent(2)).to.equal(1);
    });
    it("Only owner of a token can mint child tokens", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      await tokenadd1.mintTo();
      await expect(
        tokenadd2.createChildToken(addr2.address, 1)
      ).to.be.revertedWith("Only Box owner can perform this action");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
    it("Not even contract owner can mint child tokens", async function () {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("11.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(owner);
      await tokenadd1.mintTo();
      await expect(
        tokenadd2.createChildToken(addr2.address, 1)
      ).to.be.revertedWith("Only Box owner can perform this action");
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("1")
      );
    });
  });
  describe("Moving tokens to child tokens", () => {
    it("Should deposit 5 ENCA tokens from parent 1 to child 2 - Emit TokenTransfer", async () => {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("12.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await approveadd2.approve(box.address, ethers.utils.parseEther("1"));
      await tokenadd1.createChildToken(addr2.address, 1);
      await expect(
        tokenadd1.transferToChildToken(
          1,
          2,
          token.address,
          ethers.utils.parseEther("5")
        )
      )
        .to.emit(box, "TransferERC20(uint256,uint256,address,uint256)")
        .withArgs(
          ethers.BigNumber.from("1"),
          ethers.BigNumber.from("2"),
          token.address,
          ethers.utils.parseEther("5.0")
        );
      expect(await box.getERC20Balance(1, token.address)).to.equal(
        ethers.utils.parseEther("5.0")
      );
      expect(await box.getERC20Balance(2, token.address)).to.equal(
        ethers.utils.parseEther("5.0")
      );
      expect(await box.getChildTokens(1)).to.deep.equal([
        ethers.BigNumber.from("2"),
      ]);
      expect(await token.balanceOf(box.address)).to.equal(
        ethers.utils.parseEther("12")
      );
    });
    it("Only token owner can call transferToChildToken ", async () => {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("12.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await approveadd2.approve(box.address, ethers.utils.parseEther("1"));
      await tokenadd1.createChildToken(addr2.address, 1);
      await expect(
        tokenadd2.transferToChildToken(
          1,
          2,
          token.address,
          ethers.utils.parseEther("5")
        )
      ).to.be.revertedWith("Only Box owner can perform this action");
    });
    it("Child token cannot call transferToChildToken to parent token", async () => {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("12.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await approveadd2.approve(box.address, ethers.utils.parseEther("1"));
      await tokenadd1.createChildToken(addr2.address, 1);
      await tokenadd1.transferToChildToken(
        1,
        2,
        token.address,
        ethers.utils.parseEther("5")
      );
      await expect(
        tokenadd2.transferToChildToken(
          2,
          1,
          token.address,
          ethers.utils.parseEther("5")
        )
      ).to.be.revertedWith(
        "Only Parent token of Child token can perform this action"
      );
    });
    it("Parent token cannot call transferToChildToken to parent token", async () => {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("12.0")
      );
      await approveadd1.transfer(addr2.address, ethers.utils.parseEther("2"));
      let approveadd2 = token.connect(addr1);
      let approveadd3 = token.connect(addr2);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      await approveadd3.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await tokenadd2.mintTo();
      await expect(
        tokenadd2.transferToChildToken(
          2,
          1,
          token.address,
          ethers.utils.parseEther("5")
        )
      ).to.be.revertedWith(
        "Only Parent token of Child token can perform this action"
      );
    });
    it("Parent token cannot transfer more than his amount to child token", async () => {
      let approveadd1 = token.connect(owner);
      await approveadd1.transfer(
        addr1.address,
        ethers.utils.parseEther("12.0")
      );
      let approveadd2 = token.connect(addr1);
      await approveadd2.approve(box.address, ethers.utils.parseEther("11.0"));
      let tokenadd1 = box.connect(addr1);
      let tokenadd2 = box.connect(addr2);
      await tokenadd1.mintTo();
      await tokenadd1.depositERC20(
        ethers.utils.parseEther("10.0"),
        token.address,
        1
      );
      await approveadd2.approve(box.address, ethers.utils.parseEther("1"));
      await tokenadd1.createChildToken(addr2.address, 1);
      await expect(
        tokenadd1.transferToChildToken(
          1,
          2,
          token.address,
          ethers.utils.parseEther("15")
        )
      ).to.be.revertedWith("INVALID TOKEN BALANCE");
    });
  });
});
