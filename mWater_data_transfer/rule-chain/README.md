# Rule chain

`mwater-sync-auto-create.json` is a ThingsBoard rule chain export.

**Import:** Entities → Rule chains → import → select this file.

**After importing:** open the **Tick** node and set *Originator* to the current
`mWater config` device. The originator id stored in this file is only valid for the
ThingsBoard instance it was exported from.

Also check the **Tick** period (*Generation frequency in seconds*): use `86400` for
normal operation. Short periods re-upload every row of every active dataset and the
runs will overlap.
