# Meridio Contracts

[ConsenSys Diligence Audit Report from October 5, 2018](https://github.com/MeridioRE/meridio-report)

This repo represents the contracts that make up the Meridio Asset Token ecosystem.

For more information about Meridio, visit [Meridio.co](https://meridio.co)

## Setup

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

## Contract Descriptions

### Third Party contracts

#### `mocks/FakeDai.sol`

This is a copy of the Dai contract that Meridio uses in its test environments to mock interactions with Mainnet Dai.

#### `third-party/Exchange.sol`

This is a copy of the Airswap Exchange contract that Meridio uses for P2P swaps between AssetTokens and Dai.

### Token

#### `AssetToken.sol`

This is a modified ERC20 that represents the core of the Meridio token ecosystem. It has modules on it to validate transfers and is used to track the tokens for each asset in the Meridio system. It will be launched as a Singleton and each Token in the system will be a proxy that references this implementation. When deploying the singleton, the deployer should ensure that the implementation gets initialized.  The ProxyTokenFactory is recommended for launching new individual tokens as that will initialize them in the initial transaction.
Key Modifications to ERC20 standard:

- Adding `canSend` checks before allowing `transfer`, `transferFrom`, `forceTransfer` functions to run
- Adding `forceTranfer` function to allow the owner to move tokens from one address to another in compliance with the `canSend` parameters.
- Allowing owner to `mint`/`burn` to/from any address
- Allow owner to `addModule`/`removeModule` to control the parameters of `canSend`

Inheritance Chain: `openzeppelin/MintableToken`, `openzeppelin/BurnableToken`, `Moduleable.sol`

### Proxy

#### `proxy/OwnedUpgradeabilityProxy.sol`

This contract combines an upgradeability proxy with basic authorization control functionalities
Source https://github.com/zeppelinos/labs/blob/master/upgradeability_using_unstructured_storage/contracts/OwnedUpgradeabilityProxy.sol
Interface Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-897.md
Implementation notes:

- constructors will not work, the proxied contract must be initialized after proxying.  That is what the upgradeToAndCall function is for.
- if you do not inherit your version n-1 into version n, you will overwrite memory slots with the new contract.
- if you inherit version n-1 into version n, you will preserve memory slots including the _initialized flag.
- Therefore each new contract that needs to be initialized should have its own _initialized flag and function.
- ProxyOwner can change implementation reference and reassign ownership (of the proxy)

Inheritance Chain: `UpgradeabilityProxy`>`Proxy`>`ERCProxy`

### Factories

#### `factories/ProxyTokenFactory.sol`

This singleton launches a new proxy contract and points it to the implementation it is given. It then assigns ownership of the Token (impl) and the Proxy to the `msg.sender`

Inheritance Chain: `openzeppelin/TokenDestructible`, `openzeppelin/Pausable`
_Note: Imports `OwnedUpgradeabilityProxy.sol` as `ProxyToken`_

### Modules

#### `modules/BlacklistValidator.sol`

#### `modules/InvestorCapValidator.sol`

#### `modules/InvestorMinValidator.sol`

#### `modules/LockUpPeriodValidator.sol`

#### `modules/MaxAmountValidator.sol`

#### `modules/PausableValidator.sol`

#### `modules/SenderBlacklistValidator.sol`

#### `modules/SenderWhitelistValidator.sol`

#### `modules/WhitelistValidator.sol`


### Other

#### `DistributionIssuer.sol`

This is a singleton contract that allows anyone to send many ERC20 compliant token transfers of various amounts to various payees. The sender must have approved the contract to `transferFrom` on its behalf beforehand.

#### `MeridioCrowdsale.sol`

This is a crowdsale contract based on openzeppelin contracts. It allows for the purchasing of AssetTokens with ETH via `transferFrom` function. It has a conversion `rate` and `openingTime`/`closingTime`. The Owner can update the Rate as needed to adjust for price fluxuations in ETH.

Inheritance Chain: `openzeppelin/AllowanceCrowdsale`, `openzeppelin/TimedCrowdsale`, `openzeppelin/TokenDestructible`, `openzeppelin/Pausable`

#### `SimpleLinkRegistry.sol`

This is a singleton contract that allows anyone to add key/value pairs to any “subject” smart contract address. The keys are meant to be simple identifiers, and the value is a string intended to be a link to HTTP or IPFS accessible data.

Inheritance Chain: `openzeppelin/Ownable`

### System Diagrams

On-chain System Diagram

ProxyToken System Diagram
