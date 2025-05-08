// Test script for the stablecoin supply API
// Run with: node test-api.js

const testApi = async () => {
  console.log('Testing stablecoin supply API...');
  
  try {
    const response = await fetch('http://localhost:3001/api/supply');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Validate response format
    if (!data.supplies || !Array.isArray(data.supplies)) {
      throw new Error('Invalid response format: missing supplies array');
    }
    
    if (typeof data.total !== 'string') {
      throw new Error('Invalid response format: missing or invalid total');
    }
    
    // Check if we have data for each expected token
    const expectedTokens = ['USDt', 'USDC', 'USDe', 'sUSDe'];
    const foundTokens = data.supplies.map(item => item.symbol);
    
    const missingTokens = expectedTokens.filter(token => !foundTokens.includes(token));
    if (missingTokens.length > 0) {
      console.warn(`Warning: Missing data for tokens: ${missingTokens.join(', ')}`);
    } else {
      console.log('✅ Data found for all expected tokens');
    }
    
    // Validate that supplies are numeric strings and positive
    const invalidSupplies = data.supplies.filter(
      item => typeof item.supply !== 'string' || !/^\d+$/.test(item.supply)
    );
    
    if (invalidSupplies.length > 0) {
      throw new Error(`Invalid supply values for: ${invalidSupplies.map(i => i.symbol).join(', ')}`);
    }
    
    // Verify the total matches the sum of supplies
    const calculatedTotal = data.supplies.reduce(
      (sum, item) => sum + BigInt(item.supply), 
      BigInt(0)
    ).toString();
    
    if (calculatedTotal !== data.total) {
      throw new Error(`Total mismatch: API returned ${data.total}, calculated ${calculatedTotal}`);
    }
    
    console.log('✅ API response validated successfully');
    console.log('✅ Total supply:', BigInt(data.total).toLocaleString());
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
};

// Run the test
testApi(); 