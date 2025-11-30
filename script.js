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
    btn.innerHTML = <span style="font-weight:600">${c.name}</span>;
    btn.onclick = ()=> onCourseClick(c.id);
    coursesList.appendChild(btn);
  });
}

/* ---------- Dashboard (charts) ---------- */
function renderDashboard(){
  // prepare data
  const labels = state.courses.map(c=>c.name);
  const bestData = state.courses.map(c=>{
    // compute top quizzes sum (drop lowest one if more than 1)
    const quizzes = c.items.filter(it=>it.type==='Quiz').map(q=>parseFloat(q.val||0));
    if(quizzes.length<=1) return quizzes.reduce((s,x)=>s+x,0);
    const sorted = quizzes.slice().sort((a,b)=>b-a);
    // drop lowest one -> count = length - 1
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
  aplusGap.innerText = ${aplusInfo.minGap.toFixed(1)}% نقص عن ${state.aPlusThreshold}%;

  // color aplus card
  const apCard = document.getElementById('aplusCard');
  const apVal = 100 - aplusInfo.minGap;
  if(apVal >= state.aPlusThreshold) apCard.style.background = 'linear-gradient(90deg,#caa32b,#e6d28a)';
  else if(apVal >= state.aPlusThreshold - 6) apCard.style.background = 'linear-gradient(90deg,#ffd86b,#ffc107)';
  else apCard.style.background = 'linear-gradient(90deg,#7fcf7f,#3fb76e)';

  // make/update charts
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

/* ---------- Course Click / Render detail ---------- */
let activeCourseId = null;
function onCourseClick(courseId){
  activeCourseId = courseId;
  const course = state.courses.find(c=>c.id===courseId);
  if(!course) return;
  // update header
  courseTitle.innerText = course.name;
  // render table
  courseTableBody.innerHTML = '';
  course.items.forEach((it, idx)=>{
    const tr = document.createElement('tr');
    const tdType = document.createElement('td'); tdType.innerText = it.type; tr.appendChild(tdType);
    const tdName = document.createElement('td'); tdName.innerText = it.name; tr.appendChild(tdName);
    const tdMax = document.createElement('td'); tdMax.innerText = it.max; tr.appendChild(tdMax);
    const tdVal = document.createElement('td');
    tdVal.contentEditable = true;
    tdVal.innerText = it.val!==undefined?it.val:'';
    tdVal.oninput = ()=> {
      // update state value
      const v = parseFloat(tdVal.innerText) || 0;
      it.val = v;
      renderDashboard();
    };
    tr.appendChild(tdVal);
    courseTableBody.appendChild(tr);
  });

  // show section
  dashboard.classList.add('hidden');
  courseSection.classList.remove('hidden');
  // compute current course stats
  updateCourseSummary();
}

/* back */
backToDash.onclick = ()=> {
  activeCourseId = null;
  courseSection.classList.add('hidden');
  dashboard.classList.remove('hidden');
  renderDashboard();
};

/* calc and save */
calcCourse.onclick = ()=> {
  updateCourseSummary(true);
};
saveCourse.onclick = ()=> {
  saveState();
  alert('تم حفظ البيانات محلياً');
};

/* compute summary for single course */
function updateCourseSummary(showAlert){
  if(!activeCourseId) return;
  const course = state.courses.find(c=>c.id===activeCourseId);
  const res = computeMeasuresForCourse(course);
  document.getElementById('courseTermWork').innerText = res.termWorkValue.toFixed(2) + ' نقطة';
  document.getElementById('coursePercent').innerText = res.percent.toFixed(1) + '%';
  // A+ gap
  const gap = Math.max(0, state.aPlusThreshold - res.percent);
  const note = document.getElementById('courseAPlusNote');
  note.innerText = نقص ${gap.toFixed(1)}% للوصول إلى ${state.aPlusThreshold}% (A+);
  if(showAlert) alert(النسبة للمقرر ${course.name} = ${res.percent.toFixed(1)}%);
  renderDashboard();
}

/* compute measures per course */
function computeMeasuresForCourse(course){
  // quizzes
  const quizzes = course.items.filter(i=>i.type==='Quiz').map(q=>parseFloat(q.val||0));
  let sumTopQuizzes = 0;
  if(quizzes.length<=1) sumTopQuizzes = quizzes.reduce((s,x)=>s+x,0);
  else {
    const sorted = quizzes.slice().sort((a,b)=>b-a);
    const take = sorted.slice(0, quizzes.length - 1); // drop lowest one
    sumTopQuizzes = take.reduce((s,x)=>s+x,0);
  }
  // midterm/report/activity
  const mids = course.items.filter(i=>i.type==='Midterm' || i.type==='Report' || i.type==='Activity').map(it=>parseFloat(it.val||0));
  const sumMids = mids.reduce((s,x)=>s+x,0);
  // final
  const finalItems = course.items.filter(i=>i.type==='Final');
  const sumFinal = finalItems.reduce((s,x)=>s+parseFloat(x.val||0),0);

  // maxima used
  const quizzesMax = course.items.filter(i=>i.type==='Quiz').map(q=>q.max).reduce((s,x)=>s+x,0);
  // but for percent we must use totals that are actually counted: if drop one, subtract its max too
  let quizzesCountedMax = 0;
  const quizMaxArr = course.items.filter(i=>i.type==='Quiz').map(q=>q.max);
  if(quizMaxArr.length<=1) quizzesCountedMax = quizMaxArr.reduce((s,x)=>s+x,0);
  else {
    // drop the smallest max? usually all same, so subtract one
    quizMaxArr.sort((a,b)=>b-a);
    const used = quizMaxArr.slice(0, quizMaxArr.length - 1);
    quizzesCountedMax = used.reduce((s,x)=>s+x,0);
  }

  const midMax = course.items.filter(i=>i.type==='Midterm').map(q=>q.max).reduce((s,x)=>s+x,0);
  const repMax = course.items.filter(i=>i.type==='Report').map(q=>q.max).reduce((s,x)=>s+x,0);
  const actMax = course.items.filter(i=>i.type==='Activity').map(q=>q.max).reduce((s,x)=>s+x,0);
  const finalMax = course.items.filter(i=>i.type==='Final').map(q=>q.max).reduce((s,x)=>s+x,0);

  const termWorkValue = sumTopQuizzes + sumMids;
  const termMax = quizzesCountedMax + midMax + repMax + actMax;
  const totalObtained = termWorkValue + sumFinal;
  const totalMax = termMax + finalMax;
  const percent = totalMax>0 ? (totalObtained / totalMax) * 100 : 0;
  const termPercent = termMax>0 ? (termWorkValue / termMax) * 100 : 0;
  return { sumTopQuizzes, termWorkValue, totalObtained, totalMax, percent, termPercent };
}

/* compute average term percent */
function computeAverageTermPercent(){
  const arr = state.courses.map(c=> computeMeasuresForCourse(c).termPercent );
  const sum = arr.reduce((s,x)=>s+x,0);
  return arr.length? sum/arr.length : 0;
}

/* compute A+ */
function computeAPlus(){
  let minGap=Infinity, bestCourse=null;
  state.courses.forEach(c=>{
    const p = computeMeasuresForCourse(c).percent;
    const gap = Math.max(0, state.aPlusThreshold - p);
    if(gap < minGap){ minGap = gap; bestCourse = c; }
  });
  return {minGap, bestCourse};
}

/* generate palette */
function generateColors(n){
  const palette = ['#4a7ec6','#6a4f6f','#caa32b','#7f3fb7','#3fb76e','#ffb86b','#4fb0b0','#8b5cf6'];
  const out=[];
  for(let i=0;i<n;i++) out.push(palette[i%palette.length]);
  return out;
}

/* actions: export/import/clear */
function attachActions(){
  document.getElementById('btnMyGrade').onclick = ()=> {
    activeCourseId = null;
    courseSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
  };
  document.getElementById('exportBtn').onclick = ()=> {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'grades_backup.json'; a.click();
    URL.revokeObjectURL(url);
  };
  document.getElementById('importBtn').onclick = ()=> {
    document.getElementById('importFile').click();
  };
  document.getElementById('importFile').onchange = (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const fr = new FileReader();
    fr.onload = ()=> {
      try{
        const data = JSON.parse(fr.result);
        state = data;
        saveState();
        renderSidebar();
        renderDashboard();
        alert('تم استيراد البيانات');
      }catch(err){ alert('خطأ في الملف'); }
    };
    fr.readAsText(file);
  };
  document.getElementById('clearBtn').onclick = ()=> {
    if(confirm('تأكيد مسح البيانات المحلية؟')) {
      localStorage.removeItem(STORAGE_KEY);
      state = JSON.parse(JSON.stringify(DEFAULT));
      renderSidebar();
      renderDashboard();
      alert('تم مسح البيانات المحلية');
    }
  };
}

/* initial render */
renderDashboard()
// -------- Load & Save ---------

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try { return JSON.parse(saved); }
        catch { return DEFAULT; }
    }
    return DEFAULT;
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let DATA = loadData();


// --------- Build Left Menu ---------

function buildMenu() {
    const list = document.getElementById("courseList");
    list.innerHTML = "";
    DATA.courses.forEach(c => {
        const li = document.createElement("li");
        li.textContent = c.name;
        li.onclick = () => showCourse(c.id);
        list.appendChild(li);
    });
}

buildMenu();


// -------- Show Course Table ---------

function showCourse(id) {
    const container = document.getElementById("courseDetails");
    container.innerHTML = "";

    const course = DATA.courses.find(c => c.id === id);
    if (!course) return;

    const title = document.createElement("h2");
    title.textContent = course.name;
    container.appendChild(title);

    const table = document.createElement("table");
    table.className = "gradeTable";

    table.innerHTML = `
        <tr>
            <th>Type</th><th>Name</th><th>Required</th><th>Obtained</th>
        </tr>
    `;

    course.items.forEach((it, index) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${it.type}</td>
            <td>${it.name}</td>
            <td>${it.max}</td>
            <td><input type="number" value="${it.val}" data-c="${course.id}" data-i="${index}"></td>
        `;

        table.appendChild(row);
    });

    container.appendChild(table);

    container.style.display = "block";

    setupInputs();
}


// ------- Save data on edit ---------

function setupInputs() {
    document.querySelectorAll("input[data-c]").forEach(inp => {
        inp.oninput = () => {
            let c = inp.dataset.c;
            let i = inp.dataset.i;
            let course = DATA.courses.find(x => x.id === c);
            course.items[i].val = Number(inp.value);
            saveData(DATA);
            updateMyGrade();
        };
    });
}


// -------- Calculations --------

function calcCourse(course) {
    let totalMax = 0, totalVal = 0;

    const quizes = course.items.filter(i => i.type === "Quiz");
    const others = course.items.filter(i => i.type !== "Quiz");

    // اختيار أفضل الكويزات و حذف الأسوأ
    if (quizes.length > 1) {
        const sorted = [...quizes].sort((a,b)=>b.val-a.val);
        const keep = sorted.slice(0, quizes.length - 1);
        keep.forEach(k => { totalMax += k.max; totalVal += k.val; });
    } else if (quizes.length === 1) {
        totalMax += quizes[0].max;
        totalVal += quizes[0].val;
    }

    others.forEach(it => {
        totalMax += it.max;
        totalVal += it.val;
    });

    return { totalMax, totalVal };
}


// --------- Update My Grade ----------

function updateMyGrade() {
    const box = document.getElementById("myGradeBox");
    box.innerHTML = "";

    DATA.courses.forEach(c => {
        const r = calcCourse(c);

        const div = document.createElement("div");
        div.className = "gradeCard";
        div.innerHTML = `
            <h3>${c.name}</h3>
            <p>${r.totalVal} / ${r.totalMax}</p>
        `;

        box.appendChild(div);
    });
}

updateMyGrade();


// ------ Buttons (Export / Import) ---------

document.getElementById("exportBtn").onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(DATA));
    alert("Copied!");
};

document.getElementById("importBtn").onclick = () => {
    const txt = prompt("Paste data:");
    if (txt) {
        DATA = JSON.parse(txt);
        saveData(DATA);
        buildMenu();
        updateMyGrade();
    }
};

document.getElementById("resetBtn").onclick = () => {
    if (confirm("Delete all data?")) {
        DATA = DEFAULT;
        saveData(DATA);
        buildMenu();
        updateMyGrade();
    }
};
