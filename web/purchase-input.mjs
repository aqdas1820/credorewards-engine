/** Convert a human-entered INR decimal into paise, without floating point. */
export function parseRupeesToPaise(value) {
  if (typeof value !== 'string') throw new Error('Enter a rupee amount using up to two decimal places.');
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter a positive rupee amount using up to two decimal places (e.g. 1250.50).');
  const paise = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  if (paise <= 0n) throw new Error('Purchase amount must be greater than zero.');
  if (paise > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Purchase amount exceeds the maximum safe paise amount.');
  }
  return Number(paise);
}

/** Pick a new, reproducible synthetic ID without modifying the scenario. */
export function nextSyntheticPurchaseId(transactions) {
  if (!Array.isArray(transactions)) throw new Error('Scenario transactions must be an array.');
  const taken = new Set(transactions.map(tx => tx?.id));
  for (let n = 1; n <= transactions.length + 1; n += 1) {
    const candidate = 'what-if-' + n;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error('Unable to generate a unique synthetic purchase ID.');
}
