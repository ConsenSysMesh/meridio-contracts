/* eslint max-len:0 */
const util = require('ethereumjs-util');
const ABI = require('ethereumjs-abi');
const encodeCall = require('../helpers/encodeCall');

const Exchange = artifacts.require('Exchange');
const OwnedUpgradeabilityProxyAbstraction = artifacts.require('OwnedUpgradeabilityProxy');

const TokenA = artifacts.require('SimpleToken');
const TokenB = artifacts.require('AssetToken');

contract('Exchange', (accounts) => {
  const maker = accounts[0];
  const taker = accounts[1];
  const proxyOwner = accounts[2];

  let exchange;
  let proxy;
  let tokenA;
  let tokenB;
  const tokenName = 'TakerAsset';
  const decimalUnits = 18;
  const tokenSymbol = 'TA';

  const initialSupply = 10000;

  it('deploys proxy contract', async () => {
    proxy = await OwnedUpgradeabilityProxyAbstraction.new({ from: proxyOwner });
  });

  it('deploys exchange contract', async () => {
    exchange = await Exchange.new({ from: maker });
  });

  it('deploys and mints 1000 tokenA tokens for maker', async () => {
    tokenA = await TokenA.new({ from: maker });
    const balance = await tokenA.balanceOf(maker);
    assert.equal(balance.toNumber(), initialSupply, 'failed to mint 1000 tokenA for maker!');
  });

  it('deploys and mints 1000 tokenB tokens for taker', async () => {
    const initializeDataV0 = encodeCall(
      'initialize',
      ['address', 'uint', 'string', 'uint8', 'string'],
      [taker, initialSupply, tokenName, decimalUnits, tokenSymbol],
    );
    const tokenV0 = await TokenB.new({ from: proxyOwner });
    await proxy.upgradeToAndCall(tokenV0.address, initializeDataV0, { from: proxyOwner });
    tokenB = await TokenB.at(proxy.address, { from: proxyOwner });
    const balance = await tokenB.balanceOf(taker);
    assert.equal(balance.toNumber(), initialSupply, 'failed to mint 1000 tokenB for taker!');
  });

  it('approves exchange to withdraw 250 tokenA from maker', async () => {
    const tx = await tokenA.approve(exchange.address, 250, { from: maker });
    assert.ok(tx.logs.find((log) => log.event === 'Approval'));
  });

  it('approves exchange to withdraw 750 tokenB from taker', async () => {
    const tx = await tokenB.approve(exchange.address, 750, { from: taker });
    assert.ok(tx.logs.find((log) => log.event === 'Approval'));
  });

  it('fills an order for 250 tokenA from maker and 750 tokenB from taker', async () => {
    // Order parameters.
    const makerAddress = maker;
    const makerAmount = 250;
    const makerToken = tokenA.address;
    const takerAddress = taker;
    const takerAmount = 750;
    const takerToken = tokenB.address;
    const expiration = new Date().getTime() + 60000;
    const nonce = 1;

    const args = [makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken, expiration, nonce];
    const argTypes = ['address', 'uint', 'address', 'address',
      'uint', 'address', 'uint256', 'uint256'];
    const msg = ABI.soliditySHA3(argTypes, args);

    const sig = web3.eth.sign(makerAddress, util.bufferToHex(msg));
    const { v, r, s } = util.fromRpcSig(sig);

    const tx = await exchange.fill(
      makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken,
      expiration, nonce, v, util.bufferToHex(r), util.bufferToHex(s),
      {
        from: takerAddress,
        gasLimit: web3.toHex(200000),
        gasPrice: web3.eth.gasPrice,
      },
    );
    assert.ok(tx.logs.find((log) => log.event === 'Filled'));
  });

  it('checks that maker now has a balance of 750 tokenA and 750 tokenB', async () => {
    const balanceA = await tokenA.balanceOf(maker);
    assert(balanceA.equals(initialSupply - 250), `Balance is incorrect: ${balanceA.toString()}`);

    const balanceB = await tokenB.balanceOf(maker);
    assert(balanceB.equals(750), `Balance is incorrect: ${balanceB.toString()}`);
  });

  it('checks that taker now has a balance of 250 tokenA and 250 tokenB', async () => {
    const balanceA = await tokenA.balanceOf(taker);
    assert(balanceA.equals(250), `Balance is incorrect: ${balanceA.toString()}`);

    const balanceB = await tokenB.balanceOf(taker);
    assert(balanceB.equals(initialSupply - 750), `Balance is incorrect: ${balanceB.toString()}`);
  });

  it('approves exchange to withdraw 750 tokenA from maker', async () => {
    const tx = await tokenA.approve(exchange.address, 750, { from: maker });
    assert.ok(tx.logs.find((log) => log.event === 'Approval'));
  });

  it('fills an order for remaining 750 tokenA in exchange for ether', async () => {
    // Order parameters.
    const makerAddress = maker;
    const makerAmount = 750;
    const makerToken = tokenA.address;
    const takerAddress = taker;
    const takerAmount = 750;
    const takerToken = null;
    const expiration = new Date().getTime() + 60000;
    const nonce = 1;

    const args = [makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken, expiration, nonce];
    const argTypes = ['address', 'uint', 'address', 'address',
      'uint', 'address', 'uint256', 'uint256'];
    const msg = ABI.soliditySHA3(argTypes, args);

    const sig = web3.eth.sign(makerAddress, util.bufferToHex(msg));
    const { v, r, s } = util.fromRpcSig(sig);

    const tx = await exchange.fill(
      makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken,
      expiration, nonce, v, util.bufferToHex(r), util.bufferToHex(s),
      {
        from: takerAddress,
        value: takerAmount,
        gasLimit: web3.toHex(200000),
        gasPrice: web3.eth.gasPrice,
      },
    );
    assert.ok(tx.logs.find((log) => log.event === 'Filled'));
  });

  it('checks that taker now has a balance of 1000 tokenA', async () => {
    const balanceA = await tokenA.balanceOf(taker);
    assert(balanceA.equals(1000), `Balance is incorrect: ${balanceA.toString()}`);
  });
});
