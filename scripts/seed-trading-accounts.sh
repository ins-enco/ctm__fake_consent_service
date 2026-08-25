#!/usr/bin/env bash
#
# Seed synthetic trading accounts for one user on one broker, with broker consent
# already granted, so the SF consent/KYC flow can be exercised at volume.
#
# Per account it writes:
#   1. Accounts          — BrokerID, and a Configuration INI carrying Login=<n>.
#                          Real newlines (CHAR(10)) are required: AccountConfigParser
#                          splits on '\n', so a literal backslash-n blob parses to null.
#   2. UserTradeAccounts — UserID + TradeAccountID with Enable=1. The resolver filters
#                          on Enable=1, so an account without this row is invisible.
#   3. datasource3       — each Login is appended to the user's existing consent row for
#                          the broker. Legacy brokers (ConsentType=0) reset Status to 0
#                          unless the polled login appears here.
#
# Every seeded row is tagged `Name = <prefix><login>` so cleanup is unambiguous, and a
# rollback script is written before anything is inserted.
#
# Usage:
#   CTM_DB_PASS='...' ./scripts/seed-trading-accounts.sh -u 2 -b 1 -n 50 [--start-login 900000001] [--dry-run]

set -euo pipefail

DB_HOST="${CTM_DB_HOST:-10.28.30.102}"
DB_PORT="${CTM_DB_PORT:-3306}"
DB_NAME="${CTM_DB_NAME:-ctm_backup}"
DB_USER="${CTM_DB_USER:-ctm_admin}"

USER_ID=""
BROKER_ID=""
COUNT=""
START_LOGIN=900000001
PREFIX="SEED-"
DRY_RUN=0

die() { echo "error: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    -u|--user)        USER_ID="$2"; shift 2 ;;
    -b|--broker)      BROKER_ID="$2"; shift 2 ;;
    -n|--count)       COUNT="$2"; shift 2 ;;
    --start-login)    START_LOGIN="$2"; shift 2 ;;
    --prefix)         PREFIX="$2"; shift 2 ;;
    --dry-run)        DRY_RUN=1; shift ;;
    -h|--help)        sed -n '2,22p' "$0"; exit 0 ;;
    *)                die "unknown argument: $1" ;;
  esac
done

[[ -n "$USER_ID" ]]   || die "missing -u <userId>"
[[ -n "$BROKER_ID" ]] || die "missing -b <brokerId>"
[[ -n "$COUNT" ]]     || die "missing -n <count>"
[[ -n "${CTM_DB_PASS:-}" ]] || die "CTM_DB_PASS is not set"
[[ "$USER_ID" =~ ^[0-9]+$ && "$BROKER_ID" =~ ^[0-9]+$ ]] || die "userId/brokerId must be numeric"
[[ "$COUNT" =~ ^[0-9]+$ && "$COUNT" -ge 1 && "$COUNT" -le 500 ]] || die "count must be 1..500"
[[ "$START_LOGIN" =~ ^[0-9]+$ ]] || die "start-login must be numeric"

sql() {
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$CTM_DB_PASS" "$DB_NAME" \
    --skip-ssl --connect-timeout=20 -N -B -e "$1"
}

# ── preflight ───────────────────────────────────────────────────────────────────
read -r BROKER_NAME <<<"$(sql "SELECT COALESCE(Name,'') FROM Brokers WHERE ID=${BROKER_ID};")"
[[ -n "$BROKER_NAME" ]] || die "broker ${BROKER_ID} not found"

read -r CONSENT_ID <<<"$(sql "
  SELECT COALESCE(MIN(ID),0) FROM UserBrokerConsents
  WHERE UserID=${USER_ID} AND BrokerID=${BROKER_ID};")"

END_LOGIN=$((START_LOGIN + COUNT - 1))
read -r COLLISIONS <<<"$(sql "
  SELECT COUNT(*) FROM Accounts
  WHERE Configuration REGEXP CONCAT('Login=(', (
    SELECT GROUP_CONCAT(n SEPARATOR '|') FROM (
      SELECT ${START_LOGIN} + t.i AS n FROM (
        SELECT a.N + b.N*10 + c.N*100 AS i FROM
          (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
          (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b,
          (SELECT 0 N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c
      ) t WHERE t.i < ${COUNT}
    ) x
  ), ')');")"
[[ "$COLLISIONS" -eq 0 ]] || die "${COLLISIONS} account(s) already use logins in ${START_LOGIN}..${END_LOGIN}"

echo "target      : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "user        : ${USER_ID}"
echo "broker      : ${BROKER_ID} (${BROKER_NAME})"
echo "accounts    : ${COUNT}, logins ${START_LOGIN}..${END_LOGIN}, tagged '${PREFIX}<login>'"
if [[ "$CONSENT_ID" -eq 0 ]]; then
  echo "consent     : no existing row — one will be created with all ${COUNT} logins"
else
  echo "consent     : row ID ${CONSENT_ID} — ${COUNT} logins appended to datasource3, Status=1"
fi
echo

# ── build statements ────────────────────────────────────────────────────────────
ACCOUNT_VALUES=""
DS3_ENTRIES=""
for ((i = 0; i < COUNT; i++)); do
  login=$((START_LOGIN + i))
  cfg="CONCAT('[Account]',CHAR(10),'Type=MT4',CHAR(10),'Name=${BROKER_NAME}',CHAR(10),CHAR(10),'[MT4]',CHAR(10),'Login=${login}',CHAR(10),'Password=seed',CHAR(10))"
  # Type/Currency/Flags are bigints on this schema, not strings — Type=0 and Flags=0
  # match every real account; Currency 6 mirrors the known-good template (acc 2353).
  [[ -n "$ACCOUNT_VALUES" ]] && ACCOUNT_VALUES+=","
  ACCOUNT_VALUES+="(${BROKER_ID},0,6,0,'${PREFIX}${login}',${cfg},NOW())"
  [[ -n "$DS3_ENTRIES" ]] && DS3_ENTRIES+=","
  DS3_ENTRIES+="{\"account_number\":\"${login}\",\"trading_platform\":\"MetaTrader 4\"}"
done

INSERT_ACCOUNTS="INSERT INTO Accounts (BrokerID, Type, Currency, Flags, Name, Configuration, Timestamp) VALUES ${ACCOUNT_VALUES};"

# UserTradeAccounts rows are derived from what the insert actually created, so the
# auto_increment ids never have to be guessed.
LINK_ACCOUNTS="INSERT INTO UserTradeAccounts (UserID, TradeAccountID, Enable, Added, Updated)
  SELECT ${USER_ID}, a.ID, 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP()
  FROM Accounts a
  WHERE a.BrokerID=${BROKER_ID} AND a.Name LIKE '${PREFIX}%'
    AND NOT EXISTS (SELECT 1 FROM UserTradeAccounts u
                    WHERE u.UserID=${USER_ID} AND u.TradeAccountID=a.ID);"

if [[ "$CONSENT_ID" -eq 0 ]]; then
  # No CAST(... AS JSON): the server is MariaDB, where JSON is a LONGTEXT alias and the
  # JSON_* functions take JSON strings directly — CAST AS JSON is a syntax error there.
  GRANT_CONSENT="INSERT INTO UserBrokerConsents (UserID, BrokerID, Status, UserRawData, Timestamp)
    VALUES (${USER_ID}, ${BROKER_ID}, 1,
            JSON_OBJECT('datasource3', JSON_EXTRACT('[${DS3_ENTRIES}]','\$')), NOW());"
else
  GRANT_CONSENT="UPDATE UserBrokerConsents
    SET Status=1,
        UserRawData = JSON_SET(
          CASE WHEN JSON_VALID(UserRawData)
                AND JSON_TYPE(JSON_EXTRACT(UserRawData,'\$.datasource3'))='ARRAY'
               THEN UserRawData ELSE JSON_OBJECT('datasource3', JSON_ARRAY()) END,
          '\$.datasource3',
          JSON_MERGE_PRESERVE(
            COALESCE(JSON_EXTRACT(
              CASE WHEN JSON_VALID(UserRawData)
                    AND JSON_TYPE(JSON_EXTRACT(UserRawData,'\$.datasource3'))='ARRAY'
                   THEN UserRawData ELSE JSON_OBJECT('datasource3', JSON_ARRAY()) END,
              '\$.datasource3'), JSON_ARRAY()),
            JSON_EXTRACT('[${DS3_ENTRIES}]','\$'))),
        Timestamp = NOW()
    WHERE ID=${CONSENT_ID};"
fi

# ── rollback, written before any insert ─────────────────────────────────────────
STAMP="u${USER_ID}-b${BROKER_ID}-${START_LOGIN}"
ROLLBACK="rollback-seed-${STAMP}.sql"
{
  echo "-- rollback for ${COUNT} seeded accounts, user ${USER_ID}, broker ${BROKER_ID}"
  echo "DELETE u FROM UserTradeAccounts u JOIN Accounts a ON a.ID=u.TradeAccountID"
  echo "  WHERE u.UserID=${USER_ID} AND a.BrokerID=${BROKER_ID} AND a.Name LIKE '${PREFIX}%';"
  echo "DELETE FROM Accounts WHERE BrokerID=${BROKER_ID} AND Name LIKE '${PREFIX}%';"
  if [[ "$CONSENT_ID" -eq 0 ]]; then
    echo "DELETE FROM UserBrokerConsents WHERE UserID=${USER_ID} AND BrokerID=${BROKER_ID};"
  else
    sql "SELECT CONCAT('UPDATE UserBrokerConsents SET Status=',COALESCE(Status,'NULL'),
      ', UserRawData=',QUOTE(UserRawData),', Timestamp=',QUOTE(Timestamp),' WHERE ID=',ID,';')
      FROM UserBrokerConsents WHERE ID=${CONSENT_ID};"
  fi
} > "$ROLLBACK"
echo "rollback written: ${ROLLBACK} ($(wc -c <"$ROLLBACK") bytes)"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "--- dry run, nothing written ---"
  echo "${INSERT_ACCOUNTS}" | cut -c1-300
  echo "  ... (${COUNT} account rows)"
  echo "${LINK_ACCOUNTS}"
  echo "${GRANT_CONSENT}" | cut -c1-300
  exit 0
fi

sql "START TRANSACTION; ${INSERT_ACCOUNTS} ${LINK_ACCOUNTS} ${GRANT_CONSENT} COMMIT;"

echo "--- applied, verifying ---"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$CTM_DB_PASS" "$DB_NAME" \
  --skip-ssl --connect-timeout=20 --table -e "
  SELECT COUNT(*) AS seededAccounts FROM Accounts
   WHERE BrokerID=${BROKER_ID} AND Name LIKE '${PREFIX}%';
  SELECT COUNT(*) AS enabledLinks FROM UserTradeAccounts u JOIN Accounts a ON a.ID=u.TradeAccountID
   WHERE u.UserID=${USER_ID} AND u.Enable=1 AND a.Name LIKE '${PREFIX}%';
  SELECT Status, JSON_LENGTH(JSON_EXTRACT(UserRawData,'\$.datasource3')) AS ds3Accounts
   FROM UserBrokerConsents WHERE UserID=${USER_ID} AND BrokerID=${BROKER_ID};"

# The end-to-end assertion that matters: how many seeded accounts would
# CheckConsentAsync actually report as completed.
echo "--- CheckConsentAsync would return Completed=true for ---"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$CTM_DB_PASS" "$DB_NAME" \
  --skip-ssl --connect-timeout=20 --table -e "
  SELECT COUNT(*) AS passingAccounts
  FROM UserTradeAccounts uta
  JOIN Accounts a ON a.ID=uta.TradeAccountID
  JOIN UserBrokerConsents c ON c.UserID=uta.UserID AND c.BrokerID=a.BrokerID
  WHERE uta.UserID=${USER_ID} AND uta.Enable=1 AND a.Name LIKE '${PREFIX}%'
    AND c.Status=1
    AND JSON_CONTAINS(JSON_EXTRACT(c.UserRawData,'\$.datasource3[*].account_number'),
          JSON_QUOTE(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.Configuration,'Login=',-1),CHAR(10),1))))=1;"
