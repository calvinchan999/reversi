import { SET_CONFIG } from "./actions";
import { SET_USER } from "./actions";
import { CLEAR_USER } from "./actions";

const initialState = {
  config: null,
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_CONFIG:
      return {
        ...state,
        config: action.payload,
      };
    case SET_USER:
      return {
        ...state,
        user: action.payload,
      };
    case CLEAR_USER:
      return {
        ...state,
        user: null,
      };
    default:
      return state;
  }
};

export default rootReducer;
