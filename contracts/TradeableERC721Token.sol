// SPDX-License-Identifier: MIT

/*
Abstract contract which allows trading to some external (contract) party
Mostly copied from OpenSea https://github.com/ProjectOpenSea/opensea-creatures/blob/master/contracts/TradeableERC721Token.sol
*/
pragma solidity 0.6.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "hardhat/console.sol";

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

/**
 * @title TradeableERC721Token
 * TradeableERC721Token - ERC721 contract that whitelists a trading address, and has minting functionality.
 */
contract TradeableERC721Token is ERC721, Ownable {
    using SafeMath for uint256;
    using Strings for string;

    uint256 private _burnedCounter = 0;
    address private _proxyRegistryAddress;

    //TODO BURNED EVENT

    constructor(
        string memory _name,
        string memory _symbol,
        address proxyRegistryAddress,
        string memory _baseTokenURI
    ) public ERC721(_name, _symbol) {
        _proxyRegistryAddress = proxyRegistryAddress;
    }

    modifier onlyOwnerOf(uint256 _tokenId) {
        require(
            ownerOf(_tokenId) == msg.sender,
            "Only Box owner can perform this action"
        );
        _;
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * @param _to address of the future owner of the token
     */

    function _mintTo(address _to) internal returns (uint256) {
        uint256 newTokenId = _getNextTokenId();
        _safeMint(_to, newTokenId);
        // After registering ERC20 for this box mint and register to new holder, each box should be unique and identified by addresses of content (external api / uri generation?) + block
        return newTokenId;
    }

    function _mintDerived(address _to, uint256 _tokenId)
        internal
        onlyOwnerOf(_tokenId)
        returns (uint256)
    {
        uint256 newTokenId = _getNextTokenId();
        _safeMint(_to, newTokenId);
        // After registering ERC20 for this box mint and register to new holder, each box should be unique and identified by addresses of content (external api / uri generation?) + block
        return newTokenId;
    }

    /**
     * @dev Approves another address to transfer the given array of token IDs
     * @param _to address to be approved for the given token ID
     * @param _tokenIds uint256[] IDs of the tokens to be approved
     */
    function approveBulk(address _to, uint256[] memory _tokenIds) public {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            approve(_to, _tokenIds[i]);
        }
    }

    /**
     * @dev calculates the next token ID based on totalSupply and the burned offset
     * @return uint256 for the next token ID
     */
    function _getNextTokenId() private view returns (uint256) {
        return totalSupply().add(1).add(_burnedCounter);
    }

    /**
     * @dev extends default burn functionality with the the burned counter
     */
    function _burnToken(uint256 _tokenId) internal {
        super._burn(_tokenId);
        _burnedCounter++;
    }

    /**
     * Override isApprovedForAll to whitelist user's OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAllProxy(address owner, address operator)
        public
        view
        returns (bool)
    {
        //Check optional proxy
        if (_proxyRegistryAddress != address(0)) {
            // Whitelist OpenSea proxy contract for easy trading.
            ProxyRegistry proxyRegistry = ProxyRegistry(_proxyRegistryAddress);
            if (address(proxyRegistry.proxies(owner)) == operator) {
                return true;
            }
        }

        return super.isApprovedForAll(owner, operator);
    }

    /// @notice Returns a list of all tokens assigned to an address.
    /// @param _owner The owner whose tokens we are interested in.
    /// @dev This method MUST NEVER be called by smart contract code, due to the price
    function tokensOfOwner(address _owner)
        external
        view
        returns (uint256[] memory ownerTokens)
    {
        uint256 tokenCount = balanceOf(_owner);

        if (tokenCount == 0) {
            // Return an empty array
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 resultIndex = 0;

            uint256 _tokenIdx;

            for (_tokenIdx = 0; _tokenIdx < tokenCount; _tokenIdx++) {
                result[resultIndex] = tokenOfOwnerByIndex(_owner, _tokenIdx);
                resultIndex++;
            }

            return result;
        }
    }

    function burnedCount() public view returns (uint256) {
        return _burnedCounter;
    }
}
