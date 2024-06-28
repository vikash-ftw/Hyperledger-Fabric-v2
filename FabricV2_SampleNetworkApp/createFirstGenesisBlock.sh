# using FABRIC_CFG_PATH to set the path of configtx.yaml file
export FABRIC_CFG_PATH=$PWD/configtx

echo "------------------------------------------"
echo "---- Generating Orderer Genesis Block ----"
echo "------------------------------------------"

configtxgen -profile SampleAppOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block

if [ $? -ne 0 ]; then
    echo "Failed to generate orderer genesis block!"
    exit 1
else
    echo "Successfully generated orderer genesis block"
fi