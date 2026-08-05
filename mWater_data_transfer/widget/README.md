# Configuration widget (IMPORTER)

Edits the `datasets` attribute on the `mWater config` device. It moves no data itself.

**Easiest install:** import `importer-widget-export.json` into a widgets bundle
(Resources → Widgets library → Widgets bundles → Custom tools).

**Manual install:** create a *Static* widget and paste the three files into the matching
editor tabs:

| File | Tab |
|---|---|
| `widget.html` | HTML |
| `widget.css` | CSS |
| `widget.js` | JavaScript |

Then set `CONFIG_DEVICE_ID` at the top of the JavaScript tab to the id of the
`mWater config` device, press **Run**, then **Save**.

Keep the CSS in the CSS tab — curly brackets in the HTML tab break the Angular template
compiler ("Failed to compile widget html").
