"""
UrbanFlow Command Center — Audit Logging (Priority 10)
Structured JSON logging for production monitoring and compliance.
"""
import logging
import json
import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "module": record.module,
            "message": record.getMessage(),
        }
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "action"):
            log_data["action"] = record.action
        if hasattr(record, "resource"):
            log_data["resource"] = record.resource
            
        return json.dumps(log_data)

# Setup a specialized logger for audit trails
audit_logger = logging.getLogger("urbanflow.audit")
audit_logger.setLevel(logging.INFO)

if not audit_logger.handlers:
    ch = logging.StreamHandler()
    ch.setFormatter(JSONFormatter())
    audit_logger.addHandler(ch)

def log_action(user_id: str, action: str, resource: str, details: dict = None):
    """Log an auditable action to standard output in JSON format."""
    extra = {
        "user_id": user_id,
        "action": action,
        "resource": resource
    }
    msg = json.dumps(details) if details else "Action executed"
    audit_logger.info(msg, extra=extra)
