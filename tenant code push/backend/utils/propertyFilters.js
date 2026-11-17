function parseOptionalNumber(value) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim()))
    return { valid: true, value: null };
  if (typeof value !== 'number' && typeof value !== 'string')
    return { valid: false, value: null };

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0
    ? { valid: true, value: parsed }
    : { valid: false, value: null };
}

function parsePropertyNumericFilters(query) {
  const beds = parseOptionalNumber(query.beds);
  if (!beds.valid || (beds.value !== null && !Number.isInteger(beds.value)))
    return { valid: false, field: 'beds' };

  const maxRent = parseOptionalNumber(query.maxRent);
  if (!maxRent.valid)
    return { valid: false, field: 'maxRent' };

  return { valid: true, beds: beds.value, maxRent: maxRent.value };
}

module.exports = { parsePropertyNumericFilters };
