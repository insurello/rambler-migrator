FROM alpine:3.14

RUN wget -O rambler https://github.com/elwinar/rambler/releases/download/v5.4.0/rambler-alpine-amd64
RUN chmod +x rambler
RUN ls

COPY migrations migrations
COPY rambler.json ./
ENTRYPOINT [ "./rambler" ]
CMD [ "apply", "--all" ]