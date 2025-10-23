# S3 and CloudFront outputs
output "s3_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = module.s3_frontend.s3_bucket_id
}

output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${module.cloudfront_frontend.cloudfront_distribution_domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.cloudfront_frontend.cloudfront_distribution_id
}

# Backend EC2 outputs
output "backend_instance_id" {
  description = "Backend EC2 instance ID for SSM access"
  value       = module.backend_ec2.id
}

output "backend_private_ip" {
  description = "Backend EC2 private IP"
  value       = module.backend_ec2.private_ip
}

output "nat_instance_public_ip" {
  description = "NAT instance public IP (can SSH here if needed)"
  value       = module.nat_instance.instance_public_ip
}

# ECR output
output "ecr_repository_url" {
  description = "ECR repository URL for backend Docker images"
  value       = aws_ecr_repository.backend.repository_url
}

# ALB outputs
output "alb_dns_name" {
  description = "ALB DNS name - use this as your backend API endpoint"
  value       = module.alb.dns_name
}

output "alb_url" {
  description = "Full ALB URL for backend API"
  value       = "https://${module.alb.dns_name}"
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID (for custom domain setup)"
  value       = module.alb.zone_id
}

# MongoDB Atlas connection
output "mongodb_connection_instructions" {
  description = "Instructions for connecting to MongoDB Atlas"
  value       = "Set MONGO_URI environment variable to your MongoDB Atlas connection string"
}

# Frontend environment variable
output "frontend_api_url" {
  description = "API URL to use in frontend .env.production"
  value       = "VITE_API_URL=https://api.jonongca.com"
}

