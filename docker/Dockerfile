# pre-build stage
FROM node:24-alpine as node
FROM ruby:3.4.4-alpine3.21 AS pre-builder

ARG NODE_VERSION="24.13.0"
ARG PNPM_VERSION="10.2.0"
ENV NODE_VERSION=${NODE_VERSION}
ENV PNPM_VERSION=${PNPM_VERSION}

# ARG default to production settings
# For development docker-compose file overrides ARGS
ARG BUNDLE_WITHOUT="development:test"
ENV BUNDLE_WITHOUT ${BUNDLE_WITHOUT}
ENV BUNDLER_VERSION=2.5.16

ARG RAILS_SERVE_STATIC_FILES=true
ENV RAILS_SERVE_STATIC_FILES ${RAILS_SERVE_STATIC_FILES}

ARG RAILS_ENV=production
ENV RAILS_ENV ${RAILS_ENV}

ARG NODE_OPTIONS="--max-old-space-size=2048 --openssl-legacy-provider"
ENV NODE_OPTIONS ${NODE_OPTIONS}

# algorythmo: build parallelism — lowered to survive 4GB-RAM VPS builds.
# Native gem compile (grpc, nokogiri) with -j 4 peaks at >4GB and OOM-kills the build.
ARG BUNDLE_JOBS=1
ARG BUNDLE_RETRIES=3

ENV BUNDLE_PATH="/gems"

RUN apk update && apk add --no-cache \
  openssl \
  tar \
  build-base \
  tzdata \
  postgresql-dev \
  postgresql-client \
  git \
  curl \
  xz \
  && mkdir -p /var/app \
  && gem install bundler -v "$BUNDLER_VERSION"

COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

RUN npm install -g pnpm@${PNPM_VERSION}

RUN echo 'export PNPM_HOME="/root/.local/share/pnpm"' >> /root/.shrc \
  && echo 'export PATH="$PNPM_HOME:$PATH"' >> /root/.shrc \
  && export PNPM_HOME="/root/.local/share/pnpm" \
  && export PATH="$PNPM_HOME:$PATH" \
  && pnpm --version

# Persist the environment variables in Docker
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# algorythmo: install the GBrain engine (Brain + Copiloto) into the image.
#
# GBrain is a BUN CLI (engines requires bun >=1.3.10; entrypoint src/cli.ts), NOT a
# Node/pnpm package — verified against garrytan/gbrain at the pinned SHA. It is pinned
# by 40-char commit SHA (ADR-0013); engines/algorythmo/GBRAIN_PINNED_SHA is the single
# source of truth, read here so the pin never drifts. bun + the global gbrain install
# live under a controlled prefix (/usr/local/bun) so the whole tree is COPY'd into the
# slim final stage. We do NOT pass --ignore-scripts: gbrain's postinstall is self-guarded
# (`command -v gbrain && ...` -> no-op during install) and @electric-sql/pglite is a
# trustedDependency whose WASM setup must run. Validated end-to-end (init/capture/stats
# in a production-shaped image) before this landed.
ARG BUN_VERSION="1.3.14"
ENV BUN_INSTALL="/usr/local/bun"
ENV PATH="/usr/local/bun/bin:$PATH"
RUN apk add --no-cache bash unzip
COPY engines/algorythmo/GBRAIN_PINNED_SHA /tmp/GBRAIN_PINNED_SHA
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}" \
  && bun --version \
  && bun install -g "github:garrytan/gbrain#$(tr -d '[:space:]' < /tmp/GBRAIN_PINNED_SHA)" \
  && gbrain --version \
  && rm -f /tmp/GBRAIN_PINNED_SHA

WORKDIR /app

COPY Gemfile Gemfile.lock ./
# algorythmo: engine gemspec must be present so `gem 'algorythmo', path: 'engines/algorythmo'`
# resolves during `bundle install`. The gemspec require_relatives lib/algorythmo/version.
COPY engines/algorythmo/algorythmo.gemspec engines/algorythmo/algorythmo.gemspec
COPY engines/algorythmo/lib/algorythmo/version.rb engines/algorythmo/lib/algorythmo/version.rb

# natively compile grpc and protobuf to support alpine musl (dialogflow-docker workflow)
# https://github.com/googleapis/google-cloud-ruby/issues/13306
# adding xz as nokogiri was failing to build libxml
# https://github.com/chatwoot/chatwoot/issues/4045
RUN apk update && apk add --no-cache build-base musl ruby-full ruby-dev gcc make musl-dev openssl openssl-dev g++ linux-headers xz vips
RUN bundle config set --local force_ruby_platform true

# Do not install development or test gems in production
RUN if [ "$RAILS_ENV" = "production" ]; then \
  bundle config set without 'development test'; bundle install -j ${BUNDLE_JOBS} -r ${BUNDLE_RETRIES}; \
  else bundle install -j ${BUNDLE_JOBS} -r ${BUNDLE_RETRIES}; \
  fi

COPY package.json pnpm-lock.yaml ./
RUN pnpm i

COPY . /app

# creating a log directory so that image wont fail when RAILS_LOG_TO_STDOUT is false
# https://github.com/chatwoot/chatwoot/issues/701
RUN mkdir -p /app/log

# generate production assets if production environment
RUN if [ "$RAILS_ENV" = "production" ]; then \
  SECRET_KEY_BASE=precompile_placeholder RAILS_LOG_TO_STDOUT=enabled bundle exec rake assets:precompile \
  && rm -rf spec node_modules tmp/cache; \
  fi

# Generate .git_sha file with current commit hash
RUN git rev-parse HEAD > /app/.git_sha

# Remove unnecessary files
RUN rm -rf /gems/ruby/3.4.0/cache/*.gem \
  && find /gems/ruby/3.4.0/gems/ \( -name "*.c" -o -name "*.o" \) -delete \
  && rm -rf .git \
  && rm .gitignore

# final build stage
FROM ruby:3.4.4-alpine3.21

ARG NODE_VERSION="24.13.0"
ARG PNPM_VERSION="10.2.0"
ENV NODE_VERSION=${NODE_VERSION}
ENV PNPM_VERSION=${PNPM_VERSION}

ARG BUNDLE_WITHOUT="development:test"
ENV BUNDLE_WITHOUT ${BUNDLE_WITHOUT}
ENV BUNDLER_VERSION=2.5.16

ARG EXECJS_RUNTIME="Disabled"
ENV EXECJS_RUNTIME ${EXECJS_RUNTIME}

ARG RAILS_SERVE_STATIC_FILES=true
ENV RAILS_SERVE_STATIC_FILES ${RAILS_SERVE_STATIC_FILES}

ARG BUNDLE_FORCE_RUBY_PLATFORM=1
ENV BUNDLE_FORCE_RUBY_PLATFORM ${BUNDLE_FORCE_RUBY_PLATFORM}

ARG RAILS_ENV=production
ENV RAILS_ENV ${RAILS_ENV}
ENV BUNDLE_PATH="/gems"

RUN apk update && apk add --no-cache \
  build-base \
  openssl \
  tzdata \
  postgresql-client \
  imagemagick \
  git \
  vips \
  libstdc++ \
  libgcc \
  && gem install bundler -v "$BUNDLER_VERSION"

COPY --from=node /usr/local/bin/node /usr/local/bin/
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN if [ "$RAILS_ENV" != "production" ]; then \
  apk add --no-cache curl \
  && ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
  && npm install -g pnpm@${PNPM_VERSION} \
  && pnpm --version; \
  fi

# algorythmo: bring the GBrain engine (bun runtime + global gbrain install) into the
# slim runtime image. The shim at /usr/local/bun/bin/gbrain is `#!/usr/bin/env bun`, so
# bun must be on PATH (set below). libstdc++/libgcc (added above) are bun's musl deps.
ENV BUN_INSTALL="/usr/local/bun"
ENV PATH="/usr/local/bun/bin:$PATH"
COPY --from=pre-builder /usr/local/bun /usr/local/bun

# algorythmo: where each account's brain lives. Brain::Client uses GBRAIN_HOME_BASE and
# appends "/<account_id>" (gbrain then appends "/.gbrain"). This path MUST be backed by a
# persistent Easypanel volume on BOTH the app and sidekiq services, or every deploy wipes
# the brain (same lesson as the Active Storage /app/storage volume). Without a volume the
# engine still runs; the knowledge just isn't durable. See docs/algorythmo/brain-copiloto-go-live.md.
ENV GBRAIN_HOME_BASE="/app/.gbrain-accounts"

# Fail the build early if the engine didn't make it into the final image.
RUN gbrain --version

COPY --from=pre-builder /gems/ /gems/
COPY --from=pre-builder /app /app

# Copy .git_sha file from pre-builder stage
COPY --from=pre-builder /app/.git_sha /app/.git_sha

# algorythmo: ensure the brain base dir exists for the no-volume case (a mounted
# Easypanel volume takes precedence and supplies persistence).
RUN mkdir -p /app/.gbrain-accounts

WORKDIR /app

EXPOSE 3000
