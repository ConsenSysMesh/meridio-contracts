const FakeDai = artifacts.require('./mocks/DSToken');

module.exports = function(deployer) {
  let daiInstance;
  deployer.deploy(FakeDai, 'DAI')
    .then(function(instance) {
      daiInstance = instance;
      daiInstance.mint(
        1000000000000000000000000000,
      )
        .then(function(tx) {
          daiInstance.setName('Dai');
        });
    });
};
