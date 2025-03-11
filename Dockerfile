FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy-peer-deps
RUN npm install --legacy-peer-deps

# Copy rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV TZ=Asia/Jakarta

# Start the application
CMD ["npm", "start"] 