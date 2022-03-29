import * as d3 from 'd3';
import { filteredStates, states } from './main';
import {
  areaAggregationBreakpoints,
  getFarmPercentageByUserCountGroup,
  getFarmsByUserCountAreaBucket,
} from './utils';

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
      containerWidth: _config.containerWidth || states.chart1.width,
      containerHeight: _config.containerHeight || states.chart1.height,
      margin: _config.margin || { top: 0, right: 0, bottom: 0, left: 0 },
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

    // Initialize scales and axes
    // Important: we flip array elements in the y output range to position the rectangles correctly
    vis.yScale = d3.scaleLinear().range([vis.height, 0]);

    vis.xScale = d3
      .scaleBand()
      .range([12, vis.width - 12])
      .paddingInner(0.2);

    vis.colorScale = d3.scaleOrdinal().domain(areaAggregationBreakpoints).range(d3.schemeSet3);
    // Define size of SVG drawing area
    vis.svg = d3
      .select(vis.config.parentElement)
      .append('svg')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // SVG Group containing the actual chart; D3 margin convention
    vis.chart = vis.svg
      .append('g')
      .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chart
      .append('g')
      .attr('class', 'axis x-axis')
      .attr('transform', `translate(0,${vis.height})`);

    // Append y-axis group
    vis.yAxisG = vis.chart.append('g').attr('class', 'axis y-axis');

    vis.chart
      .append('text')
      .attr('class', 'axis-title')
      .attr('y', vis.height + 24)
      .attr('x', vis.width + 4)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('members/farm');

    vis.svg
      .append('text')
      .attr('class', 'axis-title')
      .attr('x', 5)
      .attr('y', 0)
      .attr('dy', 20)
      .text('farms');
  }

  /**
   * Prepare data and scales before we render it
   */
  updateVis() {
    let vis = this;
    filteredStates.farmsByUserCountAreaBucket = getFarmsByUserCountAreaBucket(
      Object.values(filteredStates.farmWithAreaByFarmId),
    );
    vis.data = getFarmPercentageByUserCountGroup(filteredStates.farmsByUserCountAreaBucket);
    vis.stackedData = d3.stack().keys(areaAggregationBreakpoints.reverse())(vis.data);
    vis.xScale.domain(Object.keys(filteredStates.farmsByUserCountAreaBucket).sort());
    vis.yScale.domain([0, 100]);
    vis.yAxis = d3
      .axisLeft(vis.yScale)
      .tickSize(-vis.width)
      .tickPadding(10)
      .ticks(5)
      .tickSizeOuter(0)
      .tickFormat((d) => d + '%');
    vis.xAxis = d3.axisBottom(vis.xScale).tickSizeOuter(0);
    vis.renderVis();
  }

  /**
   * Bind data to visual elements
   */
  renderVis() {
    let vis = this;
    let bars = vis.chart
      .selectAll('.bar')
      .data(vis.stackedData)
      .join('g')
      .attr('fill', (d) => vis.colorScale(d.key))
      .selectAll('rect')
      .data((d) => d)
      .join('rect')
      .style('opacity', 1)
      .attr('class', (d) => `bar${d.gender === states.gender ? ' bar-selected' : ''}`)
      .attr('x', (d) => vis.xScale(d.data.number_of_users))
      .attr('width', vis.xScale.bandwidth())
      .attr('height', (d) => vis.yScale(d[0]) - vis.yScale(d[1]))
      .attr('y', (d) => vis.yScale(d[1]));
    //
    // // Tooltip event listeners
    // bars
    //   .on('mouseover', (event, d) => {
    //
    //   })
    //
    //   .on('mouseleave', () => {
    //   })
    //   .on('click', (event, d) => {
    //     onGenderClick(d.gender)
    //   })
    // ;

    vis.xAxisG.call(vis.xAxis);

    vis.yAxisG.call(vis.yAxis);
  }
}
