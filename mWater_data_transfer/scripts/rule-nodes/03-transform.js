var dateField  = metadata.dateField  || "Date";
var pointField = metadata.pointField || "";
var base       = metadata.device || "";

var SKIP_POINTS = { "": true, "Other (please specify)": true };

var target;
if (pointField) {
    var point = (msg[pointField] != null) ? ("" + msg[pointField]).trim() : "";
    if (SKIP_POINTS[point]) { target = ""; }
    else { target = base ? (base + " - " + point) : point; }
} else {
    target = base;
}

var raw = msg[dateField];
var ts = null;
if (typeof raw === "number") {
    if (raw < 100000)    { ts = (raw - 25569) * 86400000; }
    else if (raw < 1e11) { ts = raw * 1000; }
    else                 { ts = raw; }
} else if (typeof raw === "string" && raw !== "") {
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) { ts = Date.UTC(+m[1], +m[2]-1, +m[3], +(m[4]||0), +(m[5]||0), +(m[6]||0)); }
    else { var p = Date.parse(raw); if (!isNaN(p)) { ts = p; } }
}

var EXCLUDE = { "code": true, "submitted on": true, "submitted": true, "submitted_on": true, "Location": true };
EXCLUDE[dateField] = true;
if (pointField) { EXCLUDE[pointField] = true; }

var values = {};
for (var k in msg) {
    if (EXCLUDE[k]) { continue; }
    var v = msg[k];
    if (v === null || v === "") { continue; }
    values[k] = v;
}

var md = { device: target };
if (ts !== null) { md.ts = "" + ts; }

return { msg: values, metadata: md, msgType: "POST_TELEMETRY_REQUEST" };
