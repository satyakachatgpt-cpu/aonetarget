import { useState, useEffect, useCallback, useMemo } from 'react';

interface Folder {
  id: string;
  _id?: string;
  title?: string;
  name?: string;
  parentId?: string | null;
  status?: string;
  order?: number;
  sortingOrder?: string;
  [key: string]: any;
}

interface UseCourseNavigationProps {
  folders: Folder[];
  normalizeId: (id: any) => string | null;
}

export const useCourseNavigation = ({
  folders,
  normalizeId
}: UseCourseNavigationProps) => {
  const [folderStack, setFolderStack] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);

  const currentFolder = useMemo(() => 
    folderStack.length > 0 ? folderStack[folderStack.length - 1] : null,
  [folderStack]);

  const currentFolderId = useMemo(() => 
    normalizeId(currentFolder?._id || currentFolder?.id),
  [currentFolder, normalizeId]);

  const handleFolderClick = useCallback((folder: Folder) => {
    setFolderStack(prev => [...prev, folder]);
  }, []);

  const handleBackClick = useCallback(() => {
    setFolderStack(prev => prev.slice(0, -1));
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      setFolderStack([]);
    } else {
      setFolderStack(prev => prev.slice(0, index + 1));
    }
  }, []);

  // Sync folderStack with fresh folder data from server
  useEffect(() => {
    if (folders.length > 0 && folderStack.length > 0) {
      const updatedStack = folderStack.map(stackFolder => {
        const freshFolder = folders.find(f =>
          (f._id && normalizeId(f._id) === normalizeId(stackFolder._id)) ||
          (f.id && normalizeId(f.id) === normalizeId(stackFolder.id))
        );
        return freshFolder || stackFolder;
      });

      const hasChanged = updatedStack.some((f, i) => f !== folderStack[i]);
      if (hasChanged) {
        setFolderStack(updatedStack);
      }
    }
  }, [folders, folderStack, normalizeId]);

  return {
    folderStack,
    setFolderStack,
    expandedFolders,
    setExpandedFolders,
    currentFolder,
    currentFolderId,
    handleFolderClick,
    handleBackClick,
    handleBreadcrumbClick
  };
};
