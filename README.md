# CTM Fake Consent Service

A streamlined Nuxt 3 application providing fake broker consent and authentication services for testing and development with the CTM platform.

## 🎯 Overview

This application provides a focused fake broker consent workflow with three main features:

1. **Broker Authentication** - Login page for broker credentials
2. **Consent Approval Process** - Detailed consent form for data sharing approval
3. **Callback URL Verification** - Development testing interface for URL validation

## 🚀 Features

### Core Consent Workflow
- **Broker Login Services** (`/broker-consent-services`) - Authentication with query parameter validation
- **Consent Approval** (`/approve-consent-process`) - User data sharing consent with CTM
- **Dev Testing Dashboard** (`/accept-consent-dev-test/dashboard`) - Callback URL validation for integration testing

### API Endpoints
- `GET /api/brokers` - Retrieve mock MT4 trading data (daily, users, trades)
- `POST /api/user/consent/accept.json` - Process consent approval with validation
- `GET /api/hello` - Health check endpoint

## 📋 Prerequisites

- Node.js 18+ 
- npm/pnpm/yarn package manager

## ⚙️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/ins-enco/ctm__fake_consent_service.git
cd ctm__fake_consent_service
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# CTM API Configuration  
CTM_API_URL="http://localhost:3000"

# Application Configuration
APPNAME="CTM Fake Consent Service"
BASE_URL="http://localhost:3000"
```

### 3. Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

### 4. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
node .output/server/index.mjs
```

## 🧪 Testing

Run the unit test suite:

```bash
npm test
```

The test suite validates:
- Mock API endpoint responses
- Consent form validation logic
- Schema validation for user data
- API response structures

## 🔧 Usage Guide

### Broker Consent Workflow

#### Step 1: Broker Authentication
Navigate to `/broker-consent-services` with required query parameters:

```
/broker-consent-services?userId=123&accountId=456&brokerId=789&strategyId=101
```

**Required Parameters:**
- `userId` - Unique user identifier
- `accountId` - Trading account ID
- `brokerId` - Broker identifier
- `strategyId` - Trading strategy ID

#### Step 2: Consent Approval
After authentication, users are redirected to `/approve-consent-process` where they:

- Review data sharing terms with CTM
- Approve or decline information sharing
- Submit consent decision

#### Step 3: Callback Verification (Development)
Use `/accept-consent-dev-test/dashboard` to test callback URLs with parameters:

```
/accept-consent-dev-test/dashboard?userId=123&accountId=456&brokerId=789&strategyId=101&consentApprove=yes
```

**Validation Rules:**
- `userId`, `accountId`, `brokerId`, `strategyId` must be numbers
- `consentApprove` must be "yes" or "no"

### API Integration

#### Consent Acceptance API

```bash
POST /api/user/consent/accept.json?userId=123&brokerId=789
Content-Type: application/json

{
  "PersonalDetails": {
    "FirstName": "John",
    "LastName": "Doe",
    "Email": "john@example.com"
  },
  "Address": {
    "Street": "123 Main St",
    "City": "New York",
    "Country": "USA"
  },
  "IdentificationDocument": {
    "Passport": "Passport",
    "PpNo": "P123456789"
  },
  "EducationAndProfession": {
    "Profession": "Software Engineer"
  },
  "WealthAndIncome": {
    "Amount": 50000
  }
}
```

#### Broker Data API

```bash
GET /api/brokers
```

Returns mock MT4 trading data including daily records, user information, and trade history.

## 🐳 Docker Deployment

### Docker Compose (Recommended)

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The application will be available at `http://localhost:3000`.

### Manual Docker Build

```bash
# Build image
docker build -t ctm-fake-consent-service .

# Run container
docker run -d \
  -p 3000:3000 \
  -e CTM_API_URL="http://localhost:3000" \
  ctm-fake-consent-service
```

## 📂 Project Structure

```
├── app/
│   ├── pages/
│   │   ├── broker-consent-services.vue    # Login page
│   │   ├── approve-consent-process.vue    # Consent form
│   │   └── accept-consent-dev-test/
│   │       └── dashboard.vue              # URL validation
│   ├── layouts/
│   │   └── broker-consent.vue             # Consent layout
│   └── middleware/
│       └── broker-consent-middleware.ts   # Auth middleware
├── server/
│   ├── api/
│   │   ├── brokers.ts                     # Mock MT4 data endpoint
│   │   ├── hello.ts                       # Health check endpoint
│   │   └── user/consent/
│   │       └── accept.json.post.ts        # Consent API
│   └── utils/
│       └── schema/
│           └── AcceptConsentSchema.ts     # Validation schema
├── tests/
│   ├── api/                               # API endpoint tests
│   └── schemas/                           # Schema validation tests
└── docker-compose.yml                     # Container setup
```

## 🛠️ Development

### Code Formatting

```bash
# Format code with Prettier
npx prettier --write .
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `CTM_API_URL` | CTM API base URL | Yes |
| `APPNAME` | Application name | No |
| `BASE_URL` | Base URL for the application | No |

## 🔍 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf .nuxt .output node_modules
   npm install
   npm run build
   ```

2. **Test Failures**
   ```bash
   # Run tests in verbose mode
   npm test -- --verbose
   ```

### Docker Issues

1. **Container Won't Start**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Rebuild image
   docker-compose build --no-cache
   ```

## 📚 Additional Resources

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Jest Testing Framework](https://jestjs.io/)

## 🆘 Support

For technical support or questions about the fake consent service:

1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs -f`
3. Run tests to validate functionality: `npm test`
4. Verify environment variables are properly set

## 📝 Changes Made

This service has been refactored from the original database-dependent version:

- ✅ Removed Prisma database dependencies
- ✅ Replaced database queries with mock data
- ✅ Added comprehensive unit tests
- ✅ Simplified setup (no database required)
- ✅ Maintained all original API interfaces
- ✅ Docker support for easy deployment