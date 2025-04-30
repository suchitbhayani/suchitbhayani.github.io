import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// projects
const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

// pie chart
let arcGenerator = d3.arc()
    .innerRadius(0)
    .outerRadius(50);

function renderPieChart(projectsGiven) {
    // makes projectsGiven a list of lists
    let newRolledData = d3.rollups(
        projectsGiven,
        (v) => v.length,
        (d) => d.year,
    );
    // gets list of lists into JSON
    let newData = newRolledData.map(([year, count]) => {
        return { value: count, label: year };
    });

    // newSliceGenerator is a function that computes size of each slice
    let newSliceGenerator = d3.pie().value((d) => d.value);
    // uses function above to compute size of each slice for our data
    let newArcData = newSliceGenerator(newData);
    // generates SVG path strings using arcGenerator
    let newArcs = newArcData.map((d) => arcGenerator(d));

    let selectedIndex = -1;
    let svg = d3.select('svg');
    let legend = d3.select('.legend');
    let colors = d3.scaleOrdinal(d3.schemeTableau10);

    // cleans up old content
    svg.selectAll('path').remove();
    legend.selectAll('li').remove();
 
    newArcs.forEach((arc, idx) => {
        svg
          .append('path')
          .attr('d', arc) // draws SVG path strings
          .attr('fill', colors(idx)) // assign color
          .on('click', () => { // click interactivity and function
            selectedIndex = selectedIndex === idx ? -1 : idx;

            if (selectedIndex === -1) {
                renderProjects(projects, projectsContainer, 'h2');
            } else {
                let selectedYear = newData[selectedIndex].label;
                let filteredProjects = projects.filter(
                    (project) => project.year === selectedYear
                );
                renderProjects(filteredProjects, projectsContainer, 'h2');
            }

            // assigns classes to svg and legend HTML elements for CSS purposes
            svg
                .selectAll('path')
                .attr('class', (_, idx) => (
                    idx === selectedIndex ? 'selected' : ''
            ));
            legend
                .selectAll('li')
                .attr('class', (_, idx) => (
                    idx === selectedIndex ? 'selected' : ''
            ));

        });
    });

    // makes legend
    newData.forEach((d, idx) => {
        legend.append('li')
            .attr('class', 'legend-item')
            .attr('style', `--color:${colors(idx)}`)
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });

}

renderPieChart(projects);

let query = '';
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
    // update query value
    query = event.target.value;
    // filter projects
    let filteredProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
        return values.includes(query.toLowerCase());
    })
    // render filtered projects
    renderProjects(filteredProjects, projectsContainer, 'h2');
    renderPieChart(filteredProjects);
});

let selectedIndex = -1;
