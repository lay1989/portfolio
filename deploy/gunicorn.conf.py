"""Small initial footprint; size with measurements after selecting the portfolio VM."""

import os

bind = "127.0.0.1:8001"
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "sync"
threads = 1
timeout = 60
graceful_timeout = 30
max_requests = 1000
max_requests_jitter = 100
preload_app = False
accesslog = None  # nginx logs only status/latency, never URLs, cookies or form data.
errorlog = "-"
loglevel = "warning"
capture_output = False
forwarded_allow_ips = ""  # Flask's opt-in loopback middleware owns proxy trust.
secure_scheme_headers = {}
limit_request_line = 4094
limit_request_fields = 50
limit_request_field_size = 8190
