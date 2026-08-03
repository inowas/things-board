const ECHARTS_URL = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js';

function loadECharts(callback) {
    if (window.echarts) { callback(); return; }
    if (window.__echartsLoading) {
        window.__echartsLoading.push(callback);
        return;
    }
    window.__echartsLoading = [callback];
    const s = document.createElement('script');
    s.src = ECHARTS_URL;
    s.onload = function() {
        const queue = window.__echartsLoading || [];
        window.__echartsLoading = null;
        queue.forEach(function(cb) { cb(); });
    };
    s.onerror = function() {
        console.error('Failed to load ECharts from ' + ECHARTS_URL);
    };
    document.head.appendChild(s);
}

function hexToRgba(hex, alpha) {
    if (!hex) return 'rgba(76,175,80,' + alpha + ')';
    if (hex.indexOf('rgba') === 0 || hex.indexOf('rgb(') === 0) return hex;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

self.onInit = function() {
    self.ready = false;
    loadECharts(function() {
        if (!self.ctx || !self.ctx.$container) return;
        self.chart = echarts.init(self.ctx.$container[0]);
        self.ready = true;
        self.render();
    });
};

self.onDataUpdated = function() {
    if (self.ready) self.render();
};

self.render = function() {
    if (!self.chart) return;
    const s = self.ctx.settings || {};
    const xKey  = s.xKey  || 'x';
    const yKey  = s.yKey  || 'y';
    const x2Key = (s.x2Key && s.x2Key.length) ? s.x2Key : xKey;
    const y2Key = s.y2Key || '';

    // 1. Read latest value of each data key; parse JSON arrays if needed
    const values = {};
    (self.ctx.data || []).forEach(d => {
        let v = d.data && d.data.length ? d.data[0][1] : null;
        if (typeof v === 'string') {
            try { v = JSON.parse(v); } catch (e) {}
        }
        values[d.dataKey.name] = v;
    });

    const xs = values[xKey];
    const ys = values[yKey];

    // 2. Placeholder if primary series isn't ready
    if (!Array.isArray(xs) || !Array.isArray(ys)) {
        const debug = (self.ctx.data || []).map(d => {
            const raw = d.data && d.data.length ? d.data[0][1] : null;
            let kind = raw === null ? 'null/missing'
                     : Array.isArray(raw) ? 'array(' + raw.length + ')'
                     : typeof raw === 'string' ? 'string("' + raw.slice(0, 40) + '…")'
                     : typeof raw;
            return (d.dataKey ? d.dataKey.name : '?') + ': ' + kind;
        }).join(' | ');
        self.chart.setOption({
            title: {
                text: 'Waiting for data…',
                subtext: 'Got — ' + (debug || 'no data keys subscribed'),
                left: 'center', top: 'middle',
                textStyle: { fontSize: 14 },
                subtextStyle: { fontSize: 10 }
            }
        }, true);
        return;
    }

    const num = v => (v === undefined || v === null || v === '' ? null : v);

    // 3. Build primary series points
    const n1 = Math.min(xs.length, ys.length);
    const points1 = new Array(n1);
    for (let i = 0; i < n1; i++) points1[i] = [xs[i], ys[i]];

    // 4. Build secondary series points if Y2 is enabled and data is available
    let points2 = null;
    if (s.y2Enabled && y2Key) {
        const xs2 = values[x2Key];
        const ys2 = values[y2Key];
        if (Array.isArray(xs2) && Array.isArray(ys2)) {
            const n2 = Math.min(xs2.length, ys2.length);
            points2 = new Array(n2);
            for (let i = 0; i < n2; i++) points2[i] = [xs2[i], ys2[i]];
        }
    }

    // 5. Build Y axes (one or two)
    const yAxisArr = [{
        type: s.yLog ? 'log' : 'value',
        name: s.yLabel || '',
        nameLocation: 'middle',
        nameGap: 35,
        inverse: !!s.yInverse,
        min: num(s.yMin),
        max: num(s.yMax),
        position: 'left',
        splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.3 } }
    }];

    let y2Side = null;
    if (s.y2Enabled) {
        y2Side = (s.y2OnRight === false) ? 'left' : 'right';
        yAxisArr.push({
            type: s.y2Log ? 'log' : 'value',
            name: s.y2Label || '',
            nameLocation: 'middle',
            nameGap: 35,
            inverse: !!s.y2Inverse,
            min: num(s.y2Min),
            max: num(s.y2Max),
            position: y2Side,
            offset: y2Side === 'left' ? 50 : 0,
            splitLine: { show: false }
        });
    }

    // 6. Grid spacing depends on which side Y2 sits on
    const gridLeft  = (y2Side === 'left')  ? 100 : 25;
    const gridRight = (y2Side === 'right') ? 60  : 25;

    // 7. Build threshold lines, sorted by which axis they bind to
    const markLinesY1 = [];
    const markLinesY2 = [];
    (s.thresholds || [])
        .map(t => {
            if (typeof t === 'string') {
                try { return JSON.parse(t); } catch (e) { return null; }
            }
            return t;
        })
        .filter(t => t && Number.isFinite(Number(t.value)))
        .forEach(t => {
            const color = t.color || '#e91e63';
            const line = {
                symbol: 'none',
                lineStyle: { color: color, type: t.style || 'dashed', width: 1.5 },
                label: {
                    show: true,
                    formatter: t.label || String(t.value),
                    position: 'end',
                    color: color,
                    fontSize: 11
                }
            };
            if (t.axis === 'x') {
                line.xAxis = Number(t.value);
                markLinesY1.push(line);
            } else if (t.axis === 'y2') {
                line.yAxis = Number(t.value);
                markLinesY2.push(line);
            } else {
                line.yAxis = Number(t.value);
                markLinesY1.push(line);
            }
        });

    // 8. Build colored band areas, sorted by which axis they bind to
    const markAreasY1 = [];
    const markAreasY2 = [];
    (s.bands || [])
        .map(b => {
            if (typeof b === 'string') {
                try { return JSON.parse(b); } catch (e) { return null; }
            }
            return b;
        })
        .filter(b => b && Number.isFinite(Number(b.from)) && Number.isFinite(Number(b.to)))
        .forEach(b => {
            const color = b.color || '#4caf50';
            const opacity = (b.opacity !== undefined && b.opacity !== null && b.opacity !== '')
                ? Number(b.opacity) : 0.2;
            const fill = hexToRgba(color, opacity);
            const start = { itemStyle: { color: fill, borderWidth: 0 } };
            const end = {};
            if (b.label) {
                start.label = {
                    show: true,
                    formatter: b.label,
                    position: 'insideTopLeft',
                    color: hexToRgba(color, 1),
                    fontSize: 11
                };
            }
            if (b.axis === 'x') {
                start.xAxis = Number(b.from);
                end.xAxis   = Number(b.to);
                markAreasY1.push([start, end]);
            } else if (b.axis === 'y2') {
                start.yAxis = Number(b.from);
                end.yAxis   = Number(b.to);
                markAreasY2.push([start, end]);
            } else {
                start.yAxis = Number(b.from);
                end.yAxis   = Number(b.to);
                markAreasY1.push([start, end]);
            }
        });

    // 9. Build the series array
    const seriesArr = [{
        type: s.showLine === false ? 'scatter' : 'line',
        data: points1,
        yAxisIndex: 0,
        showSymbol: s.showSymbol !== false,
        symbolSize: s.symbolSize || 4,
        lineStyle: { width: s.lineWidth || 1.5, color: s.color || '#1f77b4' },
        itemStyle: { color: s.color || '#1f77b4' },
        smooth: !!s.smooth,
        markLine: { silent: true, symbol: 'none', data: markLinesY1 },
        markArea: { silent: true, data: markAreasY1 }
    }];

    if (points2) {
        seriesArr.push({
            type: s.y2ShowLine === false ? 'scatter' : 'line',
            data: points2,
            yAxisIndex: 1,
            showSymbol: s.y2ShowSymbol !== false,
            symbolSize: s.y2SymbolSize || 4,
            lineStyle: { width: s.y2LineWidth || 1.5, color: s.y2Color || '#e91e63' },
            itemStyle: { color: s.y2Color || '#e91e63' },
            smooth: !!s.y2Smooth,
            markLine: { silent: true, symbol: 'none', data: markLinesY2 },
            markArea: { silent: true, data: markAreasY2 }
        });
    } else if ((markLinesY2.length || markAreasY2.length) && s.y2Enabled) {
        seriesArr.push({
            type: 'line',
            data: [],
            yAxisIndex: 1,
            markLine: { silent: true, symbol: 'none', data: markLinesY2 },
            markArea: { silent: true, data: markAreasY2 }
        });
    }

    // 10. Tooltip
    const tooltipFormatter = function(params) {
        if (!params || !params.length) return '';
        return params.map(p => {
            const yLabel = p.seriesIndex === 0
                ? (s.yLabel || 'Y1')
                : (s.y2Label || 'Y2');
            return '<span style="color:' + p.color + '">●</span> ' +
                   (s.xLabel || 'X') + ': ' + p.value[0] + ' &nbsp; ' +
                   yLabel + ': ' + p.value[1];
        }).join('<br>');
    };

    // 11. Render
    self.chart.setOption({
        animation: false,
        grid: { left: gridLeft, right: gridRight, top: 30, bottom: 30, containLabel: true },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' },
            formatter: tooltipFormatter
        },
        xAxis: {
            type: s.xLog ? 'log' : 'value',
            name: s.xLabel || '',
            nameLocation: 'middle',
            nameGap: 35,
            position: s.xOnTop ? 'top' : 'bottom',
            inverse: !!s.xInverse,
            min: num(s.xMin),
            max: num(s.xMax),
            splitLine: { show: true, lineStyle: { type: 'dashed', opacity: 0.3 } }
        },
        yAxis: yAxisArr,
        series: seriesArr
    }, true);
};

self.onResize = function() {
    if (self.chart) self.chart.resize();
};

self.onDestroy = function() {
    if (self.chart) { self.chart.dispose(); self.chart = null; }
    self.ready = false;
};
