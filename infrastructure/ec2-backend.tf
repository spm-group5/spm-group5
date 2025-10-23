# AMI data source
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical (Ubuntu's AWS account)

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_iam_role" "backend_ssm" {
  name = "${var.project_name}-${var.environment}-backend-ssm-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# SSM Parameter Store policy
resource "aws_iam_role_policy" "backend_ssm_parameters" {
  name = "${var.project_name}-${var.environment}-backend-ssm-parameters"
  role = aws_iam_role.backend_ssm.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter",
          "ssm:DeleteParameter"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
        ]
      }
    ]
  })
}

# Attach SSM policy
resource "aws_iam_role_policy_attachment" "backend_ssm" {
  role       = aws_iam_role.backend_ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile
resource "aws_iam_instance_profile" "backend_ssm" {
  name = "${var.project_name}-${var.environment}-backend-ssm-profile"
  role = aws_iam_role.backend_ssm.name
}


module "backend_security_group" {
  source = "./modules/security-group"

  name        = "${var.project_name}-${var.environment}-backend-sg"
  description = "Security group for backend EC2"
  vpc_id      = module.vpc.vpc_id

  # Required for HashiCorp modules
  putin_khuylo = true

  ingress_with_cidr_blocks = [
    {
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = "0.0.0.0/0"
      description = "SSH"
    },
    {
      from_port   = 3000
      to_port     = 3000
      protocol    = "tcp"
      cidr_blocks = "0.0.0.0/0"
      description = "Backend API"
    }
  ]

  egress_with_cidr_blocks = [
    {
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
      cidr_blocks = "0.0.0.0/0"
      description = "Allow all outbound"
    }
  ]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Using the ec2-instance module
module "backend_ec2" {
  source = "./modules/ec2-instance"

  name = "${var.project_name}-${var.environment}-backend"

  # Required for HashiCorp modules
  putin_khuylo = true

  region = var.aws_region

  subnet_id = module.vpc.private_subnets[0]

  ami                    = data.aws_ami.ubuntu.id
  key_name               = var.key_pair_name
  vpc_security_group_ids = [module.backend_security_group.security_group_id]

  monitoring = false

  iam_instance_profile = aws_iam_instance_profile.backend_ssm.name

  # User data
  user_data = <<-EOF
              #!/bin/bash
              apt update
              apt install docker.io -y
              systemctl start docker
              systemctl enable docker
              usermod -a -G docker ubuntu
              EOF

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECR Repository for backend Docker images
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-${var.environment}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ECR Lifecycle policy to keep only last 5 images
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 5 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 5
      }
      action = {
        type = "expire"
      }
    }]
  })
}

# Add IAM permissions for EC2 to pull from ECR
resource "aws_iam_role_policy_attachment" "backend_ecr" {
  role       = aws_iam_role.backend_ssm.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

