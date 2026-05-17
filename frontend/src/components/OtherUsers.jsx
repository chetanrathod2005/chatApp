const OtherUsers = ({ users }) => {
  if (!users.length) {
    return (
      <div className="text-center text-white/50 mt-10">
        No users found
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {users.map(user => (
        <OtherUser key={user._id} user={user} />
      ))}
    </div>
  );
};
export default OtherUsers