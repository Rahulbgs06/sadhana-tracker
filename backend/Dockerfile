FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - fallback to npm install if ci fails
RUN npm ci --only=production || npm install --only=production

# Copy application code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
