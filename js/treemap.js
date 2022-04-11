import { scaleOrdinal, select, treemap, hierarchy, group, treemapBinary } from 'd3';
import { filteredStates, states } from './main';
import { getfarmWithTypeByFarmId, getFarmTooltipContentTreeMap } from './utils';

export class Treemap {
  /**
   * Class constructor with basic chart configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _state) {
    // Configuration object with defaults
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1000,
      containerHeight: _config.containerHeight || 500,
      margin: _config.margin || { top: 20, right: 20, bottom: 20, left: 0 },
    };
    this.state = _state;

    this.initVis();
  }

  /**
   * Initialize scales/axes and append static elements, such as axis titles
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg
      .append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // colour scale
    vis.colourScale = scaleOrdinal()
      .domain([
        'greenhouse',
        'field',
        'ceremonial_area',
        'garden',
        'farm_site_boundary',
        'residence',
        'natural_area',
        'barn',
      ])
      .range([
        '#2176AE',
        '#57B8FF',
        '#B66D0D',
        '#FBB13C',
        '#FE6847',
        '#EBA6A9',
        '#51344D',
        '#C14B0B',
      ]);

    // create legend
    vis.svg.append('circle').attr('cx', 18).attr('cy', 8).attr('r', 6).style('fill', '#57B8FF');
    vis.svg
      .append('text')
      .attr('x', 28)
      .attr('y', 8)
      .text('field')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 80).attr('cy', 8).attr('r', 6).style('fill', '#2176AE');
    vis.svg
      .append('text')
      .attr('x', 90)
      .attr('y', 8)
      .text('greenhouse')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 190).attr('cy', 8).attr('r', 6).style('fill', '#FBB13C');
    vis.svg
      .append('text')
      .attr('x', 200)
      .attr('y', 8)
      .text('garden')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 270).attr('cy', 8).attr('r', 6).style('fill', '#C14B0B');
    vis.svg
      .append('text')
      .attr('x', 280)
      .attr('y', 8)
      .text('barn')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 330).attr('cy', 8).attr('r', 6).style('fill', '#FE6847');
    vis.svg
      .append('text')
      .attr('x', 340)
      .attr('y', 8)
      .text('boundary')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 425).attr('cy', 8).attr('r', 6).style('fill', '#B66D0D');
    vis.svg
      .append('text')
      .attr('x', 435)
      .attr('y', 8)
      .text('ceremonial area')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg.append('circle').attr('cx', 560).attr('cy', 8).attr('r', 6).style('fill', '#EBA6A9');
    vis.svg
      .append('text')
      .attr('x', 570)
      .attr('y', 8)
      .text('residence')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.svg
      .append('text')
      .attr('x', 680)
      .attr('y', 8)
      .text('number represents area in m\u00B2')
      .style('font-size', '15px')
      .attr('alignment-baseline', 'middle');

    vis.updateVis();
  }

  /**
   * Prepare data before render
   */
  updateVis() {
    let vis = this;

    vis.data = getfarmWithTypeByFarmId(filteredStates.farms, states.locationsByFarmId);
    var groups = group(Object.values(vis.data), (d) => d.type);

    vis.root = hierarchy(groups).sum((d) => d.area);
    vis.root.sort(function (a, b) {
      return b.height - a.height || b.value - a.value;
    });

    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;

    treemap()
      .tile(treemapBinary)
      .size([vis.width, vis.height])
      .paddingInner(5)
      .paddingTop(5)
      .paddingRight(5)
      .paddingBottom(5)
      .paddingLeft(5)
      .round(true)(vis.root);

    vis.chart
      .selectAll('rect')
      .data(vis.root.leaves())
      .join('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('class', (d) => d.data.type)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .style('stroke', 'black')
      .style('fill', (d) => vis.colourScale(d.data.type))
      .on('mouseover', (event, d) => {
        select('#tooltip')
          .style('display', 'block')
          .style('left', event.pageX + 'px')
          .style('top', event.pageY + 'px')
          .html(getFarmTooltipContentTreeMap(filteredStates.farms, d));
      })
      .on('mouseleave', () => {
        select('#tooltip').style('display', 'none');
      });

    vis.chart
      .selectAll('text')
      .data(vis.root.leaves())
      .join('text')
      .attr('x', (d) => d.x0 + 5)
      .attr('y', (d) => d.y0 + 10)
      .text((d) => {
        if (d.x1 - d.x0 > 40 && d.y1 - d.y0 > 10) {
          return d.data.area;
        }
      })
      .attr('font-size', '10px')
      .attr('fill', 'white');
  }
}
