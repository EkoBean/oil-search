FROM node:20-slim

# Python + pdfplumber，給 server spawn extract_pdfs.py 用
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY packages/extract-pdfs/requirements.txt ./packages/extract-pdfs/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r packages/extract-pdfs/requirements.txt

COPY packages/server/package.json ./packages/server/package.json
WORKDIR /app/packages/server
RUN npm install --omit=dev

WORKDIR /app
COPY packages/extract-pdfs ./packages/extract-pdfs
COPY packages/server ./packages/server

WORKDIR /app/packages/server
RUN npx prisma generate

EXPOSE 3000
CMD ["node", "src/index.js"]
