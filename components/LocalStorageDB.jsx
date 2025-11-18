// Local Storage Service - Mimics Base44 API
const STORAGE_KEYS = {
  USER: 'splitease_user',
  EXPENSES: 'splitease_expenses',
  SETTLEMENTS: 'splitease_settlements',
  GROUPS: 'splitease_groups',
  FRIENDS: 'splitease_friends'
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// User Management
export const userStorage = {
  get: () => {
    const user = localStorage.getItem(STORAGE_KEYS.USER);
    if (!user) {
      const defaultUser = {
        id: generateId(),
        email: 'user@splitease.local',
        full_name: 'Local User',
        role: 'admin',
        default_currency: 'USD',
        upi_id: '',
        upi_qr_code: ''
      };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(user);
  },
  update: (data) => {
    const user = userStorage.get();
    const updated = { ...user, ...data };
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    return updated;
  }
};

// Entity Storage Factory
const createEntityStorage = (key) => ({
  list: (sortBy = '-created_date', limit = 1000) => {
    let items = getFromStorage(key);
    if (sortBy) {
      const field = sortBy.replace('-', '');
      const desc = sortBy.startsWith('-');
      items.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (desc) return bVal > aVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
      });
    }
    return items.slice(0, limit);
  },
  
  filter: (query, sortBy, limit) => {
    let items = getFromStorage(key);
    items = items.filter(item => {
      return Object.entries(query).every(([k, v]) => item[k] === v);
    });
    if (sortBy) {
      const field = sortBy.replace('-', '');
      const desc = sortBy.startsWith('-');
      items.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (desc) return bVal > aVal ? 1 : -1;
        return aVal > bVal ? 1 : -1;
      });
    }
    return limit ? items.slice(0, limit) : items;
  },
  
  create: (data) => {
    const items = getFromStorage(key);
    const newItem = {
      ...data,
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      created_by: userStorage.get().email
    };
    items.push(newItem);
    saveToStorage(key, items);
    return newItem;
  },
  
  bulkCreate: (dataArray) => {
    const items = getFromStorage(key);
    const newItems = dataArray.map(data => ({
      ...data,
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      created_by: userStorage.get().email
    }));
    items.push(...newItems);
    saveToStorage(key, items);
    return newItems;
  },
  
  update: (id, data) => {
    const items = getFromStorage(key);
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = {
        ...items[index],
        ...data,
        updated_date: new Date().toISOString()
      };
      saveToStorage(key, items);
      return items[index];
    }
    throw new Error('Item not found');
  },
  
  delete: (id) => {
    const items = getFromStorage(key);
    const filtered = items.filter(item => item.id !== id);
    saveToStorage(key, filtered);
    return { success: true };
  }
});

// Local Storage API (mimics base44)
export const localDB = {
  auth: {
    me: () => Promise.resolve(userStorage.get()),
    updateMe: (data) => Promise.resolve(userStorage.update(data)),
    logout: () => {
      if (confirm('Are you sure you want to reload the app?')) {
        location.reload();
      }
    },
    isAuthenticated: () => Promise.resolve(true)
  },
  
  entities: {
    Expense: createEntityStorage(STORAGE_KEYS.EXPENSES),
    Settlement: createEntityStorage(STORAGE_KEYS.SETTLEMENTS),
    Group: createEntityStorage(STORAGE_KEYS.GROUPS),
    Friend: createEntityStorage(STORAGE_KEYS.FRIENDS),
    User: {
      list: () => [userStorage.get()]
    }
  },
  
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ file_url: reader.result });
          };
          reader.readAsDataURL(file);
        });
      }
    }
  }
};

// Export data functions
export const exportAllData = () => {
  return {
    user: userStorage.get(),
    expenses: getFromStorage(STORAGE_KEYS.EXPENSES),
    settlements: getFromStorage(STORAGE_KEYS.SETTLEMENTS),
    groups: getFromStorage(STORAGE_KEYS.GROUPS),
    friends: getFromStorage(STORAGE_KEYS.FRIENDS),
    exported_at: new Date().toISOString()
  };
};

export const importData = (data) => {
  if (data.user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
  if (data.expenses) saveToStorage(STORAGE_KEYS.EXPENSES, data.expenses);
  if (data.settlements) saveToStorage(STORAGE_KEYS.SETTLEMENTS, data.settlements);
  if (data.groups) saveToStorage(STORAGE_KEYS.GROUPS, data.groups);
  if (data.friends) saveToStorage(STORAGE_KEYS.FRIENDS, data.friends);
};

export const clearAllData = () => {
  if (confirm('This will delete ALL data. Are you sure?')) {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
    location.reload();
  }
};