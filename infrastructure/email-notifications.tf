# Lambda Module
module "lambda_function" {
  source = "./modules/lambda"

  function_name = "spm-g4t5-prod-email-notifications"
  description   = "Sends task deadline email notifications"
  handler       = "lambda/email-notification-handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 300
  memory_size   = 512
  
  source_path = [
    {
      path = "${path.module}/../backend/src"
      patterns = [
        "lambda/.*",
        "services/email-notification.services.js",
        "models/task.model.js",
        "models/user.model.js",
        "models/notification.model.js",
        "config/db.js",
        "!app.js",
        "!server.js",
        "!routes/.*",
        "!controllers/.*",
        "!middleware/.*",
        "!.*\\.test\\.js$",
        "!test/.*",
      ]
      npm_requirements = "${path.module}/../backend/src/lambda/package.json"
    }
  ]
  
  environment_variables = {
    NODE_ENV = "production"
  }
  
  # Attach SSM read policy
  attach_policy_statements = true
  policy_statements = {
    ssm_read = {
      effect = "Allow"
      actions = [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ]
      resources = [
        "arn:aws:ssm:${var.aws_region}:*:parameter/spm-g4t5/prod/*"
      ]
    }
  }
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# EventBridge Rule (Cron Schedule)
resource "aws_cloudwatch_event_rule" "deadline_notifications" {
  name                = "${var.project_name}-${var.environment}-deadline-notifications"
  description         = "Trigger Lambda every hour to check task deadlines"
  schedule_expression = "cron(0 0 * * ? *)"
  
  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# EventBridge Target (Lambda)
resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.deadline_notifications.name
  target_id = "DeadlineNotificationsLambda"
  arn       = module.lambda_function.lambda_function_arn
}

# Lambda Permission for EventBridge
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda_function.lambda_function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.deadline_notifications.arn
}