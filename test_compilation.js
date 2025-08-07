const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing contract compilation...");

  // Test EDAITradingEngine
  const EDAITradingEngine = await ethers.getContractFactory("EDAITradingEngine");
  console.log("✅ EDAITradingEngine compiles successfully");

  // Test EDAILiquidityPool
  const EDAILiquidityPool = await ethers.getContractFactory("EDAILiquidityPool");
  console.log("✅ EDAILiquidityPool compiles successfully");

  // Test EDAISecuritiesCompliance
  const EDAISecuritiesCompliance = await ethers.getContractFactory("EDAISecuritiesCompliance");
  console.log("✅ EDAISecuritiesCompliance compiles successfully");

  // Test EDAIMarketData
  const EDAIMarketData = await ethers.getContractFactory("EDAIMarketData");
  console.log("✅ EDAIMarketData compiles successfully");

  // Test EDAISecuritiesTrading
  const EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
  console.log("✅ EDAISecuritiesTrading compiles successfully");

  console.log("🎉 All contracts compile successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 