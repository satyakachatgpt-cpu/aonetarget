import React from 'react';
import AddFolderDrawer from '../../AddFolderDrawer';
import AddVideoDrawer from '../../AddVideoDrawer';
import AddNoteDrawer from '../../AddNoteDrawer';
import AddTestDrawer from '../../AddTestDrawer';
import AddQuestionDrawer from '../../AddQuestionDrawer';
import { UploadDrawer } from '../../FeatureDrawers';

interface StandardContentModalsProps {
  showFolderModal: boolean;
  setShowFolderModal: (show: boolean) => void;
  handleFolderSubmit: (data: any) => void;
  uploadFolderImage: (file: File) => Promise<string>;
  editingFolder: any;
  setEditingFolder: (folder: any) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;

  showVideoModal: boolean;
  setShowVideoModal: (show: boolean) => void;
  handleVideoSubmit: (data: any) => void;
  editingVideo: any;
  setEditingVideo: (video: any) => void;

  showNoteModal: boolean;
  setShowNoteModal: (show: boolean) => void;
  handleNoteSubmit: (data: any) => void;
  uploadAPI: any;
  editingNote: any;
  setEditingNote: (note: any) => void;

  showTestModal: boolean;
  setShowTestModal: (show: boolean) => void;
  handleTestSubmit: (data: any) => void;
  editingTest: any;
  setEditingTest: (test: any) => void;
  courses: any[];

  showQuestionModal: boolean;
  setShowQuestionModal: (show: boolean) => void;
  handleQuestionSubmit: (data: any) => void;
  editingQuestion: any;
  setEditingQuestion: (question: any) => void;

  showImageDrawer: boolean;
  setShowImageDrawer: (show: boolean) => void;
  handleFilesUpload: (files: File[], type: string) => void;

  showDocumentModal: boolean;
  setShowDocumentModal: (show: boolean) => void;
}

const StandardContentModals: React.FC<StandardContentModalsProps> = ({
  showFolderModal, setShowFolderModal, handleFolderSubmit, uploadFolderImage, editingFolder, setEditingFolder, showToast,
  showVideoModal, setShowVideoModal, handleVideoSubmit, editingVideo, setEditingVideo,
  showNoteModal, setShowNoteModal, handleNoteSubmit, uploadAPI, editingNote, setEditingNote,
  showTestModal, setShowTestModal, handleTestSubmit, editingTest, setEditingTest, courses,
  showQuestionModal, setShowQuestionModal, handleQuestionSubmit, editingQuestion, setEditingQuestion,
  showImageDrawer, setShowImageDrawer, handleFilesUpload,
  showDocumentModal, setShowDocumentModal
}) => {
  return (
    <>
      {showFolderModal && (
        <AddFolderDrawer
          isOpen={showFolderModal}
          onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
          onSubmit={handleFolderSubmit}
          onUploadImage={uploadFolderImage}
          editingFolder={editingFolder}
          showToast={showToast}
        />
      )}

      {showVideoModal && (
        <AddVideoDrawer
          isOpen={showVideoModal}
          onClose={() => { setShowVideoModal(false); setEditingVideo(null); }}
          onSubmit={handleVideoSubmit}
          editingVideo={editingVideo}
        />
      )}

      <AddNoteDrawer
        isOpen={showNoteModal}
        onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
        onSubmit={handleNoteSubmit}
        onUploadFile={async (file, type) => {
          if (type === 'note' || type === 'document') {
            const data = await uploadAPI.uploadDocument(file);
            return data.url;
          } else if (type === 'audio') {
            const data = await uploadAPI.uploadVideo(file);
            return data.url;
          } else {
            const data = await uploadAPI.uploadImage(file);
            return data.url;
          }
        }}
        editingNote={editingNote}
      />

      <AddTestDrawer
        isOpen={showTestModal}
        onClose={() => { setShowTestModal(false); setEditingTest(null); }}
        onSubmit={handleTestSubmit}
        editingTest={editingTest}
        courses={courses}
        showToast={showToast}
      />

      <AddQuestionDrawer
        isOpen={showQuestionModal}
        onClose={() => { setShowQuestionModal(false); setEditingQuestion(null); }}
        onSubmit={handleQuestionSubmit}
        onUploadImage={uploadFolderImage}
        editingQuestion={editingQuestion}
      />

      <UploadDrawer
        isOpen={showImageDrawer}
        onClose={() => setShowImageDrawer(false)}
        title="Add Image(s)"
        subtitle="Upload Images"
        accept="image/*"
        onSubmit={(files) => handleFilesUpload(files, 'image')}
      />

      <UploadDrawer
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        title="Add Document(s)"
        subtitle="Upload Documents"
        accept="*"
        onSubmit={(files) => handleFilesUpload(files, 'document')}
      />
    </>
  );
};

export default StandardContentModals;
