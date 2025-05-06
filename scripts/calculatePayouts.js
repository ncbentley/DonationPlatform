const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityClient } = require("@aws-sdk/client-cognito-identity");
const { fromCognitoIdentityPool } = require("@aws-sdk/credential-provider-cognito-identity");

// Load environment variables from the root .env file
console.log(path.resolve(__dirname, '../.env'))
require('dotenv').config({ path: path.resolve(__dirname, './.env') });

// Load contract ABI and address from the deployment files
const contractABI = require('../src/assets/abi/InvestmentPlatform.json');
const contractAddress = process.env.CONTRACT_ADDRESS;

// Commission structure for each level
const COMMISSION_LEVELS = {
  1: 0.35, // 35% for level 1 (direct referrals)
  2: 0.15, // 15% for level 2
  3: 0.15, // 15% for level 3
  4: 0.35  // 35% for level 4
};

// Initialize DynamoDB
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME;

// Debug environment variables (remove in production)
console.log('Checking environment variables...');
if (!AWS_REGION || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !TABLE_NAME || !contractAddress) {
  console.error('Missing required environment variables. Please check your .env file.');
  process.exit(1);
}

// Initialize DynamoDB client with credentials
const dynamodb = DynamoDBDocument.from(new DynamoDB({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
}));

// Function to save data in CSV format
function saveToCSV(data, referralNetwork) {
  // Create daily summary CSV
  let csvContent = 'Date,Level 1 Commission ($),Level 2 Commission ($),Level 3 Commission ($),Level 4 Commission ($),Total Commission ($)\n';
  
  // Get all dates from commissionsByLevel
  const allDates = new Set();
  if (data.commissionsByLevel) {
    Object.values(data.commissionsByLevel).forEach(levelData => {
      Object.keys(levelData).forEach(date => allDates.add(date));
    });
  }
  const sortedDates = Array.from(allDates).sort();
  
  for (const date of sortedDates) {
    const level1 = data.commissionsByLevel?.[1]?.[date] || 0;
    const level2 = data.commissionsByLevel?.[2]?.[date] || 0;
    const level3 = data.commissionsByLevel?.[3]?.[date] || 0;
    const level4 = data.commissionsByLevel?.[4]?.[date] || 0;
    const totalCommission = level1 + level2 + level3 + level4;
    
    csvContent += `${date},${level1.toFixed(2)},${level2.toFixed(2)},${level3.toFixed(2)},${level4.toFixed(2)},${totalCommission.toFixed(2)}\n`;
  }
  
  // Add totals
  const totalLevel1 = data.totals?.byLevel?.[1] || 0;
  const totalLevel2 = data.totals?.byLevel?.[2] || 0;
  const totalLevel3 = data.totals?.byLevel?.[3] || 0;
  const totalLevel4 = data.totals?.byLevel?.[4] || 0;
  const grandTotal = data.totals?.total || 0;
  
  csvContent += `\nTOTALS,${totalLevel1.toFixed(2)},${totalLevel2.toFixed(2)},${totalLevel3.toFixed(2)},${totalLevel4.toFixed(2)},${grandTotal.toFixed(2)}\n`;
  
  fs.writeFileSync(
    path.join(__dirname, 'commission-schedule.csv'),
    csvContent
  );

  // Create referral network breakdown CSV if network data exists
  if (referralNetwork) {
    let referralCsvContent = 'Level,User Address,Sponsor,Amount ($),Plan (Months),Start Date\n';
    
    for (const level in referralNetwork) {
      for (const detail of referralNetwork[level]) {
        referralCsvContent += `${level},${detail.address},${detail.sponsor},${detail.amount},${detail.planMonths},${new Date(detail.startDate).toISOString().split('T')[0]}\n`;
      }
    }

    fs.writeFileSync(
      path.join(__dirname, 'referral-network.csv'),
      referralCsvContent
    );
  }
}

async function getAllItems() {
  let items = [];
  let lastEvaluatedKey = null;

  do {
    const params = {
      TableName: TABLE_NAME,
      Limit: 100
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const response = await dynamodb.scan(params);
      items = items.concat(response.Items || []);
      lastEvaluatedKey = response.LastEvaluatedKey;
    } catch (error) {
      console.error('Error fetching data:', error);
      break;
    }
  } while (lastEvaluatedKey);

  return items;
}

// Calculate all payouts for a single user based on their plan
function calculateUserPayouts(amount, planMonths, level, startDate) {
  const payouts = [];
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const MS_PER_MONTH = 30 * MS_PER_DAY;
  const THREE_YEARS = 3 * 365 * MS_PER_DAY;
  
  // Calculate total commission based on deposit amount and plan
  const totalCommission = amount * (planMonths === 12 ? 0.50 : 0.25);
  // Calculate level's share of the commission
  const levelCommission = totalCommission * COMMISSION_LEVELS[level];
  
  // Ensure we have a valid start date
  const userStartDate = new Date(startDate);
  const endDate = new Date(userStartDate.getTime() + THREE_YEARS);

  switch(planMonths) {
    case 4: {
      // Initial payouts (50% every 4 months, 3 times)
      for (let i = 1; i <= 3; i++) {
        const payoutDate = new Date(userStartDate.getTime() + (i * 4 * MS_PER_MONTH));
        if (payoutDate.getTime() <= endDate.getTime()) {
          payouts.push({
            date: payoutDate.toISOString().split('T')[0],
            amount: amount * 0.5,
            commission: levelCommission, // Same commission on each payout
            level
          });
        }
      }
      
      // Monthly payouts (30% for remaining months)
      const monthlyStart = new Date(userStartDate.getTime() + (12 * MS_PER_MONTH));
      let currentDate = monthlyStart;
      while (currentDate.getTime() <= endDate.getTime()) {
        payouts.push({
          date: currentDate.toISOString().split('T')[0],
          amount: amount * 0.30,
          commission: levelCommission, // Same commission on each payout
          level
        });
        currentDate = new Date(currentDate.getTime() + MS_PER_MONTH);
      }
      break;
    }
    case 6: {
      // Initial payouts (75% every 6 months, 2 times)
      for (let i = 1; i <= 2; i++) {
        const payoutDate = new Date(userStartDate.getTime() + (i * 6 * MS_PER_MONTH));
        if (payoutDate.getTime() <= endDate.getTime()) {
          payouts.push({
            date: payoutDate.toISOString().split('T')[0],
            amount: amount * 0.75,
            commission: levelCommission, // Same commission on each payout
            level
          });
        }
      }
      
      // Monthly payouts (45% for remaining months)
      const monthlyStart = new Date(userStartDate.getTime() + (12 * MS_PER_MONTH));
      let currentDate = monthlyStart;
      while (currentDate.getTime() <= endDate.getTime()) {
        payouts.push({
          date: currentDate.toISOString().split('T')[0],
          amount: amount * 0.45,
          commission: levelCommission, // Same commission on each payout
          level
        });
        currentDate = new Date(currentDate.getTime() + MS_PER_MONTH);
      }
      break;
    }
    case 12: {
      // Initial payout (150% at 12 months)
      const initialPayoutDate = new Date(userStartDate.getTime() + (12 * MS_PER_MONTH));
      if (initialPayoutDate.getTime() <= endDate.getTime()) {
        payouts.push({
          date: initialPayoutDate.toISOString().split('T')[0],
          amount: amount * 1.5,
          commission: levelCommission, // Same commission on each payout
          level
        });
      }
      
      // Monthly payouts (60% for remaining months)
      const monthlyStart = new Date(userStartDate.getTime() + (12 * MS_PER_MONTH));
      let currentDate = monthlyStart;
      while (currentDate.getTime() <= endDate.getTime()) {
        payouts.push({
          date: currentDate.toISOString().split('T')[0],
          amount: amount * 0.60,
          commission: levelCommission, // Same commission on each payout
          level
        });
        currentDate = new Date(currentDate.getTime() + MS_PER_MONTH);
      }
      break;
    }
  }

  return payouts;
}

async function buildReferralNetwork(items, targetAddress, level = 1, maxLevel = 4, processed = new Set()) {
  if (level > maxLevel || !targetAddress) {
    return {};
  }

  const network = {};
  const targetAddressLower = targetAddress.toLowerCase();

  const directReferrals = items.filter(item => 
    item.sponsor?.toLowerCase() === targetAddressLower && 
    !processed.has(item.address?.toLowerCase())
  );

  if (directReferrals.length > 0) {
    network[level] = [];
    
    for (const referral of directReferrals) {
      const referralAddressLower = referral.address?.toLowerCase();
      if (!referralAddressLower || processed.has(referralAddressLower)) continue;

      processed.add(referralAddressLower);
      
      const referralData = {
        address: referral.address,
        sponsor: referral.sponsor,
        amount: referral.donation || 0,
        planMonths: referral.duration || 0,
        startDate: referral.startTime || Date.now(),
        level: level
      };

      network[level].push(referralData);

      if (level < maxLevel) {
        const nextLevelReferrals = await buildReferralNetwork(
          items,
          referral.address,
          level + 1,
          maxLevel,
          processed
        );

        for (const nextLevel in nextLevelReferrals) {
          const actualLevel = parseInt(nextLevel);
          if (!network[actualLevel]) {
            network[actualLevel] = [];
          }
          network[actualLevel] = network[actualLevel].concat(
            nextLevelReferrals[nextLevel].map(ref => ({
              ...ref,
              level: actualLevel
            }))
          );
        }
      }
    }
  }

  return network;
}

async function calculateContractTotals() {
  try {
    console.log('Calculating contract totals...');
    const items = await getAllItems();
    
    let payoutsByDate = new Map();
    let commissionsByDate = new Map();
    
    for (const user of items) {
      if (!user.donation || !user.duration || !user.startTime) continue;

      const totalCommission = user.donation * (user.duration === 12 ? 0.50 : 0.25);
      const userPayouts = calculateUserPayouts(
        user.donation,
        user.duration,
        1,
        user.startTime
      );

      for (const payout of userPayouts) {
        payoutsByDate.set(
          payout.date, 
          (payoutsByDate.get(payout.date) || 0) + payout.amount
        );
        commissionsByDate.set(
          payout.date,
          (commissionsByDate.get(payout.date) || 0) + totalCommission
        );
      }
    }

    const sortedDates = Array.from(payoutsByDate.keys()).sort();
    let totalPayouts = 0;
    let totalCommissions = 0;

    console.log('\nPayout Schedule Summary:');
    console.log('Date       | Payouts ($) | Commissions ($) | Total ($)');
    console.log('-------------------------------------------------');

    for (const date of sortedDates) {
      const dayPayouts = payoutsByDate.get(date) || 0;
      const dayCommissions = commissionsByDate.get(date) || 0;
      totalPayouts += dayPayouts;
      totalCommissions += dayCommissions;

      console.log(
        `${date} | ${dayPayouts.toFixed(2).padStart(11)} | ${dayCommissions.toFixed(2).padStart(14)} | ${(dayPayouts + dayCommissions).toFixed(2).padStart(10)}`
      );
    }

    console.log('-------------------------------------------------');
    console.log(
      `TOTAL      | ${totalPayouts.toFixed(2).padStart(11)} | ${totalCommissions.toFixed(2).padStart(14)} | ${(totalPayouts + totalCommissions).toFixed(2).padStart(10)}`
    );

    const output = {
      generatedAt: new Date().toISOString(),
      payoutsByDate: Object.fromEntries(payoutsByDate),
      commissionsByDate: Object.fromEntries(commissionsByDate),
      totals: {
        payouts: totalPayouts,
        commissions: totalCommissions,
        total: totalPayouts + totalCommissions
      }
    };

    fs.writeFileSync(
      path.join(__dirname, 'contract-totals.json'),
      JSON.stringify(output, null, 2)
    );

    let csvContent = 'Date,Payouts ($),Commissions ($),Total ($)\n';
    for (const date of sortedDates) {
      const payouts = payoutsByDate.get(date) || 0;
      const commissions = commissionsByDate.get(date) || 0;
      csvContent += `${date},${payouts.toFixed(2)},${commissions.toFixed(2)},${(payouts + commissions).toFixed(2)}\n`;
    }
    csvContent += `\nTOTALS,${totalPayouts.toFixed(2)},${totalCommissions.toFixed(2)},${(totalPayouts + totalCommissions).toFixed(2)}\n`;

    fs.writeFileSync(
      path.join(__dirname, 'contract-totals.csv'),
      csvContent
    );

    console.log('\nReports saved to contract-totals.json and contract-totals.csv');
    return output;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

async function calculateFuturePayouts(targetAddress) {
  if (!targetAddress) {
    console.error('Please provide a wallet address');
    process.exit(1);
  }

  try {
    console.log('Calculating future payouts for', targetAddress);
    const items = await getAllItems();
    
    // Build the referral network for the target address
    const network = await buildReferralNetwork(items, targetAddress);
    if (Object.keys(network).length === 0) {
      console.log('No referral network found for this address');
      return;
    }

    let payoutsByDate = new Map();
    let commissionsByLevel = {
      1: new Map(),
      2: new Map(),
      3: new Map(),
      4: new Map()
    };

    // Process each level in the network
    for (const level in network) {
      for (const referral of network[level]) {
        if (!referral.amount || !referral.planMonths || !referral.startDate) continue;

        // Calculate payouts for this referral
        const userPayouts = calculateUserPayouts(
          referral.amount,
          referral.planMonths,
          parseInt(level),
          referral.startDate
        );

        // Add payouts and commissions to daily totals
        for (const payout of userPayouts) {
          // Track commission by level
          commissionsByLevel[payout.level].set(
            payout.date,
            (commissionsByLevel[payout.level].get(payout.date) || 0) + payout.commission
          );
        }
      }
    }

    // Sort dates and calculate totals
    const allDates = new Set();
    Object.values(commissionsByLevel).forEach(levelMap => {
      levelMap.forEach((_, date) => allDates.add(date));
    });
    const sortedDates = Array.from(allDates).sort();

    let totalsByLevel = {
      1: 0,
      2: 0,
      3: 0,
      4: 0
    };

    console.log('\nCommission Schedule by Level:');
    console.log('Date       | Level 1 ($) | Level 2 ($) | Level 3 ($) | Level 4 ($) | Total ($)');
    console.log('------------|-------------|-------------|-------------|-------------|------------');

    for (const date of sortedDates) {
      const levelAmounts = {
        1: commissionsByLevel[1].get(date) || 0,
        2: commissionsByLevel[2].get(date) || 0,
        3: commissionsByLevel[3].get(date) || 0,
        4: commissionsByLevel[4].get(date) || 0
      };

      const dailyTotal = Object.values(levelAmounts).reduce((a, b) => a + b, 0);

      // Update running totals
      Object.entries(levelAmounts).forEach(([level, amount]) => {
        totalsByLevel[level] += amount;
      });

      console.log(
        `${date} | ${levelAmounts[1].toFixed(2).padStart(11)} | ${levelAmounts[2].toFixed(2).padStart(11)} | ` +
        `${levelAmounts[3].toFixed(2).padStart(11)} | ${levelAmounts[4].toFixed(2).padStart(11)} | ${dailyTotal.toFixed(2).padStart(10)}`
      );
    }

    const grandTotal = Object.values(totalsByLevel).reduce((a, b) => a + b, 0);

    console.log('------------|-------------|-------------|-------------|-------------|------------');
    console.log(
      `TOTAL      | ${totalsByLevel[1].toFixed(2).padStart(11)} | ${totalsByLevel[2].toFixed(2).padStart(11)} | ` +
      `${totalsByLevel[3].toFixed(2).padStart(11)} | ${totalsByLevel[4].toFixed(2).padStart(11)} | ${grandTotal.toFixed(2).padStart(10)}`
    );

    // Prepare output data
    const output = {
      generatedAt: new Date().toISOString(),
      targetAddress,
      network,
      commissionsByLevel: Object.fromEntries(
        Object.entries(commissionsByLevel).map(([level, map]) => [level, Object.fromEntries(map)])
      ),
      totals: {
        byLevel: totalsByLevel,
        total: grandTotal
      }
    };

    // Save detailed JSON report
    fs.writeFileSync(
      path.join(__dirname, 'network-analysis.json'),
      JSON.stringify(output, null, 2)
    );

    // Save CSV format
    let csvContent = 'Date,Level 1 Commission ($),Level 2 Commission ($),Level 3 Commission ($),Level 4 Commission ($),Total ($)\n';
    for (const date of sortedDates) {
      const row = [
        date,
        (commissionsByLevel[1].get(date) || 0).toFixed(2),
        (commissionsByLevel[2].get(date) || 0).toFixed(2),
        (commissionsByLevel[3].get(date) || 0).toFixed(2),
        (commissionsByLevel[4].get(date) || 0).toFixed(2),
        Object.values(commissionsByLevel).reduce((sum, map) => sum + (map.get(date) || 0), 0).toFixed(2)
      ];
      csvContent += row.join(',') + '\n';
    }

    // Add totals row
    csvContent += `\nTOTALS,${totalsByLevel[1].toFixed(2)},${totalsByLevel[2].toFixed(2)},${totalsByLevel[3].toFixed(2)},${totalsByLevel[4].toFixed(2)},${grandTotal.toFixed(2)}\n`;

    fs.writeFileSync(
      path.join(__dirname, 'network-payouts.csv'),
      csvContent
    );

    // Save network structure
    saveToCSV(output, network);

    console.log('\nReports saved:');
    console.log('1. network-analysis.json - Detailed network analysis');
    console.log('2. network-payouts.csv - Commission schedule');
    console.log('3. referral-network.csv - Network structure');

    return output;
  } catch (error) {
    console.error('Error calculating network payouts:', error);
    throw error;
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Calculating contract-wide totals...');
  calculateContractTotals()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
} else if (args.length === 1) {
  const targetAddress = args[0];
  console.log('Calculating network payouts for address:', targetAddress);
  calculateFuturePayouts(targetAddress)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  Calculate contract totals: node calculatePayouts.js');
  console.log('  Calculate network payouts: node calculatePayouts.js <wallet_address>');
  process.exit(1);
}