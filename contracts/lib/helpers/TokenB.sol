pragma solidity ^0.4.11;

import "../StandardToken.sol";
import "../SafeMath.sol";

// standard token and allows for
contract TokenB is StandardToken {
  using SafeMath for uint;
  address public minter;
  function TokenB() {
    minter = msg.sender;
  }
  function create(address account, uint amount) {
    assert(msg.sender == minter);
    balances[account] = balances[account].add(amount);
    totalSupply = totalSupply.add(amount);
  }
  function destroy(address account, uint amount) {
    assert(msg.sender == minter);
    assert(balances[account] >= amount);
    balances[account] = balances[account].sub(amount);
    totalSupply = totalSupply.sub(amount);
  }
}
