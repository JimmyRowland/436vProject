import * as d3 from 'd3';
import { states } from './main';

export function responsiveSquareChartContainer(parentElement) {
  const squareDim = d3.min([states.chart2.width, states.chart2.height]);
  return d3
    .select(parentElement)
    .append('div')
    .attr('style', `width: ${squareDim}px; height: ${squareDim}px`)
    .on('mouseenter', (event, d) => {
      console.log('in');
      const windowWidth = d3.min([window.innerWidth, window.innerHeight]);
      d3.select(event.target).attr('width', windowWidth).attr('height', windowWidth);
    })
    .on('mouseout', (event, d) => {
      console.log('out');

      d3.select(event.target).attr('width', squareDim).attr('height', squareDim);
    });
}
