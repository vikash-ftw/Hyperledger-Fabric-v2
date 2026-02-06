package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// Product stores product details
type Product struct {
	ProductNumber       string    `json:"productNumber"`
	ProductManufacturer string    `json:"productManufacturer"`
	ProductName         string    `json:"productName"`
	ProductOwnerName    string    `json:"productOwnerName"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// InitLedger initializes the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("--- Ledger initialized ---")
	return nil
}

// AssetExists returns true if the product exists
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}
	return assetJSON != nil, nil
}

// AddProductData creates a new product
func (s *SmartContract) AddProductData(
	ctx contractapi.TransactionContextInterface,
	productNumber string,
	productManufacturer string,
	productName string,
	productOwnerName string,
) (string, error) {

	fmt.Println("============= START : AddProductData =============")

	exists, err := s.AssetExists(ctx, productNumber)
	if err != nil {
		return "", err
	}
	if exists {
		return "", fmt.Errorf("The product with id - %s already exists!", productNumber)
	}

	txTime, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return "", fmt.Errorf("failed to get timestamp: %v", err)
	}
	timestamp := time.Unix(txTime.Seconds, int64(txTime.Nanos))

	product := Product{
		ProductNumber:       productNumber,
		ProductManufacturer: productManufacturer,
		ProductName:         productName,
		ProductOwnerName:    productOwnerName,
		CreatedAt:           timestamp,
		UpdatedAt:           timestamp,
	}

	productJSON, err := json.Marshal(product)
	if err != nil {
		return "", fmt.Errorf("failed to marshal product: %v", err)
	}

	// set event
	err = ctx.GetStub().SetEvent("addProductEvent", productJSON)
	if err != nil {
		return "", fmt.Errorf("failed to set event: %v", err)
	}

	// put state
	err = ctx.GetStub().PutState(productNumber, productJSON)
	if err != nil {
		return "", fmt.Errorf("failed to put state: %v", err)
	}

	return string(productJSON), nil
}

// GetProductData retrieves product data
func (s *SmartContract) GetProductData(ctx contractapi.TransactionContextInterface, productNumber string) (string, error) {
	productJSON, err := ctx.GetStub().GetState(productNumber)
	if err != nil {
		return "", fmt.Errorf("failed to read world state: %v", err)
	}
	if productJSON == nil {
		return "", fmt.Errorf("The product with id - %s does not exists!", productNumber)
	}

	return string(productJSON), nil
}