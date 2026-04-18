import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_API_KEY, getStoredApiKey } from './api-key';

test('getStoredApiKey reads the latest browser key value each time', () => {
  const storage = {
    value: 'ctx_live_initial',
    getItem(key: string) {
      return key === 'contextos_api_key' ? this.value : null;
    },
  };

  assert.equal(getStoredApiKey(storage), 'ctx_live_initial');

  storage.value = 'ctx_live_updated';

  assert.equal(getStoredApiKey(storage), 'ctx_live_updated');
});

test('getStoredApiKey falls back to the demo key when storage is empty', () => {
  const storage = {
    getItem() {
      return '   ';
    },
  };

  assert.equal(getStoredApiKey(storage), DEMO_API_KEY);
});
