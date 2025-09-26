terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  backend "s3" {
    bucket = "spmg5t4-tfstate"
    key    = "terraform.tfstate"
    region = "ap-southeast-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# S3 Module for Frontend Hosting
module "s3_frontend" {
  source = "./modules/s3"

  bucket = var.frontend_bucket

  # Website configuration
  website = {
    index_document = "index.html"
    error_document = "index.html" # For React SPA routing
  }

  # Public access configuration for website hosting
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # Versioning
  versioning = {
    enabled = false
  }

  # Tags
  tags = {
    Name        = "${var.project_name}-${var.environment}-frontend"
    Type        = "website-hosting"
    Environment = var.environment
    Project     = var.project_name
  }
}

# S3 Bucket Policy for Public Read Access
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = module.s3_frontend.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${module.s3_frontend.s3_bucket_arn}/*"
      }
    ]
  })

  depends_on = [module.s3_frontend]
}

# CloudFront Module for CDN
module "cloudfront_frontend" {
  source = "./modules/cloudfront"

  # Basic configuration
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  
  # Origins configuration - fix the structure
  origin = {
    s3_frontend = {
      domain_name = module.s3_frontend.s3_bucket_website_endpoint
      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1.2"]
    }
    }
  }

  # Default cache behavior - fix the structure
  default_cache_behavior = {
    target_origin_id       = "s3_frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    
    forwarded_values = {
      query_string = false
      cookies = {
        forward = "none"
      }
    }
  }

  # Custom error responses for SPA routing
  custom_error_response = [
    {
      error_code         = 404
      response_code      = 200
      response_page_path = "/index.html"
    }
  ]

  # Geo restrictions
  geo_restriction = {
    restriction_type = "none"
  }

  # SSL certificate
  viewer_certificate = {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Uncomment when ready to deploy VPC
# module "vpc" {
#   source = "./modules/terraform-aws-vpc-master"
#   
#   name = "${var.project_name}-${var.environment}"
#   cidr = var.vpc_cidr
#   
#   azs             = slice(data.aws_availability_zones.available.names, 0, 2)
#   private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
#   public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
#   
#   enable_nat_gateway = true
#   enable_vpn_gateway = false
#   
#   tags = {
#     Environment = var.environment
#     Project     = var.project_name
#   }
# }

# Uncomment when ready to deploy backend
# module "backend" {
#   source = "./modules/backend"
#   
#   project_name    = var.project_name
#   environment     = var.environment
#   vpc_id          = module.vpc.vpc_id
#   private_subnets = module.vpc.private_subnets
#   public_subnets  = module.vpc.public_subnets
#   key_pair_name   = var.key_pair_name
#   instance_type   = var.backend_instance_type
#   
#   db_instance_class = var.db_instance_class
#   db_name           = var.db_name
#   db_username       = var.db_username
#   db_password       = var.db_password
# }
