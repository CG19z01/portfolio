// Default content: used only to bootstrap the Blob JSON stores on first run.
// The front-end no longer keeps a copy of this — it renders whatever the API
// returns, so the admin panel stays the single source of truth.

const projects = [
  {
    id: 'forum',
    title: 'Forum',
    desc: "Réalisation d'un forum",
    img: 'maquette_forum.png',
    tags: ['HTML/CSS', 'JS'],
    githubUrl: '',
    demoUrl: '',
  },
  {
    id: 'profily',
    title: 'Profily',
    desc: 'Une IA pour trouver la meilleure entreprise',
    img: 'maquette_profily.png',
    tags: ['React', 'Web Audio API', 'TypeScript'],
    githubUrl: '',
    demoUrl: '',
  },
  {
    id: 'track-mixer',
    title: 'TRACK MIXER',
    desc: 'Application en cours de devellopement, nous en parlerons bientot...',
    img: 'travail_en_cours.png',
    tags: ['Python', 'Flask', 'WebSockets'],
    githubUrl: '',
    demoUrl: '',
  },
];

const skills = [
  { id: 'golang', name: 'Golang', pct: 70 },
  { id: 'javascript', name: 'JavaScript', pct: 85 },
  { id: 'html-css', name: 'HTML / CSS', pct: 70 },
  { id: 'rust', name: 'Rust', pct: 30 },
  { id: 'docker', name: 'Docker', pct: 45 },
  { id: 'sqlite', name: 'SQLite', pct: 40 },
];

module.exports = { projects, skills };
