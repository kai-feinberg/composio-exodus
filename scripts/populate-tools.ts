#!/usr/bin/env tsx

import { populateSampleTools } from '../lib/scripts/populate-sample-tools';

async function main() {
  try {
    await populateSampleTools();
    console.log('✅ Tool population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Tool population failed:', error);
    process.exit(1);
  }
}

main();