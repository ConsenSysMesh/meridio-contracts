const ABI = require('ethereumjs-abi');
const util = require("ethereumjs-util");

exports.getSignature = async function (makerAddress, makerAmount, makerToken,
                                       takerAddress, takerAmount, takerToken,
                                       expiration, nonce) {
  // Message hash for signing.
  const args = [makerAddress, makerAmount, makerToken,
                takerAddress, takerAmount, takerToken, expiration, nonce];
  const argTypes = ['address', 'uint', 'address', 'address',
                    'uint', 'address', 'uint256', 'uint256'];
  const msg = ABI.soliditySHA3(argTypes, args);
  const sig = web3.eth.sign(makerAddress, util.bufferToHex(msg));
  const { v, r, s } = util.fromRpcSig(sig);
  return {v:v, r:r, s:s}
}
