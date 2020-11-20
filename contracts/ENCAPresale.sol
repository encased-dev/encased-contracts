// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "hardhat/console.sol";

contract ENCAPresale is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    bool private _presaleClosed = false;
    uint8 public tokensPerETH;
    uint256 public presaleLength;
    uint256 public totalSold;
    uint256 public collectedETH;
    uint256 public startDate;
    uint256 public endDate;
    uint256 private _amount;
    address private _tokenAddress;
    address private _ownerAddress;
    address
        public UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    IUniswapV2Router02 public uniswapRouter;
    IERC20 public Token;

    constructor(
        address _tokenAddress,
        uint256 _presaleLength,
        uint8 _tokensPerETH
    ) public {
        _tokenAddress = _tokenAddress;
        Token = IERC20(_tokenAddress);
        uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
        presaleLength = _presaleLength * 1 days;
        tokensPerETH = _tokensPerETH;
    }

    // Converts ETH to Tokens and sends new Tokens to the sender
    receive() external payable {
        require(
            startDate > 0 && now.sub(startDate) <= presaleLength,
            "Presale is not running"
        );
        require(Token.balanceOf(address(this)) > 0, "No more tokens to sell");
        require(
            msg.value >= 0.1 ether && msg.value <= 100 ether,
            "Invalid ether sent"
        );
        require(!_presaleClosed);
        _amount = msg.value.mul(tokensPerETH);
        require(
            _amount <= Token.balanceOf(address(this)),
            "Not enough tokens to sell"
        );
        // update pures.
        totalSold = totalSold.add(_amount);
        collectedETH = collectedETH.add(msg.value);
        // transfer the tokens.
        Token.transfer(msg.sender, _amount);
    }

    // Converts ETH to Tokens and sends new Tokens to the sender
    function contribute() external payable {
        require(
            startDate > 0 && now.sub(startDate) <= presaleLength,
            "Presale is not running"
        );
        require(Token.balanceOf(address(this)) > 0, "No more tokens to sell");
        require(
            msg.value >= 0.1 ether && msg.value <= 100 ether,
            "Invalid ether sent"
        );
        require(!_presaleClosed);
        _amount = msg.value.mul(tokensPerETH);
        require(
            _amount <= Token.balanceOf(address(this)),
            "Not enough tokens to sell"
        );
        // update pures.
        totalSold = totalSold.add(_amount);
        collectedETH = collectedETH.add(msg.value);
        // transfer the tokens.
        Token.transfer(msg.sender, _amount);
    }

    // Only the contract owner can call this function
    function withdrawETH() external onlyOwner {
        require(address(this).balance > 0);
        require(_presaleClosed, "Presale is still running");
        payable(owner()).transfer(collectedETH);
    }

    function endPresale() public onlyOwner {
        _presaleClosed = true;
    }

    // Only the contract owner can call this function
    function _burn() internal onlyOwner {
        require(
            Token.balanceOf(address(this)) > 0 &&
                now.sub(startDate) > presaleLength
        );
        require(_presaleClosed);
        // burn the left over.
        Token.transfer(address(0), Token.balanceOf(address(this)));
    }

    // Starts the sale
    // Only the contract owner can call this function
    function startSale() external onlyOwner {
        require(startDate == 0);
        startDate = now;
        endDate = startDate - presaleLength;
    }

    function presaleClosed() external view returns (bool) {
        return _presaleClosed;
    }

    function availableTokens() external view returns (uint256) {
        return Token.balanceOf(address(this));
    }

    function concludePresale() external onlyOwner returns (bool) {
        endPresale();
        _createUniswapEthPool();
        _burn();
        return true;
    }

    function _createUniswapEthPool() internal returns (address) {
        console.log(totalSold);
        IERC20(Token).approve(UNISWAP_ROUTER_ADDRESS, totalSold);
        IUniswapV2Router02(uniswapRouter).addLiquidityETH{
            value: address(this).balance
        }(
            _tokenAddress,
            totalSold,
            totalSold.sub(totalSold.div(100).mul(5)),
            address(this).balance,
            address(this),
            block.timestamp + 300
        );
        payable(owner()).transfer(address(this).balance);
    }
}
