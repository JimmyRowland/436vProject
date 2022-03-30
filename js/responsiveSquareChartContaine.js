import * as d3 from 'd3';
import { states } from './main';

export function responsiveSquareChartContainer(parentElement) {
  const squareDim = d3.min([states.chart2.width, states.chart2.height]);
  return d3
    .select(parentElement)
    .append('div')
    .attr('style', `width: ${squareDim}px; height: ${squareDim}px`)
    .on('mouseover', (event, d) => {
      const windowWidth = d3.min([window.innerWidth, window.innerHeight]);
      d3.select(event.target).attr('style', `width: ${windowWidth}px; height: ${windowWidth}px`);
    })
    .on('mouseleave', (event, d) => {
      d3.select(event.target).attr('style', `width: ${squareDim}px; height: ${squareDim}px`);
    });
}
