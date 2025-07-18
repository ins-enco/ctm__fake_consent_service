import Joi from "joi";

const AcceptConsentSchema = Joi.object({
  PersonalDetails: Joi.object({
    ID: Joi.string().allow(""),
    UserID: Joi.string().allow(""),
    Salutation: Joi.string().valid("Mr", "Ms", "Mrs", "Other").allow(""),
    Title: Joi.string().valid("PhD", "Prof").allow(""),
    FirstName: Joi.string().allow(""),
    LastName: Joi.string().allow(""),
    BirthName: Joi.string().allow(""),
    DateOfBirth: Joi.date().iso().allow(""),
    PlaceOfBirth: Joi.string().allow(""),
    CountryOfBirth: Joi.string().allow(""),
    NumberOfDependentChildren: Joi.number().integer().min(0).allow(null, ""),
  }),
  Address: Joi.object({
    Street: Joi.string().allow(""),
    ExtraAddress: Joi.string().allow(""),
    HouseNumber: Joi.string().allow(""),
    Zip: Joi.string().allow(""),
    City: Joi.string().allow(""),
    Country: Joi.string().allow(""),
    Citizenship: Joi.string().allow(""),
    Email: Joi.string().email().allow(""),
    Fax: Joi.string().allow(""),
    Phone: Joi.string().allow(""),
  }),
  IdentificationDocument: Joi.object({
    Passport: Joi.string()
      .valid(
        "Driver's License",
        "Passport",
        "National ID",
        "Other Proof of Identification",
      )
      .allow(""),
    PpNo: Joi.string().allow(""),
    PpIssueDate: Joi.date().iso().allow(""),
    PpExpiryDate: Joi.date().iso().allow(""),
    TaxResidency: Joi.string().allow(""),
    VATNo: Joi.string().allow(""),
    IsPEP: Joi.boolean().allow(null, ""),
  }),
  EducationAndProfession: Joi.object({
    Profession: Joi.string().allow(""),
    EducationLevel: Joi.string()
      .valid("High-school diploma", "Bachelor", "Master", "Other")
      .allow(""),
    MyEducation: Joi.string().allow(""),
    EmploymentMode: Joi.string()
      .valid("Retired", "Self-employed / Freelance", "Employed")
      .allow(""),
    EmployedAt: Joi.string().allow(""),
    CompanyName: Joi.string().allow(""),
    AddressOfEmployer: Joi.string().allow(""),
  }),
  WealthAndIncome: Joi.object({
    OriginMittel: Joi.array()
      .items(
        Joi.string().valid(
          "Dividends",
          "Business profits",
          "Other profits",
          "Heritage",
        ),
      )
      .allow(null, ""),
    OriginVermoegen: Joi.string().allow(""),
    AnnualNetIncome: Joi.string().allow(""),
    BankTransferOrigin: Joi.string().valid("yes", "no").allow(""),
    ClientBank: Joi.string().allow(""),
    ClientIban: Joi.string().allow(""),
    Amount: Joi.number().allow(null, ""),
  }),
});

export default AcceptConsentSchema;
