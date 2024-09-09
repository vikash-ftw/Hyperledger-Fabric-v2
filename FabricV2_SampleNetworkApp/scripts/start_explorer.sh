#!/bin/bash

# explorer docker compose file location
COMPOSE_FILE_EXPLORER=${PWD}/fabric-explorer/docker-compose.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_EXPLORER}"

docker-compose ${COMPOSE_FILES} up -d 2>&1

docker ps
if [ $? -ne 0 ]; then
echo "ERROR !!!! Unable to start explorer"
exit 1
fi