const util = require("ethereumjs-util");
const ABI = require('ethereumjs-abi');
var sign = require('./util.js');

const Exchange = artifacts.require("./Exchange");
const TokenA = artifacts.require("./lib/helpers/TokenA");
const TokenB = artifacts.require("./lib/helpers/TokenB");

contract('Orders expire', function(accounts) {

  let maker = accounts[0]
  let taker = accounts[1]

  let exchange;
  let tokenA;
  let tokenB;

  var balancesBefore = {A :{maker: 1000, taker: 0}, B: {maker:0, taker:1000}}

  // Order parameters.
  var makerToken;
  var takerToken;
  let makerAddress = maker;
  let makerAmount = 20;
  let takerAddress = taker;
  let takerAmount = 50;
  let time = 60000;
  let expiration = 50;
  let nonce = 2;

  it("the exchange contract is deployed and two users are funded with tokens", async () => {
    exchange = await Exchange.deployed()
    tokenA = await TokenA.deployed()
    makerToken = tokenA.address;
    await tokenA.create(maker, balancesBefore.A.maker)
    tokenB = await TokenB.deployed()
    takerToken = tokenB.address;
    await tokenB.create(taker, balancesBefore.B.taker)
    assert.equal((await tokenA.balanceOf(maker)).toNumber(), 1000, "maker did not get tokens")
    assert.equal((await tokenB.balanceOf(taker)).toNumber(), 1000, "taker did not get tokens")
  })


  it("both sides approve each other", async () => {
    txB = await tokenB.approve(exchange.address, takerAmount, {from:taker})
    txA = await tokenA.approve(exchange.address, makerAmount, {from:maker})
    assert.ok(txB.logs.find(function (log) {
      return log.event === 'Approval';}))
    assert.ok(txA.logs.find(function (log) {
      return log.event === 'Approval';}))
  })

  it("an order filled after its expiration date is rejected and logs an event", async () => {
    var rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
                                         takerAddress, takerAmount, takerToken,
                                         expiration, nonce)

    //fill order
    tx = await exchange.fill(
      makerAddress, makerAmount, makerToken,
      takerAddress, takerAmount, takerToken,
      expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
        from: takerAddress,
        gasLimit: web3.toHex(200000),
        gasPrice: web3.eth.gasPrice
      })

    assert.ok(tx.logs.find(function (log) {
      return log.event === 'Failed';
    }));

  })

  it ("and does not affect the token balances", async () => {
    assert.equal((await tokenA.balanceOf(maker)).toNumber(), balancesBefore.A.maker, "maker did not keep tokens")
    assert.equal((await tokenB.balanceOf(taker)).toNumber(), balancesBefore.B.taker, "taker did not keep tokens")
  })

})
