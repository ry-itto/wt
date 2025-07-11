FROM node:18-bullseye

# Install basic development tools
RUN apt-get update && apt-get install -y \
    git \
    zsh \
    curl \
    wget \
    build-essential \
    locales \
    && rm -rf /var/lib/apt/lists/*

# Set locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && \
    locale-gen
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# Install fzf
RUN git clone --depth 1 https://github.com/junegunn/fzf.git /opt/fzf && \
    /opt/fzf/install --all --no-bash --no-fish && \
    ln -s /opt/fzf/bin/fzf /usr/local/bin/fzf

# Install ghq
RUN wget -O /tmp/ghq.tar.gz https://github.com/x-motemen/ghq/releases/latest/download/ghq_linux_amd64.tar.gz && \
    tar -xzf /tmp/ghq.tar.gz -C /tmp && \
    mv /tmp/ghq_linux_amd64/ghq /usr/local/bin/ghq && \
    chmod +x /usr/local/bin/ghq && \
    rm -rf /tmp/ghq*

# Create non-root user
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure node user has correct UID/GID
RUN groupmod --gid $USER_GID $USERNAME \
    && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
    && chown -R $USER_UID:$USER_GID /home/$USERNAME

# Install global npm packages
RUN npm install -g typescript tsx @types/node

# Set up zsh for the node user
USER $USERNAME
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Add fzf key bindings and completion to zsh
RUN echo '[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh' >> ~/.zshrc && \
    /opt/fzf/install --key-bindings --completion --no-bash --no-fish --no-update-rc

# Configure ghq root
RUN mkdir -p ~/ghq && \
    git config --global ghq.root ~/ghq

# Switch back to root for potential system-level operations
USER root

# Set the default shell to zsh
RUN chsh -s $(which zsh) $USERNAME

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspace

# Ensure zsh is the default shell for the container
SHELL ["/bin/zsh", "-c"]
CMD ["/bin/zsh"]