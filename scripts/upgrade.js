// scripts/upgrade.js

const { ethers, upgrades } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading contracts with account:", deployer.address);

  // Get the proxy address
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS environment variable not set");
  }

  console.log("Upgrading proxy at address:", proxyAddress);

  // Deploy the new implementation
  const CivicTrustRegistryV2 = await ethers.getContractFactory("CivicTrustRegistryV2");
  console.log("Deploying new implementation...");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, CivicTrustRegistryV2);
  await upgraded.deployed();

  console.log("✅ Contract upgraded successfully!");
  console.log("New implementation deployed to:", upgraded.address);

  // Verify the upgrade
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(upgraded.address);
  console.log("Implementation address:", implementationAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 