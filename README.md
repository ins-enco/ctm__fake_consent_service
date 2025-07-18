# Broker Consent Workflow System

A streamlined Nuxt 3 application providing broker consent and authentication services for integrating with CTM broker platform.

## 🎯 Overview

This application provides a focused broker consent workflow with three main features:

1. **Broker Authentication** - Login page for broker credentials
2. **Consent Approval Process** - Detailed consent form for data sharing approval
3. **Callback URL Verification** - Development testing interface for URL validation

## 🚀 Features

### Core Consent Workflow
- **Broker Login Services** (`/broker-consent-services`) - Authentication with query parameter validation
- **Consent Approval** (`/approve-consent-process`) - User data sharing consent with CTM
- **Dev Testing Dashboard** (`/accept-consent-dev-test/dashboard`) - Callback URL validation for integration testing

### API Endpoints
- `GET /api/brokers` - Retrieve MT4 trading data (daily, users, trades)
- `POST /api/user/consent/accept.json` - Process consent approval with validation
- `GET /api/hello` - Health check endpoint

## 📋 Prerequisites

- Node.js 18+ 
- MySQL database
- npm/pnpm/yarn package manager

## ⚙️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd pammboo2
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="mysql://username:password@host:port/database_name"

# CTM API Configuration  
CTM_API_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Development Server

Start the development server on `http://localhost:3000`:

```bash
npm run dev
```

### 5. Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Start production server
node .output/server/index.mjs
```

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
  "accountId": 456,
  "strategyId": 101,
  "approved": true,
  "userData": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Broker Data API

```bash
GET /api/brokers
```

Returns MT4 trading data including daily records, user information, and trade history.

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
docker build -t pammboo2 .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:port/db" \
  -e CTM_API_URL="http://localhost:3000" \
  pammboo2
```

## 🧪 Testing

```bash
# Run test suite
npm test
```

The test suite validates:
- Consent form validation logic
- API endpoint responses
- Database connection integrity

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
│   │   ├── brokers.ts                     # MT4 data endpoint
│   │   └── user/consent/
│   │       └── accept.json.post.ts        # Consent API
│   └── utils/
│       └── schema/
│           └── AcceptConsentSchema.ts     # Validation schema
├── prisma/
│   └── schema.prisma                      # Database schema
└── docker-compose.yml                     # Container setup
```

## 🛠️ Development

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database (development only)
npx prisma migrate reset

# Deploy to production
npx prisma migrate deploy
```

### Code Formatting

```bash
# Format code with Prettier
npx prettier --write .
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | MySQL connection string | Yes |
| `CTM_API_URL` | CTM API base URL | Yes |
| `HOST_PORT` | Docker host port mapping | No (Docker only) |
| `CONTAINER_NAME` | Docker container name | No (Docker only) |

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database connectivity
   npx prisma db pull
   ```

2. **Prisma Client Not Generated**
   ```bash
   # Regenerate client
   npx prisma generate
   ```

3. **Build Errors**
   ```bash
   # Clear cache and rebuild
   rm -rf .nuxt .output node_modules
   npm install
   npm run build
   ```

### Docker Issues

1. **Container Won't Start**
   ```bash
   # Check logs
   docker-compose logs app
   
   # Rebuild image
   docker-compose build --no-cache
   ```

2. **Database Connection in Docker**
   - Ensure `DATABASE_URL` uses correct host (not localhost in containers)
   - Use service names for internal container communication

## 📚 Additional Resources

- [Nuxt 3 Documentation](https://nuxt.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🆘 Support

For technical support or questions about the broker consent workflow:

1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs -f`
3. Validate environment variables and database connectivity