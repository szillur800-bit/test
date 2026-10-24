# Windows Print Agent
1. Install Python 3.11+ on the shop Windows PC.
2. Install SumatraPDF and confirm your USB printer works from Windows.
3. Open PowerShell in this folder:
   ```powershell
   py -m pip install -r requirements.txt
   $env:SITE_URL="https://YOUR-VERCEL-DOMAIN.vercel.app"
   $env:PRINT_AGENT_TOKEN="same-long-random-token-as-Vercel"
   $env:SUMATRA_PDF="C:\Program Files\SumatraPDF\SumatraPDF.exe"
   # Optional; use exact printer name from Windows Printers & scanners:
   $env:PRINTER_NAME="Your Printer Name"
   py agent.py
   ```
4. Keep the agent running. Configure it to start at Windows login only after sandbox payment and printer tests pass.

Do not expose this agent token publicly. This starter agent sends all jobs to the default printer unless `PRINTER_NAME` is set. It uses SumatraPDF's `copies` print setting; test copy handling on your specific printer/driver.
