export const MAX_SCENARIO_FILE_BYTES = 128 * 1024;

/** Parse a user-selected local JSON file without sending it to a server. */
export async function readLocalScenario(file) {
  if (!file || typeof file.size !== 'number' || typeof file.text !== 'function') {
    throw new Error('Select a local JSON file.');
  }
  if (file.size <= 0 || file.size > MAX_SCENARIO_FILE_BYTES) {
    throw new Error('JSON file must be between 1 byte and 128 KiB.');
  }
  const payload = JSON.parse(await file.text());
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)
    || !Array.isArray(payload.cards) || !Array.isArray(payload.transactions)
    || !Number.isInteger(payload.year)) {
    throw new Error('Scenario must include year, cards array, and transactions array.');
  }
  return payload;
}
