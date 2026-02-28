import React from 'react';

export const SidebarContext = React.createContext({
  sidebarVisible: true,
  setSidebarVisible: () => {},
});
