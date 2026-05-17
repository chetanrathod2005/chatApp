import React from "react";

const PremiumBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden z-0">
      {/* Moving gradient blobs */}
      <div className="absolute bg-black w-[600px] h-[600px] bg-black/15 blur-3xl rounded-full top-[-100px] left-[-100px] animate-blob" />
      <div className="absolute w-[500px] h-[500px] bg-black/10 blur-3xl rounded-full bottom-[-120px] right-[-120px] animate-blob animation-delay-20" />
      <div className="absolute w-[400px] h-[400px] bg-black/5 blur-3xl rounded-full top-[40%] left-[60%] animate-blob animation-delay-40" />

      {/* Grain */}
<div className="bg-white/80 backdrop-blur-xl border border-black/10 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.15)]"/>
    </div>
  );
};

export default PremiumBackground;