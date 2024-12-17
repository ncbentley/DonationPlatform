import json

data = "./frontend/investment-dapp/src/assets/abi/InvestmentPlatform.json"
with open(data, "r") as file:
    abi_data = json.load(file)

# Function to clean the ABI
def clean_abi(abi):
    if isinstance(abi, list):
        return [clean_abi(entry) for entry in abi]
    elif isinstance(abi, dict):
        return {
            key: clean_abi(value)
            for key, value in abi.items()
            if key in ["type", "name", "inputs", "outputs", "stateMutability", "anonymous", "constant", "payable", "indexed"]
        }
    else:
        return abi

# Clean the ABI
cleaned_abi = clean_abi(abi_data["abi"])

# Save the cleaned ABI
with open(data, "w") as file:
    json.dump(cleaned_abi, file, indent=4)

print("Cleaned ABI saved as CleanedInvestmentPlatform.json")
