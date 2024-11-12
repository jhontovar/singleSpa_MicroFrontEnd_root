# Serve Application using Nginx Server
FROM nginx:alpine


COPY . /usr/share/nginx/html

EXPOSE 80