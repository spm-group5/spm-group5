variable "aws_region" {
  description = "The AWS region to deploy resources in"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Env of the deployment"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "spm-g4t5"
}

variable "frontend_bucket" {
  description = "The name of the S3 bucket for frontend"
  type        = string
  default     = "spm-g4t5-react-frontend"
}

variable "tfstate_bucket" {
  description = "The name of the S3 bucket to store the terraform state"
  type        = string
  default     = "spm-g4t5-tfstate"
}

variable "frontend_s3_website_endpoint" {
  description = "The S3 website endpoint for the frontend"
  type        = string
  default     = "http://spm-g4t5-react-frontend.s3-website-ap-southeast-1.amazonaws.com"
}

variable "vpc_cidr" {
  description = "cidr for vpc-g4t5"
  type        = string
  default     = "10.0.0.0/16"
}

variable "key_pair_name" {
  description = "keypair_name"
  type        = string
  default     = "g4t5-key-pair"
}