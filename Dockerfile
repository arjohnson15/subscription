# Use Node.js base image
FROM node:16

# Set working directory in container
WORKDIR /usr/src/app

# Copy package files first to optimize caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Expose the app's port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
