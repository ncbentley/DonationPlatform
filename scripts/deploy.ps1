# Configuration
$STACK_NAME = "donation-event-listener"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$BUCKET_NAME = "donation-event-listener-$timestamp"
$REGION = "us-east-2"

# Load environment variables from .env file
Write-Host "Loading environment variables from .env file..."
$excludedVars = @(
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_DEFAULT_REGION"
)

Get-Content (Join-Path $PSScriptRoot ".env") | ForEach-Object {
    if ($_ -match '^([^#].+?)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($excludedVars -notcontains $key) {
            Write-Host "Setting $key"
            [Environment]::SetEnvironmentVariable($key, $value)
            Set-Item -Path "env:$key" -Value $value
        } else {
            Write-Host "Skipping AWS variable: $key"
        }
    }
}

Write-Host "Using bucket name: $BUCKET_NAME"

# Check AWS CLI configuration
Write-Host "Checking AWS configuration..."
$awsConfig = aws configure list 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "AWS CLI is not configured. Running aws configure..."
    aws configure
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to configure AWS CLI. Please run 'aws configure' manually and try again."
        exit 1
    }
}

# Set AWS region for this session
$env:AWS_DEFAULT_REGION = $REGION
Write-Host "Using AWS Region: $REGION"

# Verify AWS credentials
Write-Host "Verifying AWS credentials..."
$stsCheck = aws sts get-caller-identity 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Unable to verify AWS credentials. Please ensure you have valid credentials configured."
    Write-Host "You can configure credentials by running 'aws configure'"
    exit 1
}
Write-Host "AWS credentials verified successfully."

# Store the original directory
$originalDirectory = Get-Location

try {
    # Create deployment package
    Write-Host "Creating deployment package..."
    if (-not (Test-Path "scripts")) {
        Write-Host "Error: 'scripts' directory not found. Please run this script from the project root directory."
        exit 1
    }
    Set-Location -Path scripts

    # Create package.json if it doesn't exist
    if (-not (Test-Path "package.json")) {
        Write-Host "Creating package.json..."
        @{
            name = "donation-event-listener"
            version = "1.0.0"
            dependencies = @{
                "@aws-sdk/client-dynamodb" = "^3.0.0"
                "@aws-sdk/lib-dynamodb" = "^3.0.0"
                "web3" = "^1.9.0"
            }
        } | ConvertTo-Json | Set-Content "package.json"
    }

    # Install dependencies
    Write-Host "Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install npm dependencies."
        exit 1
    }

    # Check if 7-Zip is installed
    $7zipPath = "$env:ProgramFiles\7-Zip\7z.exe"
    if (-not (Test-Path $7zipPath)) {
        Write-Host "7-Zip not found. Attempting to install via winget..."
        winget install -e --id 7zip.7zip --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to install 7-Zip. Please install it manually from https://7-zip.org/"
            exit 1
        }
    }

    # Create zip file using 7-Zip
    Write-Host "Creating zip file..."
    & $7zipPath a -tzip donation-event-listener.zip donationEventListener.js node_modules
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to create zip file."
        exit 1
    }

    # Verify required environment variables
    $requiredEnvVars = @("WEB3_PROVIDER_URL", "CONTRACT_ADDRESS")
    foreach ($var in $requiredEnvVars) {
        if (-not (Get-Item "env:$var" -ErrorAction SilentlyContinue)) {
            Write-Host "Error: Missing required environment variable: $var"
            exit 1
        }
    }

    # Create S3 bucket if it doesn't exist
    Write-Host "Checking S3 bucket..."
    $bucketExists = $false

    # Check if bucket exists
    $bucketCheck = aws s3api head-bucket --bucket $BUCKET_NAME 2>&1
    if ($LASTEXITCODE -eq 0) {
        $bucketExists = $true
        Write-Host "Bucket already exists."
    } else {
        Write-Host "Bucket does not exist, creating new S3 bucket..."
        # Create the bucket
        $createBucket = aws s3api create-bucket `
            --bucket $BUCKET_NAME `
            --region $REGION `
            --create-bucket-configuration LocationConstraint=$REGION 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Bucket created successfully."
            
            # Wait for bucket to be available
            Write-Host "Waiting for bucket to be available..."
            Start-Sleep -Seconds 10

            # Verify bucket is accessible
            $verifyBucket = aws s3api head-bucket --bucket $BUCKET_NAME 2>&1
            if ($LASTEXITCODE -eq 0) {
                $bucketExists = $true
                Write-Host "Bucket is now available."
            } else {
                Write-Host "Error: Could not verify bucket creation. Error: $verifyBucket"
                exit 1
            }
        } else {
            Write-Host "Error: Failed to create bucket. Error: $createBucket"
            exit 1
        }
    }

    if (-not $bucketExists) {
        Write-Host "Error: Failed to create or verify S3 bucket."
        exit 1
    }

    Write-Host "S3 bucket is ready."

    # Upload deployment package to S3
    Write-Host "Uploading deployment package to S3..."
    aws s3 cp donation-event-listener.zip "s3://$BUCKET_NAME/"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to upload deployment package to S3."
        exit 1
    }

    # Check and handle existing stack
    Write-Host "Checking existing stack status..."
    $stackStatus = aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].StackStatus' --output text 2>&1
    if ($LASTEXITCODE -eq 0) {
        if ($stackStatus -eq 'ROLLBACK_COMPLETE') {
            Write-Host "Stack exists in ROLLBACK_COMPLETE state. Deleting failed stack..."
            aws cloudformation delete-stack --stack-name $STACK_NAME
            Write-Host "Waiting for stack deletion to complete..."
            aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Error: Failed to delete failed stack."
                exit 1
            }
            Write-Host "Failed stack deleted successfully."
        }
        elseif ($stackStatus -like '*FAILED*' -or $stackStatus -like '*ROLLBACK*') {
            Write-Host "Stack exists in failed state ($stackStatus). Deleting failed stack..."
            aws cloudformation delete-stack --stack-name $STACK_NAME
            Write-Host "Waiting for stack deletion to complete..."
            aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Error: Failed to delete failed stack."
                exit 1
            }
            Write-Host "Failed stack deleted successfully."
        }
        else {
            Write-Host "Existing stack status: $stackStatus"
        }
    }

    # Deploy CloudFormation stack
    Write-Host "Deploying CloudFormation stack..."
    $templatePath = Join-Path (Get-Location) "template.yaml"
    if (-not (Test-Path $templatePath)) {
        Write-Host "Error: CloudFormation template not found at: $templatePath"
        exit 1
    }

    Write-Host "Using template: $templatePath"
    aws cloudformation deploy `
        --template-file $templatePath `
        --stack-name $STACK_NAME `
        --capabilities CAPABILITY_IAM `
        --parameter-overrides `
            ProviderUrl=$env:WEB3_PROVIDER_URL `
            ContractAddress=$env:CONTRACT_ADDRESS `
            DeploymentBucket=$BUCKET_NAME `
            DonorTableName="donor_network_table" `
            MetadataTableName="event_metadata"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to deploy CloudFormation stack."
        exit 1
    }

} finally {
    # Always return to the original directory
    Set-Location $originalDirectory
    Write-Host "Returned to original directory: $originalDirectory"
}

# Clean up
Remove-Item donation-event-listener.zip

Write-Host "Deployment completed successfully!" -ForegroundColor Green 