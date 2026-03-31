// ═══════════════════════════════════════════
// Reports Module — Attendance reports & CSV export
// ═══════════════════════════════════════════

(function () {
    'use strict';

    let reportData = null;

    function init() {
        // Wait for user session
        const waitForUser = setInterval(() => {
            if (window.currentUser) {
                clearInterval(waitForUser);

                // Only admin and authority can access reports
                if (window.currentUser.role === 'faculty') {
                    window.location.href = '/dashboard';
                    return;
                }

                setupDefaults();
                setupEventListeners();
            }
        }, 100);

        setTimeout(() => clearInterval(waitForUser), 5000);
    }

    function setupDefaults() {
        // Default: current month
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        document.getElementById('report-from').value = `${year}-${month}-01`;

        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        document.getElementById('report-to').value = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    }

    function setupEventListeners() {
        document.getElementById('generate-report-btn').addEventListener('click', generateReport);
        document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            document.getElementById('faculty-detail-panel').style.display = 'none';
        });
    }

    async function generateReport() {
        const from = document.getElementById('report-from').value;
        const to = document.getElementById('report-to').value;

        if (!from || !to) {
            window.showToast('Please select both From and To dates.', 'error');
            return;
        }

        if (from > to) {
            window.showToast('From date must be before To date.', 'error');
            return;
        }

        const btn = document.getElementById('generate-report-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';

        try {
            const res = await fetch(`/api/reports/summary?from=${from}&to=${to}`, { credentials: 'include' });

            if (res.ok) {
                const data = await res.json();
                reportData = data;
                renderReport(data);
            } else {
                const err = await res.json();
                window.showToast(err.error || 'Failed to generate report.', 'error');
            }
        } catch (err) {
            console.error('Report error:', err);
            window.showToast('Network error. Please try again.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '📊 Generate Report';
        }
    }

    function renderReport(data) {
        const { summary, working_days } = data;

        // Show stats
        document.getElementById('report-stats').style.display = 'grid';
        document.getElementById('rstat-working-days').textContent = working_days;

        const totalLeavesInPeriod = summary.reduce((acc, s) => acc + s.leaves_in_period, 0);
        document.getElementById('rstat-total-leaves').textContent = totalLeavesInPeriod;

        const avgAttendance = summary.length > 0
            ? (summary.reduce((acc, s) => acc + s.attendance_percentage, 0) / summary.length).toFixed(1)
            : '100';
        document.getElementById('rstat-avg-attendance').textContent = avgAttendance + '%';

        // Hide empty state, show table
        document.getElementById('report-empty').style.display = 'none';
        document.getElementById('report-table-container').style.display = 'block';

        // Render table
        const tbody = document.getElementById('report-table-body');
        tbody.innerHTML = '';

        summary.forEach((s, idx) => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.title = `Click to view detailed leave history for ${s.full_name}`;

            let barClass = 'attendance-high';
            if (s.attendance_percentage < 75) barClass = 'attendance-low';
            else if (s.attendance_percentage < 90) barClass = 'attendance-medium';

            row.innerHTML = `
                <td>${idx + 1}</td>
                <td style="font-weight:600; color:var(--gray-200);">${s.full_name}</td>
                <td>${s.department}</td>
                <td>${s.casual_leaves || 0}</td>
                <td>${s.medical_leaves || 0}</td>
                <td>${s.earned_leaves || 0}</td>
                <td>${s.duty_leaves || 0}</td>
                <td>${s.other_leaves || 0}</td>
                <td style="font-weight:700;">${s.leaves_in_period}</td>
                <td style="color:var(--amber-400); font-weight:700;">${s.total_taken_this_year}</td>
                <td style="color:var(--blue-400); font-weight:600;">${s.annual_total}</td>
                <td style="color:${s.remaining_leaves < 5 ? 'var(--error)' : 'var(--success)'}; font-weight:700;">${s.remaining_leaves}</td>
                <td>
                    <div class="attendance-bar">
                        <div class="attendance-bar-fill ${barClass}" style="width:${s.attendance_percentage}%"></div>
                    </div>
                    ${s.attendance_percentage}%
                </td>
            `;

            row.addEventListener('click', () => showFacultyDetail(s.id, s.full_name));
            tbody.appendChild(row);
        });
    }

    async function showFacultyDetail(facultyId, name) {
        const from = document.getElementById('report-from').value;
        const to = document.getElementById('report-to').value;

        try {
            const res = await fetch(`/api/reports/faculty/${facultyId}?from=${from}&to=${to}`, { credentials: 'include' });

            if (res.ok) {
                const data = await res.json();
                const panel = document.getElementById('faculty-detail-panel');
                panel.style.display = 'block';

                document.getElementById('detail-faculty-name').textContent =
                    `${data.faculty.full_name} — ${data.faculty.department} (${data.total} leaves)`;

                const tbody = document.getElementById('detail-table-body');
                tbody.innerHTML = '';

                if (data.leaves.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--gray-500); padding:24px;">No leave records found in this period.</td></tr>';
                } else {
                    for (const leave of data.leaves) {
                        const dateObj = new Date(leave.leave_date + 'T00:00:00');
                        const formattedDate = dateObj.toLocaleDateString('en-IN', {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                        });

                        const hasSubstitution = leave.alt_h1_name || leave.alt_h2_name || leave.alt_h3_name || leave.alt_h4_name || leave.alt_h5_name;
                        let subHtml = '—';
                        if (hasSubstitution) {
                            subHtml = `
                                <div style="display:flex; flex-direction:column; gap:2px; font-size:0.7rem;">
                                    ${leave.alt_h1_name ? `<span>H1: ${leave.alt_h1_name}</span>` : ''}
                                    ${leave.alt_h2_name ? `<span>H2: ${leave.alt_h2_name}</span>` : ''}
                                    ${leave.alt_h3_name ? `<span>H3: ${leave.alt_h3_name}</span>` : ''}
                                    ${leave.alt_h4_name ? `<span>H4: ${leave.alt_h4_name}</span>` : ''}
                                    ${leave.alt_h5_name ? `<span>H5: ${leave.alt_h5_name}</span>` : ''}
                                </div>
                            `;
                        }

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${formattedDate}</td>
                            <td><span class="leave-badge ${leave.leave_type}">${leave.leave_type}</span></td>
                            <td>${leave.reason || '—'}</td>
                            <td>${subHtml}</td>
                            <td>${leave.marked_by_name}</td>
                        `;
                        tbody.appendChild(row);
                    }
                }

                // Scroll to panel
                panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err) {
            console.error('Faculty detail error:', err);
            window.showToast('Failed to load faculty details.', 'error');
        }
    }

    function exportCSV() {
        if (!reportData || !reportData.summary) {
            window.showToast('Generate a report first before exporting.', 'error');
            return;
        }

        const { summary, from, to, working_days } = reportData;

        let csv = '#,Faculty Name,Department,Designation,Casual,Medical,Earned,Duty,Other,Taken (Period),Taken (Year),Annual Allotted,Remaining,Present Days,Attendance %\n';

        summary.forEach((s, idx) => {
            csv += `${idx + 1},"${s.full_name}","${s.department}","${s.designation}",`;
            csv += `${s.casual_leaves},${s.medical_leaves},${s.earned_leaves},${s.duty_leaves},${s.other_leaves},`;
            csv += `${s.leaves_in_period},${s.total_taken_this_year},${s.annual_total},${s.remaining_leaves},${s.present_days},${s.attendance_percentage}\n`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_report_${from}_to_${to}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        window.showToast('CSV report downloaded!', 'success');
    }

    // ─── Start ───
    if (document.getElementById('generate-report-btn')) {
        init();
    }

})();
