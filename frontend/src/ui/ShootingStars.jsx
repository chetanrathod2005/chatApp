import React from "react";

const ShootingStars = () => {
  const stars = Array.from({ length: 20 }); // keep LOW for elegance

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {stars.map((_, i) => (
        <span
          key={i}
          className="shooting-star"
          style={{
            top: `${Math.random() * 60}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${9 + Math.random() * 9}s`,
          }}
        />
      ))}
    </div>
  );
};

export default ShootingStars;