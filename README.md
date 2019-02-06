# Meridio Contracts

[ConsenSys Diligence Audit Report from October 5, 2018](https://github.com/MeridioRE/meridio-report)

This repo represents the contracts that make up the Meridio Asset Token ecosystem.

For more information about Meridio, visit [Meridio.co](https://meridio.co)

This repo is setup to use [Truffle](https://truffleframework.com/), so you can run standard commands:
- `truffle test`
- `truffle migrate`
- `truffle compile`

Other Commands that are available:
- `npm run coverage` - Generates the Solidity Test Coverage report
- `npm run test` - Runs truffle test suite
- `npm run hint` - Generates solhint report
- `npm run myth` - Recompiles contracts and runs Mythril for Truffle

Environment Variables:
- `INFURA_KEY` - (Legacy) Infura ID for connecting to infura rinkeby node 
- `MNEMONIC_PHRASE` - mnemonic phrase to give access to the wallet for launching on Rinkeby
  