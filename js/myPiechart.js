import * as d3 from 'd3';

let root, g;
export class MyPieChart {
    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 940,
            margin: _config.margin || { top: 20, right: 20, bottom: 20, left: 20 }
        }
        this.data = _data;
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        // vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales
        vis.colorScale = d3.scaleOrdinal(d3.quantize(
            d3.interpolateRainbow,
            vis.data.children.length + 1
        ));

        vis.formatter = d3.format(',d');

        vis.radius = vis.width / 6;
        vis.arcGenerator = d3.arc()
            .startAngle(d => d.x0)
            .endAngle(d => d.x1)
            .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
            .padRadius(vis.radius * 1.5)
            .innerRadius(d => d.y0 * vis.radius)
            .outerRadius(d => Math.max(d.y0 * vis.radius, d.y1 * vis.radius - 1));

        const r = d3.hierarchy(vis.data)
            .sum((d) => d.value)
            .sort((a, b) => b.value - a.value);
        root = d3.partition().size([2 * Math.PI, r.height + 1])(r);
        root.each(d => (d.current = d));

        vis.svg = d3.select(vis.config.parentElement)
            .append('svg')
            .attr('viewBox', [0, 0, vis.width, vis.width])
            .style('font', '10px sans-serif');

        g = vis.svg.append('g')
            .attr('transform', `translate(${vis.width / 2},${vis.width / 2})`);

        //     vis.updateVis()
        // }
        // updateVis() {
        //     let vis = this;
        //     vis.renderVis();
        // }
        // renderVis() {
        //     let vis = this;

        vis.path = g.append('g')
            .selectAll('path')
            .data(root.descendants().slice(1))
            .join('path')
            .attr('fill', (d) => {
                while (d.depth > 1) d = d.parent;
                return vis.colorScale(d.data.name);
            })
            .attr('fill-opacity', (d) => (vis.arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0))
            .attr('pointer-events', (d) => (vis.arcVisible(d.current) ? 'auto' : 'none'))

            .attr('d', (d) => vis.arcGenerator(d.current));

        vis.path.filter((d) => d.children)
            .style('cursor', 'pointer')
            .on('click', (event, p) => {    
                vis.parent.datum(p.parent || root);
        
                root.each(
                    (d) => (d.target = {
                        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        y0: Math.max(0, d.y0 - p.depth),
                        y1: Math.max(0, d.y1 - p.depth),
                    }),
                );
        
                const t = g.transition().duration(500);
        
                // Transition the data on all arcs, even the ones that aren’t visible,
                // so that if this transition is interrupted, entering arcs will start
                // the next transition from the desired position.
                vis.path.transition(t)
                    .tween('data', (d) => {
                        const i = d3.interpolate(d.current, d.target);
                        return (t) => (d.current = i(t));
                    })
                    .filter(function (d) {
                        return +this.getAttribute('fill-opacity') || vis.arcVisible(d.target);
                    })
                    .attr('fill-opacity', (d) => (vis.arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0))
                    .attr('pointer-events', (d) => (vis.arcVisible(d.target) ? 'auto' : 'none'))
        
                    .attrTween('d', (d) => () => vis.arcGenerator(d.current));
        
                vis.label.filter(function (d) {
                    return +this.getAttribute('fill-opacity') || vis.labelVisible(d.target);
                })
                    .transition(t)
                    .attr('fill-opacity', (d) => +vis.labelVisible(d.target))
                    .attrTween('transform', (d) => () => vis.labelTransform(d.current));
            });

        vis.path.append('title').text(
            (d) =>
                `${d
                    .ancestors()
                    .map((d) => d.data.name)
                    .reverse()
                    .join('/')}\n${vis.formatter(d.value)}`,
        );

        vis.label = g.append('g')
            .attr('pointer-events', 'none')
            .attr('text-anchor', 'middle')
            .style('user-select', 'none')
            .selectAll('text')
            .data(root.descendants().slice(1))
            .join('text')
            .attr('dy', '0.35em')
            .attr('fill-opacity', (d) => +vis.labelVisible(d.current))
            .attr('transform', (d) => vis.labelTransform(d.current))
            .text((d) => d.data.name);

        vis.parent = g.append('circle')
            .datum(root)
            .attr('r', vis.radius)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('click', (event, p) => {
                vis.parent.datum(p.parent || root);
        
                root.each(
                    (d) => (d.target = {
                        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
                        y0: Math.max(0, d.y0 - p.depth),
                        y1: Math.max(0, d.y1 - p.depth),
                    }),
                );
        
                const t = g.transition().duration(500);
        
                // Transition the data on all arcs, even the ones that aren’t visible,
                // so that if this transition is interrupted, entering arcs will start
                // the next transition from the desired position.
                vis.path.transition(t)
                    .tween('data', (d) => {
                        const i = d3.interpolate(d.current, d.target);
                        return (t) => (d.current = i(t));
                    })
                    .filter(function (d) {
                        return +this.getAttribute('fill-opacity') || vis.arcVisible(d.target);
                    })
                    .attr('fill-opacity', (d) => (vis.arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0))
                    .attr('pointer-events', (d) => (vis.arcVisible(d.target) ? 'auto' : 'none'))
        
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
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    labelTransform(d) {
        let vis = this;
        const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
        const y = ((d.y0 + d.y1) / 2) * vis.radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }
}