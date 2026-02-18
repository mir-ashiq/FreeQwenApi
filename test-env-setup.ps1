# Test .env Configuration

# Create test .env
Write-Output "Testing .env token configuration..."

# Backup existing .env if it exists
if (Test-Path .env) {
    Write-Output "Backing up existing .env to .env.backup"
    Copy-Item .env .env.backup -Force
}

# Create test .env with a dummy token
$testToken = "test_token_from_env_123456789"
Write-Output "QWEN_TOKEN=$testToken" | Out-File -FilePath .env -Encoding utf8

Write-Output "`n✅ Created .env with test token"
Write-Output "QWEN_TOKEN=$testToken"

Write-Output "`nTo test with your real token:"
Write-Output "1. Edit .env and replace with your actual token from https://chat.qwen.ai"
Write-Output "2. Run: npm start"
Write-Output "3. Check: curl http://localhost:3264/api/status"

Write-Output "`nTo restore your original .env (if backed up):"
Write-Output "  Move-Item .env.backup .env -Force"
