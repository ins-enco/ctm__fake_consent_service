#!/usr/bin/env bash
#
# Mark a user as having already granted broker consent (and optionally KYC),
# so the SF onboarding flow skips the consent / KYC steps during testing.
#
# Gates this satisfies, per SfBrokerConsentService.CheckConsentAsync:
#   1. a UserBrokerConsents row must exist for UserID + BrokerID
#   2. Status must be 1
#   3. unless the broker is a Standard journey ([ConsentStep] ConsentType=1),
#      UserRawData must carry datasource3[].account_number == the trading
#      account id — miss this and CheckConsentAsync resets Status back to 0.
#
# Usage:
#   CTM_DB_PASS='...' ./scripts/patch-consent.sh -u <userId> -b <brokerId> -a <accountNumber> [--kyc] [--dry-run]
#
# Connection is read from the environment so no credential lands in the repo:
#   CTM_DB_HOST (default 10.28.30.102)
#   CTM_DB_PORT (default 3306)
#   CTM_DB_NAME (default ctm_backup)
#   CTM_DB_USER (default ctm_admin)
#   CTM_DB_PASS (required)

set -euo pipefail

DB_HOST="${CTM_DB_HOST:-10.28.30.102}"
DB_PORT="${CTM_DB_PORT:-3306}"
DB_NAME="${CTM_DB_NAME:-ctm_backup}"
DB_USER="${CTM_DB_USER:-ctm_admin}"

USER_ID=""
BROKER_ID=""
ACCOUNT_NUMBER=""
WITH_KYC=0
DRY_RUN=0

die() {
  echo "error: $*" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--user)    USER_ID="$2"; shift 2 ;;
    -b|--broker)  BROKER_ID="$2"; shift 2 ;;
    -a|--account) ACCOUNT_NUMBER="$2"; shift 2 ;;
    --kyc)        WITH_KYC=1; shift ;;
    --dry-run)    DRY_RUN=1; shift ;;
    -h|--help)    sed -n '2,26p' "$0"; exit 0 ;;
    *)            die "unknown argument: $1" ;;
  esac
done

[[ -n "$USER_ID" ]]        || die "missing -u <userId>"
[[ -n "$BROKER_ID" ]]      || die "missing -b <brokerId>"
[[ -n "$ACCOUNT_NUMBER" ]] || die "missing -a <accountNumber>"
[[ -n "${CTM_DB_PASS:-}" ]] || die "CTM_DB_PASS is not set"

[[ "$USER_ID" =~ ^[0-9]+$ ]]        || die "userId must be numeric"
[[ "$BROKER_ID" =~ ^[0-9]+$ ]]      || die "brokerId must be numeric"
[[ "$ACCOUNT_NUMBER" =~ ^[0-9]+$ ]] || die "accountNumber must be numeric"

run_sql() {
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$CTM_DB_PASS" "$DB_NAME" \
    --skip-ssl --connect-timeout=15 -N -B -e "$1"
}

RAW_DATA="{\"datasource3\":[{\"account_number\":\"${ACCOUNT_NUMBER}\"}]}"

# UserBrokerConsents has no unique key on (UserID, BrokerID), so an upsert is not
# available — update first, insert only when nothing was there to update.
#
# UserRawData is treated as non-destructively as possible: rows carrying a real
# broker handover already list every confirmed account, and clobbering that with
# a synthetic single-account blob would throw away real data and silently
# un-confirm every other account. So only the minimum needed is written.
read -r EXISTING_CONSENT <<<"$(run_sql "
  SELECT COUNT(*) FROM UserBrokerConsents
  WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID};")"

if [[ "$EXISTING_CONSENT" -gt 0 ]]; then
  # 1 = account already confirmed, 0 = valid datasource3 but account absent,
  # -1 = no usable JSON to preserve.
  read -r RAW_STATE <<<"$(run_sql "
    SELECT CASE
      WHEN JSON_VALID(UserRawData)
       AND JSON_CONTAINS(JSON_EXTRACT(UserRawData,'\$.datasource3[*].account_number'),
                         JSON_QUOTE('${ACCOUNT_NUMBER}')) THEN 1
      WHEN JSON_VALID(UserRawData)
       AND JSON_TYPE(JSON_EXTRACT(UserRawData,'\$.datasource3')) = 'ARRAY' THEN 0
      ELSE -1 END
    FROM UserBrokerConsents
    WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID} LIMIT 1;")"

  case "$RAW_STATE" in
    1)
      CONSENT_SQL="UPDATE UserBrokerConsents SET Status = 1, Timestamp = NOW()
         WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID};"
      CONSENT_ACTION="flip Status to 1 (account ${ACCOUNT_NUMBER} already confirmed, UserRawData untouched)"
      ;;
    0)
      CONSENT_SQL="UPDATE UserBrokerConsents
         SET Status = 1,
             UserRawData = JSON_ARRAY_APPEND(UserRawData, '\$.datasource3',
                             CAST('{\"account_number\":\"${ACCOUNT_NUMBER}\"}' AS JSON)),
             Timestamp = NOW()
         WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID};"
      CONSENT_ACTION="flip Status to 1 and append account ${ACCOUNT_NUMBER} to existing datasource3"
      ;;
    *)
      CONSENT_SQL="UPDATE UserBrokerConsents
         SET Status = 1, UserRawData = '${RAW_DATA}', Timestamp = NOW()
         WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID};"
      CONSENT_ACTION="flip Status to 1 and write synthetic datasource3 (no usable JSON present)"
      ;;
  esac
else
  CONSENT_SQL="INSERT INTO UserBrokerConsents (UserID, BrokerID, Status, UserRawData, Timestamp)
     VALUES (${USER_ID}, ${BROKER_ID}, 1, '${RAW_DATA}', NOW());"
  CONSENT_ACTION="insert a new row with synthetic datasource3"
fi

KYC_SQL=""
KYC_ACTION="skipped (pass --kyc to include)"
if [[ "$WITH_KYC" -eq 1 ]]; then
  read -r EXISTING_KYC <<<"$(run_sql "SELECT COUNT(*) FROM KYCInfo WHERE UserID = ${USER_ID};")"
  if [[ "$EXISTING_KYC" -gt 0 ]]; then
    KYC_ACTION="already present (${EXISTING_KYC} row(s)) — left untouched"
  else
    KYC_SQL="INSERT INTO KYCInfo (UserID) VALUES (${USER_ID});"
    KYC_ACTION="insert a new row"
  fi
fi

echo "target      : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "userId      : ${USER_ID}"
echo "brokerId    : ${BROKER_ID}"
echo "account     : ${ACCOUNT_NUMBER}"
echo "consent     : ${CONSENT_ACTION}"
echo "kyc         : ${KYC_ACTION}"
echo

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "--- dry run, nothing written ---"
  echo "$CONSENT_SQL"
  [[ -n "$KYC_SQL" ]] && echo "$KYC_SQL"
  exit 0
fi

# Both statements in one transaction so a KYC failure cannot leave a half-applied state.
run_sql "START TRANSACTION; ${CONSENT_SQL} ${KYC_SQL} COMMIT;"

echo "--- applied, verifying ---"
# UserRawData holds the broker's full KYC handover, including customer PII, so
# only summarise it here — never echo the blob to a terminal or a log.
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$CTM_DB_PASS" "$DB_NAME" \
  --skip-ssl --connect-timeout=15 --table -e "
  SELECT ID, UserID, BrokerID, Status,
         JSON_LENGTH(JSON_EXTRACT(UserRawData,'\$.datasource3')) AS ds3Accounts,
         JSON_CONTAINS(JSON_EXTRACT(UserRawData,'\$.datasource3[*].account_number'),
                       JSON_QUOTE('${ACCOUNT_NUMBER}')) AS accountConfirmed,
         LENGTH(UserRawData) AS rawBytes,
         Timestamp
  FROM UserBrokerConsents WHERE UserID = ${USER_ID} AND BrokerID = ${BROKER_ID};
  SELECT COUNT(*) AS kyc_rows FROM KYCInfo WHERE UserID = ${USER_ID};"
