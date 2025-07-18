# Stage 1 - Step 1: Use an official Node.js image
FROM node:22-alpine AS build

ARG DATABASE_URL=""
ENV DATABASE_URL=$DATABASE_URL

ARG CTM_API_URL=""
ENV CTM_API_URL=$CTM_API_URL

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json files to the container
COPY package*.json ./
COPY prisma ./prisma/

# Install the dependencies
RUN npm install

# Copy the app's source code to the container
COPY . .

# Generate Prisma client and build the Nuxt.js application
RUN npx prisma generate
RUN npm run build


# Stage 2: Create the final image for production
FROM node:22-alpine AS production

RUN apk add --no-cache openssl3

ARG DATABASE_URL=""
ENV DATABASE_URL=$DATABASE_URL

ARG CTM_API_URL=""
ENV CTM_API_URL=$CTM_API_URL
# Set the working directory in the final image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy Prisma schema and migrations (required for migration and Prisma Client)
COPY --from=build /usr/src/app/prisma ./prisma

# Copy the output folder from the build stage
COPY --from=build /usr/src/app/.output ./.output

# Run Prisma migrations to ensure the database is up-to-date
CMD ["sh", "-c", "npx prisma migrate deploy && node .output/server/index.mjs"]

# Expose the port Nuxt.js listens on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production