# Use an official Node.js runtime as a parent image
FROM node

# Set the working directory in the container
WORKDIR /app

# Create directories for WhatsApp media and session data
RUN mkdir -p /app/Documents/WhatsappMedia /app/.wwebjs_auth

# Install system dependencies required for whatsapp-web.js (Puppeteer) and wget
# Also, clean up apt-get cache to reduce image size
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils && \
    rm -rf /var/lib/apt/lists/*

# Install npm dependencies
RUN npm install whatsapp-web.js qrcode express axios dotenv node-linq

# Download your application files from the repository
RUN wget https://raw.githubusercontent.com/Wilco20004/Linux-Scripts/refs/heads/main/index.js && \
    wget https://raw.githubusercontent.com/Wilco20004/Linux-Scripts/refs/heads/main/server.js

# Set environment variables for your application
ENV ServerIP=http://192.168.10.3
ENV InstanceID=3064

# Define a volume for session data to persist it
VOLUME /app/.wwebjs_auth

# Expose port 80 to allow external access to the server
EXPOSE 80

# Define the command to run your application
CMD ["node", "index.js"]
