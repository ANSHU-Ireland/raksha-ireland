# Raksha Ireland - AWS EC2 Deployment

$INSTANCE_NAME = "raksha-ireland-backend"
$REGION = "eu-west-1"
$INSTANCE_TYPE = "t2.micro"
$AMI_ID = "ami-0d64bb532e0502c46"
$KEY_NAME = "raksha-ireland-key"

Write-Host "Starting EC2 Deployment..." -ForegroundColor Green

# Create Key Pair
Write-Host "[1/5] Creating EC2 Key Pair..." -ForegroundColor Cyan
$keyExists = aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION 2>$null
if (!$keyExists) {
    aws ec2 create-key-pair --key-name $KEY_NAME --region $REGION --query KeyMaterial --output text | Out-File -FilePath "$KEY_NAME.pem" -Encoding ASCII
    Write-Host "Key pair created: $KEY_NAME.pem" -ForegroundColor Green
} else {
    Write-Host "Key pair already exists" -ForegroundColor Green
}

# Create Security Group
Write-Host "[2/5] Creating Security Group..." -ForegroundColor Cyan
$sgExists = aws ec2 describe-security-groups --filters "Name=group-name,Values=$INSTANCE_NAME-sg" --region $REGION 2>$null | ConvertFrom-Json
if (!$sgExists.SecurityGroups) {
    $vpcId = (aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $REGION | ConvertFrom-Json).Vpcs[0].VpcId
    $sgId = (aws ec2 create-security-group --group-name "$INSTANCE_NAME-sg" --description "Raksha Ireland backend security group" --vpc-id $vpcId --region $REGION | ConvertFrom-Json).GroupId
    
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 22 --cidr 0.0.0.0/0 --region $REGION | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 80 --cidr 0.0.0.0/0 --region $REGION | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 443 --cidr 0.0.0.0/0 --region $REGION | Out-Null
    aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 3000 --cidr 0.0.0.0/0 --region $REGION | Out-Null
    
    Write-Host "Security group created: $sgId" -ForegroundColor Green
} else {
    $sgId = $sgExists.SecurityGroups[0].GroupId
    Write-Host "Security group exists: $sgId" -ForegroundColor Green
}

# Launch Instance
Write-Host "[3/5] Launching EC2 Instance..." -ForegroundColor Cyan
$instanceId = (aws ec2 run-instances --image-id $AMI_ID --instance-type $INSTANCE_TYPE --key-name $KEY_NAME --security-group-ids $sgId --region $REGION --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" | ConvertFrom-Json).Instances[0].InstanceId
Write-Host "Instance launched: $instanceId" -ForegroundColor Green

Write-Host "[4/5] Waiting for instance to start..." -ForegroundColor Yellow
aws ec2 wait instance-running --instance-ids $instanceId --region $REGION

# Get Public IP
$publicIp = (aws ec2 describe-instances --instance-ids $instanceId --region $REGION | ConvertFrom-Json).Reservations[0].Instances[0].PublicIpAddress
Write-Host "Public IP: $publicIp" -ForegroundColor Green

Write-Host "[5/5] Waiting for instance to be ready..." -ForegroundColor Yellow
aws ec2 wait instance-status-ok --instance-ids $instanceId --region $REGION

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "EC2 INSTANCE CREATED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nInstance ID: $instanceId"
Write-Host "Public IP: $publicIp"
Write-Host "SSH Key: $KEY_NAME.pem"
Write-Host "`nBackend URL: http://$publicIp:3000" -ForegroundColor Cyan
Write-Host "`nTo connect: ssh -i $KEY_NAME.pem ubuntu@$publicIp"

