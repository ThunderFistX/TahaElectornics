import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DataContext = createContext(null);
const ORDERS_STORAGE_KEY = 'dld_admin_orders';

const getStoredOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
};

const DataProvider = ({ children }) => {
  const storedOrders = useMemo(() => getStoredOrders(), []);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState(storedOrders ?? []);
  const [projects] = useState([]);

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.title, project])),
    [projects]
  );

  useEffect(() => {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders]);

  return (
    <DataContext.Provider value={{ users, setUsers, orders, setOrders, projects, projectMap }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export { DataProvider };
