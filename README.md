# tiny-worked-time

Computes total worked hours and overtime from a list of shift entries, subtracting unpaid breaks and rounding to configurable intervals.

```js
import { calculateWorkedTime } from './src/index.js';

const result = calculateWorkedTime([
  { start: '09:00', end: '17:30', breakMinutes: 30 },
  { start: '18:00', end: '20:00' },
], { roundInterval: 15, overtimeThreshold: 480 });

console.log(result.totalHours);    // '10.00'
console.log(result.overtimeHours); // '2.00'
```

## Why this exists

Payroll and timesheet tools often need a small, dependency-free way to turn raw shift entries into billable or payable hours. The awkward part is rounding: rounding each shift separately can drift from the total, so this library rounds the summed worked minutes once. That trade-off means a shift that ends at 17:07 contributes its exact minutes to the total, and only the final sum is snapped to the chosen interval.

## Edge cases

- A shift whose end time is earlier than its start time is treated as crossing midnight. For example, `22:00` to `06:00` is eight hours.
- A break longer than the shift is rejected rather than producing a negative duration.
- Overtime is calculated from the rounded total, not from individual shifts.
