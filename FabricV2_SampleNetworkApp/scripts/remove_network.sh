#!/bin/bash

# Path to .env file
ENV_FILE="../.env"

# Load environment variables from .env file
source ../.env
# use this as the default docker-compose yaml definition
COMPOSE_FILE_BASE=../docker/docker-compose-net.yaml
# certificate authorities compose file
COMPOSE_FILE_CA=../docker/docker-compose-ca.yaml
# default database
DATABASE="couchdb"
# if database is couchdb then couch compose file
COMPOSE_FILE_COUCH=../docker/docker-compose-couch.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_CA} -f ${COMPOSE_FILE_BASE}"

if [ "${DATABASE}" == "couchdb" ]; then
    COMPOSE_FILES="${COMPOSE_FILES} -f ${COMPOSE_FILE_COUCH}"
fi

docker-compose --env-file $ENV_FILE ${COMPOSE_FILES} down --volumes --remove-orphans