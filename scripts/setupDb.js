const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { fromEnv } = require("@aws-sdk/credential-providers");
require('dotenv').config();

const dynamodb = new DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: fromEnv()
});

async function createTables() {
  // Create the donor network table
  const donorTableParams = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    KeySchema: [
      { AttributeName: 'address', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'address', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  // Create the metadata table
  const metadataTableParams = {
    TableName: process.env.METADATA_TABLE_NAME,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    console.log('Creating donor network table...');
    await dynamodb.createTable(donorTableParams);
    console.log('Donor network table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('Donor network table already exists');
    } else {
      console.error('Error creating donor network table:', error);
      throw error;
    }
  }

  try {
    console.log('Creating metadata table...');
    await dynamodb.createTable(metadataTableParams);
    console.log('Metadata table created successfully');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('Metadata table already exists');
    } else {
      console.error('Error creating metadata table:', error);
      throw error;
    }
  }
}

// First verify AWS credentials
async function verifyCredentials() {
  try {
    console.log('Verifying AWS credentials...');
    await dynamodb.listTables({});
    console.log('AWS credentials verified successfully');
    return true;
  } catch (error) {
    console.error('AWS credentials verification failed:', error.message);
    console.log('\nPlease ensure your .env file contains:');
    console.log('AWS_REGION=your-region');
    console.log('AWS_ACCESS_KEY_ID=your-access-key');
    console.log('AWS_SECRET_ACCESS_KEY=your-secret-key');
    return false;
  }
}

(async () => {
  try {
    if (await verifyCredentials()) {
      await createTables();
      console.log('Setup complete');
    }
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
})(); 