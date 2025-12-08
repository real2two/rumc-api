FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun i
COPY . .
CMD ["bun", "start"]
