import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale;
let yScale;

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line),
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  data.sort((a, b) => {
    let dateDiff = a.date - b.date;
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return a.datetime - b.datetime;
  });

  return data;
}

function processCommits() {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
          id: commit,
          url: 'https://github.com/suchitbhayani/portfolio/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
          value: lines,       // Set the value of 'lines'
          enumerable: false,  // Hide it from `console.log(obj)`
          writable: false,    // Prevent accidental modification
          configurable: false // Prevent deletion or reconfiguration
      });
      ret.longestLine = d3.max(lines, d => d.length) || 0;
      return ret;
      });
}

function updateCommitInfo(data, filteredCommits) {
  // Clear
  d3.select('#stats').html('');

  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  // Add number of files in the codebase
  dl.append('dt').text('Number of files');
  let uniqueFiles = new Set(data.map(d => d.file)).size;
  dl.append('dd').text(uniqueFiles);

  // Add average file length (in lines)
  dl.append('dt').text('Average File Length (lines)');
  let averageFileLength = d3.mean(
      d3.groups(data, d => d.file)
      .map(([file, lines]) => lines.length)
  );
  dl.append('dd').text(averageFileLength.toFixed(2));

  // Add file with the max file length
  dl.append('dt').text('Longest File (lines)');
  let maxFileLength = d3.max(
      d3.groups(data, d => d.file)
      .map(([file, lines]) => lines.length)
  );
  let maxFile = d3.groups(data, d => d.file)
                  .find(([file, lines]) => lines.length == maxFileLength)[0];
  dl.append('dd').text(maxFile + ' (' + maxFileLength + ')');
}

function updateScatterPlot(data, filteredCommits) {
  // setup
  const [minLines, maxLines] = d3.extent(filteredCommits, (d) => d.totalLines);
  const rScale = d3
      .scaleSqrt()
      .domain([minLines, maxLines])
      .range([2, 25]);
  const width = 1000;
  const height = 600;
  const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);

  // margins
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // make chart
  d3.select('svg').remove(); // first clear the svg
  const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

  const xDomain = d3.extent(filteredCommits, d => d.datetime);
  xScale = d3.scaleTime().domain(xDomain).range([usableArea.left, usableArea.right]).nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const dots = svg.append('g').attr('class', 'dots');
  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
      .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  // gridlines
  const gridlines = svg
      .append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`);
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  createBrushSelector(svg);
  
}

let data = await loadData();
let commits = processCommits();

updateCommitInfo(data, commits);
updateScatterPlot(data, commits);
updateFileInfo(commits);

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const lines = document.getElementById('commit-lines');
  const author = document.getElementById('commit-author');
  const time = document.getElementById('commit-time');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  lines.textContent = commit.totalLines;
  author.textContent = commit.author;
  time.textContent = commit.time;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
  const brushGroup = svg.append('g')
    .attr('class', 'brush-container');
  
  // Create brush
  brushGroup.call(d3.brush().on('start brush end', brushed));
  
  // Make sure dots are above the brush overlay
  svg.selectAll('.dots').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }
  
  // Extract the x and y bounds from the selection
  const [[x0, y0], [x1, y1]] = selection;
  
  // Map commit data to screen coordinates using the scales
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  
  // Check if the point is within the selection rectangle
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

// first scrollytelling
function updateFileInfo(filteredCommits) {
  let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = [];
  files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    });
  files = d3.sort(files, (d) => -d.lines.length);

  d3.select('.files').selectAll('div').remove();

  let filesContainer = d3.select('.files')
    .selectAll('div')
    .data(files)
    .enter()
    .append('div');

  filesContainer.append('dt')
    .append('code')
    .text(d => d.name);  // Set file name inside <code>

  filesContainer.append('dd')
    .text(d => `${d.lines.length} lines`);  // Set line count text
  
  filesContainer.append('dd')
    .selectAll('div')
    .data(d => d.lines)  // Bind each line in the file
    .enter()
    .append('div')
    .attr('class', 'line')
    .style('background', d => fileTypeColors(d.type));;  // Set class attribute
  }

function renderItems(startIndex) {
  itemsContainer.selectAll('div').remove();
  const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);
  const newCommitSlice = commits.slice(startIndex, endIndex);

  let filteredCommits = commits.slice(0, endIndex);
  let endDateTime = commits[endIndex - 1].datetime
  let filteredData = data.filter(d => d.datetime <= endDateTime);

  updateCommitInfo(filteredData, filteredCommits);
  updateScatterPlot(data, filteredCommits);
  updateFileInfo(filteredCommits); // also add to 2nd scrollytelling

  itemsContainer.selectAll('div')
    .data(newCommitSlice)
    .enter()
    .append('div')
    .classed('item', true)
    .style('position', 'absolute')
    .style('top', (_, idx) => `${(startIndex + idx) * ITEM_HEIGHT}px`)
    .each(function(commit, index) {
      const commitDate = new Date(commit.datetime);
      const dateStr = commitDate.toLocaleString("en", { dateStyle: "full", timeStyle: "short" });
      const fileCount = d3.rollups(commit.lines, d => d.length, d => d.file).length;
      const message = index > 0 ? 'another glorious commit' : 'my first commit, and it was glorious';

      d3.select(this).append('p').html(`
        On ${dateStr}, I made
        <a href="${commit.url}" target="_blank">${message}</a>.
        I edited ${commit.totalLines} lines across ${fileCount} files.
        Then I looked over all I had made, and I saw that it was very good.
      `);
    });
}

let NUM_ITEMS = 45;
let ITEM_HEIGHT = 100;
let VISIBLE_COUNT = 3;
let totalHeight = NUM_ITEMS * ITEM_HEIGHT;

const scrollContainer = d3.select('#scroll-container');
const spacer = d3.select('#spacer').style('height', `${totalHeight}px`);
const itemsContainer = d3.select('#items-container');

scrollContainer.on('scroll', () => {
  const scrollTop = scrollContainer.property('scrollTop');
  let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
  renderItems(startIndex);
});

renderItems(0);

// second scrollytelling
const lineColor = d3.scaleOrdinal(d3.schemeTableau10);
const ITEM_HEIGHT_2 = 80;
let scrollContainer2Sel = d3.select('#scroll-container-2');
let itemsContainer2Sel = d3.select('#items-container-2');
let scrollyLongestData = [...commits].sort((a, b) => a.longestLine - b.longestLine);
scrollyLongestData.forEach((c, i) => c._indexLongest = i);
d3.select('#spacer-2').style('height', (scrollyLongestData.length * ITEM_HEIGHT_2) + 'px');
scrollContainer2Sel.on('scroll', renderItemsLongestLine);
renderItemsLongestLine();

function renderItemsLongestLine() {
  d3.select('#spacer-2').style('height', (scrollyLongestData.length * ITEM_HEIGHT_2) + 'px');
  const items = itemsContainer2Sel.selectAll('.item-longest')
    .data(scrollyLongestData, d => d.id);
  items.exit().remove();
  const itemsEnter = items.enter()
    .append('div')
    .attr('class', 'item-longest');
  itemsEnter.merge(items)
    .style('top', d => (d._indexLongest * ITEM_HEIGHT_2) + 'px')
    .html(d => {
      const dateStr = d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' });
      return `<div>
                <strong>${dateStr}</strong>
                <a href="${d.url}" target="_blank">Open Commit</a>
              </div>
              <div>
                This commit's <strong>longest line</strong> was
                <em>${d.longestLine} characters</em>!
                The author <em>${d.author}</em> wrote a record-breaking line.
              </div>`;
    });
  const scrollTop = scrollContainer2Sel.node().scrollTop;
  const containerHeight = parseFloat(scrollContainer2Sel.style('height'));
  const centerIndex = Math.round((scrollTop + containerHeight / 2) / ITEM_HEIGHT_2);
  const clampedIndex = Math.max(0, Math.min(scrollyLongestData.length - 1, centerIndex));
  const currentCommit = scrollyLongestData[clampedIndex];
  const filteredLongest = commits.filter(d => d.longestLine <= currentCommit.longestLine);
  updateFileListLongest(filteredLongest);
}

function updateFileListLongest(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const fileGroups = d3.groups(lines, d => d.file);
  const filesData = fileGroups.map(([file, lines]) => ({ file, lines }));
  filesData.sort((a, b) => d3.descending(a.lines.length, b.lines.length));
  d3.select('#files-longest').html('');
  d3.select('#files-longest')
    .selectAll('dl')
    .data(filesData, d => d.file)
    .join('dl')
    .each(function(d) {
      const sel = d3.select(this);
      sel.append('dt').html(`
        <code>${d.file}</code>
        <small>${d.lines.length} lines</small>
      `);
      const dd = sel.append('dd');
      dd.selectAll('div.line')
        .data(d.lines)
        .join('div')
        .attr('class', 'line')
        .style('background', line => lineColor(line.type));
    });
}