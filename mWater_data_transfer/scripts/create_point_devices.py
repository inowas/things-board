#!/usr/bin/env python3
"""
Optional ONE-TIME helper: create one ThingsBoard device per measurement point.

Reads a local export (.csv or .json), takes the unique values of the point
column, skips unwanted names, and creates any device that does not exist yet.
Safe to re-run (existing devices are skipped).

Going forward you do NOT need this per dataset — the rule chain auto-creates
missing point devices. This is just for the first bulk, if you want it.
"""

import csv
import json
import os
import sys
import requests

# ============================ SETTINGS ============================
TB_HOST      = "https://dashboards.inowas.org"
USERNAME     = "PUT_YOUR_TB_LOGIN_HERE"
PASSWORD     = "PUT_YOUR_TB_PASSWORD_HERE"

DATA_PATH    = "R-MAR_Groundwater.json"   # .json or .csv  (use r"D:\\..." on Windows)
POINT_COLUMN = "Name"                      # column that names the measurement point
BASE_PREFIX  = ""                          # "" => device name = point name
DEVICE_TYPE  = "mWater point"

# point names to ignore (junk / not real points)
SKIP_POINTS  = {"", "Other (please specify)"}
# ==================================================================


def load_rows(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".json":
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):                 # tolerate {"data":[...]} wrappers
            for k in ("data", "rows", "results", "responses"):
                if isinstance(data.get(k), list):
                    data = data[k]
                    break
        return data if isinstance(data, list) else []
    with open(path, encoding="utf-8-sig") as f:    # csv
        return list(csv.DictReader(f))


def target_name(point):
    point = (point or "").strip()
    if point in SKIP_POINTS:
        return None
    return f"{BASE_PREFIX} - {point}" if BASE_PREFIX else point


def main():
    rows = load_rows(DATA_PATH)
    if rows and POINT_COLUMN not in rows[0]:
        sys.exit(f"Column '{POINT_COLUMN}' not found. Available: {list(rows[0].keys())}")

    targets, skipped = set(), 0
    for row in rows:
        name = target_name(row.get(POINT_COLUMN, ""))
        if name is None:
            skipped += 1
        else:
            targets.add(name)
    targets = sorted(targets)
    print(f"{len(targets)} device(s) to ensure; {skipped} row(s) skipped by filter.")

    s = requests.Session()
    r = s.post(f"{TB_HOST}/api/auth/login",
               json={"username": USERNAME, "password": PASSWORD}, timeout=30)
    r.raise_for_status()
    s.headers.update({"X-Authorization": f"Bearer {r.json()['token']}",
                      "Content-Type": "application/json"})

    created, existed, failed = 0, 0, 0
    for name in targets:
        chk = s.get(f"{TB_HOST}/api/tenant/devices",
                    params={"deviceName": name}, timeout=30)
        if chk.status_code == 200:
            existed += 1
            print(f"  exists : {name}")
            continue
        cr = s.post(f"{TB_HOST}/api/device",
                    json={"name": name, "type": DEVICE_TYPE}, timeout=30)
        if cr.status_code == 200:
            created += 1
            print(f"  created: {name}")
        else:
            failed += 1
            print(f"  FAILED : {name} -> {cr.status_code} {cr.text[:160]}")

    print(f"\nDone. created={created}, already existed={existed}, failed={failed}")


if __name__ == "__main__":
    main()
