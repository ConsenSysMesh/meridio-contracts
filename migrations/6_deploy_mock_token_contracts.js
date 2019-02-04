const TokenA = artifacts.require('./third-party/lib/helpers/TokenA');
const TokenB = artifacts.require('./third-party/lib/helpers/TokenB');

module.exports = function (deployer) {
  deployer.deploy(TokenA);
  deployer.deploy(TokenB);
};
