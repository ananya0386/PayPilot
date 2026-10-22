// Random ids for records and payment requests, using expo-crypto.
import * as Crypto from 'expo-crypto';

// e.g. newId('sub') -> "sub_3f1c2b9a4d5e..."
export function newId(prefix) {
  return `${prefix}_${Crypto.randomUUID().replace(/-/g, '')}`;
}
