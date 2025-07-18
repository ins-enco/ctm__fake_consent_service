<template>
  <div class="flex h-full items-center justify-center">
    <div
      class="w-[800px]! rounded-lg p-8 shadow-xl dark:bg-[#151419]"
      style="max-width: 800px"
    >
      <h2 class="mb-4 text-3xl font-bold">Approval Consent</h2>

      <p class="mb-6 text-lg">
        In order to proceed, we need your consent to share your information with
        our trusted broker, CTM. Please read the details below carefully:
      </p>

      <!-- Information about consent -->
      <div class="mb-6 rounded-lg p-4">
        <h3 class="text-xl font-semibold">Why We Need Your Consent</h3>
        <p class="mt-2 italic text-yellow-600">
          We will share your basic personal information, such as your name,
          email, and contact details, with CTM to help them provide you with
          better services and financial recommendations.
        </p>
        <p class="mt-2 italic text-yellow-600">
          Your information will be handled with utmost confidentiality, and you
          can withdraw your consent at any time by contacting our support team.
        </p>
      </div>

      <!-- Consent agreement -->
      <div class="mb-6 flex items-center">
        <input
          type="checkbox"
          id="approve-consent"
          v-model="isConsentApproved"
          class="mr-2 h-4 w-4 rounded border-gray-300"
        />
        <label for="approve-consent" class="text-sm">
          I approve sharing my information with CTM for better services.
        </label>
      </div>

      <!-- Action Buttons -->
      <div class="flex justify-between">
        <button
          @click="handleDecline"
          class="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
        >
          Decline
        </button>
        <button
          :disabled="!isConsentApproved"
          @click="handleApprove"
          class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-700"
        >
          Approve
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: "broker-consent",
  title: "Broker Consent",
  description: "Login to your account to approve consent",
  middleware: ["broker-consent-middleware"],
  pageTransition: {
    name: "rotate",
  },
});

const {
  public: { apiUrl },
} = useRuntimeConfig();

const router = useRouter();
const toast = useToast();
const { isLoading, hideLoader, showLoader } = useLoader();
const isConsentApproved = ref(false);
// Handle consent approval
const handleApprove = async () => {
  const { userId, accountId, brokerId, strategyId } =
    router.currentRoute.value.query;
  if (!userId || !accountId || !strategyId || !brokerId) {
    return;
  }
  try {
    showLoader();
    const data = await fetch(
      `${apiUrl}/api/user/consent/accept.json?userId=${userId}&brokerId=${brokerId}`,
      {
        method: "POST",
        body: JSON.stringify({
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
            OriginMittel: ["Salary", "Business profits", "Heritage"],
            OriginVermoegen: "Savings",
            AnnualNetIncome: "75000",
            BankTransferOrigin: "Yes",
            ClientBank: "Bank of America",
            ClientIban: "US12345678901234567890",
            Amount: "15000",
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (data.status === 200) {
      toast.add({
        id: "consent_success",
        title: "Success",
        description: `Your consent has been saved successfully.`,
        color: "green",
      });
      // Redirect user to the next step
      window.location.href = `${document.referrer}dashboard?brokerId=${brokerId}&userId=${userId}&accountId=${accountId}&strategyId=${strategyId}&consentApproved=true`;
    } else {
      toast.add({
        id: "consent_error",
        title: "Error",
        description: `An error occurred while saving your consent. Please try again`,
        color: "red",
      });
    }
  } catch (error) {
    toast.add({
      id: "consent_error",
      title: "Error",
      description: `An error occurred while saving your consent. Please try again`,
      color: "red",
    });
  } finally {
    hideLoader();
  }
};

const handleDecline = () => {
  window.location.href = `${document.referrer}dashboard?consentApproved=false`;
};
</script>

<style scoped>
/* Optional: Add custom styles if needed */
</style>
