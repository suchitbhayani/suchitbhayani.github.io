// nav bar 
let pages = [
    { url: '', title: 'Home'},
    { url: 'https://suchitbhayani.github.io/lib/Suchit_Bhayani_resume.pdf', title: 'Resume'},
    { url: 'projects/', title: 'Projects'},
    // { url: 'meta/', title: 'Meta'},
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    const ARE_WE_HOME = document.documentElement.classList.contains('home');
    let url = p.url;    
    if (!ARE_WE_HOME && !url.startsWith('http')) {
        url = '../' + url;
    }
    let title = p.title;
    
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }
    if (title === 'Resume') {
        a.target = '_blank';
    }
    nav.append(a);
}  


// light/dark mode button
document.body.insertAdjacentHTML(
    'afterbegin',
    `
        <label class="color-scheme">
            Theme:
            <select>
                <option value="light dark">Automatic</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>
        </label>`
);

// selection
let select = document.querySelector('select');

if ('colorScheme' in localStorage) {
    let scheme = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', scheme);
    select.value = scheme;
}

select.addEventListener('input', function (event) {
    let scheme = event.target.value;
    document.documentElement.style.setProperty('color-scheme', scheme);
    localStorage.colorScheme = scheme;
});

// experiences
let experience = document.querySelector('.experience')
async function loadExperiences() {
  try {
    // 1. Fetch the file
    const response = await fetch('./lib/experiences.json');
    
    // 2. Check if the file exists/is accessible
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 3. Convert the response to JSON
    const data = await response.json();

    // 4. Map the data to HTML strings and join them
    const htmlContent = data.map(item => `
        <div class="exp-item">
            <div class="company">${item.company}</div>
            <div class="position">${item.position}</div>
            <div class="duration">
                ${item.start}${item.end ? ` - ${item.end}` : ''}
            </div>
        </div>
    `).join('');

    // 5. Update the DOM once
    experience.innerHTML = htmlContent;

  } catch (error) {
    console.error("Could not fetch experiences:", error);
    experience.innerHTML = "<p>Failed to load experience data.</p>";
  }
}

// Call the function
loadExperiences();


// functions for projects page
export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }
        const data = await response.json();

        return data;
 
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(project, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';
    
    project.forEach(project => {
        const article = document.createElement('article');
        article.innerHTML = `
        <${headingLevel}>
            <a href="${project.link}" target="_blank" rel="noopener noreferrer">
                ${project.title} (${project.year})
            </a>
        </${headingLevel}>
        <img src="${project.image}" alt="${project.title}" class="project-image">
        <p>${project.description}</p>
        `;
        containerElement.appendChild(article);
    });
};


// function for github stats
export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
} 
  
