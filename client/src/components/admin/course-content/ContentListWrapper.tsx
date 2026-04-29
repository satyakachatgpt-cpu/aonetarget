import React from 'react';
import ContentItemCard from './ContentItemCard';

interface ContentListWrapperProps {
  items: any[];
  level: number;
  type?: string;
  isActiveUploadFolderId?: string | null;
  expandedFolders: string[];
  draggedItemId?: string | null;
  dragOverItemId?: string | null;
  isSearching: boolean;
  folderCounts: any;
  openContentActionMenuId: string | null;
  handlers: {
    onToggleFolder: (item: any) => void;
    onNavigate: (path: string, state?: any) => void;
    onShowToast: (msg: string, type?: string) => void;
    onDragStart: (e: any, item: any) => void;
    onDragOver: (e: any, item: any) => void;
    onDrop: (e: any, item: any) => void;
    onDragEnd: () => void;
    onSetActionMenu: (id: string | null) => void;
    onToggleStatus: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onToggleFree: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean) => void;
    onNotifyStudents: (item: any) => void;
    onStartLive: (item: any) => void;
    onEndLive: (item: any) => void;
    onEdit: (item: any, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    onDelete: (itemId: string, itemType: string, isFolder: boolean, isVideo: boolean, isNote: boolean, isTest: boolean, isLiveStream: boolean) => void;
    getCourseId: () => string | undefined;
  };
  renderChildTree?: (parentId: string, level: number) => React.ReactNode;
}

const ContentListWrapper: React.FC<ContentListWrapperProps> = ({
  items,
  level,
  type,
  isActiveUploadFolderId,
  expandedFolders,
  draggedItemId,
  dragOverItemId,
  isSearching,
  folderCounts,
  openContentActionMenuId,
  handlers,
  renderChildTree
}) => {
  const renderedItems = React.useMemo(() => {
    return items.map(item => {
      const itemId = item._id || item.id;
      const isExpanded = itemId ? expandedFolders.includes(String(itemId).trim()) : false;
      const isFolder = item.type === 'folder' || item.contentType === 'folder';

      return (
        <ContentItemCard
          key={itemId ? `${itemId}_${level}` : `item_${Math.random()}_${level}`}
          item={item}
          type={type || item.type}
          level={level}
          isActiveUploadFolder={isActiveUploadFolderId === itemId}
          isExpanded={isExpanded}
          draggedItemId={draggedItemId}
          dragOverItemId={dragOverItemId}
          isSearching={isSearching}
          folderCounts={folderCounts}
          openContentActionMenuId={openContentActionMenuId}
          handlers={handlers}
        >
          {isFolder && isExpanded && renderChildTree ? renderChildTree(itemId, level + 1) : null}
        </ContentItemCard>
      );
    });
  }, [
    items,
    level,
    type,
    isActiveUploadFolderId,
    expandedFolders,
    draggedItemId,
    dragOverItemId,
    isSearching,
    folderCounts,
    openContentActionMenuId,
    handlers,
    renderChildTree
  ]);

  return (
    <React.Fragment>
      {renderedItems}
    </React.Fragment>
  );
};

export default React.memo(ContentListWrapper);
