import { useState } from 'react';
import { Video, Note, Test, Question, VideoForm, NoteForm, TestForm, QuestionForm } from '../CourseContent.types';
import { initialVideoForm, initialNoteForm, initialTestForm, initialQuestionForm } from '../CourseContent.formUtils';

export const useCourseContentUIState = () => {
  // Modal Visibility
  const [showYoutubeZoomModal, setShowYoutubeZoomModal] = useState(false);
  const [showLiveStreamModal, setShowLiveStreamModal] = useState(false);
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [showYoutubeZoomSEO, setShowYoutubeZoomSEO] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showOMRDrawer, setShowOMRDrawer] = useState(false);
  const [showSubjectiveTestDrawer, setShowSubjectiveTestDrawer] = useState(false);
  
  // Drawers
  const [showTestDrawer, setShowTestDrawer] = useState(false);
  const [showQuizDrawer, setShowQuizDrawer] = useState(false);
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);
  const [showLinkDrawer, setShowLinkDrawer] = useState(false);
  const [showImageDrawer, setShowImageDrawer] = useState(false);
  
  // Toggles
  const [showSubjectiveDropdown, setShowSubjectiveDropdown] = useState(false);
  const [showCourseEditModal, setShowCourseEditModal] = useState(false);

  // Editing Pointers
  const [editingYoutubeZoom, setEditingYoutubeZoom] = useState<any | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [currentTestForQuestions, setCurrentTestForQuestions] = useState<Test | null>(null);
  const [selectedImportItems, setSelectedImportItems] = useState<string[]>([]);
  
  // Standard Forms
  const [videoForm, setVideoForm] = useState<VideoForm>(initialVideoForm);
  const [noteForm, setNoteForm] = useState<NoteForm>(initialNoteForm);
  const [testForm, setTestForm] = useState<TestForm>(initialTestForm);
  const [questionForm, setQuestionForm] = useState<QuestionForm>(initialQuestionForm);

  // Standard Resetters
  const resetVideoForm = () => {
    setVideoForm(initialVideoForm);
    setEditingVideo(null);
  };
  const resetNoteForm = () => {
    setNoteForm(initialNoteForm);
    setEditingNote(null);
  };
  const resetTestForm = () => {
    setTestForm(initialTestForm);
    setEditingTest(null);
  };
  const resetQuestionForm = () => {
    setQuestionForm(initialQuestionForm);
    setEditingQuestion(null);
  };

  const modalState = {
    showYoutubeZoomModal, showLiveStreamModal, showWebinarModal, showYoutubeZoomSEO,
    showImportModal, showFolderModal, showVideoModal, showNoteModal, showTestModal,
    showQuestionModal, showDocumentModal, showTestDrawer, showQuizDrawer,
    showAudioDrawer, showDocumentDrawer, showLinkDrawer, showImageDrawer,
    showSubjectiveTestDrawer, showOMRDrawer
  };

  const modalSetters = {
    setShowYoutubeZoomModal, setShowLiveStreamModal, setShowWebinarModal, setShowYoutubeZoomSEO,
    setShowImportModal, setShowFolderModal, setShowVideoModal, setShowNoteModal, setShowTestModal,
    setShowQuestionModal, setShowDocumentModal, setShowTestDrawer, setShowQuizDrawer,
    setShowAudioDrawer, setShowDocumentDrawer, setShowLinkDrawer, setShowImageDrawer,
    setShowSubjectiveTestDrawer, setShowOMRDrawer,
    setShowSubjectiveDropdown, setShowCourseEditModal
  };

  const editState = {
    editingYoutubeZoom, editingVideo, editingNote, editingTest, editingFolder,
    editingQuestion, currentTestForQuestions, selectedImportItems
  };

  const editSetters = {
    setEditingYoutubeZoom, setEditingVideo, setEditingNote, setEditingTest,
    setEditingFolder, setEditingQuestion, setCurrentTestForQuestions, setSelectedImportItems
  };


  const standardForms = {
    videoForm, noteForm, testForm, questionForm
  };

  const standardFormSetters = {
    setVideoForm, setNoteForm, setTestForm, setQuestionForm
  };

  const standardFormResetters = {
    resetVideoForm, resetNoteForm, resetTestForm, resetQuestionForm
  };

  return { modalState, modalSetters, editState, editSetters, standardForms, standardFormSetters, standardFormResetters };
};
