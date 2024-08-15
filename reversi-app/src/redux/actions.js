export const SET_CONFIG = "SET_CONFIG";
export const SET_USER = "SET_USER";
export const CLEAR_USER = "CLEAR_USER";

export const setConfig = (config) => ({
  type: SET_CONFIG,
  payload: config,
});

export const setUser = (user) => ({
  type: SET_USER,
  payload: user,
});

export const clearUser = () => ({
  type: CLEAR_USER,
});
