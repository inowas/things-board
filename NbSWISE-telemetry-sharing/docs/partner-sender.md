# Partner forwarding Rule Chain

[NbSWISE_VUB.json](../rule-chain/sender/NbSWISE_VUB.json) defines **NbSWISE VUB — Forward telemetry to INOWAS**. Install the configured version on the partner ThingsBoard instance and assign it to the profile of devices selected for sharing.

This description is based on the supplied JSON and its embedded JavaScript. A live import and end-to-end delivery test remain deployment checks.

## Configuration record

The JSON is preserved exactly as supplied, including its inbox access token. The relevant settings are:

| Setting | Recorded configuration |
| --- | --- |
| Rule Chain name | `NbSWISE VUB — Forward telemetry to INOWAS` |
| Destination host | `https://dashboards.inowas.org` |
| Endpoint and token | Stored in `restEndpointUrlPattern` of the **Send to INOWAS** node in the JSON |
| Partner prefix | `NbSWISE-VUB`, set by `PREFIX` in **Tag with device name** |
| Receiver | **INOWAS partner inbox**, assigned to the INOWAS inbox device profile |

The token is retained in the configuration file rather than duplicated in this document. For another partner or inbox device, adapt the prefix and destination settings for that integration.

Colleagues can follow the [setup guide](../README.md#1-import-the-rule-chain) or [PDF](Sharing_of_Telemetric_Data.pdf): import the supplied JSON, create a device profile using it, and assign that profile to selected devices.

## Processing behavior

| Incoming message | Configured path |
| --- | --- |
| Post telemetry | Two independent branches: **Save locally**, and **Tag with device name → Send to INOWAS** |
| Post attributes | **Save attributes**, with `CLIENT_SCOPE`; attributes are not forwarded by this chain |
| Other message types | No routes are configured in this export |

Local storage and forwarding branch directly from **Message type**. Forwarding does not wait for the **Save locally** node to succeed. No failure-handling connections are defined in the export.

## Forwarded payload

The transformation chooses `metadata.deviceName`, falling back to `metadata.originatorName` and then `unknown device`. It prepends `NbSWISE-VUB - ` and stores the result in `srcDevice`.

It uses `parseInt(metadata.ts, 10)` when `metadata.ts` is truthy, otherwise `Date.now()`. It wraps the resulting timestamp and measurement values as follows:

```json
{
  "ts": 1790586000000,
  "values": {
    "temperature": 21.4,
    "conductivity": 650,
    "srcDevice": "NbSWISE-VUB - Sensor_A"
  }
}
```

The example is illustrative. Null values, empty strings, objects and arrays are omitted from the forwarded measurements. Other primitive values, including zero and `false`, are retained. Any incoming measurement named `srcDevice` is overwritten with the generated device name in the forwarded copy.

The REST node sends an HTTP `POST` with a JSON content type to the inbox telemetry endpoint. The receiving ThingsBoard telemetry endpoint handles the timestamp/value envelope before the [receiver transformation](inowas-receiver.md#expected-message-shape), which expects the flat measurement object.

## Historical data

This chain processes incoming messages; it does not read or backfill existing time series. Use the [separate historical-data export procedure](../README.md#historical-data). The companion script mentioned in the original JSON description was not supplied and is not part of this repository.
