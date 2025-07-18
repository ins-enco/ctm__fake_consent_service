# Migration Guide: Moving to CTM Fake Consent Service Repository

This guide provides step-by-step instructions for migrating the current broker consent workflow code to the new `ctm__fake_consent_service` repository.

## 📋 Prerequisites

- Git installed on your system
- Access to both repositories:
  - Source: `ins-enco/pammboo2`
  - Target: `ins-enco/ctm__fake_consent_service`

## 🚀 Migration Steps

### 1. Prepare the Target Repository

```bash
# Clone the new repository
git clone https://github.com/ins-enco/ctm__fake_consent_service.git
cd ctm__fake_consent_service

# Create a new branch for the migration
git checkout -b migrate-consent-service
```

### 2. Copy Core Files from Source Repository

Copy the following files and directories from the current `pammboo2` repository:

#### Root Configuration Files
```bash
# Copy these files to the root of the new repository
cp /path/to/pammboo2/.env.example ./
cp /path/to/pammboo2/.dockerignore ./
cp /path/to/pammboo2/.gitignore ./
cp /path/to/pammboo2/.prettierrc ./
cp /path/to/pammboo2/docker-compose.yml ./
cp /path/to/pammboo2/docker-compose.dev.yml ./
cp /path/to/pammboo2/Dockerfile ./
cp /path/to/pammboo2/Dockerfile.prisma-studio ./
cp /path/to/pammboo2/jest.config.js ./
cp /path/to/pammboo2/nuxt.config.ts ./
cp /path/to/pammboo2/package.json ./
cp /path/to/pammboo2/package-lock.json ./
cp /path/to/pammboo2/README.md ./
cp /path/to/pammboo2/setup.sh ./
cp /path/to/pammboo2/tailwind.config.js ./
cp /path/to/pammboo2/tsconfig.json ./
cp /path/to/pammboo2/tsconfig.jest.json ./
```

#### Application Directory
```bash
# Copy the entire app directory
cp -r /path/to/pammboo2/app ./
```

#### Server Directory
```bash
# Copy the entire server directory
cp -r /path/to/pammboo2/server ./
```

#### Database Schema
```bash
# Copy the Prisma directory
cp -r /path/to/pammboo2/prisma ./
```

#### Configuration Directory
```bash
# Copy the configs directory
cp -r /path/to/pammboo2/configs ./
```

#### Public Assets
```bash
# Copy the public directory
cp -r /path/to/pammboo2/public ./
```

### 3. Update Package.json

Update the `package.json` file in the new repository:

```json
{
  "name": "ctm-fake-consent-service",
  "version": "1.0.0",
  "description": "CTM Fake Consent Service - Streamlined broker consent workflow",
  "repository": {
    "type": "git",
    "url": "https://github.com/ins-enco/ctm__fake_consent_service.git"
  },
  "homepage": "https://github.com/ins-enco/ctm__fake_consent_service",
  "bugs": {
    "url": "https://github.com/ins-enco/ctm__fake_consent_service/issues"
  }
}
```

### 4. Update README.md

Update the README.md file with the new repository information:

```markdown
# CTM Fake Consent Service

A streamlined Nuxt 3 application providing broker consent and authentication services for integrating with CTM platform.

## 🎯 Overview

This application provides a focused broker consent workflow with three main features:

1. **Broker Authentication** - Login page for broker credentials
2. **Consent Approval Process** - Detailed consent form for data sharing approval
3. **Callback URL Verification** - Development testing interface for URL validation

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/ins-enco/ctm__fake_consent_service.git
cd ctm__fake_consent_service

# Run the setup script
./setup.sh

# Or use Docker Compose
docker-compose up -d
```

The application will be available at `http://localhost:3000`.
```

### 5. Verify File Structure

After copying, your new repository should have this structure:

```
ctm__fake_consent_service/
├── .env.example
├── .dockerignore
├── .gitignore
├── .prettierrc
├── Dockerfile
├── Dockerfile.prisma-studio
├── README.md
├── docker-compose.yml
├── docker-compose.dev.yml
├── jest.config.js
├── nuxt.config.ts
├── package.json
├── package-lock.json
├── setup.sh
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.jest.json
├── app/
│   ├── layouts/
│   │   └── broker-consent.vue
│   ├── middleware/
│   │   └── broker-consent-middleware.ts
│   ├── pages/
│   │   ├── broker-consent-services.vue
│   │   ├── approve-consent-process.vue
│   │   └── accept-consent-dev-test/
│   │       └── dashboard.vue
│   └── components/
│       └── general/
│           └── Sidebar.vue
├── server/
│   ├── api/
│   │   ├── brokers.ts
│   │   ├── hello.ts
│   │   └── user/
│   │       └── consent/
│   │           └── accept.json.post.ts
│   └── utils/
│       └── schema/
│           └── AcceptConsentSchema.ts
├── prisma/
│   └── schema.prisma
├── configs/
│   └── database.ts
└── public/
    └── (static assets)
```

### 6. Install Dependencies and Test

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Test the application
npm run dev
```

### 7. Commit and Push Changes

```bash
# Add all files
git add .

# Commit the migration
git commit -m "Initial migration: Add CTM fake consent service from pammboo2

- Core consent workflow with 3 main features
- Broker authentication, consent approval, callback verification
- Complete Docker setup with development environment
- Comprehensive documentation and setup scripts"

# Push to the new repository
git push origin migrate-consent-service
```

### 8. Create Pull Request

Create a pull request in the new repository to merge the migration changes.

## 🔧 Post-Migration Tasks

### 1. Update Environment Variables

Create a `.env` file and update the following variables:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@host:port/database_name"

# CTM API Configuration
CTM_API_URL="http://localhost:3000"

# Optional Docker Configuration
HOST_PORT=3000
CONTAINER_NAME=ctm-fake-consent-service
```

### 2. Database Setup

```bash
# Run database migrations
npx prisma migrate deploy

# (Optional) Seed database if needed
npx prisma db seed
```

### 3. Test Core Features

Verify that all three core features work correctly:

1. **Broker Authentication**: `http://localhost:3000/broker-consent-services?userId=123&accountId=456&brokerId=789&strategyId=101`
2. **Consent Approval**: `http://localhost:3000/approve-consent-process`
3. **Callback Verification**: `http://localhost:3000/accept-consent-dev-test/dashboard?userId=123&accountId=456&brokerId=789&strategyId=101&consentApprove=yes`

### 4. API Testing

Test the API endpoints:

```bash
# Health check
curl http://localhost:3000/api/hello

# Broker data
curl http://localhost:3000/api/brokers

# Consent acceptance
curl -X POST http://localhost:3000/api/user/consent/accept.json?userId=123&brokerId=789 \
  -H "Content-Type: application/json" \
  -d '{"accountId": 456, "strategyId": 101, "approved": true, "userData": {"name": "John Doe", "email": "john@example.com"}}'
```

## 📚 Additional Resources

- [Original Repository](https://github.com/ins-enco/pammboo2)
- [New Repository](https://github.com/ins-enco/ctm__fake_consent_service)
- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Docker Documentation](https://docs.docker.com/)

## 🆘 Support

If you encounter issues during migration:

1. Check file permissions and ensure all files copied correctly
2. Verify environment variables are properly set
3. Test database connectivity
4. Review application logs for any errors

For technical support, refer to the troubleshooting section in the README.md file.