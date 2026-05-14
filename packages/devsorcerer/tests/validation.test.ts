import { describe, it, expect } from 'vitest';
import {
  validatePort,
  validateDateFormat,
  validateSessionId,
  validateProjectId,
  validateLimit,
  validateOutputPath,
  validateSeverity,
  validateAuditFormat,
  validateAuditScope,
  sanitizeSearchQuery,
  sanitizeConfigKey,
} from '../src/shared/validation.js';

describe('validatePort', () => {
  it('accepts valid ports', () => {
    expect(validatePort(3000)).toBe(3000);
    expect(validatePort('3199')).toBe(3199);
    expect(validatePort(1024)).toBe(1024);
    expect(validatePort(65535)).toBe(65535);
  });

  it('rejects out of range ports', () => {
    expect(() => validatePort(80)).toThrow('between 1024 and 65535');
    expect(() => validatePort(99999)).toThrow('between 1024 and 65535');
    expect(() => validatePort(-1)).toThrow('between 1024 and 65535');
  });

  it('rejects non-numeric ports', () => {
    expect(() => validatePort('abc')).toThrow('must be a number');
    expect(() => validatePort(NaN)).toThrow('must be a number');
  });
});

describe('validateDateFormat', () => {
  it('accepts valid dates', () => {
    expect(() => validateDateFormat('2026-05-14')).not.toThrow();
    expect(() => validateDateFormat('2024-01-01')).not.toThrow();
  });

  it('rejects invalid dates', () => {
    expect(() => validateDateFormat('14-05-2026', 'date')).toThrow('YYYY-MM-DD');
    expect(() => validateDateFormat('2026-13-01', 'from')).toThrow('not a valid date');
    expect(() => validateDateFormat('not-a-date')).toThrow('YYYY-MM-DD');
  });
});

describe('validateSessionId', () => {
  it('accepts valid IDs', () => {
    expect(validateSessionId('abc123')).toBe('abc123');
    expect(validateSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid IDs', () => {
    expect(() => validateSessionId('')).toThrow('non-empty string');
    expect(() => validateSessionId(123)).toThrow('non-empty string');
  });
});

describe('validateProjectId', () => {
  it('accepts valid IDs', () => {
    expect(validateProjectId('myproject-a1b2c3d4')).toBe('myproject-a1b2c3d4');
  });

  it('rejects empty', () => {
    expect(() => validateProjectId('')).toThrow('non-empty string');
  });
});

describe('validateLimit', () => {
  it('accepts valid limits', () => {
    expect(validateLimit(10)).toBe(10);
    expect(validateLimit('50')).toBe(50);
    expect(validateLimit(1)).toBe(1);
  });

  it('rejects invalid limits', () => {
    expect(() => validateLimit(0)).toThrow('between 1 and');
    expect(() => validateLimit(2000)).toThrow('between 1 and');
    expect(() => validateLimit('abc')).toThrow('must be a number');
  });
});

describe('validateOutputPath', () => {
  it('accepts valid paths', () => {
    expect(validateOutputPath('output.json')).toBe('output.json');
    expect(validateOutputPath('/tmp/audit.csv')).toBe('/tmp/audit.csv');
  });

  it('rejects traversal attempts', () => {
    expect(() => validateOutputPath('../../etc/passwd')).toThrow('must not contain');
  });
});

describe('validateSeverity', () => {
  it('accepts valid severities', () => {
    expect(() => validateSeverity('critical')).not.toThrow();
    expect(() => validateSeverity('low')).not.toThrow();
  });

  it('rejects invalid severities', () => {
    expect(() => validateSeverity('urgent')).toThrow('one of:');
  });
});

describe('validateAuditFormat', () => {
  it('accepts valid formats', () => {
    expect(() => validateAuditFormat('json')).not.toThrow();
    expect(() => validateAuditFormat('csv')).not.toThrow();
    expect(() => validateAuditFormat('ndjson')).not.toThrow();
  });

  it('rejects invalid formats', () => {
    expect(() => validateAuditFormat('xml')).toThrow('one of:');
  });
});

describe('validateAuditScope', () => {
  it('accepts valid scopes', () => {
    expect(() => validateAuditScope('full')).not.toThrow();
    expect(() => validateAuditScope('anonymized')).not.toThrow();
  });

  it('rejects invalid scopes', () => {
    expect(() => validateAuditScope('partial')).toThrow('one of:');
  });
});

describe('sanitizeSearchQuery', () => {
  it('trims whitespace', () => {
    expect(sanitizeSearchQuery('  hello  ')).toBe('hello');
  });

  it('rejects empty queries', () => {
    expect(() => sanitizeSearchQuery('')).toThrow('cannot be empty');
    expect(() => sanitizeSearchQuery('   ')).toThrow('cannot be empty');
  });

  it('rejects long queries', () => {
    expect(() => sanitizeSearchQuery('x'.repeat(501))).toThrow('too long');
  });
});

describe('sanitizeConfigKey', () => {
  it('accepts valid keys', () => {
    expect(sanitizeConfigKey('serverPort')).toBe('serverPort');
    expect(sanitizeConfigKey('dbPath')).toBe('dbPath');
    expect(sanitizeConfigKey('dashboardEnabled')).toBe('dashboardEnabled');
  });

  it('rejects unknown keys', () => {
    expect(() => sanitizeConfigKey('unknownKey')).toThrow('Unknown config key');
  });
});
