import {
    arc,
    format,
    hierarchy,
    interpolate,
    interpolateRainbow,
    partition,
    quantize,
    scaleOrdinal,
    select
} from 'd3';

export class MyPieChart {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 840,
            margin: _config.margin || { top: 20, right: 20, bottom: 20, left: 20 }
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;

        vis.colorScale = scaleOrdinal(quantize(
            interpolateRainbow,
            vis.data.children.length + 1
        ));

        vis.formatter = format(',d');

        vis.radius = vis.width / 6;
        vis.arcGenerator = arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .innerRadius(d => d.y0 * vis.radius)
            .outerRadius(d => Math.max(d.y0 * vis.radius, d.y1 * vis.radius - 1));

        let r = hierarchy(vis.data)
            .sum((d) => d.value)
            .sort((a, b) => a.value - b.value);
        vis.root = partition().size([2 * Math.PI, r.height + 1])(r);
        vis.root.each(d => (d.current = d));

        vis.svg = select(vis.config.parentElement)
            .append('svg')
            .attr('viewBox', [0, 0, vis.width, vis.width])
            .style('font', '16px sans-serif');

        vis.g = vis.svg.append('g')
            .attr('transform', `translate(${vis.width / 2},${vis.width / 2})`);

        vis.path = vis.g.append('g')
            .selectAll('path')
            .data(vis.root.descendants().slice(1))
            .join('path')
            .attr('fill', (d) => {
                while (d.depth > 1) d = d.parent;
                return vis.colorScale(d.data.name);
            })
            .attr('fill-opacity', (d) => (vis.arcVisible(d.current) ? (d.children ? 0.8 : 0.6) : 0))
            .attr('d', (d) => vis.arcGenerator(d.current));

        vis.path.append('title').text(
            (d) =>
                `${d
                    .ancestors()
                    .map((d) => d.data.name)
                    .reverse()
                    .join('/')}\n${vis.formatter(d.value)}`,
        );

        const truncate = (str, max) =>
            str.length < max ?
                str :
                `${str.substr(0, str.substr(0, max).lastIndexOf(' '))}${'...'}`;
        vis.label = vis.g.append('g')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .selectAll('text')
            .data(vis.root.descendants().slice(1))
            .join('text')
            .attr('fill-opacity', (d) => +vis.labelVisible(d.current))
            .attr('transform', (d) => vis.labelTransform(d.current))
            .text((d) => truncate(d.data.name, 13));


        vis.updateVis()
    }

    updateVis() {
        let vis = this;


        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        vis.path.filter((d) => d.children)
            .style('cursor', 'pointer')
            .on('click', (event, p) => {
                vis.parent.datum(p.parent);

                vis.root.each(
                    (d) => (d.target = {
                        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        y0: Math.max(0, d.y0 - p.depth),
                        y1: Math.max(0, d.y1 - p.depth),
                    }),
                );

                const t = vis.g.transition().duration(500);

                vis.path.transition(t)
                    .tween('data', (d) => {
                        const i = interpolate(d.current, d.target);
                        return (t) => (d.current = i(t));
                    })
                    .filter(function (d) {
                        return +this.getAttribute('fill-opacity') || vis.arcVisible(d.target);
                    })
                    .attr('fill-opacity', (d) => (vis.arcVisible(d.target) ? (d.children ? 0.8 : 0.6) : 0))
                    .attrTween('d', (d) => () => vis.arcGenerator(d.current));

                vis.label.filter(function (d) {
                    return +this.getAttribute('fill-opacity') || vis.labelVisible(d.target);
                })
                    .transition(t)
                    .attr('fill-opacity', (d) => +vis.labelVisible(d.target))
                    .attrTween('transform', (d) => () => vis.labelTransform(d.current));
            });

        vis.parent = vis.g.append('circle')
            .datum(vis.root)
            .attr('r', vis.radius)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('click', (event, p) => {
                vis.parent.datum(vis.root);

                vis.root.each(
                    (d) => (d.target = {
                        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        y0: Math.max(0, d.y0 - p.depth),
                        y1: Math.max(0, d.y1 - p.depth),
                    }),
                );

                const t = vis.g.transition().duration(500);

                vis.path.transition(t)
                    .tween('data', (d) => {
                        const i = interpolate(d.current, d.target);
                        return (t) => (d.current = i(t));
                    })
                    .filter(function (d) {
                        return +this.getAttribute('fill-opacity') || vis.arcVisible(d.target);
                    })
                    .attr('fill-opacity', (d) => (vis.arcVisible(d.target) ? (d.children ? 0.8 : 0.6) : 0))
                    .attrTween('d', (d) => () => vis.arcGenerator(d.current));

                vis.label.filter(function (d) {
                    return +this.getAttribute('fill-opacity') || vis.labelVisible(d.target);
                })
                    .transition(t)
                    .attr('fill-opacity', (d) => +vis.labelVisible(d.target))
                    .attrTween('transform', (d) => () => vis.labelTransform(d.current));
            });
    }

    arcVisible(d) {
        return (d.y1 <= 3) && (d.y0 >= 1) && (d.x1 > d.x0);
    }

    labelVisible(d) {
        return (d.y1 <= 3) && (d.y0 >= 1) && ((d.y1 - d.y0) * (d.x1 - d.x0) > 0.03);
    }

    labelTransform(d) {
        let vis = this;
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * vis.radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
}