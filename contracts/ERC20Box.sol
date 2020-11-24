// SPDX-License-Identifier: MIT

pragma experimental ABIEncoderV2;
pragma solidity 0.6.8;

import "./TradeableERC721Token.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/**
 * @title ERC20Box
 *
 * A tradable box (ERC-721), OpenSee.io compliant, holds ERC-20 tokens, owner can "unpack" the box and recieve the tokens
 */
contract ERC20Box is TradeableERC721Token {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public GOVERNANCE_CONTRACT_ADDRESS;
    uint256 public FEE_AMOUNT;

    //TODO EDIT FRONTEND
    event RecievedERC20(
        address indexed _from,
        uint256 indexed _tokenId,
        address indexed _erc20Contract,
        uint256 _value
    );
    event TransferERC20(
        uint256 indexed _tokenId,
        uint256 indexed _childToken,
        address indexed _erc20Contract,
        uint256 _value
    );
    event DerivedTokenMinted(
        address indexed _from,
        address indexed _to,
        uint256 _tokenId,
        uint256 _newTokenId
    );
    event TokenMinted(address indexed _from, uint256 _tokenId);

    // tokenId => token contract
    mapping(uint256 => address[]) public tokenIdAddresses;
    // tokenId => (token contract => balance)
    mapping(uint256 => mapping(address => uint256)) public tokenIdTokenBalances;

    mapping(uint256 => uint256[]) public childTokens;

    mapping(uint256 => uint256) public parentTokenId;

    struct TokenBalance {
        uint256 _balance;
        address _tokenAddress;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _proxyRegistryAddress,
        string memory _baseTokenURI,
        address _governanceContractAddress,
        uint256 feeAmount
    )
        public
        TradeableERC721Token(
            _name,
            _symbol,
            _proxyRegistryAddress,
            _baseTokenURI
        )
    {
        GOVERNANCE_CONTRACT_ADDRESS = _governanceContractAddress;
        FEE_AMOUNT = feeAmount;
        _setBaseURI(_baseTokenURI);
    }

    // Important! remember to call ERC20(address).approve(this, amount)
    // or this contract will not be able to do the transfer on your behalf.

    modifier isParentOf(uint256 _parentToken, uint256 _childToken) {
        require(
            parentTokenId[_childToken] == _parentToken,
            "Only Parent token of Child token can perform this action"
        );
        _;
    }

    function depositERC20(
        uint256 amount,
        address tokenAddress,
        uint256 _tokenId
    ) public onlyOwnerOf(_tokenId) {
        IERC20(tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );
        tokenIdAddresses[_tokenId].push(tokenAddress);
        tokenIdTokenBalances[_tokenId][tokenAddress] = tokenIdTokenBalances[_tokenId][tokenAddress]
            .add(amount);
        emit RecievedERC20(msg.sender, _tokenId, tokenAddress, amount);
    }

    function unpackAll(uint256 _tokenId, address recipientAddress)
        external
        onlyOwnerOf(_tokenId)
    {
        require(recipientAddress != address(0), "cannot be zero address");
        address[] memory _tokenAddresses = tokenIdAddresses[_tokenId];
        for (uint256 index = 0; index < _tokenAddresses.length; index++) {

                uint256 balance
             = tokenIdTokenBalances[_tokenId][_tokenAddresses[index]];
            tokenIdTokenBalances[_tokenId][_tokenAddresses[index]] = tokenIdTokenBalances[_tokenId][_tokenAddresses[index]]
                .sub(balance);
            IERC20(_tokenAddresses[index]).safeTransfer(
                recipientAddress,
                balance
            );
        }
        _burnToken(_tokenId);
    }

    function mintTo() external {
        // payment in governance token needs to be approved first
        // todo staking contract address for rewards
        // burn for now
        IERC20(GOVERNANCE_CONTRACT_ADDRESS).safeTransferFrom(
            msg.sender,
            address(this),
            FEE_AMOUNT
        );
        uint256 newTokenId = super._mintTo(msg.sender);
        emit TokenMinted(msg.sender, newTokenId);
        //call event creation here
    }

    /**
     * @dev Issue partial BoxTokens of underlying BoxToken (splitting assets owned by the original issued)
     */
    function createChildToken(address _to, uint256 _tokenId)
        external
        onlyOwnerOf(_tokenId)
    {
        // payment in governance token needs to be approved first
        // todo staking contract address for rewards
        require(_to != address(0), "cannot be zero address");
        IERC20(GOVERNANCE_CONTRACT_ADDRESS).safeTransferFrom(
            msg.sender,
            address(this),
            FEE_AMOUNT
        );
        uint256 newTokenId = super._mintDerived(_to, _tokenId);
        childTokens[_tokenId].push(newTokenId);
        parentTokenId[newTokenId] = _tokenId;
        emit DerivedTokenMinted(msg.sender, _to, _tokenId, newTokenId);
    }

    function transferToChildToken(
        uint256 _parentToken,
        uint256 _childToken,
        address _erc20Address,
        uint256 amount
    ) external onlyOwnerOf(_parentToken) isParentOf(_parentToken, _childToken) {
        require(
            tokenIdTokenBalances[_parentToken][_erc20Address] >= amount,
            "INVALID TOKEN BALANCE"
        );
        tokenIdTokenBalances[_parentToken][_erc20Address] = tokenIdTokenBalances[_parentToken][_erc20Address]
            .sub(amount);
        tokenIdTokenBalances[_childToken][_erc20Address] = tokenIdTokenBalances[_childToken][_erc20Address]
            .add(amount);
        emit TransferERC20(_parentToken, _childToken, _erc20Address, amount);
    }

    function getTokenAdresses(uint256 _tokenId)
        external
        view
        returns (address[] memory)
    {
        return tokenIdAddresses[_tokenId];
    }

    function getERC20Balance(uint256 _tokenId, address _erc20Address)
        external
        view
        returns (uint256)
    {
        return tokenIdTokenBalances[_tokenId][_erc20Address];
    }

    function getChildTokens(uint256 _tokenId)
        external
        view
        returns (uint256[] memory)
    {
        return childTokens[_tokenId];
    }

    function getParent(uint256 _tokenId) external view returns (uint256) {
        return parentTokenId[_tokenId];
    }

    /**
     * @dev OpenSee compatibility, expects user-friendly number
     */
    function itemsPerLootbox() external view {
        // todo
    }

    function getAllBalancesPerBoxToken(uint256 _tokenId)
        external
        view
        returns (TokenBalance[] memory)
    {
        address[] memory addresses = tokenIdAddresses[_tokenId];
        TokenBalance[] memory result = new TokenBalance[](addresses.length);
        for (uint256 index = 0; index < addresses.length; index++) {
            uint256 balance = tokenIdTokenBalances[_tokenId][addresses[index]];
            result[index] = TokenBalance(balance, addresses[index]);
        }
        return result;
    }
}
