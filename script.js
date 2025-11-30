// script.js
// Save/load key
const STORAGE_KEY = 'lina_grades_v1';

// default config + initial data
const DEFAULT = {
    aPlusThreshold: 90,
    courses: [
        // ... (بيانات المقررات كما هي) ...
        {
            id: 'economy', name: 'Economy',
            items: [
                { type: 'Quiz', name: 'Quiz 1', max: 5, val: 4.25 },
                { type: 'Quiz', name: 'Quiz 2', max: 5, val: 4.5 },
                { type: 'Quiz', name: 'Quiz 3', max: 5, val: 5 },
                { type: 'Quiz', name: 'Quiz 4', max: 5, val: 0 },
                { type: 'Quiz', name: 'Quiz 5', max: 5, val: 0 },
                { type: 'Midterm', name: 'Midterm 1', max: 15, val: 14.5 },
                { type: 'Midterm', name: 'Midterm 2', max: 15, val: 14.5 },
                { type: 'Final', name: 'Final', max: 50, val: 0 }
            ]
        },
        // ... (بقية المقررات) ...
        {
            id: 'math', name: 'Math',
            items: [
                { type: 'Quiz', name: 'Quiz 1', max: 10, val: 10 },
                { type: 'Quiz', name: 'Quiz 2', max: 10, val: 10 },
                { type: 'Quiz', name: 'Quiz 3', max: 10, val: 0 },
                { type: 'Midterm', name: 'Midterm', max: 25, val: 24 },
                { type: 'Activity', name: 'Activities', max: 5, val: 5 },
                { type: 'Final', name: 'Final', max: 50, val: 0 }
            ]
        },
        {
            id: 'technology', name: 'Technology',
            items: [
                { type: 'Quiz', name: 'Quiz 1', max: 5, val: 5 },
                { type: 'Quiz', name: 'Quiz 2', max: 5, val: 3.25 },
                { type: 'Quiz', name: 'Quiz 3', max: 5, val: 0 },
                { type: 'Midterm', name: 'Midterm 1', max: 20, val: 20 },
                { type: 'Midterm', name: 'Midterm 2', max: 20, val: 0 },
                { type: 'Final', name: 'Final', max: 50, val: 0 }
            ]
        },
        {
            id: 'arba', name: 'Arba',
            items: [
                { type: 'Midterm', name: 'Midterm', max: 20, val: 19 },
                { type: 'Activity', name: 'Activities', max: 20, val: 20 },
                { type: 'Final', name: 'Final', max: 60, val: 0 }
            ]
        },
        {
            id: 'islamic', name: 'Islamic',
            items: [
                { type: 'Midterm', name: 'Midterm', max: 20, val: 18 },
                { type: 'Activity', name: 'Activities', max: 20, val: 20 },
                { type: 'Final', name: 'Final', max: 60, val: 0 }
            ]
        },
        {
            id: 'admin', name: 'Administration',
            items: [
                { type: 'Midterm', name: 'Midterm 1', max: 20, val: 18.5 },
                { type: 'Midterm', name: 'Midterm 2', max: 20, val: 0 },
                { type: 'Report', name: 'Report', max: 10, val: 0 },
                { type: 'Final', name: 'Final', max: 50, val: 0 }
            ]
        }
    ]
};

// load or init
let state = loadState();

// ** 💡 التعديل: وضع جميع عمليات الحصول على عناصر DOM والتهيئة داخل DOMContentLoaded **
document.addEventListener('DOMContentLoaded', () => {

    // DOM refs
    const coursesList = document.getElementById('coursesList');
    const dashboard = document.getElementById('dashboard');
    const courseSection = document.getElementById('courseSection');
    const courseTitle = document.getElementById('courseTitle');
    const courseTableBody = document.querySelector('#courseTable tbody');
    const backToDash = document.getElementById('backToDash');
    const calcCourse = document.getElementById('calcCourse');
    const saveCourse = document.getElementById('saveCourse');
    const btnMyGrade = document.getElementById('btnMyGrade'); // إضافة الزر
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const clearBtn = document.getElementById('clearBtn');
    const importFile = document.getElementById('importFile');
    const myGradeBox = document.getElementById('myGradeBox'); // لاستخدامه في رندر لوحة القيادة

    const termWorkValue = document.getElementById('termWorkValue');
    const aplusPercent = document.getElementById('aplusPercent');
    const aplusGap = document.getElementById('aplusGap');

    // charts
    let bestChart, compareChart;
    let currentCourseId = null; // لتتبع المقرر النشط

    /* ---------- الدوال المساعدة العامة ---------- */

    function loadState() {
        try {
            const json = localStorage.getItem(STORAGE_KEY);
            if (json) return JSON.parse(json);
        } catch (e) { }
        // clone default
        return JSON.parse(JSON.stringify(DEFAULT));
    }
    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    
    // دالة حساب مقاييس المقرر (للتصحيح)
    function computeMeasuresForCourse(course) {
        let maxTotal = 0;
        let obtainedTotal = 0;
        let termMax = 0;
        let termObtained = 0;

        course.items.forEach(item => {
            const max = parseFloat(item.max || 0);
            const val = parseFloat(item.val || 0);
            
            maxTotal += max;
            obtainedTotal += val;

            // كل شيء ما عدا Final يُعتبر Term Work
            if (item.type !== 'Final') {
                termMax += max;
                termObtained += val;
            }
        });

        const percent = (maxTotal > 0) ? (obtainedTotal / maxTotal) * 100 : 0;
        const termPercent = (termMax > 0) ? (termObtained / termMax) * 100 : 0;

        return {
            percent: parseFloat(percent.toFixed(2)),
            termPercent: parseFloat(termPercent.toFixed(2)),
            maxTotal,
            obtainedTotal,
            termMax,
            termObtained
        };
    }

    // دالة حساب متوسط نسبة أعمال الترم
    function computeAverageTermPercent() {
        let totalTermPercent = 0;
        let count = 0;
        state.courses.forEach(c => {
            const res = computeMeasuresForCourse(c);
            if (res.termMax > 0) {
                totalTermPercent += res.termPercent;
                count++;
            }
        });
        return count > 0 ? totalTermPercent / count : 0;
    }

    // دالة حساب الباقي على A+ (للتصحيح)
    function computeAPlus() {
        let minGap = Infinity; // الحد الأدنى من النقص لجميع المقررات
        state.courses.forEach(c => {
            const res = computeMeasuresForCourse(c);
            const neededPercent = state.aPlusThreshold; // 90
            const currentPercent = res.percent;
            const gap = neededPercent - currentPercent;
            if (gap > 0 && gap < minGap) {
                minGap = gap;
            }
        });
        return { minGap: (minGap === Infinity) ? 0 : minGap };
    }

    // دالة توليد ألوان Chart.js
    function generateColors(count) {
        const colors = [
            '#4bc0c0', '#ff6384', '#ff9f40', '#9966ff', '#ffcd56',
            '#c9cbcf', '#36a2eb', '#71b782', '#9c27b0', '#e91e63'
        ];
        return Array(count).fill(0).map((_, i) => colors[i % colors.length]);
    }
    
    // دالة إخفاء/إظهار الأقسام
    function showSection(sectionId) {
        dashboard.classList.add('hidden');
        courseSection.classList.add('hidden');
        
        document.getElementById(sectionId).classList.remove('hidden');
        
        // تحديث حالة الزر النشط في الشريط الجانبي
        document.querySelectorAll('.menu-item, .course-btn').forEach(btn => btn.classList.remove('active'));
        
        if(sectionId === 'dashboard') {
            btnMyGrade.classList.add('active');
        } else if (currentCourseId) {
            const activeBtn = document.querySelector(`.course-btn[data-course-id="${currentCourseId}"]`);
            if(activeBtn) activeBtn.classList.add('active');
        }
    }


    /* ---------- Sidebar & List ---------- */
    function renderSidebar() {
        coursesList.innerHTML = '';
        state.courses.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'course-btn';
            btn.setAttribute('data-course-id', c.id); // إضافة id
            btn.innerHTML = `<span style="font-weight:600">${c.name}</span>`;
            btn.onclick = () => onCourseClick(c.id);
            coursesList.appendChild(btn);
        });
    }

    /* ---------- Dashboard (charts) ---------- */
    function renderDashboard() {
        const labels = state.courses.map(c => c.name);
        // تم تبسيط منطق أفضل الكويزات ليعمل بشكل أسرع (يأخذ مجموع الكويزات التي تم إدخال درجة لها)
        const bestData = state.courses.map(c => {
            const quizzes = c.items.filter(it => it.type === 'Quiz');
            return quizzes.reduce((sum, q) => sum + (parseFloat(q.val || 0) > 0 ? parseFloat(q.val) : 0), 0);
        });

        const compareData = state.courses.map(c => {
            const res = computeMeasuresForCourse(c);
            return res.percent;
        });

        termWorkValue.innerText = computeAverageTermPercent().toFixed(1) + '%';

        const aplusInfo = computeAPlus();
        aplusPercent.innerText = (100 - aplusInfo.minGap).toFixed(1) + '%';
        aplusGap.innerText = `${aplusInfo.minGap.toFixed(1)}% نقص عن ${state.aPlusThreshold}%`;

        const apCard = document.getElementById('aplusCard');
        const apVal = 100 - aplusInfo.minGap;
        // تعديل منطق الألوان بناءً على القرب من A+
        if (apVal >= state.aPlusThreshold) apCard.style.background = 'linear-gradient(90deg,#caa32b,#e6d28a)'; // ذهبي
        else if (apVal >= state.aPlusThreshold - 6) apCard.style.background = 'linear-gradient(90deg,#ffc107,#ffd86b)'; // أصفر
        else apCard.style.background = 'linear-gradient(90deg,#3fb76e,#7fcf7f)'; // أخضر

        // إنشاء أو تحديث Chart 1: أفضل الكويزات
        if (!bestChart) {
            const ctx = document.getElementById('bestQuizzesChart').getContext('2d');
            bestChart = new Chart(ctx, {
                type: 'pie',
                data: { labels: labels, datasets: [{ data: bestData, backgroundColor: generateColors(labels.length) }] },
                options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
            });
        } else {
            bestChart.data.labels = labels;
            bestChart.data.datasets[0].data = bestData;
            bestChart.data.datasets[0].backgroundColor = generateColors(labels.length);
            bestChart.update();
        }

        // إنشاء أو تحديث Chart 2: مقارنة المقررات
        if (!compareChart) {
            const ctx2 = document.getElementById('compareChart').getContext('2d');
            compareChart = new Chart(ctx2, {
                type: 'bar',
                data: { labels: labels, datasets: [{ data: compareData, backgroundColor: generateColors(labels.length) }] },
                options: { indexAxis: 'y', responsive: true, scales: { x: { beginAtZero: true, max: 100 } } }
            });
        } else {
            compareChart.data.labels = labels;
            compareChart.data.datasets[0].data = compareData;
            compareChart.data.datasets[0].backgroundColor = generateColors(labels.length);
            compareChart.update();
        }

        showSection('dashboard');
        saveState();
    }

    /* ---------- Course Detail View ---------- */
    function renderCourse(course) {
        currentCourseId = course.id;
        courseTitle.innerText = course.name;
        courseTableBody.innerHTML = '';

        course.items.forEach((item, index) => {
            const row = courseTableBody.insertRow();
            row.innerHTML = `
                <td>${item.type}</td>
                <td>${item.name}</td>
                <td><input type="number" value="${item.max}" min="0" step="0.01" data-index="${index}" data-field="max" class="max-input" /></td>
                <td><input type="number" value="${item.val}" min="0" step="0.01" data-index="${index}" data-field="val" class="val-input" /></td>
            `;
        });
        
        calculateCourseGrades(); // عرض الحسابات الأولية
        showSection('courseSection');
    }
    
    function calculateCourseGrades() {
        const course = state.courses.find(c => c.id === currentCourseId);
        if (!course) return;

        // قراءة القيم الجديدة من الجدول قبل الحساب
        document.querySelectorAll('#courseTable tbody tr').forEach(row => {
            const index = row.querySelector('.max-input').getAttribute('data-index');
            course.items[index].max = parseFloat(row.querySelector('.max-input').value) || 0;
            course.items[index].val = parseFloat(row.querySelector('.val-input').value) || 0;
        });

        const res = computeMeasuresForCourse(course);
        document.getElementById('courseTermWork').innerText = `${res.termObtained.toFixed(2)} / ${res.termMax.toFixed(2)}`;
        document.getElementById('coursePercent').innerText = `${res.percent.toFixed(2)}%`;
        
        const aplusNote = document.getElementById('courseAPlusNote');
        if (res.percent >= state.aPlusThreshold) {
            aplusNote.innerText = `مبروك! لقد تجاوزت نسبة ${state.aPlusThreshold}% (A+) بالفعل.`;
        } else {
            const gap = state.aPlusThreshold - res.percent;
            aplusNote.innerText = `تحتاج إلى رفع النسبة بـ ${gap.toFixed(2)}% إضافية للوصول إلى A+ (${state.aPlusThreshold}%).`;
        }

        return res;
    }
    
    function saveCourseGrades() {
        if (!currentCourseId) return;
        const course = state.courses.find(c => c.id === currentCourseId);
        if (!course) return;

        // تطبيق القيم من الحساب (لضمان حفظ آخر تغييرات في الحقول)
        calculateCourseGrades(); 
        saveState();
        alert('تم حفظ الدرجات بنجاح!');
        
        // تحديث لوحة القيادة بعد الحفظ
        renderDashboard();
    }
    

    /* ---------- Events & Actions ---------- */
    function onCourseClick(id) {
        const course = state.courses.find(c => c.id === id);
        if (course) {
            renderCourse(course);
        }
    }
    
    function attachActions() {
        // العودة للداشبورد
        backToDash.addEventListener('click', renderDashboard);
        btnMyGrade.addEventListener('click', renderDashboard);

        // إجراء الحساب
        calcCourse.addEventListener('click', calculateCourseGrades);

        // حفظ بيانات المقرر
        saveCourse.addEventListener('click', saveCourseGrades);
        
        // مسح البيانات المحلية
        clearBtn.addEventListener('click', () => {
            if(confirm('هل أنت متأكد من مسح جميع بياناتك المحلية؟ لا يمكن التراجع عن هذا الإجراء.')){
                localStorage.removeItem(STORAGE_KEY);
                state = JSON.parse(JSON.stringify(DEFAULT)); // إعادة تحميل القيم الافتراضية
                renderSidebar();
                renderDashboard();
                alert('تم مسح البيانات المحلية وإعادة تعيينها للقيم الافتراضية.');
            }
        });

        // تصدير البيانات (Export)
        exportBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "my_grades_export.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        });

        // استيراد البيانات (Import)
        importBtn.addEventListener('click', () => {
            importFile.click();
        });

        importFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedState = JSON.parse(e.target.result);
                    // تحقق بسيط من أن الملف يحتوي على المفاتيح الأساسية
                    if (importedState.courses && Array.isArray(importedState.courses)) {
                        state = importedState;
                        saveState();
                        renderSidebar();
                        renderDashboard();
                        alert('تم استيراد البيانات بنجاح!');
                    } else {
                        alert('صيغة الملف المستورد غير صحيحة.');
                    }
                } catch (error) {
                    alert('حدث خطأ في قراءة أو تحليل الملف.');
                }
            };
            reader.readAsText(file);
        });

    }


    // 🚀 تهيئة واجهة المستخدم عند تحميل الصفحة
    renderSidebar();
    renderDashboard();
    attachActions();

}); // ** نهاية DOMContentLoaded **
