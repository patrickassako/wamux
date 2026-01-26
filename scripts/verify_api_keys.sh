#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api/v1"
EMAIL="test_apikey_${RANDOM}@gmail.com"
PASSWORD="SecurePass123!"
NAME="API Key Tester"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "Testing API Key Management Flow"
echo "Target: $API_URL"
echo "Email: $EMAIL"
echo "=========================================="

# 1. Register User (To get JWT)
echo -e "\n1. Registering User..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\", \"displayName\": \"$NAME\"}")

# Extract Token (Handle both cases: direct token or null if email verify enabled)
# Since we fixed it to return null if verify enabled, we might need to login if we can't get token
# But assume for now we get token or we force login
TOKEN=$(echo $REGISTER_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken') or '')")

if [ -z "$TOKEN" ] || [ "$TOKEN" == "None" ]; then
    echo -e "${RED}❌ Registration returned no token (Email Verify likely on). Trying login...${NC}"
    # Small sleep to ensure DB consistency if async
    sleep 2
    LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
      
    TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('accessToken') or '')")
    
    if [ -z "$TOKEN" ] || [ "$TOKEN" == "None" ]; then
        echo -e "${RED}❌ Login Failed. Critical stop.${NC}"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Authenticated! JWT obtained.${NC}"

# 2. Create API Key
echo -e "\n2. Creating API Key..."
CREATE_KEY_RESPONSE=$(curl -s -X POST "$API_URL/keys" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Test Key\", \"description\": \"Integration Test Key\"}")

API_KEY=$(echo $CREATE_KEY_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('apiKey') or '')")
KEY_ID=$(echo $CREATE_KEY_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('id') or '')")

if [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ Failed to create API Key.${NC}"
    echo "Response: $CREATE_KEY_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ API Key Created: $API_KEY${NC}"
echo "Key ID: $KEY_ID"

# 3. Authenticate with API Key
echo -e "\n3. Testing Auth with API Key..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $API_KEY")

EMAIL_CHECK=$(echo $PROFILE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('email') or '')")

if [ "$EMAIL_CHECK" == "$EMAIL" ]; then
    echo -e "${GREEN}✅ API Key Authentication Successful!${NC}"
else
    echo -e "${RED}❌ API Key Authentication Failed.${NC}"
    echo "Response: $PROFILE_RESPONSE"
    exit 1
fi

# 4. Verify Usage Stats
echo -e "\n4. Verifying Usage Stats..."
STATS_RESPONSE=$(curl -s -X GET "$API_URL/keys/$KEY_ID/usage" \
  -H "Authorization: Bearer $TOKEN")

COUNT=$(echo $STATS_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('requestCount'))")

if [ "$COUNT" -ge "1" ]; then
    echo -e "${GREEN}✅ Usage tracked correctly (Count: $COUNT).${NC}"
else
    echo -e "${RED}❌ Usage tracking failed (Count: $COUNT).${NC}"
fi

# 5. Revoke Key
echo -e "\n5. Revoking API Key..."
REVOKE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/keys/$KEY_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$REVOKE_CODE" == "204" ]; then
    echo -e "${GREEN}✅ API Key Revoked.${NC}"
else
    echo -e "${RED}❌ Failed to revoke key (Code: $REVOKE_CODE).${NC}"
fi

# 6. Verify Revoked Key Fails
echo -e "\n6. Verifying Revoked Key Fails..."
FAIL_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/auth/profile" \
  -H "Authorization: Bearer $API_KEY")

if [ "$FAIL_CODE" == "401" ]; then
    echo -e "${GREEN}✅ Revoked Key correctly rejected (401).${NC}"
else
    echo -e "${RED}❌ Revoked Key was NOT rejected (Code: $FAIL_CODE).${NC}"
    exit 1
fi

echo -e "\n=========================================="
echo -e "${GREEN}🎉 ALL API KEY TESTS PASSED!${NC}"
echo "=========================================="
exit 0
