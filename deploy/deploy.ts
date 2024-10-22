import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Confidential Voting contract...");

  const ConfidentialVoting = await ethers.getContractFactory("ConfidentialVoting");
  const voting = await ConfidentialVoting.deploy();

  await voting.deployed();

  console.log(`ConfidentialVoting deployed to: ${voting.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });