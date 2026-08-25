# Stage 1: Build the Nuxt.js application
FROM node:22-alpine AS build

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json files to the container
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the app's source code to the container
COPY . .

# Build the Nuxt.js application
RUN npm run build


# Stage 2: Create the final image for production
FROM node:22-alpine AS production

# Set the working directory in the final image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy the output folder from the build stage
COPY --from=build /usr/src/app/.output ./.output

# Expose the port Nuxt.js listens on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

CMD ["node", ".output/server/index.mjs"]
