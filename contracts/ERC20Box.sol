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
 * A tradable box (ERC-721), OpenSee.io compliant, which holds a portion of ERC-20 tokens,
 * that get credited to the owner upon 'opening' it
 */
contract ERC20Box is TradeableERC721Token {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using Strings for uint256;

    address public GOVERNANCE_CONTRACT_ADDRESS;
    uint256 public FEE_AMOUNT = 1 * (10**18);

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
    mapping(uint256 => address[]) private _tokenIdAddresses;
    // tokenId => (token contract => balance)
    mapping(uint256 => mapping(address => uint256))
        private _tokenIdTokenBalances;
    // tokenId => (token contract => token contract index)
    mapping(uint256 => mapping(address => uint256))
        private _tokenIdTokenIndexes;

    mapping(uint256 => uint256[]) private _childTokens;

    mapping(uint256 => uint256) private _parentTokenId;

    struct TokenBalance {
        uint256 _balance;
        address _tokenAddress;
    }

    /**
     * @dev Constructor function
     * Important! This ERC20Box is not functional until depositERC20() is called
     */

    constructor(
        string memory _name,
        string memory _symbol,
        address _proxyRegistryAddress,
        string memory _baseTokenURI,
        address _governanceContractAddress
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
        _setBaseURI(_baseTokenURI);
    }

    // Important! remember to call ERC20(address).approve(this, amount)
    // or this contract will not be able to do the transfer on your behalf.

    modifier isParentOf(uint256 _parentToken, uint256 _childToken) {
        require(
            _parentTokenId[_childToken] == _parentToken,
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
        uint256 nextIndex = _tokenIdAddresses[_tokenId].length;
        _tokenIdAddresses[_tokenId].push(tokenAddress);
        _tokenIdTokenBalances[_tokenId][tokenAddress] = _tokenIdTokenBalances[_tokenId][tokenAddress]
            .add(amount);
        _tokenIdTokenIndexes[_tokenId][tokenAddress] = nextIndex;
        emit RecievedERC20(msg.sender, _tokenId, tokenAddress, amount);
    }

    //TODO rewrite using events
    function unpackAll(uint256 _tokenId, address recipientAddress)
        external
        onlyOwnerOf(_tokenId)
    {
        require(recipientAddress != address(0), "cannot be zero address");
        /// IMPLEMENTATION
        address[] memory _tokenAddresses = _tokenIdAddresses[_tokenId];
        for (uint256 index = 0; index < _tokenAddresses.length; index++) {

                uint256 balance
             = _tokenIdTokenBalances[_tokenId][_tokenAddresses[index]];
            _tokenIdTokenBalances[_tokenId][_tokenAddresses[index]] = _tokenIdTokenBalances[_tokenId][_tokenAddresses[index]]
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
        _childTokens[_tokenId].push(newTokenId);
        _parentTokenId[newTokenId] = _tokenId;
        emit DerivedTokenMinted(msg.sender, _to, _tokenId, newTokenId);
    }

    function transferToChildToken(
        uint256 _parentToken,
        uint256 _childToken,
        address _erc20Address,
        uint256 amount
    ) external onlyOwnerOf(_parentToken) isParentOf(_parentToken, _childToken) {
        require(
            _tokenIdTokenBalances[_parentToken][_erc20Address] >= amount,
            "INVALID TOKEN BALANCE"
        );
        _tokenIdTokenBalances[_parentToken][_erc20Address] = _tokenIdTokenBalances[_parentToken][_erc20Address]
            .sub(amount);
        _tokenIdTokenBalances[_childToken][_erc20Address] = _tokenIdTokenBalances[_childToken][_erc20Address]
            .add(amount);
        emit TransferERC20(_parentToken, _childToken, _erc20Address, amount);
    }

    function getTokenAdresses(uint256 _tokenId)
        public
        view
        returns (address[] memory)
    {
        return _tokenIdAddresses[_tokenId];
    }

    function getERC20Balance(uint256 _tokenId, address _erc20Address)
        public
        view
        returns (uint256)
    {
        return _tokenIdTokenBalances[_tokenId][_erc20Address];
    }

    function getIndexOfERC20(uint256 _tokenId, address _erc20Address)
        external
        view
        returns (uint256)
    {
        return _tokenIdTokenIndexes[_tokenId][_erc20Address];
    }

    function getChildTokens(uint256 _tokenId)
        external
        view
        returns (uint256[] memory)
    {
        return _childTokens[_tokenId];
    }

    function getParent(uint256 _tokenId) external view returns (uint256) {
        return _parentTokenId[_tokenId];
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
        address[] memory addresses = getTokenAdresses(_tokenId);
        TokenBalance[] memory result = new TokenBalance[](addresses.length);
        for (uint256 index = 0; index < addresses.length; index++) {
            uint256 balance = getERC20Balance(_tokenId, addresses[index]);
            result[index] = TokenBalance(balance, addresses[index]);
        }
        return result;
    }
}
