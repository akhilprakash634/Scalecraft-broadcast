FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application code
COPY . .

# Create volume for persistent storage (sales.json)
VOLUME [ "/app/data" ]

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production
ENV DATA_DIR=/app/data

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
