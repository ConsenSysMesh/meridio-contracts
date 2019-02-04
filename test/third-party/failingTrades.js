const util = require('ethereumjs-util');
const ABI = require('ethereumjs-abi');
const sign = require('./util.js');
const isEVMException = require('../utils').isEVMException;


const Exchange = artifacts.require('./Exchange');
const TokenA = artifacts.require('./lib/helpers/TokenA');
const TokenB = artifacts.require('./lib/helpers/TokenB');

contract('Trades fail', (accounts) => {
  const maker = accounts[1];
  const taker = accounts[2];

  let exchange;
  let tokenA;
  let tokenB;

  // Save token balances for comparisons
  let balancesBefore = { A: { maker: 1000, taker: 0 }, B: { maker: 0, taker: 1000 } };

  // Order parameters.
  let makerToken;
  let takerToken;
  const makerAddress = maker;
  const makerAmount = 250;
  const takerAddress = taker;
  const takerAmount = 750;
  const time = 60000;
  const expiration = new Date().getTime() + time;
  const nonce = 1;

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

  describe('when the taker fails to approve', async () => {
    it('only the maker approving the exchange', async () => {
      tx = await tokenA.approve(exchange.address, makerAmount, { from: maker });
      assert.ok(tx.logs.find((log) => log.event === 'Approval'));
    });

    it('filling the order creates an EVM exception', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce);
      try {
        await exchange.fill(
          makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken,
          expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
            from: takerAddress,
            gasLimit: web3.toHex(200000),
            gasPrice: web3.eth.gasPrice,
          },
        );
      } catch (e) {
        assert.isTrue(isEVMException(e));
      }
    });

    it('the tokenBalances are the same as before the filling the order', async () => {
      assert.equal((await tokenA.balanceOf(maker)).toNumber(), balancesBefore.A.maker, 'maker did not keep tokens');
      assert.equal((await tokenB.balanceOf(taker)).toNumber(), balancesBefore.B.taker, 'taker did not keep tokens');
    });
  });

  describe('when the maker fails to approve', async () => {
    it('only the taker approves the exchange', async () => {
      tx = await tokenA.approve(exchange.address, 0, { from: maker });
      assert.ok(tx.logs.find((log) => log.event === 'Approval'));
      tx = await tokenB.approve(exchange.address, takerAmount, { from: taker });
      assert.ok(tx.logs.find((log) => log.event === 'Approval'));
    });

    it('filling the order creates an EVM exception', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce);
      try {
        await exchange.fill(
          makerAddress, makerAmount, makerToken,
          takerAddress, takerAmount, takerToken,
          expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
            from: takerAddress,
            gasLimit: web3.toHex(200000),
            gasPrice: web3.eth.gasPrice,
          },
        );
      } catch (e) {
        assert.isTrue(isEVMException(e));
      }
    });

    it('the tokenBalances are the same as before the filling the order', async () => {
      assert.equal((await tokenA.balanceOf(maker)).toNumber(), balancesBefore.A.maker, 'maker did not keep tokens');
      assert.equal((await tokenB.balanceOf(taker)).toNumber(), balancesBefore.B.taker, 'taker did not keep tokens');
    });
  });

  describe('when an order is being replayed', async () => {
    it('the second party approve the exchange', async () => {
      tx = await tokenA.approve(exchange.address, makerAmount, { from: maker });
      assert.ok(tx.logs.find((log) => log.event === 'Approval'));
    });

    it('the trade is executed and the balances are updated accordingly', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce);

      await exchange.fill(
        makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
          from: takerAddress,
          gasLimit: web3.toHex(200000),
          gasPrice: web3.eth.gasPrice,
        },
      );
      const bMakerAfter = (await tokenB.balanceOf(maker)).toNumber();
      const aTakerAfter = (await tokenA.balanceOf(taker)).toNumber();
      assert.equal(bMakerAfter, takerAmount, 'maker did not receive tokens');
      assert.equal(aTakerAfter, makerAmount, 'taker did not receive tokens');

      // update tokenBalances
      balancesBefore = { A: { maker: takerAmount, taker: aTakerAfter }, B: { maker: bMakerAfter, taker: makerAmount } };
    });

    it('the second try at executing the order fails and logs an event', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce);

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

  describe('when an order is expired', async () => {
    const expiredDate = 50;
    const nonce = 2;
    makerAmount2 = 20;
    takerAmount2 = 50;

    it('both sides approve each other', async () => {
      txB = await tokenB.approve(exchange.address, takerAmount2, { from: taker });
      txA = await tokenA.approve(exchange.address, makerAmount2, { from: maker });
      assert.ok(txB.logs.find((log) => log.event === 'Approval'));
      assert.ok(txA.logs.find((log) => log.event === 'Approval'));
    });

    it('an order filled after its expiration date is rejected and logs an event', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
        expiredDate, nonce);

      // fill order
      tx = await exchange.fill(
        makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
        expiredDate, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
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

  describe('when the maker cancels it before the taker fills it', async () => {
    const nonce = 3;

    it('the exchange marks it as filled and logs an event', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
        expiration, nonce);


      // fill order
      tx = await exchange.cancel(
        makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
        expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s),
        { from: makerAddress },
      );

      assert.ok(tx.logs.find((log) => log.event === 'Canceled'));
    });

    it('subsequent attempts to fill the order are rejected and log an event', async () => {
      const rpcSig = await sign.getSignature(makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
        expiration, nonce);

      // fill order
      tx = await exchange.fill(
        makerAddress, makerAmount2, makerToken,
        takerAddress, takerAmount2, takerToken,
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
});
