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
    address public uniswapRouterAddress;
    IERC20 public ENCA;

    constructor(
        address _tokenAddress,
        uint256 _presaleLength,
        uint8 _tokensPerETH,
        address _uniswapRouterAddress
    ) public {
        ENCA = IERC20(_tokenAddress);
        uniswapRouterAddress = _uniswapRouterAddress;
        presaleLength = _presaleLength * 1 days;
        tokensPerETH = _tokensPerETH;
    }

    // Converts ETH to Tokens and sends new Tokens to the sender
    receive() external payable {
        require(
            startDate > 0 && now.sub(startDate) <= presaleLength,
            "Presale is not running"
        );
        require(ENCA.balanceOf(address(this)) > 0, "No more tokens to sell");
        require(
            msg.value >= 0.1 ether && msg.value <= 100 ether,
            "Invalid ether sent"
        );
        require(!_presaleClosed);
        _amount = msg.value.mul(tokensPerETH);
        require(
            _amount <= ENCA.balanceOf(address(this)),
            "Not enough tokens to sell"
        );
        // update pures.
        totalSold = totalSold.add(_amount);
        collectedETH = collectedETH.add(msg.value);
        // transfer the tokens.
        ENCA.transfer(msg.sender, _amount);
    }

    // Converts ETH to Tokens and sends new Tokens to the sender
    function contribute() external payable {
        require(
            startDate > 0 && now.sub(startDate) <= presaleLength,
            "Presale is not running"
        );
        require(ENCA.balanceOf(address(this)) > 0, "No more tokens to sell");
        require(
            msg.value >= 0.1 ether && msg.value <= 100 ether,
            "Invalid ether sent"
        );
        require(!_presaleClosed);
        _amount = msg.value.mul(tokensPerETH);
        require(
            _amount <= ENCA.balanceOf(address(this)),
            "Not enough tokens to sell"
        );
        // update pures.
        totalSold = totalSold.add(_amount);
        collectedETH = collectedETH.add(msg.value);
        // transfer the tokens.
        ENCA.transfer(msg.sender, _amount);
    }

    // Only the contract owner can call this function
    function withdrawETH() external onlyOwner {
        require(address(this).balance > 0, "Nothing to withdraw");
        require(_presaleClosed, "Presale is still running");
        payable(owner()).transfer(collectedETH);
    }

    function endPresale() public onlyOwner {
        _presaleClosed = true;
    }

    // Only the contract owner can call this function
    function _burn() internal onlyOwner {
        require(ENCA.balanceOf(address(this)) > 0, "Nothing left to burn");
        require(_presaleClosed, "Presale is not closed");
        // burn the left over.
        ENCA.transfer(
            0x000000000000000000000000000000000000dEaD,
            ENCA.balanceOf(address(this))
        );
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
        return ENCA.balanceOf(address(this));
    }

    function concludePresale() external onlyOwner returns (bool) {
        endPresale();
        _createUniswapEthPool();
        _burn();
        return true;
    }

    function _createUniswapEthPool() internal returns (address) {
        address payable ownerAddress = payable(owner());
        require(ENCA.balanceOf(address(this)) > 0, "No tokens in contract");
        require(address(this).balance > 0, "No ETH in contract");
        ENCA.approve(uniswapRouterAddress, totalSold);
        IUniswapV2Router02(uniswapRouterAddress).addLiquidityETH{
            value: address(this).balance
        }(
            address(ENCA),
            totalSold,
            totalSold,
            address(this).balance,
            ownerAddress,
            block.timestamp + 300
        );
    }
}
