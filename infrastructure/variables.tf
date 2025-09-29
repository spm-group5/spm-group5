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
    default     = "spm-g5t4"
}

variable "frontend_bucket"{
    description = "The name of the S3 bucket for frontend"
    type        = string
    default     = "spmg5t4-react-frontend"
}

variable "tfstate_bucket" {
    description = "The name of the S3 bucket to store the terraform state"
    type        = string
    default     = "spmg5t4-tfstate"
}

variable "frontend_s3_website_endpoint" {
    description = "The S3 website endpoint for the frontend"
    type        = string
    default     = "http://spmg5t4-react-frontend.s3-website-ap-southeast-1.amazonaws.com"
}