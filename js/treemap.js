import { scaleOrdinal, select, treemap, hierarchy, group, treemapBinary } from 'd3';
import { filteredStates, filters, states, updateCharts } from './main';
import { getfarmWithTypeByFarmId } from './utils';

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
      margin: _config.margin || { top: 32, right: 130, bottom: 40, left: 40 },
      reverseOrder: _config.reverseOrder || false,
      tooltipPadding: _config.tooltipPadding || 15,
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
        '#E4FDE1',
      ]);

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
    vis.root.sort();

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

    vis.svg
      .selectAll('rect')
      .data(vis.root.leaves())
      .join('rect')
      .attr('x', (d) => d.x0)
      .attr('y', (d) => d.y0)
      .attr('class', (d) => d.data.type)
      .attr('width', (d) => d.x1 - d.x0)
      .attr('height', (d) => d.y1 - d.y0)
      .style('stroke', 'black')
      .style('fill', (d) => vis.colourScale(d.data.type));

    vis.svg
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
