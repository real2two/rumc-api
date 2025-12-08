FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun i
COPY . .
CMD ["bun", "start"]
