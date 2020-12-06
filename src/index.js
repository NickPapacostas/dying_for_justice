import * as d3 from 'd3';
import { mesh, feature } from 'topojson';

const width = 720;
const height = 450;

const colorScale = d3.scaleQuantize().domain([1, 500]).range(d3.schemeReds[9])

const svg = d3.select('svg')
  .attr('width', width)
  .attr('height', height)

const g = svg.append('g')

const zoom = d3.zoom().scaleExtent([.2, 5]).on('zoom', (event) => {
  const { transform } = event
  g.attr('transform', transform);
  g.attr('stroke-width', 1 / transform.k)
})

  function loadAirtableData() {
    return fetch("https://api.airtable.com/v0/appIo1lqaLGrB5dLz/Table%201?maxRecords=100&view=Grid%20view", {
      headers: new Headers({
        "Authorization": `Bearer keyiUyROsiT6hATuI`
      })
    }).then( response => {
      return response.json().then( jailPopPerCap => {
        return jailPopPerCap.records.map( (r) => {
          return {
            state: r.fields.State,
            jailPop: r.fields["Jail Population per capita"],
            avgDailyPop: r.fields["Average number of people in jail"],
            mortalityRate: r.fields["Mortality Rate"]
          }
        })
      })
    })
  }


svg.call(zoom);

Promise.all([
  d3.json('us.json'),
  d3.csv("us-state-names.csv"),
  loadAirtableData()
]).then(([us, statesData, popData]) => {
  const projection = d3.geoAlbersUsa()
    .scale(500)
    .translate([width/2, height/2]);

  const path = d3.geoPath().projection(projection)
  const states = g.append("g")
      .attr("cursor", "pointer")
    .selectAll("path")
    .data(feature(us, us.objects.states).features)
    .join("path")
      .on("click", clicked)
      .attr("d", path)
      .attr("fill", (d) => assignData(d))


  g.append("path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("d", path(mesh(us, us.objects.states, (a, b) => a !== b)));


  const places = [
    [-122.3367534,47.5996582],
    [-80.1942949,25.7645783]
  ]


  g.selectAll(null)
    .data(places)
    .enter()
    .append('circle')
    .attr('r', 1)
    .attr("transform", (d) => {
      return `translate(${projection(d)})`
    })

  function assignData(d) {
    const matchingStateData = statesData.filter((sd) => sd.id == `${d.id}`)[0]

    if(matchingStateData) {
      const stateName = matchingStateData.name
      d.name = stateName

      let stateData = popData.filter((r) => r.state == stateName)[0]

      if (stateData) {
        d.jailPopPerCap = stateData.jailPop
        d.avgDailyPop = stateData.avgDailyPop
        d.mortalityRate = stateData.mortalityRate
      }
    }

    return colorScale(d.jailPopPerCap)
  }

  function clicked(event, d) {
    console.log(d)
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    event.stopPropagation();
    states.transition().style("fill", null);
    d3.select(this).transition().style("fill", "lightblue");
    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.pointer(event, svg.node())
    );
  }
})
