import { useEffect } from "react";
import api from "../axios.js";
import { useSelector, useDispatch } from "react-redux";
import { setMessages } from "../redux/messageSlice.js";

const useGetMessages = () => {
  const { selectedUser } = useSelector((store) => store.user);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!selectedUser?._id) return;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/message/${selectedUser._id}`, { withCredentials: true });
        dispatch(setMessages({ userId: selectedUser._id, messages: res.data || [] }));
      } catch (e) {
        console.error(e);
      }
    };
    fetchMessages();
  }, [selectedUser?._id, dispatch]);
};

export default useGetMessages;
