const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing contract compilation...");

  // Test EDAITradingEngine
  console.log("Testing EDAITradingEngine...");
  const EDAITradingEngine = await ethers.getContractFactory("EDAITradingEngine");
  console.log("✅ EDAITradingEngine compiles");

  // Test EDAILiquidityPool
  console.log("Testing EDAILiquidityPool...");
  const EDAILiquidityPool = await ethers.getContractFactory("EDAILiquidityPool");
  console.log("✅ EDAILiquidityPool compiles");

  // Test EDAISecuritiesCompliance
  console.log("Testing EDAISecuritiesCompliance...");
  const EDAISecuritiesCompliance = await ethers.getContractFactory("EDAISecuritiesCompliance");
  console.log("✅ EDAISecuritiesCompliance compiles");

  // Test EDAIMarketData
  console.log("Testing EDAIMarketData...");
  const EDAIMarketData = await ethers.getContractFactory("EDAIMarketData");
  console.log("✅ EDAIMarketData compiles");

  // Test EDAISecuritiesTrading
  console.log("Testing EDAISecuritiesTrading...");
  const EDAISecuritiesTrading = await ethers.getContractFactory("EDAISecuritiesTrading");
  console.log("✅ EDAISecuritiesTrading compiles");

  console.log("🎉 All contracts compile successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 