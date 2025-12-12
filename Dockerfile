FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (Railway uses PORT env var, defaults to 3000)
EXPOSE 3000

# Start command
CMD ["npm", "start"]
