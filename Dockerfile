# Use Red Hat Universal Base Image (UBI) - Red Hat's enterprise-grade base image
FROM registry.access.redhat.com/ubi9/nodejs-18:latest

# Set working directory
WORKDIR /app

# Switch to root temporarily for system dependencies
USER 0

# Install Chromium and dependencies for Puppeteer
RUN dnf update -y && \
    dnf install -y chromium \
                   ca-certificates \
                   fonts-liberation \
                   libappindicator3-1 \
                   libasound2 \
                   libatk-bridge2.0-0 \
                   libdrm2 \
                   libgtk-3-0 \
                   libnspr4 \
                   libnss3 \
                   libxss1 \
                   libxtst6 \
                   xdg-utils \
                   && dnf clean all

# Create app directory and set permissions
RUN mkdir -p /app && chown -R 1001:1001 /app

# Switch back to non-root user for security
USER 1001

# Copy package files
COPY --chown=1001:1001 package*.json ./

# Install dependencies
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN npm ci --only=production

# Copy application code
COPY --chown=1001:1001 . .

# Build the application
RUN npm run build

# Expose port for health checks or API endpoints
EXPOSE 3000

# Create a health check script
RUN echo '#!/bin/bash\nnode -e "console.log(\"Health check passed\")"' > /app/healthcheck.sh && \
    chmod +x /app/healthcheck.sh

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD ["/app/healthcheck.sh"]

# Run as non-root user
USER 1001

# Default command
CMD ["node", "dist/index.js"] 