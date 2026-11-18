FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000
COPY . .
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=12 \
  CMD node -e "fetch('http://127.0.0.1:5173').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
