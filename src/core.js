// Core logic for tiny-worked-time.
//
// Design decisions:
// - Times are given as 'HH:MM' strings in 24-hour format.
// - A shift may cross midnight; the end time is interpreted as the next day
//   when it is earlier than the start time. This is the single interpretation
//   chosen for overnight shifts.
// - Breaks are subtracted from the raw worked minutes before rounding.
// - Rounding is done on the total worked minutes, not per shift, because
//   rounding each shift separately can accumulate error in ways that surprise
//   payroll users.
// - Overtime is any worked time beyond a configurable daily threshold (default 8h).

/**
 * Parse a 'HH:MM' string into minutes since midnight.
 * @param {string} s
 * @returns {number}
 */
export function parseTime(s) {
  if (typeof s !== 'string') {
    throw new TypeError('time must be a string');
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) {
    throw new Error(`invalid time format: ${s}`);
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    throw new Error(`time out of range: ${s}`);
  }
  return h * 60 + min;
}

/**
 * Round a number of minutes to the nearest interval (in minutes).
 * Ties round up (half away from zero), matching common payroll practice.
 * @param {number} minutes
 * @param {number} interval
 * @returns {number}
 */
export function roundToInterval(minutes, interval) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    throw new TypeError('minutes must be a finite number');
  }
  if (typeof interval !== 'number' || !Number.isFinite(interval) || interval <= 0) {
    throw new Error('interval must be a positive number');
  }
  const ratio = minutes / interval;
  const rounded = Math.floor(ratio + 0.5);
  return rounded * interval;
}

/**
 * Format a number of minutes as decimal hours with two decimal places.
 * @param {number} minutes
 * @returns {string}
 */
export function formatHours(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    throw new TypeError('minutes must be a finite number');
  }
  return (minutes / 60).toFixed(2);
}

/**
 * Calculate total worked time and overtime from shift entries.
 * @param {Array<{start: string, end: string, breakMinutes?: number}>} shifts
 * @param {{roundInterval?: number, overtimeThreshold?: number}} [options]
 * @returns {{totalMinutes: number, totalHours: string, overtimeMinutes: number, overtimeHours: string}}
 */
export function calculateWorkedTime(shifts, options = {}) {
  if (!Array.isArray(shifts)) {
    throw new TypeError('shifts must be an array');
  }
  const roundInterval = options.roundInterval ?? 1;
  const overtimeThreshold = options.overtimeThreshold ?? 480; // 8 hours

  let rawMinutes = 0;
  for (const shift of shifts) {
    if (shift === null || typeof shift !== 'object') {
      throw new TypeError('each shift must be an object');
    }
    const start = parseTime(shift.start);
    const end = parseTime(shift.end);
    const breakMinutes = shift.breakMinutes ?? 0;
    if (typeof breakMinutes !== 'number' || !Number.isFinite(breakMinutes) || breakMinutes < 0) {
      throw new Error('breakMinutes must be a non-negative number');
    }
    let duration = end - start;
    if (duration < 0) {
      // Shift crosses midnight.
      duration += 24 * 60;
    }
    if (duration < breakMinutes) {
      throw new Error('break longer than shift');
    }
    rawMinutes += duration - breakMinutes;
  }

  const totalMinutes = roundToInterval(rawMinutes, roundInterval);
  const overtimeMinutes = Math.max(0, totalMinutes - overtimeThreshold);

  return {
    totalMinutes,
    totalHours: formatHours(totalMinutes),
    overtimeMinutes,
    overtimeHours: formatHours(overtimeMinutes),
  };
}
