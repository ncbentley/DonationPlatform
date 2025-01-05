const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const Web3 = require('web3');

// Contract ABI (copy the relevant parts from your contract ABI)
const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "donor",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "sponsor",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "DonationMade",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "referrer",
                "type": "address"
            }
        ],
        "name": "ReferrerActivated",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getUserDetails",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "duration",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "lastPayoutTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "payoutsClaimed",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "totalWithdrawn",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "referrers",
        "outputs": [
            {
                "internalType": "bool",
                "name": "isActive",
                "type": "bool"
            },
            {
                "internalType": "uint256",
                "name": "commissionEarned",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "commissionPaid",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

// Initialize DynamoDB
const dynamodb = DynamoDBDocument.from(new DynamoDB({
  region: 'us-east-2'
}));

// Initialize Web3 with HTTP provider for querying past events
console.log('Using Web3 provider URL:', process.env.WEB3_PROVIDER_URL);
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_PROVIDER_URL));
const contract = new web3.eth.Contract(contractABI, process.env.CONTRACT_ADDRESS);

console.log('Contract address:', process.env.CONTRACT_ADDRESS);

const BLOCK_CHUNK_SIZE = 200;
const METADATA_TABLE = process.env.METADATA_TABLE_NAME;
const DONOR_TABLE = process.env.DYNAMODB_TABLE_NAME;
const RETRY_DELAY = 500;
const MAX_RETRIES = 3;
const PARALLEL_BATCH_SIZE = 5;

// Helper function to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry failed requests
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('exceeded its compute units') && i < retries - 1) {
        console.log(`Rate limited, attempt ${i + 1}/${retries}. Waiting ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        continue;
      }
      throw error;
    }
  }
}

async function getLastProcessedBlock() {
  try {
    console.log('Getting last processed block from table:', METADATA_TABLE);
    const result = await dynamodb.get({
      TableName: METADATA_TABLE,
      Key: { id: 'last_processed_block' }
    });
    
    console.log('DynamoDB get result:', JSON.stringify(result, null, 2));
    
    if (result.Item) {
      console.log('Found last processed block:', result.Item.blockNumber);
      return parseInt(result.Item.blockNumber);
    }
    
    console.log('No last processed block found, checking for existing data...');
    // If no last processed block is found, check if there's any existing data
    const donorScan = await dynamodb.scan({
      TableName: DONOR_TABLE,
      Limit: 1
    });

    console.log('Donor table scan result:', JSON.stringify(donorScan, null, 2));

    if (donorScan.Items && donorScan.Items.length > 0) {
      // If we have existing data but no last processed block,
      // we should start from the current block to avoid reprocessing
      const currentBlock = await withRetry(() => web3.eth.getBlockNumber());
      console.log('Found existing data but no last block. Starting from current block:', currentBlock);
      await updateLastProcessedBlock(currentBlock);
      return currentBlock;
    }

    // If no data exists, start from the configured starting block
    const startingBlock = parseInt(process.env.STARTING_BLOCK || '0');
    console.log('No existing data found. Starting from configured block:', startingBlock);
    return startingBlock;
  } catch (error) {
    console.error('Error getting last processed block:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // In case of error, safely start from the configured starting block
    const startingBlock = parseInt(process.env.STARTING_BLOCK || '0');
    console.log('Using fallback starting block:', startingBlock);
    return startingBlock;
  }
}

async function updateLastProcessedBlock(blockNumber) {
  try {
    await dynamodb.put({
      TableName: METADATA_TABLE,
      Item: {
        id: 'last_processed_block',
        blockNumber: blockNumber.toString()
      }
    });
  } catch (error) {
    console.error('Error updating last processed block:', error);
  }
}

async function processEvents(fromBlock, toBlock) {
  try {
    // Get all relevant events with retry logic
    const [donationEvents, referrerEvents] = await Promise.all([
      withRetry(() => contract.getPastEvents('DonationMade', { fromBlock, toBlock })),
      withRetry(() => contract.getPastEvents('ReferrerActivated', { fromBlock, toBlock }))
    ]);

    // Process donation events in parallel batches
    for (let i = 0; i < donationEvents.length; i += PARALLEL_BATCH_SIZE) {
      const batch = donationEvents.slice(i, i + PARALLEL_BATCH_SIZE);
      await Promise.all(batch.map(async (event) => {
        const { donor, sponsor, amount } = event.returnValues;
        const [userDetails, referrerData] = await Promise.all([
          withRetry(() => contract.methods.getUserDetails().call({ from: donor })),
          withRetry(() => contract.methods.referrers(donor).call())
        ]);

        await dynamodb.put({
          TableName: DONOR_TABLE,
          Item: {
            address: donor.toLowerCase(),
            sponsor: sponsor.toLowerCase(),
            donation: parseInt(amount) / 10**18,
            isReferrer: referrerData.isActive,
            totalWithdrawn: parseInt(userDetails.totalWithdrawn) / 10**18,
            commissionsEarned: parseInt(referrerData.commissionEarned) / 10**18,
            startTime: parseInt(userDetails[2]) * 1000
          }
        });
      }));
    }

    // Process referrer events in parallel batches
    for (let i = 0; i < referrerEvents.length; i += PARALLEL_BATCH_SIZE) {
      const batch = referrerEvents.slice(i, i + PARALLEL_BATCH_SIZE);
      await Promise.all(batch.map(async (event) => {
        const { referrer } = event.returnValues;
        const referrerData = await withRetry(() => contract.methods.referrers(referrer).call());
        
        await dynamodb.update({
          TableName: DONOR_TABLE,
          Key: { address: referrer.toLowerCase() },
          UpdateExpression: 'SET isReferrer = :isReferrer',
          ExpressionAttributeValues: {
            ':isReferrer': true
          }
        });
      }));
    }

    return donationEvents.length + referrerEvents.length;
  } catch (error) {
    console.error('Error processing events:', error);
    throw error;
  }
}

exports.handler = async (event) => {
  try {
    console.log('Starting Lambda execution...');
    
    // Test Web3 connection with retry
    const blockNumber = await withRetry(() => web3.eth.getBlockNumber());
    console.log('Successfully connected to Web3. Current block:', blockNumber);

    const currentBlock = await withRetry(() => web3.eth.getBlockNumber());
    const lastProcessedBlock = await getLastProcessedBlock();
    let processedEvents = 0;

    // Process events in chunks with delay between chunks
    for (let fromBlock = lastProcessedBlock + 1; fromBlock <= currentBlock; fromBlock += BLOCK_CHUNK_SIZE) {
      const toBlock = Math.min(fromBlock + BLOCK_CHUNK_SIZE - 1, currentBlock);
      console.log(`Processing blocks ${fromBlock} to ${toBlock}`);
      const eventsProcessed = await processEvents(fromBlock, toBlock);
      processedEvents += eventsProcessed;
      await updateLastProcessedBlock(toBlock);
      
      // Add delay between chunks to avoid rate limiting
      if (fromBlock + BLOCK_CHUNK_SIZE <= currentBlock) {
        console.log('Waiting between chunks to avoid rate limiting...');
        await sleep(RETRY_DELAY);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed events',
        processedEvents,
        fromBlock: lastProcessedBlock + 1,
        toBlock: currentBlock
      })
    };
  } catch (error) {
    console.error('Error in lambda handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing events',
        error: error.message
      })
    };
  } finally {
    // Close the WebSocket connection
    web3.currentProvider.disconnect();
  }
}; 