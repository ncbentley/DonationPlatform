const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { fromEnv } = require("@aws-sdk/credential-providers");

// Initialize DynamoDB
const dynamodb = DynamoDBDocument.from(new DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: fromEnv()
}));

export default async function handler(req, res) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    // Scan the table to get all users
    // In production, you might want to use a more efficient query with a GSI on the sponsor field
    const { Items } = await dynamodb.scan({
      TableName: process.env.DYNAMODB_TABLE_NAME
    });

    if (!Items) {
      return res.status(200).json([]);
    }

    // Filter and process the data
    const network = buildNetwork(Items, address.toLowerCase());
    
    return res.status(200).json(network);
  } catch (error) {
    console.error('Error fetching referral tree:', error);
    return res.status(500).json({ error: 'Failed to fetch referral tree' });
  }
}

function buildNetwork(items, rootAddress, visited = new Set()) {
  // Prevent infinite loops from circular references
  if (visited.has(rootAddress)) {
    return [];
  }
  visited.add(rootAddress);

  // Find all direct referrals
  const directReferrals = items.filter(item => 
    item.sponsor && item.sponsor.toLowerCase() === rootAddress
  );

  // Process each referral
  const network = directReferrals.map(referral => {
    // Recursively get children
    const children = buildNetwork(items, referral.address.toLowerCase(), visited);

    return {
      address: referral.address,
      sponsor: referral.sponsor,
      donation: referral.donation,
      isReferrer: referral.isReferrer,
      startTime: referral.startTime,
      totalWithdrawn: referral.totalWithdrawn,
      commissionsEarned: referral.commissionsEarned,
      children
    };
  });

  return network;
} 