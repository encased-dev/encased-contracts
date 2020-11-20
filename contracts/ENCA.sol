// SPDX-License-Identifier: MIT

pragma solidity 0.6.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ENCA is ERC20 {
    bool private _isBeta = true;

    constructor() public ERC20("Encased", "ENCS") {
        // _mint(_governContract, 35000);
        _mint(msg.sender, 15000 * (10**18));
    }
}
