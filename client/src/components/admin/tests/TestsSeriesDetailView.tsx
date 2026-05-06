import React from 'react';
import TestSeriesDetailHeader from './TestSeriesDetailHeader';
import TestSeriesDetailTabs from './TestSeriesDetailTabs';
import TestSeriesDetailList from './TestSeriesDetailList';
import TestSeriesUsersTab from './TestSeriesUsersTab';

interface Props {
  viewingTestSeries: any;
  viewingQuestionEditor: any;
  detailSearchQuery: string;
  setDetailSearchQuery: (val: string) => void;
  detailFilterOpen: boolean;
  setDetailFilterOpen: (val: boolean) => void;
  detailFilters: any;
  setDetailFilters: (val: any) => void;
  showAddMenu: boolean;
  setShowAddMenu: (val: boolean) => void;
  handleSetViewingTestSeries: (val: any) => void;
  setEditingTest: (val: any) => void;
  setShowAddSingleTestDrawer: (val: boolean) => void;
  setShowAddTestPDFDrawer: (val: boolean) => void;
  setShowSubjectiveTestDrawer: (val: boolean) => void;
  detailSubTabs: readonly string[];
  viewingTestSeriesTab: string;
  setViewingTestSeriesTab: (val: any) => void;
  detailTests: any[];
  activeActionMenuId: string | number | null;
  setActiveActionMenuId: (val: string | number | null) => void;
  setViewingQuestionEditor: (val: any) => void;
  navigate: (path: string) => void;
  handleViewResults: (test: any) => void;
  handleDuplicateTest: (test: any, series: any, setter: any) => void;
  handlePublish: (id: string | number, series: any, setter: any) => void;
  handleExportPDF: (test: any, withSol: boolean) => void;
  setViewingReevaluateTest: (test: any) => void;
  onDelete: (id: string) => void | Promise<void>;
  toggleStatus: (test: any) => void;
  onReorderInner: (event: any) => void;
  isSortingDisabled?: boolean;
  expandedDropdownItem: string | null;
  setExpandedDropdownItem: (val: string | null) => void;
  seriesUsers: any[];
  loadingUsers: boolean;
}

const TestsSeriesDetailView: React.FC<Props> = ({
  viewingTestSeries,
  viewingQuestionEditor,
  detailSearchQuery,
  setDetailSearchQuery,
  detailFilterOpen,
  setDetailFilterOpen,
  detailFilters,
  setDetailFilters,
  showAddMenu,
  setShowAddMenu,
  handleSetViewingTestSeries,
  setEditingTest,
  setShowAddSingleTestDrawer,
  setShowAddTestPDFDrawer,
  setShowSubjectiveTestDrawer,
  detailSubTabs,
  viewingTestSeriesTab,
  setViewingTestSeriesTab,
  detailTests,
  activeActionMenuId,
  setActiveActionMenuId,
  setViewingQuestionEditor,
  navigate,
  handleViewResults,
  handleDuplicateTest,
  handlePublish,
  handleExportPDF,
  setViewingReevaluateTest,
  onDelete,
  toggleStatus,
  onReorderInner,
  isSortingDisabled,
  expandedDropdownItem,
  setExpandedDropdownItem,
  seriesUsers,
  loadingUsers,
}) => {
  if (!viewingTestSeries && !viewingQuestionEditor) return null;

  // Question Editor View is handled in a separate component, 
  // but if we are here and viewingQuestionEditor is true, it means we didn't use the separate component yet.
  // However, according to the plan, we will call TestsQuestionEditorView before this one.

  return (
    <div className="flex flex-col h-full bg-[#fafafa] animate-in fade-in duration-500 min-h-screen">
      {/* Detail Header */}
      <TestSeriesDetailHeader
        title={
          viewingTestSeries?.name ||
          viewingTestSeries?.title ||
          (typeof viewingTestSeries === "string"
            ? viewingTestSeries
            : "Test Series Detail")
        }
        searchQuery={detailSearchQuery}
        setSearchQuery={setDetailSearchQuery}
        isFilterOpen={detailFilterOpen}
        setIsFilterOpen={setDetailFilterOpen}
        filters={detailFilters}
        setFilters={setDetailFilters}
        isAddMenuOpen={showAddMenu}
        setIsAddMenuOpen={setShowAddMenu}
        onBack={() => handleSetViewingTestSeries(null)}
        onAddCreate={() => { setEditingTest(null); setShowAddSingleTestDrawer(true); }}
        onAddPDF={() => setShowAddTestPDFDrawer(true)}
        onAddSubjective={() => setShowSubjectiveTestDrawer(true)}
      />

      {/* Detail Tabs */}
      <TestSeriesDetailTabs
        tabs={detailSubTabs as any}
        activeTab={viewingTestSeriesTab}
        setActiveTab={(tab) => setViewingTestSeriesTab(tab)}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {viewingTestSeriesTab === "Tests" && (
          <div className="p-0">
            <TestSeriesDetailList
              tests={detailTests}
              seriesId={viewingTestSeries?.id || viewingTestSeries?._id}
              activeActionMenuId={activeActionMenuId}
              setActiveActionMenuId={setActiveActionMenuId}
              onViewQuestionEditor={(test) => {
                setViewingQuestionEditor(test);
                navigate(`/admin/tests/${test.id || (test as any)._id}/review`);
              }}
              onEditTest={(test) => {
                setEditingTest(test);
                setShowAddSingleTestDrawer(true);
                navigate(`/admin/tests/${test.id || (test as any)._id}/edit`);
              }}
              onViewResults={(test) => {
                handleViewResults(test);
                navigate(`/admin/tests/${test.id || (test as any)._id}/results`);
              }}
              onDuplicateTest={(test) => handleDuplicateTest(test, viewingTestSeries, (val: any) => {})} // Setter is handled in parent
              onPublish={(id) => handlePublish(id, viewingTestSeries, (val: any) => {})} // Setter is handled in parent
              onReviewQuestions={(test) => {
                setViewingQuestionEditor(test);
                navigate(`/admin/tests/${test.id || (test as any)._id}/review`);
              }}
              onExportPDF={(test, withSol) => handleExportPDF(test, withSol)}
              onReevaluate={(test) => setViewingReevaluateTest(test)}
              onDelete={(id) => {
                onDelete(id);
              }}
              onToggleStatus={(test) => toggleStatus(test)}
              onReorder={onReorderInner}
              expandedDropdownItem={expandedDropdownItem}
              setExpandedDropdownItem={setExpandedDropdownItem}
              isSortingDisabled={isSortingDisabled || detailSearchQuery !== "" || detailFilterOpen}
            />
          </div>
        )}

        {viewingTestSeriesTab === "Users" && (
          <TestSeriesUsersTab
            users={seriesUsers}
            loading={loadingUsers}
            activeActionMenuId={activeActionMenuId}
            setActiveActionMenuId={setActiveActionMenuId}
            onView={() => {}}
            onRemove={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default TestsSeriesDetailView;
