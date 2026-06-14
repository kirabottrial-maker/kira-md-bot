FROM node:23-alpine

# ആവശ്യമായ എല്ലാ ടൂളുകളും ഇൻസ്റ്റാൾ ചെയ്യുന്നു (ffmpeg, python3, yt-dlp)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    build-base

# yt-dlp ഇൻസ്റ്റാൾ ചെയ്യുന്നു
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /home/container

# പാക്കേജുകൾ ഇൻസ്റ്റാൾ ചെയ്യുന്നു
COPY package*.json ./
RUN npm install

# ബാക്കി കോഡുകൾ കോപ്പി ചെയ്യുന്നു
COPY . .

# ബോട്ട് സ്റ്റാർട്ട് ചെയ്യുന്നു
CMD ["node", "index.js"]