#!/bin/bash

# defining paths
json_file_path="${PWD}/fabric-explorer/connection-profile/explorer-profile.json"
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
new_key_file=$(ls "$key_dir_path" | head -n 1)

# Ensure we found a file
if [ -z "$new_key_file" ]; then
  echo "Error: No file found in the directory $key_dir_path"
  exit 1
fi

# Use sed to replace '<REPLACE_ME>' with the actual key filename in the JSON file
sed -i "s/<REPLACE_ME>/${new_key_file}/g" "$json_file_path"

# Verify the changes
echo "----- Updated Explorer's adminPrivateKey path: -----"
grep -o '"path":[^,}]*' "$json_file_path" | grep -i "keystore"

# explorer docker compose file location
echo "----- Now building Explorer's containers -----"
COMPOSE_FILE_EXPLORER=${PWD}/fabric-explorer/docker-compose.yaml

COMPOSE_FILES="-f ${COMPOSE_FILE_EXPLORER}"

docker compose ${COMPOSE_FILES} up -d 2>&1

if [ $? -ne 0 ]; then
    echo "ERROR !!!! Unable to start Explorer containers"
    exit 1
fi
docker ps