import Joi from "joi";

/**
 * Validation for the Legacy-journey (ConsentType = 0) broker handover.
 *
 * datasource3 is the only part the CTM read path gates on — see
 * SfBrokerConsentService.CheckConsentAsync — so it is the only part required
 * here, and account_number is required within it. Everything else is KYC
 * pre-fill data that the broker may or may not populate.
 *
 * `datasource1`/`datasource2` are left permissive (`unknown(true)`) on purpose:
 * they are the broker's payload, brokers add fields over time, and rejecting an
 * unrecognised field would break the handover for no benefit — the fake service
 * must be at least as tolerant as the real consumer.
 */
const BrokerHandoverSchema = Joi.object({
  customer_no: Joi.string().allow(""),

  datasource1: Joi.array().items(Joi.object().unknown(true)).allow(null),

  datasource2: Joi.array()
    .items(
      Joi.object({
        eqaq_id: Joi.string().allow(""),
        questions: Joi.string().allow(""),
        answers: Joi.string().allow("").allow(null),
      }).unknown(true),
    )
    .allow(null),

  // The gate. Without a matching account_number here, CheckConsentAsync resets
  // Status to 0 — so this array must exist and carry at least one entry.
  datasource3: Joi.array()
    .items(
      Joi.object({
        account_number: Joi.string().pattern(/^\d+$/).required(),
        trading_platform: Joi.string()
          .valid("MetaTrader 4", "MetaTrader 5")
          .allow(""),
      }).unknown(true),
    )
    .min(1)
    .required(),

  signature: Joi.string().allow(""),
  uid: Joi.string().allow(""),
}).unknown(true);

export default BrokerHandoverSchema;
