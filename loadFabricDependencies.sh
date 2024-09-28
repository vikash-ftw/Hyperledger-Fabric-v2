# Install Samples, Binaries, and Docker Images

# Usage: bootstrap.sh [version [ca_version]] [options]

# options:
# -h : this help
# -d : bypass docker image download
# -s : bypass fabric-samples repo clone
# -b : bypass download of platform-specific binaries

# e.g. bootstrap.sh 2.5.9 1.5.12 -s
# will download docker images and binaries for Fabric v2.5.9 and Fabric CA v1.5.12


# We will download only Fabric Binaries (Fabric v2.2.15 and Fabric CA v1.5.11) and skip Docker Images & Sample Repo
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/master/scripts/bootstrap.sh | bash -s -- 2.2.15 1.5.11 -d -s

# Check if the command was successful
if [ $? -eq 0 ]; then
    echo "============ Completed ============"
else
    echo "============ Failed! ============"
fi
