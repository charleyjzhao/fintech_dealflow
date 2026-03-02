/**
 * Crunchbase ingestion — disabled (requires paid API access)
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function syncFundingRounds(_daysBack = 7): Promise<{ inserted: number; errors: string[] }> {
  return { inserted: 0, errors: ['Crunchbase ingestion disabled'] }
}
