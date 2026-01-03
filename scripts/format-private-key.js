#!/usr/bin/env node

/**
 * Helper script to format a Google Service Account private key for .env files
 * 
 * Usage:
 *   node scripts/format-private-key.js <path-to-service-account.json>
 *   OR
 *   node scripts/format-private-key.js (will prompt for JSON content)
 */

const fs = require('fs');
const readline = require('readline');

function formatPrivateKey(jsonPath) {
  let serviceAccount;
  
  if (jsonPath && fs.existsSync(jsonPath)) {
    // Read from file
    const content = fs.readFileSync(jsonPath, 'utf8');
    serviceAccount = JSON.parse(content);
  } else {
    console.log('Please paste your service account JSON content (or press Ctrl+C to exit):');
    console.log('(Paste the entire JSON, then press Enter twice)');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    let input = '';
    rl.on('line', (line) => {
      input += line + '\n';
      if (line.trim() === '' && input.trim().length > 0) {
        try {
          serviceAccount = JSON.parse(input.trim());
          rl.close();
        } catch (e) {
          // Continue reading
        }
      }
    });
    
    rl.on('close', () => {
      if (serviceAccount) {
        outputFormattedKey(serviceAccount);
      }
    });
    
    return;
  }
  
  outputFormattedKey(serviceAccount);
}

function outputFormattedKey(serviceAccount) {
  if (!serviceAccount.private_key) {
    console.error('Error: JSON does not contain a "private_key" field');
    process.exit(1);
  }
  
  if (!serviceAccount.client_email) {
    console.error('Error: JSON does not contain a "client_email" field');
    process.exit(1);
  }
  
  // Format the private key: replace newlines with \n
  const formattedKey = serviceAccount.private_key.replace(/\n/g, '\\n');
  
  console.log('\n=== Add these to your .env.local file ===\n');
  console.log(`GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL="${serviceAccount.client_email}"`);
  console.log(`GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="${formattedKey}"`);
  console.log('\n=== End of .env variables ===\n');
  
  // Also output base64 version
  const base64Key = Buffer.from(serviceAccount.private_key).toString('base64');
  console.log('Alternative: Base64 encoded version (if you prefer):');
  console.log(`GOOGLE_DRIVE_SERVICE_ACCOUNT_PRIVATE_KEY="${base64Key}"`);
  console.log('');
}

// Main execution
const jsonPath = process.argv[2];
formatPrivateKey(jsonPath);


