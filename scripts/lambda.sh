#!/bin/bash
echo "🚀 Testing Lambda function..."

# Invoke
aws lambda invoke \
  --function-name spm-g4t5-prod-email-notifications \
  --region ap-southeast-1 \
  response.json > /dev/null 2>&1

# Check result
if grep -q '"statusCode":200' response.json; then
  echo "✅ Lambda executed successfully!"
  cat response.json | jq .
else
  echo "❌ Lambda failed!"
  cat response.json | jq .
fi

# Show logs
echo ""
echo "📋 Recent logs:"
aws logs tail /aws/lambda/spm-g4t5-prod-email-notifications \
  --region ap-southeast-1 \
  --since 2m \
  --format short