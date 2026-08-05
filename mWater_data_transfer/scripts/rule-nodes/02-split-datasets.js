var raw = metadata.datasets || metadata.ss_datasets || msg.datasets;
var list = (typeof raw === "string") ? JSON.parse(raw) : raw;
var out = [];
for (var i = 0; i < list.length; i++) {
    var d = list[i];
    if (d.enabled === false) { continue; }
    out.push({
        msg: {},
        metadata: { url: d.url, device: d.device || "", dateField: d.dateField || "Date", pointField: d.pointField || "" },
        msgType: "MWATER_FETCH"
    });
}
return out;
