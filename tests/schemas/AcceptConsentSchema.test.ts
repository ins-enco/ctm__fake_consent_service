import { describe, it, expect } from '@jest/globals';
import AcceptConsentSchema from '../../server/utils/schema/AcceptConsentSchema';

describe('AcceptConsentSchema', () => {
  it('should validate valid consent data', () => {
    const validData = {
      PersonalDetails: {
        ID: 'TEST123',
        UserID: 'USER456',
        Salutation: 'Mr',
        Title: 'PhD',
        FirstName: 'John',
        LastName: 'Doe',
        BirthName: 'John Smith',
        DateOfBirth: '1990-01-01',
        PlaceOfBirth: 'New York',
        CountryOfBirth: 'USA',
        NumberOfDependentChildren: 2
      },
      Address: {
        Street: '123 Main St',
        ExtraAddress: 'Apt 4B',
        HouseNumber: '123',
        Zip: '12345',
        City: 'New York',
        Country: 'USA',
        Citizenship: 'US',
        Email: 'john.doe@example.com',
        Fax: '+1-555-0123',
        Phone: '+1-555-0123'
      },
      IdentificationDocument: {
        Passport: 'Passport',
        PpNo: 'P123456789',
        PpIssueDate: '2020-01-01',
        PpExpiryDate: '2030-01-01',
        TaxResidency: 'US',
        VATNo: 'VAT123456',
        IsPEP: false
      },
      EducationAndProfession: {
        Profession: 'Software Engineer',
        EducationLevel: 'Bachelor',
        MyEducation: 'Computer Science',
        EmploymentMode: 'Employed',
        EmployedAt: 'Tech Corp',
        CompanyName: 'Tech Corp Inc',
        AddressOfEmployer: '456 Tech Ave'
      },
      WealthAndIncome: {
        OriginMittel: ['Business profits', 'Dividends'],
        OriginVermoegen: 'Investments',
        AnnualNetIncome: '$100,000',
        BankTransferOrigin: 'yes',
        ClientBank: 'Chase Bank',
        ClientIban: 'US123456789',
        Amount: 50000
      }
    };

    const result = AcceptConsentSchema.validate(validData);
    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
    
    // Check specific fields are properly validated
    expect(result.value.PersonalDetails.ID).toBe('TEST123');
    expect(result.value.PersonalDetails.Salutation).toBe('Mr');
    expect(result.value.Address.Email).toBe('john.doe@example.com');
    expect(result.value.IdentificationDocument.IsPEP).toBe(false);
    expect(result.value.WealthAndIncome.Amount).toBe(50000);
  });

  it('should validate when optional fields are empty strings', () => {
    const dataWithEmptyStrings = {
      PersonalDetails: {
        ID: '',
        UserID: '',
        Salutation: '',
        Title: '',
        FirstName: '',
        LastName: '',
        BirthName: '',
        DateOfBirth: '',
        PlaceOfBirth: '',
        CountryOfBirth: '',
        NumberOfDependentChildren: ''
      },
      Address: {
        Street: '',
        ExtraAddress: '',
        HouseNumber: '',
        Zip: '',
        City: '',
        Country: '',
        Citizenship: '',
        Email: '',
        Fax: '',
        Phone: ''
      },
      IdentificationDocument: {
        Passport: '',
        PpNo: '',
        PpIssueDate: '',
        PpExpiryDate: '',
        TaxResidency: '',
        VATNo: '',
        IsPEP: ''
      },
      EducationAndProfession: {
        Profession: '',
        EducationLevel: '',
        MyEducation: '',
        EmploymentMode: '',
        EmployedAt: '',
        CompanyName: '',
        AddressOfEmployer: ''
      },
      WealthAndIncome: {
        OriginMittel: '',
        OriginVermoegen: '',
        AnnualNetIncome: '',
        BankTransferOrigin: '',
        ClientBank: '',
        ClientIban: '',
        Amount: ''
      }
    };

    const result = AcceptConsentSchema.validate(dataWithEmptyStrings);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid email format', () => {
    const invalidEmailData = {
      PersonalDetails: {},
      Address: {
        Email: 'invalid-email'
      },
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(invalidEmailData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('email');
  });

  it('should reject invalid salutation', () => {
    const invalidSalutationData = {
      PersonalDetails: {
        Salutation: 'Invalid'
      },
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(invalidSalutationData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('must be one of');
  });

  it('should reject invalid education level', () => {
    const invalidEducationData = {
      PersonalDetails: {},
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {
        EducationLevel: 'Invalid Level'
      },
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(invalidEducationData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('must be one of');
  });

  it('should reject invalid bank transfer origin', () => {
    const invalidBankTransferData = {
      PersonalDetails: {},
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {
        BankTransferOrigin: 'maybe'
      }
    };

    const result = AcceptConsentSchema.validate(invalidBankTransferData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('must be one of');
  });

  it('should accept valid wealth origin array', () => {
    const validWealthOriginData = {
      PersonalDetails: {},
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {
        OriginMittel: ['Dividends', 'Business profits', 'Heritage']
      }
    };

    const result = AcceptConsentSchema.validate(validWealthOriginData);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid wealth origin values', () => {
    const invalidWealthOriginData = {
      PersonalDetails: {},
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {
        OriginMittel: ['Invalid Source']
      }
    };

    const result = AcceptConsentSchema.validate(invalidWealthOriginData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('must be one of');
  });

  it('should validate date fields correctly', () => {
    const validDateData = {
      PersonalDetails: {
        DateOfBirth: '1990-01-01'
      },
      Address: {},
      IdentificationDocument: {
        PpIssueDate: '2020-01-01T00:00:00.000Z',
        PpExpiryDate: '2030-01-01T00:00:00.000Z'
      },
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(validDateData);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid date format', () => {
    const invalidDateData = {
      PersonalDetails: {
        DateOfBirth: 'invalid-date'
      },
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(invalidDateData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('date');
  });

  it('should validate boolean fields correctly', () => {
    const validBooleanData = {
      PersonalDetails: {},
      Address: {},
      IdentificationDocument: {
        IsPEP: true
      },
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(validBooleanData);
    expect(result.error).toBeUndefined();
  });

  it('should validate numeric fields correctly', () => {
    const validNumericData = {
      PersonalDetails: {
        NumberOfDependentChildren: 3
      },
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {
        Amount: 75000
      }
    };

    const result = AcceptConsentSchema.validate(validNumericData);
    expect(result.error).toBeUndefined();
  });

  it('should reject negative number of dependent children', () => {
    const invalidNumberData = {
      PersonalDetails: {
        NumberOfDependentChildren: -1
      },
      Address: {},
      IdentificationDocument: {},
      EducationAndProfession: {},
      WealthAndIncome: {}
    };

    const result = AcceptConsentSchema.validate(invalidNumberData);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('must be greater than or equal to 0');
  });
});