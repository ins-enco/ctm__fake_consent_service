import { describe, it, expect } from '@jest/globals';
import AcceptConsentSchema from '../../server/utils/schema/AcceptConsentSchema';
import { SAMPLE_CONSENT_PAYLOAD } from '../../app/utils/consentPayload';

/**
 * Regression guard: the payload the consent page actually posts must satisfy
 * the schema the endpoint validates it with. The previous inline payload
 * violated two enums ("Salary" and "Yes"), so every Approve click 400'd while
 * the isolated schema tests still passed.
 */
describe('Consent page payload', () => {
  it('passes AcceptConsentSchema validation', () => {
    const { error } = AcceptConsentSchema.validate(SAMPLE_CONSENT_PAYLOAD, {
      abortEarly: false,
    });

    expect(error).toBeUndefined();
  });

  it('only uses permitted OriginMittel values', () => {
    const allowed = ['Dividends', 'Business profits', 'Other profits', 'Heritage'];

    SAMPLE_CONSENT_PAYLOAD.WealthAndIncome.OriginMittel.forEach((origin) => {
      expect(allowed).toContain(origin);
    });
  });

  it('uses a lowercase BankTransferOrigin', () => {
    expect(['yes', 'no', '']).toContain(
      SAMPLE_CONSENT_PAYLOAD.WealthAndIncome.BankTransferOrigin,
    );
  });

  it('rejects the payload again if a bad enum value is reintroduced', () => {
    const regressed = {
      ...SAMPLE_CONSENT_PAYLOAD,
      WealthAndIncome: {
        ...SAMPLE_CONSENT_PAYLOAD.WealthAndIncome,
        OriginMittel: ['Salary'],
        BankTransferOrigin: 'Yes',
      },
    };

    const { error } = AcceptConsentSchema.validate(regressed, {
      abortEarly: false,
    });

    expect(error).toBeDefined();
    expect(error?.message).toContain('OriginMittel');
    expect(error?.message).toContain('BankTransferOrigin');
  });
});
