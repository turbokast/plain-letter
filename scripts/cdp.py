#!/usr/bin/env python3
"""Drive the app in a separate headless Chrome over the DevTools protocol.

  scripts/cdp.py open URL            open (or reuse) the tab showing URL
  scripts/cdp.py eval FILE [secs]    run the JavaScript in FILE in that tab (awaits a promise), print the result as JSON
  scripts/cdp.py shot FILE.png       full-page screenshot

Environment: CDP_PORT (default 9333), APP_MATCH (default ":4174", part of the tab URL).
Needs: pip install websocket-client. Chrome is started separately, for example:
  google-chrome --headless=new --remote-debugging-port=9333 --user-data-dir=/tmp/pl-profile about:blank
"""
import base64, json, os, sys, urllib.request, urllib.parse
import websocket

PORT = os.environ.get("CDP_PORT", "9333")
MATCH = os.environ.get("APP_MATCH", ":4174")
BASE = f"http://127.0.0.1:{PORT}"


def tabs():
    return [t for t in json.load(urllib.request.urlopen(BASE + "/json/list")) if t["type"] == "page"]


def tab():
    for t in tabs():
        if MATCH in t["url"]:
            return t
    sys.exit("no tab for the app; run: scripts/cdp.py open URL")


def call(ws, method, params=None, _id=[0]):
    _id[0] += 1
    ws.send(json.dumps({"id": _id[0], "method": method, "params": params or {}}))
    while True:
        m = json.loads(ws.recv())
        if m.get("id") == _id[0]:
            if "error" in m:
                sys.exit(json.dumps(m["error"]))
            return m["result"]


def connect(timeout=60):
    return websocket.create_connection(tab()["webSocketDebuggerUrl"], timeout=timeout, suppress_origin=True)


cmd = sys.argv[1]
if cmd == "open":
    url = sys.argv[2]
    req = urllib.request.Request(BASE + "/json/new?" + urllib.parse.quote(url, safe=""), method="PUT")
    print(json.load(urllib.request.urlopen(req))["url"])
elif cmd == "eval":
    secs = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    ws = connect(secs)
    r = call(ws, "Runtime.evaluate", {"expression": open(sys.argv[2]).read(), "awaitPromise": True, "returnByValue": True, "userGesture": True})
    if "exceptionDetails" in r:
        print(json.dumps(r["exceptionDetails"], indent=1)[:3000])
        sys.exit(1)
    print(json.dumps(r["result"].get("value"), indent=1))
elif cmd == "shot":
    ws = connect()
    m = call(ws, "Page.getLayoutMetrics")["cssContentSize"]
    call(ws, "Emulation.setDeviceMetricsOverride", {"width": int(m["width"]), "height": int(m["height"]), "deviceScaleFactor": 1, "mobile": False})
    data = call(ws, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})["data"]
    call(ws, "Emulation.clearDeviceMetricsOverride")
    open(sys.argv[2], "wb").write(base64.b64decode(data))
    print(sys.argv[2])
