const util = require('ethereumjs-util');
const ABI = require('ethereumjs-abi');
const sign = require('./util.js');

const Exchange = artifacts.require('./Exchange');
const TokenA = artifacts.require('./lib/helpers/TokenA');
const TokenB = artifacts.require('./lib/helpers/TokenB');

contract('Orders expire', (accounts) => {
  const maker = accounts[0];
  const taker = accounts[1];

  let exchange;
  let tokenA;
  let tokenB;

  const balancesBefore = { A: { maker: 1000, taker: 0 }, B: { maker: 0, taker: 1000 } };

  // Order parameters.
  let makerToken;
  let takerToken;
  const makerAddress = maker;
  const makerAmount = 20;
  const takerAddress = taker;
  const takerAmount = 50;
  const time = 60000;
  const expiration = 50;
  const nonce = 2;

  it('the exchange contract is deployed and two users are funded with tokens', async () => {
    exchange = await Exchange.deployed();
    tokenA = await TokenA.deployed();
    makerToken = tokenA.address;
    await tokenA.create(maker, balancesBefore.A.maker);
    tokenB = await TokenB.deployed();
    takerToken = tokenB.address;
    await tokenB.create(taker, balancesBefore.B.taker);
    assert.equal((await tokenA.balanceOf(maker)).toNumber(), 1000, 'maker did not get tokens');
    assert.equal((await tokenB.balanceOf(taker)).toNumber(), 1000, 'taker did not get tokens');
  });


  it('both sides approve each other', async () => {
    txB = await tokenB.approve(exchange.address, takerAmount, { from: taker });
    txA = await tokenA.approve(exchange.address, makerAmount, { from: maker });
    assert.ok(txB.logs.find((log) => log.event === 'Approval'));
    assert.ok(txA.logs.find((log) => log.event === 'Approval'));
  });

  it('an order filled after its expiration date is rejected and logs an event', async () => {
    const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken,
      expiration, nonce);

    // fill order
    tx = await exchange.fill(
      makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken,
      expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
        from: takerAddress,
        gasLimit: web3.toHex(200000),
        gasPrice: web3.eth.gasPrice,
      },
    );

    assert.ok(tx.logs.find((log) => log.event === 'Failed'));
  });

  it('and does not affect the token balances', async () => {
    assert.equal((await tokenA.balanceOf(maker)).toNumber(), balancesBefore.A.maker, 'maker did not keep tokens');
    assert.equal((await tokenB.balanceOf(taker)).toNumber(), balancesBefore.B.taker, 'taker did not keep tokens');
  });
});
