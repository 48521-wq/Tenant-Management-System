function parseRentAmount(value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim()))
    return { valid: true, value: null };

  if (typeof value !== 'number' && typeof value !== 'string')
    return { valid: false, value: null };

  if (typeof value === 'string' && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))
    return { valid: false, value: null };

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0)
    return { valid: false, value: null };

  return { valid: true, value: amount };
}

module.exports = { parseRentAmount };
