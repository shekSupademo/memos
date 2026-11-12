# Deploy image: builds the React frontend and the Go server from source,
# so every push to main ships both (built by .github/workflows/render-deploy.yml). The upstream release image lives in
# scripts/Dockerfile and expects the frontend to be prebuilt.

FROM node:24-alpine AS frontend
WORKDIR /web
RUN corepack enable
COPY web/package.json web/pnpm-lock.yaml web/pnpm-workspace.yaml ./
COPY web/patches ./patches
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm exec vite build --mode release --outDir=/dist --emptyOutDir

FROM golang:1.27.2-alpine AS backend
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /dist ./server/frontend/dist
# Render passes RENDER_GIT_COMMIT to Docker builds that declare it. Memos
# requires a YY.MM.D-dev.<sha7> version, so derive one from the build date.
ARG RENDER_GIT_COMMIT=0000000000000000000000000000000000000000
RUN COMMIT="${RENDER_GIT_COMMIT}" && \
    VERSION="$(date -u +%y.%m).$(date -u +%d | sed 's/^0//')-dev.$(echo "$COMMIT" | cut -c1-7)" && \
    echo "Building memos $VERSION" && \
    CGO_ENABLED=0 go build -trimpath \
      -ldflags="-s -w -X github.com/usememos/memos/internal/version.Version=${VERSION} -X github.com/usememos/memos/internal/version.Commit=${COMMIT}" \
      -tags netgo,osusergo -o memos ./cmd/memos

FROM alpine:3.21
RUN apk add --no-cache tzdata ca-certificates su-exec && \
    addgroup -g 10001 -S nonroot && \
    adduser -u 10001 -S -G nonroot -h /var/opt/memos nonroot && \
    mkdir -p /var/opt/memos /usr/local/memos && \
    chown -R nonroot:nonroot /var/opt/memos
COPY --from=backend /src/memos /usr/local/memos/memos
COPY --from=backend --chmod=755 /src/scripts/entrypoint.sh /usr/local/memos/entrypoint.sh
WORKDIR /var/opt/memos
# Render routes traffic to port 10000 by default.
ENV TZ="UTC" MEMOS_PORT="10000"
EXPOSE 10000
ENTRYPOINT ["/usr/local/memos/entrypoint.sh", "/usr/local/memos/memos"]
