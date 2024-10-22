// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./FheOS.sol";
import "./IFHE.sol";

contract ConfidentialVoting {
    // FHE instance
    IFHE public fhe;
    
    // Proposal structure
    struct Proposal {
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        euint32 encryptedYesVotes;
        euint32 encryptedNoVotes;
    }

    // Mapping of proposal ID to Proposal
    mapping(uint256 => Proposal) public proposals;
    // Mapping of proposal ID to voter address to whether they voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    uint256 public proposalCount;
    
    event ProposalCreated(uint256 indexed proposalId, string title, uint256 startTime, uint256 endTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter);
    event ProposalFinalized(uint256 indexed proposalId, uint256 yesVotes, uint256 noVotes);

    constructor() {
        fhe = IFHE(address(FheOS));
    }

    function createProposal(
        string memory _title,
        string memory _description,
        uint256 _duration
    ) external {
        require(_duration > 0, "Duration must be positive");
        
        uint256 proposalId = proposalCount++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + _duration;
        
        proposals[proposalId] = Proposal({
            title: _title,
            description: _description,
            startTime: startTime,
            endTime: endTime,
            finalized: false,
            encryptedYesVotes: fhe.asEuint32(0),
            encryptedNoVotes: fhe.asEuint32(0)
        });
        
        emit ProposalCreated(proposalId, _title, startTime, endTime);
    }

    function castVote(uint256 _proposalId, ebool _vote) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.startTime, "Voting not started");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(!proposal.finalized, "Proposal already finalized");
        require(!hasVoted[_proposalId][msg.sender], "Already voted");

        // Convert vote to encrypted uint32
        euint32 encryptedVote = fhe.asEuint32(1);
        
        // Add vote to appropriate tally using FHE operations
        if (fhe.decrypt(_vote)) {
            proposal.encryptedYesVotes = fhe.add(proposal.encryptedYesVotes, encryptedVote);
        } else {
            proposal.encryptedNoVotes = fhe.add(proposal.encryptedNoVotes, encryptedVote);
        }

        hasVoted[_proposalId][msg.sender] = true;
        emit VoteCast(_proposalId, msg.sender);
    }

    function finalizeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.endTime, "Voting still ongoing");
        require(!proposal.finalized, "Already finalized");

        proposal.finalized = true;

        // Decrypt final tallies
        uint256 yesVotes = fhe.decrypt(proposal.encryptedYesVotes);
        uint256 noVotes = fhe.decrypt(proposal.encryptedNoVotes);

        emit ProposalFinalized(_proposalId, yesVotes, noVotes);
    }

    function getProposal(uint256 _proposalId) external view returns (
        string memory title,
        string memory description,
        uint256 startTime,
        uint256 endTime,
        bool finalized
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.title,
            proposal.description,
            proposal.startTime,
            proposal.endTime,
            proposal.finalized
        );
    }

    function getEncryptedTallies(uint256 _proposalId) external view returns (
        euint32 yesVotes,
        euint32 noVotes
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (proposal.encryptedYesVotes, proposal.encryptedNoVotes);
    }
}