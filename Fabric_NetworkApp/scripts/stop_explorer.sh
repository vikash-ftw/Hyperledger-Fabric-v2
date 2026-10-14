#!/bin/bash

# explorer docker compose file location
COMPOSE_FILE_EXPLORER=${PWD}/fabric-explorer/docker-compose.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_EXPLORER}"

docker-compose ${COMPOSE_FILES} stop