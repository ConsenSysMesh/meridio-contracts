const util = require('ethereumjs-util');
const ABI = require('ethereumjs-abi');
const sign = require('./util.js');

const Exchange = artifacts.require('./Exchange');
const TokenA = artifacts.require('./lib/helpers/TokenA');

contract('Tokens are exchanged for ether', (accounts) => {
  const maker = accounts[1];
  const taker = accounts[2];

  let exchange;
  let tokenA;

  // Order parameters.
  let makerToken;
  const takerToken = '0x0';
  const makerAddress = maker;
  const makerAmount = 100;
  const takerAddress = taker;
  const takerAmount = 100000000;
  const time = 60000;
  const expiration = new Date().getTime() + time;
  const nonce = 1;

  // Save balances for comparisons
  const balancesBefore = { A: { maker: 1000, taker: 0 }, ether: { maker: 0, taker: 0 } };
  let exchangeBalanceBefore;

  describe('', async () => {
    it('the exchange contract is deployed and one user is funded with tokens', async () => {
      exchange = await Exchange.deployed();
      tokenA = await TokenA.deployed();
      makerToken = tokenA.address;
      await tokenA.create(maker, balancesBefore.A.maker);
      assert.equal((await tokenA.balanceOf(maker)).toNumber(), 1000, 'maker did not get tokens');
    });

    it('the second party approves the exchange', async () => {
      tx = await tokenA.approve(exchange.address, makerAmount, { from: maker });
      assert.ok(tx.logs.find((log) => log.event === 'Approval'));
    });

    let receiptFromFillTx;

    it('the exchange effectuates the exchange and logs an event', async () => {
      // save ether balances
      balancesBefore.ether.maker = web3.eth.getBalance(makerAddress);
      balancesBefore.ether.taker = web3.eth.getBalance(takerAddress);
      exchangeBalanceBefore = web3.eth.getBalance(exchange.address);

      // Message hash for signing.
      const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce);

      // fill order
      tx = await exchange.fill(
        makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
          from: takerAddress,
          gasLimit: web3.toHex(20000),
          gasPrice: web3.eth.gasPrice,
          value: takerAmount,
        },
      );
      receiptFromFillTx = tx.receipt;
      assert.ok(tx.logs.find((log) => log.event === 'Filled'));
    });

    it('tokens are transfered to the taker', async () => {
      takerBalanceAfter = (await tokenA.balanceOf.call(takerAddress)).toNumber();
      assert.equal(takerBalanceAfter, balancesBefore.A.taker + makerAmount);
    });


    it('and the ether is being transfered to the maker', async () => {
      makerBalanceAfter = web3.eth.getBalance(makerAddress);
      assert.equal(makerBalanceAfter.toNumber(), balancesBefore.ether.maker.plus(takerAmount).toNumber());
    });

    it('without any ether being kept by the exchange', async () => {
      exchangeBalanceAfter = web3.eth.getBalance(exchange.address);
      assert.equal(exchangeBalanceAfter.toNumber(), exchangeBalanceBefore.toNumber(), 'the exchange did maintain some part of the ether');
    });
  });
});
