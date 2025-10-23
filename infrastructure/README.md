# AWS Deployment Guide - Phase 1

## Architecture Overview

```
Frontend: CloudFront → S3 (Static React App)
Backend:  EC2 (Private Subnet) → Docker Container from ECR
Database: MongoDB Atlas (External)
NAT:      NAT Instance (for outbound internet from private subnet)
```

## Prerequisites

✅ Terraform infrastructure deployed (`terraform apply` completed)
✅ AWS CLI configured with proper credentials
✅ Docker installed locally
✅ MongoDB Atlas connection string ready

## Step 1: Verify Infrastructure

```bash
cd infrastructure

# Get all outputs
terraform output

# You should see:
# - s3_bucket_name
# - cloudfront_url
# - backend_instance_id
# - backend_private_ip
# - ecr_repository_url
```

## Step 2: Build and Push Backend Docker Image

```bash
cd backend

# Get ECR repository URL
ECR_URL=$(cd ../infrastructure && terraform output -raw ecr_repository_url)
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image
docker build -t spm-g4t5-backend:latest .

# Tag for ECR
docker tag spm-g4t5-backend:latest $ECR_URL:latest
docker tag spm-g4t5-backend:latest $ECR_URL:v1.0.0

# Push to ECR
docker push $ECR_URL:latest
docker push $ECR_URL:v1.0.0

echo "✅ Docker image pushed to ECR: $ECR_URL"
```

## Step 3: Create Environment File (Local)

Create `backend/environments/.env.prod` with your production secrets:

```bash
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
SESSION_SECRET=your-long-random-secure-session-secret-here
```

**⚠️ DO NOT COMMIT THIS FILE - It's already in .gitignore**

## Step 4: Deploy Backend to EC2

```bash
# Get instance ID
INSTANCE_ID=$(cd infrastructure && terraform output -raw backend_instance_id)
ECR_URL=$(cd infrastructure && terraform output -raw ecr_repository_url)

# Connect to EC2 via SSM
aws ssm start-session --target $INSTANCE_ID
```

### Inside EC2 Session:

```bash
# 1. Login to ECR
AWS_REGION="ap-southeast-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# 2. Pull latest image
ECR_URL="<paste-your-ECR-URL-here>"
docker pull $ECR_URL:latest

# 3. Create environment directory
sudo mkdir -p /app/env

# 4. Create environment file
sudo tee /app/env/.env.prod > /dev/null << 'EOF'
PORT=3000
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority
SESSION_SECRET=your-long-random-secure-session-secret-here
EOF

# 5. Run container
docker run -d \
  --name spm-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /app/env/.env.prod \
  $ECR_URL:latest

# 6. Verify container is running
docker ps

# 7. Check logs
docker logs spm-backend

# 8. Test backend locally
curl http://localhost:3000

# Exit SSM session
exit
```

## Step 5: Deploy Frontend to S3

```bash
cd frontend

# Build production frontend
npm run build

# Get S3 bucket name
BUCKET_NAME=$(cd ../infrastructure && terraform output -raw s3_bucket_name)

# Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DISTRIBUTION_ID=$(cd ../infrastructure && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Frontend deployed!"
echo "URL: $(cd ../infrastructure && terraform output cloudfront_url)"
```

## Step 6: Configure Frontend to Use Backend API

### Option A: Update Frontend Environment

Create `frontend/.env.production`:

```bash
VITE_API_URL=http://<BACKEND_PRIVATE_IP>:3000
```

**⚠️ Note:** This won't work directly because backend is in private subnet. You need to either:
1. Add API Gateway (recommended for production)
2. Move backend to public subnet temporarily
3. Use VPN/bastion to access

### Option B: Add API Gateway (Recommended Next Step)

See `DEPLOYMENT_GUIDE_API_GATEWAY.md` for instructions on adding API Gateway v2.

## Testing

### Test Backend (from EC2):
```bash
# Via SSM session
aws ssm start-session --target <INSTANCE_ID>
curl http://localhost:3000
```

### Test Frontend:
```bash
# Get CloudFront URL
cd infrastructure
terraform output cloudfront_url
# Visit URL in browser
```

## Troubleshooting

### Backend container not starting:
```bash
# Check logs
docker logs spm-backend

# Check if container is running
docker ps -a

# Restart container
docker restart spm-backend
```

### ECR login fails:
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Try login again with explicit account ID
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin \
  <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com
```

### Frontend not updating:
```bash
# Clear CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"

# Wait 5-10 minutes for invalidation
```

## Update Workflow

### Update Backend:
```bash
# 1. Build and push new image
cd backend
docker build -t spm-g4t5-backend:latest .
docker tag spm-g4t5-backend:latest $ECR_URL:latest
docker push $ECR_URL:latest

# 2. Update on EC2
aws ssm start-session --target $INSTANCE_ID
docker pull $ECR_URL:latest
docker stop spm-backend
docker rm spm-backend
docker run -d --name spm-backend --restart unless-stopped \
  -p 3000:3000 --env-file /app/env/.env.prod $ECR_URL:latest
exit
```

### Update Frontend:
```bash
cd frontend
npm run build
aws s3 sync dist/ s3://$BUCKET_NAME --delete
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

## Cost Estimate

| Resource | Monthly Cost |
|----------|-------------|
| NAT Instance (t4g.micro) | $3.07 |
| Backend EC2 (t3.micro) | $0.00 (free tier) |
| S3 Storage (~100MB) | $0.00 (free tier) |
| CloudFront (low traffic) | $0.00 (free tier) |
| ECR Storage (~500MB) | $0.05 |
| **Total** | **~$3.12/month** |

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Push Docker image to ECR
3. ✅ Deploy backend to EC2
4. ✅ Deploy frontend to S3
5. ⏭️ Add API Gateway for frontend-backend connectivity
6. ⏭️ Set up CI/CD with GitHub Actions

## Quick Reference

```bash
# View all infrastructure outputs
cd infrastructure && terraform output

# Redeploy backend
cd backend && docker build -t backend . && \
  docker tag backend:latest $ECR_URL:latest && \
  docker push $ECR_URL:latest

# Redeploy frontend
cd frontend && npm run build && \
  aws s3 sync dist/ s3://$BUCKET_NAME --delete && \
  aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

# Connect to EC2
aws ssm start-session --target $(cd infrastructure && terraform output -raw backend_instance_id)

# Check backend logs
docker logs -f spm-backend
```

