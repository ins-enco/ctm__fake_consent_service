import { describe, it, expect } from '@jest/globals';
import BrokerHandoverSchema from '../../server/utils/schema/BrokerHandoverSchema';
import {
  buildBrokerHandover,
  buildConsentUid,
  buildLegacyConsentUrl,
  buildStandardConsentUrl,
  parseAccountNumbers,
  parseConsentType,
  parseConsentUid,
  LEGACY_CONSENT_TYPE,
  STANDARD_CONSENT_TYPE,
} from '../../app/utils/consentHandover';

describe('parseConsentType', () => {
  it('treats 1 as Standard', () => {
    expect(parseConsentType(1)).toBe(STANDARD_CONSENT_TYPE);
    expect(parseConsentType('1')).toBe(STANDARD_CONSENT_TYPE);
  });

  // Mirrors ParseConsentType in SfBrokerConsentService: anything that is not 1
  // falls back to Legacy, including absent and unparseable values.
  it.each([0, '0', undefined, null, '', 'abc', 2, '01x'])(
    'treats %p as Legacy',
    (input) => {
      expect(parseConsentType(input)).toBe(LEGACY_CONSENT_TYPE);
    },
  );
});

describe('parseAccountNumbers', () => {
  it('parses a comma-separated list', () => {
    expect(parseAccountNumbers('731049,400068201', '456')).toEqual([
      '731049',
      '400068201',
    ]);
  });

  it('tolerates whitespace and drops non-numeric entries', () => {
    expect(parseAccountNumbers(' 731049 , abc , 400068201 ', '456')).toEqual([
      '731049',
      '400068201',
    ]);
  });

  it('falls back to accountId when no list is given', () => {
    expect(parseAccountNumbers(undefined, '456')).toEqual(['456']);
  });

  it('returns empty when neither source yields a login', () => {
    expect(parseAccountNumbers(undefined, 'not-a-number')).toEqual([]);
    expect(parseAccountNumbers('', undefined)).toEqual([]);
  });
});

describe('buildConsentUid / parseConsentUid', () => {
  // The composite form is verified against production: every stored uid equals
  // CONCAT(UserID,'a',BrokerID).
  it('joins userId and brokerId with a literal "a"', () => {
    expect(buildConsentUid(12345, 67)).toBe('12345a67');
    expect(buildConsentUid('2', '1')).toBe('2a1');
  });

  it('round-trips', () => {
    expect(parseConsentUid(buildConsentUid(12345, 67))).toEqual({
      userId: '12345',
      brokerId: '67',
    });
  });

  it.each(['', '12345', '12345a', 'a67', '12345a67a89', 'abc', undefined, null])(
    'rejects malformed uid %p',
    (input) => {
      expect(parseConsentUid(input)).toBeNull();
    },
  );
});

describe('consent journey entry URLs', () => {
  it('builds the Legacy popup URL with is_ms and the composite uid', () => {
    expect(buildLegacyConsentUrl('https://gbe.example.com', 12345, 67)).toBe(
      'https://gbe.example.com/my-syntellicore?is_ms=1&uid=12345a67',
    );
  });

  it('does not double the slash when ApiUrl already ends in one', () => {
    expect(buildLegacyConsentUrl('https://gbe.example.com/', 2, 1)).toBe(
      'https://gbe.example.com/my-syntellicore?is_ms=1&uid=2a1',
    );
  });

  it('builds the Standard redirect URL with all four identifiers', () => {
    const url = buildStandardConsentUrl('https://broker.example.com/consent', {
      userId: 2,
      accountId: 456,
      brokerId: 1,
      strategyId: 101,
    });
    expect(url).toBe(
      'https://broker.example.com/consent?userId=2&accountId=456&brokerId=1&strategyId=101',
    );
  });

  it('appends with & when ApiUrl already carries a query', () => {
    const url = buildStandardConsentUrl('https://broker.example.com/c?x=1', {
      userId: 2,
      accountId: 456,
      brokerId: 1,
      strategyId: 101,
    });
    expect(url).toContain('?x=1&userId=2');
  });
});

describe('buildBrokerHandover', () => {
  const handover = buildBrokerHandover({
    userId: 2,
    brokerId: 1,
    accountNumbers: ['731049', '400068201'],
  });

  it('puts every requested login in datasource3', () => {
    expect(handover.datasource3.map((a) => a.account_number)).toEqual([
      '731049',
      '400068201',
    ]);
  });

  it('sets uid to the composite <userId>a<brokerId>, not just userId', () => {
    expect(handover.uid).toBe('2a1');
  });

  it('defaults the platform to MetaTrader 4 and honours an override', () => {
    expect(handover.datasource3[0]?.trading_platform).toBe('MetaTrader 4');
    const mt5 = buildBrokerHandover({
      userId: 2,
      brokerId: 1,
      accountNumbers: ['731049'],
      platform: 'MetaTrader 5',
    });
    expect(mt5.datasource3[0]?.trading_platform).toBe('MetaTrader 5');
  });

  it('carries KYC pre-fill data in datasource1 and datasource2', () => {
    expect(handover.datasource1).toHaveLength(1);
    expect(handover.datasource1[0]?.fname).toBe('John');
    expect(handover.datasource2.length).toBeGreaterThan(0);
  });

  it('passes BrokerHandoverSchema validation', () => {
    const { error } = BrokerHandoverSchema.validate(handover, {
      abortEarly: false,
    });
    expect(error).toBeUndefined();
  });
});

describe('BrokerHandoverSchema', () => {
  const valid = buildBrokerHandover({
    userId: 2,
    brokerId: 1,
    accountNumbers: ['731049'],
  });

  // These two are the whole point: a handover that omits datasource3, or carries
  // it empty, is what makes CheckConsentAsync reset Status back to 0. The schema
  // must refuse both rather than let a self-destructing payload through.
  it('rejects a handover with no datasource3', () => {
    const { datasource3, ...withoutAccounts } = valid;
    const { error } = BrokerHandoverSchema.validate(withoutAccounts);
    expect(error).toBeDefined();
    expect(error?.message).toContain('datasource3');
  });

  it('rejects an empty datasource3', () => {
    const { error } = BrokerHandoverSchema.validate({
      ...valid,
      datasource3: [],
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('datasource3');
  });

  it('rejects a datasource3 entry with no account_number', () => {
    const { error } = BrokerHandoverSchema.validate({
      ...valid,
      datasource3: [{ trading_platform: 'MetaTrader 4' }],
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('account_number');
  });

  it('rejects a non-numeric account_number', () => {
    const { error } = BrokerHandoverSchema.validate({
      ...valid,
      datasource3: [{ account_number: 'ABC123' }],
    });
    expect(error).toBeDefined();
  });

  it('tolerates unknown broker fields', () => {
    const { error } = BrokerHandoverSchema.validate({
      ...valid,
      some_new_broker_field: 'whatever',
      datasource1: [{ fname: 'John', a_new_doc_field: 'x' }],
    });
    expect(error).toBeUndefined();
  });
});
