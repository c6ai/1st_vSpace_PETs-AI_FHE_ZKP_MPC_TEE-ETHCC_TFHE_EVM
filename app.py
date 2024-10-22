from flask import Flask, jsonify, request
from flask_cors import CORS
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize Web3 with Fhenix testnet
w3 = Web3(Web3.HTTPProvider(os.getenv('FHENIX_RPC_URL')))

@app.route('/api/proposal', methods=['GET'])
def get_proposal():
    # In a real application, this would fetch from a database
    return jsonify({
        'title': 'Community Governance Proposal #1',
        'description': 'Should we implement feature X in the next release?',
        'status': 'active'
    })

@app.route('/api/vote', methods=['POST'])
def submit_vote():
    data = request.json
    encrypted_vote = data.get('encryptedVote')
    voter_address = data.get('voterAddress')
    
    # In a real application, you would:
    # 1. Verify the voter hasn't voted before
    # 2. Store the encrypted vote
    # 3. Update the encrypted tally
    
    return jsonify({
        'success': True,
        'message': 'Vote recorded successfully'
    })

@app.route('/api/results', methods=['GET'])
def get_results():
    # In a real application, this would return encrypted results
    return jsonify({
        'encryptedTally': 'encrypted_data_here',
        'votingEnded': False
    })

if __name__ == '__main__':
    app.run(debug=True)