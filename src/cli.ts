#!/usr/bin/env node

import { run } from './index'

async function main() {
  try {
    await run()
  } catch (error) {
    console.error('❌ Auto-translate failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main() 