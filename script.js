// script.js
// Save/load key
const STORAGE_KEY = 'lina_grades_v1';

// default config + initial data (from اللي عطيتيني)
const DEFAULT = {
  aPlusThreshold: 90,
  courses: [
    {
      id:'economy', name:'Economy',
      items:[
        {type:'Quiz', name:'Quiz 1', max:5, val:4.25},
        {type:'Quiz', name:'Quiz 2', max:5, val:4.5},
        {type:'Quiz', name:'Quiz 3', max:5, val:5},
        {type:'Quiz', name:'Quiz 4', max:5, val:0},
        {type:'Quiz', name:'Quiz 5', max:5, val:0},
        {type:'Midterm', name:'Midterm 1', max:15, val:14.5},
        {type:'Midterm', name:'Midterm 2', max:15, val:14.5},
        {type:'Final', name:'Final', max:50, val:0}
      ]
    },
    {
      id:'math', name:'Math',
      items:[
        {type:'Quiz', name:'Quiz 1', max:10, val:10},
        {type:'Quiz', name:'Quiz 2', max:10, val:10},
        {type:'Quiz', name:'Quiz 3', max:10, val:0},
        {type:'Midterm', name:'Midterm', max:25, val:24},
        {type:'Activity', name:'Activities', max:5, val:5},
        {type:'Final', name:'Final', max:50, val:0}
      ]
    },
    {
      id:'technology', name:'Technology',
      items:[
        {type:'Quiz', name:'Quiz 1', max:5, val:5},
        {type:'Quiz', name:'Quiz 2', max:5, val:3.25},
        {type:'Quiz', name:'Quiz 3', max:5, val:0},
        {type:'Midterm', name:'Midterm 1', max:20, val:20},
        {type:'Midterm', name:'Midterm 2', max:20, val:0},
        {type:'Final', name:'Final', max:50, val:0}
      ]
    },
    {
      id:'arba', name:'Arba',
      items:[
        {type:'Midterm', name:'Midterm', max:20, val:19},
        {type:'Activity', name:'Activities', max:20, val:20},
        {type:'Final', name:'Final', max:60, val:0}
      ]
    },
    {
      id:'islamic', name:'Islamic',
      items:[
        {type:'Midterm', name:'Midterm', max:20, val:18},
        {type:'Activity', name:'Activities', max:20, val:20},
        {type:'Final', name:'Final', max:60, val:0}
      ]
    },
    {
      id:'admin', name:'Administration',
      items:[
        {type:'Midterm', name:'Midterm 1', max:20, val:18.5},
        {type:'Midterm', name:'Midterm 2', max:20, val:0},
        {type:'Report', name:'Report', max:10, val:0},
        {type:'Final', name:'Final', max:50, val:0}
      ]
    }
  ]
};

// load or init
let state = loadState();

// DOM refs
const coursesList = document.getElementById('coursesList');
const dashboard = document.getElementById('dashboard');
const courseSection = document.getElementById('courseSection');
const courseTitle = document.getElementById('courseTitle');
const courseTableBody = document.querySelector('#courseTable tbody');
const backToDash = document.getElementById('backToDash');
const calcCourse = document.getElementById('calcCourse');
const saveCourse = document.getElementById('saveCourse');

const termWorkValue = document.getElementById('termWorkValue');
const aplusPercent = document.getElementById('aplusPercent');
const aplusGap = document.getElementById('aplusGap');

// charts
let bestChart, compareChart;

// init UI
renderSidebar();
renderDashboard();
attachActions();

function loadState(){
  try{
    const json = localStorage.getItem(STORAGE_KEY);
    if(json) return JSON.parse(json);
  }catch(e){}
  // clone default
  return JSON.parse(JSON.stringify(DEFAULT));
}
function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- Sidebar & List ---------- */
function renderSidebar(){
  coursesList.innerHTML = '';
  state.courses.forEach(c=>{
    const btn = document.createElement('button');
    btn.className = 'course-btn';
    btn.innerHTML = <span style="font-weight:600">${c.name}</span>; // <- صححت backticks
    btn.onclick = ()=> onCourseClick(c.id);
    coursesList.appendChild(btn);
  });
}

/* ---------- Dashboard (charts) ---------- */
function renderDashboard(){
  const labels = state.courses.map(c=>c.name);
  const bestData = state.courses.map(c=>{
    const quizzes = c.items.filter(it=>it.type==='Quiz').map(q=>parseFloat(q.val||0));
    if(quizzes.length<=1) return quizzes.reduce((s,x)=>s+x,0);
    const sorted = quizzes.slice().sort((a,b)=>b-a);
    const take = sorted.slice(0, quizzes.length - 1);
    return take.reduce((s,x)=>s+x,0);
  });
  const compareData = state.courses.map(c=>{
    const res = computeMeasuresForCourse(c);
    return res.percent;
  });

  termWorkValue.innerText = computeAverageTermPercent().toFixed(1) + '%';

  const aplusInfo = computeAPlus();
  aplusPercent.innerText = (100 - aplusInfo.minGap).toFixed(1) + '%';
  aplusGap.innerText = ${aplusInfo.minGap.toFixed(1)}% نقص عن ${state.aPlusThreshold}%; // <- صححت backticks

  const apCard = document.getElementById('aplusCard');
  const apVal = 100 - aplusInfo.minGap;
  if(apVal >= state.aPlusThreshold) apCard.style.background = 'linear-gradient(90deg,#caa32b,#e6d28a)';
  else if(apVal >= state.aPlusThreshold - 6) apCard.style.background = 'linear-gradient(90deg,#ffd86b,#ffc107)';
  else apCard.style.background = 'linear-gradient(90deg,#7fcf7f,#3fb76e)';

  if(!bestChart){
    const ctx = document.getElementById('bestQuizzesChart').getContext('2d');
    bestChart = new Chart(ctx, {
      type:'pie',
      data:{labels:labels,datasets:[{data:bestData, backgroundColor:generateColors(labels.length)}]},
      options:{responsive:true, plugins:{legend:{position:'bottom'}}}
    });
  } else {
    bestChart.data.labels = labels;
    bestChart.data.datasets[0].data = bestData;
    bestChart.update();
  }

  if(!compareChart){
    const ctx2 = document.getElementById('compareChart').getContext('2d');
    compareChart = new Chart(ctx2, {
      type:'bar',
      data:{labels:labels, datasets:[{data:compareData, backgroundColor:generateColors(labels.length)}]},
      options:{indexAxis:'y', responsive:true, scales:{x:{beginAtZero:true, max:100}}}
    });
  } else {
    compareChart.data.labels = labels;
    compareChart.data.datasets[0].data = compareData;
    compareChart.update();
  }

  saveState();
}
