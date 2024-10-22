import { ReownKit } from '@reownkit/core';
import { FhenixClient } from '@fhenixjs/sdk';
import { ethers } from 'ethers';
import ContractABI from './contracts/ConfidentialVoting.json';

class ConfidentialVoting {
  constructor() {
    this.reownKit = null;
    this.fhenixClient = null;
    this.provider = null;
    this.signer = null;
    this.walletAddress = null;
    this.contract = null;
    this.currentProposalId = 0; // For demo, we'll use proposal ID 0
    
    // Contract address from deployment
    this.contractAddress = 'YOUR_DEPLOYED_CONTRACT_ADDRESS'; // Replace after deployment
    
    this.initializeUI();
  }

  async initializeUI() {
    const connectButton = document.getElementById('connectWallet');
    connectButton.addEventListener('click', () => this.connectWallet());

    document.querySelectorAll('.vote-btn').forEach(button => {
      button.addEventListener('click', (e) => this.handleVote(e.target.dataset.vote));
    });
  }

  async connectWallet() {
    try {
      // Initialize ReownKit
      this.reownKit = new ReownKit({
        projectId: 'YOUR_PROJECT_ID', // Replace with actual WalletConnect project ID
        chains: ['fhenix-testnet']
      });

      // Connect wallet
      const { provider, signer } = await this.reownKit.connectWallet();
      this.provider = provider;
      this.signer = signer;
      
      // Get wallet address
      this.walletAddress = await this.signer.getAddress();
      document.getElementById('walletAddress').textContent = 
        `${this.walletAddress.slice(0, 6)}...${this.walletAddress.slice(-4)}`;

      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        ContractABI.abi,
        this.signer
      );

      // Initialize Fhenix client
      this.fhenixClient = await FhenixClient.init({
        provider: this.provider,
        signer: this.signer
      });

      // Show voting section
      document.getElementById('votingSection').classList.remove('hidden');
      
      // Load current proposal
      await this.loadProposal();
      
      // Start polling for results
      this.pollResults();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  }

  async loadProposal() {
    try {
      const proposal = await this.contract.getProposal(this.currentProposalId);
      
      document.getElementById('proposalTitle').textContent = proposal.title;
      document.getElementById('proposalDescription').textContent = proposal.description;
      
      // Check if user has already voted
      const hasVoted = await this.contract.hasVoted(this.currentProposalId, this.walletAddress);
      if (hasVoted) {
        document.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
        document.getElementById('votingOptions').insertAdjacentHTML('beforeend', 
          '<p>You have already voted on this proposal.</p>');
      }
      
      // Show results section
      document.getElementById('results').classList.remove('hidden');
      await this.updateResults();
    } catch (error) {
      console.error('Error loading proposal:', error);
      alert('Failed to load proposal details. Please try again.');
    }
  }

  async handleVote(vote) {
    if (!this.fhenixClient || !this.walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Create encrypted vote using FHE
      const encryptedVote = await this.fhenixClient.encrypt(vote === 'yes');
      
      // Send transaction to cast vote
      const tx = await this.contract.castVote(this.currentProposalId, encryptedVote);
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Update UI
      document.querySelectorAll('.vote-btn').forEach(btn => btn.disabled = true);
      document.getElementById('votingOptions').insertAdjacentHTML('beforeend', 
        '<p>Vote cast successfully! The results are encrypted and private.</p>');
      
      await this.updateResults();
    } catch (error) {
      console.error('Error casting vote:', error);
      alert('Failed to cast vote. Please try again.');
    }
  }

  async updateResults() {
    try {
      const { yesVotes, noVotes } = await this.contract.getEncryptedTallies(this.currentProposalId);
      
      document.getElementById('encryptedResults').innerHTML = `
        <p>Current Encrypted Tallies:</p>
        <p>Yes votes: ${this.formatEncryptedValue(yesVotes)}</p>
        <p>No votes: ${this.formatEncryptedValue(noVotes)}</p>
        <p><em>Note: Values are encrypted to protect voter privacy</em></p>
      `;
    } catch (error) {
      console.error('Error updating results:', error);
    }
  }

  formatEncryptedValue(encryptedValue) {
    // Format the encrypted bytes for display
    return `${encryptedValue.slice(0, 10)}...${encryptedValue.slice(-8)}`;
  }

  async pollResults() {
    // Poll for updated results every 30 seconds
    setInterval(async () => {
      await this.updateResults();
    }, 30000);
  }
}

// Initialize the application
const app = new ConfidentialVoting();