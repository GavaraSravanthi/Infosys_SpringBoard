import React, { useState, useEffect } from 'react';
import { performanceApi } from '../../api/performance';
import { employeesApi } from '../../api/employees';
import { useAuth } from '../../context/AuthContext';
import type { PerformanceReview, Employee } from '../../types/api';
import {
  Plus,
  CheckCircle2,
  X,
  Users,
  Award,
  TrendingUp,
  MessageSquare,
  Search,
  Briefcase,
} from 'lucide-react';

export const PerformancePage: React.FC = () => {
  const { role } = useAuth();

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'Pending' | 'Draft'>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // New review modal
  const [showModal, setShowModal] = useState(false);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [targetEmpId, setTargetEmpId] = useState('');
  const [period, setPeriod] = useState('Q3 2026');
  const [score, setScore] = useState<number>(4.5);
  const [goalsRating, setGoalsRating] = useState<number>(4.0);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [comments, setComments] = useState('');

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      if (role === 'EMPLOYEE') {
        const data = await performanceApi.getMyPerformance();
        setReviews(data || []);
      } else if (role === 'MANAGER') {
        const data = await performanceApi.getTeamPerformance();
        setReviews(data || []);

        const emps = await employeesApi.getEmployees({ page_size: 100 });
        setEmployeesList(emps.items || []);
      } else {
        const res = await performanceApi.listReviews({
          page_size: 100,
        });
        setReviews(res.items || []);

        const emps = await employeesApi.getEmployees({ page_size: 100 });
        setEmployeesList(emps.items || []);
      }
    } catch (err: any) {
      console.error('Failed to load performance reviews:', err);
      setError('Unable to load performance evaluation records from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleOpenModal = (preselectEmpId?: string) => {
    if (preselectEmpId && preselectEmpId !== 'ALL') {
      setTargetEmpId(preselectEmpId);
    } else if (selectedMemberId !== 'ALL') {
      setTargetEmpId(selectedMemberId);
    } else if (employeesList.length > 0) {
      setTargetEmpId(employeesList[0].employee_id);
    }
    setShowModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmpId) return;
    setSubmitting(true);
    setNotification(null);

    try {
      await performanceApi.submitReview({
        employee_id: targetEmpId,
        period,
        review_period: period,
        overall_score: Number(score),
        goals_rating: Number(goalsRating),
        strengths,
        areas_for_improvement: improvements,
        comments,
      });
      setNotification('Performance review recorded successfully!');
      setShowModal(false);
      // Reset fields
      setStrengths('');
      setImprovements('');
      setComments('');
      fetchReviews();
    } catch (err: any) {
      console.error('Review submission error:', err);
      const detail = err.response?.data?.detail;
      const errorMsg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
          ? detail.map((d: any) => d.msg || d).join(', ')
          : 'Review submission failed.';
      alert(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesMember =
      selectedMemberId === 'ALL' || r.employee_id === selectedMemberId;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (r.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch =
      !search ||
      r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase()) ||
      (r.designation && r.designation.toLowerCase().includes(search.toLowerCase())) ||
      (r.strengths && r.strengths.toLowerCase().includes(search.toLowerCase())) ||
      (r.areas_for_improvement && r.areas_for_improvement.toLowerCase().includes(search.toLowerCase()));

    return matchesMember && matchesStatus && matchesSearch;
  });

  // Calculate qualitative rating badge
  const getRatingBadge = (scoreVal: number) => {
    if (scoreVal >= 4.5) {
      return {
        label: 'Exceptional',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (scoreVal >= 4.0) {
      return {
        label: 'Exceeds Expectations',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }
    if (scoreVal >= 3.5) {
      return {
        label: 'Meets Expectations',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    }
    if (scoreVal >= 3.0) {
      return {
        label: 'Developing',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      label: 'Needs Attention',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  };

  // Find selected employee object if specific member is filtered
  const selectedEmp = employeesList.find((e) => e.employee_id === selectedMemberId);
  const selectedRev = reviews.find((r) => r.employee_id === selectedMemberId);
  const selectedMemberName = selectedEmp?.full_name || selectedRev?.employee_name || '';
  const selectedMemberDesig =
    selectedEmp?.designation ||
    selectedRev?.designation ||
    selectedEmp?.department ||
    selectedRev?.department ||
    '';

  return (
    <div className="space-y-6">
      {/* Header with globally recognized "New Performance Review" button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#172033]">
            Performance Reviews
          </h2>
          <p className="text-xs text-[#64748B] mt-1 font-medium">
            {role === 'EMPLOYEE'
              ? 'Your quarterly performance evaluations, goal milestones, and manager feedback'
              : 'Conduct structured performance reviews, evaluate competency milestones, and track ratings'}
          </p>
        </div>

        {role !== 'EMPLOYEE' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-[#1D4ED8] transition-all shadow-sm shadow-blue-500/20 cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Performance Review</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-[#DC2626]">
          <span>{error}</span>
          <button
            onClick={fetchReviews}
            className="px-3 py-1 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-[#1D4ED8] cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#16A34A]" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="cursor-pointer text-[#64748B] hover:text-[#172033]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar with Team Member Selector */}
      {role !== 'EMPLOYEE' && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['ALL', 'Completed', 'Pending', 'Draft'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Reviews' : st}
                </button>
              ))}
            </div>

            {/* Member Selector & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Particular Member Dropdown Selector */}
              <div className="relative min-w-56">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8FAFC] text-[#172033] font-medium outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all cursor-pointer"
                >
                  <option value="ALL">All Team Members ({employeesList.length || reviews.length})</option>
                  {employeesList.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.full_name} ({emp.designation || emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Keyword Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none w-full sm:w-56 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                />
              </div>
            </div>
          </div>

          {/* Active Filter Pill / Member Spotlight */}
          {selectedMemberName && (
            <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[11px] font-bold">
                  {selectedMemberName[0] || 'E'}
                </div>
                <span className="text-xs font-semibold text-[#172033]">
                  Showing reviews for: <strong className="text-[#2563EB]">{selectedMemberName}</strong>
                  {selectedMemberDesig && (
                    <span className="text-[#64748B] font-normal"> ({selectedMemberDesig})</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setSelectedMemberId('ALL')}
                className="text-[11px] text-[#64748B] hover:text-[#DC2626] font-medium transition-colors cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reviews Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 py-16 text-center text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-2xl">
            Loading performance evaluations...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-2xl space-y-2">
            <Users className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="font-semibold text-sm text-[#172033]">No performance reviews found</p>
            <p className="max-w-sm mx-auto text-[#64748B]">
              {selectedMemberId !== 'ALL'
                ? 'No review recorded yet for this team member. Click below to add one.'
                : 'Try adjusting your search criteria or record a new performance review.'}
            </p>
            {role !== 'EMPLOYEE' && (
              <button
                onClick={() => handleOpenModal(selectedMemberId !== 'ALL' ? selectedMemberId : undefined)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg hover:bg-[#1D4ED8] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Review</span>
              </button>
            )}
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const badge = getRatingBadge(rev.overall_score || 4.0);
            return (
              <div
                key={rev.review_id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div>
                  {/* Top Employee Profile Header */}
                  <div className="flex items-start justify-between pb-3.5 border-b border-[#E2E8F0] mb-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#4F46E5] text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0 mt-0.5">
                        {rev.employee_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || 'EM'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-[#172033]">
                            {rev.employee_name}
                          </h3>
                          <span className="text-[10px] font-mono font-bold uppercase text-[#2563EB] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                            {rev.period || 'Q3 2026'}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                          <Briefcase className="w-3 h-3 text-[#94A3B8]" />
                          <span className="font-medium text-[#475569]">{rev.designation || 'Software Engineer'}</span>
                          <span>&bull;</span>
                          <span>{rev.department}</span>
                        </p>
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl font-extrabold text-[#2563EB] leading-none">
                          {rev.overall_score?.toFixed(1)}
                        </span>
                        <span className="text-xs text-[#64748B] font-medium">/ 5.0</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Rating Alignment Bar */}
                  <div className="space-y-3 text-xs mb-3.5">
                    <div>
                      <div className="flex justify-between text-[#64748B] mb-1 font-medium">
                        <span>Goals Milestone Alignment:</span>
                        <strong className="text-[#172033]">{rev.goals_rating?.toFixed(1) || '4.0'} / 5.0</strong>
                      </div>
                      <div className="w-full bg-[#F1F5F9] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#2563EB] to-[#4F46E5] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((rev.goals_rating || 4.0) / 5.0) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Distinct Key Strengths & Accomplishments */}
                    {rev.strengths && (
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Award className="w-3.5 h-3.5 text-[#16A34A]" />
                          <span className="font-bold text-[#16A34A] text-[11px] uppercase tracking-wider">
                            Key Strengths &amp; Accomplishments
                          </span>
                        </div>
                        <p className="text-[#172033] text-xs leading-relaxed font-normal">
                          {rev.strengths}
                        </p>
                      </div>
                    )}

                    {/* Distinct Growth Areas */}
                    {rev.areas_for_improvement && (
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-[#D97706]" />
                          <span className="font-bold text-[#D97706] text-[11px] uppercase tracking-wider">
                            Areas for Development &amp; Growth
                          </span>
                        </div>
                        <p className="text-[#172033] text-xs leading-relaxed font-normal">
                          {rev.areas_for_improvement}
                        </p>
                      </div>
                    )}

                    {/* Manager Comments */}
                    {rev.comments && (
                      <div className="p-2.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-[#64748B] shrink-0 mt-0.5" />
                        <p className="text-[11px] text-[#475569] italic leading-relaxed">
                          "{rev.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-2 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>
                    Review ID: <strong className="font-mono text-[#475569]">{rev.review_id}</strong> &bull; Reviewer: {rev.reviewer_name || 'Alexander Wright (Director)'}
                  </span>
                  <span className="font-bold text-[#16A34A] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase text-[10px]">
                    {rev.status || 'Completed'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Performance Review Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-base font-bold text-[#172033]">New Performance Review</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Record structured employee appraisal ratings, milestones, and development feedback
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#172033] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-[#172033]">
                  Select Team Member *
                </label>
                <select
                  required
                  value={targetEmpId}
                  onChange={(e) => setTargetEmpId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                >
                  <option value="">Choose an employee...</option>
                  {employeesList.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.full_name} ({emp.designation || emp.department}) - {emp.employee_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#172033]">Review Period *</label>
                  <input
                    type="text"
                    required
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="Q3 2026"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#172033]">Overall Score (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    required
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-[#172033]">Goals Rating (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.1}
                    required
                    value={goalsRating}
                    onChange={(e) => setGoalsRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#172033]">
                  Key Strengths &amp; Accomplishments *
                </label>
                <textarea
                  required
                  rows={2}
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="Key deliverables, technical competencies, and sprint achievements..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#172033]">
                  Areas for Development &amp; Growth *
                </label>
                <textarea
                  required
                  rows={2}
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                  placeholder="Opportunities for improvement and next quarter growth milestones..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-[#172033]">Manager Evaluation Comments</label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Summary remarks and overall managerial feedback..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-xl bg-white text-[#172033] outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl font-semibold hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#172033] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-bold hover:bg-[#1D4ED8] cursor-pointer disabled:opacity-50 shadow-sm shadow-blue-500/20"
                >
                  {submitting ? 'Recording...' : 'Record Performance Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

