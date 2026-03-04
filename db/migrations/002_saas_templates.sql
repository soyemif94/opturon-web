-- 002_saas_templates.sql
CREATE TABLE IF NOT EXISTS industry_templates (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  default_faqs JSON NOT NULL,
  default_categories JSON NOT NULL,
  default_products JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_metrics (
  tenant_id TEXT PRIMARY KEY,
  last_activity_at TIMESTAMP,
  messages_7d INTEGER DEFAULT 0,
  webhook_errors_7d INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

