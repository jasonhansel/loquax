FROM pritunl/archlinux:2017-01-14
RUN  pacman -S --noconfirm npm

COPY . /src
EXPOSE 3000
ENV NODE_ENV production
WORKDIR /src
CMD ["node", "/src/app.js"]
