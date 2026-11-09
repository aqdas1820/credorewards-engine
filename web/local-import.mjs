export const MAX_SCENARIO_FILE_BYTES = 128 * 1024;

/** Keep pasted and file-imported JSON under the same browser-side limit. */
export function parseScenarioText(text) {
  if (typeof text !== 'string' || text.length === 0 ||
      text.length > MAX_SCENARIO_FILE_BYTES ||
      new TextEncoder().encode(text).byteLength > MAX_SCENARIO_FILE_BYTES) {
    throw new Error('Scenario JSON must be between 1 byte and 128 KiB.');
  }
  const payload = JSON.parse(text);
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)
    || !Array.isArray(payload.cards) || !Array.isArray(payload.transactions)
    || !Number.isInteger(payload.year)) {
    throw new Error('Scenario must include year, cards array, and transactions array.');
  }
  return payload;
}

/** Parse a user-selected local JSON file without sending it to a server. */
export async function readLocalScenario(file) {
  if (!file || !Number.isSafeInteger(file.size) || typeof file.text !== 'function') {
    throw new Error('Select a local JSON file.');
  }
  if (file.size <= 0 || file.size > MAX_SCENARIO_FILE_BYTES) {
    throw new Error('JSON file must be between 1 byte and 128 KiB.');
  }
  // Verify actual decoded bytes as well as File.size; metadata may be false.
  return parseScenarioText(await file.text());
}
