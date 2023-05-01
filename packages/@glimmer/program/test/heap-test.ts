import { HeapImpl } from '..';

QUnit.module('Heap');

// eslint-disable-next-line qunit/require-expect
QUnit.test('Can grow', (assert) => {
  let size = 0x100000;
  let heap = new HeapImpl();

  let i = 0;

  while (i !== size - 1) {
    heap.push(1);
    i++;
  }

  // Should grow here
  heap.push(10);

  // Slices the buffer. Passing MAX_SAFE_INTEGER ensures
  // we get the whole thing out
  let serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  let serializedHeap = new Int32Array(serialized.buffer);
  assert.strictEqual(serializedHeap.length, size);
  assert.strictEqual(serializedHeap[size - 1], 10);

  heap.push(11);

  serialized = heap.capture(Number.MAX_SAFE_INTEGER);
  serializedHeap = new Int32Array(serialized.buffer);

  if (typeof serializedHeap.slice === 'function') {
    // eslint-disable-next-line qunit/no-conditional-assertions
    assert.strictEqual(serializedHeap.length, size * 2);
  } else {
    // IE11 only gives you a buffer with residents in the slots
    // eslint-disable-next-line qunit/no-conditional-assertions
    assert.strictEqual(serializedHeap.length, size + 1);
  }
  assert.strictEqual(serializedHeap[size], 11);
});
