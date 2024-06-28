# Sample Fabric network

# load fabric images 2.1.0 fabric-ca 1.4.7 fabric-couchdb 0.4.20
#curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/master/scripts/bootstrap.sh | bash -s -- 2.1.0 1.4.7 0.4.20

# load fabric images 2.2.15 fabric-ca 1.5.11 fabric-couchdb latest
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/master/scripts/bootstrap.sh | bash -s -- 2.2.15 1.5.11

echo "========= download completed =========== "
cp -R fabric-samples/bin .
cp -R fabric-samples/config .
echo "========= completed config set up =========== "
