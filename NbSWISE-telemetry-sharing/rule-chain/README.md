# Rule Chains

| Role | Runs on | File | Status |
| --- | --- | --- | --- |
| Forward telemetry | Partner ThingsBoard instance | [NbSWISE_VUB.json](sender/NbSWISE_VUB.json) | Included unchanged; configured for NbSWISE / VUB |
| Receive and save telemetry | INOWAS ThingsBoard instance | [inowas_partner_inbox.json](receiver/inowas_partner_inbox.json) | Included |

**NbSWISE VUB — Forward telemetry to INOWAS** saves incoming telemetry locally and forwards a separate copy to INOWAS. It also saves client attributes locally. Its partner prefix is `NbSWISE-VUB`.

**INOWAS partner inbox** receives telemetry, extracts the source device name from `srcDevice`, selects or creates the corresponding device, and saves the measurements.

Both JSON files are preserved exactly as supplied for internal documentation. The sender includes its configured endpoint and inbox token. See the [configuration details](../docs/partner-sender.md#configuration-record) for the sender settings. Colleagues using this integration can follow the PDF without editing the token or JavaScript.

See the [partner setup guide](../README.md#1-import-the-rule-chain) or the [INOWAS receiver documentation](../docs/inowas-receiver.md), depending on which instance you are configuring.
