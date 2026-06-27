const axios = require('axios');

const budgetConfig = require('../performance-budget.json');

const API_URL = process.env.API_URL || 'https://jsonplaceholder.typicode.com/posts';

async function testApiPerformance() {
  try {
    const start = Date.now();

    await axios.get(API_URL);

    const duration = Date.now() - start;

    console.log('API Performance Report');
    console.log('------------------------');
    console.log(`Budget: ${budgetConfig.apiResponse} ms`);
    console.log(`Actual: ${duration} ms`);

    if (duration > budgetConfig.apiResponse) {
      console.error('API response exceeded budget');
      process.exit(1);
    }

    console.log('API performance passed');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

testApiPerformance();
