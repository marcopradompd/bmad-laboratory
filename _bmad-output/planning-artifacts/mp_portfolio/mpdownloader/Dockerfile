# Imagem oficial da Microsoft com Node.js + Playwright + Chromium pré-instalados
FROM mcr.microsoft.com/playwright:v1.49.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

CMD ["node", "server.js"]
