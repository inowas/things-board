# INOWAS partner inbox

This page describes the supplied [inowas_partner_inbox.json](../rule-chain/receiver/inowas_partner_inbox.json). The JSON is included unchanged. The description below is based on its configuration and embedded JavaScript; it is not a report of a live ThingsBoard import or end-to-end test.

## Where this chain belongs

This chain runs on the **INOWAS receiving instance**. Its own description instructs administrators to assign it to the device profile of the inbox device that partners post to.

Import this JSON on INOWAS and select **INOWAS partner inbox** as the default rule chain of the inbox device's profile. Partner devices use the separate [forwarding chain](../rule-chain/sender/NbSWISE_VUB.json), whose [configuration record](partner-sender.md#configuration-record) documents the destination settings. The inbox endpoint and credentials are not defined in the receiver JSON.

## What it does

| Node | Configured behavior |
| --- | --- |
| Message type | Sends `Post telemetry` messages to the transformation node. No other message-type connections are configured. |
| Split by source device | Reads and trims `srcDevice`, copies it into `metadata.device`, and removes it from the telemetry values. |
| Has device | Continues only if the resulting device name is present and non-empty. |
| Create + route to device | Targets a device named `${device}`, enables creation if missing, configures `INOWAS partner device` as the device type, and changes the message originator to the related device. The relation type is `Contains`, with direction set to `TO`. |
| save | Saves time-series data for the resulting originator. Processing is configured for every message and `useServerTs` is `false`. |

Each message identifies one source device through `srcDevice`. The chain does not split a batch containing several source devices.

## Expected message shape

At the transformation node, the message is expected to be a flat object with `srcDevice` and measurement keys, for example:

```json
{
  "srcDevice": "PartnerA_Sensor_A",
  "temperature": 21.4,
  "conductivity": 650
}
```

These are illustrative values and key names. The chain does not prescribe units or rename measurement keys. This example describes the transformation node's input, not a complete HTTP request or a timestamped batch-upload format.

The transformation:

- excludes the `srcDevice` key from saved measurements;
- excludes null values, empty strings and objects, including arrays;
- retains other primitive values, including zero and `false`;
- preserves `metadata.ts` when it is truthy, while replacing other incoming metadata with the new device metadata.

The forwarding setup should supply the intended measurement timestamp through the supported ThingsBoard telemetry path. Confirm timestamp preservation with an actual measurement before using the integration for historical data.

## Behavior to account for

Messages without a usable source device name stop at **Has device**: its `False` output is not connected. No failure routes are configured in this export.

The target name is taken directly from `srcDevice`; this chain adds no partner prefix. Agree on distinct source device names across partners to avoid unintentionally combining their measurements in one destination device.

The included sender supplies the prefix `NbSWISE-VUB`, producing names such as `NbSWISE-VUB - Sensor_A`. The receiver uses that full name.

## Verification

Send one new measurement through the partner integration. Check the destination device name and compare the telemetry key, value and timestamp with the source. Also check that telemetry remains available on the partner instance. This verifies the combined forwarding and receiving setup; inspecting this receiver JSON alone cannot establish that the full transfer works.
