import assert from 'assert'
import { parseHeartRate } from '../utils/bleHeartRate.js'

let passed = 0, failed = 0
function test(name, fn){try{fn();console.log(`✓ ${name}`);passed++}catch(e){console.log(`✗ ${name}\n  ${e.message}`);failed++}}

// uint8: flags=0x00, hr=0x8E(142)
test('uint8 心率解析', () => {
  const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0x00; v[1]=142
  assert.strictEqual(parseHeartRate(buf), 142)
})
test('uint16 心率解析', () => {
  const buf = new ArrayBuffer(3); const v = new Uint8Array(buf); v[0]=0x01; v[1]=200; v[2]=0
  assert.strictEqual(parseHeartRate(buf), 200)
})
test('心率 0 返回 null', () => {
  const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0; v[1]=0
  assert.strictEqual(parseHeartRate(buf), null)
})
test('心率 >220 返回 null', () => {
  const buf = new ArrayBuffer(2); const v = new Uint8Array(buf); v[0]=0; v[1]=250
  assert.strictEqual(parseHeartRate(buf), null)
})
test('数据过短返回 null', () => {
  assert.strictEqual(parseHeartRate(new ArrayBuffer(1)), null)
  assert.strictEqual(parseHeartRate(null), null)
})
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed?1:0)
