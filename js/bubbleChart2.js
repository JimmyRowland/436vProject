import * as d3 from 'd3';
import { getCertifierGroups } from './utils';
import { states } from './main';

export function bubbleChart() {
  const data = getCertifierGroups(Object.values(states.farms));
  const height = 927;
  const width = 927;
  const pack = (data) =>
    d3
      .pack()
      .size([width - 300, height])
      .padding(7)(
      d3
        .hierarchy(data)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value),
    );

  const root = pack(data);
  let focus = root;
  let shadow = true;
  let multicolor = true;
  let hexcolor = '#0099cc';

  let view;

  function setColorScheme(multi) {
    if (multi) {
      let color = d3.scaleOrdinal().range(d3.schemeCategory10);
      return color;
    }
  }

  let color = setColorScheme(multicolor);

  function setCircleColor(obj) {
    if (obj.height === 0) {
      return states.locationColorScale(obj.data.name);
    }
    let depth = obj.depth;
    while (obj.depth > 1) {
      obj = obj.parent;
    }
    let newcolor = multicolor ? d3.hsl(color(obj.data.name)) : d3.hsl(hexcolor);
    newcolor.l += depth == 1 ? 0 : depth * 0.1;
    return newcolor;
  }

  const svg = d3
    .select('#chart2')
    .append('svg')
    .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
    .style('display', 'block')
    .style('margin', '0 -14px')
    // .style("background", color(0))
    .style('cursor', 'pointer')
    .on('click', () => zoom(root));

  const node = svg
    .append('g')
    .selectAll('circle')
    .data(root.descendants().slice(1))
    .join('circle')
    // .attr("fill", d => d.children ? color(d.depth) : "white")
    .attr('fill', setCircleColor)
    .attr('pointer-events', (d) => (!d.children ? 'none' : null))
    .attr('opacity', (d) => (d.height === 0 ? 0.3 : 1))
    .on('mouseover', function () {
      d3.select(this).attr('stroke', '#000');
    })
    .on('mouseout', function () {
      d3.select(this).attr('stroke', null);
    })
    .on('click', (event, d) => focus !== d && (zoom(d), event.stopPropagation()));

  const label = svg
    .append('g')
    .style('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .selectAll('text')
    .data(root.descendants())
    .join('text')
    .style('fill-opacity', (d) => (d.parent === root ? 1 : 0))
    .style('display', (d) => (d.parent === root ? 'inline' : 'none'))
    .text((d) => d.data.name);

  zoomTo([root.x, root.y, root.r * 2]);

  function zoomTo(v) {
    const k = width / v[2];
    view = v;
    label.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr('r', (d) => d.r * k);
  }

  function zoom(d) {
    const focus0 = focus;

    focus = d;

    const transition = svg
      .transition()
      .duration(750)
      .tween('zoom', (d) => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return (t) => zoomTo(i(t));
      });

    label
      .filter(function (d) {
        return d.parent === focus || this.style.display === 'inline';
      })
      .transition(transition)
      .style('fill-opacity', (d) => (d.parent === focus ? 1 : 0))
      .on('start', function (d) {
        if (d.parent === focus) this.style.display = 'inline';
      })
      .on('end', function (d) {
        if (d.parent !== focus) this.style.display = 'none';
      });
  }

  return svg.node();
}
