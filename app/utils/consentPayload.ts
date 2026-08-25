/**
 * The mock consent payload posted to `/api/user/consent/accept.json`.
 *
 * Kept here rather than inline in the page so the payload the UI actually
 * sends is the same object the tests validate against AcceptConsentSchema.
 * Every enum value below must stay within the schema's `valid()` sets —
 * see server/utils/schema/AcceptConsentSchema.ts.
 */
export const SAMPLE_CONSENT_PAYLOAD = {
  PersonalDetails: {
    ID: "123456",
    UserID: "user_001",
    Salutation: "Mr",
    Title: "PhD",
    FirstName: "John",
    LastName: "Doe",
    BirthName: "Jonathan",
    DateOfBirth: "1990-01-15",
    PlaceOfBirth: "New York",
    CountryOfBirth: "USA",
    NumberOfDependentChildren: 2,
  },
  Address: {
    Street: "Main St",
    ExtraAddress: "Apartment 5B",
    HouseNumber: "123",
    Zip: "10001",
    City: "New York",
    Country: "USA",
    Citizenship: "American",
    Email: "john.doe@example.com",
    Fax: "+1-123-456-7890",
    Phone: "+1-987-654-3210",
  },
  IdentificationDocument: {
    Passport: "Passport",
    PpNo: "P987654321",
    PpIssueDate: "2015-06-20",
    PpExpiryDate: "2025-06-19",
    TaxResidency: "USA",
    VATNo: "US123456789",
    IsPEP: false,
  },
  EducationAndProfession: {
    Profession: "Software Developer",
    EducationLevel: "Master",
    MyEducation: "Computer Science",
    EmploymentMode: "Employed",
    EmployedAt: "Tech Solutions Inc.",
    CompanyName: "Tech Solutions",
    AddressOfEmployer: "456 Tech Avenue, Silicon Valley, CA",
  },
  WealthAndIncome: {
    // "Salary" is not a permitted origin — the schema allows only
    // Dividends / Business profits / Other profits / Heritage.
    OriginMittel: ["Business profits", "Other profits", "Heritage"],
    OriginVermoegen: "Savings",
    AnnualNetIncome: "75000",
    // Schema expects lowercase "yes" / "no".
    BankTransferOrigin: "yes",
    ClientBank: "Bank of America",
    ClientIban: "US12345678901234567890",
    Amount: "15000",
  },
};
