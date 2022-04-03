import * as d3 from 'd3';
import { filteredStates, filters, states, updateFilteredStates } from './main';
import { getCertifierGroups } from './utils';

const height = 927;
const width = 927;

export class BubbleChart {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _state) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
    };
    this.initVis();
  }

  /**
   * Initialize scales/axes and append static elements, such as axis titles
   */
  initVis() {
    const vis = this;
    vis.colorScale = d3.scaleOrdinal().range(d3.schemeCategory10);

    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('viewBox', `-${width / 2} -${height / 2} ${width} ${height}`)
      .style('display', 'block')
      .style('margin', '0 -14px')
      .style('cursor', 'pointer');

    vis.chart = vis.svg.append('g');

    vis.label = vis.svg
      .append('g')
      .style('font-family', 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle');
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    const vis = this;
    const certificationGroup = getCertifierGroups(filteredStates.selectedFarms);

    vis.root = d3
      .pack()
      .size([width - 300, height])
      .padding(7)(
      d3
        .hierarchy(certificationGroup)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value),
    );
    vis.focus = vis.root;
    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    const vis = this;
    setTitleName();

    vis.svg.on('click', () => zoom(vis.root));
    const node = vis.chart
      .selectAll('circle')
      .data(vis.root.descendants().slice(1))
      .join('circle')
      .attr('fill', setCircleColor)
      .attr('pointer-events', (d) => (!d.children ? 'none' : null))
      .attr('opacity', (d) => (d.height === 0 ? 0.3 : 1))
      .on('mouseover', function () {
        d3.select(this).attr('stroke', '#000');
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', null);
      })
      .on('click', (event, d) => vis.focus !== d && (zoom(d), event.stopPropagation()));
    const label = vis.label
      .selectAll('text')
      .data(vis.root.descendants())
      .join('text')
      .style('fill-opacity', (d) => (d.parent === vis.root ? 1 : 0))
      .style('display', (d) => (d.parent === vis.root ? 'inline' : 'none'))
      .text((d) => d.data.name);

    function setCircleColor(obj) {
      if (obj.height === 0) {
        return states.locationColorScale(obj.data.name);
      }
      let depth = obj.depth;
      while (obj.depth > 1) {
        obj = obj.parent;
      }
      let newcolor = d3.hsl(vis.colorScale(obj.data.name));
      newcolor.l += depth == 1 ? 0 : depth * 0.1;
      return newcolor;
    }
    zoomTo([vis.root.x, vis.root.y, vis.root.r * 2]);

    function zoomTo(v) {
      const k = width / v[2];
      vis.view = v;
      label.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr('transform', (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
      node.attr('r', (d) => d.r * k);
    }

    function zoom(d) {
      vis.focus = d;

      const transition = vis.svg
        .transition()
        .duration(750)
        .tween('zoom', (d) => {
          const i = d3.interpolateZoom(vis.view, [vis.focus.x, vis.focus.y, vis.focus.r * 2]);
          return (t) => zoomTo(i(t));
        });

      label
        .filter(function (d) {
          return d.parent === vis.focus || this.style.display === 'inline';
        })
        .transition(transition)
        .style('fill-opacity', (d) => (d.parent === vis.focus ? 1 : 0))
        .on('start', function (d) {
          if (d.parent === vis.focus) this.style.display = 'inline';
        })
        .on('end', function (d) {
          if (d.parent !== vis.focus) this.style.display = 'none';
        });

      setTitleName(d.data.name);
      if (!filters.pieChart.crop_group && !filters.pieChart.crop_id) {
        if (d.depth === 1) {
          filters.bubbleChart.certification = d.data.name;
          filters.bubbleChart.certifier = undefined;
        } else if (d.depth === 2) {
          filters.bubbleChart.certifier = d.data.name;
        } else if (d.depth === 0) {
          filters.bubbleChart.certification = undefined;
          filters.bubbleChart.certifier = undefined;
        }
        if (d.depth < 3) {
          updateFilteredStates();
          states.barChart.updateVis();
          states.geoMap.updateVis();
          setTimeout(() => states.piechart.updateVis(), 1000);
        }
      }
    }
  }
}

function setTitleName(name = 'certification') {
  document.getElementById('certification-title').innerText = name;
}
