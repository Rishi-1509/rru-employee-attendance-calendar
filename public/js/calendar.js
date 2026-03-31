// ═══════════════════════════════════════════
// Calendar Module — Render calendar, manage leaves
// ═══════════════════════════════════════════

(function () {
    'use strict';

    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    let currentYear, currentMonth;
    let leavesData = [];
    let facultyList = [];
    let selectedDate = null;
    let totalFaculty = 0;

    // ─── Initialize ───
    function init() {
        const now = new Date();
        currentYear = now.getFullYear();
        currentMonth = now.getMonth();

        // Wait for user session to be ready
        const waitForUser = setInterval(() => {
            if (window.currentUser) {
                clearInterval(waitForUser);
                setupEventListeners();
                loadFacultyList();
                
                if (window.currentUser.role === 'admin' || window.currentUser.role === 'authority') {
                    const adminBar = document.getElementById('admin-stats-bar');
                    if (adminBar) adminBar.style.display = 'grid';
                    const profileBar = document.getElementById('user-attendance-profile');
                    if (profileBar) profileBar.style.display = 'none';
                } else if (window.currentUser.role === 'faculty') {
                    loadPersonalStats();
                }
                renderCalendar();
            }
        }, 100);

        // Fallback timeout
        setTimeout(() => clearInterval(waitForUser), 5000);
    }

    function setupEventListeners() {
        document.getElementById('prev-month-btn').addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });

        document.getElementById('next-month-btn').addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });

        document.getElementById('today-btn').addEventListener('click', () => {
            const now = new Date();
            currentYear = now.getFullYear();
            currentMonth = now.getMonth();
            renderCalendar();
        });

        // Modal events
        document.getElementById('modal-close-btn').addEventListener('click', closeModal);
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
        document.getElementById('modal-save-btn').addEventListener('click', saveLeaves);
        document.getElementById('mark-leave-modal').addEventListener('click', (e) => {
            if (e.target.id === 'mark-leave-modal') closeModal();
        });

        // Faculty search
        document.getElementById('faculty-search-input').addEventListener('input', filterFacultyList);
    }

    // ─── Load Faculty ───
    async function loadFacultyList() {
        try {
            const res = await fetch('/api/faculty', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                facultyList = data.faculty;
                totalFaculty = facultyList.length;
                document.getElementById('stat-total-faculty').textContent = totalFaculty;
            }
        } catch (err) {
            console.error('Failed to load faculty:', err);
        }
    }

    async function loadPersonalStats() {
        console.log('Fetching personal leave summary...');
        
        // Show loading state
        const els = {
            taken: document.getElementById('stat-total-taken'),
            remain: document.getElementById('stat-remaining-leaves'),
            total: document.getElementById('stat-annual-total')
        };
        
        if (els.taken) els.taken.textContent = '...';
        if (els.remain) els.remain.textContent = '...';
        if (els.total) els.total.textContent = '...';

        try {
            const res = await fetch('/api/faculty/me/summary', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                console.log('Leave summary data received:', data);
                
                const section = document.getElementById('user-attendance-profile');
                if (section) section.style.display = 'block';
                
                const initials = (window.currentUser.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2);
                if (document.getElementById('profile-avatar-large')) 
                    document.getElementById('profile-avatar-large').textContent = initials;
                if (document.getElementById('profile-name-large'))
                    document.getElementById('profile-name-large').textContent = window.currentUser.full_name;
                if (document.getElementById('profile-dept-large'))
                    document.getElementById('profile-dept-large').textContent = (window.currentUser.department || '') + ' • ' + (window.currentUser.designation || '');

                if (els.taken) els.taken.textContent = data.total_taken_this_year;
                if (els.remain) els.remain.textContent = data.remaining_leaves;
                if (els.total) els.total.textContent = data.annual_total;
            } else {
                console.warn('API returned error:', res.status);
                if (els.remain) els.remain.textContent = 'Error';
            }
        } catch (err) {
            console.error('Failed to load personal stats:', err);
            if (els.remain) els.remain.textContent = 'Error';
        }
    }

    // ─── Render Calendar ───
    async function renderCalendar() {
        // Update title
        document.getElementById('calendar-month-title').textContent =
            `${MONTHS[currentMonth]} ${currentYear}`;

        // Fetch leaves for this month
        await fetchLeaves();

        // Generate calendar days
        const container = document.getElementById('calendar-days');
        container.innerHTML = '';

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

        const today = new Date();
        const isAdmin = window.currentUser && window.currentUser.role === 'admin';

        // Build leaves lookup by date
        const leavesByDate = {};
        for (const leave of leavesData) {
            const d = leave.leave_date;
            if (!leavesByDate[d]) leavesByDate[d] = [];
            leavesByDate[d].push(leave);
        }

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const cell = createDayCell(day, true, false, false, [], isAdmin);
            container.appendChild(cell);
        }

        // Current month days
        let todayAbsent = 0;
        let totalMonthLeaves = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(currentYear, currentMonth, day);
            const isToday = (date.toDateString() === today.toDateString());
            const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
            const dayLeaves = leavesByDate[dateStr] || [];

            totalMonthLeaves += dayLeaves.length;

            if (isToday) {
                todayAbsent = dayLeaves.length;
            }

            const cell = createDayCell(day, false, isToday, isWeekend, dayLeaves, isAdmin, dateStr);
            container.appendChild(cell);
        }

        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remaining = (totalCells > 35) ? (42 - totalCells) : (35 - totalCells);
        for (let day = 1; day <= remaining; day++) {
            const cell = createDayCell(day, true, false, false, [], isAdmin);
            container.appendChild(cell);
        }

        // Update stats
        document.getElementById('stat-absent-today').textContent = todayAbsent;
        document.getElementById('stat-present-today').textContent = totalFaculty - todayAbsent;
        document.getElementById('stat-leaves-month').textContent = totalMonthLeaves;
    }

    function createDayCell(day, isOtherMonth, isToday, isWeekend, leaves, isAdmin, dateStr) {
        const cell = document.createElement('div');
        cell.className = 'calendar-day';

        if (isOtherMonth) cell.classList.add('other-month');
        if (isToday) cell.classList.add('today');
        if (isWeekend) cell.classList.add('weekend');
        if (!isOtherMonth) cell.classList.add('clickable');

        // Day number
        const numEl = document.createElement('div');
        numEl.className = 'day-number';
        numEl.textContent = day;
        cell.appendChild(numEl);

        // Leave badges
        if (leaves.length > 0 && !isOtherMonth) {
            const leavesContainer = document.createElement('div');
            leavesContainer.className = 'day-leaves';

            const maxShow = 3;
            const toShow = leaves.slice(0, maxShow);

            for (const leave of toShow) {
                const badge = document.createElement('div');
                badge.className = `leave-badge ${leave.leave_type}`;

                // Short name
                const facultyName = leave.faculty_name || 'Staff';
                const nameParts = facultyName.split(' ');
                const shortName = nameParts.length > 1
                    ? `${nameParts[0].charAt(0)}. ${nameParts[nameParts.length - 1]}`
                    : facultyName;

                badge.textContent = shortName;
                badge.title = `${leave.faculty_name} — ${leave.leave_type} leave${leave.reason ? ': ' + leave.reason : ''}`;
                leavesContainer.appendChild(badge);
            }

            if (leaves.length > maxShow) {
                const more = document.createElement('div');
                more.className = 'leave-more';
                more.textContent = `+${leaves.length - maxShow} more`;
                leavesContainer.appendChild(more);
            }

            cell.appendChild(leavesContainer);
        }

        // Click handler (for all users to view, admin can also edit)
        if (!isOtherMonth && dateStr) {
            cell.addEventListener('click', () => openModal(dateStr, leaves));
        }

        return cell;
    }

    // ─── Fetch Leaves ───
    async function fetchLeaves() {
        try {
            const mm = currentMonth + 1;
            const t = new Date().getTime(); // Cache buster
            const res = await fetch(`/api/leaves?month=${mm}&year=${currentYear}&t=${t}`, { 
                credentials: 'include',
                cache: 'no-store'
            });
            if (res.ok) {
                const data = await res.json();
                leavesData = data.leaves;
            }
        } catch (err) {
            console.error('Failed to fetch leaves:', err);
        }
    }

    // ─── Modal ───
    function openModal(dateStr, leaves) {
        selectedDate = dateStr;
        const modal = document.getElementById('mark-leave-modal');
        const isAdmin = window.currentUser && window.currentUser.role === 'admin';

        // Format date for display
        const dateObj = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('modal-date-display').textContent = dateObj.toLocaleDateString('en-IN', options);

        document.getElementById('modal-absent-count').textContent = leaves.length;
        document.getElementById('modal-present-count').textContent = totalFaculty - leaves.length;

        // Show existing leaves
        const absentList = document.getElementById('modal-absent-list');
        absentList.innerHTML = '';

        if (leaves.length === 0) {
            absentList.innerHTML = '<div class="empty-state" style="padding:16px;"><div class="empty-state-icon">✅</div><p class="empty-state-text" style="font-size:0.875rem;">No absences recorded</p></div>';
        } else {
            for (const leave of leaves) {
                const item = document.createElement('div');
                item.className = 'absent-item';

                const typeClass = getLeaveTypeColor(leave.leave_type);

                item.innerHTML = `
                    <div class="absent-item-info">
                        <div class="absent-item-name">${leave.faculty_name}</div>
                        <div class="absent-item-details">${leave.department} • ${leave.designation}${leave.reason ? ' • ' + leave.reason : ''}</div>
                    </div>
                    <span class="absent-item-type leave-badge ${leave.leave_type}">${leave.leave_type}</span>
                    ${isAdmin ? `<button class="absent-item-remove" data-leave-id="${leave.id}" data-faculty-id="${leave.faculty_id}" title="Remove">✕</button>` : ''}
                `;
                absentList.appendChild(item);
            }

            // Remove button handler
            if (isAdmin) {
                absentList.querySelectorAll('.absent-item-remove').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const leaveId = btn.dataset.leaveId;
                        await removeLeave(leaveId);
                    });
                });
            }
        }

        // Show/hide admin add section
        const addSection = document.getElementById('modal-add-section');
        const saveBtn = document.getElementById('modal-save-btn');

        if (isAdmin) {
            addSection.style.display = 'block';
            saveBtn.style.display = 'inline-flex';
            document.getElementById('modal-title').textContent = 'Manage Leave';

            // Populate faculty checklist (exclude already absent)
            const absentIds = new Set(leaves.map(l => l.faculty_id));
            renderFacultyChecklist(absentIds);
        } else {
            addSection.style.display = 'none';
            saveBtn.style.display = 'none';
            document.getElementById('modal-title').textContent = 'Attendance Details';
        }

        // Show modal
        modal.classList.add('active');
    }

    function closeModal() {
        document.getElementById('mark-leave-modal').classList.remove('active');
        selectedDate = null;
    }

    function renderFacultyChecklist(excludeIds) {
        const container = document.getElementById('faculty-checklist');
        container.innerHTML = '';

        const availableFaculty = facultyList.filter(f => !excludeIds.has(f.id));

        if (availableFaculty.length === 0) {
            container.innerHTML = '<div style="padding:12px; text-align:center; color:var(--gray-500); font-size:0.875rem;">All faculty are marked as absent for this date</div>';
            return;
        }

        for (const f of availableFaculty) {
            const item = document.createElement('label');
            item.className = 'faculty-item';
            item.dataset.name = f.full_name.toLowerCase();
            item.dataset.dept = f.department.toLowerCase();

            item.innerHTML = `
                <input type="checkbox" value="${f.id}">
                <div class="faculty-item-info">
                    <div class="faculty-item-name">${f.full_name}</div>
                    <div class="faculty-item-dept">${f.department} • ${f.designation}</div>
                </div>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', () => {
                item.classList.toggle('checked', checkbox.checked);
            });

            container.appendChild(item);
        }
    }

    function filterFacultyList() {
        const query = document.getElementById('faculty-search-input').value.toLowerCase();
        const items = document.querySelectorAll('#faculty-checklist .faculty-item');

        items.forEach(item => {
            const name = item.dataset.name;
            const dept = item.dataset.dept;
            const match = name.includes(query) || dept.includes(query);
            item.style.display = match ? 'flex' : 'none';
        });
    }

    // ─── Save New Leaves ───
    async function saveLeaves() {
        const checkedBoxes = document.querySelectorAll('#faculty-checklist input[type="checkbox"]:checked');
        const facultyIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

        if (facultyIds.length === 0) {
            window.showToast('Please select at least one faculty member.', 'error');
            return;
        }

        const leaveType = document.getElementById('modal-leave-type').value;
        const reason = document.getElementById('modal-reason').value;

        const saveBtn = document.getElementById('modal-save-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';

        try {
            const res = await fetch('/api/leaves/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    faculty_ids: facultyIds,
                    leave_date: selectedDate,
                    leave_type: leaveType,
                    reason: reason
                })
            });

            const data = await res.json();

            if (res.ok) {
                window.showToast(`${data.inserted} leave record(s) saved successfully!`, 'success');
                closeModal();
                await renderCalendar(); // Refresh
            } else {
                window.showToast(data.error || 'Failed to save leaves.', 'error');
            }
        } catch (err) {
            console.error('Save error:', err);
            window.showToast('Network error. Please try again.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }

    // ─── Remove Leave ───
    async function removeLeave(leaveId) {
        try {
            const res = await fetch(`/api/leaves/${leaveId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                window.showToast('Leave record removed.', 'success');
                closeModal();
                await renderCalendar();
            } else {
                const data = await res.json();
                window.showToast(data.error || 'Failed to remove leave.', 'error');
            }
        } catch (err) {
            console.error('Remove error:', err);
            window.showToast('Network error.', 'error');
        }
    }

    function getLeaveTypeColor(type) {
        const colors = {
            casual: '#f59e0b',
            medical: '#ef4444',
            earned: '#10b981',
            duty: '#3b82f6',
            other: '#8b5cf6'
        };
        return colors[type] || '#64748b';
    }

    // ─── Start ───
    if (document.getElementById('calendar-days')) {
        init();
    }

})();
