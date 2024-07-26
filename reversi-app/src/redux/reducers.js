import { SET_CONFIG } from './actions';

const initialState = {
  config: null
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CONFIG:
      return {
        ...state,
        config: action.payload
      };
    default:
      return state;
  }
};

export default rootReducer;