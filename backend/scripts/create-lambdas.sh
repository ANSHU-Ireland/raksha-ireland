#!/usr/bin/env bash
set -euo pipefail

# Create AWS Lambda functions if missing, matching deploy.sh naming

REGION=${REGION:-eu-west-1}
FUNCTION_PREFIX=${FUNCTION_PREFIX:-raksha}
RUNTIME=${RUNTIME:-nodejs20.x}
ROLE_ARN=${ROLE_ARN:-}
MEMORY_SIZE=${MEMORY_SIZE:-256}
TIMEOUT=${TIMEOUT:-15}
SENDER_EMAIL=${SENDER_EMAIL:-anshu.kumar72003@gmail.com}

if [[ -z "$ROLE_ARN" ]]; then
  echo "ERROR: ROLE_ARN is required (IAM role ARN for Lambda)." >&2
  echo "Export it then re-run, e.g.:" >&2
  echo "  export ROLE_ARN=arn:aws:iam::<account-id>:role/<lambda-execution-role>" >&2
  exit 1
fi

# Environment variables for all functions (override via export if needed)
USERS_TABLE=${USERS_TABLE:-Users}
JWT_SECRET=${JWT_SECRET:-change-me}
SENDER_EMAIL=${SENDER_EMAIL:-admin@rakshaireland.org}
FRONTEND_URL=${FRONTEND_URL:-https://your-domain.com}
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID:-}
COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID:-}

declare -a FUNCTIONS=(
  signup
  login
  logout
  approveUser
  activateUser
  sosTrigger
  health
)

capitalize_first() { local s="$1"; echo "${s^}"; }

zip_dir="$(pwd)/deploy"
mkdir -p "$zip_dir"

for func in "${FUNCTIONS[@]}"; do
  name="${FUNCTION_PREFIX}$(capitalize_first "$func")"
  zip_path="$zip_dir/$func.zip"

  if ! aws lambda get-function --function-name "$name" --region "$REGION" >/dev/null 2>&1; then
    echo "Creating Lambda $name ..."
    # Ensure zip exists (use deploy.sh packaging if available)
    if [[ ! -f "$zip_path" ]]; then
      echo "  Packaging $func.js ..."
      tmpdir=$(mktemp -d)
      cp "functions/$func.js" "$tmpdir/"
      cp package.json "$tmpdir/"
      pushd "$tmpdir" >/dev/null
      npm install --production --silent
      zip -r "$zip_path" . >/dev/null
      popd >/dev/null
      rm -rf "$tmpdir"
    fi

    aws lambda create-function \
      --function-name "$name" \
      --runtime "$RUNTIME" \
      --role "$ROLE_ARN" \
      --handler "functions/$func.handler" \
      --zip-file "fileb://$zip_path" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY_SIZE" \
      --region "$REGION" \
      --environment "Variables={USERS_TABLE=$USERS_TABLE,JWT_SECRET=$JWT_SECRET,SENDER_EMAIL=$SENDER_EMAIL,FRONTEND_URL=$FRONTEND_URL,COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID,COGNITO_CLIENT_ID=$COGNITO_CLIENT_ID}" >/dev/null
    echo "  ✅ Created $name"
  else
    echo "Skipping $name (already exists)."
  fi
done

echo "Done. You can now run backend/deploy.sh to update code versions."
