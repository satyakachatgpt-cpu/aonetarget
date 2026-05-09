import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TestRowProps {
  test: any;
  index: number;
  totalTests: number;
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
  onView: (test: any) => void;
  onEdit: (test: any) => void;
  onDuplicate: (test: any) => void;
  onPublish: (id: string) => void;
  onToggleStatus: (test: any) => void;
  onDelete: (id: string) => void;
  isSortingDisabled?: boolean;
}

const TestRow: React.FC<TestRowProps> = ({
  test,
  index,
  totalTests,
  activeMenu,
  setActiveMenu,
  onView,
  onEdit,
  onDuplicate,
  onPublish,
  onToggleStatus,
  onDelete,
  isSortingDisabled = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: String(test._id),
    disabled: isSortingDisabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : (activeMenu === test.id ? 40 : undefined),
    position: (isDragging || activeMenu === test.id ? 'relative' : 'static') as any,
    opacity: isDragging ? 0.8 : 1,
  };

  const getExpiryStatus = (series: any) => {
    const mode = series.expiryMode;
    const val = series.validity;

    if (!mode || mode === 'Lifetime Access' || mode === 'lifetime') {
      return 'lifetime';
    }

    if (mode === 'End Date' && val) {
      const parts = val.split('-');
      let dateStr = val;
      if (parts.length === 3 && parts[2].length === 4) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const expiry = new Date(dateStr);
      return new Date() > expiry ? 'expired' : 'active';
    }

    if (mode === 'Validity' && val) {
      return 'months';
    }

    return 'lifetime';
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50/30 transition-colors group ${isDragging ? 'bg-blue-50 shadow-lg' : ''}`}
    >
      <td className="px-6 py-5 text-[13px] text-gray-700 font-medium">
        <div className="flex items-center gap-3">
          {!isSortingDisabled && (
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors"
              title="Drag to reorder"
              style={{ touchAction: 'none', pointerEvents: 'auto' }}
            >
              <span className="material-symbols-outlined text-[18px] text-gray-300 group-hover:text-gray-400">
                drag_indicator
              </span>
            </div>
          )}
          {test.id
            ? String(test.id).length > 8
              ? index + 1
              : String(test.id).replace("test_", "")
            : index + 1}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="w-[84px] h-[48px] bg-white rounded-md overflow-hidden border border-gray-100 flex items-center justify-center p-0.5 group-hover:border-gray-200 transition-all">
          {test.logo || test.image ? (
            <img
              src={test.logo || test.image}
              alt="Logo"
              className="w-full h-full object-cover rounded-[3px]"
            />
          ) : (
            <div className="bg-gray-50 w-full h-full flex items-center justify-center rounded-[3px]">
              <span className="material-symbols-outlined text-gray-200 text-[20px]">
                image
              </span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-5 text-[14px] font-medium text-[#1a202c]">
        <button
          onClick={() => onView(test)}
          className="hover:text-blue-600 transition-all text-left leading-snug flex items-center gap-2"
        >
          {test.name || test.title}
          {(test.isSeries || test.isExpired || (test.closeDate && new Date() > new Date(test.closeDate))) && (
            (() => {
              const isTestActuallyExpired = test.isExpired || (test.closeDate && new Date() > new Date(test.closeDate));
              const status = test.isSeries ? getExpiryStatus(test) : (isTestActuallyExpired ? 'expired' : 'active');
              switch (status) {
                case 'expired':
                  return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold border border-red-100 uppercase tracking-tighter">Expired</span>;
                case 'active':
                  // Only show 'Active' for series to avoid cluttering individual tests
                  return test.isSeries ? <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold border border-green-100 uppercase tracking-tighter">Active</span> : null;
                case 'lifetime':
                  return <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-100 uppercase tracking-tighter">Lifetime</span>;
                case 'months':
                  return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 uppercase tracking-tighter">{test.validity} Months</span>;
                default:
                  return null;
              }
            })()
          )}
        </button>
      </td>
      <td className="px-6 py-5 font-medium text-gray-700 text-[14px]">
        ₹{test.price || "0"}
      </td>
      <td className="px-6 py-5">
        <div className="bg-[#eff1f3] rounded-3xl h-6 px-4 inline-flex items-center justify-center min-w-[80px]">
          <span className="text-[12px] font-medium text-gray-600">
            {index + 1}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-center">
        <div className="relative inline-block action-menu-container">
          <button
            onClick={() => setActiveMenu(activeMenu === test.id ? null : test.id)}
            className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeMenu === test.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
          >
            Actions
            <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeMenu === test.id ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
              expand_more
            </span>
          </button>

          {activeMenu === test.id && (
            <div className={`absolute right-0 ${index === 0 ? "top-full mt-2 origin-top-right" : (totalTests > 3 && index >= totalTests - 3) ? "bottom-full mb-2 origin-bottom-right" : "top-full mt-2 origin-top-right"} w-[180px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[9999] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
              {[
                { id: "view", label: "View Tests", icon: "folder_open", onClick: () => { onView(test); setActiveMenu(null); } },
                { id: "edit", label: "Edit", icon: "edit", onClick: () => { onEdit(test); setActiveMenu(null); } },
                { id: "duplicate", label: "Duplicate", icon: "content_copy", onClick: () => { onDuplicate(test); setActiveMenu(null); } },
                { id: "publish", label: "Publish Changes", icon: "sync", onClick: () => { onPublish(test.id || (test as any)._id); setActiveMenu(null); } },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => item.onClick()}
                  className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                >
                  <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-black">
                    {item.icon}
                  </span>
                  <span className="text-[13px] font-bold text-gray-600 group-hover:text-black">
                    {item.label}
                  </span>
                </button>
              ))}

              <div className="w-full flex items-center justify-between px-5 py-2 hover:bg-gray-50 transition-all group">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-gray-400 group-hover:text-black">
                    check_circle
                  </span>
                  <span className="text-[13px] font-bold text-gray-600 group-hover:text-black">
                    Enabled
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleStatus(test); }}
                  className={`w-8 h-4.5 rounded-full relative transition-all duration-300 ${test.status === "active" ? "bg-black" : "bg-gray-200"}`}
                >
                  <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 ${test.status === "active" ? "left-4" : "left-0.5"}`} />
                </button>
              </div>

              <div className="h-[1px] bg-gray-50 my-1 mx-2"></div>

              <button
                onClick={() => { onDelete(test.id || (test as any)._id); setActiveMenu(null); }}
                className="w-full px-5 py-2 flex items-center gap-3 hover:bg-red-50 transition-colors group text-left"
              >
                <span className="material-symbols-outlined text-[20px] text-red-500">
                  delete
                </span>
                <span className="text-[13px] font-bold text-red-600">
                  Delete
                </span>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

export default React.memo(TestRow);
