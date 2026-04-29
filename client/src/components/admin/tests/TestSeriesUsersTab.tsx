import React from 'react';

interface TestSeriesUsersTabProps {
  users: any[];
  loading: boolean;
  activeActionMenuId: string | number | null;
  setActiveActionMenuId: (id: string | number | null) => void;
  onView: (user: any) => void;
  onRemove: (user: any) => void;
}

const TestSeriesUsersTab: React.FC<TestSeriesUsersTabProps> = ({
  users,
  loading,
  activeActionMenuId,
  setActiveActionMenuId,
  onView,
  onRemove
}) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-[#1a202c]">
      <table className="w-full text-left border-collapse">
        <thead className="bg-[#FAFAFA]">
          <tr>
            <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
              User Details
            </th>
            <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-[#1a202c]">
              Transaction ID
            </th>
            <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
              Date & Time
            </th>
            <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-center text-[#1a202c]">
              Expiry Date
            </th>
            <th className="px-8 py-5 text-[12px] font-black text-gray-400 uppercase tracking-widest text-right text-[#1a202c]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {loading ? (
            <tr>
              <td colSpan={5} className="py-20 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-[14px] font-bold text-gray-400">Loading users...</span>
                </div>
              </td>
            </tr>
          ) : users.length > 0 ? (
            users.map((user, idx) => (
              <tr
                key={user.id || idx}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-gray-700">
                      {user.name}
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                      {user.phone}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[14px] font-mono font-medium text-gray-600">
                    {user.transactionId}
                  </span>
                </td>
                <td className="px-8 py-5 text-center text-[13px] font-medium text-gray-500 whitespace-nowrap">
                  {user.dateTime}
                </td>
                <td className="px-8 py-5 text-center text-[13px] font-medium text-gray-500 whitespace-nowrap">
                  {user.expiryDate}
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="relative inline-block action-menu-container">
                    <button
                      onClick={() => setActiveActionMenuId(activeActionMenuId === (user.id || idx) + 50000 ? null : (user.id || idx) + 50000)}
                      className={`flex items-center justify-between gap-2 px-4 h-9 border rounded-lg text-[13px] font-bold transition-all shadow-sm w-[110px] ${activeActionMenuId === (user.id || idx) + 50000 ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                    >
                      Actions
                      <span className={`material-symbols-outlined text-[18px] transition-all duration-200 ${activeActionMenuId === (user.id || idx) + 50000 ? "rotate-180 text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                        expand_more
                      </span>
                    </button>
                    {activeActionMenuId === (user.id || idx) + 50000 && (
                      <div className={`absolute right-0 top-full mt-1 w-[160px] bg-white rounded-xl shadow-2xl border border-gray-100 z-[101] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right`}>
                        {[
                          { id: "view", label: "View Details", icon: "visibility", onClick: () => { onView(user); setActiveActionMenuId(null); } },
                          { id: "remove", label: "Remove", icon: "person_remove", color: "text-red-500", onClick: () => { onRemove(user); setActiveActionMenuId(null); } },
                        ].map(item => (
                          <button
                            key={item.id}
                            onClick={() => item.onClick()}
                            className="w-full px-5 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors group text-left"
                          >
                            <span className={`material-symbols-outlined text-[20px] ${item.color || "text-gray-400 group-hover:text-black"}`}>
                              {item.icon}
                            </span>
                            <span className={`text-[13px] font-bold ${item.color || "text-gray-600 group-hover:text-black"}`}>
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="py-20 text-center text-gray-400 font-medium"
              >
                No users enrolled yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="px-8 py-4 bg-[#FAFAFA] border-t border-gray-100 flex items-center justify-between">
        <span className="text-[12px] font-bold text-gray-400 italic">
          Showing {users.length} users
        </span>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-30">
            <span className="material-symbols-outlined text-[18px]">
              chevron_left
            </span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-black text-white text-[13px] font-bold shadow-sm">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:bg-gray-50 transition-all disabled:opacity-30">
            <span className="material-symbols-outlined text-[18px]">
              chevron_right
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TestSeriesUsersTab);
