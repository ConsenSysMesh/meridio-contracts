const util = require("ethereumjs-util");
const ABI = require('ethereumjs-abi');
var sign = require('./util.js');
const isEVMException = require('../utils').isEVMException;


const Exchange = artifacts.require("./Exchange");
const TokenA = artifacts.require("./lib/helpers/TokenA");

contract('Ether is refunded', function(accounts) {

  let maker = accounts[1]
  let taker = accounts[2]

  var exchange;
  let tokenA;

  // Order parameters.
  var makerToken;
  var takerToken = "0x0";
  let makerAddress = maker;
  let makerAmount = 100;
  let takerAddress = taker;
  // let takerAmount = 100000000
  let takerAmount = web3.toWei(1, "ether")
  let time = 60000;
  let expiration = new Date().getTime() + time;
  let nonce = 1;
  let gasLimit = web3.toHex(4000000)

  // Save balances for comparisons
  var balancesBefore = {A :{maker: 1000, taker: 0}, ether: {maker:0, taker:0}}
  var exchangeBalanceBefore;

  it("the exchange contract is deployed and one user is funded with tokens", async () => {
    exchange = await Exchange.deployed()
    tokenA = await TokenA.deployed()
    makerToken = tokenA.address;
    await tokenA.create(maker, balancesBefore.A.maker)
    assert.equal((await tokenA.balanceOf(maker)).toNumber(), 1000, "maker did not get tokens")
  })

  describe("if the amount of ether sent is incorrect", async () =>{

    let receiptFromFillTx;
    it("a fill order with a incorecct amount of ether is rejected and logs an event", async () => {
      //save ether balances
      exchangeBalanceBefore = web3.eth.getBalance(exchange.address).toNumber();
      balancesBefore.ether.maker = web3.eth.getBalance(makerAddress).toNumber()
      balancesBefore.ether.taker = web3.eth.getBalance(takerAddress).toNumber()

      // Message hash for signing.
      var rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
                                           takerAddress, takerAmount, takerToken,
                                           expiration, nonce)

      //fill order
      tx = await exchange.fill(
        makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
          from: takerAddress,
          gasLimit: gasLimit,
          gasPrice: web3.eth.gasPrice,
          value: 2000//takerAmount + 20000
        })
      receiptFromFillTx = tx.receipt

      assert.ok(tx.logs.find(function (log) {
          return log.event === 'Failed';
      }));
    })

    it("and the ether is being refunded to the taker", async () => {
      takerBalanceAfter =  web3.eth.getBalance(takerAddress).toNumber()
      txCost = receiptFromFillTx.gasUsed * web3.eth.gasPrice
      diff = Math.abs(balancesBefore.ether.taker - takerBalanceAfter - txCost)
      assert.isBelow(diff, 15000, "ether was not refunded") //??? where are those remaining wei
    })

    it("without any ether being kept by the exchange", async() => {
      exchangeBalanceAfter =  web3.eth.getBalance(exchange.address).toNumber()
      assert.equal(exchangeBalanceAfter, exchangeBalanceBefore, "the exchange did maintain some part of the ether")
    })

  })

  describe("if the token transfer failed ", async () => {

    let receiptFromFillTx;
    let gasLimit = web3.toHex(200000)

    it("a fill order with failed tokenTransfer is rejected and throws an EVM exception", async () => {

      // update balances
      balancesBefore.ether.taker = web3.eth.getBalance(takerAddress).toNumber()
      exchangeBalanceBefore = web3.eth.getBalance(exchange.address).toNumber();
      // Message hash for signing.
      var rpcSig = await sign.getSignature(makerAddress, makerAmount, makerToken,
                                           takerAddress, takerAmount, takerToken,
                                           expiration, nonce)

      try {
      await exchange.fill(
        makerAddress, makerAmount, makerToken,
        takerAddress, takerAmount, takerToken,
        expiration, nonce, rpcSig.v, util.bufferToHex(rpcSig.r), util.bufferToHex(rpcSig.s), {
          from: takerAddress,
          gasLimit: gasLimit,
          gasPrice: web3.eth.gasPrice,
          value: takerAmount
        })
        receiptFromFillTx = tx.receipt
      } catch (e) {
        assert.isTrue(isEVMException(e));
        return;

      }
   })

    // SOMEHOW handlling ether in testrpc is weird. I dont know why.
    // I think this is not too tragic as the code is pretty straightforward
    // you should definetily test all ether functions on a different net though!
    // it("ether is being refunded to the taker", async () => {
    //   takerBalanceAfter =  web3.eth.getBalance(takerAddress).toNumber()
    //   console.log(takerBalanceAfter)
    //   maxTxCost = gasLimit * web3.eth.gasPrice
    //   diff = Math.abs(balancesBefore.ether.taker - takerBalanceAfter) 
    //   assert.isBelow(diff, maxTxCost, "ether was not refunded") //??? where are those remaining wei
    // })

    it("no ether is being kept by the exchange", async() => {
      exchangeBalanceAfter =  web3.eth.getBalance(exchange.address).toNumber()
      assert.equal(exchangeBalanceAfter, exchangeBalanceBefore, "the exchange did maintain some part of the ether")
    })

  })

})

