import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line), // or just +row.line
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
  
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
            url: 'https://github.com/vis-society/lab-7/commit/' + commit,
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

        return ret;
        });
}

function renderCommitInfo(data, commits) {
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
    ); // Count number of lines
    dl.append('dd').text(averageFileLength.toFixed(2));

    // Add file with the max file length
    dl.append('dt').text('Longest File (lines)');
    let maxFileLength = d3.max(
        d3.groups(data, d => d.file)
        .map(([file, lines]) => lines.length)
    ); // Find max count of lines
    let maxFile = d3.groups(data, d => d.file)
                    .find(([file, lines]) => lines.length == maxFileLength)[0]; // Find the file with max lines
    dl.append('dd').text(maxFile + ' (' + maxFileLength + ')');
}

let data = await loadData();
let commits = processCommits(data);
renderCommitInfo(data, commits);
