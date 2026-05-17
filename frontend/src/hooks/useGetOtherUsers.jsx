import { useEffect } from "react";
import api from "../axios.js";
import { useDispatch } from "react-redux";
import { setOtherUsers } from "../redux/userSlice.js";

/** Fetches `/user` list; prefer merging via Sidebar + `/message/conversations` when logged in. */
const useGetOtherUsers = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchOtherUsers = async () => {
      try {
        const res = await api.get("/user", { withCredentials: true });
        dispatch(setOtherUsers(Array.isArray(res.data) ? res.data : []));
      } catch (e) {
        console.error(e);
      }
    };
    fetchOtherUsers();
  }, [dispatch]);
};

export default useGetOtherUsers;
