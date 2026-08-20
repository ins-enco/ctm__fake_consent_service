/**
 * Pre-filled KYC personal-information draft.
 *
 * Why this exists separately from the broker handover
 * --------------------------------------------------
 * A real broker's consent handover lands in UserBrokerConsents.UserRawData as
 * datasource1/datasource2. But nothing on the CTM side reads those: the draft
 * the KYC form loads comes solely from the KYCInfo table —
 * SfKycPersonalInfoService.GetDraftAsync does
 *
 *     scaffold.Kycinfos.FirstOrDefaultAsync(k => k.UserId == userId)
 *     return ProjectDraft(kyc ?? new Kycinfo())
 *
 * so a consent row alone leaves every field blank. To make fields actually
 * skippable the values have to be written into KYCInfo itself.
 *
 * Two shapes, because ProjectDraft reads from two places:
 *   `columns`  — real KYCInfo columns, mapped 1:1 by ProjectDraft.
 *   `jsonData` — the KYCInfo.JsonData blob, read via KycJsonHelper. It is a
 *                FLAT object and the readers are type-strict:
 *                  ReadField       → JSON string only
 *                  ReadInt         → JSON number (int)
 *                  ReadDouble      → JSON number (double)
 *                  ReadStringArray → JSON array of strings
 *                A number written as "2" instead of 2 reads back as null and
 *                the field silently stays empty.
 *
 * Enum values are the ones the submit DTOs accept, so a pre-filled form can be
 * submitted unchanged rather than failing validation on data we supplied:
 *   Salutation      "Mr." | "Ms."                       (note the period)
 *   DocumentType    "Passport" | "ID card" | "Residence permit"
 *   EducationLevel  "High-school diploma" | "Bachelor" | "Master" | "Other"
 *   EmploymentType  "Self-employed / Freelance" | "Employed" | "Retired"
 * Dates are "yyyy-MM-dd" (SfKycPersonalInfoService.DateFormat).
 *
 * Conditional rules from ValidateConditionalFields are respected:
 *   EducationLevel "Other"                        → OtherEducationLevel required
 *   EmploymentType Employed / Self-employed       → Profession required
 *   EmploymentType "Retired"                      → professionBeforeRetirement required
 * "Master" + "Employed" + a Profession is chosen so none of the extra
 * requirements are triggered.
 */

export interface KycDraftFixture {
  columns: Record<string, string | number | null>;
  jsonData: Record<string, unknown>;
}

export function buildKycDraft(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
}> = {}): KycDraftFixture {
  return {
    columns: {
      ClientSex: "Mr.",
      Title: "PhD",
      FirstName: overrides.firstName ?? "John",
      LastName: overrides.lastName ?? "Doe",
      DateOfBirth: "1990-01-15",
      CountryOfBirth: "USA",

      Address: "Main St", // street only — houseNumber lives in JsonData
      ExtraAddress: "Apartment 5B",
      City: "New York",
      Zip: "10001",
      Country: "USA",

      Email: overrides.email ?? "john.doe@example.com",
      Phone: "+1-987-654-3210",

      Passport: "Passport",
      PpNo: "P987654321",
      PpIssueDate: "2015-06-20",
      PpExpiryDate: "2030-06-19",
      TaxResidency: "USA",
      Citizenship: "American",
      IsPEP: 0,

      EducationLevel: "Master",
      MyEducation: null, // only required when EducationLevel is "Other"
      EmploymentMode: "Employed",
      Profession: "Software Developer",
    },
    jsonData: {
      birthName: "Jonathan",
      placeOfBirth: "New York",
      numberOfDependantChildren: 2, // number, not "2"
      houseNumber: "123",
      taxNumber: "US123456789",
      // professionBeforeRetirement omitted — only required when Retired
      originOfInvestedMoney: ["Business profits", "Heritage"],
      annualIncome: 75000, // number, not "75000"
    },
  };
}
