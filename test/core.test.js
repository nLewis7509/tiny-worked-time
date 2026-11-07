import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkedTime, roundToInterval, parseTime, formatHours } from '../src/index.js';

test('parseTime parses valid times', () => {
  assert.equal(parseTime('00:00'), 0);
  assert.equal(parseTime('9:05'), 9 * 60 + 5);
  assert.equal(parseTime('23:59'), 23 * 60 + 59);
});

test('parseTime rejects bad input', () => {
  assert.throws(() => parseTime('24:00'), /out of range/);
  assert.throws(() => parseTime('12:60'), /out of range/);
  assert.throws(() => parseTime('noon'), /invalid time format/);
  assert.throws(() => parseTime(123), /must be a string/);
});

test('roundToInterval rounds to nearest interval', () => {
  assert.equal(roundToInterval(7, 15), 0);
  assert.equal(roundToInterval(8, 15), 15);
  assert.equal(roundToInterval(22, 15), 15);
  assert.equal(roundToInterval(23, 15), 30);
  assert.equal(roundToInterval(0, 15), 0);
});

test('roundToInterval rejects invalid interval', () => {
  assert.throws(() => roundToInterval(10, 0), /positive/);
  assert.throws(() => roundToInterval(10, -5), /positive/);
});

test('formatHours formats minutes as decimal hours', () => {
  assert.equal(formatHours(0), '0.00');
  assert.equal(formatHours(30), '0.50');
  assert.equal(formatHours(75), '1.25');
});

test('calculateWorkedTime single shift no break', () => {
  const result = calculateWorkedTime([{ start: '09:00', end: '17:00' }]);
  assert.equal(result.totalMinutes, 480);
  assert.equal(result.totalHours, '8.00');
  assert.equal(result.overtimeMinutes, 0);
  assert.equal(result.overtimeHours, '0.00');
});

test('calculateWorkedTime subtracts breaks', () => {
  const result = calculateWorkedTime([{ start: '09:00', end: '17:00', breakMinutes: 30 }]);
  assert.equal(result.totalMinutes, 450);
  assert.equal(result.totalHours, '7.50');
});

test('calculateWorkedTime handles overnight shift', () => {
  const result = calculateWorkedTime([{ start: '22:00', end: '06:00' }]);
  assert.equal(result.totalMinutes, 480);
});

test('calculateWorkedTime rounds total to interval', () => {
  const result = calculateWorkedTime(
    [{ start: '09:00', end: '17:07' }],
    { roundInterval: 15 }
  );
  // 487 minutes rounds to 480 (nearest 15)
  assert.equal(result.totalMinutes, 480);
});

test('calculateWorkedTime computes overtime', () => {
  const result = calculateWorkedTime(
    [{ start: '08:00', end: '18:00' }],
    { overtimeThreshold: 480 }
  );
  assert.equal(result.totalMinutes, 600);
  assert.equal(result.overtimeMinutes, 120);
  assert.equal(result.overtimeHours, '2.00');
});

test('calculateWorkedTime multiple shifts', () => {
  const result = calculateWorkedTime([
    { start: '09:00', end: '12:00' },
    { start: '13:00', end: '17:00' },
  ]);
  assert.equal(result.totalMinutes, 420);
});

test('calculateWorkedTime rejects break longer than shift', () => {
  assert.throws(
    () => calculateWorkedTime([{ start: '09:00', end: '09:30', breakMinutes: 45 }]),
    /break longer than shift/
  );
});

test('calculateWorkedTime rejects invalid shift shape', () => {
  assert.throws(() => calculateWorkedTime([null]), /each shift must be an object/);
  assert.throws(() => calculateWorkedTime([{}]), /must be a string/);
});
