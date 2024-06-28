#!/bin/bash

# Path to .env file
ENV_FILE=${PWD}/.env

# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=${PWD}/docker/docker-compose-net.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=${PWD}/docker/docker-compose-ca.yaml
# default database
DATABASE="couchdb"
# if database is couchdb then couch compose file
COMPOSE_FILE_COUCH=${PWD}/docker/docker-compose-couch.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_CA} -f ${COMPOSE_FILE_BASE}"

if [ "${DATABASE}" == "couchdb" ]; then
    COMPOSE_FILES="${COMPOSE_FILES} -f ${COMPOSE_FILE_COUCH}"
fi

docker-compose --env-file $ENV_FILE ${COMPOSE_FILES} up -d 2>&1

docker ps
if [ $? -ne 0 ]; then
echo "ERROR !!!! Unable to start network"
exit 1
fi