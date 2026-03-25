# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm install; \
  elif [ -f package-lock.json ]; then npm install; \
  else npm install; \
  fi

# Copy project files
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "run", "start"]
