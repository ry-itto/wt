# Base image with Ubuntu 22.04
FROM ubuntu:22.04

# Arguments for customization
ARG NODE_VERSION=20
ARG DEBIAN_FRONTEND=noninteractive

# Set working directory
WORKDIR /app

# Update and install base dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    zsh \
    bash \
    sudo \
    build-essential \
    unzip \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js from NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install fzf
RUN apt-get update && apt-get install -y fzf \
    && rm -rf /var/lib/apt/lists/*

# Install ghq
RUN wget https://github.com/x-motemen/ghq/releases/download/v1.6.2/ghq_linux_amd64.zip \
    && unzip -j ghq_linux_amd64.zip '*/ghq' -d /usr/local/bin/ \
    && chmod +x /usr/local/bin/ghq \
    && rm ghq_linux_amd64.zip

# Create a non-root user for running tests
RUN useradd -m -s /bin/bash testuser \
    && echo "testuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Copy package files first for better caching
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the project files
COPY . .

# Build the project
RUN npm run build

# Set up environment variables
ENV CI=true
ENV NODE_ENV=test

# Switch to non-root user
USER testuser

# Default command runs the e2e shell tests
CMD ["bash", "tests/e2e-shell/run-all-tests.sh"]