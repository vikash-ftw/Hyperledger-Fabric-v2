#!/bin/bash

# Path to .env file
ENV_FILE=${PWD}/.env

# certificate authorities compose file
COMPOSE_FILE_CA=${PWD}/docker/docker-compose-ca.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_CA}"

docker-compose --env-file $ENV_FILE ${COMPOSE_FILES} up -d 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start fabric-ca"
    exit 1
fi
docker ps