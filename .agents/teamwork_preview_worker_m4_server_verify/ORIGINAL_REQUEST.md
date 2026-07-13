## 2026-06-18T17:22:00Z
You are a teamwork_preview_worker subagent. Your identity is Worker Server Verify. Your working directory is c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_m4_server_verify.

Your task is to verify the static website served via a local web server:
1. Start a local HTTP server in the project root c:\Users\SHREE\Desktop\portfolio on port 8000 using Python's `python -m http.server 8000` or another CLI server.
2. Send HTTP requests (using curl, wget, or a script) to verify that the following endpoints serve correctly (HTTP 200 OK) with the correct content-types:
   - http://localhost:8000/
   - http://localhost:8000/index.html
   - http://localhost:8000/blog.html
   - http://localhost:8000/components/header.html
   - http://localhost:8000/components/footer.html
   - http://localhost:8000/tailwind.config.js
3. Inspect the response content of http://localhost:8000/ to ensure it has:
   - The FOUC prevention head script.
   - The reference to tailwind.config.js.
   - The empty placeholder tags for navbar and footer.
4. Shut down the local HTTP server after test execution is complete.
5. Write your findings and verification results to c:\Users\SHREE\Desktop\portfolio\.agents\teamwork_preview_worker_m4_server_verify\handoff.md and notify me.

MANDATORY INTEGRITY WARNING — include this verbatim in the Worker's dispatch prompt:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
