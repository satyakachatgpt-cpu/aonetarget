import React from 'react';

interface Note {
  id: string;
  title: string;
  fileUrl: string;
  fileSize?: string;
  createdAt?: string;
  datetime?: string;
}

interface NotesTabProps {
  notes: Note[];
  isEnrolled: boolean;
  isExpired?: boolean;
  isPaidCourse: boolean | null | undefined;
  coursePrice: number | undefined;
  enrolling: boolean;
  onViewNote: (note: Note) => void;
  onEnroll: () => void;
  onBuyNow: () => void;
}

const NotesTab: React.FC<NotesTabProps> = ({
  notes,
  isEnrolled,
  isExpired,
  isPaidCourse,
  coursePrice,
  enrolling,
  onViewNote,
  onEnroll,
  onBuyNow,
}) => {
  return (
    <div className="space-y-4">
      {!isEnrolled || isExpired ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-gray-300">{isExpired ? 'lock_clock' : 'lock'}</span>
          </div>
          <h3 className="font-black text-gray-800 mb-1">{isExpired ? 'Access Expired' : 'Access Restricted'}</h3>
          <p className="text-gray-500 font-medium text-sm">{isExpired ? 'Your access to this course has expired. Please renew to continue.' : 'Enroll to access notes'}</p>
          {isPaidCourse ? (
            <button onClick={onBuyNow} className="mt-4 btn-accent px-6 py-2.5 text-sm">
              {isExpired ? 'Renew Now' : 'Buy Now'} - ₹{coursePrice}
            </button>
          ) : (
            <button 
              onClick={onEnroll} 
              disabled={enrolling || isExpired} 
              className="mt-4 btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {isExpired ? 'Expired' : (enrolling ? 'Enrolling...' : 'Enroll Free')}
            </button>
          )}
        </div>
      ) : notes.length === 0 ? (
        <div className="card-premium p-10 text-center animate-fade-in-up">
          <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-rounded text-3xl text-gray-300">description</span>
          </div>
          <p className="text-gray-400 font-medium text-sm">No notes available here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <div
              key={note.id || (note as any)._id}
              className="card-premium p-4 flex items-center gap-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-rounded text-orange-500 text-xl">description</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{note.title}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  {(note.createdAt || note.datetime) ? (
                    <>
                      <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                        <span className="material-symbols-rounded text-[10px]">calendar_today</span>
                        {new Date(note.createdAt || note.datetime || '').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                        <span className="material-symbols-rounded text-[10px]">schedule</span>
                        {new Date(note.createdAt || note.datetime || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <span className="material-symbols-rounded text-[10px]">picture_as_pdf</span>
                      PDF Document
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onViewNote(note)}
                className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 active:scale-[0.97] transition-all duration-200 hover:bg-primary-100"
              >
                <span className="material-symbols-rounded text-xl">visibility</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesTab;
