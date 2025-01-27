#!/bin/bash

# First we need to copy AdminPrivateKey path from peerOrganizations and paste it into Explorer's connectionProfile json file

# defining paths
json_file_path="${PWD}/fabric-explorer/connection-profile/test-network.json"
key_dir_path="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore"

# Check if the JSON file exists
if [ ! -f "$json_file_path" ]; then
  echo "Error: JSON file at path - $json_file_path does not exist."
  exit 1
fi
# Check if the key directory exists
if [ ! -d "$key_dir_path" ]; then
  echo "Error: Directory - $key_dir_path does not exist."
  exit 1
fi

# Find the file in the key directory (assuming there's only one key file in the directory)
new_key_file=$(ls "$key_dir_path")

# Ensure we found a file
if [ -z "$new_key_file" ]; then
  echo "Error: No file found in the directory $key_dir_path"
  exit 1
fi

# Construct the new key filename without the directory
new_key_filename=$(basename "$new_key_file")

# Read the current value of adminPrivateKey.path
current_path=$(jq -r '.organizations.Org1MSP.adminPrivateKey.path' "$json_file_path")

# Replace 'priv_sk' in the current path with the new key filename
updated_path="${current_path/priv_sk/$new_key_filename}"

# Use jq to update the adminPrivateKey path in the JSON file
jq --arg new_path "$updated_path" '.organizations.Org1MSP.adminPrivateKey.path = $new_path' "$json_file_path" > ./temp/exp_tmp.$$.json && mv ./temp/exp_tmp.$$.json "$json_file_path"

# Verify the changes
echo "----- Updated Explorer's adminPrivateKey path: -----"
jq '.organizations.Org1MSP.adminPrivateKey.path' "$json_file_path"


# explorer docker compose file location
echo "----- Now building Explorer's containers -----"
COMPOSE_FILE_EXPLORER=${PWD}/fabric-explorer/docker-compose.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_EXPLORER}"

docker-compose ${COMPOSE_FILES} up -d 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start Explorer containers"
    exit 1
fi
docker ps