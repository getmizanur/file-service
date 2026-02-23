// application/dto/subscription-dto.js
class SubscriptionDTO {
  setSubscriptionId(v) { this.subscription_id = v; }
  setTenantId(v) { this.tenant_id = v; }
  setPlanId(v) { this.plan_id = v; }
  setStatus(v) { this.status = v; }
  setCurrentPeriodStart(v) { this.current_period_start = v; }
  setCurrentPeriodEnd(v) { this.current_period_end = v; }
  setExternalRef(v) { this.external_ref = v; }
  setCreatedDt(v) { this.created_dt = v; }

  // Joined from tenant
  setTenantName(v) { this.tenant_name = v; }

  // Joined from plan
  setPlanName(v) { this.plan_name = v; }
  setPlanCode(v) { this.plan_code = v; }
  setMonthlyPricePence(v) { this.monthly_price_pence = v; }
}

module.exports = SubscriptionDTO;
