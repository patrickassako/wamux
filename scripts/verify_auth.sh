#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api/v1"
EMAIL="test_manual_${RANDOM}@gmail.com"
PASSWORD="SecurePass123!"
NAME="Test Manual User"

echo "=========================================="
echo "Testing Authentication Flow Manual"
echo "Target: $API_URL"
echo "Email: $EMAIL"
echo "=========================================="

echo ""
echo "1. Registering User..."
echo "POST $API_URL/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"displayName\": \"$NAME\"}")

echo "Response: $REGISTER_RESPONSE"

# Extract Token (requires jq, simple grep fallback if no jq)
if command -v jq &> /dev/null; then
    TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')
else
    # Fallback to simple grep/sed parsing (fragile but works for simple json)
    TOKEN=$(echo $REGISTER_RESPONSE | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
fi

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Registration Failed or no token received."
    exit 1
else
    echo "✅ Registration Success! Token received."
    echo "Token: ${TOKEN:0:10}..."
fi

echo ""
echo "2. Fetching Profile (Protected Route)..."
echo "GET $API_URL/auth/profile"
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROFILE_RESPONSE"

if [[ "$PROFILE_RESPONSE" == *"email"* ]]; then
    echo "✅ Profile Fetch Success!"
else
    echo "❌ Profile Fetch Failed!"
fi

echo ""
echo "3. Logging In (Verification)..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

if [[ "$LOGIN_RESPONSE" == *"accessToken"* ]]; then
    echo "✅ Login Success!"
else
    echo "❌ Login Failed!"
    echo "Response: $LOGIN_RESPONSE"
fi

echo ""
echo "=========================================="
echo "Verify in Supabase Dashboard:"
echo "1. Check 'auth.users' table for $EMAIL"
echo "2. Check 'public.profiles' table for matching ID"
echo "=========================================="
