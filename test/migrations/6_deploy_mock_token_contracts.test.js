/* eslint max-len:0 */
const TokenA = artifacts.require('./third-party/lib/helpers/TokenA');
const TokenB = artifacts.require('./third-party/lib/helpers/TokenB');

contract('deploy_mock_token_contracts', function(accounts) {
  const expectedContractArgs = {};

  before( async () => {
    this.deployedA = await TokenA.deployed();
    this.deployedB = await TokenB.deployed();
  });

  describe('Deployed', () => {
    it('it should deploy the TokenA contract to the network', async () => {
      assert.isNotNull(this.deployedA, 'The contract was not deployed');
    });
    it('it should deploy the TokenB contract to the network', async () => {
      assert.isNotNull(this.deployedB, 'The contract was not deployed');
    });
  });
});
