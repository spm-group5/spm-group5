# infrastructure/alb.tf

# 1. Request SSL Certificate from ACM 
resource "aws_acm_certificate" "backend" {
  domain_name       = "api.jonongca.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-backend-cert"
    Environment = var.environment
    Project     = var.project_name
  }
}

# 2. DNS validation record (you'll add this to Cloudflare manually)
output "acm_validation_records" {
  description = "Add these DNS records to Cloudflare to validate SSL certificate"
  value = {
    for dvo in aws_acm_certificate.backend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }
}

# 3. ALB with HTTPS
module "alb" {
  source = "./modules/alb"

  name               = "${var.project_name}-${var.environment}-alb"
  load_balancer_type = "application"
  vpc_id             = module.vpc.vpc_id
  subnets            = module.vpc.public_subnets
  putin_khuylo       = true
  
  # Security groups (HTTP + HTTPS)
  security_group_ingress_rules = {
    http = {
      from_port   = 80
      to_port     = 80
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
      description = "HTTP from internet"
    }
    https = {
      from_port   = 443
      to_port     = 443
      ip_protocol = "tcp"
      cidr_ipv4   = "0.0.0.0/0"
      description = "HTTPS from internet"
    }
  }

  security_group_egress_rules = {
    all = {
      ip_protocol = "-1"
      cidr_ipv4   = "0.0.0.0/0"
    }
  }

  # Target group
  target_groups = {
    backend = {
        target_id = module.backend_ec2.id
      name_prefix = "back-"
      protocol    = "HTTP"
      port        = 3000
      target_type = "instance"

      health_check = {
        enabled             = true
        healthy_threshold   = 2
        interval            = 30
        matcher             = "200"
        path                = "/"
        port                = "traffic-port"
        protocol            = "HTTP"
        timeout             = 5
        unhealthy_threshold = 2
      }

      targets = {
        backend_ec2 = {
          port      = 3000
        }
      }
    }
  }

  # Listeners
  listeners = {
    # HTTPS listener (primary)
    https = {
      port            = 443
      protocol        = "HTTPS"
      ssl_policy      = "ELBSecurityPolicy-TLS13-1-2-2021-06"
      certificate_arn = aws_acm_certificate.backend.arn

      forward = {
        target_group_key = "backend"
      }
    }

    # HTTP listener (redirect to HTTPS)
    http = {
      port     = 80
      protocol = "HTTP"

      redirect = {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Allow ALB to reach backend
resource "aws_security_group_rule" "backend_from_alb" {
  type                     = "ingress"
  from_port                = 3000
  to_port                  = 3000
  protocol                 = "tcp"
  source_security_group_id = module.alb.security_group_id
  security_group_id        = module.backend_security_group.security_group_id
  description              = "Allow traffic from ALB"
}