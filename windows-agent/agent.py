import os, time, tempfile, subprocess, requests
from pathlib import Path

# Install SumatraPDF on the shop PC and set SUMATRA_PDF to SumatraPDF.exe.
SITE_URL = os.environ.get("SITE_URL", "https://YOUR-VERCEL-DOMAIN.vercel.app").rstrip("/")
AGENT_TOKEN = os.environ.get("PRINT_AGENT_TOKEN", "")
SUMATRA_PDF = os.environ.get("SUMATRA_PDF", r"C:\Program Files\SumatraPDF\SumatraPDF.exe")
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "4"))
PRINTER_NAME = os.environ.get("PRINTER_NAME", "")  # Optional exact Windows printer name

if not AGENT_TOKEN:
    raise SystemExit("Set PRINT_AGENT_TOKEN environment variable first.")

headers = {"Authorization": f"Bearer {AGENT_TOKEN}"}

def report(job_id, ok, error=""):
    try:
        requests.post(f"{SITE_URL}/api/agent/complete", headers=headers,
                      json={"id": job_id, "ok": ok, "errorMessage": error}, timeout=20)
    except Exception as exc:
        print("Could not report job result:", exc)

def main():
    print("PDF Auto Print Agent running. Keep this window open.")
    while True:
        try:
            r = requests.get(f"{SITE_URL}/api/agent/next", headers=headers, timeout=30)
            r.raise_for_status()
            job = r.json().get("job")
            if not job:
                time.sleep(POLL_SECONDS)
                continue
            print("Printing job", job["id"], job["filename"])
            with requests.get(job["url"], stream=True, timeout=60) as download:
                download.raise_for_status()
                fd, path = tempfile.mkstemp(suffix=".pdf")
                os.close(fd)
                with open(path, "wb") as out:
                    for chunk in download.iter_content(1024 * 256):
                        if chunk:
                            out.write(chunk)
            try:
                if not Path(SUMATRA_PDF).exists():
                    raise RuntimeError("SumatraPDF not found; set SUMATRA_PDF")
                # -print-to uses the exact Windows printer name if configured.
                cmd = [SUMATRA_PDF, "-silent"]
                if PRINTER_NAME:
                    cmd += ["-print-to", PRINTER_NAME]
                else:
                    cmd += ["-print-to-default"]
                cmd += ["-print-settings", f"{job['copies']}x"]
                cmd += ["-exit-on-print", path]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
                if result.returncode != 0:
                    raise RuntimeError((result.stderr or result.stdout or "SumatraPDF failed")[:400])
                report(job["id"], True)
            except Exception as exc:
                report(job["id"], False, str(exc))
            finally:
                try: os.remove(path)
                except OSError: pass
        except Exception as exc:
            print("Agent error:", exc)
            time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    main()
