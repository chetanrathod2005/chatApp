// import axios from "axios";
// import store from "./redux/store";
// import { logoutUser } from "./redux/userSlice";
// import { PURGE } from "redux-persist";

// const api = axios.create({
//   baseURL: "http://localhost:8000/api/v1",
//   withCredentials: true,
// });

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       console.warn("401 detected → Logging out");

//       //  Clear redux state
//       store.dispatch(logoutUser());

//       //  Clear persisted redux
//       store.dispatch({ type: PURGE, key: "root", result: () => null });

//       //  Clear manual storage if any
//       localStorage.removeItem("persist:root");

//       //  Redirect
//       window.location.href = "/login";
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;



import axios from "axios";
import store from "./redux/store";
import { logoutUser } from "./redux/userSlice";
import { disconnectSocket } from "./socket.js";
import { PURGE } from "redux-persist";

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      disconnectSocket();
      store.dispatch(logoutUser());
      store.dispatch({ type: PURGE, key: "root", result: () => null });
      localStorage.removeItem("persist:root");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

