// monitoring/health-check.js

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function healthCheck() {
  console.log("🔍 Starting health check...");
  
  try {
    // Check if contracts are compiled
    const artifactsPath = path.join(__dirname, "../artifacts");
    if (!fs.existsSync(artifactsPath)) {
      throw new Error("Contracts not compiled. Run 'npm run compile' first.");
    }
    
    // Check if .env file exists
    const envPath = path.join(__dirname, "../.env");
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️  .env file not found. Using default configuration.");
    }
    
    // Check network connectivity
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // Check if we have a signer
    const [signer] = await ethers.getSigners();
    if (!signer) {
      throw new Error("No signer available");
    }
    
    const balance = await signer.getBalance();
    console.log(`✅ Signer balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    // Check if contracts are deployed (if address is provided)
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (contractAddress) {
      try {
        const contract = await ethers.getContractAt("CivicTrustRegistry", contractAddress);
        const owner = await contract.owner();
        console.log(`✅ Contract deployed at: ${contractAddress}`);
        console.log(`✅ Contract owner: ${owner}`);
      } catch (error) {
        console.warn(`⚠️  Could not connect to contract at ${contractAddress}: ${error.message}`);
      }
    }
    
    console.log("✅ Health check completed successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

// Run health check if called directly
if (require.main === module) {
  healthCheck()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Health check error:", error);
      process.exit(1);
    });
}

module.exports = { healthCheck }; 