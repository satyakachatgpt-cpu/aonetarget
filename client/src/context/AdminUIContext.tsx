import React from 'react';

export const AdminUIContext = React.createContext<{
  sidebarHidden: boolean;
  setSidebarHidden: (val: boolean) => void;
}>({
  sidebarHidden: false,
  setSidebarHidden: () => { },
});
