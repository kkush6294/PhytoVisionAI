FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose Express port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server.js"]

